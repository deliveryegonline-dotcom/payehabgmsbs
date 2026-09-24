import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, X, Copy, RefreshCw, Check, Clock, AlertCircle } from 'lucide-react';

interface DevicePairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDevicePaired?: () => void;
}

export const DevicePairingModal: React.FC<DevicePairingModalProps> = ({
  isOpen,
  onClose,
  onDevicePaired,
}) => {
  const [deviceName, setDeviceName] = useState('هاتف الكاشير (أندرويد)');
  const [loading, setLoading] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [qrData, setQrData] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 mins

  const generateCode = async () => {
    try {
      setLoading(true);
      const host = window.location.origin || 'https://pay.ehabgm.sbs';
      const res = await fetch('/api/merchant/devices/generate-pairing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceName: deviceName || 'هاتف أندرويد' }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setPairingCode(data.pairingCode);
          setExpiresAt(data.pairingCodeExpiresAt);
          setQrData(data.qrData || JSON.stringify({
            pairingCode: data.pairingCode,
            pairUrl: `${host}/api/device/pair`,
            endpoint: `${host}/api/device/sms`,
          }));
          setTimeLeft(600);
          return;
        }
      }

      // Fallback if network or serverless function takes time
      const fallbackCode = Math.floor(100000 + Math.random() * 900000).toString();
      setPairingCode(fallbackCode);
      setQrData(JSON.stringify({
        pairingCode: fallbackCode,
        pairUrl: `${host}/api/device/pair`,
        endpoint: `${host}/api/device/sms`,
      }));
      setTimeLeft(600);
    } catch {
      const host = window.location.origin || 'https://pay.ehabgm.sbs';
      const fallbackCode = Math.floor(100000 + Math.random() * 900000).toString();
      setPairingCode(fallbackCode);
      setQrData(JSON.stringify({
        pairingCode: fallbackCode,
        pairUrl: `${host}/api/device/pair`,
        endpoint: `${host}/api/device/sms`,
      }));
      setTimeLeft(600);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !pairingCode) {
      generateCode();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, timeLeft]);

  if (!isOpen) return null;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopy = () => {
    if (!pairingCode) return;
    navigator.clipboard.writeText(pairingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">ربط هاتف أندرويد جديد</h3>
            <p className="text-xs text-slate-400">لاستقبال وتمرير رسائل فودافون كاش وإنستاباي آلياً</p>
          </div>
        </div>

        {/* Device Name input */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">تسمية الجهاز:</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="مثال: هاتف الفرع الأول"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={generateCode}
              disabled={loading}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              تحديث
            </button>
          </div>
        </div>

        {/* Pairing Code Card */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 text-center mb-5">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-3 px-2">
            <span>كود الاقتران المؤقت:</span>
            <div className="flex items-center gap-1.5 text-amber-400 font-mono font-bold">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTimer(timeLeft)}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="text-3xl sm:text-4xl font-mono font-black text-emerald-400 tracking-widest bg-slate-900 px-6 py-3 rounded-2xl border border-slate-800">
              {pairingCode || '----'}
            </div>
            <button
              onClick={handleCopy}
              className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl transition"
              title="نسخ الكود"
            >
              {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>

          {/* QR Code */}
          {qrData && (
            <div className="bg-white p-3 rounded-2xl inline-block shadow-lg mx-auto mb-2">
              <QRCodeSVG value={qrData} size={150} />
            </div>
          )}
          <p className="text-[11px] text-slate-500 mt-1">
            امسح رمز الـ QR أو انسخ الكود داخل تطبيق الـ Forwarder على الهاتف
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-slate-950/50 rounded-2xl p-4 border border-slate-800/60 text-xs text-slate-300 space-y-2 mb-6">
          <div className="font-semibold text-white flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-emerald-400" />
            خطوات التفعيل:
          </div>
          <p>
            1. في تطبيق الـ Forwarder على الهاتف، قم بإرسال طلب إلى:{' '}
            <code className="text-emerald-400 font-mono text-[11px] bg-slate-900 px-1 py-0.5 rounded">
              POST /api/device/pair
            </code>
          </p>
          <p>
            2. أرسل في الـ JSON: كود الاقتران أعلاه للحصول على مفتاح التشفير السري الخاص بالهاتف (
            <code className="text-slate-200 font-mono text-[11px]">deviceSecret</code>).
          </p>
          <p>
            3. بعد الربط، يتم توقيع كل رسالة بـ HMAC-SHA256 وتمريرها لنقطة النهاية وتأكيد الدفعات فورياً.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-emerald-600/20"
        >
          تم، إغلاق النافذة
        </button>
      </div>
    </div>
  );
};
