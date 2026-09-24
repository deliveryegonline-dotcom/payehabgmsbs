import React from 'react';
import { Smartphone, Plus, CheckCircle2, Clock, ShieldCheck, Play, Radio } from 'lucide-react';
import type { Device } from '../types/index.ts';

interface DevicesTabProps {
  devices: Device[];
  onOpenPairModal: () => void;
  onOpenSimulator: () => void;
}

export const DevicesTab: React.FC<DevicesTabProps> = ({
  devices,
  onOpenPairModal,
  onOpenSimulator,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            الأجهزة وهواتف الاستقبال (Paired Devices)
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {devices.filter((d) => d.isPaired).length} جهاز نشط
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            الهواتف الذكية المزودة بشريحة فودافون/محفظة والمرتبطة لتمرير رسائل التحويل بتشفير HMAC
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onOpenSimulator}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition border border-slate-700/60"
          >
            <Play className="w-3.5 h-3.5 fill-current text-emerald-400" />
            تشغيل محاكي الهاتف
          </button>
          <button
            onClick={onOpenPairModal}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition shadow-lg shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" />
            ربط هاتف أندرويد جديد
          </button>
        </div>
      </div>

      {/* Devices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {devices.map((device) => (
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

            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-xs font-mono space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span>تاريخ الاقتران:</span>
                <span className="text-slate-200">
                  {device.pairedAt ? new Date(device.pairedAt).toLocaleDateString('ar-EG') : 'غير مقترن'}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>آخر استجابة (Last Seen):</span>
                <span className="text-slate-200">
                  {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleTimeString('ar-EG') : 'الآن'}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-400 pt-1 border-t border-slate-800/80">
                <span>مفتاح HMAC Secret:</span>
                <span className="text-emerald-400 font-bold">
                  {device.deviceSecret ? `${device.deviceSecret.slice(0, 12)}...` : 'محفوظ'}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              الرسائل الصادرة موقعة رقمياً وتُرفض في حال تجاوز 5 دقائق
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
