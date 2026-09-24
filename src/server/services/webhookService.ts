import crypto from 'crypto';
import { dbStore } from '../../db/store.ts';
import type { PaymentRecord } from '../../db/types.ts';

export async function dispatchPaymentWebhook(payment: PaymentRecord, event: string = 'payment.completed') {
  const merchant = dbStore.getMerchantById(payment.merchantId);
  const targetUrl = payment.webhookUrl || merchant?.webhookUrl;

  if (!targetUrl) {
    console.log(`[Webhook] No webhook URL configured for merchant ${payment.merchantId}`);
    return;
  }

  const webhookSecret = merchant?.webhookSecret || 'whsec_default_' + payment.merchantId;
  const timestamp = Math.floor(Date.now() / 1000);

  const payload = {
    event,
    timestamp: new Date().toISOString(),
    data: {
      paymentId: payment.id,
      orderRef: payment.orderRef,
      baseAmount: payment.baseAmount,
      payableAmount: payment.payableAmount,
      currency: payment.currency,
      status: payment.status,
      customerPhone: payment.customerPhone,
      transactionId: payment.verifiedTransactionId,
      confirmedAt: payment.confirmedAt,
      metadata: payment.metadata,
    },
  };

  const rawPayload = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', webhookSecret)
    .update(`${timestamp}.${rawPayload}`)
    .digest('hex');

  // Attempt 1 with retry logic
  await executeWebhookWithRetry({
    merchantId: payment.merchantId,
    paymentId: payment.id,
    url: targetUrl,
    payload,
    signature,
    timestamp,
    attempt: 1,
    maxAttempts: 3,
  });
}

interface WebhookAttemptParams {
  merchantId: string;
  paymentId: string;
  url: string;
  payload: Record<string, unknown>;
  signature: string;
  timestamp: number;
  attempt: number;
  maxAttempts: number;
}

export async function executeWebhookWithRetry(params: WebhookAttemptParams) {
  const { merchantId, paymentId, url, payload, signature, timestamp, attempt, maxAttempts } = params;

  let statusCode: number | null = null;
  let responseBody: string | null = null;
  let success = false;
  let errorMsg: string | null = null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-EHABGM-Signature': signature,
        'X-EHABGM-Timestamp': timestamp.toString(),
        'User-Agent': 'EHABGM-Pay-Webhook/1.0',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    statusCode = res.status;
    responseBody = await res.text().catch(() => '');

    if (res.ok) {
      success = true;
    } else {
      errorMsg = `Server responded with HTTP ${res.status}`;
    }
  } catch (err: unknown) {
    errorMsg = err instanceof Error ? err.message : String(err);
  }

  // Calculate next retry if failed and under max attempts
  let nextRetryAt: string | null = null;
  if (!success && attempt < maxAttempts) {
    // Exponential backoff: attempt 1 -> 5s, attempt 2 -> 20s
    const backoffSeconds = Math.pow(attempt, 2) * 5;
    nextRetryAt = new Date(Date.now() + backoffSeconds * 1000).toISOString();

    // Schedule background retry
    setTimeout(() => {
      executeWebhookWithRetry({
        ...params,
        attempt: attempt + 1,
      }).catch((e) => console.error('[Webhook Retry Error]:', e));
    }, backoffSeconds * 1000);
  }

  // Log attempt
  dbStore.createWebhookLog({
    merchantId,
    paymentId,
    event: (payload.event as string) || 'payment.completed',
    url,
    payload,
    signature,
    statusCode,
    responseBody: responseBody ? responseBody.slice(0, 1000) : null,
    attempt,
    maxAttempts,
    success,
    error: errorMsg,
    nextRetryAt,
  });

  return { success, statusCode, errorMsg };
}
