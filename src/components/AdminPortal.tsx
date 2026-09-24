import React, { useState } from 'react';
import { AdminNavbar } from './AdminNavbar.tsx';
import { AdminOverview } from './AdminOverview.tsx';
import { ReviewQueue } from './ReviewQueue.tsx';
import { SmsLogsTab } from './SmsLogsTab.tsx';
import { WebhookLogsTab } from './WebhookLogsTab.tsx';
import { AuditLogsTab } from './AuditLogsTab.tsx';
import { AdminMerchantsTab } from './AdminMerchantsTab.tsx';
import { AdminEnvAndroidTab } from './AdminEnvAndroidTab.tsx';
import type {
  Payment,
  Device,
  Wallet,
  SmsLog,
  WebhookLog,
  AuditLog,
  DashboardStats,
  SystemHealthData,
} from '../types/index.ts';

interface AdminPortalProps {
  stats: DashboardStats;
  systemHealth: SystemHealthData | null;
  payments: Payment[];
  devices: Device[];
  wallets: Wallet[];
  smsLogs: SmsLog[];
  reviewQueue: SmsLog[];
  webhookLogs: WebhookLog[];
  auditLogs: AuditLog[];
  onRefreshAll: () => void;
  onRefreshHealth: () => void;
  onSwitchToMerchantPortal: () => void;
  onOpenSimulator: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  stats,
  systemHealth,
  payments,
  devices,
  wallets,
  smsLogs,
  reviewQueue,
  webhookLogs,
  auditLogs,
  onRefreshAll,
  onRefreshHealth,
  onSwitchToMerchantPortal,
  onOpenSimulator,
}) => {
  const [adminTab, setAdminTab] = useState<string>('admin-overview');

  const pendingPayments = payments.filter((p) => p.status === 'pending');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500">
      {/* Admin Navbar */}
      <AdminNavbar
        currentTab={adminTab}
        onSelectTab={setAdminTab}
        reviewCount={reviewQueue.length}
        onOpenSimulator={onOpenSimulator}
        onSwitchToMerchantPortal={onSwitchToMerchantPortal}
      />

      {/* Main Admin Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full animate-fadeIn">
        {adminTab === 'admin-overview' && (
          <AdminOverview
            stats={stats}
            systemHealth={systemHealth}
            recentPayments={payments}
            devices={devices}
            reviewQueue={reviewQueue}
            onRefreshHealth={onRefreshHealth}
            onSelectAdminTab={setAdminTab}
            onOpenSimulator={onOpenSimulator}
          />
        )}

        {adminTab === 'admin-review' && (
          <ReviewQueue
            queue={reviewQueue}
            pendingPayments={pendingPayments}
            onRefresh={onRefreshAll}
          />
        )}

        {adminTab === 'admin-sms' && (
          <SmsLogsTab logs={smsLogs} onRefresh={onRefreshAll} />
        )}

        {adminTab === 'admin-webhooks' && (
          <WebhookLogsTab logs={webhookLogs} onRefresh={onRefreshAll} />
        )}

        {adminTab === 'admin-audit' && (
          <AuditLogsTab logs={auditLogs} />
        )}

        {adminTab === 'admin-merchants' && (
          <AdminMerchantsTab />
        )}

        {adminTab === 'admin-env-android' && (
          <AdminEnvAndroidTab
            devices={devices}
            wallets={wallets}
            onRefreshAll={onRefreshAll}
          />
        )}
      </main>

      {/* Admin Global Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-slate-400 font-bold">
              EHABGM Pay Admin Control Center (/admin)
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
            <span>Database: Firebase Firestore</span>
            <span>•</span>
            <span>Protection: HMAC-SHA256</span>
            <span>•</span>
            <span>Idempotency: Strict merchantId_txId</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
