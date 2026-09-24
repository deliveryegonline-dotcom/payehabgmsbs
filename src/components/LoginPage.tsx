import React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  LogIn,
  LogOut,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Lock,
  Layers,
  Smartphone,
  Wallet,
  Globe,
  User,
  AlertCircle,
} from 'lucide-react';
import { useAuth, ADMIN_EMAILS } from '../context/AuthContext.tsx';

interface LoginPageProps {
  onNavigateToMerchant: () => void;
  onNavigateToAdmin: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onNavigateToMerchant,
  onNavigateToAdmin,
}) => {
  const {
    user,
    loading,
    isAdmin,
    role,
    merchantId,
    authError,
    signInWithGoogle,
    logout,
    clearError,
  } = useAuth();

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 animate-fadeIn">
      <div className="max-w-xl w-full space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-indigo-600 shadow-xl shadow-emerald-500/20 mb-2">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            بوابة تسجيل الدخول والمصادقة
          </h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            منظومة EHABGM Pay لمعالجة مدفوعات فودافون كاش وإنستاباي عبر هواتف الأندرويد السحابية
          </p>
        </div>

        {/* Error Notification */}
        {authError && (
          <div className="bg-rose-950/60 border border-rose-500/40 p-4 rounded-2xl flex items-start justify-between gap-3 text-rose-200 text-xs animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{authError}</span>
            </div>
            <button
              onClick={clearError}
              className="text-rose-400 hover:text-white text-xs font-bold"
            >
              إغلاق
            </button>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* If user is ALREADY signed in */}
          {user ? (
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-14 h-14 rounded-2xl border-2 border-emerald-500/40 object-cover shadow"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-700">
                    <User className="w-6 h-6" />
                  </div>
                )}
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-base truncate">
                      {user.displayName || 'مستخدم مسجل'}
                    </h3>
                    {isAdmin ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shrink-0">
                        مدير عام (Admin)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shrink-0">
                        حساب تاجر (Merchant)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 font-mono truncate">
                    {user.email}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    معرف التاجر: <span className="text-emerald-400 font-semibold">{merchantId}</span>
                  </p>
                </div>
              </div>

              {/* Navigation Action Buttons based on Role */}
              <div className="space-y-3">
                <button
                  onClick={onNavigateToMerchant}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-600/30"
                >
                  <Wallet className="w-4 h-4" />
                  <span>الدخول إلى لوحة تحكم التاجر (Merchant Portal)</span>
                  <ArrowRight className="w-4 h-4 mr-auto rtl:mr-0 rtl:ml-auto" />
                </button>

                {isAdmin && (
                  <button
                    onClick={onNavigateToAdmin}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-600/30"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    <span>الدخول إلى لوحة المدير والرقابة المركزية (/admin)</span>
                    <ArrowRight className="w-4 h-4 mr-auto rtl:mr-0 rtl:ml-auto" />
                  </button>
                )}

                <button
                  onClick={logout}
                  disabled={loading}
                  className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition border border-slate-700/60"
                >
                  <LogOut className="w-4 h-4 text-slate-400" />
                  <span>تسجيل الخروج والتبديل لحساب آخر</span>
                </button>
              </div>
            </div>
          ) : (
            /* If user is NOT signed in */
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-base font-bold text-white">
                  تسجيل الدخول بحساب Google المعتمد
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  يتم التحقق من الصلاحيات وتوجيهك تلقائياً:
                </p>
                <div className="space-y-2 text-xs">
                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white block">حسابات الإدارة والتشغيل:</span>
                      <span className="text-slate-400 text-[11px]">
                        <code className="text-indigo-300 font-mono">deliveryegonline@gmail.com</code> أو <code className="text-indigo-300 font-mono">ehabgm200@gmail.com</code> (وصول كامل للإشراف وتطبيق الأندرويد والـ Cron).
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-start gap-2.5">
                    <Wallet className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white block">حسابات التجار والشركاء:</span>
                      <span className="text-slate-400 text-[11px]">
                        أي بريد Google آخر سيحصل فورياً على مساحة تاجر خاصة لإدارة المحافظ وربط هاتفه واستقبال المدفوعات.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Google Sign In Button */}
              <button
                onClick={signInWithGoogle}
                disabled={loading}
                className="w-full py-4 px-6 bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-900 font-black text-sm rounded-2xl flex items-center justify-center gap-3 transition shadow-xl shadow-white/10 hover:shadow-white/20 active:scale-[0.99]"
              >
                {/* Google Colored Logo SVG */}
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{loading ? 'جاري المصادقة عبر Google...' : 'تسجيل الدخول عبر Google (Firebase Auth)'}</span>
              </button>

              <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>مصادقة آمنة ومحمية بقواعد بيانات Firebase السحابية</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
