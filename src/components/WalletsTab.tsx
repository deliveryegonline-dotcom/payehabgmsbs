import React, { useState } from 'react';
import { Wallet as WalletIcon, Plus, CheckCircle2, ShieldCheck, RefreshCw } from 'lucide-react';
import type { Wallet } from '../types/index.ts';

interface WalletsTabProps {
  wallets: Wallet[];
  onRefresh: () => void;
}

export const WalletsTab: React.FC<WalletsTabProps> = ({ wallets, onRefresh }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [provider, setProvider] = useState<'vodafone_cash' | 'instapay' | 'orange_cash' | 'etisalat_cash'>(
    'vodafone_cash',
  );
  const [identifier, setIdentifier] = useState('');
  const [label, setLabel] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAddWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !label) return;

    try {
      setLoading(true);
      const res = await fetch('/api/merchant/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, identifier, label, isDefault }),
      });
      if (res.ok) {
        setShowAdd(false);
        setIdentifier('');
        setLabel('');
        setIsDefault(false);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getProviderBadge = (p: string) => {
    switch (p) {
      case 'vodafone_cash':
        return { label: 'فودافون كاش', color: 'bg-red-500/20 text-red-400 border-red-500/30' };
      case 'instapay':
        return { label: 'إنستاباي IPN', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' };
      case 'orange_cash':
        return { label: 'أورنچ كاش', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' };
      case 'etisalat_cash':
        return { label: 'إي آند كاش (اتصالات)', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
      default:
        return { label: p, color: 'bg-slate-800 text-slate-300 border-slate-700' };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">المحافظ الإلكترونية وحسابات الاستلام</h2>
          <p className="text-xs text-slate-400">إدارة أرقام وعناوين المحافظ المخصصة لاستقبال أموال العملاء</p>
        </div>

        <button
          onClick={() => setShowAdd(true)}
          className="self-start sm:self-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition shadow-lg shadow-emerald-600/20"
        >
          <Plus className="w-4 h-4" />
          إضافة محفظة جديدة
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {wallets.map((wallet) => {
          const badge = getProviderBadge(wallet.provider);
          return (
            <div
              key={wallet.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-xl transition space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${badge.color}`}>
                  {badge.label}
                </span>
                {wallet.isDefault && (
                  <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    المحفظة الافتراضية
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-base font-bold text-white">{wallet.label}</h3>
                <div className="text-xl font-mono font-bold text-emerald-400 mt-1 tracking-wider" dir="ltr">
                  {wallet.identifier}
                </div>
              </div>

              <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span>تاريخ الإضافة: {new Date(wallet.createdAt).toLocaleDateString('ar-EG')}</span>
                <span className="text-emerald-400">نشطة وجاهزة للاستقبال</span>
              </div>
            </div>
          );
        })}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-2">إضافة محفظة استلام جديدة</h3>
            <p className="text-xs text-slate-400 mb-5">أدخل بيانات المحفظة التي يستقبل هاتف الكاشير رسائلها</p>

            <form onSubmit={handleAddWallet} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">مزود الخدمة:</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="vodafone_cash">فودافون كاش (Vodafone Cash)</option>
                  <option value="instapay">إنستاباي (InstaPay / IPN)</option>
                  <option value="orange_cash">أورنچ كاش (Orange Cash)</option>
                  <option value="etisalat_cash">إي آند كاش (اتصالات كاش)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  رقم المحفظة أو عنوان الدفع (IPA):
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: 01012345678 أو username@instapay"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">تسمية المحفظة:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: فودافون كاش - الحساب التجاري 1"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="defaultCheck"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded accent-emerald-500"
                />
                <label htmlFor="defaultCheck" className="text-xs text-slate-300 cursor-pointer">
                  تعيين كمحفظة رئيسية افتراضية للمدفوعات الجديدة
                </label>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition"
                >
                  {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  حفظ المحفظة
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
