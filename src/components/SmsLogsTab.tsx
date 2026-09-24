import React, { useState } from 'react';
import { MessageSquare, CheckCircle2, AlertTriangle, Copy, Check, Clock } from 'lucide-react';
import type { SmsLog } from '../types/index.ts';

interface SmsLogsTabProps {
  logs: SmsLog[];
  onRefresh: () => void;
}

export const SmsLogsTab: React.FC<SmsLogsTabProps> = ({ logs, onRefresh }) => {
  const [filter, setFilter] = useState<'all' | 'matched' | 'review' | 'duplicate'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = logs.filter((l) => {
    if (filter === 'all') return true;
    return l.matchStatus === filter;
  });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            سجل رسائل الـ SMS الواردة
            <span className="text-xs font-normal text-slate-400">({logs.length} رسالة مستلمة)</span>
          </h2>
          <p className="text-xs text-slate-400">جميع الإشعارات المستلمة من الهواتف المقترنة بعد التحقق من توقيع الـ HMAC</p>
        </div>

        <div className="flex gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          {(['all', 'matched', 'review', 'duplicate'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filter === st ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {st === 'all'
                ? 'الكل'
                : st === 'matched'
                ? 'مطابقة ومؤكدة'
                : st === 'review'
                ? 'بالمراجعة'
                : 'مكررة'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((sms) => (
          <div
            key={sms.id}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-3 transition hover:border-slate-700/80 shadow-lg"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-800 text-white border border-slate-700">
                  {sms.sender}
                </span>
                <span className="font-mono text-xs text-slate-300">
                  عملية: <strong className="text-white">{sms.transactionId}</strong>
                </span>
                {sms.counterpartyPhone && (
                  <span className="text-xs text-slate-400 font-mono">
                    (من: {sms.counterpartyPhone})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(sms.receivedAt).toLocaleString('ar-EG')}</span>
                </div>

                {sms.matchStatus === 'matched' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    مطابقة
                  </span>
                )}
                {sms.matchStatus === 'review' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    طابور المراجعة
                  </span>
                )}
                {sms.matchStatus === 'duplicate' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    مكررة
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xl font-bold font-mono text-white">
                {sms.amount.toFixed(2)} <span className="text-xs text-slate-400 font-normal">ج.م</span>
              </div>
              {sms.matchedPaymentId && (
                <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                  مرتبطة بالدفعة: #{sms.matchedPaymentId.slice(0, 8)}...
                </span>
              )}
            </div>

            {/* Raw text */}
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
              {sms.rawText}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
