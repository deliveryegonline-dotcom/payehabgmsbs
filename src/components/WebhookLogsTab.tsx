import React, { useState } from 'react';
import { Send, CheckCircle2, XCircle, RefreshCw, Clock } from 'lucide-react';
import type { WebhookLog } from '../types/index.ts';

interface WebhookLogsTabProps {
  logs: WebhookLog[];
  onRefresh: () => void;
}

export const WebhookLogsTab: React.FC<WebhookLogsTabProps> = ({ logs, onRefresh }) => {
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const handleRetry = async (logId: string) => {
    try {
      setRetryingId(logId);
      const res = await fetch(`/api/merchant/webhook-logs/${logId}/retry`, {
        method: 'POST',
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            سجل إرسال الويب هوك (Webhook Delivery Logs)
          </h2>
          <p className="text-xs text-slate-400">
            سجل جميع محاولات إشعار متجر التاجر بتأكيد الدفعات مع التوقيع الرقمي وإعادة الإرسال التلقائية
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="self-start sm:self-auto px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl border border-slate-800 flex items-center gap-1.5 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          تحديث السجل
        </button>
      </div>

      <div className="space-y-3">
        {logs.map((log) => (
          <div
            key={log.id}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-3 transition hover:border-slate-700/80 shadow-lg"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-slate-800 text-emerald-400 border border-slate-700">
                  {log.event}
                </span>
                <span className="font-mono text-xs text-slate-300 truncate max-w-xs" dir="ltr">
                  {log.url}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(log.createdAt).toLocaleString('ar-EG')}</span>
                </div>

                {log.success ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    ناجحة (HTTP {log.statusCode || 200})
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    فشلت (محاولة {log.attempt}/{log.maxAttempts})
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="font-mono text-slate-400">
                <span>توقيع الإشعار: </span>
                <span className="text-slate-300">{log.signature.slice(0, 24)}...</span>
              </div>

              {!log.success && (
                <div className="flex items-center gap-3">
                  {log.nextRetryAt && (
                    <span className="text-amber-400 text-[11px]">
                      إعادة المحاولة القادمة:{' '}
                      {new Date(log.nextRetryAt).toLocaleTimeString('ar-EG')}
                    </span>
                  )}
                  <button
                    onClick={() => handleRetry(log.id)}
                    disabled={retryingId === log.id}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3 h-3 ${retryingId === log.id ? 'animate-spin' : ''}`} />
                    إعادة الإرسال الآن
                  </button>
                </div>
              )}
            </div>

            {log.error && (
              <div className="p-2.5 bg-red-950/40 rounded-xl border border-red-500/20 text-xs text-red-300 font-mono">
                {log.error}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
