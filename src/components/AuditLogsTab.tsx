import React from 'react';
import { ShieldCheck, User, Clock } from 'lucide-react';
import type { AuditLog } from '../types/index.ts';

interface AuditLogsTabProps {
  logs: AuditLog[];
}

export const AuditLogsTab: React.FC<AuditLogsTabProps> = ({ logs }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          سجل تدقيق الأمان والنظام (Audit Trail)
        </h2>
        <p className="text-xs text-slate-400">
          توثيق وتتبع غير قابل للتعديل لجميع العمليات الحساسة واقتران الأجهزة وتأكيدات المدفوعات
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
            <tr>
              <th className="p-3.5">المنفذ (Actor)</th>
              <th className="p-3.5">العملية (Action)</th>
              <th className="p-3.5">التفاصيل (Payload / Metadata)</th>
              <th className="p-3.5">التوقيت</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-800/40">
                <td className="p-3.5">
                  <div className="flex items-center gap-1.5 text-white font-bold">
                    <User className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{log.actor}</span>
                  </div>
                </td>
                <td className="p-3.5">
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-emerald-400 border border-slate-700 font-bold">
                    {log.action}
                  </span>
                </td>
                <td className="p-3.5 text-slate-300 max-w-md truncate">
                  {log.details ? JSON.stringify(log.details) : '-'}
                </td>
                <td className="p-3.5 text-slate-400 text-[11px] font-sans">
                  {new Date(log.createdAt).toLocaleString('ar-EG')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
