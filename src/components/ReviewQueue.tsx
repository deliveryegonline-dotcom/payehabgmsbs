import React, { useState } from 'react';
import { AlertCircle, CheckCircle, XCircle, Search, RefreshCw, Clock, ArrowRight } from 'lucide-react';
import type { SmsLog, Payment } from '../types/index.ts';

interface ReviewQueueProps {
  queue: SmsLog[];
  pendingPayments: Payment[];
  onRefresh: () => void;
}

export const ReviewQueue: React.FC<ReviewQueueProps> = ({ queue, pendingPayments, onRefresh }) => {
  const [selectedSms, setSelectedSms] = useState<SmsLog | null>(null);
  const [targetPaymentId, setTargetPaymentId] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleManualConfirm = async () => {
    if (!selectedSms || !targetPaymentId) return;

    try {
      setActionLoading(true);
      const res = await fetch(`/api/merchant/review-queue/${selectedSms.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: targetPaymentId, notes: manualNote }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage('تم تأكيد الدفعة وربطها بنجاح!');
        setSelectedSms(null);
        setTargetPaymentId('');
        setManualNote('');
        onRefresh();
        setTimeout(() => setStatusMessage(null), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (smsId: string) => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/merchant/review-queue/${smsId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'تم الرفض بواسطة المشرف' }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            طابور المراجعة اليدوية (Review Queue)
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              {queue.length} رسالة بانتظار البت
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            الرسائل التي لم تتطابق آلياً بسبب تكرار المبلغ أو عدم وجود عملية معلقة مطابقة
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="self-start sm:self-auto px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl border border-slate-800 flex items-center gap-1.5 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          تحديث القائمة
        </button>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs rounded-xl font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          {statusMessage}
        </div>
      )}

      {queue.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3 text-emerald-400">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">طابور المراجعة فارغ تماماً</h3>
          <p className="text-xs text-slate-400">جميع رسائل الـ SMS الواردة تمت مطابقتها أو معالجتها بنجاح.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {queue.map((sms) => (
            <div
              key={sms.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 transition shadow-lg space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {sms.sender}
                  </span>
                  <span className="font-mono text-xs text-slate-300">
                    رقم العملية: <strong className="text-white">{sms.transactionId}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(sms.receivedAt).toLocaleString('ar-EG')}</span>
                </div>
              </div>

              {/* Amount and Reason */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-2xl font-black text-white font-mono">
                    {sms.amount.toFixed(2)} <span className="text-xs text-slate-400 font-normal">ج.م</span>
                  </div>
                  {sms.counterpartyPhone && (
                    <div className="text-xs text-slate-400 font-mono mt-0.5">
                      مرسل من: <span className="text-slate-200">{sms.counterpartyPhone}</span>
                    </div>
                  )}
                </div>

                <div className="bg-amber-950/40 border border-amber-500/20 rounded-xl px-3 py-2 text-xs text-amber-300 max-w-md">
                  <span className="font-semibold block text-[11px] text-amber-400">سبب التعليق:</span>
                  {sms.reviewReason || 'لم يتم العثور على عملية معلقة بنفس المبلغ تماماً'}
                </div>
              </div>

              {/* Raw SMS text snippet */}
              <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                {sms.rawText}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => handleReject(sms.id)}
                  disabled={actionLoading}
                  className="px-3 py-2 bg-slate-800 hover:bg-red-950/60 hover:text-red-300 text-slate-400 rounded-xl text-xs font-semibold transition border border-slate-700/50 flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  تجاهل / رفض
                </button>

                <button
                  onClick={() => setSelectedSms(sms)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/20 flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  ربط وتأكيد يدوي مع دفعة
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manual Link Modal */}
      {selectedSms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-2">ربط وتأكيد العملية يدوياً</h3>
            <p className="text-xs text-slate-400 mb-4">
              سيتم تغيير حالة الدفعة المختارة إلى "مكتملة"، وتسجيل رقم العملية، وإرسال إشعار الويب هوك فورياً.
            </p>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 mb-4 text-xs font-mono text-slate-300">
              <div>المبلغ الوارد: <strong className="text-emerald-400">{selectedSms.amount.toFixed(2)} ج.م</strong></div>
              <div>رقم العملية: <strong className="text-white">{selectedSms.transactionId}</strong></div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  اختر الدفعة المعلقة المطلوب ربطها:
                </label>
                <select
                  value={targetPaymentId}
                  onChange={(e) => setTargetPaymentId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- اضغط للاختيار --</option>
                  {pendingPayments.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.orderRef} - المطلوب: {p.payableAmount.toFixed(2)} ج.م ({p.customerPhone || 'بدون هاتف'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  ملاحظات التأكيد اليدوي (اختياري):
                </label>
                <input
                  type="text"
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  placeholder="مثال: تم التأكيد بعد مراجعة العميل هاتفياً"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleManualConfirm}
                disabled={!targetPaymentId || actionLoading}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-600/20"
              >
                {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                تأكيد الدفعة وإرسال الويب هوك
              </button>
              <button
                onClick={() => setSelectedSms(null)}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
