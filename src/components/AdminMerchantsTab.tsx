import React, { useState, useEffect } from 'react';
import {
  Users,
  Store,
  CreditCard,
  Smartphone,
  Wallet,
  Shield,
  Search,
  ExternalLink,
  CheckCircle2,
  Clock,
  RefreshCw,
} from 'lucide-react';
import type { MerchantSummary } from '../types/index.ts';

export const AdminMerchantsTab: React.FC = () => {
  const [merchants, setMerchants] = useState<MerchantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchMerchants = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/merchants');
      const json = await res.json();
      if (json.success) {
        setMerchants(json.data);
      }
    } catch (err) {
      console.error('Failed to load merchants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMerchants();
  }, []);

  const filteredMerchants = merchants.filter(
    (m) =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.id.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <span>إدارة ومتابعة المتاجر والعملاء المشتركين</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            متابعة حسابات المتاجر، المحافظ المربوطة، الأجهزة المتصلة لكل عميل، وإجمالي المبيعات المؤكدة.
          </p>
        </div>

        <button
          onClick={fetchMerchants}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-2 transition self-start sm:self-auto border border-slate-700"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>تحديث القائمة</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder="البحث باسم المتجر، البريد الإلكتروني، أو المعرف..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pr-10 pl-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
        />
      </div>

      {/* Merchants Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-xs">
          جاري تحميل بيانات المتاجر من قاعدة البيانات...
        </div>
      ) : filteredMerchants.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl text-slate-400 text-xs">
          لا توجد متاجر مطابقة للبحث
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMerchants.map((merchant) => (
            <div
              key={merchant.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 hover:border-slate-700 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-teal-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">{merchant.name}</h3>
                    <p className="text-xs text-slate-400 font-mono">{merchant.email}</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  متجر نشط
                </span>
              </div>

              {/* Metrics Row */}
              <div className="grid grid-cols-3 gap-2 bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 block">إجمالي التحويلات</span>
                  <span className="text-sm font-bold text-white font-mono">
                    {merchant.totalVolume.toFixed(2)} ج.م
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">المحافظ المربوطة</span>
                  <span className="text-sm font-bold text-indigo-400 font-mono flex items-center justify-center gap-1">
                    <Wallet className="w-3 h-3" />
                    {merchant.walletsCount}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">الأجهزة المتصلة</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono flex items-center justify-center gap-1">
                    <Smartphone className="w-3 h-3" />
                    {merchant.activeDevicesCount}
                  </span>
                </div>
              </div>

              {/* Integration Details */}
              <div className="space-y-1.5 text-xs text-slate-400">
                <div className="flex items-center justify-between">
                  <span>معرف التاجر (Merchant ID):</span>
                  <span className="font-mono text-slate-300 text-[11px] bg-slate-800 px-2 py-0.5 rounded">
                    {merchant.id}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>رابط الويب هوك:</span>
                  <span className="font-mono text-slate-300 text-[11px] truncate max-w-[200px]">
                    {merchant.webhookUrl || 'لم يتم تعيينه'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
