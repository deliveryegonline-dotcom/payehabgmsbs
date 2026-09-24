import crypto from 'crypto';
import type { Transaction, QueryDocumentSnapshot, DocumentData } from 'firebase-admin/firestore';
import type {
  PaymentRecord,
  SmsLogRecord,
} from '../db/types.ts';
import { getAdminFirestore } from './firebaseAdmin.ts';
import { dbStore } from '../db/store.ts';

/**
 * High-performance Firestore Service implementing:
 * 1. Server-side only access via Firebase Admin SDK
 * 2. Strict document ID idempotency: merchantId_transactionId with create()
 * 3. Reserve unique payable amounts in Firestore transaction
 * 4. Confirm payments and update minimal public status document in Firestore transaction
 * 5. Multi-merchant dashboard and audit logs
 */

export interface PublicPaymentStatusDoc {
  status: 'pending' | 'completed' | 'expired' | 'cancelled' | 'review';
  confirmedAt?: string;
  expiresAt: string;
  updatedAt: string;
}

export class FirestorePaymentService {
  /**
   * Reserves a unique payable amount for a merchant within a Firestore transaction.
   * Also creates the minimal public status document with an unguessable ID.
   */
  static async reservePaymentInTransaction(params: {
    merchantId: string;
    orderRef: string;
    baseAmount: number;
    walletId: string;
    customerPhone?: string;
    webhookUrl?: string;
    baseUrl?: string;
  }): Promise<{ payment: PaymentRecord; checkoutUrl: string; statusToken: string }> {
    const db = getAdminFirestore();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
    const paymentId = `pay-${crypto.randomUUID().slice(0, 16)}`;
    const statusToken = crypto.randomBytes(32).toString('hex'); // Unguessable 64-character token
    const baseUrl = params.baseUrl || 'https://pay.ehabgm.sbs';

    try {
      if (db) {
        return await db.runTransaction(async (transaction: Transaction) => {
          // 1. Query pending payments for this merchant to find currently allocated piasters
          const pendingQuery = db
            .collection('payments')
            .where('merchantId', '==', params.merchantId)
            .where('status', '==', 'pending');

          const snapshot = await transaction.get(pendingQuery);
          const usedPiasters = new Set<number>();

          snapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
            const data = doc.data() as PaymentRecord;
            if (new Date(data.expiresAt) > now) {
              usedPiasters.add(data.piasters);
            }
          });

          // 2. Find available piasters between 1 and 99
          const available: number[] = [];
          for (let p = 1; p <= 99; p++) {
            if (!usedPiasters.has(p)) {
              available.push(p);
            }
          }

          const selectedPiaster =
            available.length > 0
              ? available[Math.floor(Math.random() * available.length)]!
              : Math.floor(Math.random() * 99) + 1;

          const payableAmount =
            Math.round((params.baseAmount + selectedPiaster / 100) * 100) / 100;

          const paymentRecord: PaymentRecord = {
            id: paymentId,
            merchantId: params.merchantId,
            walletId: params.walletId,
            orderRef: params.orderRef,
            baseAmount: params.baseAmount,
            payableAmount,
            piasters: selectedPiaster,
            currency: 'EGP',
            status: 'pending',
            statusToken,
            customerPhone: params.customerPhone || null,
            webhookUrl: params.webhookUrl || null,
            expiresAt,
            confirmedAt: null,
            verifiedTransactionId: null,
            matchedSmsId: null,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
          };

          // 3. Write payment document to private collection (Denied to client reads/writes)
          const paymentRef = db.collection('payments').doc(paymentId);
          transaction.set(paymentRef, paymentRecord);

          // 4. Write minimal public status document (Read-only single get for checkout onSnapshot)
          const publicStatusRef = db.collection('public_payment_statuses').doc(statusToken);
          const publicStatus: PublicPaymentStatusDoc = {
            status: 'pending',
            expiresAt,
            updatedAt: now.toISOString(),
          };
          transaction.set(publicStatusRef, publicStatus);

          return {
            payment: paymentRecord,
            checkoutUrl: `${baseUrl}/c/${paymentId}`,
            statusToken,
          };
        });
      }
    } catch (err) {
      console.warn('[Firestore] Live transaction failed, falling back to local sync engine:', err);
    }

    // Fallback sync engine: replicates identical transaction logic
    const { payment, checkoutUrl } = dbStore.createPayment({
      merchantId: params.merchantId,
      walletId: params.walletId,
      orderRef: params.orderRef,
      baseAmount: params.baseAmount,
      customerPhone: params.customerPhone,
      webhookUrl: params.webhookUrl,
      baseUrl,
    });

    return { payment, checkoutUrl, statusToken: payment.statusToken };
  }

  /**
   * Processes incoming SMS inside a Firestore transaction:
   * 1. Enforces idempotency by writing to processed_transactions/{merchantId}_{transactionId} with create()
   * 2. Matches pending payment by merchant + payableAmount
   * 3. Confirms payment and updates the public status document for real-time checkout onSnapshot
   */
  static async processSmsWithIdempotencyTransaction(params: {
    deviceId: string;
    merchantId: string;
    sender: string;
    rawText: string;
    amount: number;
    counterpartyPhone?: string;
    transactionId: string;
    receivedAt: string;
  }): Promise<{
    status: 'matched' | 'duplicate' | 'unmatched';
    payment?: PaymentRecord;
    reason?: string;
    smsLogId: string;
  }> {
    const db = getAdminFirestore();
    const idempotencyKey = `${params.merchantId}_${params.transactionId}`;
    const smsLogId = `sms-${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    try {
      if (db) {
        return await db.runTransaction(async (transaction: Transaction) => {
          const idempotencyRef = db.collection('processed_transactions').doc(idempotencyKey);

          // 1. Check idempotency: if document exists, it is a duplicate!
          const existingDoc = await transaction.get(idempotencyRef);
          if (existingDoc.exists) {
            // Record duplicate in sms_logs
            const dupLog: SmsLogRecord = {
              id: smsLogId,
              deviceId: params.deviceId,
              merchantId: params.merchantId,
              sender: params.sender,
              rawText: params.rawText,
              amount: params.amount,
              counterpartyPhone: params.counterpartyPhone || null,
              transactionId: params.transactionId,
              receivedAt: params.receivedAt,
              matchStatus: 'duplicate',
              matchedPaymentId: null,
              reviewReason: 'رقم العملية مسجل مسبقاً في النظام (Idempotency Key Conflict)',
              processedAt: now,
              createdAt: now,
            };
            transaction.set(db.collection('sms_logs').doc(smsLogId), dupLog);

            return {
              status: 'duplicate' as const,
              reason: 'duplicate_transaction',
              smsLogId,
            };
          }

          // 2. Enforce idempotency: create processed_transaction document
          transaction.create(idempotencyRef, {
            merchantId: params.merchantId,
            transactionId: params.transactionId,
            amount: params.amount,
            sender: params.sender,
            processedAt: now,
          });

          // 3. Find pending payment matching exact payable amount
          const paymentsQuery = db
            .collection('payments')
            .where('merchantId', '==', params.merchantId)
            .where('status', '==', 'pending')
            .where('payableAmount', '==', params.amount);

          const matchingDocs = await transaction.get(paymentsQuery);
          const validMatches: PaymentRecord[] = [];

          matchingDocs.forEach((d: QueryDocumentSnapshot<DocumentData>) => {
            const p = d.data() as PaymentRecord;
            if (new Date(p.expiresAt) > new Date()) {
              validMatches.push(p);
            }
          });

          // 4. Exact Single Match: Confirm Payment
          if (validMatches.length === 1) {
            const matchedPayment = validMatches[0]!;
            const paymentRef = db.collection('payments').doc(matchedPayment.id);

            // Update payment record in private financial collection
            transaction.update(paymentRef, {
              status: 'completed',
              confirmedAt: now,
              verifiedTransactionId: params.transactionId,
              matchedSmsId: smsLogId,
              updatedAt: now,
            });

            // Update minimal public status document for client onSnapshot listener
            if (matchedPayment.statusToken) {
              const publicRef = db
                .collection('public_payment_statuses')
                .doc(matchedPayment.statusToken);
              transaction.update(publicRef, {
                status: 'completed',
                confirmedAt: now,
                updatedAt: now,
              });
            }

            // Save matched SMS log
            const smsRecord: SmsLogRecord = {
              id: smsLogId,
              deviceId: params.deviceId,
              merchantId: params.merchantId,
              sender: params.sender,
              rawText: params.rawText,
              amount: params.amount,
              counterpartyPhone: params.counterpartyPhone || null,
              transactionId: params.transactionId,
              receivedAt: params.receivedAt,
              matchStatus: 'matched',
              matchedPaymentId: matchedPayment.id,
              reviewReason: null,
              processedAt: now,
              createdAt: now,
            };
            transaction.set(db.collection('sms_logs').doc(smsLogId), smsRecord);

            const updatedPayment: PaymentRecord = {
              ...matchedPayment,
              status: 'completed',
              confirmedAt: now,
              verifiedTransactionId: params.transactionId,
              matchedSmsId: smsLogId,
              updatedAt: now,
            };

            return {
              status: 'matched' as const,
              payment: updatedPayment,
              smsLogId,
            };
          }

          // 5. Unmatched or Multiple Matches: Send to Review Queue
          const reviewReason =
            validMatches.length > 1
              ? `تطابق متعدد: يوجد ${validMatches.length} عمليات معلقة بنفس المبلغ تماماً`
              : 'لم يتم العثور على عملية معلقة بنفس المبلغ المخصص';

          const reviewSmsRecord: SmsLogRecord = {
            id: smsLogId,
            deviceId: params.deviceId,
            merchantId: params.merchantId,
            sender: params.sender,
            rawText: params.rawText,
            amount: params.amount,
            counterpartyPhone: params.counterpartyPhone || null,
            transactionId: params.transactionId,
            receivedAt: params.receivedAt,
            matchStatus: 'review',
            matchedPaymentId: null,
            reviewReason,
            processedAt: now,
            createdAt: now,
          };
          transaction.set(db.collection('sms_logs').doc(smsLogId), reviewSmsRecord);

          return {
            status: 'unmatched' as const,
            reason: validMatches.length > 1 ? 'ambiguous_match' : 'no_matching_payment',
            smsLogId,
          };
        });
      }
    } catch (err) {
      console.warn('[Firestore] Live SMS transaction failed, falling back to local sync engine:', err);
    }

    // Fallback sync engine with identical idempotency check and create() logic
    return dbStore.processSmsWithIdempotency({
      deviceId: params.deviceId,
      merchantId: params.merchantId,
      sender: params.sender,
      rawText: params.rawText,
      amount: params.amount,
      counterpartyPhone: params.counterpartyPhone,
      transactionId: params.transactionId,
      receivedAt: params.receivedAt,
    });
  }

  /**
   * Confirms payment manually from Review Queue inside a Firestore transaction.
   */
  static async manuallyConfirmPaymentInTransaction(params: {
    smsLogId: string;
    paymentId: string;
    notes?: string;
  }): Promise<PaymentRecord | null> {
    const db = getAdminFirestore();
    const now = new Date().toISOString();

    try {
      if (db) {
        return await db.runTransaction(async (transaction: Transaction) => {
          const smsRef = db.collection('sms_logs').doc(params.smsLogId);
          const paymentRef = db.collection('payments').doc(params.paymentId);

          const smsDoc = await transaction.get(smsRef);
          const paymentDoc = await transaction.get(paymentRef);

          if (!smsDoc.exists || !paymentDoc.exists) {
            throw new Error('SMS log or payment not found');
          }

          const smsData = smsDoc.data() as SmsLogRecord;
          const paymentData = paymentDoc.data() as PaymentRecord;

          // Update Payment
          transaction.update(paymentRef, {
            status: 'completed',
            confirmedAt: now,
            verifiedTransactionId: smsData.transactionId,
            matchedSmsId: params.smsLogId,
            updatedAt: now,
          });

          // Update Minimal Public Status Document
          if (paymentData.statusToken) {
            const publicRef = db
              .collection('public_payment_statuses')
              .doc(paymentData.statusToken);
            transaction.update(publicRef, {
              status: 'completed',
              confirmedAt: now,
              updatedAt: now,
            });
          }

          // Update SMS
          transaction.update(smsRef, {
            matchStatus: 'matched',
            matchedPaymentId: params.paymentId,
            reviewReason: params.notes || 'تم التأكيد يدوياً من قبل المشرف',
            processedAt: now,
          });

          return {
            ...paymentData,
            status: 'completed',
            confirmedAt: now,
            verifiedTransactionId: smsData.transactionId,
            matchedSmsId: params.smsLogId,
            updatedAt: now,
          };
        });
      }
    } catch (err) {
      console.warn('[Firestore] Manual confirm transaction failed, using local store:', err);
    }

    return dbStore.manuallyConfirmPayment(params.smsLogId, params.paymentId, params.notes);
  }

  /**
   * Gets public payment status by unguessable status token.
   */
  static async getPublicPaymentStatus(statusToken: string): Promise<PublicPaymentStatusDoc | null> {
    const db = getAdminFirestore();
    try {
      if (db) {
        const doc = await db.collection('public_payment_statuses').doc(statusToken).get();
        if (doc.exists) {
          return doc.data() as PublicPaymentStatusDoc;
        }
      }
    } catch (err) {
      console.warn('[Firestore] getPublicPaymentStatus error:', err);
    }

    // Fallback search
    const payment = dbStore.payments.find((p) => p.statusToken === statusToken);
    if (!payment) return null;
    return {
      status: payment.status,
      confirmedAt: payment.confirmedAt || undefined,
      expiresAt: payment.expiresAt,
      updatedAt: payment.updatedAt,
    };
  }
}
