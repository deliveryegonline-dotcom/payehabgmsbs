import crypto from 'crypto';
import { dbStore } from '../../db/store.ts';
import { dispatchPaymentWebhook } from './webhookService.ts';
import { FirestorePaymentService } from '../firestoreService.ts';

export interface ProcessSmsParams {
  deviceId: string;
  timestampHeader: string | number;
  signatureHeader: string;
  rawBody: string;
  parsedBody: {
    sender: string;
    rawText: string;
    amount: number;
    counterpartyPhone?: string | null;
    transactionId: string;
    receivedAt: string;
  };
}

export interface ProcessSmsResult {
  statusCode: number;
  response: {
    status: 'matched' | 'duplicate' | 'unmatched';
    message?: string;
    paymentId?: string;
    reason?: string;
  };
}

export async function processIncomingDeviceSms(params: ProcessSmsParams): Promise<ProcessSmsResult> {
  const { deviceId, timestampHeader, signatureHeader, rawBody, parsedBody } = params;

  // 1. Check Device Existence
  const device = dbStore.getDeviceById(deviceId);
  if (!device || !device.isPaired) {
    return {
      statusCode: 401,
      response: {
        status: 'unmatched',
        message: 'الجهاز غير معرف أو غير مقترن (Device not found or not paired)',
      },
    };
  }

  // 2. Reject Timestamps Older Than 5 Minutes (300 seconds) - Replay Protection
  const timestampNum = typeof timestampHeader === 'string' ? parseInt(timestampHeader, 10) : timestampHeader;
  const currentUnix = Math.floor(Date.now() / 1000);

  if (isNaN(timestampNum) || Math.abs(currentUnix - timestampNum) > 300) {
    return {
      statusCode: 401,
      response: {
        status: 'unmatched',
        message: 'الوقت منتهي أو غير صالح - يتجاوز 5 دقائق (Timestamp expired or invalid)',
      },
    };
  }

  // 3. Verify HMAC Signature: hex(HMAC_SHA256(deviceSecret, timestamp + "." + rawBody))
  const expectedSig = crypto
    .createHmac('sha256', device.deviceSecret)
    .update(`${timestampNum}.${rawBody}`)
    .digest('hex');

  const sigBuffer = Buffer.from(signatureHeader || '', 'hex');
  const expectedBuffer = Buffer.from(expectedSig, 'hex');

  const isValidSignature =
    sigBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(sigBuffer, expectedBuffer);

  if (!isValidSignature) {
    return {
      statusCode: 401,
      response: {
        status: 'unmatched',
        message: 'توقيع أو وقت غلط (Invalid HMAC signature or timestamp)',
      },
    };
  }

  // Update Device Activity
  dbStore.updateDeviceLastSeen(deviceId);

  // 4. Enforce Idempotency & Matching inside Firestore Transaction:
  // - Document ID: merchantId_transactionId with create()
  // - Matches by device merchant + exact amount + pending status inside transaction
  // - Updates public_payment_statuses/{statusToken} for real-time onSnapshot listener
  const result = await FirestorePaymentService.processSmsWithIdempotencyTransaction({
    deviceId: device.id,
    merchantId: device.merchantId,
    sender: parsedBody.sender,
    rawText: parsedBody.rawText,
    amount: parsedBody.amount,
    counterpartyPhone: parsedBody.counterpartyPhone || undefined,
    transactionId: parsedBody.transactionId,
    receivedAt: parsedBody.receivedAt || new Date().toISOString(),
  });

  if (result.status === 'duplicate') {
    return {
      statusCode: 200,
      response: {
        status: 'duplicate',
        message: 'عملية مكررة تم تسجيلها بالفعل (Duplicate transaction ID)',
      },
    };
  }

  if (result.status === 'matched' && result.payment) {
    // Dispatch Signed Webhook with exponential backoff retries
    dispatchPaymentWebhook(result.payment, 'payment.completed').catch((err) =>
      console.error('[Webhook Dispatch Error]:', err),
    );

    // Audit Log
    dbStore.createAuditLog({
      merchantId: device.merchantId,
      actor: `device:${device.deviceName}`,
      action: 'payment.confirmed',
      details: {
        paymentId: result.payment.id,
        amount: parsedBody.amount,
        transactionId: parsedBody.transactionId,
        orderRef: result.payment.orderRef,
      },
    });

    return {
      statusCode: 200,
      response: {
        status: 'matched',
        paymentId: result.payment.id,
        message: 'تمت مطابقة وتأكيد الدفعة بنجاح عبر معاملة Firestore المحمية',
      },
    };
  }

  // Ambiguous or unmatched -> sent to Review Queue
  dbStore.createAuditLog({
    merchantId: device.merchantId,
    actor: `device:${device.deviceName}`,
    action: 'sms.needs_review',
    details: {
      amount: parsedBody.amount,
      transactionId: parsedBody.transactionId,
      reason: result.reason || 'unmatched',
    },
  });

  return {
    statusCode: 200,
    response: {
      status: 'unmatched',
      reason: result.reason || 'no_matching_payment',
      message: 'الرسالة محولة لطابور المراجعة اليدوية',
    },
  };
}
