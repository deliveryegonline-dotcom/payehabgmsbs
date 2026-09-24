import React, { useState } from 'react';
import {
  ShieldAlert,
  LayoutDashboard,
  AlertTriangle,
  Layers,
  Send,
  Shield,
  Users,
  RefreshCw,
  ArrowRight,
  Menu,
  X,
  Zap,
  FolderGit2,
  Smartphone,
  LogOut,
  LogIn,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface AdminNavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  reviewCount: number;
  onRefreshAll?: () => void;
  onSwitchToMerchantPortal: () => void;
}

export const AdminNavbar: React.FC<AdminNavbarProps> = ({
  currentTab,
  onSelectTab,
  reviewCount,
  onRefreshAll,
  onSwitchToMerchantPortal,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { user, isAdmin, signInWithGoogle, logout } = useAuth();

  const handleRefreshClick = () => {
    if (onRefreshAll) {
      setIsRefreshing(true);
      onRefreshAll();
      setTimeout(() => setIsRefreshing(false), 800);
    }
  };

  const adminNavItems = [
    { id: 'admin-overview', label: 'صحة المنظومة والمراقبة', icon: LayoutDashboard },
    {
      id: 'admin-review',
      label: 'طابور المراجعة والتدقيق',
      icon: AlertTriangle,
      badge: reviewCount > 0 ? reviewCount : null,
    },
    { id: 'admin-android-integration', label: 'تكامل وتوليد JSON الأندرويد', icon: Smartphone },
    { id: 'admin-android-dev', label: 'كود تطبيق الأندرويد المفتوح', icon: FolderGit2 },
    { id: 'admin-sms', label: 'فحص وتدقيق SMS', icon: Layers },
    { id: 'admin-webhooks', label: 'مراقبة الويب هوك', icon: Send },
    { id: 'admin-audit', label: 'سجل التدقيق الأمني', icon: Shield },
    { id: 'admin-merchants', label: 'إدارة المتاجر والعملاء', icon: Users },
    { id: 'admin-env-android', label: 'المتغيرات وبيئة الربط', icon: Zap },
  ];

  return (
    <nav className="bg-slate-900 border-b border-indigo-900/50 sticky top-0 z-40 backdrop-blur-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Admin Indicator */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black text-white tracking-tight">
                  لوحة الإدارة المركزية
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  ehabgm200@gmail.com
                </span>
              </div>
              <span className="text-[11px] text-slate-400 block">
                EHABGM Pay - إدارة المنظومة وكود تطبيق الأندرويد
              </span>
            </div>
          </div>

          {/* Desktop Nav Items */}
          <div className="hidden lg:flex items-center gap-1">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px]">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Switch to Merchant Portal & Actions */}
          <div className="hidden sm:flex items-center gap-2.5">
            {onRefreshAll && (
              <button
                onClick={handleRefreshClick}
                disabled={isRefreshing}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition border border-slate-700"
                title="تحديث ومزامنة المنظومة لحظياً"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>مزامنة شاملة</span>
              </button>
            )}

            <button
              onClick={onSwitchToMerchantPortal}
              className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-sm"
              title="الانتقال إلى بوابة العميل وربط المحافظ"
            >
              <span>بوابة التاجر والعميل</span>
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            </button>

            {/* Auth Profile */}
            {user ? (
              <div className="flex items-center gap-2 pr-2 border-r border-slate-800">
                <button
                  onClick={logout}
                  title="تسجيل الخروج"
                  className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-800 rounded-lg transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="px-3 py-1.5 bg-white text-slate-900 text-xs font-bold rounded-xl flex items-center gap-1.5"
              >
                <LogIn className="w-3 h-3" />
                <span>دخول جوجل</span>
              </button>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={onSwitchToMerchantPortal}
              className="px-2.5 py-1 bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold rounded-lg"
            >
              بوابة التاجر
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-900 border-b border-slate-800 px-4 py-4 space-y-2">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px]">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </nav>
  );
};

