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
  Play,
  Plus,
  ShieldAlert,
  ArrowLeft,
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenCreateModal: () => void;
  onOpenSimulator: () => void;
  onSwitchToAdmin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenCreateModal,
  onOpenSimulator,
  onSwitchToAdmin,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const merchantNavItems = [
    { id: 'overview', label: 'نظرة عامة', icon: LayoutDashboard },
    { id: 'wallets', label: 'ربط المحافظ', icon: Wallet },
    { id: 'devices', label: 'ربط التطبيق والهاتف', icon: Smartphone },
    { id: 'payments', label: 'المدفوعات والفواتير', icon: CreditCard },
    { id: 'api-keys', label: 'مفاتيح API والويب هوك', icon: Key },
    { id: 'docs', label: 'التوثيق البرمجي', icon: BookOpen },
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

          {/* Header Action Buttons */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={onOpenSimulator}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition border border-slate-700/60"
            >
              <Play className="w-3.5 h-3.5 fill-current text-emerald-400" />
              <span>محاكي التجربة</span>
            </button>

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
              className="px-3.5 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-sm"
              title="الانتقال إلى لوحة الإدارة والمتابعة المركزية"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
              <span>لوحة الإدارة /admin</span>
            </button>
          </div>

          {/* Mobile hamburger button */}
          <div className="flex lg:hidden items-center gap-2">
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
                onOpenSimulator();
                setMobileMenuOpen(false);
              }}
              className="py-2.5 bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 text-emerald-400 fill-current" />
              <span>محاكي التجربة</span>
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
