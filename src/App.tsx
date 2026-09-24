import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { DashboardOverview } from './components/DashboardOverview.tsx';
import { PaymentsList } from './components/PaymentsList.tsx';
import { ReviewQueue } from './components/ReviewQueue.tsx';
import { DevicesTab } from './components/DevicesTab.tsx';
import { WalletsTab } from './components/WalletsTab.tsx';
import { ApiKeysTab } from './components/ApiKeysTab.tsx';
import { SmsLogsTab } from './components/SmsLogsTab.tsx';
import { WebhookLogsTab } from './components/WebhookLogsTab.tsx';
import { AuditLogsTab } from './components/AuditLogsTab.tsx';
import { ApiDocsTab } from './components/ApiDocsTab.tsx';
import { CheckoutPage } from './components/CheckoutPage.tsx';
import { CreatePaymentModal } from './components/CreatePaymentModal.tsx';
import { DevicePairingModal } from './components/DevicePairingModal.tsx';
import { SmsSimulatorModal } from './components/SmsSimulatorModal.tsx';
import type {
  Payment,
  Device,
  Wallet,
  ApiKey,
  SmsLog,
  WebhookLog,
  AuditLog,
  DashboardStats,
} from './types/index.ts';

export default function App() {
  // Check if current route is a hosted checkout URL (/c/:id)
  const [checkoutPaymentId, setCheckoutPaymentId] = useState<string | null>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/c/')) {
      return path.replace('/c/', '').trim();
    }
    return null;
  });

  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [loading, setLoading] = useState(true);

  // Data states
  const [stats, setStats] = useState<DashboardStats>({
    totalPayments: 0,
    completedPayments: 0,
    pendingPayments: 0,
    totalVolume: 0,
    confirmationRate: '100%',
    activeDevices: 0,
    reviewQueueCount: 0,
    totalSmsReceived: 0,
  });
  const [merchant, setMerchant] = useState<any>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [smsLogs, setSmsLogs] = useState<SmsLog[]>([]);
  const [reviewQueue, setReviewQueue] = useState<SmsLog[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [pairModalOpen, setPairModalOpen] = useState(false);
  const [simulatorOpen, setSimulatorOpen] = useState(false);

  // Fetch all dashboard data
  const fetchDashboardData = async () => {
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
      ] = await Promise.all([
        fetch('/api/merchant/overview').then((r) => r.json()),
        fetch('/api/merchant/payments').then((r) => r.json()),
        fetch('/api/merchant/devices').then((r) => r.json()),
        fetch('/api/merchant/wallets').then((r) => r.json()),
        fetch('/api/merchant/api-keys').then((r) => r.json()),
        fetch('/api/merchant/sms-logs').then((r) => r.json()),
        fetch('/api/merchant/review-queue').then((r) => r.json()),
        fetch('/api/merchant/webhook-logs').then((r) => r.json()),
        fetch('/api/admin/audit-logs').then((r) => r.json()),
      ]);

      if (overviewRes.success) {
        setStats(overviewRes.stats);
        setMerchant(overviewRes.merchant);
      }
      if (paymentsRes.success) setPayments(paymentsRes.data);
      if (devicesRes.success) setDevices(devicesRes.data);
      if (walletsRes.success) setWallets(walletsRes.data);
      if (keysRes.success) setApiKeys(keysRes.data);
      if (smsRes.success) setSmsLogs(smsRes.data);
      if (reviewRes.success) setReviewQueue(reviewRes.data);
      if (webhooksRes.success) setWebhookLogs(webhooksRes.data);
      if (auditRes.success) setAuditLogs(auditRes.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Background polling every 10 seconds to keep dashboard fresh
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Handle URL change or history popstate
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.startsWith('/c/')) {
        setCheckoutPaymentId(path.replace('/c/', '').trim());
      } else {
        setCheckoutPaymentId(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openCheckout = (paymentId: string) => {
    setCheckoutPaymentId(paymentId);
    window.history.pushState({}, '', `/c/${paymentId}`);
  };

  const closeCheckout = () => {
    setCheckoutPaymentId(null);
    window.history.pushState({}, '', '/');
    fetchDashboardData();
  };

  // If viewing a hosted checkout page
  if (checkoutPaymentId) {
    return <CheckoutPage paymentId={checkoutPaymentId} onBackToDashboard={closeCheckout} />;
  }

  const pendingPayments = payments.filter((p) => p.status === 'pending');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500">
      {/* Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        reviewCount={reviewQueue.length}
        onOpenCreateModal={() => setCreateModalOpen(true)}
        onOpenSimulator={() => setSimulatorOpen(true)}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {currentTab === 'overview' && (
          <DashboardOverview
            stats={stats}
            recentPayments={payments}
            devices={devices}
            onOpenCreateModal={() => setCreateModalOpen(true)}
            onOpenPairModal={() => setPairModalOpen(true)}
            onOpenSimulator={() => setSimulatorOpen(true)}
            onOpenCheckout={openCheckout}
            onSelectTab={setCurrentTab}
          />
        )}

        {currentTab === 'payments' && (
          <PaymentsList
            payments={payments}
            onOpenCreateModal={() => setCreateModalOpen(true)}
            onOpenCheckout={openCheckout}
          />
        )}

        {currentTab === 'review' && (
          <ReviewQueue
            queue={reviewQueue}
            pendingPayments={pendingPayments}
            onRefresh={fetchDashboardData}
          />
        )}

        {currentTab === 'devices' && (
          <DevicesTab
            devices={devices}
            onOpenPairModal={() => setPairModalOpen(true)}
            onOpenSimulator={() => setSimulatorOpen(true)}
          />
        )}

        {currentTab === 'wallets' && (
          <WalletsTab wallets={wallets} onRefresh={fetchDashboardData} />
        )}

        {currentTab === 'api-keys' && (
          <ApiKeysTab apiKeys={apiKeys} merchant={merchant} onRefresh={fetchDashboardData} />
        )}

        {currentTab === 'sms-logs' && (
          <SmsLogsTab logs={smsLogs} onRefresh={fetchDashboardData} />
        )}

        {currentTab === 'webhooks' && (
          <WebhookLogsTab logs={webhookLogs} onRefresh={fetchDashboardData} />
        )}

        {currentTab === 'audit' && <AuditLogsTab logs={auditLogs} />}

        {currentTab === 'docs' && <ApiDocsTab />}
      </main>

      {/* Modals */}
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

      <SmsSimulatorModal
        isOpen={simulatorOpen}
        onClose={() => setSimulatorOpen(false)}
        devices={devices}
        pendingPayments={pendingPayments}
        onSmsProcessed={fetchDashboardData}
      />

      {/* Global Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>EHABGM Pay &copy; 2026 - بوابة تأكيد مدفوعات المحافظ الإلكترونية المصرية</span>
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
