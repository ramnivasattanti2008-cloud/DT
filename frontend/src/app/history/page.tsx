"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { fetchExperiments } from "@/lib/api";
import { Experiment } from "@/lib/types";
import { History, Search, Filter, Trash2, ArrowUpRight, CheckCircle2, XCircle } from "lucide-react";

export default function HistoryPage() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterProtocol, setFilterProtocol] = useState("ALL");
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    fetchExperiments()
      .then((data) => {
        setExperiments(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm(`Are you sure you want to delete experiment ${id}?`)) return;
    try {
      await fetch(`/api/experiments/${id}`, { method: "DELETE" });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = experiments.filter((exp) => {
    const matchesSearch =
      exp.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.protocol.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesProtocol =
      filterProtocol === "ALL" ||
      (filterProtocol === "PROTOCOL_A" && exp.protocol.includes("Protocol A")) ||
      (filterProtocol === "PROTOCOL_B" && exp.protocol.includes("Protocol B"));

    return matchesSearch && matchesProtocol;
  });

  return (
    <div className="min-h-screen bg-[#FFFFFF]">
      <Header
        title="Experiment History"
        description="Searchable archive of all persisted evaluation experiments, audit logs, and benchmark runs."
      />

      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 border border-[#E5E5E5] rounded bg-[#FAFAFA]">
          <div className="relative w-full md:w-96">
            <Search size={14} className="absolute left-3 top-3 text-[#888888]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by experiment ID or name..."
              className="w-full pl-9 pr-3 py-2 text-xs font-mono border border-[#CCCCCC] rounded bg-[#FFFFFF] text-[#111111]"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <span className="text-xs text-[#666666]">Protocol Filter:</span>
            <select
              value={filterProtocol}
              onChange={(e) => setFilterProtocol(e.target.value)}
              className="px-3 py-2 text-xs font-mono border border-[#CCCCCC] rounded bg-[#FFFFFF] text-[#111111]"
            >
              <option value="ALL">All Protocols ({experiments.length})</option>
              <option value="PROTOCOL_B">Protocol B (SERC-Compliant)</option>
              <option value="PROTOCOL_A">Protocol A (Flawed Baseline)</option>
            </select>
          </div>
        </div>

        {/* Experiments Table */}
        <div className="border border-[#E5E5E5] rounded p-6 bg-[#FFFFFF]">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-[#111111]">
              Persisted Experiment Runs ({filtered.length})
            </h3>
          </div>

          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#888888] border border-dashed border-[#E5E5E5] rounded">
              No matching experiments found in database.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-monochrome">
                <thead>
                  <tr>
                    <th>Experiment ID</th>
                    <th>Protocol</th>
                    <th>Safety Status</th>
                    <th>RCS (%)</th>
                    <th>Quality Tier</th>
                    <th>Best F1</th>
                    <th>False Positive Rate (FPR)</th>
                    <th>TCR (lambda=99)</th>
                    <th>CARI</th>
                    <th>Executed</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-xs">
                  {filtered.map((exp) => (
                    <tr key={exp.id}>
                      <td className="font-bold text-[#111111]">
                        <Link href={`/reports?id=${exp.id}`} className="hover:underline flex items-center gap-1">
                          <span>{exp.id}</span>
                          <ArrowUpRight size={11} className="text-[#888888]" />
                        </Link>
                      </td>
                      <td>{exp.protocol}</td>
                      <td>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] border ${
                            exp.is_safe
                              ? "border-[#555555] bg-[#F7F7F7] text-[#111111]"
                              : "border-[#111111] bg-[#111111] text-[#FFFFFF]"
                          }`}
                        >
                          {exp.is_safe ? "SAFE" : "UNSAFE"}
                        </span>
                      </td>
                      <td>{exp.rcs_percentage != null ? `${exp.rcs_percentage.toFixed(0)}%` : "N/A"}</td>
                      <td>{exp.quality_tier || "N/A"}</td>
                      <td>{exp.best_f1 != null ? `${(exp.best_f1 * 100).toFixed(2)}%` : "N/A"}</td>
                      <td>{exp.best_fpr != null ? `${(exp.best_fpr * 100).toFixed(2)}%` : "N/A"}</td>
                      <td>{exp.best_tcr != null ? exp.best_tcr.toFixed(2) : "N/A"}</td>
                      <td>{exp.cari_score != null ? exp.cari_score.toFixed(4) : "N/A"}</td>
                      <td className="text-[11px] text-[#666666]">
                        {new Date(exp.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/reports?id=${exp.id}`}
                            className="text-xs text-[#111111] underline hover:text-[#555555]"
                          >
                            Report
                          </Link>
                          <button
                            onClick={() => handleDelete(exp.id)}
                            className="text-[#888888] hover:text-[#111111]"
                            title="Delete Experiment"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
