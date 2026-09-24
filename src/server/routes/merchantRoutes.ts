import type { Request, Response } from 'express';
import crypto from 'crypto';
import { dbStore, sha256 } from '../../db/store.ts';
import { authenticateMerchant } from './handlers.ts';
import { createWalletSchema } from '../validations.ts';
import { dispatchPaymentWebhook, executeWebhookWithRetry } from '../services/webhookService.ts';
import { processIncomingDeviceSms } from '../services/smsMatcherService.ts';

// Extract merchantId or default to demo merchant
function resolveMerchantId(req: Request): string {
  const authId = authenticateMerchant(req);
  if (authId) return authId;
  const headerId = req.headers['x-merchant-id'] as string;
  if (headerId && dbStore.getMerchantById(headerId)) {
    return headerId;
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
