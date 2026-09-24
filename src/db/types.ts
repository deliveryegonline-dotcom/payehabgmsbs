export interface MerchantRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  webhookUrl?: string | null;
  webhookSecret?: string | null;
  status: 'active' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface ApiKeyRecord {
  id: string;
  merchantId: string;
  name: string;
  publicKey: string; // pk_live_...
  secretHash: string; // sha256 hash of sk_live_...
  prefix: string; // sk_live_xxxx
  lastUsedAt?: string | null;
  revokedAt?: string | null;
  createdAt: string;
}

export interface SimCardRecord {
  slotIndex: number;
  carrierName: string;
  phoneNumber: string;
  provider: 'vodafone_cash' | 'instapay' | 'orange_cash' | 'etisalat_cash';
  signalStrength?: number;
  isDefault?: boolean;
}

export interface WalletRecord {
  id: string;
  merchantId: string;
  provider: 'vodafone_cash' | 'instapay' | 'orange_cash' | 'etisalat_cash';
  identifier: string;
  label: string;
  isActive: boolean;
  isDefault: boolean;
  detectedFromDevice?: boolean;
  deviceId?: string | null;
  simSlot?: number | null;
  createdAt: string;
}

export interface DeviceRecord {
  id: string;
  merchantId: string;
  deviceName: string;
  deviceSecret: string;
  pairingCode?: string | null;
  pairingCodeExpiresAt?: string | null;
  isPaired: boolean;
  pairedAt?: string | null;
  lastSeenAt?: string | null;
  status: 'active' | 'revoked';
  boundWalletIds?: string[];
  batteryLevel?: number;
  isCharging?: boolean;
  networkType?: string;
  appVersion?: string;
  ipAddress?: string;
  pingLatencyMs?: number;
  simCards?: SimCardRecord[];
  pendingOfflineSmsCount?: number;
  connectionStatus?: 'online' | 'warning' | 'offline';
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  merchantId: string;
  walletId?: string | null;
  orderRef: string;
  baseAmount: number;
  payableAmount: number;
  piasters: number;
  currency: string;
  status: 'pending' | 'completed' | 'expired' | 'cancelled' | 'review';
  statusToken: string;
  customerPhone?: string | null;
  webhookUrl?: string | null;
  expiresAt: string;
  confirmedAt?: string | null;
  matchedSmsId?: string | null;
  verifiedTransactionId?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface SmsLogRecord {
  id: string;
  deviceId?: string | null;
  merchantId: string;
  sender: string;
  rawText: string;
  amount: number;
  counterpartyPhone?: string | null;
  transactionId: string;
  receivedAt: string;
  matchStatus: 'matched' | 'unmatched' | 'duplicate' | 'review';
  matchedPaymentId?: string | null;
  reviewReason?: string | null;
  processedAt: string;
  createdAt: string;
}

export interface WebhookLogRecord {
  id: string;
  merchantId: string;
  paymentId: string;
  event: string;
  url: string;
  payload: Record<string, unknown>;
  signature: string;
  statusCode?: number | null;
  responseBody?: string | null;
  attempt: number;
  maxAttempts: number;
  success: boolean;
  error?: string | null;
  nextRetryAt?: string | null;
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  merchantId?: string | null;
  actor: string;
  action: string;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  createdAt: string;
}
