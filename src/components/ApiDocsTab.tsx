import React, { useState } from 'react';
import { BookOpen, Copy, Check, Terminal, Code2, Globe, FileCode, Smartphone, Zap, Key } from 'lucide-react';
import type { ApiKey, Wallet } from '../types/index.ts';

interface ApiDocsTabProps {
  apiKeys?: ApiKey[];
  merchant?: { id: string; name: string; email: string };
  wallets?: Wallet[];
}

export const ApiDocsTab: React.FC<ApiDocsTabProps> = ({ apiKeys = [], merchant, wallets = [] }) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const activeApiKey = apiKeys[0]?.publicKey || 'pk_live_ehabgm_demo_7721';
  const defaultWallet = wallets.find((w) => w.isDefault && w.isActive) || wallets[0];
  const walletNumber = defaultWallet?.identifier || '01012345678';

  const handleCopy = (sec: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sec);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const htmlWidgetSnippet = `<!-- زر ودجت EHABGM Pay لاستقبال المدفوعات في أي صفحة HTML أو متجر -->
<button id="ehabgm-checkout-btn" style="background:#10b981;color:#fff;padding:12px 24px;border:none;border-radius:12px;font-weight:bold;cursor:pointer;display:inline-flex;align-items:center;gap:8px;font-size:14px;box-shadow:0 4px 14px rgba(16,185,129,0.35);">
  <span>💳 الدفع عبر فودافون كاش / إنستاباي</span>
</button>

<script>
  document.getElementById('ehabgm-checkout-btn').addEventListener('click', async function() {
    this.disabled = true;
    this.innerText = 'جاري تخصيص القروش ورقم التحويل...';
    try {
      const res = await fetch('${window.location.origin}/api/merchant/payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${activeApiKey}' // مفتاح API المخصص لمتجرك
        },
        body: JSON.stringify({
          orderRef: 'ORD-' + Math.floor(Math.random() * 90000 + 10000),
          baseAmount: 150.00,
          customerPhone: '01012345678'
        })
      });
      const data = await res.json();
      if (data.success && data.payment) {
        // توجيه العميل فوراً لصفحة الدفع المستضافة لتأكيد التحويل واستلام المبلغ
        window.location.href = '${window.location.origin}' + data.payment.checkoutUrl;
      }
    } catch(err) {
      alert('تعذر الاتصال بالبوابة');
      this.disabled = false;
      this.innerText = '💳 الدفع عبر فودافون كاش / إنستاباي';
    }
  });
</script>`;

  const phpWooSnippet = `<?php
/**
 * إضافة كود استقبال مدفوعات فودافون كاش وإنستاباي لموقع ووكومرس أو PHP
 * متجر: ${merchant?.name || 'متجري'} | محفظة: ${walletNumber}
 */
function ehabgm_create_wallet_payment($order_id, $amount, $customer_phone) {
    $api_key = '${activeApiKey}';
    $gateway_url = '${window.location.origin}/api/merchant/payments/create';

    $payload = array(
        'orderRef' => (string)$order_id,
        'baseAmount' => floatval($amount),
        'customerPhone' => $customer_phone,
        'webhookUrl' => 'https://yourdomain.com/ehabgm-webhook-listener.php'
    );

    $args = array(
        'body' => json_encode($payload),
        'headers' => array(
            'Content-Type' => 'application/json',
            'Authorization' => 'Bearer ' . $api_key
        ),
        'timeout' => 15
    );

    $response = wp_remote_post($gateway_url, $args);
    if (is_wp_error($response)) {
        return false;
    }

    $body = json_decode(wp_remote_retrieve_body($response), true);
    if (isset($body['success']) && $body['success']) {
        // تحويل العميل لرابط الدفع المستضاف
        return '${window.location.origin}' . $body['payment']['checkoutUrl'];
    }
    return false;
}
?>`;

  const nodeCreatePayment = `// 1. إنشاء الدفعة المخصصة بالقروش لمتجر ${merchant?.name || 'الحساب الحالي'}
import axios from 'axios';

const res = await axios.post('${window.location.origin}/api/merchant/payments/create', {
  baseAmount: 150.00,
  orderRef: 'ORD-99120',
  customerPhone: '01012345678',
  webhookUrl: 'https://mystore.com/api/webhooks/ehabgm'
}, {
  headers: {
    'Authorization': 'Bearer ${activeApiKey}',
    'Content-Type': 'application/json'
  }
});

// توجيه العميل إلى صفحة الدفع المستضافة
const checkoutUrl = res.data.payment.checkoutUrl;
console.log('المبلغ النهائي بالقروش:', res.data.payment.payableAmount); // 150.07 ج.م`;

  const webhookVerifySnippet = `// 2. استقبال إشعار الـ Webhook في سيرفرك مع التحقق من توقيع HMAC-SHA256
import crypto from 'crypto';

app.post('/api/webhooks/ehabgm', (req, res) => {
  const signature = req.headers['x-ehabgm-signature'];
  const webhookSecret = process.env.EHABGM_WEBHOOK_SECRET;

  const expectedSig = crypto
    .createHmac('sha256', webhookSecret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (signature !== expectedSig) {
    return res.status(401).send('توقيع غير صالح');
  }

  const { event, payment } = req.body;
  if (event === 'payment.completed') {
    console.log(\`✅ تم تأكيد استلام التحويل للطلب #\${payment.orderRef} بمبلغ \${payment.payableAmount} ج.م!\`);
    // قم بتفعيل الطلب أو شحن الرصيد للعميل فوراً
  }

  res.status(200).json({ received: true });
});`;

  const smsForwardingContract = `POST ${window.location.origin}/api/device/sms
Headers:
  Content-Type: application/json
  X-Device-Id: dev-c71a3984-28b9-4d6b-95a2-3f19e4823101
  X-Timestamp: 1727188200
  X-Signature: hex(HMAC_SHA256(deviceSecret, timestamp + ":" + rawBody))

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
          <span>دليل الربط والتكامل البرمجي وأكواد المواقع</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          أكواد مترابطة وجاهزة للإضافة في أي موقع أو متجر لاستقبال المدفوعات فورياً عبر المحافظ الإلكترونية.
        </p>
      </div>

      {/* Rule Notice: 1 Phone = Max 2 Wallets */}
      <div className="p-4 bg-slate-900 border border-emerald-500/30 rounded-2xl flex items-start gap-3 text-xs">
        <Smartphone className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-white block">
            معيار التكامل الذكي: هاتف أندرويد = رقم محفظة أو رقمين بحد أقصى (SIM 1 + SIM 2)
          </span>
          <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
            كل هاتف متصل بتطبيق قارئ الإشعارات يرتبط بحد أقصى بمحفظتين (مثلاً شريحة 1 فودافون كاش + شريحة 2 إنستاباي)، مما يضمن عزل إشعارات الدفع والتحقق الفوري خلال أقل من ثانية واحدة.
          </p>
        </div>
      </div>

      {/* Snippet 1: Embeddable HTML Widget */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-400" />
            <span className="font-mono text-xs font-bold text-white">ودجت الدفع السريع المباشر (HTML & JS)</span>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            جاهز للنسخ في أي موقع
          </span>
        </div>

        <p className="text-xs text-slate-300">
          انسخ هذا الكود وضعه في موقعك أو صفحة الهبوط لإضافة زر دفع فوري بفودافون كاش وإنستاباي.
        </p>

        <div className="relative">
          <button
            onClick={() => handleCopy('html', htmlWidgetSnippet)}
            className="absolute top-3 left-3 flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            {copiedSection === 'html' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>نسخ الكود</span>
          </button>
          <pre className="p-4 pt-10 bg-slate-950 rounded-2xl font-mono text-xs text-emerald-400 overflow-x-auto leading-relaxed" dir="ltr">
            {htmlWidgetSnippet}
          </pre>
        </div>
      </div>

      {/* Snippet 2: PHP & WooCommerce */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-indigo-400" />
            <span className="font-mono text-xs font-bold text-white">كود ووكومرس ومتاجر PHP</span>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
            WordPress / PHP
          </span>
        </div>

        <p className="text-xs text-slate-300">
          دالة لإنشاء طلب دفع من داخل ملف functions.php في ووكومرس أو أي تطبيق PHP.
        </p>

        <div className="relative">
          <button
            onClick={() => handleCopy('php', phpWooSnippet)}
            className="absolute top-3 left-3 flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            {copiedSection === 'php' ? <Check className="w-3.5 h-3.5 text-indigo-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>نسخ الكود</span>
          </button>
          <pre className="p-4 pt-10 bg-slate-950 rounded-2xl font-mono text-xs text-indigo-300 overflow-x-auto leading-relaxed" dir="ltr">
            {phpWooSnippet}
          </pre>
        </div>
      </div>

      {/* Snippet 3: Node.js & Webhook */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="font-mono text-xs font-bold text-white">Node.js / Express والتحقق من الـ Webhook</span>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
            Server-to-Server
          </span>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <button
              onClick={() => handleCopy('node', nodeCreatePayment)}
              className="absolute top-3 left-3 flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              {copiedSection === 'node' ? <Check className="w-3.5 h-3.5 text-amber-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>نسخ كود إنشاء الدفعة</span>
            </button>
            <pre className="p-4 pt-10 bg-slate-950 rounded-2xl font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed" dir="ltr">
              {nodeCreatePayment}
            </pre>
          </div>

          <div className="relative">
            <button
              onClick={() => handleCopy('webhook', webhookVerifySnippet)}
              className="absolute top-3 left-3 flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              {copiedSection === 'webhook' ? <Check className="w-3.5 h-3.5 text-amber-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>نسخ كود استلام الويب هوك</span>
            </button>
            <pre className="p-4 pt-10 bg-slate-950 rounded-2xl font-mono text-xs text-amber-300 overflow-x-auto leading-relaxed" dir="ltr">
              {webhookVerifySnippet}
            </pre>
          </div>
        </div>
      </div>

      {/* Snippet 4: Android Forwarder Contract */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-cyan-400" />
            <span className="font-mono text-xs font-bold text-white">عقد تمرير رسائل الأندرويد المشفرة (POST /api/device/sms)</span>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            HMAC-SHA256 Signed
          </span>
        </div>

        <p className="text-xs text-slate-300">
          العقد الصارم لتمرير إشعار الرسالة من هاتف الأندرويد. يتم التحقق من التوقيع ومنع التكرار بتوقيع الـ 5 دقائق.
        </p>

        <pre className="p-4 bg-slate-950 rounded-2xl font-mono text-xs text-cyan-300 overflow-x-auto leading-relaxed" dir="ltr">
          {smsForwardingContract}
        </pre>
      </div>
    </div>
  );
};
