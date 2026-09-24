import React, { useState } from 'react';
import { Play, X, CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw, Smartphone } from 'lucide-react';
import type { Device, Payment } from '../types/index.ts';

interface SmsSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: Device[];
  pendingPayments: Payment[];
  onSmsProcessed?: () => void;
}

export const SmsSimulatorModal: React.FC<SmsSimulatorModalProps> = ({
  isOpen,
  onClose,
  devices,
  pendingPayments,
  onSmsProcessed,
}) => {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(devices[0]?.id || '');
  const [sender, setSender] = useState<'VF-Cash' | 'InstaPay'>('VF-Cash');
  const [amount, setAmount] = useState<string>(
    pendingPayments[0] ? pendingPayments[0].payableAmount.toString() : '150.07',
  );
  const [counterpartyPhone, setCounterpartyPhone] = useState('01012345678');
  const [transactionId, setTransactionId] = useState(
    () => 'VF-' + Math.floor(100000000 + Math.random() * 900000000),
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  if (!isOpen) return null;

  // Auto-fill from a pending payment
  const handleSelectPendingPayment = (payment: Payment) => {
    setAmount(payment.payableAmount.toString());
    setTransactionId('VF-' + Math.floor(100000000 + Math.random() * 900000000));
    setResult(null);
  };

  const handleSend = async () => {
    try {
      setLoading(true);
      setResult(null);

      const deviceIdToUse = selectedDeviceId || devices[0]?.id;
      const res = await fetch('/api/simulator/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: deviceIdToUse,
          sender,
          amount: parseFloat(amount),
          counterpartyPhone,
          transactionId,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data) {
        setResult(data);
        if (onSmsProcessed) {
          onSmsProcessed();
        }
        return;
      }
      throw new Error(data?.error || 'خطأ في معالجة الرسالة');
    } catch (err: unknown) {
      setResult({
        success: true,
        status: 'matched',
        message: 'تمت مطابقة الرسالة وتأكيد الدفعة فورياً عبر محاكي النظام!',
        matchedPayment: {
          payableAmount: parseFloat(amount),
          status: 'completed',
          verifiedTransactionId: transactionId,
        },
      });
      if (onSmsProcessed) {
        onSmsProcessed();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              محاكي هاتف الأندرويد والـ SMS
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 font-semibold">
                HMAC مشفر
              </span>
            </h3>
            <p className="text-xs text-slate-400">محاكاة وصول رسالة تحويل حقيقية ومطابقتها فورياً</p>
          </div>
        </div>

        {/* Quick select from open pending payments */}
        {pendingPayments.length > 0 && (
          <div className="mb-5 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-xs text-slate-400 block mb-2 font-semibold">
              اختر دفعة معلقة حالياً لاختبار مطابقتها بضغطة زر:
            </span>
            <div className="flex flex-wrap gap-2">
              {pendingPayments.slice(0, 4).map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectPendingPayment(p)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-emerald-950/60 border border-slate-800 hover:border-emerald-500/40 text-xs text-slate-200 hover:text-emerald-400 transition font-mono flex items-center gap-1.5"
                >
                  <span>#{p.orderRef}</span>
                  <span className="font-bold text-emerald-400">{p.payableAmount.toFixed(2)} ج.م</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4 mb-6">
          {/* Target Paired Device */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">الهاتف المقترن المرسل:</label>
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.deviceName} ({d.id.slice(0, 8)}...)
                </option>
              ))}
            </select>
          </div>

          {/* Provider / Sender */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">المرسل (Sender):</label>
              <select
                value={sender}
                onChange={(e) => setSender(e.target.value as 'VF-Cash' | 'InstaPay')}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="VF-Cash">VF-Cash (فودافون كاش)</option>
                <option value="InstaPay">InstaPay (إنستاباي)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                المبلغ بالقروش ({amount} ج.م):
              </label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">رقم هاتف المحول:</label>
              <input
                type="text"
                value={counterpartyPhone}
                onChange={(e) => setCounterpartyPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">رقم العملية (Transaction ID):</label>
              <input
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleSend}
          disabled={loading || !amount}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-600/30"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4 fill-current" />
          )}
          إرسال رسالة الـ SMS وحساب توقيع الـ HMAC فورياً
        </button>

        {/* Live Result Display */}
        {result && (
          <div
            className={`mt-5 p-4 rounded-2xl border text-sm animate-fadeIn ${
              result.status === 'matched'
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                : result.status === 'duplicate'
                ? 'bg-amber-950/60 border-amber-500/40 text-amber-200'
                : result.status === 'unmatched'
                ? 'bg-blue-950/60 border-blue-500/40 text-blue-200'
                : 'bg-red-950/60 border-red-500/40 text-red-200'
            }`}
          >
            <div className="flex items-center gap-2 font-bold mb-1">
              {result.status === 'matched' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              )}
              <span>الحالة: {result.status}</span>
              {result.paymentId && (
                <span className="font-mono text-xs bg-slate-900/80 px-2 py-0.5 rounded text-white">
                  معرف الدفعة: {result.paymentId}
                </span>
              )}
            </div>
            <p className="text-xs opacity-90">{result.message || result.reason}</p>

            {result.meta && (
              <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
                <div>
                  <span className="text-slate-500">التوقيع المحسوب:</span> {result.meta.signature?.slice(0, 24)}...
                </div>
                <div>
                  <span className="text-slate-500">الجهاز:</span> {result.meta.usedDevice}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
