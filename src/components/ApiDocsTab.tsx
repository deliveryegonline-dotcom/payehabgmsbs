import React, { useState } from 'react';
import { BookOpen, Copy, Check, Terminal, Code2 } from 'lucide-react';

export const ApiDocsTab: React.FC = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopy = (sec: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sec);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const curlCreatePayment = `curl -X POST https://pay.ehabgm.sbs/api/v1/payments \\
  -H "Authorization: Bearer sk_live_YOUR_SECRET_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 150.00,
    "orderRef": "ORD-99120",
    "customerPhone": "01012345678",
    "webhookUrl": "https://mystore.com/api/webhooks/ehabgm"
  }'`;

  const nodeCreatePayment = `import axios from 'axios';

const res = await axios.post('https://pay.ehabgm.sbs/api/v1/payments', {
  amount: 150.00,
  orderRef: 'ORD-99120',
  customerPhone: '01012345678',
  webhookUrl: 'https://mystore.com/api/webhooks/ehabgm'
}, {
  headers: {
    'Authorization': 'Bearer ' + process.env.EHABGM_SECRET_KEY,
    'Content-Type': 'application/json'
  }
});

// توجيه العميل إلى صفحة الدفع المستضافة
const checkoutUrl = res.data.data.checkoutUrl;
console.log('المبلغ بالقروش:', res.data.data.payableAmount); // 150.07 ج.م`;

  const smsForwardingContract = `POST https://pay.ehabgm.sbs/api/device/sms
Headers:
  Content-Type: application/json
  X-Device-Id: dev-c71a3984-28b9-4d6b-95a2-3f19e4823101
  X-Timestamp: 1727188200
  X-Signature: hex(HMAC_SHA256(deviceSecret, timestamp + "." + rawBody))

Body:
{
  "sender": "VF-Cash",
  "rawText": "تم استلام مبلغ 150.07 جنيه من 01012345678 في 2026-09-24 14:30:00 رقم العملية 1234567890",
  "amount": 150.07,
  "counterpartyPhone": "01012345678",
  "transactionId": "1234567890",
  "receivedAt": "2026-09-24T14:30:00Z"
}`;

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-emerald-400" />
          دليل الربط والتكامل البرمجي (API Documentation)
        </h2>
        <p className="text-xs text-slate-400">
          توثيق كامل لكافة نقاط النهاية (Endpoints) لربط المتاجر الإلكترونية وتطبيقات الأندرويد
        </p>
      </div>

      {/* Section 1: Create Payment */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
              POST
            </span>
            <span className="font-mono text-xs font-bold text-white">/api/v1/payments</span>
          </div>
          <span className="text-xs text-slate-400">إنشاء عملية دفع جديدة</span>
        </div>

        <p className="text-xs text-slate-300">
          يقوم الخادم بتخصيص قروش عشوائية فريدة للعملية وإرجاع رابط صفحة الدفع المستضافة.
        </p>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>مثال cURL:</span>
            <button
              onClick={() => handleCopy('curl', curlCreatePayment)}
              className="flex items-center gap-1 text-slate-400 hover:text-white"
            >
              {copiedSection === 'curl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>نسخ</span>
            </button>
          </div>
          <pre className="p-4 bg-slate-950 rounded-2xl font-mono text-xs text-slate-300 overflow-x-auto" dir="ltr">
            {curlCreatePayment}
          </pre>
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>مثال Node.js:</span>
            <button
              onClick={() => handleCopy('node', nodeCreatePayment)}
              className="flex items-center gap-1 text-slate-400 hover:text-white"
            >
              {copiedSection === 'node' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>نسخ</span>
            </button>
          </div>
          <pre className="p-4 bg-slate-950 rounded-2xl font-mono text-xs text-emerald-400 overflow-x-auto" dir="ltr">
            {nodeCreatePayment}
          </pre>
        </div>
      </div>

      {/* Section 2: Device Pairing & SMS Contract */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-xs font-mono font-bold">
              POST
            </span>
            <span className="font-mono text-xs font-bold text-white">/api/device/sms</span>
          </div>
          <span className="text-xs text-slate-400">عقد استلام وتأكيد الـ SMS</span>
        </div>

        <p className="text-xs text-slate-300">
          العقد الصارم الذي يرسله هاتف الأندرويد المقترن. يجب حساب توقيع الـ HMAC ورفض الرسائل الأقدم من 5 دقائق.
        </p>

        <pre className="p-4 bg-slate-950 rounded-2xl font-mono text-xs text-slate-300 overflow-x-auto" dir="ltr">
          {smsForwardingContract}
        </pre>
      </div>
    </div>
  );
};
