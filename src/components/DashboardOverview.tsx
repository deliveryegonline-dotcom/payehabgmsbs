import React from 'react';
import {
  TrendingUp,
  CreditCard,
  Clock,
  CheckCircle2,
  Smartphone,
  AlertTriangle,
  ArrowUpRight,
  ExternalLink,
  Plus,
  Play,
  ShieldCheck,
} from 'lucide-react';
import type { DashboardStats, Payment, Device } from '../types/index.ts';

interface DashboardOverviewProps {
  stats: DashboardStats;
  recentPayments: Payment[];
  devices: Device[];
  onOpenCreateModal: () => void;
  onOpenPairModal: () => void;
  onOpenSimulator: () => void;
  onOpenCheckout: (paymentId: string) => void;
  onSelectTab: (tab: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  stats,
  recentPayments,
  devices,
  onOpenCreateModal,
  onOpenPairModal,
  onOpenSimulator,
  onOpenCheckout,
  onSelectTab,
}) => {
  return (
    <div className="space-y-8">
      {/* Top Banner & Quick Actions */}
      <div className="bg-gradient-to-l from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/20 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            بوابة EHABGM Pay متصلة وجاهزة
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            مرحباً بك في بوابة تأكيد مدفوعات المحافظ
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            نظام متكامل لتأكيد تحويلات فودافون كاش وإنستاباي عبر تخصيص القروش الفريدة واستقبال إشعارات الـ SMS المشفرة بـ HMAC.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 z-10">
          <button
            onClick={onOpenCreateModal}
            className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition shadow-lg shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" />
            إنشاء دفعة وقروش
          </button>
          <button
            onClick={onOpenSimulator}
            className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl flex items-center gap-2 transition border border-slate-700/60"
          >
            <Play className="w-4 h-4 fill-current text-emerald-400" />
            محاكي الرسائل
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">حجم التحويلات المؤكدة</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono">
            {stats.totalVolume.toFixed(2)}{' '}
            <span className="text-xs font-normal text-slate-400">ج.م</span>
          </div>
          <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {stats.completedPayments} عملية ناجحة
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">العمليات المعلقة الحالية</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono">
            {stats.pendingPayments}
          </div>
          <div className="text-[11px] text-amber-400 font-medium">
            بقروش محجوزة بانتظار الـ SMS
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">معدل التأكيد الآلي</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
            {stats.confirmationRate}
          </div>
          <div className="text-[11px] text-slate-400">
            تأكيد فوري خلال أقل من 10 ثوانٍ
          </div>
        </div>

        {/* Metric 4 */}
        <div
          onClick={() => onSelectTab('review')}
          className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-5 shadow-xl space-y-2 cursor-pointer transition group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">طابور المراجعة اليدوية</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
            {stats.reviewQueueCount}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>رسائل بانتظار البت</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Payments & Active Devices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Payments (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base">أحدث العمليات والمدفوعات</h3>
            <button
              onClick={() => onSelectTab('payments')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
            >
              عرض الكل ({stats.totalPayments})
            </button>
          </div>

          <div className="divide-y divide-slate-800/80 font-mono">
            {recentPayments.slice(0, 5).map((p) => (
              <div
                key={p.id}
                className="py-3.5 flex items-center justify-between gap-3 hover:bg-slate-800/30 px-2 rounded-xl transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">#{p.orderRef}</span>
                    {p.status === 'completed' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-sans">
                        مكتملة
                      </span>
                    )}
                    {p.status === 'pending' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-sans">
                        معلقة
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 font-sans mt-0.5">
                    {new Date(p.createdAt).toLocaleTimeString('ar-EG')} - {p.customerPhone || 'بدون هاتف'}
                  </div>
                </div>

                <div className="text-left flex items-center gap-3">
                  <div>
                    <div className="font-black text-white text-base">
                      {p.payableAmount.toFixed(2)}{' '}
                      <span className="text-[10px] font-normal text-slate-400">ج.م</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-bold block">
                      +{p.piasters} قرش
                    </span>
                  </div>

                  <button
                    onClick={() => onOpenCheckout(p.id)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 transition"
                    title="فتح صفحة الدفع المستضافة"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Devices Status (1 col) */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base">أجهزة الاستقبال النشطة</h3>
            <button
              onClick={onOpenPairModal}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
            >
              + ربط جهاز
            </button>
          </div>

          <div className="space-y-3">
            {devices.map((d) => (
              <div
                key={d.id}
                className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">{d.deviceName}</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                    نشط
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 flex justify-between font-mono">
                  <span>آخر استجابة:</span>
                  <span>{d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleTimeString('ar-EG') : 'الآن'}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <button
              onClick={() => onSelectTab('docs')}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5"
            >
              عرض دليل ربط تطبيق الـ Forwarder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
