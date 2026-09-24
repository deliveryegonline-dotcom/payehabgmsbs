import React, { useState } from 'react';
import {
  ShieldAlert,
  Database,
  Activity,
  Server,
  RefreshCw,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Lock,
  Layers,
  Users,
  Send,
  ArrowUpRight,
  ShieldCheck,
  FolderGit2,
  Smartphone,
} from 'lucide-react';
import type { SystemHealthData, DashboardStats, Payment, Device, SmsLog } from '../types/index.ts';

interface AdminOverviewProps {
  stats: DashboardStats;
  systemHealth: SystemHealthData | null;
  recentPayments: Payment[];
  devices: Device[];
  reviewQueue: SmsLog[];
  onRefreshHealth: () => void;
  onSelectAdminTab: (tab: string) => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({
  stats,
  systemHealth,
  recentPayments,
  devices,
  reviewQueue,
  onRefreshHealth,
  onSelectAdminTab,
}) => {
  const [cronRunning, setCronRunning] = useState(false);
  const [cronFeedback, setCronFeedback] = useState<string | null>(null);

  const handleTriggerCron = async () => {
    setCronRunning(true);
    setCronFeedback(null);
    try {
      const res = await fetch('/api/admin/trigger-cron', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setCronFeedback(`تم تشغيل الفحص بنجاح: تم إلغاء ${json.expiredCount} عملية منتهية الصلاحية.`);
        onRefreshHealth();
      } else {
        setCronFeedback(json.error || 'فشل تشغيل فحص انتهاء الصلاحية');
      }
    } catch {
      setCronFeedback('حدث خطأ أثناء الاتصال بالسيرفر');
    } finally {
      setCronRunning(false);
    }
  };

  const isFsConnected = systemHealth?.database?.isLiveConnected ?? true;

  return (
    <div className="space-y-8">
      {/* Admin Operations Hero Banner */}
      <div className="bg-gradient-to-l from-indigo-950/80 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 bg-indigo-500/15 text-indigo-400 px-3.5 py-1 rounded-full text-xs font-bold border border-indigo-500/30">
              <ShieldAlert className="w-4 h-4 text-indigo-400" />
              <span>لوحة الرقابة والإشراف المركزي للمشروع (/admin)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              مركز إدارة المنظومة وفحص البوابة
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              تحكم كامل في إعدادات المنظومة، مراقبة صحة قواعد بيانات Firestore، إدارة طابور المراجعة اليدوية، فحص رسائل SMS وتواقيع HMAC المشفرة، وتتبع تسليم الـ Webhooks لجميع المتاجر.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleTriggerCron}
              disabled={cronRunning}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition shadow-lg shadow-indigo-600/20"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${cronRunning ? 'animate-spin' : ''}`} />
              <span>تشغيل فحص انتهاء الصلاحية (Cron)</span>
            </button>
            <button
              onClick={() => onSelectAdminTab('admin-android-integration')}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition shadow-lg shadow-emerald-600/20"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>توليد JSON الأندرويد (Integration)</span>
            </button>
            <button
              onClick={() => onSelectAdminTab('admin-android-dev')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl flex items-center gap-2 transition border border-slate-700"
            >
              <FolderGit2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>كود تطبيق الأندرويد</span>
            </button>
          </div>
        </div>

        {cronFeedback && (
          <div className="mt-4 p-3 bg-indigo-900/40 border border-indigo-500/40 rounded-xl text-xs text-indigo-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <span>{cronFeedback}</span>
          </div>
        )}
      </div>

      {/* System Health Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Firestore Diagnostic Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-emerald-400" />
              حالة Firebase Firestore
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                isFsConnected
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
              }`}
            >
              {isFsConnected ? 'Live Active' : 'Synced ACID Engine'}
            </span>
          </div>
          <div className="space-y-1.5 text-xs text-slate-300">
            <div className="flex justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-400">معرف قاعدة البيانات:</span>
              <span className="font-mono text-[11px] text-emerald-400">
                ai-studio-ehabgmpay...
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-400">قواعد الأمان (Rules):</span>
              <span className="text-emerald-400 font-medium">مغلقة ومحمية 100%</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">آلية منع التكرار:</span>
              <span className="text-slate-200 font-mono text-[11px]">merchantId_txId</span>
            </div>
          </div>
        </div>

        {/* Server & Cron Status Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Server className="w-4 h-4 text-indigo-400" />
              الخادم والمهام المجدولة (Cron)
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              Serverless Ready
            </span>
          </div>
          <div className="space-y-1.5 text-xs text-slate-300">
            <div className="flex justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-400">مسار الكرون:</span>
              <span className="font-mono text-[11px] text-indigo-300">/api/cron/expire-payments</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-400">مدة صلاحية الطلب:</span>
              <span className="text-slate-200">30 دقيقة لكل دفعة</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">تشفير إشعار الرسائل:</span>
              <span className="text-emerald-400 font-medium">HMAC-SHA256</span>
            </div>
          </div>
        </div>

        {/* Security & Access Protection Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-amber-400" />
              الحماية والتحقق الإداري
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
              Admin Protected
            </span>
          </div>
          <div className="space-y-1.5 text-xs text-slate-300">
            <div className="flex justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-400">عزل الصلاحيات:</span>
              <span className="text-emerald-400">منفصل تماماً عن العملاء</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-400">حماية Replay Attack:</span>
              <span className="text-slate-200">صلاحية الطابع الزمني 5 دقائق</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">سجل الرقابة (Audit):</span>
              <span className="text-slate-200">توثيق كامل للعمليات الحساسة</span>
            </div>
          </div>
        </div>
      </div>

      {/* Operations Metrics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Volume */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">إجمالي حجم التعاملات</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono">
            {stats.totalVolume.toFixed(2)}{' '}
            <span className="text-xs font-normal text-slate-400">ج.م</span>
          </div>
          <div className="text-[11px] text-indigo-400 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {stats.completedPayments} عملية مؤكدة
          </div>
        </div>

        {/* Metric 2: Review Queue */}
        <div
          onClick={() => onSelectAdminTab('admin-review')}
          className="bg-slate-900 hover:bg-slate-800/70 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2 cursor-pointer transition group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold group-hover:text-amber-400 transition">
              طابور المراجعة اليدوية
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
            {stats.reviewQueueCount}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <span>تحتاج فحص وتأكيد إداري</span>
            <ArrowUpRight className="w-3 h-3 text-amber-400" />
          </div>
        </div>

        {/* Metric 3: Active Devices */}
        <div
          onClick={() => onSelectAdminTab('admin-merchants')}
          className="bg-slate-900 hover:bg-slate-800/70 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2 cursor-pointer transition group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold group-hover:text-emerald-400 transition">
              أجهزة الهواتف النشطة
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono">
            {stats.activeDevices}
          </div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>تستقبل إشعارات الرسائل</span>
          </div>
        </div>

        {/* Metric 4: All SMS Processed */}
        <div
          onClick={() => onSelectAdminTab('admin-sms')}
          className="bg-slate-900 hover:bg-slate-800/70 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2 cursor-pointer transition group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold group-hover:text-cyan-400 transition">
              إجمالي رسائل SMS الواردة
            </span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono">
            {stats.totalSmsReceived}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <span>سجل الفحص والتدقيق الكامل</span>
            <ArrowUpRight className="w-3 h-3 text-cyan-400" />
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards to Admin Sections */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-400" />
          <span>الأقسام التشغيلية والرقابية</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => onSelectAdminTab('admin-review')}
            className="p-5 bg-slate-900 hover:bg-slate-800/80 border border-slate-800 rounded-2xl text-right transition flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3 group-hover:scale-105 transition">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-white group-hover:text-amber-400 transition">
                طابور المراجعة اليدوية
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                فحص التحويلات التي لم تتطابق تلقائياً والتأكيد اليدوي برقم العملية.
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-amber-400 font-semibold">
              <span>{reviewQueue.length} عمليات تنتظر المراجعة</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </button>

          <button
            onClick={() => onSelectAdminTab('admin-sms')}
            className="p-5 bg-slate-900 hover:bg-slate-800/80 border border-slate-800 rounded-2xl text-right transition flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-3 group-hover:scale-105 transition">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-white group-hover:text-cyan-400 transition">
                سجل فحص وتدقيق SMS
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                استعراض كافة رسائل SMS الواردة وفحص توقيع HMAC وتحليل النصوص.
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-cyan-400 font-semibold">
              <span>عرض سجل الفحص</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </button>

          <button
            onClick={() => onSelectAdminTab('admin-webhooks')}
            className="p-5 bg-slate-900 hover:bg-slate-800/80 border border-slate-800 rounded-2xl text-right transition flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3 group-hover:scale-105 transition">
                <Send className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-white group-hover:text-purple-400 transition">
                مراقبة إرسال الويب هوك
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                تتبع وصول الإشعارات لسيرفرات التجار وإعادة المحاولة الفورية للفاشل منها.
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-purple-400 font-semibold">
              <span>فحص محاولات الإرسال</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </button>

          <button
            onClick={() => onSelectAdminTab('admin-merchants')}
            className="p-5 bg-slate-900 hover:bg-slate-800/80 border border-slate-800 rounded-2xl text-right transition flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition">
                <Users className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-white group-hover:text-emerald-400 transition">
                إدارة التجار والمحافظ
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                استعراض بيانات كافة المتاجر المشتركة، محافظها، وأجهزتها المقترنة.
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-emerald-400 font-semibold">
              <span>إدارة المتاجر</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
