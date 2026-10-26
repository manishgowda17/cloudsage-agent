"use client";

import React from "react";
import { InvestigationHistoryItem } from "@/types";
import { History, ShieldCheck, ExternalLink } from "lucide-react";

interface InvestigationHistoryProps {
  items: InvestigationHistoryItem[];
  onSelect: (item: InvestigationHistoryItem) => void;
}

export const InvestigationHistory: React.FC<InvestigationHistoryProps> = ({
  items,
  onSelect,
}) => {
  if (!items || items.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
        <History className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <h4 className="text-sm font-medium text-slate-400">No Past Investigations</h4>
        <p className="text-xs text-slate-500 mt-1">
          Click &quot;Investigate Cluster&quot; to run an on-demand triage.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <History className="w-4 h-4 text-blue-400" />
          Recent Investigations
        </h3>
        <span className="text-xs text-slate-500">{items.length} records</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-800/40 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
              <th className="py-2.5 px-4">Time</th>
              <th className="py-2.5 px-4">Namespace</th>
              <th className="py-2.5 px-4">Root Cause</th>
              <th className="py-2.5 px-4">Confidence</th>
              <th className="py-2.5 px-4">Status</th>
              <th className="py-2.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {items.map((item, idx) => {
              const formattedDate = item.created_at
                ? new Date(item.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                : "Just now";

              return (
                <tr
                  key={item.id || idx}
                  className="hover:bg-slate-800/30 transition cursor-pointer group"
                  onClick={() => onSelect(item)}
                >
                  <td className="py-3 px-4 text-slate-400 font-mono whitespace-nowrap">
                    {formattedDate}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-300">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[11px]">
                      {item.namespace || "default"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-200 font-medium max-w-xs truncate">
                    {item.root_cause}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
                      <ShieldCheck className="w-3 h-3" />
                      {item.confidence || 90}%
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {item.status || "Completed"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button className="text-blue-400 hover:text-blue-300 text-xs font-medium inline-flex items-center gap-1 group-hover:underline">
                      View <ExternalLink className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
