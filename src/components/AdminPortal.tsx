import React, { useState } from 'react';
import { AdminNavbar } from './AdminNavbar.tsx';
import { AdminOverview } from './AdminOverview.tsx';
import { ReviewQueue } from './ReviewQueue.tsx';
import { SmsLogsTab } from './SmsLogsTab.tsx';
import { WebhookLogsTab } from './WebhookLogsTab.tsx';
import { AuditLogsTab } from './AuditLogsTab.tsx';
import { AdminMerchantsTab } from './AdminMerchantsTab.tsx';
import { AdminEnvAndroidTab } from './AdminEnvAndroidTab.tsx';
import { AdminAndroidDevCenter } from './AdminAndroidDevCenter.tsx';
import { ShieldAlert, ArrowLeft, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
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
  const { user, isAdmin, signInWithGoogle } = useAuth();

  const pendingPayments = payments.filter((p) => p.status === 'pending');

  // If user is not logged in at all
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500">
        <AdminNavbar
          currentTab={adminTab}
          onSelectTab={setAdminTab}
          reviewCount={0}
          onOpenSimulator={onOpenSimulator}
          onSwitchToMerchantPortal={onSwitchToMerchantPortal}
        />
        <main className="max-w-xl mx-auto px-4 py-20 flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6 shadow-2xl shadow-indigo-500/10">
            <ShieldAlert className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">تسجيل دخول المدير مطلوب</h2>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed max-w-md">
            لوحة الإدارة المركزية والتحكم في كود تطبيق الأندرويد محمية ومخصصة للمدير{' '}
            <span className="text-indigo-400 font-mono font-bold">ehabgm200@gmail.com</span> فقط. يرجى تسجيل الدخول بحسابك للمتابعة.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
            <button
              onClick={signInWithGoogle}
              className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm rounded-xl flex items-center justify-center gap-2.5 transition shadow-lg"
            >
              <LogIn className="w-4 h-4 text-slate-900" />
              <span>تسجيل الدخول بحساب جوجل للمدير</span>
            </button>
            <button
              onClick={onSwitchToMerchantPortal}
              className="w-full sm:w-auto px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition"
            >
              <ArrowLeft className="w-4 h-4 rotate-180" />
              <span>العودة لبوابة التاجر</span>
            </button>
          </div>
        </main>
      </div>
    );
  }

  // If a non-admin is logged in with another email
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500">
        <AdminNavbar
          currentTab={adminTab}
          onSelectTab={setAdminTab}
          reviewCount={0}
          onOpenSimulator={onOpenSimulator}
          onSwitchToMerchantPortal={onSwitchToMerchantPortal}
        />
        <main className="max-w-2xl mx-auto px-4 py-20 flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6 shadow-xl">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">لوحة الإدارة مقيدة بمدير النظام</h2>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed max-w-md">
            تم تسجيل دخولك بالبريد الإلكتروني <span className="text-white font-bold font-mono">{user.email}</span> كحساب تاجر/عميل. لوحة الإدارة المركزية مخصصة للمدير <span className="text-indigo-400 font-mono font-bold">ehabgm200@gmail.com</span> فقط.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
            <button
              onClick={signInWithGoogle}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl flex items-center gap-2 transition shadow-lg shadow-indigo-600/20"
            >
              <LogIn className="w-4 h-4" />
              <span>تبديل الحساب وتسجيل الدخول كمدير</span>
            </button>
            <button
              onClick={onSwitchToMerchantPortal}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl flex items-center gap-2 transition shadow-lg shadow-emerald-600/20"
            >
              <ArrowLeft className="w-4 h-4 rotate-180" />
              <span>العودة إلى بوابة التاجر والمدفوعات</span>
            </button>
          </div>
        </main>
      </div>
    );
  }

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

        {adminTab === 'admin-android-dev' && (
          <AdminAndroidDevCenter />
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
            <span>Admin Email: ehabgm200@gmail.com</span>
            <span>•</span>
            <span>Idempotency: Strict merchantId_txId</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
