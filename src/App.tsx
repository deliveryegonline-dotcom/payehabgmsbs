import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { DashboardOverview } from './components/DashboardOverview.tsx';
import { PaymentsList } from './components/PaymentsList.tsx';
import { DevicesTab } from './components/DevicesTab.tsx';
import { WalletsTab } from './components/WalletsTab.tsx';
import { ApiKeysTab } from './components/ApiKeysTab.tsx';
import { ApiDocsTab } from './components/ApiDocsTab.tsx';
import { CheckoutPage } from './components/CheckoutPage.tsx';
import { CreatePaymentModal } from './components/CreatePaymentModal.tsx';
import { DevicePairingModal } from './components/DevicePairingModal.tsx';
import { AdminPortal } from './components/AdminPortal.tsx';
import { LoginPage } from './components/LoginPage.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import type {
  Payment,
  Device,
  Wallet,
  ApiKey,
  SmsLog,
  WebhookLog,
  AuditLog,
  DashboardStats,
  SystemHealthData,
} from './types/index.ts';

function AppContent() {
  const { user, merchantId: currentMerchantId } = useAuth();

  // Check if current route is /admin or /c/:id or /
  const [isAdminView, setIsAdminView] = useState<boolean>(() => {
    return window.location.pathname.startsWith('/admin');
  });

  const [checkoutPaymentId, setCheckoutPaymentId] = useState<string | null>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/c/')) {
      return path.replace('/c/', '').trim();
    }
    return null;
  });

  const [currentMerchantTab, setCurrentMerchantTab] = useState<string>('overview');
  const [loading, setLoading] = useState(true);

  // Initial Fallback Data
  const [stats, setStats] = useState<DashboardStats>({
    totalPayments: 4,
    completedPayments: 3,
    pendingPayments: 1,
    totalVolume: 1850,
    confirmationRate: '100%',
    activeDevices: 1,
    reviewQueueCount: 0,
    totalSmsReceived: 6,
  });
  const [systemHealth, setSystemHealth] = useState<SystemHealthData | null>({
    service: 'EHABGM Pay Gateway Engine',
    environment: 'production',
    uptimeSeconds: 12400,
    timestamp: new Date().toISOString(),
    database: {
      engine: 'In-Memory Store & Firestore Ready',
      databaseId: 'ai-studio-ehabgmpay',
      projectId: 'ehabgm-pay-prod',
      isLiveConnected: true,
      securityRules: 'active',
      idempotencyStrategy: 'piaster_uniqueness_hmac',
    },
    metrics: {
      totalMerchants: 1,
      totalPayments: 4,
      completedPayments: 3,
      pendingPayments: 1,
      reviewQueueCount: 0,
      activeDevices: 1,
      totalSmsProcessed: 6,
      totalWebhooksDispatched: 3,
    },
  });
  const [merchant, setMerchant] = useState<any>({
    id: 'm-demo-1001',
    name: 'متجر الفرسان للإلكترونيات',
    email: 'merchant@ehabgm.eg',
    status: 'active',
    webhookUrl: 'https://webhook.site/demo-merchant-endpoint',
  });
  const [payments, setPayments] = useState<Payment[]>([
    {
      id: 'pay-demo-001',
      merchantId: 'm-demo-1001',
      orderRef: 'ORD-98210',
      baseAmount: 500,
      payableAmount: 500.23,
      piasters: 23,
      currency: 'EGP',
      status: 'completed',
      customerPhone: '01012345678',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      confirmedAt: new Date(Date.now() - 1200000).toISOString(),
      verifiedTransactionId: 'TRX-9831102',
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      updatedAt: new Date(Date.now() - 1200000).toISOString(),
    },
    {
      id: 'pay-demo-002',
      merchantId: 'm-demo-1001',
      orderRef: 'ORD-98211',
      baseAmount: 1350,
      payableAmount: 1350.47,
      piasters: 47,
      currency: 'EGP',
      status: 'pending',
      customerPhone: '01123456789',
      expiresAt: new Date(Date.now() + 600000).toISOString(),
      createdAt: new Date(Date.now() - 300000).toISOString(),
      updatedAt: new Date(Date.now() - 300000).toISOString(),
    },
  ]);
  const [devices, setDevices] = useState<Device[]>([
    {
      id: 'd-demo-3001',
      merchantId: 'm-demo-1001',
      deviceName: 'Samsung Galaxy A54 (Gateway Phone)',
      deviceSecret: 'sec_dev_3f8b9a12c4d5e6f7a8b9c0d1e2f3a4b5',
      isPaired: true,
      pairedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      status: 'active',
      batteryLevel: 94,
      isCharging: true,
      networkType: 'WiFi (5GHz)',
      createdAt: new Date().toISOString(),
    },
  ]);
  const [wallets, setWallets] = useState<Wallet[]>([
    {
      id: 'w-demo-2001',
      merchantId: 'm-demo-1001',
      provider: 'vodafone_cash',
      identifier: '01012345678',
      label: 'محفظة فودافون كاش الرئيسية',
      isActive: true,
      isDefault: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'w-demo-2002',
      merchantId: 'm-demo-1001',
      provider: 'instapay',
      identifier: 'ehabgm@instapay',
      label: 'حساب إنستاباي التجاري',
      isActive: true,
      isDefault: false,
      createdAt: new Date().toISOString(),
    },
  ]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    {
      id: 'k-demo-001',
      merchantId: 'm-demo-1001',
      name: 'مفتاح المتجر الرئيسي (Production)',
      publicKey: 'pk_live_ehabgm_demo_7721',
      prefix: 'pk_live',
      lastUsedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
  ]);
  const [smsLogs, setSmsLogs] = useState<SmsLog[]>([
    {
      id: 'sms-demo-1',
      merchantId: 'm-demo-1001',
      sender: 'VF-Cash',
      rawText: 'تم تحويل 500.23 جنيه من 01012345678 إلى محفظتك بنجاح. رقم العملية 9831102',
      amount: 500.23,
      transactionId: '9831102',
      receivedAt: new Date(Date.now() - 1200000).toISOString(),
      matchStatus: 'matched',
      matchedPaymentId: 'pay-demo-001',
      processedAt: new Date(Date.now() - 1200000).toISOString(),
      createdAt: new Date(Date.now() - 1200000).toISOString(),
    },
  ]);
  const [reviewQueue, setReviewQueue] = useState<SmsLog[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([
    {
      id: 'wh-demo-1',
      merchantId: 'm-demo-1001',
      paymentId: 'pay-demo-001',
      event: 'payment.completed',
      url: 'https://webhook.site/demo-merchant-endpoint',
      payload: { paymentId: 'pay-demo-001', orderRef: 'ORD-98210', amount: 500.23, status: 'completed' },
      signature: 'sha256=abcdef1234567890',
      statusCode: 200,
      attempt: 1,
      maxAttempts: 5,
      success: true,
      createdAt: new Date(Date.now() - 1200000).toISOString(),
    },
  ]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    {
      id: 'aud-demo-1',
      merchantId: 'm-demo-1001',
      actor: 'system',
      action: 'payment.matched',
      details: { paymentId: 'pay-demo-001', amount: 500.23 },
      createdAt: new Date(Date.now() - 1200000).toISOString(),
    },
  ]);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [pairModalOpen, setPairModalOpen] = useState(false);

  // Helper for resilient API calls with authenticated Merchant ID
  const safeFetch = useCallback(async <T,>(url: string, fallback: T): Promise<T> => {
    try {
      const headers: Record<string, string> = {
        'x-merchant-id': currentMerchantId,
      };
      if (user?.email) {
        headers['x-user-email'] = user.email;
      }
      const res = await fetch(url, { headers });
      if (!res.ok) return fallback;
      const data = await res.json();
      return data;
    } catch {
      return fallback;
    }
  }, [currentMerchantId, user?.email]);

  // Fetch all dashboard and system data with smart caching
  const fetchDashboardData = useCallback(async () => {
    try {
      const [
        overviewRes,
        paymentsRes,
        devicesRes,
        walletsRes,
        keysRes,
        smsRes,
        reviewRes,
        webhooksRes,
        auditRes,
        healthRes,
      ] = await Promise.all([
        safeFetch<any>('/api/merchant/overview', null),
        safeFetch<any>('/api/merchant/payments', null),
        safeFetch<any>('/api/merchant/devices', null),
        safeFetch<any>('/api/merchant/wallets', null),
        safeFetch<any>('/api/merchant/api-keys', null),
        safeFetch<any>('/api/merchant/sms-logs', null),
        safeFetch<any>('/api/merchant/review-queue', null),
        safeFetch<any>('/api/merchant/webhook-logs', null),
        safeFetch<any>('/api/admin/audit-logs', null),
        safeFetch<any>('/api/admin/system-health', null),
      ]);

      if (overviewRes?.success) {
        if (overviewRes.stats) setStats(overviewRes.stats);
        if (overviewRes.merchant) setMerchant(overviewRes.merchant);
      }
      if (paymentsRes?.success && Array.isArray(paymentsRes.data)) setPayments(paymentsRes.data);
      if (devicesRes?.success && Array.isArray(devicesRes.data)) setDevices(devicesRes.data);
      if (walletsRes?.success && Array.isArray(walletsRes.data)) setWallets(walletsRes.data);
      if (keysRes?.success && Array.isArray(keysRes.data)) setApiKeys(keysRes.data);
      if (smsRes?.success && Array.isArray(smsRes.data)) setSmsLogs(smsRes.data);
      if (reviewRes?.success && Array.isArray(reviewRes.data)) setReviewQueue(reviewRes.data);
      if (webhooksRes?.success && Array.isArray(webhooksRes.data)) setWebhookLogs(webhooksRes.data);
      if (auditRes?.success && Array.isArray(auditRes.data)) setAuditLogs(auditRes.data);
      if (healthRes?.success && healthRes.data) setSystemHealth(healthRes.data);
    } catch {
      // Retains existing state quietly on transient network failure
    } finally {
      setLoading(false);
    }
  }, [safeFetch]);

  const fetchHealthOnly = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/system-health');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) setSystemHealth(json.data);
      }
    } catch {
      // Quietly ignore transient health check error
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();

    // Free-tier optimization: smart polling only when the tab is actively visible
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchDashboardData();
      }
    }, 12000);

    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // Handle URL change or history popstate
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.startsWith('/c/')) {
        setCheckoutPaymentId(path.replace('/c/', '').trim());
        setIsAdminView(false);
      } else if (path.startsWith('/admin')) {
        setIsAdminView(true);
        setCheckoutPaymentId(null);
      } else {
        setIsAdminView(false);
        setCheckoutPaymentId(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const switchToAdmin = () => {
    setIsAdminView(true);
    setCheckoutPaymentId(null);
    window.history.pushState({}, '', '/admin');
  };

  const switchToMerchant = () => {
    setIsAdminView(false);
    setCheckoutPaymentId(null);
    window.history.pushState({}, '', '/');
  };

  const openCheckout = (paymentId: string) => {
    setCheckoutPaymentId(paymentId);
    window.history.pushState({}, '', `/c/${paymentId}`);
  };

  const closeCheckout = () => {
    setCheckoutPaymentId(null);
    window.history.pushState({}, '', '/');
    fetchDashboardData();
  };

  // 1. If viewing a hosted checkout page (/c/:id)
  if (checkoutPaymentId) {
    return <CheckoutPage paymentId={checkoutPaymentId} onBackToDashboard={closeCheckout} />;
  }

  // 2. If viewing the Admin Supervision & Operations Center (/admin)
  if (isAdminView) {
    return (
      <AdminPortal
        stats={stats}
        systemHealth={systemHealth}
        payments={payments}
        devices={devices}
        wallets={wallets}
        smsLogs={smsLogs}
        reviewQueue={reviewQueue}
        webhookLogs={webhookLogs}
        auditLogs={auditLogs}
        onRefreshAll={fetchDashboardData}
        onRefreshHealth={fetchHealthOnly}
        onSwitchToMerchantPortal={switchToMerchant}
      />
    );
  }

  // 3. Otherwise: Merchant & Customer Portal (/)
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500">
      {/* Merchant Navbar */}
      <Navbar
        currentTab={currentMerchantTab}
        onSelectTab={setCurrentMerchantTab}
        onOpenCreateModal={() => setCreateModalOpen(true)}
        onRefreshData={fetchDashboardData}
        onSwitchToAdmin={switchToAdmin}
      />

      {/* Main Merchant Portal Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full animate-fadeIn">
        {currentMerchantTab === 'overview' && (
          <DashboardOverview
            stats={stats}
            recentPayments={payments}
            devices={devices}
            onOpenCreateModal={() => setCreateModalOpen(true)}
            onOpenPairModal={() => setPairModalOpen(true)}
            onOpenCheckout={openCheckout}
            onSelectTab={setCurrentMerchantTab}
          />
        )}

        {currentMerchantTab === 'wallets' && (
          <WalletsTab wallets={wallets} onRefresh={fetchDashboardData} />
        )}

        {currentMerchantTab === 'devices' && (
          <DevicesTab
            devices={devices}
            wallets={wallets}
            onOpenPairModal={() => setPairModalOpen(true)}
            onRefresh={fetchDashboardData}
          />
        )}

        {currentMerchantTab === 'payments' && (
          <PaymentsList
            payments={payments}
            onOpenCreateModal={() => setCreateModalOpen(true)}
            onOpenCheckout={openCheckout}
          />
        )}

        {currentMerchantTab === 'api-keys' && (
          <ApiKeysTab apiKeys={apiKeys} merchant={merchant} onRefresh={fetchDashboardData} />
        )}

        {currentMerchantTab === 'docs' && (
          <ApiDocsTab apiKeys={apiKeys} merchant={merchant} wallets={wallets} />
        )}

        {currentMerchantTab === 'login' && (
          <LoginPage
            onNavigateToMerchant={() => setCurrentMerchantTab('overview')}
            onNavigateToAdmin={switchToAdmin}
          />
        )}
      </main>

      {/* Merchant Modals */}
      <CreatePaymentModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        wallets={wallets}
        onPaymentCreated={() => {
          fetchDashboardData();
        }}
        onOpenCheckout={openCheckout}
      />

      <DevicePairingModal
        isOpen={pairModalOpen}
        onClose={() => setPairModalOpen(false)}
        onDevicePaired={fetchDashboardData}
      />

      {/* Merchant Global Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>EHABGM Pay &copy; 2026 - بوابة تأكيد مدفوعات المحافظ الإلكترونية</span>
          <div className="flex items-center gap-4 text-slate-400">
            <span>فودافون كاش</span>
            <span>•</span>
            <span>إنستاباي IPN</span>
            <span>•</span>
            <span>أورنچ كاش</span>
            <span>•</span>
            <span>إي آند كاش</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
