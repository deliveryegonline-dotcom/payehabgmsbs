import React from 'react';
import {
  TrendingUp,
  CreditCard,
  Clock,
  CheckCircle2,
  Smartphone,
  Wallet,
  ArrowUpRight,
  ExternalLink,
  Plus,
  ShieldCheck,
  Key,
  QrCode,
  Zap,
  LogIn,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import type { DashboardStats, Payment, Device } from '../types/index.ts';

interface DashboardOverviewProps {
  stats: DashboardStats;
  recentPayments: Payment[];
  devices: Device[];
  onOpenCreateModal: () => void;
  onOpenPairModal: () => void;
  onOpenCheckout: (paymentId: string) => void;
  onSelectTab: (tab: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  stats,
  recentPayments,
  devices,
  onOpenCreateModal,
  onOpenPairModal,
  onOpenCheckout,
  onSelectTab,
}) => {
  const { user, isAdmin, signInWithGoogle } = useAuth();
  return (
    <div className="space-y-8">
      {/* Top Banner & Quick Actions for Merchant */}
      <div className="bg-gradient-to-l from-emerald-950/70 via-slate-900 to-slate-900 border border-emerald-500/20 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            بوابة التاجر والعميل متصلة ومستعدة لاستقبال الأموال
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            مرحباً بك في بوابة مدفوعاتك الإلكترونية
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            اربط محافظك (فودافون كاش، إنستاباي، اتصالات، أورنج)، واقترن بهاتفك عبر تطبيق الأندرويد لاستقبال إشعارات التحويل والتأكيد الآلي فورياً خلال ثوانٍ.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 z-10">
          <button
            onClick={onOpenCreateModal}
            className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition shadow-lg shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" />
            إنشاء دفعة جديدة
          </button>
          <button
            onClick={onOpenPairModal}
            className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl flex items-center gap-2 transition border border-slate-700/60"
          >
            <Smartphone className="w-4 h-4 text-emerald-400" />
            ربط هاتف أندرويد بالـ QR
          </button>
        </div>
      </div>

      {/* Google Authentication Account Status Box */}
      <div className={`p-5 rounded-3xl border ${user ? 'bg-slate-900/90 border-emerald-500/30' : 'bg-gradient-to-r from-emerald-950/40 to-slate-900 border-amber-500/30'} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${user ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
            {user ? <Check className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              {user ? (
                <>
                  <span>حساب جوجل متصل:</span>
                  <span className="text-emerald-400 font-mono text-xs">{user.email}</span>
                </>
              ) : (
                'سجّل دخولك بحساب Google لربط محافظك الحقيقية'
              )}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              {user
                ? (isAdmin ? 'لديك صلاحيات إدارة النظام المركزية ehabgm200@gmail.com' : 'بياناتك ومحافظك وهواتفك ومفاتيح API محفوظة بأمان في قاعدة بيانات Firestore الحقيقية.')
                : 'تسجيل الدخول بنقرة واحدة عبر حساب جوجل لحفظ بياناتك ومحافظك ومزامنتها مع تطبيق الأندرويد.'}
            </p>
          </div>
        </div>

        {!user && (
          <button
            onClick={signInWithGoogle}
            className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 transition shadow-md whitespace-nowrap self-stretch sm:self-auto justify-center"
          >
            <LogIn className="w-4 h-4 text-slate-950" />
            <span>تسجيل الدخول الفوري بجوجل</span>
          </button>
        )}
      </div>

      {/* Quick Setup Wizard Steps (4 Steps to Start) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span>خطوات التفعيل السريع للتاجر (4 خطوات بسيطة)</span>
          </h3>
          <span className="text-xs text-slate-400">ابدأ في أقل من 3 دقائق</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Step 1 */}
          <div
            onClick={() => onSelectTab('wallets')}
            className="p-4 bg-slate-950/80 border border-slate-800 hover:border-emerald-500/40 rounded-2xl cursor-pointer transition group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-xs flex items-center justify-center">
                1
              </span>
              <Wallet className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition" />
            </div>
            <h4 className="text-xs font-bold text-white group-hover:text-emerald-300">
              ربط المحافظ الإلكترونية
            </h4>
            <p className="text-[11px] text-slate-400 mt-1">
              أضف رقم فودافون كاش أو إنستاباي لاستقبال أموالك عليها مباشرة.
            </p>
          </div>

          {/* Step 2 */}
          <div
            onClick={() => onSelectTab('devices')}
            className="p-4 bg-slate-950/80 border border-slate-800 hover:border-emerald-500/40 rounded-2xl cursor-pointer transition group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-xs flex items-center justify-center">
                2
              </span>
              <QrCode className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition" />
            </div>
            <h4 className="text-xs font-bold text-white group-hover:text-emerald-300">
              ربط الهاتف والتطبيق
            </h4>
            <p className="text-[11px] text-slate-400 mt-1">
              ثبّت تطبيق قارئ الإشعارات واقترن فورياً برمز PIN أو QR Code.
            </p>
          </div>

          {/* Step 3 */}
          <div
            onClick={onOpenCreateModal}
            className="p-4 bg-slate-950/80 border border-slate-800 hover:border-emerald-500/40 rounded-2xl cursor-pointer transition group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-xs flex items-center justify-center">
                3
              </span>
              <CreditCard className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition" />
            </div>
            <h4 className="text-xs font-bold text-white group-hover:text-emerald-300">
              إنشاء رابط دفع وتخصيص القروش
            </h4>
            <p className="text-[11px] text-slate-400 mt-1">
              ولّد رابط دفع حقيقي `/c/:id` لتجربة دورة التأكيد الفوري للعميل.
            </p>
          </div>

          {/* Step 4 */}
          <div
            onClick={() => onSelectTab('api-keys')}
            className="p-4 bg-slate-950/80 border border-slate-800 hover:border-emerald-500/40 rounded-2xl cursor-pointer transition group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-xs flex items-center justify-center">
                4
              </span>
              <Key className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition" />
            </div>
            <h4 className="text-xs font-bold text-white group-hover:text-emerald-300">
              مفاتيح الربط والـ API
            </h4>
            <p className="text-[11px] text-slate-400 mt-1">
              احصل على مفتاح الـ API والويب هوك لربط موقعك أو متجرك الإلكتروني.
            </p>
          </div>
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
          onClick={() => onSelectTab('devices')}
          className="bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-5 shadow-xl space-y-2 cursor-pointer transition group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">الأجهزة المتصلة النشطة</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:scale-105 transition-transform">
              <Smartphone className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono">
            {stats.activeDevices}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>تستقبل رسائل المحفظة</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400" />
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
              onClick={() => onSelectTab('devices')}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5"
            >
              إدارة أجهزة الهاتف وتطبيق الأندرويد
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
