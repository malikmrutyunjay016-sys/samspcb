import React from 'react';
import { FileSpreadsheet, Shield, Clock, User, Activity } from 'lucide-react';
import { AuditLog } from '../types';

interface AuditLogViewProps {
  auditLogs: AuditLog[];
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ auditLogs }) => {
  return (
    <div className="space-y-8 pb-16">
      
      <div className="bg-gradient-to-r from-amber-700 to-orange-800 rounded-3xl p-8 text-white shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-6 h-6 text-amber-200" />
          <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">Security Audit Trail</span>
        </div>
        <h2 className="text-3xl font-serif font-bold">System Data Change Audit Logs</h2>
        <p className="text-amber-100 text-sm mt-1">
          Complete immutable record tracking of all database changes, spot round applications, and HOD edits across users.
        </p>
      </div>

      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-amber-200 dark:border-stone-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-amber-50/80 dark:bg-stone-800/80 border-b border-amber-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs uppercase font-semibold">
                <th className="py-4 px-6">Timestamp</th>
                <th className="py-4 px-6">User / Admin</th>
                <th className="py-4 px-6">Action Type</th>
                <th className="py-4 px-6">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 dark:divide-stone-800 text-sm text-stone-800 dark:text-stone-200">
              {auditLogs.length > 0 ? (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-amber-50/40 dark:hover:bg-stone-800/50 transition-colors">
                    <td className="py-4 px-6 text-xs text-stone-500 font-mono whitespace-nowrap flex items-center gap-1.5 mt-1">
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                      {log.timestamp}
                    </td>
                    <td className="py-4 px-6 font-semibold text-xs flex items-center gap-2">
                      <User className="w-4 h-4 text-amber-700" />
                      <span>{log.userName}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2.5 py-1 bg-amber-100 dark:bg-stone-800 text-amber-900 dark:text-amber-300 font-bold text-xs rounded-full">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-xs text-stone-600 dark:text-stone-300">{log.details}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-stone-500">
                    No audit logs recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
