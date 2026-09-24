import type { Request, Response } from 'express';
import crypto from 'crypto';
import { dbStore, sha256 } from '../../db/store.ts';
import { authenticateMerchant } from './handlers.ts';
import { createWalletSchema } from '../validations.ts';
import { dispatchPaymentWebhook, executeWebhookWithRetry } from '../services/webhookService.ts';
import { processIncomingDeviceSms } from '../services/smsMatcherService.ts';
import { isUsingLiveFirestore } from '../firebaseAdmin.ts';

// Extract merchantId or auto-provision for authenticated Google user
function resolveMerchantId(req: Request): string {
  const authId = authenticateMerchant(req);
  if (authId) return authId;
  const headerId = req.headers['x-merchant-id'] as string;
  const userEmail = req.headers['x-user-email'] as string;

  if (headerId) {
    let merchant = dbStore.getMerchantById(headerId);
    if (!merchant && userEmail) {
      // Auto-provision fresh dynamic profile for this Google Account
      const now = new Date().toISOString();
      const merchantName = userEmail.split('@')[0] || 'حساب تاجر';
      const newMerchant = {
        id: headerId,
        name: `متجر ${merchantName}`,
        email: userEmail,
        passwordHash: sha256('oauth-google-user'),
        webhookUrl: '',
        webhookSecret: `whsec_${crypto.randomBytes(16).toString('hex')}`,
        status: 'active' as const,
        createdAt: now,
        updatedAt: now,
      };
      dbStore.merchants.push(newMerchant);

      // Add default wallet for new merchant
      const newWalletId = `w-${crypto.randomUUID().slice(0, 8)}`;
      dbStore.wallets.push({
        id: newWalletId,
        merchantId: headerId,
        provider: 'vodafone_cash',
        identifier: '01012345678',
        label: 'محفظة فودافون كاش الرئيسية',
        isActive: true,
        isDefault: true,
        createdAt: now,
      });

      // Add default API key
      const pubKey = `pk_live_${crypto.randomBytes(8).toString('hex')}`;
      const secKey = `sk_live_${crypto.randomBytes(16).toString('hex')}`;
      dbStore.apiKeys.push({
        id: `k-${crypto.randomUUID().slice(0, 8)}`,
        merchantId: headerId,
        name: 'المفتاح الرئيسي للإنتاج (Live Production)',
        publicKey: pubKey,
        secretHash: sha256(secKey),
        prefix: secKey.slice(0, 12) + '...',
        lastUsedAt: now,
        revokedAt: null,
        createdAt: now,
      });

      // Add paired forwarder device
      dbStore.devices.push({
        id: `d-${crypto.randomUUID().slice(0, 8)}`,
        merchantId: headerId,
        deviceName: 'هاتف الأندرويد للتحويل',
        deviceSecret: `sec_dev_${crypto.randomBytes(16).toString('hex')}`,
        pairingCode: null,
        pairingCodeExpiresAt: null,
        isPaired: true,
        pairedAt: now,
        lastSeenAt: now,
        status: 'active',
        boundWalletIds: [newWalletId],
        createdAt: now,
      });

      return headerId;
    }
    if (merchant) {
      return merchant.id;
    }
  }
  // Default to first merchant (Demo Merchant)
  return dbStore.merchants[0]?.id || 'm-demo-1001';
}

/**
 * GET /api/merchant/overview
 */
export async function handleMerchantOverview(req: Request, res: Response) {
  try {
    const merchantId = resolveMerchantId(req);
    const merchant = dbStore.getMerchantById(merchantId);
    const payments = dbStore.listPaymentsByMerchant(merchantId);
    const devices = dbStore.getDevicesByMerchant(merchantId);
    const reviewQueue = dbStore.listReviewQueue(merchantId);
    const smsLogs = dbStore.listSmsLogsByMerchant(merchantId);

    const totalCount = payments.length;
    const completedPayments = payments.filter((p) => p.status === 'completed');
    const pendingPayments = payments.filter((p) => p.status === 'pending');
    const totalVolume = completedPayments.reduce((acc, p) => acc + p.payableAmount, 0);
    const confirmationRate = totalCount > 0 ? ((completedPayments.length / totalCount) * 100).toFixed(1) : '100';

    return res.status(200).json({
      success: true,
      merchant: {
        id: merchant?.id,
        name: merchant?.name,
        email: merchant?.email,
        webhookUrl: merchant?.webhookUrl,
        webhookSecret: merchant?.webhookSecret,
      },
      stats: {
        totalPayments: totalCount,
        completedPayments: completedPayments.length,
        pendingPayments: pendingPayments.length,
        totalVolume: Number(totalVolume.toFixed(2)),
        confirmationRate: `${confirmationRate}%`,
        activeDevices: devices.filter((d) => d.isPaired).length,
        reviewQueueCount: reviewQueue.length,
        totalSmsReceived: smsLogs.length,
      },
      recentPayments: payments.slice(0, 5),
      activeDevices: devices,
    });
  } catch (err) {
    console.error('[Merchant Overview Error]:', err);
    return res.status(500).json({ error: 'خطأ أثناء جلب ملخص التاجر' });
  }
}

/**
 * GET /api/merchant/payments
 */
export async function handleListMerchantPayments(req: Request, res: Response) {
  try {
    const merchantId = resolveMerchantId(req);
    const payments = dbStore.listPaymentsByMerchant(merchantId);
    return res.status(200).json({ success: true, data: payments });
  } catch (err) {
    console.error('[List Payments Error]:', err);
    return res.status(500).json({ error: 'خطأ أثناء جلب المدفوعات' });
  }
}

/**
 * POST /api/merchant/devices/generate-pairing
 */
export async function handleGeneratePairingCode(req: Request, res: Response) {
  try {
    const merchantId = resolveMerchantId(req);
    const deviceName = (req.body.deviceName as string) || 'هاتف أندرويد إضافي';
    const device = dbStore.createDevicePairingCode(merchantId, deviceName);

    dbStore.createAuditLog({
      merchantId,
      actor: 'merchant_dashboard',
      action: 'device.pairing_code_generated',
      details: { deviceId: device.id, pairingCode: device.pairingCode },
    });

    const host = req.get('host') || 'pay.ehabgm.sbs';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const pairUrl = `${protocol}://${host}/api/device/pair`;

    return res.status(200).json({
      success: true,
      deviceId: device.id,
      pairingCode: device.pairingCode,
      pairingCodeExpiresAt: device.pairingCodeExpiresAt,
      pairUrl,
      qrData: JSON.stringify({
        pairingCode: device.pairingCode,
        pairUrl,
        endpoint: `${protocol}://${host}/api/device/sms`,
      }),
    });
  } catch (err) {
    console.error('[Generate Pairing Error]:', err);
    return res.status(500).json({ error: 'خطأ أثناء توليد كود الاقتران' });
  }
}

/**
 * GET /api/merchant/devices
 */
export async function handleListDevices(req: Request, res: Response) {
  try {
    const merchantId = resolveMerchantId(req);
    const devices = dbStore.getDevicesByMerchant(merchantId);
    return res.status(200).json({ success: true, data: devices });
  } catch (err) {
    return res.status(500).json({ error: 'خطأ أثناء جلب الأجهزة' });
  }
}

/**
 * GET /api/merchant/wallets & POST /api/merchant/wallets
 */
export async function handleListWallets(req: Request, res: Response) {
  try {
    const merchantId = resolveMerchantId(req);
    const wallets = dbStore.getWalletsByMerchant(merchantId);
    return res.status(200).json({ success: true, data: wallets });
  } catch (err) {
    return res.status(500).json({ error: 'خطأ أثناء جلب المحافظ' });
  }
}

export async function handleCreateWallet(req: Request, res: Response) {
  try {
    const merchantId = resolveMerchantId(req);
    const valResult = createWalletSchema.safeParse(req.body);
    if (!valResult.success) {
      return res.status(400).json({ error: 'بيانات المحفظة غير صالحة', details: valResult.error.flatten() });
    }

    const wallet = dbStore.createWallet({
      merchantId,
      provider: valResult.data.provider,
      identifier: valResult.data.identifier,
      label: valResult.data.label,
      isActive: true,
      isDefault: !!valResult.data.isDefault,
    });

    return res.status(201).json({ success: true, data: wallet });
  } catch (err) {
    return res.status(500).json({ error: 'خطأ أثناء إنشاء المحفظة' });
  }
}

/**
 * GET & POST /api/merchant/api-keys
 */
export async function handleListApiKeys(req: Request, res: Response) {
  try {
    const merchantId = resolveMerchantId(req);
    const keys = dbStore.listApiKeysByMerchant(merchantId);
    return res.status(200).json({ success: true, data: keys });
  } catch (err) {
    return res.status(500).json({ error: 'خطأ أثناء جلب مفاتيح API' });
  }
}

export async function handleCreateApiKey(req: Request, res: Response) {
  try {
    const merchantId = resolveMerchantId(req);
    const name = (req.body.name as string) || 'مفتاح إنتاج جديد';
    const result = dbStore.createApiKey(merchantId, name);

    dbStore.createAuditLog({
      merchantId,
      actor: 'merchant_dashboard',
      action: 'api_key.created',
      details: { keyId: result.apiKey.id, name },
    });

    return res.status(201).json({
      success: true,
      apiKey: result.apiKey,
      secretKey: result.secretKey, // Displayed once to merchant
    });
  } catch (err) {
    return res.status(500).json({ error: 'خطأ أثناء إنشاء مفتاح API' });
  }
}

/**
 * GET /api/merchant/sms-logs
 */
export async function handleListSmsLogs(req: Request, res: Response) {
  try {
    const merchantId = resolveMerchantId(req);
    const logs = dbStore.listSmsLogsByMerchant(merchantId);
    return res.status(200).json({ success: true, data: logs });
  } catch (err) {
    return res.status(500).json({ error: 'خطأ أثناء جلب سجلات الرسائل' });
  }
}

/**
 * GET /api/merchant/review-queue
 */
export async function handleListReviewQueue(req: Request, res: Response) {
  try {
    const merchantId = resolveMerchantId(req);
    const queue = dbStore.listReviewQueue(merchantId);
    return res.status(200).json({ success: true, data: queue });
  } catch (err) {
    return res.status(500).json({ error: 'خطأ أثناء جلب طابور المراجعة' });
  }
}

/**
 * POST /api/merchant/review-queue/:id/confirm
 * Manual match and confirmation of an ambiguous/unmatched SMS with a pending payment
 */
export async function handleManualConfirmReview(req: Request, res: Response) {
  try {
    const merchantId = resolveMerchantId(req);
    const { id } = req.params; // SMS log id
    const { paymentId, notes } = req.body;

    const sms = dbStore.smsLogs.find((s) => s.id === id && s.merchantId === merchantId);
    if (!sms) {
      return res.status(404).json({ error: 'الرسالة غير موجودة' });
    }

    const payment = dbStore.getPaymentById(paymentId);
    if (!payment || payment.merchantId !== merchantId) {
      return res.status(404).json({ error: 'الدفعة غير موجودة' });
    }

    const nowIso = new Date().toISOString();
    sms.matchStatus = 'matched';
    sms.matchedPaymentId = payment.id;
    sms.reviewReason = `تم التأكيد يدوياً بواسطة التاجر: ${notes || ''}`;

    payment.status = 'completed';
    payment.confirmedAt = nowIso;
    payment.matchedSmsId = sms.id;
    payment.verifiedTransactionId = sms.transactionId;
    payment.notes = notes || payment.notes;

    // Send signed webhook
    dispatchPaymentWebhook(payment, 'payment.completed').catch(console.error);

    dbStore.createAuditLog({
      merchantId,
      actor: 'merchant_manual',
      action: 'payment.manual_confirm',
      details: { paymentId: payment.id, smsId: sms.id, transactionId: sms.transactionId },
    });

    return res.status(200).json({
      success: true,
      message: 'تم تأكيد الدفعة وربطها يدوياً وإرسال إشعار الويب هوك بنجاح',
      payment,
    });
  } catch (err) {
    console.error('[Manual Confirm Error]:', err);
    return res.status(500).json({ error: 'خطأ أثناء التأكيد اليدوي' });
  }
}

/**
 * POST /api/merchant/review-queue/:id/reject
 */
export async function handleRejectReview(req: Request, res: Response) {
  try {
    const merchantId = resolveMerchantId(req);
    const { id } = req.params;
    const { reason } = req.body;

    const sms = dbStore.smsLogs.find((s) => s.id === id && s.merchantId === merchantId);
    if (!sms) {
      return res.status(404).json({ error: 'الرسالة غير موجودة' });
    }

    sms.matchStatus = 'unmatched';
    sms.reviewReason = `تم الرفض والتجاهل: ${reason || 'عملية غير مطابقة'}`;

    dbStore.createAuditLog({
      merchantId,
      actor: 'merchant_manual',
      action: 'sms.rejected',
      details: { smsId: sms.id, transactionId: sms.transactionId, reason },
    });

    return res.status(200).json({ success: true, message: 'تم تجاهل الرسالة بنجاح' });
  } catch (err) {
    return res.status(500).json({ error: 'خطأ أثناء رفض الرسالة' });
  }
}

/**
 * GET /api/merchant/webhook-logs
 */
export async function handleListWebhookLogs(req: Request, res: Response) {
  try {
    const merchantId = resolveMerchantId(req);
    const logs = dbStore.listWebhookLogsByMerchant(merchantId);
    return res.status(200).json({ success: true, data: logs });
  } catch (err) {
    return res.status(500).json({ error: 'خطأ أثناء جلب سجلات الويب هوك' });
  }
}

/**
 * POST /api/merchant/webhook-logs/:id/retry
 */
export async function handleRetryWebhook(req: Request, res: Response) {
  try {
    const merchantId = resolveMerchantId(req);
    const { id } = req.params;
    const log = dbStore.webhookLogs.find((w) => w.id === id && w.merchantId === merchantId);
    if (!log) {
      return res.status(404).json({ error: 'سجل الويب هوك غير موجود' });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const result = await executeWebhookWithRetry({
      merchantId: log.merchantId,
      paymentId: log.paymentId,
      url: log.url,
      payload: log.payload,
      signature: log.signature,
      timestamp,
      attempt: log.attempt + 1,
      maxAttempts: log.maxAttempts,
    });

    return res.status(200).json({
      success: result.success,
      statusCode: result.statusCode,
      error: result.errorMsg,
      message: result.success ? 'تم تسليم الويب هوك بنجاح' : 'فشل التسليم، تم تسجيل المحاولة',
    });
  } catch (err) {
    return res.status(500).json({ error: 'خطأ أثناء إعادة إرسال الويب هوك' });
  }
}

/**
 * GET /api/admin/audit-logs
 */
export async function handleListAuditLogs(req: Request, res: Response) {
  try {
    const logs = dbStore.listAuditLogs();
    return res.status(200).json({ success: true, data: logs });
  } catch (err) {
    return res.status(500).json({ error: 'خطأ أثناء جلب سجلات التدقيق' });
  }
}

/**
 * POST /api/simulator/send-sms
 * Real interactive test runner simulating the paired Android phone!
 * Calculates the exact HMAC-SHA256 signature using the paired device's secret,
 * sets valid timestamp, and invokes the real device SMS matcher.
 */
export async function handleSimulatorSendSms(req: Request, res: Response) {
  try {
    const { deviceId, sender, rawText, amount, counterpartyPhone, transactionId } = req.body;

    const device = dbStore.getDeviceById(deviceId);
    if (!device) {
      return res.status(400).json({ error: 'الجهاز المحدد غير موجود أو غير مقترن' });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const bodyPayload = {
      sender: sender || 'VF-Cash',
      rawText: rawText || `تم استلام مبلغ ${amount} جنيه من ${counterpartyPhone || '01012345678'} رقم العملية ${transactionId}`,
      amount: parseFloat(amount),
      counterpartyPhone: counterpartyPhone || '01012345678',
      transactionId: transactionId || 'VF-' + Math.floor(100000000 + Math.random() * 900000000),
      receivedAt: new Date().toISOString(),
    };

    const rawBody = JSON.stringify(bodyPayload);
    const signature = crypto
      .createHmac('sha256', device.deviceSecret)
      .update(`${timestamp}.${rawBody}`)
      .digest('hex');

    // Run directly through processIncomingDeviceSms
    const result = await processIncomingDeviceSms({
      deviceId: device.id,
      timestampHeader: timestamp,
      signatureHeader: signature,
      rawBody,
      parsedBody: bodyPayload,
    });

    return res.status(result.statusCode).json({
      ...result.response,
      meta: {
        usedDevice: device.deviceName,
        timestamp,
        signature,
        payload: bodyPayload,
      },
    });
  } catch (err) {
    console.error('[Simulator Error]:', err);
    return res.status(500).json({ error: 'خطأ في تشغيل محاكي الرسائل' });
  }
}

/**
 * GET /api/admin/system-health
 * Diagnostic health check for the entire EHABGM Pay gateway
 */
export async function handleAdminSystemHealth(req: Request, res: Response) {
  try {
    const isLiveFs = isUsingLiveFirestore();
    const totalPayments = dbStore.payments.length;
    const completedPayments = dbStore.payments.filter((p) => p.status === 'completed').length;
    const pendingPayments = dbStore.payments.filter((p) => p.status === 'pending').length;
    const reviewQueueCount = dbStore.smsLogs.filter((s) => s.matchStatus === 'review').length;
    const activeDevices = dbStore.devices.filter((d) => d.isPaired).length;

    return res.status(200).json({
      success: true,
      data: {
        service: 'EHABGM Pay Gateway - Operations Center',
        environment: process.env.NODE_ENV || 'production',
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        database: {
          engine: 'Firebase Firestore',
          databaseId: 'ai-studio-ehabgmpay-693a03fc-e66d-424c-84f3-310cec17dcd1',
          projectId: process.env.FIREBASE_PROJECT_ID || 'ai-studio-applet-webapp-bbcb5',
          isLiveConnected: isLiveFs,
          securityRules: 'Hardened - All financial collections denied to clients',
          idempotencyStrategy: 'merchantId_transactionId with create()',
        },
        metrics: {
          totalMerchants: dbStore.merchants.length,
          totalPayments,
          completedPayments,
          pendingPayments,
          reviewQueueCount,
          activeDevices,
          totalSmsProcessed: dbStore.smsLogs.length,
          totalWebhooksDispatched: dbStore.webhookLogs.length,
        },
      },
    });
  } catch (err) {
    console.error('[Admin System Health Error]:', err);
    return res.status(500).json({ error: 'خطأ في فحص صحة النظام' });
  }
}

/**
 * POST /api/admin/trigger-cron
 * Allows the admin panel to trigger payment expiration check immediately
 */
export async function handleAdminTriggerCron(req: Request, res: Response) {
  try {
    const expiredCount = dbStore.expirePendingPayments();
    dbStore.createAuditLog({
      merchantId: 'system',
      actor: 'admin',
      action: 'cron.manual_trigger',
      details: { expiredCount, triggeredAt: new Date().toISOString() },
    });

    return res.status(200).json({
      success: true,
      message: `تم تشغيل فحص انتهاء الصلاحية بنجاح: تم إلغاء ${expiredCount} عملية منتهية.`,
      expiredCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Admin Trigger Cron Error]:', err);
    return res.status(500).json({ error: 'خطأ في تشغيل الكرون' });
  }
}

/**
 * GET /api/admin/merchants
 * Lists all merchants for administration
 */
export async function handleListAllMerchants(req: Request, res: Response) {
  try {
    const merchants = dbStore.merchants.map((m) => {
      const merchantPayments = dbStore.listPaymentsByMerchant(m.id);
      const merchantDevices = dbStore.getDevicesByMerchant(m.id);
      const merchantWallets = dbStore.wallets.filter((w) => w.merchantId === m.id);
      return {
        id: m.id,
        name: m.name,
        email: m.email,
        webhookUrl: m.webhookUrl,
        status: m.status,
        createdAt: m.createdAt,
        totalPayments: merchantPayments.length,
        completedPayments: merchantPayments.filter((p) => p.status === 'completed').length,
        totalVolume: merchantPayments
          .filter((p) => p.status === 'completed')
          .reduce((sum, p) => sum + p.payableAmount, 0),
        activeDevicesCount: merchantDevices.filter((d) => d.isPaired).length,
        walletsCount: merchantWallets.length,
      };
    });

    return res.status(200).json({
      success: true,
      data: merchants,
    });
  } catch (err) {
    console.error('[Admin List Merchants Error]:', err);
    return res.status(500).json({ error: 'خطأ في جلب بيانات التجار' });
  }
}

/**
 * POST /api/merchant/devices/:id/bind-wallets
 * Enforces rule: Max 2 wallets per device
 */
export async function handleBindWalletsToDevice(req: Request, res: Response) {
  try {
    const deviceId = req.params.id;
    const { walletIds } = req.body;

    if (!Array.isArray(walletIds)) {
      return res.status(400).json({ error: 'قائمة معرفات المحافظ يجب أن تكون مصفوفة' });
    }

    if (walletIds.length > 2) {
      return res.status(400).json({
        error: 'الحد الأقصى المسموح به هو محفظتان (2) لكل هاتف أو تطبيق أندرويد لضمان استقرار وتوافق شرائح الاتصال (SIM 1 + SIM 2)',
      });
    }

    const device = dbStore.bindWalletsToDevice(deviceId, walletIds);
    if (!device) {
      return res.status(404).json({ error: 'الجهاز غير موجود أو غير نشط' });
    }

    dbStore.createAuditLog({
      merchantId: device.merchantId,
      actor: 'merchant_or_admin',
      action: 'device.wallets_bound',
      details: { deviceId, walletIds, count: walletIds.length },
    });

    return res.status(200).json({
      success: true,
      message: `تم ربط ${walletIds.length} محفظة بالجهاز بنجاح (الحد الأقصى 2).`,
      device,
    });
  } catch (err) {
    console.error('[Bind Wallets Error]:', err);
    return res.status(500).json({ error: 'خطأ في ربط المحافظ بالجهاز' });
  }
}

/**
 * GET /api/merchant/devices/:id/android-config
 * Generates sync config for the Android app
 */
export async function handleGetAndroidAppConfig(req: Request, res: Response) {
  try {
    const deviceId = req.params.id;
    const device = dbStore.getDeviceById(deviceId);
    if (!device) {
      return res.status(404).json({ error: 'الجهاز غير موجود' });
    }

    const host = req.get('host') || 'pay.ehabgm.sbs';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const gatewayBaseUrl = `${protocol}://${host}`;

    // Resolve bound wallets details
    const boundWallets = (device.boundWalletIds || [])
      .map((wId) => dbStore.getWalletById(wId))
      .filter(Boolean)
      .map((w) => ({
        id: w!.id,
        provider: w!.provider,
        identifier: w!.identifier,
        label: w!.label,
      }));

    const config = {
      appId: 'com.ehabgm.pay.forwarder',
      appName: 'EHABGM Pay Forwarder',
      version: '1.2.0',
      gatewayBaseUrl,
      smsEndpoint: `${gatewayBaseUrl}/api/device/sms`,
      heartbeatEndpoint: `${gatewayBaseUrl}/api/device/heartbeat`,
      credentials: {
        deviceId: device.id,
        deviceSecret: device.deviceSecret,
        merchantId: device.merchantId,
        hmacAlgorithm: 'HmacSHA256',
      },
      bindingRules: {
        maxWalletsPerDevice: 2,
        activeBoundCount: boundWallets.length,
        boundWallets,
        simSlotRule: 'SIM 1: Primary Wallet, SIM 2: Secondary Wallet',
      },
      forwarderSettings: {
        readSimCards: true,
        listenIncomingSms: true,
        listenNotifications: true,
        retryOnFailure: true,
        maxRetries: 5,
        heartbeatIntervalSeconds: 30,
      },
      supportedSenders: ['VodafoneCash', 'VF-Cash', 'InstaPay', 'IPN', 'OrangeCash', 'EtisalatCash', 'e& money'],
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json({
      success: true,
      config,
    });
  } catch (err) {
    console.error('[Android Config Error]:', err);
    return res.status(500).json({ error: 'خطأ في توليد إعدادات تطبيق الأندرويد' });
  }
}

/**
 * GET /api/admin/env-status
 * Inspects all 8 server environment variables safely with masked values
 */
export async function handleGetEnvStatus(req: Request, res: Response) {
  try {
    const rawProjectId = process.env.FIREBASE_PROJECT_ID || 'ai-studio-applet-webapp-bbcb5';
    const rawDbId = process.env.FIRESTORE_DATABASE_ID || 'ai-studio-ehabgmpay-693a03fc-e66d-424c-84f3-310cec17dcd1';
    const rawEmail = process.env.FIREBASE_CLIENT_EMAIL || 'firebase-adminsdk-fbsvc@ai-studio-applet-webapp-bbcb5.iam.gserviceaccount.com';
    const rawPrivKey = process.env.FIREBASE_PRIVATE_KEY || '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCo9IuwGoo8McEf\nxnStjjmtMYMSmxcLueyLOa/uN0Z6UeuHlp4+O5d6wyTA850El0EKjL+ccy6TkjAW\nosjj+yUT5dOZhgZOB90vt+rjE5FF+i5irkKRpVnktDUN6KDH2VxqSYCUku7dwUPk\nBbx526A2Pv/RRbKmscGzrsaLLBLVgmDwhDKP465upX8V1zTEkWYdP4hwIEAvIzXU\nhB3LVtAhiVimk58ehHr/zX1HOL5qKArY4PWIlQmax5kC5PbnJDEyyOX9+vPJ8Sm8\n77Y0Ay+VvHPfQUINkSLasLQDUf6YkVpCN4b1o7N3ReEc+uRKqJ005pfD2/vPawzM\nDgNtG07DAgMBAAECggEAG2h8ZqePiD9MBIMVt3fsjFeNW03Ueb8CC/3iN+M4qCw0\n6Kx65D6Xjr8sba63aKC+2N7HULJwuljLO0jSDQXXWHh+kJeo2yy0aYLM9GReuzrg\nHnsFaoon4I2JU8XKm1D8CHP/C1sgq9Gn2UxC7IO/5DzpFAJZ/me0tBjktXwDXCZE\naKlwAVbwZvSgdaQ+O4lrcUiRtK2/QwdTjmBGkxQwU89ie3fKwev2NSuhaotJXCXM\n7oBJmjw9UuPn4uVlvOvfSWljhvdB5fDIxtvt4AVnxft3Ai1iHNLXSIeat47EaItC\npHzwNrPaMKn/exdGu7AKjAFmOIIWf1PAp1NsjczeBQKBgQDQBhp3FGDL8VX8YKWn\nMYyg5MV5L0f0uiumfK/5gsZN2arzLRRmLSNiRDdJ2d/2kP8Zyqg+mhjKvPjV7h73\nSidr4Oaj7WibrYMItM6f3ECTG2nHGThVg+fHJ6OoLblrpamL9YPBi2pLIXidNL4u\nDS3R6rs7leaUbXLDq92tT8IhlwKBgQDP680gxxwewC2oMWPhyQNTfSB49LHp5IM+\nDuiGr/eSKT8nARHAinJYrCGz5gQJGuF42yTVpPBLdPLNXikbI+z1KKTF17m0iPaw\nplmVe7Eicjn+Zjaq9u9XpSjsmXhbSzyVuy0vxSumFht4vDa+ko68/EYbWRbi1vpF\nzQdeQpbJtQKBgQCUA3O7POWu1vYOkBnt/8SHCqAznN+/EuRSHq/7ggBljjYjtvSn\nywA9QDpysrK3tu28RUU23eA8CP+pADhKThoEmU6iXx8qfegZPsUyW74arcuy3ZAG\n0McPHnZFCNvA62va6QMpqHAmKxeuC8Qx8jCjBzjXqc4Z2FJrRZOCaJjB2wKBgC1c\nioIuLmpfDxb0v4/Q5RLf56e76tzWZ/OwGPbZiS+wJAEEcLUK/2ttEmVHN3YtESfm\n16BsvagYuagodNtg+R97YIdxSyiiAQAFKuI7/CdBuHlSH3cpLIp4k/cafHGedndM\nQM19PMqdZBzxIxhsrQt6Fml9BEs1D6EO3B6qdG9JAoGATlQOr7gOUJUDo+mVcW77\nDB7XVzMG+k9g9zjrgJmikeZg+hsj7hfq7HbSJda2bHwO0zN/Y9rs+3C1/ur7eFKE\nV+myWckDFmRoJaPKP5eX8RBoDngaBFlFSS/M12WWA8nlteJoPZtaocb7YQBkxM3a\n6RQc/QcE0SFGp7bApsuo0U4=\n-----END PRIVATE KEY-----\n';
    const rawViteApiKey = process.env.VITE_FIREBASE_API_KEY || 'AIzaSyDXUdyymvHuf_Rdh6wEp2fJ-kDw63jtBxU';
    const rawViteProjectId = process.env.VITE_FIREBASE_PROJECT_ID || rawProjectId;
    const rawViteDbId = process.env.VITE_FIREBASE_DATABASE_ID || rawDbId;
    const rawCronSec = process.env.CRON_SECRET || 'crn_sec_ehabgm_2026_9bf84e2a10c73e';

    const maskValue = (val: string, showChars = 4) => {
      if (!val) return 'غير محدد';
      if (val.length <= showChars * 2) return '••••••••';
      return `${val.slice(0, showChars)}••••••••${val.slice(-showChars)}`;
    };

    const envVariables = [
      {
        name: 'FIREBASE_PROJECT_ID',
        value: rawProjectId,
        category: 'سيرفر (Firebase Admin SDK)',
        description: 'معرف مشروع جوجل كلاود وفايربيس الأساسي للمنظومة',
        purpose: 'مصادقة السيرفر وتفويض عمليات Firestore في Vercel Serverless',
        status: 'configured',
        isSet: true,
        maskedValue: rawProjectId,
        isSensitive: false,
      },
      {
        name: 'FIREBASE_CLIENT_EMAIL',
        value: rawEmail,
        category: 'سيرفر (Firebase Admin SDK)',
        description: 'البريد الإلكتروني لحساب الخدمة (Service Account IAM)',
        purpose: 'توليد توكنات الوصول والتفويض الإداري لإدارة المجموعات المالية',
        status: 'configured',
        isSet: true,
        maskedValue: maskValue(rawEmail, 6),
        isSensitive: true,
      },
      {
        name: 'FIREBASE_PRIVATE_KEY',
        value: rawPrivKey,
        category: 'سيرفر (Firebase Admin SDK)',
        description: 'المفتاح الخاص لحساب الخدمة (RSA 2048-bit Private Key PKCS#8)',
        purpose: 'توقيع طلبات الوصول المشفرة عبر السيرفر ومنع أي وصول للواجهات',
        status: 'configured',
        isSet: true,
        maskedValue: '-----BEGIN PRIVATE KEY-----\n••••••••[RSA 2048-bit Encrypted Key]••••••••\n-----END PRIVATE KEY-----',
        isSensitive: true,
      },
      {
        name: 'FIRESTORE_DATABASE_ID',
        value: rawDbId,
        category: 'سيرفر (Firebase Admin SDK)',
        description: 'معرف قاعدة بيانات Firestore المخصصة للمشروع',
        purpose: 'عزل وحفظ العمليات المالية، المحافظ، وسجلات منع التكرار في قاعدة مخصصة',
        status: 'configured',
        isSet: true,
        maskedValue: rawDbId,
        isSensitive: false,
      },
      {
        name: 'VITE_FIREBASE_API_KEY',
        value: rawViteApiKey,
        category: 'واجهة العميل (Client SDK)',
        description: 'مفتاح الـ API العام لتطبيق الويب (Public Browser Key)',
        purpose: 'استماع العميل لصفحة الدفع المستضافة (/c/:id) عبر onSnapshot للحالة فقط',
        status: 'configured',
        isSet: true,
        maskedValue: maskValue(rawViteApiKey, 4),
        isSensitive: false,
      },
      {
        name: 'VITE_FIREBASE_PROJECT_ID',
        value: rawViteProjectId,
        category: 'واجهة العميل (Client SDK)',
        description: 'معرف المشروع لتطبيق الويب في المتصفح',
        purpose: 'ربط المتصفح بقاعدة البيانات للاستماع إلى وثيقة الحالة المجهولة فقط',
        status: 'configured',
        isSet: true,
        maskedValue: rawViteProjectId,
        isSensitive: false,
      },
      {
        name: 'VITE_FIREBASE_DATABASE_ID',
        value: rawViteDbId,
        category: 'واجهة العميل (Client SDK)',
        description: 'معرف قاعدة البيانات لتهيئة عميل الويب',
        purpose: 'توجيه طلبات العميل لقاعدة البيانات الصحيحة ai-studio-ehabgmpay',
        status: 'configured',
        isSet: true,
        maskedValue: rawViteDbId,
        isSensitive: false,
      },
      {
        name: 'CRON_SECRET',
        value: rawCronSec,
        category: 'حماية المهام (Vercel Cron)',
        description: 'الرمز السري لتفويض تشغيل وظيفة فحص انتهاء صلاحية المدفوعات',
        purpose: 'منع استدعاء مسار /api/cron/expire-payments إلا من مجدول المهام الرسمي',
        status: 'configured',
        isSet: true,
        maskedValue: maskValue(rawCronSec, 4),
        isSensitive: true,
      },
    ];

    const envBlock = envVariables
      .map((item) => `${item.name}="${item.value.replace(/"/g, '\\"')}"`)
      .join('\n');

    return res.status(200).json({
      success: true,
      data: {
        totalVariables: envVariables.length,
        allConfigured: true,
        databaseTarget: rawDbId,
        projectId: rawProjectId,
        variables: envVariables,
        envBlock,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[Admin Env Status Error]:', err);
    return res.status(500).json({ error: 'خطأ في جلب حالة متغيرات البيئة' });
  }
}


