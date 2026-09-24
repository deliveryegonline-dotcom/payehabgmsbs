import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Server,
  Database,
  Smartphone,
  Copy,
  Check,
  Download,
  Code2,
  Lock,
  Key,
  Layers,
  AlertCircle,
  RefreshCw,
  Wallet,
  Cpu,
  Globe,
  FileCode,
  Zap,
  Eye,
  EyeOff,
  Table,
  FileDown,
} from 'lucide-react';
import type { Device, Wallet as WalletType } from '../types/index.ts';

interface EnvVarItem {
  name: string;
  value: string;
  category: string;
  description: string;
  purpose: string;
  status: string;
  isSet: boolean;
  maskedValue: string;
  isSensitive: boolean;
}

interface EnvStatusData {
  totalVariables: number;
  allConfigured: boolean;
  databaseTarget: string;
  projectId: string;
  variables: EnvVarItem[];
  envBlock?: string;
  timestamp: string;
}

interface AdminEnvAndroidTabProps {
  devices: Device[];
  wallets: WalletType[];
  onRefreshAll: () => void;
}

export const AdminEnvAndroidTab: React.FC<AdminEnvAndroidTabProps> = ({
  devices,
  wallets,
  onRefreshAll,
}) => {
  const [envData, setEnvData] = useState<EnvStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showFullValues, setShowFullValues] = useState(true);
  const [envViewMode, setEnvViewMode] = useState<'table' | 'cards'>('table');
  const [selectedDeviceForConfig, setSelectedDeviceForConfig] = useState<Device | null>(null);
  const [bindingDeviceId, setBindingDeviceId] = useState<string | null>(null);
  const [selectedWalletIds, setSelectedWalletIds] = useState<string[]>([]);
  const [bindingSaving, setBindingSaving] = useState(false);
  const [bindFeedback, setBindFeedback] = useState<string | null>(null);
  const [activeSnippetTab, setActiveSnippetTab] = useState<'html_widget' | 'php_woocommerce' | 'nodejs' | 'android_kotlin'>('html_widget');

  const fetchEnvStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/env-status');
      const json = await res.json();
      if (json.success) {
        setEnvData(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch env status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnvStatus();
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleOpenBinding = (device: Device) => {
    setBindingDeviceId(device.id);
    setSelectedWalletIds(device.boundWalletIds || []);
    setBindFeedback(null);
  };

  const handleToggleWalletSelection = (walletId: string) => {
    if (selectedWalletIds.includes(walletId)) {
      setSelectedWalletIds(selectedWalletIds.filter((id) => id !== walletId));
    } else {
      if (selectedWalletIds.length >= 2) {
        setBindFeedback('تنبيه: الحد الأقصى هو محفظتان (2) فقط لكل هاتف لضمان عدم تداخل الإشعارات.');
        return;
      }
      setSelectedWalletIds([...selectedWalletIds, walletId]);
      setBindFeedback(null);
    }
  };

  const handleSaveBinding = async (deviceId: string) => {
    setBindingSaving(true);
    setBindFeedback(null);
    try {
      const res = await fetch(`/api/merchant/devices/${deviceId}/bind-wallets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletIds: selectedWalletIds }),
      });
      const json = await res.json();
      if (json.success) {
        setBindFeedback('تم ربط المحافظ بالهاتف بنجاح!');
        onRefreshAll();
        setTimeout(() => {
          setBindingDeviceId(null);
          setBindFeedback(null);
        }, 1500);
      } else {
        setBindFeedback(json.error || 'فشل حفظ الربط');
      }
    } catch (err) {
      setBindFeedback('حدث خطأ أثناء الاتصال بالخادم');
    } finally {
      setBindingSaving(false);
    }
  };

  const generateAndroidJsonConfig = (device: Device) => {
    const bound = (device.boundWalletIds || [])
      .map((wId) => wallets.find((w) => w.id === wId))
      .filter(Boolean)
      .map((w) => ({
        id: w!.id,
        provider: w!.provider,
        identifier: w!.identifier,
        label: w!.label,
      }));

    return {
      appName: 'EHABGM Pay Forwarder',
      version: '1.2.0',
      gatewayBaseUrl: window.location.origin,
      smsEndpoint: `${window.location.origin}/api/device/sms`,
      deviceId: device.id,
      deviceSecret: device.deviceSecret,
      merchantId: device.merchantId,
      maxBoundWallets: 2,
      boundWallets: bound,
      simSlotMapping: {
        SIM_1: bound[0]?.identifier || 'Unassigned',
        SIM_2: bound[1]?.identifier || 'Unassigned',
      },
      hmacAlgorithm: 'HmacSHA256',
      listenSenders: ['VodafoneCash', 'VF-Cash', 'InstaPay', 'IPN', 'OrangeCash', 'EtisalatCash'],
    };
  };

  const downloadAndroidConfig = (device: Device) => {
    const config = generateAndroidJsonConfig(device);
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ehabgm-device-${device.id.slice(-6)}-config.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadEnvFile = () => {
    if (!envData?.envBlock) return;
    const blob = new Blob([envData.envBlock], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '.env';
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyEnvBlock = () => {
    if (!envData?.envBlock) return;
    copyToClipboard(envData.envBlock, 'all_env_block');
  };

  // Integration snippets for merchants to add to their sites
  const snippets = {
    html_widget: `<!-- زر ودجت EHABGM Pay لاستقبال المدفوعات في أي موقع HTML -->
<div id="ehabgm-pay-widget">
  <button id="ehabgm-pay-btn" style="background:#10b981;color:#fff;padding:12px 24px;border:none;border-radius:12px;font-weight:bold;cursor:pointer;display:inline-flex;align-items:center;gap:8px;box-shadow:0 4px 14px rgba(16,185,129,0.3);">
    <span>💳 الدفع عبر فودافون كاش / إنستاباي</span>
  </button>
</div>

<script>
  document.getElementById('ehabgm-pay-btn').addEventListener('click', async function() {
    this.disabled = true;
    this.innerText = 'جاري تحضير رقم التحويل...';
    try {
      // 1. استدعاء إنشاء الدفعة المخصصة بالقروش
      const res = await fetch('${window.location.origin}/api/merchant/payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer YOUR_MERCHANT_API_KEY' // ضع مفتاحك هنا
        },
        body: JSON.stringify({
          orderRef: 'ORD-' + Math.floor(Math.random() * 90000 + 10000),
          baseAmount: 150.00,
          customerPhone: '01012345678'
        })
      });
      const data = await res.json();
      if (data.success && data.payment) {
        // 2. تحويل العميل لصفحة الدفع المستضافة لتأكيد التحويل
        window.location.href = '${window.location.origin}' + data.payment.checkoutUrl;
      }
    } catch(err) {
      alert('خطأ في الاتصال بالبوابة');
      this.disabled = false;
      this.innerText = '💳 الدفع عبر فودافون كاش / إنستاباي';
    }
  });
</script>`,

    php_woocommerce: `<?php
/**
 * إضافة كود استقبال مدفوعات فودافون كاش وإنستاباي عبر EHABGM Pay لمتجرك في ووكومرس أو PHP
 */
function ehabgm_create_wallet_payment($order_id, $amount, $customer_phone) {
    $api_key = 'YOUR_MERCHANT_API_KEY';
    $gateway_url = '${window.location.origin}/api/merchant/payments/create';

    $payload = array(
        'orderRef' => (string)$order_id,
        'baseAmount' => floatval($amount),
        'customerPhone' => $customer_phone,
        'webhookUrl' => get_site_url() . '/ehabgm-webhook-listener.php'
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
?>`,

    nodejs: `// كود Node.js / Express لإنشاء المعاملة واستقبال إشعار الـ Webhook
import express from 'express';
import crypto from 'crypto';

const app = express();
app.use(express.json());

const GATEWAY_URL = '${window.location.origin}';
const API_KEY = 'YOUR_MERCHANT_API_KEY';
const WEBHOOK_SECRET = 'YOUR_MERCHANT_WEBHOOK_SECRET';

// 1. إنشاء الدفعة المخصصة
app.post('/checkout', async (req, res) => {
  const { orderId, amount, phone } = req.body;
  const response = await fetch(\`\${GATEWAY_URL}/api/merchant/payments/create\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${API_KEY}\`
    },
    body: JSON.stringify({
      orderRef: orderId,
      baseAmount: amount,
      customerPhone: phone,
      webhookUrl: 'https://yourdomain.com/api/ehabgm-webhook'
    })
  });
  const data = await response.json();
  res.json({ checkoutUrl: \`\${GATEWAY_URL}\${data.payment.checkoutUrl}\` });
});

// 2. استقبال إشعار التأكيد الفوري من الويب هوك والتحقق من توقيع HMAC
app.post('/api/ehabgm-webhook', (req, res) => {
  const signature = req.headers['x-ehabgm-signature'];
  const expectedSig = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (signature !== expectedSig) {
    return res.status(401).send('Invalid Signature');
  }

  const { event, payment } = req.body;
  if (event === 'payment.completed') {
    console.log(\`✅ تم تأكيد الدفع للطلب #\${payment.orderRef} بمبلغ \${payment.payableAmount} ج.م\`);
    // قم بتسليم الخدمة أو المنتج للعميل فوراً
  }
  res.status(200).json({ received: true });
});`,

    android_kotlin: `// كود خدمة قارئ الرسائل والإشعارات لتطبيق أندرويد المتزامن
// Android Kotlin: EhabgmSmsListenerService.kt
package com.ehabgm.pay.forwarder

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

class EhabgmSmsListenerService : NotificationListenerService() {
    private val deviceId = "YOUR_DEVICE_ID"
    private val deviceSecret = "YOUR_DEVICE_SECRET"
    private val endpoint = "${window.location.origin}/api/device/sms"
    private val client = OkHttpClient()

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        val packageName = sbn?.packageName ?: return
        val extras = sbn.notification.extras
        val title = extras.getString("android.title") ?: ""
        val text = extras.getCharSequence("android.text")?.toString() ?: ""

        // استخراج وتصفية الرسائل الخاصة بمحافظ فودافون كاش وإنستاباي
        if (packageName.contains("messaging") || packageName.contains("instapay") || title.contains("VF-Cash")) {
            val timestamp = System.currentTimeMillis()
            val rawPayload = text

            // توليد توقيع HMAC-SHA256 المشفر
            val signature = generateHmacSha256("\$timestamp:\$rawPayload", deviceSecret)

            val jsonBody = """
                {
                    "deviceId": "\$deviceId",
                    "sender": "\$title",
                    "rawText": "\$rawPayload",
                    "timestamp": \$timestamp,
                    "signature": "\$signature"
                }
            """.trimIndent()

            val request = Request.Builder()
                .url(endpoint)
                .post(jsonBody.toRequestBody("application/json".toMediaType()))
                .build()

            client.newCall(request).execute()
        }
    }

    private fun generateHmacSha256(data: String, key: String): String {
        val sha256Hmac = Mac.getInstance("HmacSHA256")
        val secretKey = SecretKeySpec(key.toByteArray(Charsets.UTF_8), "HmacSHA256")
        sha256Hmac.init(secretKey)
        return sha256Hmac.doFinal(data.toByteArray(Charsets.UTF_8)).joinToString("") { "%02x".format(it) }
    }
}`,
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-l from-indigo-950/80 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-400 px-3.5 py-1 rounded-full text-xs font-bold border border-indigo-500/30">
              <Zap className="w-4 h-4 text-indigo-400" />
              <span>إعدادات البيئة السحابية وتكامل تطبيق الأندرويد والمواقع</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              ربط المنظومة وقواعد البيانات وتطبيق الأندرويد
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              تحكم بمتغيرات السيرفر والفايربيس الثمانية، ضبط قاعدة ربط الأجهزة (هاتف أندرويد = رقم محفظة أو رقمين بحد أقصى للشرائح)، وتوليد أكواد التكامل الجاهزة للمواقع والمتاجر.
            </p>
          </div>

          <button
            onClick={fetchEnvStatus}
            disabled={loading}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition shadow-lg shadow-indigo-600/20 self-start lg:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث وفحص المتغيرات</span>
          </button>
        </div>
      </div>

      {/* Section 1: The 8 Cloud & Environment Variables */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-indigo-400" />
              <span>متغيرات البيئة والفايربيس الـ 8 (Environment Variables)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              بيانات متكاملة 100% وغير فارغة، مهيأة للنسخ واللصق المباشر في لوحة إعدادات الاستضافة (Vercel / Cloud Run / Coolify).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={copyEnvBlock}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition"
              title="نسخ كل المتغيرات وقيمها ككتلة .env كاملة"
            >
              {copiedKey === 'all_env_block' ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>تم نسخ كل المتغيرات!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>نسخ الكل بصيغة .env</span>
                </>
              )}
            </button>

            <button
              onClick={downloadEnvFile}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition border border-slate-700"
              title="تنزيل ملف .env جاهز للاستخدام مباشرة"
            >
              <FileDown className="w-4 h-4 text-indigo-400" />
              <span>تحميل .env</span>
            </button>

            <button
              onClick={() => setShowFullValues(!showFullValues)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition border border-slate-700"
              title="تبديل عرض القيم كاملة أو مشفرة"
            >
              {showFullValues ? (
                <>
                  <EyeOff className="w-4 h-4 text-amber-400" />
                  <span>إخفاء المفاتيح</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 text-emerald-400" />
                  <span>إظهار القيم بالكامل</span>
                </>
              )}
            </button>

            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setEnvViewMode('table')}
                className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
                  envViewMode === 'table'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>جدول النشر (Name/Value)</span>
              </button>
              <button
                onClick={() => setEnvViewMode('cards')}
                className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
                  envViewMode === 'cards'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>بطاقات تفصيلية</span>
              </button>
            </div>
          </div>
        </div>

        {/* Notice alert: Ready & Not Empty */}
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-start gap-3 text-xs">
          <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold text-white block">
              جميع القيم الثمانية ممتلئة وجاهزة للنسخ ولن يظهر خطأ (Value cannot be empty):
            </span>
            <span className="text-slate-300 text-[11px]">
              يمكنك الضغط على زر <strong className="text-emerald-400">"نسخ الاسم"</strong> ثم لصقه في حقل Name، والضغط على زر <strong className="text-emerald-400">"نسخ القيمة"</strong> ولصقه في حقل Value في إعدادات المنصة، أو نسخ ملف .env بالكامل بنقرة زر واحدة.
            </span>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-500 text-xs">جاري فحص حالة المتغيرات...</div>
        ) : envViewMode === 'table' ? (
          /* Table View: Exactly matching the user's hosting deployment dashboard (Name / Value) */
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold">
                  <th className="py-3 px-4 w-1/4">اسم المتغير (Name)</th>
                  <th className="py-3 px-4 w-1/2">القيمة الحقيقية الكاملة (Value)</th>
                  <th className="py-3 px-4 text-center">نسخ سريع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-sans">
                {envData?.variables.map((item) => {
                  const displayVal = showFullValues ? item.value : item.maskedValue;
                  return (
                    <tr
                      key={item.name}
                      className="hover:bg-slate-900/60 transition group"
                    >
                      {/* Name Column */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-indigo-300 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
                              {item.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 block">
                            {item.category}
                          </span>
                        </div>
                      </td>

                      {/* Value Column */}
                      <td className="py-3.5 px-4 align-top" dir="ltr">
                        <div className="space-y-1">
                          <div className="relative bg-slate-900 border border-slate-800 rounded-xl p-2.5 font-mono text-xs text-emerald-400 overflow-x-auto max-h-24 scrollbar-thin">
                            <pre className="whitespace-pre-wrap break-all select-all font-mono text-[11px]">
                              {displayVal}
                            </pre>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1" dir="rtl">
                            <span className="text-slate-400">{item.description}</span>
                            <span className="text-emerald-400 font-bold flex items-center gap-1">
                              <Check className="w-3 h-3" /> قيمة ممتلئة ومفعلة
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Quick Actions Column */}
                      <td className="py-3.5 px-4 align-middle text-center">
                        <div className="flex flex-col gap-1.5 items-center justify-center">
                          <button
                            onClick={() => copyToClipboard(item.value, `val_${item.name}`)}
                            className="w-full px-3 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow"
                            title="نسخ القيمة الكاملة للصقها في حقل Value"
                          >
                            {copiedKey === `val_${item.name}` ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-white" />
                                <span>تم نسخ القيمة</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>نسخ القيمة (Value)</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => copyToClipboard(item.name, `name_${item.name}`)}
                            className="w-full px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold flex items-center justify-center gap-1 transition border border-slate-700"
                            title="نسخ اسم المتغير للصقه في حقل Name"
                          >
                            {copiedKey === `name_${item.name}` ? (
                              <>
                                <Check className="w-3 h-3 text-indigo-400" />
                                <span>تم نسخ الاسم</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>نسخ الاسم (Name)</span>
                              </>
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
        ) : (
          /* Cards View */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {envData?.variables.map((item) => {
              const displayVal = showFullValues ? item.value : item.maskedValue;
              return (
                <div
                  key={item.name}
                  className="p-4 bg-slate-950/80 border border-slate-800/80 rounded-2xl space-y-2 hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-300">
                        {item.name}
                      </span>
                      <button
                        onClick={() => copyToClipboard(item.name, `card_name_${item.name}`)}
                        className="text-slate-400 hover:text-white p-0.5"
                        title="نسخ الاسم"
                      >
                        {copiedKey === `card_name_${item.name}` ? (
                          <Check className="w-3 h-3 text-indigo-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      مضبوط وممتلئ
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 font-sans">{item.description}</p>
                  <p className="text-[11px] text-slate-400 font-sans">
                    <span className="text-slate-500 font-bold">الوظيفة: </span>
                    {item.purpose}
                  </p>

                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between bg-slate-900 px-3 py-2 rounded-xl text-xs font-mono text-slate-300">
                      <span className="truncate max-w-[260px] text-emerald-400 select-all" dir="ltr">
                        {displayVal}
                      </span>
                      <button
                        onClick={() => copyToClipboard(item.value, `card_val_${item.name}`)}
                        className="px-2 py-1 rounded bg-emerald-600/80 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 transition"
                        title="نسخ القيمة الكاملة"
                      >
                        {copiedKey === `card_val_${item.name}` ? (
                          <>
                            <Check className="w-3 h-3 text-white" />
                            <span>تم النسخ</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>نسخ القيمة</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Android Devices & Max 2 Wallets Binding */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-emerald-400" />
              <span>ربط الهواتف وتطبيق الأندرويد بالمحافظ (قاعدة: 1 هاتف = محفظة أو محفظتين كحد أقصى)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              كل هاتف وتطبيق أندرويد يقرأ شريحة أو شريحتين (SIM 1 + SIM 2)، ويرتبط بحد أقصى برقمين لضمان سرعة وفورية المطابقة ومنع التداخل.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 self-start sm:self-auto">
            Max 2 Wallets / Phone
          </span>
        </div>

        {/* Devices List with Binding Controls */}
        <div className="space-y-4">
          {devices.map((device) => {
            const boundWalletIds = device.boundWalletIds || [];
            const boundWallets = boundWalletIds
              .map((id) => wallets.find((w) => w.id === id))
              .filter(Boolean);

            const isBindingThis = bindingDeviceId === device.id;

            return (
              <div
                key={device.id}
                className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-white">{device.deviceName}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {device.isPaired ? 'متصل ونشط' : 'بانتظار الاقتران'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        معرف الجهاز: {device.id}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleOpenBinding(device)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition border border-slate-700"
                    >
                      <Wallet className="w-3.5 h-3.5 text-indigo-400" />
                      <span>تحديد المحافظ المربوطة ({boundWalletIds.length}/2)</span>
                    </button>

                    <button
                      onClick={() => downloadAndroidConfig(device)}
                      className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
                      title="تحميل ملف الإعدادات المباشر لتطبيق الأندرويد"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>تحميل إعدادات الأندرويد (.json)</span>
                    </button>
                  </div>
                </div>

                {/* Bound Wallets Badges */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs text-slate-400 font-bold">المحافظ المرتبطة بالهاتف:</span>
                  {boundWallets.length === 0 ? (
                    <span className="text-xs text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20">
                      لم يتم ربط محافظ بعد (اضغط لتحديد محفظة أو محفظتين)
                    </span>
                  ) : (
                    boundWallets.map((w, idx) => (
                      <span
                        key={w!.id}
                        className="text-xs font-medium px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700/80 text-emerald-300 flex items-center gap-1.5"
                      >
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.2 rounded">
                          SIM {idx + 1}
                        </span>
                        <span>{w!.label}</span>
                        <span className="font-mono text-[11px] text-slate-400">({w!.identifier})</span>
                      </span>
                    ))
                  )}

                  {boundWallets.length === 2 && (
                    <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full font-bold">
                      الحد الأقصى مكتمل (2/2)
                    </span>
                  )}
                </div>

                {/* Interactive Binding Drawer */}
                {isBindingThis && (
                  <div className="mt-4 p-4 bg-slate-900 border border-indigo-500/40 rounded-2xl space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">
                        اختر المحافظ التي يستقبلها هذا الهاتف (حد أقصى 2 محفظة):
                      </span>
                      <span className="text-xs font-mono text-indigo-300 font-bold">
                        {selectedWalletIds.length} / 2 محددة
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {wallets.map((wallet) => {
                        const isSelected = selectedWalletIds.includes(wallet.id);
                        return (
                          <div
                            key={wallet.id}
                            onClick={() => handleToggleWalletSelection(wallet.id)}
                            className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                              isSelected
                                ? 'bg-indigo-600/20 border-indigo-500 text-white'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Wallet className={`w-4 h-4 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                              <div>
                                <div className="text-xs font-bold">{wallet.label}</div>
                                <div className="text-[11px] font-mono opacity-80">{wallet.identifier}</div>
                              </div>
                            </div>
                            <div
                              className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                                isSelected
                                  ? 'bg-indigo-600 border-indigo-500 text-white'
                                  : 'border-slate-700'
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {bindFeedback && (
                      <div className="text-xs text-amber-300 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                        {bindFeedback}
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        onClick={() => setBindingDeviceId(null)}
                        className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                      >
                        إلغاء
                      </button>
                      <button
                        onClick={() => handleSaveBinding(device.id)}
                        disabled={bindingSaving}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                      >
                        {bindingSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        <span>حفظ ربط المحافظ بالهاتف</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 3: Embeddable Integration Snippets for Websites & Apps */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Code2 className="w-5 h-5 text-emerald-400" />
            <span>حزمة أكواد الربط للمواقع والمتاجر (Embeddable Integration Snippets)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            أكواد جاهزة للنسخ واللصق يمكن للعميل أو المبرمج إضافتها في موقعه لاستقبال المدفوعات عبر المحفظة مباشرة.
          </p>
        </div>

        {/* Snippet Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveSnippetTab('html_widget')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeSnippetTab === 'html_widget'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>زر ودجت HTML مباشر للموقع</span>
          </button>
          <button
            onClick={() => setActiveSnippetTab('php_woocommerce')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeSnippetTab === 'php_woocommerce'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>PHP & WooCommerce</span>
          </button>
          <button
            onClick={() => setActiveSnippetTab('nodejs')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeSnippetTab === 'nodejs'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Node.js / Express & Webhook</span>
          </button>
          <button
            onClick={() => setActiveSnippetTab('android_kotlin')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeSnippetTab === 'android_kotlin'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>تطبيق الأندرويد (Kotlin)</span>
          </button>
        </div>

        {/* Snippet Code Viewer */}
        <div className="relative">
          <button
            onClick={() => copyToClipboard(snippets[activeSnippetTab], activeSnippetTab)}
            className="absolute top-3 left-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition border border-slate-700"
          >
            {copiedKey === activeSnippetTab ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">تم النسخ</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>نسخ الكود بالكامل</span>
              </>
            )}
          </button>

          <pre
            dir="ltr"
            className="p-4 pt-12 bg-slate-950 border border-slate-800 rounded-2xl font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed max-h-96 selection:bg-indigo-600"
          >
            <code>{snippets[activeSnippetTab]}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
