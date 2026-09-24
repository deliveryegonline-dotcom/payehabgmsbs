export interface Payment {
  id: string;
  merchantId: string;
  walletId?: string | null;
  orderRef: string;
  baseAmount: number;
  payableAmount: number;
  piasters: number;
  currency: string;
  status: 'pending' | 'completed' | 'expired' | 'cancelled' | 'review';
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

export interface SimCardInfo {
  slotIndex: number; // 0 for SIM 1, 1 for SIM 2
  carrierName: string; // e.g. "Vodafone Egypt", "Orange EG", "e& Egypt", "WE Egypt"
  phoneNumber: string; // e.g. "01098765432"
  provider: 'vodafone_cash' | 'instapay' | 'orange_cash' | 'etisalat_cash';
  signalStrength?: number; // 0 - 100% or dBm
  isDefault?: boolean;
}

export interface Device {
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
  networkType?: string; // '4G_LTE' | '5G' | 'WIFI' | 'OFFLINE'
  appVersion?: string;
  ipAddress?: string;
  pingLatencyMs?: number;
  simCards?: SimCardInfo[];
  pendingOfflineSmsCount?: number;
  connectionStatus?: 'online' | 'warning' | 'offline';
  createdAt: string;
}

export interface Wallet {
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

export interface ApiKey {
  id: string;
  merchantId: string;
  name: string;
  publicKey: string;
  prefix: string;
  lastUsedAt?: string | null;
  revokedAt?: string | null;
  createdAt: string;
}

export interface SmsLog {
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

export interface WebhookLog {
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

export interface AuditLog {
  id: string;
  merchantId?: string | null;
  actor: string;
  action: string;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  createdAt: string;
}

export interface DashboardStats {
  totalPayments: number;
  completedPayments: number;
  pendingPayments: number;
  totalVolume: number;
  confirmationRate: string;
  activeDevices: number;
  reviewQueueCount: number;
  totalSmsReceived: number;
}

export interface SystemHealthData {
  service: string;
  environment: string;
  uptimeSeconds: number;
  timestamp: string;
  database: {
    engine: string;
    databaseId: string;
    projectId: string;
    isLiveConnected: boolean;
    securityRules: string;
    idempotencyStrategy: string;
  };
  metrics: {
    totalMerchants: number;
    totalPayments: number;
    completedPayments: number;
    pendingPayments: number;
    reviewQueueCount: number;
    activeDevices: number;
    totalSmsProcessed: number;
    totalWebhooksDispatched: number;
  };
}

export interface MerchantSummary {
  id: string;
  name: string;
  email: string;
  webhookUrl?: string | null;
  webhookSecret?: string | null;
  totalPayments: number;
  completedPayments: number;
  totalVolume: number;
  activeDevicesCount: number;
  walletsCount: number;
  createdAt: string;
}

