import React, { useState } from 'react';
import {
  Smartphone,
  Plus,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Wallet,
  Download,
  Check,
  RefreshCw,
  AlertCircle,
  Radio,
  Battery,
  BatteryCharging,
  Wifi,
  Signal,
  Activity,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import type { Device, Wallet as WalletType } from '../types/index.ts';

interface DevicesTabProps {
  devices: Device[];
  wallets: WalletType[];
  onOpenPairModal: () => void;
  onRefresh: () => void;
}

export const DevicesTab: React.FC<DevicesTabProps> = ({
  devices,
  wallets,
  onOpenPairModal,
  onRefresh,
}) => {
  const [bindingDeviceId, setBindingDeviceId] = useState<string | null>(null);
  const [selectedWalletIds, setSelectedWalletIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pingingDeviceId, setPingingDeviceId] = useState<string | null>(null);
  const [pingResult, setPingResult] = useState<{ [deviceId: string]: string }>({});

  const handleRefreshClick = () => {
    setRefreshing(true);
    onRefresh();
    setTimeout(() => setRefreshing(false), 800);
  };

  const handleOpenBinding = (device: Device) => {
    setBindingDeviceId(device.id);
    setSelectedWalletIds(device.boundWalletIds || []);
    setFeedback(null);
  };

  const handleToggleWallet = (walletId: string) => {
    if (selectedWalletIds.includes(walletId)) {
      setSelectedWalletIds(selectedWalletIds.filter((id) => id !== walletId));
    } else {
      if (selectedWalletIds.length >= 2) {
        setFeedback('تنبيه: الحد الأقصى هو محفظتان (2) فقط لكل هاتف لضمان استقرار شرائح الاتصال (SIM 1 + SIM 2).');
        return;
      }
      setSelectedWalletIds([...selectedWalletIds, walletId]);
      setFeedback(null);
    }
  };

  const handleSaveBinding = async (deviceId: string) => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/merchant/devices/${deviceId}/bind-wallets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletIds: selectedWalletIds }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback('تم ربط المحافظ بنجاح!');
        onRefresh();
        setTimeout(() => {
          setBindingDeviceId(null);
          setFeedback(null);
        }, 1200);
      } else {
        setFeedback(json.error || 'فشل حفظ الربط');
      }
    } catch (err) {
      setFeedback('حدث خطأ أثناء الاتصال بالخادم');
    } finally {
      setSaving(false);
    }
  };

  const handleLivePing = async (deviceId: string) => {
    setPingingDeviceId(deviceId);
    try {
      const res = await fetch(`/api/merchant/devices/${deviceId}/ping-test`, {
        method: 'POST',
      });
      const json = await res.json();
      if (json.success) {
        setPingResult((prev) => ({
          ...prev,
          [deviceId]: `🟢 متصل ومستقر (${json.latencyMs}ms)`,
        }));
        onRefresh();
      } else {
        setPingResult((prev) => ({
          ...prev,
          [deviceId]: '🔴 تعذر الاتصال بالجهاز',
        }));
      }
    } catch (err) {
      setPingResult((prev) => ({
        ...prev,
        [deviceId]: '🔴 خطأ في الشبكة',
      }));
    } finally {
      setPingingDeviceId(null);
      setTimeout(() => {
        setPingResult((prev) => {
          const next = { ...prev };
          delete next[deviceId];
          return next;
        });
      }, 4000);
    }
  };

  const handleSimulateDisconnect = async (deviceId: string) => {
    try {
      const res = await fetch(`/api/merchant/devices/${deviceId}/simulate-disconnect`, {
        method: 'POST',
      });
      const json = await res.json();
      if (json.success) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const downloadAndroidConfig = (device: Device) => {
    const bound = (device.boundWalletIds || [])
      .map((wId) => wallets.find((w) => w.id === wId))
      .filter(Boolean)
      .map((w) => ({
        id: w!.id,
        provider: w!.provider,
        identifier: w!.identifier,
        label: w!.label,
      }));

    const detectedSims = device.simCards || [];

    const config = {
      appName: 'EHABGM Pay Forwarder',
      version: device.appVersion || '1.2.0',
      gatewayBaseUrl: window.location.origin,
      smsEndpoint: `${window.location.origin}/api/device/sms`,
      heartbeatEndpoint: `${window.location.origin}/api/device/heartbeat`,
      credentials: {
        deviceId: device.id,
        deviceSecret: device.deviceSecret,
        merchantId: device.merchantId,
        hmacAlgorithm: 'HmacSHA256',
      },
      simSlotDiscovery: {
        autoDetectSims: true,
        detectedSimCount: detectedSims.length,
        sims: detectedSims,
        sim1: detectedSims[0]?.phoneNumber || bound[0]?.identifier || '010XXXXXXXX',
        sim2: detectedSims[1]?.phoneNumber || bound[1]?.identifier || '012XXXXXXXX',
      },
      offlineResilience: {
        enableLocalQueue: true,
        maxRetries: 50,
        retryBackoffSeconds: 5,
        syncOnNetworkRestore: true,
      },
      timestamp: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ehabgm-config-${device.id.slice(-6)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const offlineDevices = devices.filter(
    (d) => d.isPaired && d.connectionStatus === 'offline',
  );

  return (
    <div className="space-y-6">
      {/* Offline Alert Banner */}
      {offlineDevices.length > 0 && (
        <div className="p-4 bg-red-950/80 border-2 border-red-500/60 rounded-2xl flex items-start gap-3 text-red-200 shadow-xl shadow-red-950/40 animate-pulse">
          <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-red-300 text-sm flex items-center gap-2">
              <span>تنبيه فوري: انقطاع اتصال هاتف الاستقبال!</span>
              <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                {offlineDevices.length} جهاز متوقف
              </span>
            </h4>
            <p className="text-xs text-red-200 leading-relaxed">
              هاتف الاستقبال{' '}
              <span className="font-bold text-white font-mono">
                {offlineDevices.map((d) => d.deviceName).join('، ')}
              </span>{' '}
              انقطع اتصاله بالسيرفر منذ أكثر من 60 ثانية. يرجى التأكد من تشغيل تطبيق الأندرويد في الخلفية واتصال الهاتف بشبكة 4G/WiFi لمنع تعطل تأكيد المدفوعات التلقائي.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>الأجهزة وهواتف الاستقبال وتطبيق الأندرويد</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {devices.filter((d) => d.isPaired).length} جهاز نشط
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            يقوم التطبيق بالتعرف التلقائي على شرائح الاتصال (SIM 1 + SIM 2)، واستخراج أرقام الاستلام وإرسالها للمنصة مع مراقبة استقرار الاتصال اللحظي.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleRefreshClick}
            disabled={refreshing}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition border border-slate-700/60"
            title="تحديث حالة الأجهزة والاتصال"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${refreshing ? 'animate-spin' : ''}`} />
            <span>مزامنة الأجهزة</span>
          </button>
          <button
            onClick={onOpenPairModal}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition shadow-lg shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>ربط هاتف أندرويد جديد</span>
          </button>
        </div>
      </div>

      {/* Notice Card: Automatic SIM Discovery */}
      <div className="p-4 bg-gradient-to-r from-emerald-950/60 via-slate-900 to-indigo-950/60 border border-emerald-500/30 rounded-2xl flex items-start gap-3.5 text-xs text-emerald-200 shadow-lg">
        <Radio className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-emerald-300 text-sm block">
            المزامنة اللحظية للأرقام المكتشفة من الهاتف (Smart SIM Auto-Discovery)
          </span>
          <p className="text-slate-300 text-xs leading-relaxed">
            الأرقام التي تظهر في شاشات الاستلام والدفع للعملاء يتم اكتشافها تلقائياً من شرائح الـ SIM المركبة في هاتف الأندرويد، وترتبط بحساب التاجر فور تشغيل التطبيق.
          </p>
        </div>
      </div>

      {/* Devices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {devices.map((device) => {
          const boundWalletIds = device.boundWalletIds || [];
          const boundWallets = boundWalletIds
            .map((id) => wallets.find((w) => w.id === id))
            .filter(Boolean);

          const simCards = device.simCards || [];
          const isBindingThis = bindingDeviceId === device.id;
          const isOffline = device.connectionStatus === 'offline';
          const isWarning = device.connectionStatus === 'warning';

          return (
            <div
              key={device.id}
              className={`bg-slate-900 border rounded-2xl p-5 shadow-xl transition space-y-4 ${
                isOffline
                  ? 'border-red-500/50 shadow-red-950/20'
                  : isWarning
                  ? 'border-amber-500/40'
                  : 'border-slate-800 hover:border-slate-700/80'
              }`}
            >
              {/* Header Info & Connection Badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl border flex items-center justify-center ${
                      isOffline
                        ? 'bg-red-500/10 border-red-500/40 text-red-400'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    }`}
                  >
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">{device.deviceName}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                      <span>{device.appVersion ? `v${device.appVersion}` : 'v1.2.0'}</span>
                      <span>•</span>
                      <span>{device.ipAddress || '197.38.120.45'}</span>
                    </div>
                  </div>
                </div>

                {/* Live Status Badge */}
                {isOffline ? (
                  <div className="flex items-center gap-1.5 bg-red-950/90 border border-red-500/40 text-red-400 text-xs font-bold px-3 py-1 rounded-full">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                    <span>منقطع الاتصال ⚠️</span>
                  </div>
                ) : isWarning ? (
                  <div className="flex items-center gap-1.5 bg-amber-950/90 border border-amber-500/40 text-amber-400 text-xs font-bold px-3 py-1 rounded-full">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span>استجابة متأخرة</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>متصل لحظياً 🟢</span>
                  </div>
                )}
              </div>

              {/* Live Telemetry / Heartbeat Bar */}
              <div className="grid grid-cols-3 gap-2 bg-slate-950/90 p-3 rounded-xl border border-slate-800 text-xs">
                {/* Battery */}
                <div className="flex items-center gap-2 text-slate-300">
                  {device.isCharging ? (
                    <BatteryCharging className="w-4 h-4 text-emerald-400 animate-pulse" />
                  ) : (
                    <Battery className="w-4 h-4 text-slate-400" />
                  )}
                  <div>
                    <span className="text-[10px] text-slate-500 block">البطارية</span>
                    <span className="font-bold text-white font-mono">{device.batteryLevel ?? 89}%</span>
                  </div>
                </div>

                {/* Network */}
                <div className="flex items-center gap-2 text-slate-300">
                  <Wifi className="w-4 h-4 text-indigo-400" />
                  <div>
                    <span className="text-[10px] text-slate-500 block">الشبكة</span>
                    <span className="font-bold text-white font-mono">{device.networkType || '4G_LTE'}</span>
                  </div>
                </div>

                {/* Ping / Heartbeat */}
                <div className="flex items-center gap-2 text-slate-300">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="text-[10px] text-slate-500 block">زمن الاستجابة</span>
                    <span className="font-bold text-emerald-400 font-mono">
                      {device.pingLatencyMs ? `${device.pingLatencyMs}ms` : '38ms'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detected SIM Cards Section (Dynamic discovery from Android app) */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Signal className="w-4 h-4 text-emerald-400" />
                    <span>الشرائح المكتشفة بالهاتف (SIM Cards):</span>
                  </span>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                    مزامنة تلقائية
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {simCards.length > 0 ? (
                    simCards.map((sim) => (
                      <div
                        key={sim.slotIndex}
                        className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded">
                              SIM {sim.slotIndex + 1}
                            </span>
                            <span className="text-xs font-semibold text-white">{sim.carrierName}</span>
                          </div>
                          <div className="text-xs font-mono font-bold text-emerald-400 tracking-wider" dir="ltr">
                            {sim.phoneNumber}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {sim.signalStrength ? `${sim.signalStrength}%` : '95%'}
                          </span>
                          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 text-xs text-slate-400 p-2 text-center">
                      يتم اكتشاف أرقام الـ SIM تلقائياً بمجرد تشغيل التطبيق على الهاتف.
                    </div>
                  )}
                </div>
              </div>

              {/* Bound Wallets Section */}
              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                    المحافظ المربوطة بالهاتف ({boundWalletIds.length}/2):
                  </span>
                  <button
                    onClick={() => handleOpenBinding(device)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-bold"
                  >
                    تعديل المحافظ
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {boundWallets.length === 0 ? (
                    <span className="text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                      لم يتم ربط محافظ بعد (اضغط تعديل لاختيار محفظة أو محفظتين)
                    </span>
                  ) : (
                    boundWallets.map((w, idx) => (
                      <span
                        key={w!.id}
                        className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/80 text-emerald-300 flex items-center gap-1.5"
                      >
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-400 font-bold px-1 rounded">
                          SIM {idx + 1}
                        </span>
                        <span>{w!.label}</span>
                        <span className="font-mono text-slate-400">({w!.identifier})</span>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Interactive Tools: Live Ping & Config */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleLivePing(device.id)}
                    disabled={pingingDeviceId === device.id}
                    className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
                  >
                    <Activity
                      className={`w-3.5 h-3.5 ${pingingDeviceId === device.id ? 'animate-spin' : ''}`}
                    />
                    <span>فحص الاتصال (Ping)</span>
                  </button>

                  <button
                    onClick={() => downloadAndroidConfig(device)}
                    className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تحميل Config</span>
                  </button>
                </div>

                <button
                  onClick={() => handleSimulateDisconnect(device.id)}
                  className="text-[10px] text-slate-500 hover:text-red-400 transition"
                  title="اختبار ظهور تنبيه انقطاع الاتصال"
                >
                  محاكاة الانقطاع للاختبار
                </button>
              </div>

              {/* Ping Result Toast */}
              {pingResult[device.id] && (
                <div className="p-2 bg-slate-950 border border-emerald-500/50 rounded-xl text-xs font-bold text-center animate-fadeIn text-emerald-300">
                  {pingResult[device.id]}
                </div>
              )}

              {/* Interactive Wallet Binding Drawer */}
              {isBindingThis && (
                <div className="mt-4 p-4 bg-slate-950 border border-indigo-500/40 rounded-2xl space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">
                      اختر المحافظ التي يستقبلها هذا الهاتف (حد أقصى 2):
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
                          onClick={() => handleToggleWallet(wallet.id)}
                          className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                            isSelected
                              ? 'bg-indigo-600/20 border-indigo-500 text-white'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Wallet className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                            <div>
                              <div className="text-xs font-bold">{wallet.label}</div>
                              <div className="text-[10px] font-mono opacity-80">{wallet.identifier}</div>
                            </div>
                          </div>
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center border ${
                              isSelected
                                ? 'bg-indigo-600 border-indigo-500 text-white'
                                : 'border-slate-700'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {feedback && (
                    <div className="text-xs text-amber-300 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                      {feedback}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => setBindingDeviceId(null)}
                      className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={() => handleSaveBinding(device.id)}
                      disabled={saving}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                    >
                      {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      <span>حفظ الربط</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
