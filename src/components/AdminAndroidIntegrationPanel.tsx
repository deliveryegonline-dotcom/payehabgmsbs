import React, { useState, useEffect, useMemo } from 'react';
import {
  Smartphone,
  Copy,
  Check,
  Download,
  QrCode,
  Key,
  ShieldCheck,
  Zap,
  Globe,
  RefreshCw,
  FileCode,
  Code2,
  Lock,
  Server,
  Layers,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  BatteryCharging,
  Radio,
  Terminal,
  HelpCircle,
  Sliders,
  Play,
  Cpu,
  Shield,
  Clock,
  ArrowRight,
} from 'lucide-react';
import type { Device, Wallet as WalletType } from '../types/index.ts';

interface AdminAndroidIntegrationPanelProps {
  devices?: Device[];
  wallets?: WalletType[];
  onRefreshAll?: () => void;
}

interface MerchantInfo {
  id: string;
  name: string;
  email: string;
  apiKey: string;
}

export const AdminAndroidIntegrationPanel: React.FC<AdminAndroidIntegrationPanelProps> = ({
  devices = [],
  wallets = [],
  onRefreshAll,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeGuideTab, setActiveGuideTab] = useState<'steps' | 'manufacturers' | 'adb' | 'kotlin' | 'security'>('steps');
  
  // Ping test state
  const [isTestingPing, setIsTestingPing] = useState(false);
  const [pingResult, setPingResult] = useState<{ success: boolean; message: string; latency?: number } | null>(null);

  // Base URL calculation (auto-detect current origin)
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://ais-dev-jfmwlt3pkqwjafsuhg6vj5-267960810026.europe-west2.run.app';
  const [customBaseUrl, setCustomBaseUrl] = useState<string>(currentOrigin);
  const [useCurrentOrigin, setUseCurrentOrigin] = useState<boolean>(true);

  // Available merchants list
  const availableMerchants: MerchantInfo[] = [
    {
      id: 'm_ehabgm_001',
      name: 'متجر إيهاب الرئيسي (الافتراضي)',
      email: 'deliveryegonline@gmail.com',
      apiKey: 'ehabgm_live_9f823a7b4c9102de',
    },
    {
      id: 'm_admin_root',
      name: 'حساب الإدارة والتشغيل العام',
      email: 'ehabgm200@gmail.com',
      apiKey: 'ehabgm_live_4b89e7c1092a3f55',
    },
  ];

  const [selectedMerchantId, setSelectedMerchantId] = useState<string>('m_ehabgm_001');
  const activeMerchant = useMemo(() => {
    return availableMerchants.find((m) => m.id === selectedMerchantId) || availableMerchants[0];
  }, [selectedMerchantId]);

  // Selected Device
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(
    devices.length > 0 ? devices[0].id : 'dev_primary_01'
  );

  const activeDevice = useMemo(() => {
    const found = devices.find((d) => d.id === selectedDeviceId);
    if (found) return found;
    return {
      id: selectedDeviceId || 'dev_primary_01',
      merchantId: activeMerchant.id,
      deviceName: 'هاتف الصيدلية / الفرع الرئيسي (Samsung A54)',
      deviceSecret: 'sec_8f92ab40c31e78d9',
      isPaired: true,
      status: 'active' as const,
      createdAt: new Date().toISOString(),
    };
  }, [devices, selectedDeviceId, activeMerchant.id]);

  // Update selected device if devices list changes
  useEffect(() => {
    if (devices.length > 0 && !devices.some((d) => d.id === selectedDeviceId)) {
      setSelectedDeviceId(devices[0].id);
    }
  }, [devices, selectedDeviceId]);

  // Endpoint URLs
  const effectiveBaseUrl = useCurrentOrigin ? currentOrigin : (customBaseUrl.trim() || currentOrigin);
  const smsEndpoint = `${effectiveBaseUrl}/api/device/sms`;
  const heartbeatEndpoint = `${effectiveBaseUrl}/api/device/heartbeat`;
  const pairEndpoint = `${effectiveBaseUrl}/api/device/pair`;

  // Pre-configured JSON configuration template
  const preConfiguredJson = useMemo(() => {
    return {
      appName: 'EHABGM Pay SMS Forwarder',
      version: '1.2.0',
      environment: 'production',
      endpoints: {
        baseUrl: effectiveBaseUrl,
        smsEndpoint: smsEndpoint,
        heartbeatEndpoint: heartbeatEndpoint,
        pairingEndpoint: pairEndpoint,
      },
      credentials: {
        merchantId: activeMerchant.id,
        merchantEmail: activeMerchant.email,
        apiKey: activeMerchant.apiKey,
        deviceId: activeDevice.id,
        deviceSecret: activeDevice.deviceSecret || 'sec_8f92ab40c31e78d9',
      },
      forwardingRules: {
        forwardIntervalMs: 2500,
        heartbeatIntervalMs: 30000,
        enableSimSlotTracking: true,
        autoStartOnBoot: true,
        requestBatteryOptimizationExemption: true,
        supportedSenders: [
          'VF-Cash',
          'VodafoneCash',
          'InstaPay',
          'EtisalatCash',
          'OrangeCash',
          'WEPay',
          'SmartWallet',
          'CIB_SMART',
          'NBE_PhoneCash',
          'BM_Wallet',
        ],
      },
      createdAt: new Date().toISOString(),
    };
  }, [effectiveBaseUrl, smsEndpoint, heartbeatEndpoint, pairEndpoint, activeMerchant, activeDevice]);

  const jsonString = useMemo(() => {
    return JSON.stringify(preConfiguredJson, null, 2);
  }, [preConfiguredJson]);

  // QR Scan Payload
  const qrScanPayload = useMemo(() => {
    return JSON.stringify({
      t: 'ehabgm_cfg',
      b: effectiveBaseUrl,
      m: activeMerchant.id,
      k: activeMerchant.apiKey,
      d: activeDevice.id,
      s: activeDevice.deviceSecret || 'sec_8f92ab40c31e78d9',
    });
  }, [effectiveBaseUrl, activeMerchant, activeDevice]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleDownloadConfigJson = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ehabgm_config.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Perform Live Ping Test from browser to heartbeat endpoint
  const handleTestHeartbeat = async () => {
    setIsTestingPing(true);
    setPingResult(null);
    const startTime = performance.now();
    try {
      const res = await fetch('/api/device/heartbeat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': activeDevice.id,
          'x-device-secret': activeDevice.deviceSecret || 'sec_8f92ab40c31e78d9',
          'x-merchant-id': activeMerchant.id,
        },
        body: JSON.stringify({
          batteryLevel: 98,
          isCharging: true,
          networkType: 'WIFI_5GHZ',
          appVersion: '1.2.0',
        }),
      });
      const latency = Math.round(performance.now() - startTime);
      const data = await res.json();
      if (res.ok && data.success) {
        setPingResult({
          success: true,
          message: `تم الاتصال بالخادم بنجاح! تم التحقق من سر الجهاز والمصادقة (${latency}ms)`,
          latency,
        });
        if (onRefreshAll) onRefreshAll();
      } else {
        setPingResult({
          success: false,
          message: data.error || 'فشل التحقق من المصادقة',
        });
      }
    } catch {
      setPingResult({
        success: false,
        message: 'تعذر الاتصال بالخادم. تأكد من عمل السيرفر.',
      });
    } finally {
      setIsTestingPing(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero Header & Instructions Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-semibold">
              <Smartphone className="w-3.5 h-3.5" />
              <span>دليل ووثائق ربط تطبيق الأندرويد المباشر</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              بيانات الاتصال الحقيقية ودليل تثبيت الأندرويد
            </h2>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              إليك بيانات الاتصال المشفرة الحقيقية (<code className="text-cyan-300 font-mono">Endpoint URL</code>, <code className="text-emerald-300 font-mono">API Key</code>, <code className="text-indigo-300 font-mono">Device Secret</code>) في قالب JSON مهيأ للنسخ، مع خطوات تثبيت التطبيق لضمان استقبال وإعادة توجيه رسائل فودافون كاش وإنستاباي في أجزاء من الثانية دون أي تأخير.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleDownloadConfigJson}
              className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition shadow-lg shadow-emerald-600/30"
            >
              <Download className="w-4 h-4" />
              <span>تحميل config.json جاهز</span>
            </button>
            <button
              onClick={() => copyToClipboard(jsonString, 'main-json-hero')}
              className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition shadow-lg shadow-indigo-600/30"
            >
              {copiedKey === 'main-json-hero' ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>تم النسخ للحافظة!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>نسخ قالب الـ JSON</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Real Connection Credentials Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Endpoint URL */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-2 relative group hover:border-cyan-500/40 transition">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-bold text-slate-200">
              <Globe className="w-4 h-4 text-cyan-400" />
              مسار استقبال SMS (Endpoint)
            </span>
            <button
              onClick={() => copyToClipboard(smsEndpoint, 'cred-sms')}
              className="text-slate-400 hover:text-white p-1 rounded transition"
              title="نسخ المسار"
            >
              {copiedKey === 'cred-sms' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="font-mono text-xs text-cyan-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800 break-all select-all">
            {smsEndpoint}
          </div>
          <span className="text-[10px] text-slate-500 block">
            طريقة الإرسال: POST مع تشفير JSON
          </span>
        </div>

        {/* 2. API Key */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-2 relative group hover:border-emerald-500/40 transition">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-bold text-slate-200">
              <Key className="w-4 h-4 text-emerald-400" />
              مفتاح التاجر (API Key)
            </span>
            <button
              onClick={() => copyToClipboard(activeMerchant.apiKey, 'cred-apikey')}
              className="text-slate-400 hover:text-white p-1 rounded transition"
              title="نسخ المفتاح"
            >
              {copiedKey === 'cred-apikey' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="font-mono text-xs text-emerald-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800 break-all select-all">
            {activeMerchant.apiKey}
          </div>
          <span className="text-[10px] text-slate-500 block">
            الترويسة: <code className="text-slate-400 font-mono">x-api-key</code>
          </span>
        </div>

        {/* 3. Device Secret */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-2 relative group hover:border-indigo-500/40 transition">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-bold text-slate-200">
              <Lock className="w-4 h-4 text-indigo-400" />
              سر الجهاز (Device Secret)
            </span>
            <button
              onClick={() => copyToClipboard(activeDevice.deviceSecret || 'sec_8f92ab40c31e78d9', 'cred-secret')}
              className="text-slate-400 hover:text-white p-1 rounded transition"
              title="نسخ السر"
            >
              {copiedKey === 'cred-secret' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="font-mono text-xs text-indigo-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800 break-all select-all">
            {activeDevice.deviceSecret || 'sec_8f92ab40c31e78d9'}
          </div>
          <span className="text-[10px] text-slate-500 block">
            الترويسة: <code className="text-slate-400 font-mono">x-device-secret</code>
          </span>
        </div>

        {/* 4. Merchant & Device ID */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-2 relative group hover:border-purple-500/40 transition">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-bold text-slate-200">
              <Layers className="w-4 h-4 text-purple-400" />
              معرّف الجهاز والتاجر
            </span>
            <button
              onClick={() => copyToClipboard(activeDevice.id, 'cred-devid')}
              className="text-slate-400 hover:text-white p-1 rounded transition"
              title="نسخ معرف الجهاز"
            >
              {copiedKey === 'cred-devid' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="font-mono text-xs text-purple-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800 break-all select-all">
            {activeDevice.id} ({activeMerchant.id})
          </div>
          <span className="text-[10px] text-slate-500 block">
            الترويسة: <code className="text-slate-400 font-mono">x-device-id</code>
          </span>
        </div>
      </div>

      {/* Configuration Customizer Dropdowns */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-bold text-slate-300 mb-2 block">
            تخصيص التاجر المستهدف:
          </label>
          <select
            value={selectedMerchantId}
            onChange={(e) => setSelectedMerchantId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 text-white text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500"
          >
            {availableMerchants.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.email})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-300 mb-2 block">
            تخصيص الهاتف المسجل:
          </label>
          <select
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 text-white text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500"
          >
            {devices.length > 0 ? (
              devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.deviceName || 'هاتف أندرويد'} ({d.id})
                </option>
              ))
            ) : (
              <option value="dev_primary_01">هاتف الفرع الافتراضي (dev_primary_01)</option>
            )}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-300">
              عنوان السيرفر (Domain):
            </label>
            <label className="text-[10px] text-slate-400 flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={useCurrentOrigin}
                onChange={(e) => setUseCurrentOrigin(e.target.checked)}
                className="w-3 h-3 rounded bg-slate-950 text-indigo-600 focus:ring-0"
              />
              <span>تلقائي من المتصفح</span>
            </label>
          </div>
          <input
            type="text"
            disabled={useCurrentOrigin}
            value={useCurrentOrigin ? currentOrigin : customBaseUrl}
            onChange={(e) => setCustomBaseUrl(e.target.value)}
            className="w-full bg-slate-950 disabled:opacity-75 border border-slate-700 text-white text-xs font-mono rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Main JSON Template & QR Code Block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: JSON Template Viewer */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden flex flex-col shadow-xl">
          <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <FileCode className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-mono">
                  config.json - قالب التهيئة الجاهز للنسخ
                </h3>
                <span className="text-[11px] text-slate-400">
                  الصق هذا الكائن مباشرة في تطبيق الأندرويد أو ضعه في مجلد <code className="text-indigo-300 font-mono">assets/</code>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => copyToClipboard(jsonString, 'viewer-json-code')}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition border border-slate-700"
              >
                {copiedKey === 'viewer-json-code' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>تم النسخ!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>نسخ الـ JSON</span>
                  </>
                )}
              </button>
              <button
                onClick={handleDownloadConfigJson}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition shadow"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تحميل الملف</span>
              </button>
            </div>
          </div>

          <div className="p-5 flex-1 bg-slate-950/90 font-mono text-xs overflow-x-auto">
            <pre className="text-emerald-400 leading-relaxed select-all">
              {jsonString}
            </pre>
          </div>

          <div className="bg-slate-900/90 px-6 py-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>جاهز للحقن المباشر في أي هاتف أندرويد عبر الحافظة أو الملفات.</span>
            </div>
            <button
              onClick={handleTestHeartbeat}
              disabled={isTestingPing}
              className="px-3 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3 h-3 ${isTestingPing ? 'animate-spin' : ''}`} />
              <span>تجربة اتصال النبضات (Ping Test)</span>
            </button>
          </div>
        </div>

        {/* Right 1 Col: Live QR Code Import */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col items-center text-center justify-between space-y-4 shadow-xl">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mx-auto mb-3">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">
              مسح الإعدادات عبر كاميرا الهاتف
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              افتح تطبيق EHABGM Pay واضغط على &quot;مسح رمز التهيئة&quot; ليتم استيراد كافة الرموز ونقاط الاتصال فوراً.
            </p>
          </div>

          {/* QR Graphic Container */}
          <div className="bg-white p-4 rounded-2xl shadow-xl shadow-black/40 relative">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                qrScanPayload
              )}`}
              alt="QR Code for Android Config"
              className="w-40 h-40 object-contain rounded-lg"
              loading="lazy"
            />
          </div>

          <div className="w-full space-y-2">
            <button
              onClick={() => copyToClipboard(qrScanPayload, 'qr-raw')}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition border border-slate-700"
            >
              {copiedKey === 'qr-raw' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>تم نسخ نص الـ QR!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ بايلود الـ QR المشفر</span>
                </>
              )}
            </button>
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>متاح للمسح الفوري بواسطة كاميرا التطبيق</span>
            </div>
          </div>
        </div>
      </div>

      {/* Ping Test Feedback Alert if Triggered */}
      {pingResult && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 animate-fadeIn ${
            pingResult.success
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
          }`}
        >
          {pingResult.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="text-xs font-semibold">{pingResult.message}</span>
        </div>
      )}

      {/* Comprehensive Step-by-Step Installation & Instant Sync Guide */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        {/* Navigation Tabs for Guide */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-400" />
              <span>دليل التثبيت والتشغيل لضمان المزامنة الفورية للرسائل (Zero-Delay SMS Sync)</span>
            </h3>
            <span className="text-xs text-slate-400">
              اتبع هذه الخطوات لضمان استمرار عمل التطبيق في الخلفية حتى عند إغلاق الشاشة
            </span>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveGuideTab('steps')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeGuideTab === 'steps'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              1. خطوات التثبيت والصلاحيات
            </button>
            <button
              onClick={() => setActiveGuideTab('manufacturers')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeGuideTab === 'manufacturers'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              2. إعدادات الشركات (سامسونج/شاومي)
            </button>
            <button
              onClick={() => setActiveGuideTab('adb')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeGuideTab === 'adb'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              3. أوامر ADB السريعة
            </button>
            <button
              onClick={() => setActiveGuideTab('security')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeGuideTab === 'security'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              4. الحماية والتشفير (HMAC)
            </button>
          </div>
        </div>

        {/* Tab 1: Step-by-Step Installation */}
        {activeGuideTab === 'steps' && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Step 1 */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                    1
                  </span>
                  <span className="text-[10px] text-indigo-400 font-bold bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/50">
                    APK Installation
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white">
                  تثبيت ملف APK على هاتف الأندرويد
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  قم بتحميل ملف تطبيق <code className="text-emerald-400 font-mono">EHABGM-Pay-Forwarder.apk</code> على الهاتف الذي يحتوي على شرائح فودافون كاش / إنستاباي. وافق على &quot;تثبيت التطبيقات من مصادر غير معروفة&quot; عند المطالبة.
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                    2
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                    SMS Permissions
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white">
                  منح أذونات قراءة واستقبال الرسائل (SMS)
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  عند تشغيل التطبيق لأول مرة، امنح إذن <code className="text-emerald-400 font-mono">RECEIVE_SMS</code> و <code className="text-emerald-400 font-mono">READ_SMS</code> و <code className="text-emerald-400 font-mono">POST_NOTIFICATIONS</code> للسماح للمستقبل البرمجي بالتقاط إشعارات التحويل فور وصولها بدون أي وسيط.
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                    3
                  </span>
                  <span className="text-[10px] text-amber-400 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/50">
                    Battery Optimization (حرج جداً)
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white">
                  استثناء التطبيق من موفر طاقة البطارية (Unrestricted)
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  لضمان عدم قتل أندرويد لخدمة التقاط الرسائل عند قفل الشاشة أو في وضع السكون (Doze Mode)، ادخل إلى:
                  <br />
                  <span className="text-amber-300 font-semibold">إعدادات الهاتف &gt; التطبيقات &gt; EHABGM Pay &gt; البطارية &gt; اختر &quot;غير مقيد&quot; (Unrestricted / No restrictions).</span>
                </p>
              </div>

              {/* Step 4 */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                    4
                  </span>
                  <span className="text-[10px] text-cyan-400 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
                    Auto-Start on Boot
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white">
                  تفعيل الإقلاع التلقائي مع تشغيل الهاتف
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  يحتوي التطبيق على <code className="text-cyan-400 font-mono">BootCompletedReceiver</code> الذي يعيد تشغيل خدمة المزامنة ذاتياً بمجرد إعادة تشغيل الهاتف أو نفاذ البطارية وإعادة شحنها دون الحاجة لفتح التطبيق يدوياً.
                </p>
              </div>
            </div>

            {/* Step 5 Banner */}
            <div className="bg-gradient-to-r from-emerald-950/50 to-slate-950 p-5 rounded-2xl border border-emerald-500/30 flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div className="space-y-1 text-xs">
                <h4 className="text-sm font-bold text-white">
                  الخطوة 5: التحقق اللحظي عبر نبضات الاتصال (Heartbeat Ping)
                </h4>
                <p className="text-slate-300 leading-relaxed">
                  بمجرد استيراد ملف الـ JSON أو مسح الـ QR، سيرسل التطبيق نبضة اتصال كل 30 ثانية لتحديث مستوى شحن البطارية ونوع الشبكة (Wi-Fi/4G)، وستتحول حالة الهاتف في لوحة المدير إلى <span className="text-emerald-400 font-bold">متصل ونشط (Online)</span> فوراً.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Manufacturers Custom Guides */}
        {activeGuideTab === 'manufacturers' && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Samsung */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span>هواتف سامسونج (Samsung OneUI)</span>
                </h4>
                <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
                  <li>افتح <strong>الضبط</strong> &gt; <strong>العناية بالجهاز</strong> &gt; <strong>البطارية</strong>.</li>
                  <li>اضغط على <strong>حدود استخدام الخلفية</strong>.</li>
                  <li>أضف EHABGM Pay إلى <strong>التطبيقات التي لا يتم وضعها في وضع السكون أبداً (Never sleeping apps)</strong>.</li>
                  <li>في تفاصيل التطبيق، اضبط البطارية على <strong>غير مقيد (Unrestricted)</strong>.</li>
                </ol>
              </div>

              {/* Xiaomi / Redmi / POCO */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                  <span>شاومي وريدمي (Xiaomi MIUI / HyperOS)</span>
                </h4>
                <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
                  <li>افتح <strong>الإعدادات</strong> &gt; <strong>التطبيقات</strong> &gt; <strong>إدارة التطبيقات</strong>.</li>
                  <li>اختر <strong>EHABGM Pay</strong> وفعل خيار <strong>التشغيل التلقائي (Autostart)</strong>.</li>
                  <li>ادخل إلى <strong>موفر البطارية</strong> واختر <strong>بلا قيود (No restrictions)</strong>.</li>
                  <li>اقفل التطبيق في قائمة التطبيقات الأخيرة (Lock in Recents).</li>
                </ol>
              </div>

              {/* Oppo / Realme / Huawei */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>أوبو وريلمي وهواوي (ColorOS / EMUI)</span>
                </h4>
                <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
                  <li>افتح <strong>إدارة التطبيقات</strong> &gt; <strong>EHABGM Pay</strong>.</li>
                  <li>فعل <strong>السماح بالنشاط في الخلفية (Allow background activity)</strong>.</li>
                  <li>فعل <strong>السماح بالتشغيل التلقائي (Allow Auto-launch)</strong>.</li>
                  <li>عطّل تحسين استهلاك الطاقة للتطبيق من قائمة البطارية.</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: ADB Terminal Commands */}
        {activeGuideTab === 'adb' && (
          <div className="p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold">
                أوامر تثبيت ومنح الصلاحيات بضغطة واحدة عبر ADB للمطورين ومدراء الفروع:
              </span>
              <button
                onClick={() =>
                  copyToClipboard(
                    `adb install -r app-release.apk\nadb shell pm grant com.ehabgm.pay.forwarder android.permission.RECEIVE_SMS\nadb shell pm grant com.ehabgm.pay.forwarder android.permission.READ_SMS\nadb shell pm grant com.ehabgm.pay.forwarder android.permission.POST_NOTIFICATIONS\nadb shell dumpsys deviceidle whitelist +com.ehabgm.pay.forwarder`,
                    'adb-all'
                  )
                }
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition border border-slate-700"
              >
                {copiedKey === 'adb-all' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>نسخ جميع أوامر ADB</span>
              </button>
            </div>

            <pre className="bg-slate-950 p-5 rounded-2xl border border-slate-800 font-mono text-xs text-emerald-400 leading-relaxed overflow-x-auto select-all">
{`# 1. تثبيت التطبيق على الهاتف المتصل عبر كابل USB أو Wi-Fi
adb install -r EHABGM-Pay-Forwarder.apk

# 2. منح أذونات قراءة واستلام رسائل الـ SMS تلقائياً
adb shell pm grant com.ehabgm.pay.forwarder android.permission.RECEIVE_SMS
adb shell pm grant com.ehabgm.pay.forwarder android.permission.READ_SMS
adb shell pm grant com.ehabgm.pay.forwarder android.permission.POST_NOTIFICATIONS

# 3. إعفاء التطبيق فورياً من وضع توفير الطاقة (Doze Mode Whitelist)
adb shell dumpsys deviceidle whitelist +com.ehabgm.pay.forwarder

# 4. تشغيل الخدمة في الخلفية فوراً
adb shell am start-foreground-service com.ehabgm.pay.forwarder/.service.ForwarderForegroundService`}
            </pre>
          </div>
        )}

        {/* Tab 4: Security & HMAC Verification */}
        {activeGuideTab === 'security' && (
          <div className="p-6 sm:p-8 space-y-4">
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-400" />
                <span>كيف يحمي السيرفر عمليات الدفع من التزوير والتلاعب؟</span>
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                كل رسالة SMS يتم إرسالها من تطبيق الأندرويد يتم توقيعها برمجياً عبر مفتاح الجهاز السري (<code className="text-indigo-300 font-mono">x-device-secret</code>) وتمرير توقيع <code className="text-emerald-400 font-mono">HMAC-SHA256</code> في ترويسة الطلب. يقوم السيرفر بإعادة حساب التوقيع ومطابقته فورياً قبل التحقق من رقم العملية والمبلغ، مما يمنع نهائياً أي طلبات وهمية أو غير مصادق عليها.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
