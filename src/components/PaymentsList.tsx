import React, { useState } from 'react';
import { Search, ExternalLink, Copy, Check, Clock, Plus, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import type { Payment } from '../types/index.ts';

interface PaymentsListProps {
  payments: Payment[];
  onOpenCreateModal: () => void;
  onOpenCheckout: (paymentId: string) => void;
}

export const PaymentsList: React.FC<PaymentsListProps> = ({
  payments,
  onOpenCreateModal,
  onOpenCheckout,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'expired'>('all');
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = payments.filter((p) => {
    if (filter !== 'all' && p.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchRef = p.orderRef.toLowerCase().includes(q);
      const matchTxn = p.verifiedTransactionId?.toLowerCase().includes(q);
      const matchPhone = p.customerPhone?.includes(q);
      const matchAmount = p.payableAmount.toString().includes(q);
      return matchRef || matchTxn || matchPhone || matchAmount;
    }
    return true;
  });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">سجل المدفوعات والعمليات</h2>
          <p className="text-xs text-slate-400">إدارة ومتابعة طلبات الدفع عبر المحافظ الإلكترونية المصرية</p>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="self-start sm:self-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition shadow-lg shadow-emerald-600/20"
        >
          <Plus className="w-4 h-4" />
          إنشاء دفعة وتخصيص قروش
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-500 absolute top-1/2 -translate-y-1/2 right-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث برقم الطلب، رقم العملية، الهاتف، أو المبلغ..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pr-10 pl-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0">
          {(['all', 'pending', 'completed', 'expired'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filter === st ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {st === 'all'
                ? 'الكل'
                : st === 'pending'
                ? 'معلقة'
                : st === 'completed'
                ? 'مكتملة'
                : 'منتهية'}
            </button>
          ))}
        </div>
      </div>

      {/* Table / List */}
      {filtered.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center">
          <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">لا توجد عمليات مطابقة</h3>
          <p className="text-xs text-slate-400">جرب تغيير معايير البحث أو أنشئ دفعة جديدة.</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="p-3.5">رقم الطلب</th>
                  <th className="p-3.5">المبلغ المطلوب</th>
                  <th className="p-3.5">القروش المحجوزة</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5">رقم العملية (SMS)</th>
                  <th className="p-3.5">التاريخ والمهلة</th>
                  <th className="p-3.5 text-center">رابط الدفع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filtered.map((p) => {
                  const checkoutUrl = `${window.location.origin}/c/${p.id}`;
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3.5 font-bold text-white">{p.orderRef}</td>
                      <td className="p-3.5 font-black text-sm text-white">
                        {p.payableAmount.toFixed(2)}{' '}
                        <span className="text-[11px] font-normal text-slate-400">ج.م</span>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold">
                          +{p.piasters} قرش
                        </span>
                      </td>
                      <td className="p-3.5">
                        {p.status === 'completed' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            مكتملة
                          </span>
                        )}
                        {p.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            <Clock className="w-3 h-3" />
                            معلقة
                          </span>
                        )}
                        {p.status === 'expired' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                            <XCircle className="w-3 h-3" />
                            منتهية
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-300">
                        {p.verifiedTransactionId ? (
                          <span className="font-bold text-white">{p.verifiedTransactionId}</span>
                        ) : (
                          <span className="text-slate-600 font-sans">بانتظار التحويل</span>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-400 text-[11px]">
                        <div>{new Date(p.createdAt).toLocaleDateString('ar-EG')}</div>
                        <div className="text-slate-500">{new Date(p.createdAt).toLocaleTimeString('ar-EG')}</div>
                      </td>
                      <td className="p-3.5 text-center font-sans">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onOpenCheckout(p.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 transition"
                            title="فتح صفحة الدفع"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleCopy(p.id, checkoutUrl)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                            title="نسخ الرابط"
                          >
                            {copiedId === p.id ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
