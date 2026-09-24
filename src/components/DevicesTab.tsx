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
  Copy,
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

    const config = {
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
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ehabgm-config-${device.id.slice(-6)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>الأجهزة وهواتف الاستقبال وتطبيق الأندرويد</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {devices.filter((d) => d.isPaired).length} جهاز نشط
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            كل هاتف يقرأ شريحة أو شريحتين (SIM 1 + SIM 2)، ويرتبط بحد أقصى بمحفظة أو محفظتين لتمرير إشعارات التحويل المشفرة فورياً.
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

      {/* Notice Card: 1 Phone = Max 2 Wallets */}
      <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl flex items-start gap-3 text-xs text-emerald-200">
        <Smartphone className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block text-emerald-300">
            قاعدة الربط الذكية: كل هاتف = رقم محفظة أو رقمين كحد أقصى (SIM 1 / SIM 2)
          </span>
          <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
            لضمان سرعة المطابقة التلقائية بالقروش الفريدة، يتم ربط كل هاتف بمحفظة واحدة (Single SIM) أو محفظتين (Dual SIM كفودافون كاش وإنستاباي). يتم تمرير الرسائل بتشفير HMAC-SHA256 خلال أقل من ثانية واحدة.
          </p>
        </div>
      </div>

      {/* Devices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {devices.map((device) => {
          const boundWalletIds = device.boundWalletIds || [];
          const boundWallets = boundWalletIds
            .map((id) => wallets.find((w) => w.id === id))
            .filter(Boolean);

          const isBindingThis = bindingDeviceId === device.id;

          return (
            <div
              key={device.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 shadow-xl transition space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{device.deviceName}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                      <span>ID: {device.id.slice(0, 14)}...</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold px-2.5 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>متصل وجاهز</span>
                </div>
              </div>

              {/* Bound Wallets Section */}
              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                    المحافظ المرتبطة بالهاتف ({boundWalletIds.length}/2):
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
                        className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700/80 text-emerald-300 flex items-center gap-1"
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

              {/* Device metadata */}
              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-xs font-mono space-y-2">
                <div className="flex justify-between items-center text-slate-400">
                  <span>تاريخ الاقتران:</span>
                  <span className="text-slate-200">
                    {device.pairedAt ? new Date(device.pairedAt).toLocaleDateString('ar-EG') : 'غير مقترن'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>آخر استجابة:</span>
                  <span className="text-slate-200">
                    {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleTimeString('ar-EG') : 'الآن'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-400 pt-1 border-t border-slate-800/80">
                  <span>سر الجهاز (HMAC Secret):</span>
                  <span className="text-emerald-400 font-bold">
                    {device.deviceSecret ? `${device.deviceSecret.slice(0, 12)}...` : 'محفوظ'}
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => downloadAndroidConfig(device)}
                  className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تحميل ملف إعدادات الأندرويد</span>
                </button>

                <div className="text-[11px] text-slate-500 flex items-center gap-1 font-sans">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>موقع بـ HMAC-SHA256</span>
                </div>
              </div>

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
