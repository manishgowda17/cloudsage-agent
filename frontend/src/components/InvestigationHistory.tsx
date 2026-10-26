"use client";

import React, { useState } from "react";
import { InvestigationHistoryItem } from "@/types";
import { History, ShieldCheck, ExternalLink, Search, Clock } from "lucide-react";

interface InvestigationHistoryProps {
  items: InvestigationHistoryItem[];
  onSelect: (item: InvestigationHistoryItem) => void;
}

export const InvestigationHistory: React.FC<InvestigationHistoryProps> = ({
  items,
  onSelect,
}) => {
  const [search, setSearch] = useState("");

  const filteredItems = items.filter(
    (it) =>
      it.root_cause.toLowerCase().includes(search.toLowerCase()) ||
      (it.namespace && it.namespace.toLowerCase().includes(search.toLowerCase()))
  );

  if (!items || items.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-8 text-center shadow-luminous">
        <History className="w-8 h-8 text-slate-400 mx-auto mb-2.5 opacity-60" />
        <h4 className="text-sm font-bold text-slate-800">
          No Past Investigations Recorded
        </h4>
        <p className="text-xs text-slate-500 mt-1">
          Click &quot;Investigate Cluster&quot; to execute your first triage cycle.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-2xl overflow-hidden shadow-luminous">
      <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600" />
            Recent Investigation History
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Past cluster diagnoses persisted securely via InsForge database
          </p>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Filter investigations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
              <th className="py-3 px-6">Timestamp</th>
              <th className="py-3 px-4">Namespace</th>
              <th className="py-3 px-4">Root Cause</th>
              <th className="py-3 px-4">Confidence</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-6 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredItems.map((item, idx) => {
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
                  className="hover:bg-blue-50/40 transition cursor-pointer group"
                  onClick={() => onSelect(item)}
                >
                  <td className="py-3.5 px-6 text-slate-500 font-mono whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {formattedDate}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-700">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-[11px] font-semibold border border-slate-200">
                      {item.namespace || "default"}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-900 font-bold max-w-xs truncate">
                    {item.root_cause}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      {item.confidence || 90}%
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {item.status || "Completed"}
                    </span>
                  </td>
                  <td className="py-3.5 px-6 text-right">
                    <button className="text-blue-600 hover:text-blue-700 text-xs font-bold inline-flex items-center gap-1 group-hover:translate-x-0.5 transition">
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
