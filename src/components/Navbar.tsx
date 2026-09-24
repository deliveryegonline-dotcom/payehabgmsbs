import React, { useState } from 'react';
import {
  ShieldCheck,
  LayoutDashboard,
  CreditCard,
  Smartphone,
  Wallet,
  Key,
  BookOpen,
  Menu,
  X,
  RefreshCw,
  Plus,
  ShieldAlert,
  LogOut,
  LogIn,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenCreateModal: () => void;
  onRefreshData?: () => void;
  onSwitchToAdmin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenCreateModal,
  onRefreshData,
  onSwitchToAdmin,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { user, isAdmin, signInWithGoogle, logout } = useAuth();

  const handleRefreshClick = () => {
    if (onRefreshData) {
      setIsRefreshing(true);
      onRefreshData();
      setTimeout(() => setIsRefreshing(false), 800);
    }
  };

  const merchantNavItems = [
    { id: 'overview', label: 'نظرة عامة', icon: LayoutDashboard },
    { id: 'wallets', label: 'ربط المحافظ', icon: Wallet },
    { id: 'devices', label: 'ربط التطبيق والهاتف', icon: Smartphone },
    { id: 'payments', label: 'المدفوعات والفواتير', icon: CreditCard },
    { id: 'api-keys', label: 'مفاتيح API والويب هوك', icon: Key },
    { id: 'docs', label: 'التوثيق البرمجي', icon: BookOpen },
    { id: 'login', label: 'تسجيل الدخول', icon: LogIn },
  ];

  return (
    <nav className="bg-slate-900 border-b border-slate-800/80 sticky top-0 z-40 backdrop-blur-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand for Merchant Portal */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-white tracking-tight">
                  EHABGM Pay
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                  بوابة العميل والتاجر
                </span>
              </div>
              <span className="text-[11px] text-slate-400 block">
                ربط المحافظ وتطبيق الأندرويد واستقبال المدفوعات
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-1">
            {merchantNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Header Action Buttons & Auth */}
          <div className="hidden sm:flex items-center gap-2">
            {onRefreshData && (
              <button
                onClick={handleRefreshClick}
                disabled={isRefreshing}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition border border-slate-700/60"
                title="تحديث ومزامنة البيانات اللحظية"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>مزامنة فورية</span>
              </button>
            )}

            <button
              onClick={onOpenCreateModal}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-lg shadow-emerald-600/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إنشاء دفعة</span>
            </button>

            {/* Switch to Admin Panel Button */}
            <button
              onClick={onSwitchToAdmin}
              className="px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-sm"
              title="الانتقال إلى لوحة الإدارة والمتابعة المركزية"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
              <span>لوحة الإدارة</span>
            </button>

            {/* Google Authentication Section */}
            {user ? (
              <div className="flex items-center gap-2 pr-2 border-r border-slate-800 mr-1">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-8 h-8 rounded-full border border-emerald-500/40"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
                <div className="hidden xl:block text-right">
                  <span className="text-xs font-bold text-white block truncate max-w-[130px]">
                    {user.displayName || user.email?.split('@')[0]}
                  </span>
                  <span className={`text-[10px] block ${isAdmin ? 'text-indigo-400 font-bold' : 'text-emerald-400'}`}>
                    {isAdmin ? 'مدير المنصة ehabgm200' : 'تاجر معتمد'}
                  </span>
                </div>
                <button
                  onClick={logout}
                  title="تسجيل الخروج"
                  className="p-2 text-slate-400 hover:text-rose-400 bg-slate-800/80 hover:bg-slate-800 rounded-xl transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold rounded-xl flex items-center gap-2 transition shadow-md"
              >
                <LogIn className="w-3.5 h-3.5 text-slate-900" />
                <span>تسجيل الدخول بجوجل</span>
              </button>
            )}
          </div>

          {/* Mobile hamburger button */}
          <div className="flex lg:hidden items-center gap-2">
            {!user && (
              <button
                onClick={signInWithGoogle}
                className="px-2.5 py-1 bg-white text-slate-900 text-xs font-bold rounded-lg"
              >
                دخول
              </button>
            )}
            <button
              onClick={onSwitchToAdmin}
              className="px-2.5 py-1 bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 text-xs font-bold rounded-lg"
            >
              لوحة الإدارة
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

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-900 border-b border-slate-800 px-4 pt-2 pb-6 space-y-2 animate-fadeIn">
          {user && (
            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-2xl mb-2 border border-slate-800">
              <div className="flex items-center gap-2.5">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-slate-300" />
                  </div>
                )}
                <div>
                  <span className="text-xs font-bold text-white block">{user.displayName || user.email}</span>
                  <span className="text-[10px] text-emerald-400">{isAdmin ? 'مدير المنصة' : 'حساب تاجر'}</span>
                </div>
              </div>
              <button onClick={logout} className="text-xs text-rose-400 flex items-center gap-1 font-semibold">
                <LogOut className="w-3.5 h-3.5" />
                <span>خروج</span>
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              onClick={() => {
                onOpenCreateModal();
                setMobileMenuOpen(false);
              }}
              className="py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إنشاء دفعة</span>
            </button>
            <button
              onClick={() => {
                handleRefreshClick();
                setMobileMenuOpen(false);
              }}
              className="py-2.5 bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>مزامنة فورية</span>
            </button>
          </div>

          <div className="space-y-1">
            {merchantNavItems.map((item) => {
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
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
};

