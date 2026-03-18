"use client";

import { useState, useEffect } from "react";
import { adminApi } from "@/lib/api";

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = (await adminApi.getAuditLog("limit=50&page=1")) as any;
    if (data) {
      setLogs(data.logs);
      setTotal(data.total);
    }
    setLoading(false);
  };

  const getActionColor = (action: string) => {
    if (action.includes("LOGIN")) return "bg-blue-100 text-blue-800";
    if (action.includes("ORDER")) return "bg-orange-100 text-orange-800";
    if (action.includes("MENU")) return "bg-purple-100 text-purple-800";
    if (action.includes("RESTAURANT")) return "bg-green-100 text-green-800";
    if (action.includes("REFUND")) return "bg-red-100 text-red-800";
    return "bg-zinc-100 text-zinc-800";
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-zinc-900">Audit Log</h1>
        <div className="text-sm font-bold text-zinc-500">
          {total} total events
        </div>
      </div>

      <div className="bg-white rounded-[12px] border border-zinc-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-zinc-500">
            Loading records...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F9F9F9] border-b border-zinc-100">
                  <th className="py-3 px-6 text-[11px] font-black text-zinc-400 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="py-3 px-6 text-[11px] font-black text-zinc-400 uppercase tracking-wider">
                    Admin
                  </th>
                  <th className="py-3 px-6 text-[11px] font-black text-zinc-400 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="py-3 px-6 text-[11px] font-black text-zinc-400 uppercase tracking-wider">
                    Target
                  </th>
                  <th className="py-3 px-6 text-[11px] font-black text-zinc-400 uppercase tracking-wider">
                    IP Address
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-zinc-50">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-zinc-50/50 transition-colors"
                  >
                    <td className="py-4 px-6 text-zinc-500 font-medium whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("tr-TR")}
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-bold text-zinc-900">
                        {log.admin?.display_name || "Unknown"}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {log.admin?.email || "N/A"}
                      </p>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${getActionColor(log.action)}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-zinc-600">{log.target_type}</p>
                      {log.target_id && (
                        <p className="text-xs font-mono text-zinc-400">
                          {log.target_id.slice(0, 8)}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-6 text-zinc-500 font-mono text-xs">
                      {log.ip_address || "127.0.0.1"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
