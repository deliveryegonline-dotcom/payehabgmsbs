import { z } from 'zod';

export const createPaymentSchema = z.object({
  amount: z.number().positive('المبلغ يجب أن يكون أكبر من صفر'),
  orderRef: z.string().min(1, 'رقم الطلب مطلوب'),
  webhookUrl: z.string().url('رابط الويب هوك غير صالح').optional().or(z.literal('')),
  customerPhone: z.string().optional().or(z.literal('')),
  notes: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  walletId: z.string().optional(),
});

export const pairDeviceSchema = z.object({
  pairingCode: z.string().min(4, 'كود الاقتران غير صالح'),
  deviceName: z.string().min(2, 'اسم الجهاز مطلوب').max(100),
});

export const deviceSmsSchema = z.object({
  sender: z.string().min(1, 'المرسل مطلوب'),
  rawText: z.string().min(1, 'نص الرسالة مطلوب'),
  amount: z.number().positive('المبلغ يجب أن يكون أكبر من صفر'),
  counterpartyPhone: z.string().optional().nullable(),
  transactionId: z.string().min(3, 'رقم المعاملة غير صالح'),
  receivedAt: z.string().min(1, 'وقت الاستلام مطلوب'),
});

export const verifyPaymentTransactionSchema = z.object({
  transactionId: z.string().optional().or(z.literal('')),
  senderPhone: z.string().optional().or(z.literal('')),
  senderName: z.string().optional().or(z.literal('')),
  receiptScreenshot: z.string().optional().or(z.literal('')),
  amountPaid: z.number().optional(),
});

export const manualConfirmSchema = z.object({
  paymentId: z.string().min(1, 'معرف الدفعة مطلوب'),
});

export const createWalletSchema = z.object({
  provider: z.enum(['vodafone_cash', 'instapay', 'orange_cash', 'etisalat_cash']),
  identifier: z.string().min(5, 'رقم أو عنوان المحفظة مطلوب'),
  label: z.string().min(2, 'اسم أو تسمية المحفظة مطلوب'),
  isDefault: z.boolean().optional(),
});
