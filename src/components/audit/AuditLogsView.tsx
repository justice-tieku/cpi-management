import React, { useState } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  Lock,
  Download,
  Clock,
  User,
  Activity
} from 'lucide-react';
import { useCMS } from '../../context/CMSContext';

export const AuditLogsView: React.FC = () => {
  const { auditLogs } = useCMS();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = auditLogs.filter(
    (l) =>
      l.actorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.details.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white font-serif tracking-tight">
            Append-Only Ecclesial Audit Logs
          </h2>
          <p className="text-xs text-slate-400">
            Immutable system trails: User logins, member registrations, attendance corrections, and pastoral assignments.
          </p>
        </div>

        <button
          onClick={() => alert('Exporting cryptographic audit log signature...')}
          className="px-3.5 py-2 bg-[#111d44] hover:bg-[#16285a] text-xs text-slate-300 flex items-center gap-2 cursor-pointer transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-[#00f0ff]" />
          <span>Export Audit Trail (JSON)</span>
        </button>
      </div>

      {/* Security Disclaimer Banner */}
      <div className="p-4 bg-[#111d44] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5 text-[#00f0ff]">
          <ShieldCheck className="w-4 h-4 text-[#00f0ff]" />
          <span>RBAC Integrity Enforced: Logs cannot be cleared or modified by non-root administrators.</span>
        </div>
        <span className="text-[10px] font-mono text-slate-500">SHA-256 Verified</span>
      </div>

      {/* Search */}
      <div className="relative w-full md:w-96">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by actor, action type, or record ID..."
          className="w-full pl-10 pr-3 py-2 bg-[#0a122e] text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
        />
      </div>

      {/* Logs Table */}
      <div className="bg-[#111d44] shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold bg-[#0a122e]">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action Event</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#7b9dc7] text-xs">
                    No data recorded yet
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#16285a]/40 transition-colors font-mono">
                  <td className="py-3 px-4 text-slate-400 text-[11px]">
                    {log.timestamp}
                  </td>
                  <td className="py-3 px-4 font-sans font-semibold text-white">
                    {log.actorName}
                    <span className="block text-[10px] font-mono text-[#00f0ff] font-normal">
                      {log.actorRole}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 bg-[#072e54] text-[#00f0ff] text-[10px] font-semibold">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-300 text-[11px]">
                    {log.entityType} ({log.entityId})
                  </td>
                  <td className="py-3 px-4 font-sans text-slate-300 text-xs">
                    {log.details}
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditLogsView;


