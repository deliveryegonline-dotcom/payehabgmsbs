import crypto from 'crypto';
import type {
  MerchantRecord,
  ApiKeyRecord,
  WalletRecord,
  DeviceRecord,
  PaymentRecord,
  SmsLogRecord,
  WebhookLogRecord,
  AuditLogRecord,
} from './types.ts';

// Initial Seeds for Demo & Immediate Interactive Test
const DEMO_MERCHANT_ID = 'm-demo-1001';
const DEMO_WALLET_ID = 'w-demo-2001';
const DEMO_DEVICE_ID = 'd-demo-3001';
const DEMO_DEVICE_SECRET = 'sec_dev_3f8b9a12c4d5e6f7a8b9c0d1e2f3a4b5';
const DEMO_API_PUBLIC_KEY = 'pk_live_ehabgm_demo_7721';
const DEMO_API_SECRET_KEY = 'sk_live_ehabgm_secret_demo_9843';

// Hash helper
export function sha256(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

class DatabaseStore {
  merchants: MerchantRecord[] = [];
  apiKeys: ApiKeyRecord[] = [];
  wallets: WalletRecord[] = [];
  devices: DeviceRecord[] = [];
  payments: PaymentRecord[] = [];
  smsLogs: SmsLogRecord[] = [];
  webhookLogs: WebhookLogRecord[] = [];
  auditLogs: AuditLogRecord[] = [];

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    // 1. Demo Merchant
    const now = new Date().toISOString();
    this.merchants.push({
      id: DEMO_MERCHANT_ID,
      name: 'متجر الفرسان للإلكترونيات',
      email: 'merchant@ehabgm.eg',
      passwordHash: sha256('password123'),
      webhookUrl: 'https://webhook.site/demo-merchant-endpoint',
      webhookSecret: 'whsec_99182374615243874625',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });

    // 2. Demo API Key
    this.apiKeys.push({
      id: 'k-demo-001',
      merchantId: DEMO_MERCHANT_ID,
      name: 'مفتاح المتجر الرئيسي (Production)',
      publicKey: DEMO_API_PUBLIC_KEY,
      secretHash: sha256(DEMO_API_SECRET_KEY),
      prefix: 'sk_live_ehabgm_...',
      lastUsedAt: now,
      revokedAt: null,
      createdAt: now,
    });

    // 3. Demo Wallets (Vodafone Cash + InstaPay)
    this.wallets.push({
      id: DEMO_WALLET_ID,
      merchantId: DEMO_MERCHANT_ID,
      provider: 'vodafone_cash',
      identifier: '01098765432',
      label: 'فودافون كاش - المبيعات',
      isActive: true,
      isDefault: true,
      createdAt: now,
    });

    this.wallets.push({
      id: 'w-demo-2002',
      merchantId: DEMO_MERCHANT_ID,
      provider: 'instapay',
      identifier: 'alfursan@instapay',
      label: 'إنستاباي - حساب بنكي تجاري',
      isActive: true,
      isDefault: false,
      createdAt: now,
    });

    // 4. Demo Paired Device
    this.devices.push({
      id: DEMO_DEVICE_ID,
      merchantId: DEMO_MERCHANT_ID,
      deviceName: 'Samsung Galaxy A15 (كاشير الفرع)',
      deviceSecret: DEMO_DEVICE_SECRET,
      pairingCode: null,
      pairingCodeExpiresAt: null,
      isPaired: true,
      pairedAt: now,
      lastSeenAt: now,
      status: 'active',
      boundWalletIds: [DEMO_WALLET_ID, 'w-demo-2002'],
      createdAt: now,
    });

    // 5. Demo Payments
    const exp1 = new Date(Date.now() + 25 * 60 * 1000).toISOString();
    const exp2 = new Date(Date.now() + 18 * 60 * 1000).toISOString();
    const pastCompleted = new Date(Date.now() - 40 * 60 * 1000).toISOString();

    const payment1: PaymentRecord = {
      id: 'pay-ord-101',
      merchantId: DEMO_MERCHANT_ID,
      walletId: DEMO_WALLET_ID,
      orderRef: 'ORD-98214',
      baseAmount: 150.0,
      payableAmount: 150.07,
      piasters: 7,
      currency: 'EGP',
      status: 'pending',
      statusToken: 'tok_demo_secure_unguessable_001_101',
      customerPhone: '01012345678',
      webhookUrl: 'https://webhook.site/demo-merchant-endpoint',
      expiresAt: exp1,
      createdAt: now,
      updatedAt: now,
    };

    const payment2: PaymentRecord = {
      id: 'pay-ord-102',
      merchantId: DEMO_MERCHANT_ID,
      walletId: DEMO_WALLET_ID,
      orderRef: 'ORD-98215',
      baseAmount: 320.0,
      payableAmount: 320.43,
      piasters: 43,
      currency: 'EGP',
      status: 'pending',
      statusToken: 'tok_demo_secure_unguessable_002_102',
      customerPhone: '01123456789',
      webhookUrl: 'https://webhook.site/demo-merchant-endpoint',
      expiresAt: exp2,
      createdAt: now,
      updatedAt: now,
    };

    const payment3: PaymentRecord = {
      id: 'pay-ord-100',
      merchantId: DEMO_MERCHANT_ID,
      walletId: DEMO_WALLET_ID,
      orderRef: 'ORD-98200',
      baseAmount: 500.0,
      payableAmount: 500.12,
      piasters: 12,
      currency: 'EGP',
      status: 'completed',
      statusToken: 'tok_demo_secure_unguessable_003_100',
      customerPhone: '01298765432',
      webhookUrl: 'https://webhook.site/demo-merchant-endpoint',
      expiresAt: exp1,
      confirmedAt: pastCompleted,
      verifiedTransactionId: 'VF-998822110',
      createdAt: pastCompleted,
      updatedAt: pastCompleted,
    };

    this.payments.push(payment1, payment2, payment3);

    // 6. Demo SMS Log
    this.smsLogs.push({
      id: 'sms-log-01',
      deviceId: DEMO_DEVICE_ID,
      merchantId: DEMO_MERCHANT_ID,
      sender: 'VF-Cash',
      rawText: 'تم استلام مبلغ 500.12 جنيه من 01298765432 في 2026-09-24 12:15:00 رقم العملية VF-998822110',
      amount: 500.12,
      counterpartyPhone: '01298765432',
      transactionId: 'VF-998822110',
      receivedAt: pastCompleted,
      matchStatus: 'matched',
      matchedPaymentId: 'pay-ord-100',
      processedAt: pastCompleted,
      createdAt: pastCompleted,
    });

    // 7. Audit Log
    this.auditLogs.push({
      id: 'audit-01',
      merchantId: DEMO_MERCHANT_ID,
      actor: 'system',
      action: 'system.init',
      details: { message: 'تهيئة بوابة EHABGM Pay وتفعيل التاجر النموذجي' },
      createdAt: now,
    });
  }

  // --- Merchants ---
  getMerchantById(id: string): MerchantRecord | undefined {
    return this.merchants.find((m) => m.id === id);
  }

  getMerchantByEmail(email: string): MerchantRecord | undefined {
    return this.merchants.find((m) => m.email.toLowerCase() === email.toLowerCase());
  }

  createMerchant(data: Omit<MerchantRecord, 'id' | 'createdAt' | 'updatedAt'>): MerchantRecord {
    const record: MerchantRecord = {
      ...data,
      id: 'm-' + crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.merchants.push(record);
    return record;
  }

  updateMerchant(id: string, updates: Partial<MerchantRecord>): MerchantRecord | undefined {
    const merchant = this.getMerchantById(id);
    if (!merchant) return undefined;
    Object.assign(merchant, updates, { updatedAt: new Date().toISOString() });
    return merchant;
  }

  // --- API Keys ---
  getApiKeyByPublicKey(publicKey: string): ApiKeyRecord | undefined {
    return this.apiKeys.find((k) => k.publicKey === publicKey && !k.revokedAt);
  }

  getApiKeyBySecretHash(secretHash: string): ApiKeyRecord | undefined {
    return this.apiKeys.find((k) => k.secretHash === secretHash && !k.revokedAt);
  }

  createApiKey(merchantId: string, name: string): { apiKey: ApiKeyRecord; secretKey: string } {
    const rawSecret = 'sk_live_' + crypto.randomBytes(24).toString('hex');
    const publicKey = 'pk_live_' + crypto.randomBytes(16).toString('hex');
    const prefix = rawSecret.slice(0, 14) + '...';

    const apiKey: ApiKeyRecord = {
      id: 'k-' + crypto.randomUUID(),
      merchantId,
      name,
      publicKey,
      secretHash: sha256(rawSecret),
      prefix,
      lastUsedAt: null,
      revokedAt: null,
      createdAt: new Date().toISOString(),
    };
    this.apiKeys.push(apiKey);
    return { apiKey, secretKey: rawSecret };
  }

  listApiKeysByMerchant(merchantId: string): ApiKeyRecord[] {
    return this.apiKeys.filter((k) => k.merchantId === merchantId && !k.revokedAt);
  }

  revokeApiKey(id: string, merchantId: string): boolean {
    const key = this.apiKeys.find((k) => k.id === id && k.merchantId === merchantId);
    if (!key) return false;
    key.revokedAt = new Date().toISOString();
    return true;
  }

  // --- Wallets ---
  getWalletsByMerchant(merchantId: string): WalletRecord[] {
    return this.wallets.filter((w) => w.merchantId === merchantId);
  }

  getWalletById(id: string): WalletRecord | undefined {
    return this.wallets.find((w) => w.id === id);
  }

  createWallet(data: Omit<WalletRecord, 'id' | 'createdAt'>): WalletRecord {
    if (data.isDefault) {
      this.wallets.forEach((w) => {
        if (w.merchantId === data.merchantId) w.isDefault = false;
      });
    }
    const record: WalletRecord = {
      ...data,
      id: 'w-' + crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.wallets.push(record);
    return record;
  }

  updateWallet(id: string, merchantId: string, updates: Partial<WalletRecord>): WalletRecord | undefined {
    const wallet = this.wallets.find((w) => w.id === id && w.merchantId === merchantId);
    if (!wallet) return undefined;
    if (updates.isDefault) {
      this.wallets.forEach((w) => {
        if (w.merchantId === merchantId) w.isDefault = false;
      });
    }
    Object.assign(wallet, updates);
    return wallet;
  }

  // --- Devices & Pairing ---
  getDevicesByMerchant(merchantId: string): DeviceRecord[] {
    return this.devices.filter((d) => d.merchantId === merchantId && d.status === 'active');
  }

  getDeviceById(id: string): DeviceRecord | undefined {
    return this.devices.find((d) => d.id === id && d.status === 'active');
  }

  getDeviceByPairingCode(code: string): DeviceRecord | undefined {
    const now = new Date();
    return this.devices.find(
      (d) =>
        d.pairingCode === code &&
        d.pairingCodeExpiresAt &&
        new Date(d.pairingCodeExpiresAt) > now &&
        !d.isPaired,
    );
  }

  createDevicePairingCode(merchantId: string, deviceName: string): DeviceRecord {
    // Pairing code e.g. ABCD-1234
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let part1 = '';
    let part2 = '';
    for (let i = 0; i < 4; i++) part1 += chars[Math.floor(Math.random() * chars.length)];
    for (let i = 0; i < 4; i++) part2 += chars[Math.floor(Math.random() * chars.length)];
    const pairingCode = `${part1}-${part2}`;

    const pairingCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min
    const deviceSecret = 'sec_dev_' + crypto.randomBytes(20).toString('hex');

    const device: DeviceRecord = {
      id: 'dev-' + crypto.randomUUID(),
      merchantId,
      deviceName,
      deviceSecret,
      pairingCode,
      pairingCodeExpiresAt,
      isPaired: false,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    this.devices.push(device);
    return device;
  }

  pairDevice(pairingCode: string, deviceName?: string): { deviceId: string; deviceSecret: string; merchantId: string } | null {
    const device = this.getDeviceByPairingCode(pairingCode);
    if (!device) return null;

    device.isPaired = true;
    device.pairedAt = new Date().toISOString();
    device.lastSeenAt = new Date().toISOString();
    device.pairingCode = null;
    device.pairingCodeExpiresAt = null;
    if (deviceName) device.deviceName = deviceName;

    return {
      deviceId: device.id,
      deviceSecret: device.deviceSecret,
      merchantId: device.merchantId,
    };
  }

  updateDeviceLastSeen(deviceId: string) {
    const device = this.getDeviceById(deviceId);
    if (device) {
      device.lastSeenAt = new Date().toISOString();
    }
  }

  updateDeviceHeartbeat(deviceId: string, info: { batteryLevel?: number; isCharging?: boolean; networkType?: string; appVersion?: string }) {
    const device = this.getDeviceById(deviceId);
    if (device) {
      device.lastSeenAt = new Date().toISOString();
      if (typeof info.batteryLevel === 'number') device.batteryLevel = info.batteryLevel;
      if (typeof info.isCharging === 'boolean') device.isCharging = info.isCharging;
      if (info.networkType) device.networkType = info.networkType;
    }
    return device;
  }

  bindWalletsToDevice(deviceId: string, walletIds: string[]): DeviceRecord | undefined {
    const device = this.getDeviceById(deviceId);
    if (!device) return undefined;
    // Strict rule: maximum 2 wallets per device (e.g. SIM 1 + SIM 2)
    device.boundWalletIds = walletIds.slice(0, 2);
    return device;
  }

  // --- Payments & Piaster Generator ---
  getUsedPiastersForMerchant(merchantId: string): Set<number> {
    const now = new Date();
    const active = this.payments.filter(
      (p) =>
        p.merchantId === merchantId &&
        p.status === 'pending' &&
        new Date(p.expiresAt) > now,
    );
    return new Set(active.map((p) => p.piasters));
  }

  generateUniquePiasters(merchantId: string): number {
    const used = this.getUsedPiastersForMerchant(merchantId);
    // Find available piasters between 1 and 99
    const available: number[] = [];
    for (let i = 1; i <= 99; i++) {
      if (!used.has(i)) {
        available.push(i);
      }
    }
    if (available.length === 0) {
      // Fallback: pick any random piaster
      return Math.floor(Math.random() * 99) + 1;
    }
    // Random selection from unused piasters
    const index = Math.floor(Math.random() * available.length);
    return available[index];
  }

  processedTransactions: Set<string> = new Set();

  createPayment(data: {
    merchantId: string;
    walletId?: string | null;
    orderRef: string;
    amount?: number;
    baseAmount?: number;
    customerPhone?: string | null;
    webhookUrl?: string | null;
    notes?: string | null;
    metadata?: Record<string, unknown> | null;
    baseUrl?: string;
  }): { payment: PaymentRecord; checkoutUrl: string } {
    const rawAmount = data.baseAmount ?? data.amount ?? 100;
    const piasters = this.generateUniquePiasters(data.merchantId);
    const baseAmount = Math.floor(rawAmount);
    const payableAmount = Number((baseAmount + piasters / 100).toFixed(2));
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000).toISOString(); // 30 minutes
    const paymentId = 'pay-' + crypto.randomUUID().slice(0, 12);
    const statusToken = crypto.randomBytes(32).toString('hex');
    const baseUrl = data.baseUrl || 'https://pay.ehabgm.sbs';

    const payment: PaymentRecord = {
      id: paymentId,
      merchantId: data.merchantId,
      walletId: data.walletId || null,
      orderRef: data.orderRef,
      baseAmount,
      payableAmount,
      piasters,
      currency: 'EGP',
      status: 'pending',
      statusToken,
      customerPhone: data.customerPhone || null,
      webhookUrl: data.webhookUrl || null,
      expiresAt,
      notes: data.notes || null,
      metadata: data.metadata || null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    this.payments.push(payment);
    return { payment, checkoutUrl: `${baseUrl}/c/${paymentId}` };
  }

  processSmsWithIdempotency(params: {
    deviceId: string;
    merchantId: string;
    sender: string;
    rawText: string;
    amount: number;
    counterpartyPhone?: string;
    transactionId: string;
    receivedAt: string;
  }): {
    status: 'matched' | 'duplicate' | 'unmatched';
    payment?: PaymentRecord;
    reason?: string;
    smsLogId: string;
  } {
    const idempotencyKey = `${params.merchantId}_${params.transactionId}`;
    const smsLogId = 'sms-' + crypto.randomUUID();
    const now = new Date().toISOString();

    // 1. Enforce Idempotency: Reject duplicate transactions
    if (this.processedTransactions.has(idempotencyKey)) {
      const dup = this.createSmsLog({
        deviceId: params.deviceId,
        merchantId: params.merchantId,
        sender: params.sender,
        rawText: params.rawText,
        amount: params.amount,
        counterpartyPhone: params.counterpartyPhone || null,
        transactionId: params.transactionId,
        receivedAt: params.receivedAt,
        matchStatus: 'duplicate',
        reviewReason: 'رقم العملية مسجل مسبقاً في النظام (Duplicate Idempotency Key)',
      });
      return { status: 'duplicate', smsLogId: dup.id, reason: 'duplicate_transaction' };
    }

    this.processedTransactions.add(idempotencyKey);

    // 2. Find pending payment with exact amount
    const matches = this.findPendingPaymentsByMerchantAndAmount(params.merchantId, params.amount);

    if (matches.length === 1) {
      const payment = matches[0]!;
      const matchedLog = this.createSmsLog({
        deviceId: params.deviceId,
        merchantId: params.merchantId,
        sender: params.sender,
        rawText: params.rawText,
        amount: params.amount,
        counterpartyPhone: params.counterpartyPhone || null,
        transactionId: params.transactionId,
        receivedAt: params.receivedAt,
        matchStatus: 'matched',
        matchedPaymentId: payment.id,
      });

      const updated = this.updatePayment(payment.id, {
        status: 'completed',
        confirmedAt: now,
        verifiedTransactionId: params.transactionId,
        matchedSmsId: matchedLog.id,
      });

      return { status: 'matched', payment: updated, smsLogId: matchedLog.id };
    }

    // Multiple or zero matches
    const reason =
      matches.length > 1
        ? `تطابق متعدد: يوجد ${matches.length} عمليات معلقة بنفس المبلغ تماماً`
        : 'لم يتم العثور على عملية معلقة بنفس المبلغ المخصص';

    const reviewLog = this.createSmsLog({
      deviceId: params.deviceId,
      merchantId: params.merchantId,
      sender: params.sender,
      rawText: params.rawText,
      amount: params.amount,
      counterpartyPhone: params.counterpartyPhone || null,
      transactionId: params.transactionId,
      receivedAt: params.receivedAt,
      matchStatus: 'review',
      reviewReason: reason,
    });

    return {
      status: 'unmatched',
      smsLogId: reviewLog.id,
      reason: matches.length > 1 ? 'ambiguous_multiple_matches' : 'no_matching_payment',
    };
  }

  getSmsLogById(id: string): SmsLogRecord | undefined {
    return this.smsLogs.find((s) => s.id === id);
  }

  manuallyConfirmPayment(smsLogId: string, paymentId: string, notes?: string): PaymentRecord | null {
    const sms = this.getSmsLogById(smsLogId);
    const payment = this.getPaymentById(paymentId);
    if (!sms || !payment) return null;

    const now = new Date().toISOString();
    this.updatePayment(payment.id, {
      status: 'completed',
      confirmedAt: now,
      verifiedTransactionId: sms.transactionId,
      matchedSmsId: sms.id,
    });

    this.updateSmsLog(sms.id, {
      matchStatus: 'matched',
      matchedPaymentId: payment.id,
      reviewReason: notes || 'تم التأكيد يدوياً من المشرف',
    });

    return payment;
  }

  getPaymentById(id: string): PaymentRecord | undefined {
    return this.payments.find((p) => p.id === id);
  }

  listPaymentsByMerchant(merchantId: string): PaymentRecord[] {
    return this.payments
      .filter((p) => p.merchantId === merchantId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  findPendingPaymentsByMerchantAndAmount(merchantId: string, amount: number): PaymentRecord[] {
    const now = new Date();
    return this.payments.filter(
      (p) =>
        p.merchantId === merchantId &&
        p.status === 'pending' &&
        Math.abs(p.payableAmount - amount) < 0.005 &&
        new Date(p.expiresAt) > now,
    );
  }

  updatePayment(id: string, updates: Partial<PaymentRecord>): PaymentRecord | undefined {
    const payment = this.getPaymentById(id);
    if (!payment) return undefined;
    Object.assign(payment, updates, { updatedAt: new Date().toISOString() });
    return payment;
  }

  expirePendingPayments(): number {
    const now = new Date();
    let count = 0;
    for (const p of this.payments) {
      if (p.status === 'pending' && new Date(p.expiresAt) <= now) {
        p.status = 'expired';
        p.updatedAt = now.toISOString();
        count++;
      }
    }
    return count;
  }

  // --- SMS Logs & Matching ---
  getSmsLogByTransactionId(transactionId: string): SmsLogRecord | undefined {
    return this.smsLogs.find((s) => s.transactionId.toLowerCase() === transactionId.toLowerCase());
  }

  createSmsLog(data: Omit<SmsLogRecord, 'id' | 'processedAt' | 'createdAt'>): SmsLogRecord {
    const record: SmsLogRecord = {
      ...data,
      id: 'sms-' + crypto.randomUUID(),
      processedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    this.smsLogs.push(record);
    return record;
  }

  listSmsLogsByMerchant(merchantId: string): SmsLogRecord[] {
    return this.smsLogs
      .filter((s) => s.merchantId === merchantId)
      .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
  }

  listReviewQueue(merchantId: string): SmsLogRecord[] {
    return this.smsLogs
      .filter((s) => s.merchantId === merchantId && (s.matchStatus === 'review' || s.matchStatus === 'unmatched'))
      .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
  }

  updateSmsLog(id: string, updates: Partial<SmsLogRecord>): SmsLogRecord | undefined {
    const sms = this.smsLogs.find((s) => s.id === id);
    if (!sms) return undefined;
    Object.assign(sms, updates);
    return sms;
  }

  // --- Webhooks ---
  createWebhookLog(data: Omit<WebhookLogRecord, 'id' | 'createdAt'>): WebhookLogRecord {
    const record: WebhookLogRecord = {
      ...data,
      id: 'wh-' + crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.webhookLogs.push(record);
    return record;
  }

  listWebhookLogsByMerchant(merchantId: string): WebhookLogRecord[] {
    return this.webhookLogs
      .filter((w) => w.merchantId === merchantId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // --- Audit Logs ---
  createAuditLog(data: Omit<AuditLogRecord, 'id' | 'createdAt'>): AuditLogRecord {
    const record: AuditLogRecord = {
      ...data,
      id: 'aud-' + crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.auditLogs.push(record);
    return record;
  }

  listAuditLogs(merchantId?: string): AuditLogRecord[] {
    if (merchantId) {
      return this.auditLogs
        .filter((a) => !a.merchantId || a.merchantId === merchantId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return [...this.auditLogs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }
}

// Global Singleton to maintain state across module reloads
declare global {
  var _ehabgmDbStore: DatabaseStore | undefined;
}

export const dbStore = global._ehabgmDbStore ?? (global._ehabgmDbStore = new DatabaseStore());
