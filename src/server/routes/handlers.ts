import type { Request, Response } from 'express';
import crypto from 'crypto';
import { dbStore, sha256 } from '../../db/store.ts';
import {
  createPaymentSchema,
  pairDeviceSchema,
  deviceSmsSchema,
  verifyPaymentTransactionSchema,
  createWalletSchema,
} from '../validations.ts';
import { processIncomingDeviceSms } from '../services/smsMatcherService.ts';
import { dispatchPaymentWebhook } from '../services/webhookService.ts';
import { FirestorePaymentService } from '../firestoreService.ts';

// Helper to authenticate merchant via Bearer token (API Secret Key or Dashboard Session)
export function authenticateMerchant(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    // Check fallback query or custom header
    const customKey = req.headers['x-api-key'] as string;
    if (customKey) {
      const keyRecord = dbStore.getApiKeyBySecretHash(sha256(customKey));
      if (keyRecord) {
        return keyRecord.merchantId;
      }
    }
    return null;
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  // 1. Check if token is an API Secret Key (starts with sk_live_)
  if (token.startsWith('sk_live_')) {
    const keyRecord = dbStore.getApiKeyBySecretHash(sha256(token));
    if (keyRecord) {
      keyRecord.lastUsedAt = new Date().toISOString();
      return keyRecord.merchantId;
    }
  }

  // 2. Check if token is a merchant ID (for demo UI switching)
  const merchant = dbStore.getMerchantById(token);
  if (merchant) {
    return merchant.id;
  }

  return null;
}

/**
 * POST /api/device/pair
 * Merchant generates one-time pairing code; Device calls this to pair
 * Body: { "pairingCode": "ABCD-1234", "deviceName": "Samsung A12" }
 * -> { "deviceId": "...", "deviceSecret": "..." }
 */
export async function handleDevicePair(req: Request, res: Response) {
  try {
    const parseResult = pairDeviceSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'بيانات غير صالحة',
        details: parseResult.error.flatten(),
      });
    }

    const { pairingCode, deviceName } = parseResult.data;
    const paired = dbStore.pairDevice(pairingCode.trim().toUpperCase(), deviceName);

    if (!paired) {
      return res.status(400).json({
        error: 'كود الاقتران غير صالح أو منتهي الصلاحية (Invalid or expired pairing code)',
      });
    }

    dbStore.createAuditLog({
      merchantId: paired.merchantId,
      actor: `device:${deviceName}`,
      action: 'device.paired',
      details: { deviceId: paired.deviceId, deviceName },
    });

    return res.status(200).json({
      deviceId: paired.deviceId,
      deviceSecret: paired.deviceSecret,
      merchantId: paired.merchantId,
      message: 'تم اقتران الجهاز بنجاح',
    });
  } catch (err) {
    console.error('[Device Pair Error]:', err);
    return res.status(500).json({ error: 'خطأ داخلي في الخادم' });
  }
}

/**
 * POST /api/device/sms
 * Forwarded SMS from paired Android phone
 * Headers:
 *   X-Device-Id: <uuid>
 *   X-Timestamp: <unix seconds>
 *   X-Signature: hex(HMAC_SHA256(deviceSecret, timestamp + "." + rawBody))
 */
export async function handleDeviceSms(req: Request, res: Response) {
  try {
    const deviceId = (req.headers['x-device-id'] as string) || '';
    const timestamp = (req.headers['x-timestamp'] as string) || '';
    const signature = (req.headers['x-signature'] as string) || '';

    if (!deviceId || !timestamp || !signature) {
      return res.status(401).json({
        error: 'Missing required authentication headers (X-Device-Id, X-Timestamp, X-Signature)',
      });
    }

    const bodyValidation = deviceSmsSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      return res.status(400).json({
        error: 'Invalid SMS body format',
        details: bodyValidation.error.flatten(),
      });
    }

    // Capture raw body string if available or stringify body
    const rawBody = (req as Request & { rawBody?: string }).rawBody || JSON.stringify(req.body);

    const result = await processIncomingDeviceSms({
      deviceId,
      timestampHeader: timestamp,
      signatureHeader: signature,
      rawBody,
      parsedBody: bodyValidation.data,
    });

    return res.status(result.statusCode).json(result.response);
  } catch (err) {
    console.error('[Device SMS Processing Error]:', err);
    return res.status(500).json({ error: 'خطأ داخلي أثناء معالجة الرسالة' });
  }
}

/**
 * POST /api/device/heartbeat
 * Android phone background ping to update battery & connectivity
 */
export async function handleDeviceHeartbeat(req: Request, res: Response) {
  try {
    const deviceId = (req.headers['x-device-id'] as string) || req.body.deviceId;
    const { batteryLevel, isCharging, networkType, appVersion } = req.body || {};

    if (!deviceId) {
      return res.status(400).json({ error: 'معرف الجهاز مطلوب (deviceId is required)' });
    }

    const updated = dbStore.updateDeviceHeartbeat(deviceId, {
      batteryLevel: typeof batteryLevel === 'number' ? batteryLevel : undefined,
      isCharging: typeof isCharging === 'boolean' ? isCharging : undefined,
      networkType: networkType ? String(networkType) : undefined,
      appVersion: appVersion ? String(appVersion) : undefined,
    });

    if (!updated) {
      return res.status(404).json({ error: 'الجهاز غير مسجل' });
    }

    return res.status(200).json({
      success: true,
      status: 'online',
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Device Heartbeat Error]:', err);
    return res.status(500).json({ error: 'خطأ في معالجة النبضة' });
  }
}

/**
 * POST /api/v1/payments
 * Create a new payment with unique payable amount (random unused piasters)
 */
export async function handleCreatePayment(req: Request, res: Response) {
  try {
    const merchantId = authenticateMerchant(req);
    if (!merchantId) {
      return res.status(401).json({
        error: 'غير مصرح: يجب توفير مفتاح API صالح (Invalid API Key)',
      });
    }

    const valResult = createPaymentSchema.safeParse(req.body);
    if (!valResult.success) {
      return res.status(400).json({
        error: 'بيانات الدفعة غير صالحة',
        details: valResult.error.flatten(),
      });
    }

    const { amount, orderRef, webhookUrl, customerPhone, notes, metadata, walletId } = valResult.data;

    // Pick wallet if specified, or default active wallet of merchant
    const wallets = dbStore.getWalletsByMerchant(merchantId);
    let targetWalletId = walletId;
    if (!targetWalletId) {
      const defaultWallet = wallets.find((w) => w.isDefault && w.isActive) || wallets.find((w) => w.isActive);
      targetWalletId = defaultWallet?.id;
    }

    const host = req.get('host') || 'pay.ehabgm.sbs';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;

    // Reserve unique payable amount and minimal public status document inside Firestore transaction
    const { payment, checkoutUrl, statusToken } = await FirestorePaymentService.reservePaymentInTransaction({
      merchantId,
      orderRef,
      baseAmount: amount,
      walletId: targetWalletId || 'w-demo-2001',
      customerPhone: customerPhone || undefined,
      webhookUrl: webhookUrl || undefined,
      baseUrl,
    });

    dbStore.createAuditLog({
      merchantId,
      actor: `api_key`,
      action: 'payment.created',
      details: {
        paymentId: payment.id,
        orderRef: payment.orderRef,
        amount: payment.payableAmount,
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        id: payment.id,
        orderRef: payment.orderRef,
        baseAmount: payment.baseAmount,
        payableAmount: payment.payableAmount,
        piasters: payment.piasters,
        currency: payment.currency,
        status: payment.status,
        statusToken,
        checkoutUrl,
        expiresAt: payment.expiresAt,
        createdAt: payment.createdAt,
      },
    });
  } catch (err) {
    console.error('[Create Payment Error]:', err);
    return res.status(500).json({ error: 'حدث خطأ أثناء إنشاء الدفعة' });
  }
}

/**
 * GET /api/v1/payments/:id
 * Retrieve payment status (polled by checkout page and returns statusToken for onSnapshot)
 */
export async function handleGetPayment(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const payment = dbStore.getPaymentById(id);

    if (!payment) {
      return res.status(404).json({ error: 'الدفعة غير موجودة' });
    }

    // Auto expire check
    if (payment.status === 'pending' && new Date(payment.expiresAt) <= new Date()) {
      payment.status = 'expired';
    }

    const merchant = dbStore.getMerchantById(payment.merchantId);
    const wallet = payment.walletId ? dbStore.getWalletById(payment.walletId) : undefined;

    return res.status(200).json({
      success: true,
      data: {
        id: payment.id,
        orderRef: payment.orderRef,
        baseAmount: payment.baseAmount,
        payableAmount: payment.payableAmount,
        piasters: payment.piasters,
        currency: payment.currency,
        status: payment.status,
        statusToken: payment.statusToken,
        expiresAt: payment.expiresAt,
        confirmedAt: payment.confirmedAt,
        merchantName: merchant?.name || 'تاجر إيهاب جي إم',
        wallet: wallet
          ? {
              provider: wallet.provider,
              identifier: wallet.identifier,
              label: wallet.label,
            }
          : {
              provider: 'vodafone_cash',
              identifier: '01098765432',
              label: 'محفظة الدفع الرسمية',
            },
        verifiedTransactionId: payment.verifiedTransactionId,
      },
    });
  } catch (err) {
    console.error('[Get Payment Error]:', err);
    return res.status(500).json({ error: 'خطأ أثناء جلب بيانات الدفعة' });
  }
}

/**
 * POST /api/v1/payments/:id/verify
 * Customer alternative verification by entering transaction ID manually
 */
export async function handleCustomerVerifyPayment(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const payment = dbStore.getPaymentById(id);
    if (!payment) {
      return res.status(404).json({ error: 'الدفعة غير موجودة' });
    }

    if (payment.status === 'completed') {
      return res.status(200).json({
        success: true,
        message: 'تم تأكيد الدفعة بالفعل مسبقاً',
        status: 'completed',
      });
    }

    const valResult = verifyPaymentTransactionSchema.safeParse(req.body);
    if (!valResult.success) {
      return res.status(400).json({
        error: 'رقم العملية غير صالح',
      });
    }

    const { transactionId, senderPhone, senderName, receiptScreenshot, amountPaid } = valResult.data;

    // 1. Check if an unmatched or review SMS exists with this transaction ID or phone
    let matchingSms = transactionId ? dbStore.getSmsLogByTransactionId(transactionId) : null;
    if (!matchingSms && senderPhone) {
      matchingSms = dbStore.smsLogs.find(
        (s) =>
          s.merchantId === payment.merchantId &&
          s.matchStatus !== 'matched' &&
          (s.counterpartyPhone === senderPhone || s.rawText.includes(senderPhone)) &&
          Math.abs(s.amount - payment.payableAmount) < 0.05,
      ) || null;
    }

    if (matchingSms && matchingSms.merchantId === payment.merchantId) {
      const nowIso = new Date().toISOString();
      payment.status = 'completed';
      payment.confirmedAt = nowIso;
      payment.matchedSmsId = matchingSms.id;
      payment.verifiedTransactionId = matchingSms.transactionId || transactionId || 'TRX-MANUAL';
      matchingSms.matchStatus = 'matched';
      matchingSms.matchedPaymentId = payment.id;

      dispatchPaymentWebhook(payment, 'payment.completed').catch(console.error);

      dbStore.createAuditLog({
        merchantId: payment.merchantId,
        actor: 'customer_proof_matched',
        action: 'payment.completed',
        details: {
          paymentId: payment.id,
          transactionId: payment.verifiedTransactionId,
          senderPhone,
          senderName,
        },
      });

      return res.status(200).json({
        success: true,
        status: 'completed',
        message: 'تم التحقق من بيانات التحويل ومطابقة العملية وتأكيد الدفعة بنجاح!',
      });
    }

    // 2. If SMS hasn't arrived or exact match pending, record proof into Review Queue
    if (transactionId) {
      payment.verifiedTransactionId = transactionId;
    }
    if (senderPhone) {
      payment.customerPhone = senderPhone;
    }

    const reviewLogId = `sms-rev-${crypto.randomUUID().slice(0, 8)}`;
    const nowIso = new Date().toISOString();
    
    // Create an explicit review entry for the merchant dashboard
    dbStore.smsLogs.push({
      id: reviewLogId,
      deviceId: 'manual-customer-entry',
      merchantId: payment.merchantId,
      sender: senderName ? `${senderName} (${senderPhone || 'عميل'})` : (senderPhone || 'تحويل عميل مباشر'),
      rawText: `إشعار إيداع من العميل: رقم المعاملة ${transactionId || 'غير محدد'} - هاتف: ${senderPhone || 'غير محدد'} - المبلغ: ${amountPaid || payment.payableAmount} ج.م ${receiptScreenshot ? '(مرفق إيصال صورة)' : ''}`,
      amount: amountPaid || payment.payableAmount,
      counterpartyPhone: senderPhone || null,
      transactionId: transactionId || `MANUAL-${Date.now().toString().slice(-6)}`,
      receivedAt: nowIso,
      matchStatus: 'review',
      matchedPaymentId: payment.id,
      reviewReason: `إثبات دفع يدوي مقدم من العميل: ${senderName || ''} (${senderPhone || ''}) بانتظار تأكيد الرسالة أو المشرف`,
      processedAt: nowIso,
      createdAt: nowIso,
    });

    dbStore.createAuditLog({
      merchantId: payment.merchantId,
      actor: 'customer',
      action: 'payment.proof_submitted',
      details: {
        paymentId: payment.id,
        transactionId,
        senderPhone,
        senderName,
        hasScreenshot: Boolean(receiptScreenshot),
      },
    });

    return res.status(200).json({
      success: true,
      status: 'pending',
      message: 'تم استلام بيانات التحويل وإشعار الدفع بنجاح، جاري التحقق التلقائي مع رسائل المحفظة.',
    });
  } catch (err) {
    console.error('[Customer Verify Payment Error]:', err);
    return res.status(500).json({ error: 'خطأ أثناء التحقق من العملية' });
  }
}

/**
 * GET /api/cron/expire-payments
 * Vercel Cron endpoint to expire old payments
 */
export async function handleCronExpirePayments(req: Request, res: Response) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.authorization;
    const querySecret = req.query.secret as string | undefined;
    const customHeader = req.headers['x-cron-secret'] as string | undefined;

    if (cronSecret) {
      const isAuthorized =
        authHeader === `Bearer ${cronSecret}` ||
        querySecret === cronSecret ||
        customHeader === cronSecret;

      if (!isAuthorized) {
        return res.status(401).json({ error: 'Unauthorized cron request' });
      }
    }

    const expiredCount = dbStore.expirePendingPayments();
    return res.status(200).json({
      success: true,
      expiredCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Cron Expire Error]:', err);
    return res.status(500).json({ error: 'خطأ في معالجة مهمة انتهاء الصلاحية' });
  }
}
