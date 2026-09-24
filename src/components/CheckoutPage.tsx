import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Clock,
  Copy,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  PhoneCall,
  ArrowRight,
  ExternalLink,
  Receipt,
  QrCode,
  Check,
  Upload,
  Image as ImageIcon,
  Send,
  Smartphone,
  CheckCheck,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { listenToPaymentStatus } from '../lib/firebaseClient.ts';

interface CheckoutPageProps {
  paymentId: string;
  onBackToDashboard?: () => void;
}

interface PaymentDetails {
  id: string;
  orderRef: string;
  baseAmount: number;
  payableAmount: number;
  piasters: number;
  currency: string;
  status: 'pending' | 'completed' | 'expired' | 'cancelled' | 'review';
  statusToken?: string;
  expiresAt: string;
  confirmedAt?: string | null;
  merchantName: string;
  wallet: {
    provider: string;
    identifier: string;
    label: string;
  };
  verifiedTransactionId?: string | null;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ paymentId, onBackToDashboard }) => {
  const [payment, setPayment] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(1800); // 30 mins in seconds
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedUssd, setCopiedUssd] = useState(false);
  const [showQr, setShowQr] = useState(false);

  // Manual & Proof verification state
  const [senderPhone, setSenderPhone] = useState('');
  const [senderName, setSenderName] = useState('');
  const [manualTxnId, setManualTxnId] = useState('');
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  // 1. Fetch Payment Data and setup live polling every 3 seconds
  const fetchPayment = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch(`/api/v1/payments/${paymentId}`);
      if (!res.ok) {
        throw new Error('الدفعة المطلوبة غير موجودة أو انتهت صلاحيتها');
      }
      const data = await res.json();
      if (data.success && data.data) {
        setPayment(data.data);

        // Calculate remaining seconds
        const expiresAt = new Date(data.data.expiresAt).getTime();
        const now = Date.now();
        const diffSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000));
        setTimeLeft(diffSeconds);
      }
    } catch (err: unknown) {
      if (!silent) {
        setError(err instanceof Error ? err.message : 'فشل تحميل بيانات الدفعة');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayment();
    // Live polling every 3.5 seconds as network backup
    const pollInterval = setInterval(() => {
      if (payment?.status === 'pending') {
        fetchPayment(true);
      }
    }, 3500);

    return () => clearInterval(pollInterval);
  }, [paymentId, payment?.status]);

  // Real-time Firestore onSnapshot listener: listens ONLY to the minimal public status document with unguessable token
  useEffect(() => {
    if (!payment?.statusToken || payment.status !== 'pending') return;

    const unsubscribe = listenToPaymentStatus(payment.statusToken, (newStatus, confirmedAt) => {
      if (newStatus === 'completed') {
        setPayment((prev) => (prev ? { ...prev, status: 'completed', confirmedAt: confirmedAt || new Date().toISOString() } : prev));
        // Silently fetch full payment for verified transaction ID and audit details
        fetchPayment(true);
      } else if (newStatus === 'expired') {
        setPayment((prev) => (prev ? { ...prev, status: 'expired' } : prev));
      }
    });

    return () => unsubscribe();
  }, [payment?.statusToken, payment?.status]);

  // 2. Countdown timer ticker
  useEffect(() => {
    if (timeLeft <= 0 || payment?.status !== 'pending') return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          fetchPayment(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, payment?.status]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopy = (text: string, type: 'amount' | 'phone' | 'ussd') => {
    navigator.clipboard.writeText(text);
    if (type === 'amount') {
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
    } else if (type === 'phone') {
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    } else if (type === 'ussd') {
      setCopiedUssd(true);
      setTimeout(() => setCopiedUssd(false), 2000);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setVerifyMessage({ type: 'error', text: 'حجم الصورة يجب ألا يتجاوز 5 ميجابايت' });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleManualVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTxnId.trim() && !senderPhone.trim() && !screenshotPreview) {
      setVerifyMessage({ type: 'error', text: 'يرجى إدخال رقم العملية أو رقم هاتفك المحول منه أو إرفاق صورة التحويل' });
      return;
    }

    try {
      setVerifying(true);
      setVerifyMessage(null);

      const res = await fetch(`/api/v1/payments/${paymentId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: manualTxnId.trim() || undefined,
          senderPhone: senderPhone.trim() || undefined,
          senderName: senderName.trim() || undefined,
          receiptScreenshot: screenshotPreview || undefined,
          amountPaid: payment?.payableAmount,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.status === 'completed') {
          setVerifyMessage({ type: 'success', text: data.message });
          fetchPayment(true);
        } else {
          setVerifyMessage({
            type: 'info',
            text: 'تم استلام بيانات التحويل وإشعار الدفع بنجاح! جاري المطابقة والتأكيد التلقائي عبر المنصة أو المشرف.',
          });
        }
      } else {
        setVerifyMessage({ type: 'error', text: data.error || 'تعذر التحقق من العملية' });
      }
    } catch {
      setVerifyMessage({ type: 'error', text: 'خطأ في الاتصال بالخادم، يرجى المحاولة ثانية' });
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <p className="text-slate-300 font-medium">جاري تجهيز بوابة الدفع الآمنة...</p>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-2xl p-6 text-center shadow-2xl">
          <AlertTriangle className="w-14 h-14 text-red-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-white mb-2">تعذر العثور على الدفعة</h2>
          <p className="text-slate-400 text-sm mb-6">{error || 'الرابط غير صالح أو انتهت صلاحيته'}</p>
          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl transition"
            >
              العودة للوحة التحكم
            </button>
          )}
        </div>
      </div>
    );
  }

  const isVodafone = payment.wallet.provider.includes('vodafone');
  const ussdCode = `*9*7*${payment.wallet.identifier}*${payment.payableAmount}#`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between py-6 px-4 selection:bg-emerald-500">
      {/* Top Header */}
      <header className="max-w-xl mx-auto w-full flex items-center justify-between pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              EHABGM Pay
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                دفع آمن ومباشر
              </span>
            </h1>
            <p className="text-xs text-slate-400">{payment.merchantName}</p>
          </div>
        </div>

        {onBackToDashboard && (
          <button
            onClick={onBackToDashboard}
            className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1.5 transition bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            لوحة التاجر
          </button>
        )}
      </header>

      {/* Main Payment Container */}
      <main className="max-w-xl mx-auto w-full my-6 flex-1 flex flex-col justify-center">
        {/* State A: COMPLETED SUCCESS */}
        {payment.status === 'completed' && (
          <div className="bg-slate-900/90 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-center backdrop-blur-xl relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto mb-5 text-emerald-400 shadow-xl shadow-emerald-500/20 animate-bounce">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-500/30">
              عملية ناجحة ومؤكدة
            </span>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-3 mb-2">
              تم استلام الدفعة بنجاح!
            </h2>
            <p className="text-sm text-slate-300 max-w-sm mx-auto mb-6">
              تم تأكيد عملية التحويل ومطابقة إشعار الرسالة بنجاح. تم إرسال إشعار فوري لمتجر{' '}
              <span className="text-white font-semibold">{payment.merchantName}</span>.
            </p>

            {/* Receipt Card */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-sm text-right space-y-3 mb-6">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
                <span className="text-slate-400">رقم الطلب</span>
                <span className="font-mono font-bold text-white">{payment.orderRef}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
                <span className="text-slate-400">المبلغ المسدد</span>
                <span className="font-extrabold text-emerald-400 text-lg">
                  {payment.payableAmount.toFixed(2)} ج.م
                </span>
              </div>
              {payment.verifiedTransactionId && (
                <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
                  <span className="text-slate-400">رقم العملية (المرجع)</span>
                  <span className="font-mono font-bold text-slate-200">{payment.verifiedTransactionId}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-400">تاريخ التأكيد</span>
                <span className="text-slate-300 text-xs">
                  {payment.confirmedAt ? new Date(payment.confirmedAt).toLocaleString('ar-EG') : 'الآن'}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-sm flex items-center justify-center gap-2 transition"
              >
                <Receipt className="w-4 h-4" />
                طباعة الإيصال
              </button>
              {onBackToDashboard && (
                <button
                  onClick={onBackToDashboard}
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-600/30"
                >
                  العودة للرئيسية
                </button>
              )}
            </div>
          </div>
        )}

        {/* State B: EXPIRED */}
        {payment.status === 'expired' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 text-amber-400">
              <Clock className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">انتهت صلاحية جلسة الدفع</h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
              تم إلغاء هذه العملية نظراً لمرور مهلة الـ 30 دقيقة المخصصة لتحرير المبلغ والقروش المحجوزة. يُرجى إنشاء طلب دفع جديد.
            </p>
            {onBackToDashboard && (
              <button
                onClick={onBackToDashboard}
                className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl transition"
              >
                العودة لإنشاء طلب جديد
              </button>
            )}
          </div>
        )}

        {/* State C: PENDING CHECKOUT INSTRUCTIONS */}
        {payment.status === 'pending' && (
          <div className="space-y-4">
            {/* Countdown & Live Polling Bar */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-xs sm:text-sm font-medium text-slate-200">
                  بانتظار إشعار التحويل التلقائي...
                </span>
              </div>
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-amber-400 font-mono text-sm font-bold">
                <Clock className="w-4 h-4" />
                <span>{formatTimer(timeLeft)}</span>
              </div>
            </div>

            {/* Critical Piaster Alert */}
            <div className="bg-gradient-to-r from-amber-500/15 via-emerald-500/15 to-transparent border-r-4 border-emerald-500 bg-slate-900/80 p-4 rounded-xl text-right">
              <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 mb-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                تنبيه هام جداً للتأكيد الفوري:
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                يرجى تحويل <strong>المبلغ المحدد شاملاً القروش بدقة</strong> ({payment.payableAmount.toFixed(2)} ج.م). هذه القروش مخصصة لطلبك فقط لضمان مطابقة وتأكيد العملية آلياً في ثوانٍ فور وصول الرسالة.
              </p>
            </div>

            {/* Main Transfer Box */}
            <div className="bg-slate-900 border border-slate-800/90 rounded-3xl p-6 shadow-2xl relative">
              {/* Payable Amount Highlight */}
              <div className="text-center pb-6 border-b border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">المبلغ المطلوب تحويله بالظبط</span>
                <div className="flex items-center justify-center gap-3">
                  <div className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                    {Math.floor(payment.payableAmount)}
                    <span className="text-emerald-400 font-mono">
                      .{(payment.payableAmount % 1).toFixed(2).split('.')[1]}
                    </span>
                    <span className="text-lg text-slate-400 font-normal mr-2">ج.م</span>
                  </div>

                  <button
                    onClick={() => handleCopy(payment.payableAmount.toFixed(2), 'amount')}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                    title="نسخ المبلغ"
                  >
                    {copiedAmount ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                {copiedAmount && <span className="text-[11px] text-emerald-400 block mt-1">تم نسخ المبلغ بدقة!</span>}
              </div>

              {/* Wallet Info Box */}
              <div className="pt-6 space-y-4">
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 border border-red-500/30">
                        {payment.wallet.label || 'فودافون كاش'}
                      </span>
                      <span className="text-xs text-slate-400">رقم المحفظة المستلمة</span>
                    </div>
                    <div className="text-xl sm:text-2xl font-mono font-bold text-white tracking-wider" dir="ltr">
                      {payment.wallet.identifier}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowQr(!showQr)}
                      className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 transition border border-slate-800"
                      title="عرض رمز QR"
                    >
                      <QrCode className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleCopy(payment.wallet.identifier, 'phone')}
                      className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-emerald-600/20"
                    >
                      {copiedPhone ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>نسخ الرقم</span>
                    </button>
                  </div>
                </div>

                {/* QR Code expansion */}
                {showQr && (
                  <div className="p-4 bg-white rounded-2xl flex flex-col items-center justify-center text-slate-950 animate-fadeIn">
                    <QRCodeSVG value={payment.wallet.identifier} size={160} />
                    <span className="text-xs font-bold mt-2 font-mono">{payment.wallet.identifier}</span>
                    <span className="text-[11px] text-slate-600">امسح الرقم من تطبيق محفظتك</span>
                  </div>
                )}

                {/* Quick USSD dialing button for Vodafone Cash */}
                {isVodafone && (
                  <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-300">
                      <PhoneCall className="w-4 h-4 text-emerald-400" />
                      <span>كود التحويل المباشر السريع:</span>
                      <span className="font-mono text-emerald-400 font-bold" dir="ltr">
                        {ussdCode}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopy(ussdCode, 'ussd')}
                      className="text-xs text-slate-400 hover:text-white bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 transition"
                    >
                      {copiedUssd ? 'تم النسخ' : 'نسخ الكود'}
                    </button>
                  </div>
                )}

                {/* Steps Instructions */}
                <div className="bg-slate-950/50 rounded-2xl p-4 border border-slate-800/50 text-xs text-slate-300 space-y-2">
                  <div className="font-semibold text-white mb-1">خطوات الدفع:</div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-emerald-400 shrink-0">
                      1
                    </span>
                    <span>افتح تطبيق «أنا فودافون» أو اطلب كود التحويل أعلاه.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-emerald-400 shrink-0">
                      2
                    </span>
                    <span>
                      حوّل المبلغ المحدد بالظبط: <strong className="text-emerald-400">{payment.payableAmount.toFixed(2)} ج.م</strong> إلى الرقم الموضح.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-emerald-400 shrink-0">
                      3
                    </span>
                    <span>سيتم تأكيد الصفحة تلقائياً فور إرسال فودافون لرسالة الاستلام (خلال 3 - 10 ثوانٍ).</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Alternative Manual Verification & Customer Proof Form */}
            <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 shadow-xl">
              <details className="group" open>
                <summary className="cursor-pointer text-xs font-bold text-slate-200 hover:text-emerald-400 flex items-center justify-between list-none">
                  <span className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <span>تأكيد التحويل يدوياً / إرفاق إثبات الدفع وسكرين شوت</span>
                  </span>
                  <span className="text-slate-500 group-open:rotate-180 transition-transform">▼</span>
                </summary>

                <form onSubmit={handleManualVerify} className="mt-4 pt-3 border-t border-slate-800/80 space-y-3.5">
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    إذا قمت بالتحويل ولم تتغير الصفحة فوراً، يمكنك إدخال رقم هاتفك المحول منه أو رقم العملية في الرسالة، أو إرفاق صورة التحويل للتأكيد المباشر:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        رقم الهاتف المحول منه أو عنوان إنستاباي
                      </label>
                      <input
                        type="text"
                        value={senderPhone}
                        onChange={(e) => setSenderPhone(e.target.value)}
                        placeholder="مثال: 01012345678 أو username@instapay"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        رقم العملية المرجعي (Transaction ID من الـ SMS)
                      </label>
                      <input
                        type="text"
                        value={manualTxnId}
                        onChange={(e) => setManualTxnId(e.target.value)}
                        placeholder="مثال: 987654321"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      اسم المحول الثلاثي (اختياري لتوثيق الفاتورة)
                    </label>
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="مثال: أحمد محمد علي"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Screenshot Upload with Preview */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      إرفاق لقطة شاشة للتحويل أو إيصال الدفع (اختياري وسريع)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="py-2 px-3 bg-slate-950 hover:bg-slate-800 border border-dashed border-slate-700 hover:border-emerald-500 rounded-xl text-xs text-slate-300 flex items-center gap-2 transition"
                      >
                        <Upload className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{screenshotPreview ? 'تغيير الصورة المرفقة' : 'اختر صورة الإيصال'}</span>
                      </button>
                      {screenshotPreview && (
                        <div className="flex items-center gap-2 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-emerald-500/40">
                          <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-[11px] text-emerald-300">تم إرفاق الإيصال بنجاح</span>
                          <button
                            type="button"
                            onClick={() => setScreenshotPreview(null)}
                            className="text-[10px] text-red-400 hover:text-red-300 ml-1 font-bold"
                          >
                            × إلغاء
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={verifying || (!manualTxnId.trim() && !senderPhone.trim() && !screenshotPreview)}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                  >
                    {verifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
                    <span>إرسال إثبات التحويل وتأكيد الدفعة</span>
                  </button>

                  {verifyMessage && (
                    <div
                      className={`text-xs p-3 rounded-xl border ${
                        verifyMessage.type === 'success'
                          ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                          : verifyMessage.type === 'info'
                          ? 'bg-blue-950/80 border-blue-500/40 text-blue-300'
                          : 'bg-red-950/80 border-red-500/40 text-red-300'
                      }`}
                    >
                      {verifyMessage.text}
                    </div>
                  )}
                </form>
              </details>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-xl mx-auto w-full pt-4 border-t border-slate-800/80 text-center text-xs text-slate-500 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          تشفير وتأكيد عبر EHABGM Pay Gateway
        </span>
        <span className="font-mono text-[11px] text-slate-600">طلب: #{payment.orderRef}</span>
      </footer>
    </div>
  );
};
