import React, { useState } from 'react';
import { Key, Plus, Copy, Check, ShieldAlert, ShieldCheck, RefreshCw, Globe } from 'lucide-react';
import type { ApiKey } from '../types/index.ts';

interface ApiKeysTabProps {
  apiKeys: ApiKey[];
  merchant: any;
  onRefresh: () => void;
}

export const ApiKeysTab: React.FC<ApiKeysTabProps> = ({ apiKeys, merchant, onRefresh }) => {
  const [showCreate, setShowCreate] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [newSecretResult, setNewSecretResult] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await fetch('/api/merchant/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: keyName || 'مفتاح إنتاج خادم الويب' }),
      });
      const data = await res.json();
      if (res.ok && data.secretKey) {
        setNewSecretResult(data.secretKey);
        setKeyName('');
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* API Keys Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              مفاتيح الربط البرمجي (API Keys)
              <span className="text-xs font-normal text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                تشفير SHA-256 للسر فقط
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              استخدم هذه المفاتيح في خادم متجرك لإنشاء المدفوعات آلياً عبر `POST /api/v1/payments`
            </p>
          </div>

          <button
            onClick={() => setShowCreate(true)}
            className="self-start sm:self-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition shadow-lg shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" />
            توليد مفتاح سري جديد
          </button>
        </div>

        {/* Keys Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
              <tr>
                <th className="p-3.5">تسمية المفتاح</th>
                <th className="p-3.5">المفتاح العام (Public Key)</th>
                <th className="p-3.5">بادئة المفتاح السري</th>
                <th className="p-3.5">آخر استخدام</th>
                <th className="p-3.5">تاريخ الإنشاء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {apiKeys.map((key) => (
                <tr key={key.id} className="hover:bg-slate-800/40">
                  <td className="p-3.5 font-sans font-bold text-white">{key.name}</td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-300">{key.publicKey}</span>
                      <button
                        onClick={() => handleCopy(key.id, key.publicKey)}
                        className="text-slate-500 hover:text-white"
                      >
                        {copiedKey === key.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="p-3.5 text-slate-400">
                    <span className="text-emerald-400">{key.prefix}</span>••••••••••••
                  </td>
                  <td className="p-3.5 text-slate-400 text-[11px] font-sans">
                    {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString('ar-EG') : 'لم يستخدم بعد'}
                  </td>
                  <td className="p-3.5 text-slate-500 text-[11px] font-sans">
                    {new Date(key.createdAt).toLocaleDateString('ar-EG')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Webhook Configuration Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">إعدادات الويب هوك (Webhooks Endpoint)</h3>
            <p className="text-xs text-slate-400">
              يتم إرسال إشعار فوري لموقعك عند تأكيد أي عملية دفع بنجاح مع محاولات إعادة تلقائية (Exponential Backoff)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-xs text-slate-400 block">رابط الاستقبال المعتمد (Webhook URL):</span>
            <div className="font-mono text-xs text-white truncate" dir="ltr">
              {merchant?.webhookUrl || 'https://mystore.com/api/webhooks/ehabgm'}
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-xs text-slate-400 block">مفتاح توقيع الإشعارات (Webhook Secret):</span>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-emerald-400 truncate" dir="ltr">
                {merchant?.webhookSecret || 'whsec_ehabgm_test_secret_7721'}
              </span>
              <button
                onClick={() =>
                  handleCopy('whsec', merchant?.webhookSecret || 'whsec_ehabgm_test_secret_7721')
                }
                className="text-slate-400 hover:text-white"
              >
                {copiedKey === 'whsec' ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 text-xs text-slate-300 space-y-2">
          <span className="font-bold text-white block">كيفية التحقق من توقيع الويب هوك في خادمك:</span>
          <pre className="p-3 bg-slate-900 rounded-xl font-mono text-[11px] text-emerald-400 overflow-x-auto" dir="ltr">
{`const expectedSig = crypto
  .createHmac('sha256', process.env.WEBHOOK_SECRET)
  .update(req.headers['x-ehabgm-timestamp'] + '.' + JSON.stringify(req.body))
  .digest('hex');

if (req.headers['x-ehabgm-signature'] === expectedSig) {
  // التوقيع سليم 100%، يمكنك شحن رصيد العميل أو تفعيل الطلب!
}`}
          </pre>
        </div>
      </div>

      {/* Modal: New Key Secret Reveal */}
      {newSecretResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-emerald-500/50 w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl relative">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold text-white mb-2">احفظ المفتاح السري الآن!</h3>
            <p className="text-xs text-amber-300 leading-relaxed mb-4">
              لن تتمكن من رؤية هذا المفتاح السري مرة أخرى بعد إغلاق هذه النافذة. نحن نحفظ في قاعدة البيانات هاش التشفير فقط (SHA-256) لأقصى درجات الأمان.
            </p>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between mb-6">
              <span className="font-mono text-xs text-emerald-400 select-all break-all" dir="ltr">
                {newSecretResult}
              </span>
              <button
                onClick={() => handleCopy('newSec', newSecretResult)}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition shrink-0 mr-2"
                title="نسخ المفتاح"
              >
                {copiedKey === 'newSec' ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>

            <button
              onClick={() => setNewSecretResult(null)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition"
            >
              نسخت المفتاح واحتفظت به بأمان، إغلاق
            </button>
          </div>
        </div>
      )}

      {/* Modal: Create Key Dialog */}
      {showCreate && !newSecretResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-2">توليد مفتاح API جديد</h3>
            <p className="text-xs text-slate-400 mb-5">أدخل وصفاً للمفتاح للتعرف عليه في قائمة المفاتيح</p>

            <form onSubmit={handleCreateKey} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">تسمية المفتاح:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: متجر ووكومرس - الإنتاج"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition"
                >
                  {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  إنشاء المفتاح الآن
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
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
