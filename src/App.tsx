import React, { useState, useEffect } from 'react';
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
import { SmsSimulatorModal } from './components/SmsSimulatorModal.tsx';
import { AdminPortal } from './components/AdminPortal.tsx';
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

export default function App() {
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
  const [systemHealth, setSystemHealth] = useState<SystemHealthData | null>(null);
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

  // Fetch all dashboard and system data
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
        healthRes,
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
        fetch('/api/admin/system-health').then((r) => r.json()).catch(() => null),
      ]);

      if (overviewRes?.success) {
        setStats(overviewRes.stats);
        setMerchant(overviewRes.merchant);
      }
      if (paymentsRes?.success) setPayments(paymentsRes.data);
      if (devicesRes?.success) setDevices(devicesRes.data);
      if (walletsRes?.success) setWallets(walletsRes.data);
      if (keysRes?.success) setApiKeys(keysRes.data);
      if (smsRes?.success) setSmsLogs(smsRes.data);
      if (reviewRes?.success) setReviewQueue(reviewRes.data);
      if (webhooksRes?.success) setWebhookLogs(webhooksRes.data);
      if (auditRes?.success) setAuditLogs(auditRes.data);
      if (healthRes?.success) setSystemHealth(healthRes.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHealthOnly = async () => {
    try {
      const res = await fetch('/api/admin/system-health');
      const json = await res.json();
      if (json.success) setSystemHealth(json.data);
    } catch (err) {
      console.error('Error refreshing system health:', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Background polling every 10 seconds to keep live data fresh
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

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
      <>
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
          onOpenSimulator={() => setSimulatorOpen(true)}
        />

        {/* Global Simulator Modal also usable from admin */}
        <SmsSimulatorModal
          isOpen={simulatorOpen}
          onClose={() => setSimulatorOpen(false)}
          devices={devices}
          pendingPayments={payments.filter((p) => p.status === 'pending')}
          onSmsProcessed={fetchDashboardData}
        />
      </>
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
        onOpenSimulator={() => setSimulatorOpen(true)}
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
            onOpenSimulator={() => setSimulatorOpen(true)}
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
            onOpenSimulator={() => setSimulatorOpen(true)}
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

        {currentMerchantTab === 'docs' && <ApiDocsTab />}
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

      <SmsSimulatorModal
        isOpen={simulatorOpen}
        onClose={() => setSimulatorOpen(false)}
        devices={devices}
        pendingPayments={payments.filter((p) => p.status === 'pending')}
        onSmsProcessed={fetchDashboardData}
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
