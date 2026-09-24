import { pgTable, text, timestamp, numeric, integer, boolean, jsonb, uuid, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * Merchants Table
 */
export const merchants = pgTable('merchants', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  webhookUrl: text('webhook_url'),
  webhookSecret: text('webhook_secret'),
  status: varchar('status', { length: 50 }).default('active').notNull(), // active, suspended
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * API Keys Table - Secret is NEVER stored in plaintext, only SHA-256 hash
 */
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  merchantId: uuid('merchant_id').references(() => merchants.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 100 }).notNull(), // e.g. "Production Store", "Staging"
  publicKey: varchar('public_key', { length: 128 }).notNull().unique(), // pk_live_...
  secretHash: text('secret_hash').notNull(), // SHA-256 hash of sk_live_...
  prefix: varchar('prefix', { length: 20 }).notNull(), // sk_live_xxxx (first few chars for identification)
  lastUsedAt: timestamp('last_used_at'),
  revokedAt: timestamp('revoked_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Wallets Table (Vodafone Cash, InstaPay, Orange Cash, Etisalat Cash)
 */
export const wallets = pgTable('wallets', {
  id: uuid('id').defaultRandom().primaryKey(),
  merchantId: uuid('merchant_id').references(() => merchants.id, { onDelete: 'cascade' }).notNull(),
  provider: varchar('provider', { length: 50 }).notNull(), // vodafone_cash, instapay, orange_cash, etisalat_cash
  identifier: varchar('identifier', { length: 100 }).notNull(), // e.g. "01012345678" or "store@instapay"
  label: varchar('label', { length: 100 }).notNull(), // e.g. "محفظة المبيعات الرئيسية"
  isActive: boolean('is_active').default(true).notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Devices Table (Paired Android phones forwarding SMS)
 */
export const devices = pgTable('devices', {
  id: uuid('id').defaultRandom().primaryKey(),
  merchantId: uuid('merchant_id').references(() => merchants.id, { onDelete: 'cascade' }).notNull(),
  deviceName: varchar('device_name', { length: 150 }).notNull(),
  deviceSecret: text('device_secret').notNull(), // Secret shared with the device for HMAC-SHA256
  pairingCode: varchar('pairing_code', { length: 20 }), // e.g. "ABCD-1234"
  pairingCodeExpiresAt: timestamp('pairing_code_expires_at'),
  isPaired: boolean('is_paired').default(false).notNull(),
  pairedAt: timestamp('paired_at'),
  lastSeenAt: timestamp('last_seen_at'),
  status: varchar('status', { length: 50 }).default('active').notNull(), // active, revoked
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Payments Table
 */
export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  merchantId: uuid('merchant_id').references(() => merchants.id, { onDelete: 'cascade' }).notNull(),
  walletId: uuid('wallet_id').references(() => wallets.id),
  orderRef: varchar('order_ref', { length: 150 }).notNull(),
  baseAmount: numeric('base_amount', { precision: 12, scale: 2 }).notNull(), // e.g. 150.00
  payableAmount: numeric('payable_amount', { precision: 12, scale: 2 }).notNull(), // e.g. 150.07 with unique piasters
  piasters: integer('piasters').notNull(), // 7
  currency: varchar('currency', { length: 10 }).default('EGP').notNull(),
  status: varchar('status', { length: 50 }).default('pending').notNull(), // pending, completed, expired, cancelled, review
  customerPhone: varchar('customer_phone', { length: 50 }),
  webhookUrl: text('webhook_url'),
  expiresAt: timestamp('expires_at').notNull(), // default 30 min from creation
  confirmedAt: timestamp('confirmed_at'),
  matchedSmsId: uuid('matched_sms_id'),
  verifiedTransactionId: varchar('verified_transaction_id', { length: 150 }),
  notes: text('notes'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * SMS Logs Table (Enforces UNIQUE transaction_id)
 */
export const smsLogs = pgTable('sms_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  deviceId: uuid('device_id').references(() => devices.id, { onDelete: 'set null' }),
  merchantId: uuid('merchant_id').references(() => merchants.id, { onDelete: 'cascade' }).notNull(),
  sender: varchar('sender', { length: 100 }).notNull(), // e.g. VF-Cash
  rawText: text('raw_text').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  counterpartyPhone: varchar('counterparty_phone', { length: 50 }),
  transactionId: varchar('transaction_id', { length: 150 }).notNull().unique(), // Enforced UNIQUE
  receivedAt: timestamp('received_at').notNull(),
  matchStatus: varchar('match_status', { length: 50 }).notNull(), // matched, unmatched, duplicate, review
  matchedPaymentId: uuid('matched_payment_id').references(() => payments.id, { onDelete: 'set null' }),
  reviewReason: text('review_reason'),
  processedAt: timestamp('processed_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Webhook Logs Table
 */
export const webhookLogs = pgTable('webhook_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  merchantId: uuid('merchant_id').references(() => merchants.id, { onDelete: 'cascade' }).notNull(),
  paymentId: uuid('payment_id').references(() => payments.id, { onDelete: 'cascade' }).notNull(),
  event: varchar('event', { length: 100 }).notNull(), // payment.completed, payment.expired
  url: text('url').notNull(),
  payload: jsonb('payload').notNull(),
  signature: text('signature').notNull(),
  statusCode: integer('status_code'),
  responseBody: text('response_body'),
  attempt: integer('attempt').default(1).notNull(),
  maxAttempts: integer('max_attempts').default(5).notNull(),
  success: boolean('success').default(false).notNull(),
  error: text('error'),
  nextRetryAt: timestamp('next_retry_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Audit Logs Table
 */
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  merchantId: uuid('merchant_id'),
  actor: varchar('actor', { length: 150 }).notNull(), // merchant email, admin, device, system
  action: varchar('action', { length: 100 }).notNull(), // device.paired, payment.created, sms.matched, sms.manual_confirm
  details: jsonb('details'),
  ipAddress: varchar('ip_address', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Drizzle Relations
 */
export const merchantsRelations = relations(merchants, ({ many }) => ({
  apiKeys: many(apiKeys),
  wallets: many(wallets),
  devices: many(devices),
  payments: many(payments),
  smsLogs: many(smsLogs),
  webhookLogs: many(webhookLogs),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  merchant: one(merchants, {
    fields: [apiKeys.merchantId],
    references: [merchants.id],
  }),
}));

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  merchant: one(merchants, {
    fields: [wallets.merchantId],
    references: [merchants.id],
  }),
  payments: many(payments),
}));

export const devicesRelations = relations(devices, ({ one, many }) => ({
  merchant: one(merchants, {
    fields: [devices.merchantId],
    references: [merchants.id],
  }),
  smsLogs: many(smsLogs),
}));

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  merchant: one(merchants, {
    fields: [payments.merchantId],
    references: [merchants.id],
  }),
  wallet: one(wallets, {
    fields: [payments.walletId],
    references: [wallets.id],
  }),
  matchedSms: one(smsLogs, {
    fields: [payments.matchedSmsId],
    references: [smsLogs.id],
  }),
  webhookLogs: many(webhookLogs),
}));

export const smsLogsRelations = relations(smsLogs, ({ one }) => ({
  merchant: one(merchants, {
    fields: [smsLogs.merchantId],
    references: [merchants.id],
  }),
  device: one(devices, {
    fields: [smsLogs.deviceId],
    references: [devices.id],
  }),
  matchedPayment: one(payments, {
    fields: [smsLogs.matchedPaymentId],
    references: [payments.id],
  }),
}));
