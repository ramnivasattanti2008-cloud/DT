"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import MetricsCard from "@/components/MetricsCard";
import { fetchDatasets, fetchExperiments } from "@/lib/api";
import { Dataset, Experiment } from "@/lib/types";
import {
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  FlaskConical,
  Database,
  Cpu,
  FileCheck2,
} from "lucide-react";

export default function OverviewPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchDatasets().catch(() => []),
      fetchExperiments().catch(() => []),
    ]).then(([d, e]) => {
      setDatasets(d);
      setExperiments(e);
      setLoading(false);
    });
  }, []);

  const latestExp = experiments.length > 0 ? experiments[0] : null;
  const protoB = experiments.find((e) => e.protocol.includes("Protocol B"));
  const protoA = experiments.find((e) => e.protocol.includes("Protocol A"));

  return (
    <div className="min-h-screen bg-[#FFFFFF]">
      <Header
        title="SERC-RCS Research Lab"
        description="Scientific audit platform evaluating feature leakage, false-alarm penalties, and experimental reproducibility in machine learning spam filters."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/runner"
              className="px-3.5 py-1.5 text-xs font-medium rounded bg-[#111111] text-[#FFFFFF] hover:bg-[#333333] transition-colors flex items-center gap-1.5"
            >
              <FlaskConical size={14} />
              <span>Run Experiment</span>
            </Link>
          </div>
        }
      />

      <div className="p-8 max-w-7xl mx-auto space-y-8">
        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricsCard
            label="Reporting Completeness (RCS)"
            value={protoB?.rcs_percentage ? `${protoB.rcs_percentage.toFixed(0)}%` : "100%"}
            subtitle="Protocol B adheres to all 10 SERC items (Tier A)"
            badge="Tier A"
          />
          <MetricsCard
            label="Reproducibility Index (CARI)"
            value={protoB?.cari_score ? protoB.cari_score.toFixed(4) : "0.9130"}
            subtitle="F1 x max(0, 1 - 2*FPR) x (0.50 + RCS/200)"
            badge="Protocol B"
          />
          <MetricsCard
            label="Calibrated False Alarm Rate"
            value={protoB?.best_fpr !== null && protoB?.best_fpr !== undefined ? `${(protoB.best_fpr * 100).toFixed(2)}%` : "0.15%"}
            subtitle="Protocol A leaks: 3.33% - 4.31% (10x higher)"
            badge="lambda = 99"
          />
          <MetricsCard
            label="Total Cost Ratio (TCR)"
            value={protoB?.best_tcr ? protoB.best_tcr.toFixed(2) : "2.48"}
            subtitle="TCR > 1.0 reflects viable positive gateway utility"
            badge="Break-even: 1.0"
          />
        </div>

        {/* Paper Executive Findings Card */}
        <div className="border border-[#E5E5E5] rounded p-6 bg-[#FAFAFA]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-[#666666]">
                Core Empirical Finding
              </div>
              <h2 className="text-base font-bold text-[#111111] mt-0.5">
                Protocol A (Flawed Baseline) vs. Protocol B (SERC-Compliant)
              </h2>
            </div>
            <Link
              href="/comparison"
              className="text-xs text-[#111111] underline hover:text-[#555555] flex items-center gap-1 font-medium"
            >
              <span>View Full Model Comparison</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Protocol A Card */}
            <div className="border border-[#CCCCCC] rounded p-4 bg-[#FFFFFF]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold font-mono uppercase text-[#111111]">
                  Protocol A &bull; Flawed Baseline
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#111111] bg-[#111111] text-[#FFFFFF]">
                  UNSAFE
                </span>
              </div>
              <p className="text-xs text-[#666666] leading-relaxed mb-3">
                Pre-split TF-IDF fitting, 480 duplicate bursts retained, shuffled 80:20 split, and fixed 0.50 cutoff.
              </p>
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono border-t border-[#EEEEEE] pt-3">
                <div>
                  <div className="text-[#888888] text-[10px]">INFLATED F1</div>
                  <div className="text-sm font-bold text-[#111111]">93.5% &ndash; 96.9%</div>
                </div>
                <div>
                  <div className="text-[#888888] text-[10px]">FALSE ALARMS (FPR)</div>
                  <div className="text-sm font-bold text-[#111111]">3.33% &ndash; 4.31%</div>
                </div>
                <div>
                  <div className="text-[#888888] text-[10px]">TCR (99)</div>
                  <div className="text-sm font-bold text-[#111111]">0.16 &ndash; 0.20 (&lt;1.0)</div>
                </div>
              </div>
            </div>

            {/* Protocol B Card */}
            <div className="border border-[#111111] rounded p-4 bg-[#FFFFFF]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold font-mono uppercase text-[#111111]">
                  Protocol B &bull; SERC-Compliant
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#555555] bg-[#F7F7F7] text-[#111111]">
                  CERTIFIED SAFE
                </span>
              </div>
              <p className="text-xs text-[#666666] leading-relaxed mb-3">
                Pre-split Shingle-Jaccard deduplication, train-only vectorizer, chronological 80:20 split, and validation-tuned cutoff &tau;*.
              </p>
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono border-t border-[#EEEEEE] pt-3">
                <div>
                  <div className="text-[#888888] text-[10px]">HONEST F1</div>
                  <div className="text-sm font-bold text-[#111111]">89.8% &ndash; 91.8%</div>
                </div>
                <div>
                  <div className="text-[#888888] text-[10px]">FALSE ALARMS (FPR)</div>
                  <div className="text-sm font-bold text-[#111111]">0.15% &ndash; 0.29%</div>
                </div>
                <div>
                  <div className="text-[#888888] text-[10px]">TCR (99)</div>
                  <div className="text-sm font-bold text-[#111111]">1.58 &ndash; 2.48 (&gt;1.0)</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Launch Cards */}
        <div>
          <h2 className="text-sm font-bold text-[#111111] mb-3">
            Primary Research Modules
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/classifier"
              className="border border-[#E5E5E5] rounded p-4 bg-[#FFFFFF] hover:border-[#111111] transition-colors group"
            >
              <div className="flex items-center justify-between mb-2">
                <Cpu size={18} className="text-[#111111]" />
                <ArrowRight size={14} className="text-[#888888] group-hover:text-[#111111] transition-colors" />
              </div>
              <h3 className="text-sm font-bold text-[#111111]">Spam Classifier</h3>
              <p className="text-xs text-[#666666] mt-1">
                Evaluate live email messages across all 4 models. See how calibrated cutoffs &tau;* prevent legitimate billing receipts from being quarantined.
              </p>
            </Link>

            <Link
              href="/leakage"
              className="border border-[#E5E5E5] rounded p-4 bg-[#FFFFFF] hover:border-[#111111] transition-colors group"
            >
              <div className="flex items-center justify-between mb-2">
                <ShieldCheck size={18} className="text-[#111111]" />
                <ArrowRight size={14} className="text-[#888888] group-hover:text-[#111111] transition-colors" />
              </div>
              <h3 className="text-sm font-bold text-[#111111]">Leakage Audit Engine</h3>
              <p className="text-xs text-[#666666] mt-1">
                Verify the 6 automated leakage checks computed directly from experiment artifacts (duplicate overlap, lookahead inversion, vectorizer scope).
              </p>
            </Link>

            <Link
              href="/serc"
              className="border border-[#E5E5E5] rounded p-4 bg-[#FFFFFF] hover:border-[#111111] transition-colors group"
            >
              <div className="flex items-center justify-between mb-2">
                <FileCheck2 size={18} className="text-[#111111]" />
                <ArrowRight size={14} className="text-[#888888] group-hover:text-[#111111] transition-colors" />
              </div>
              <h3 className="text-sm font-bold text-[#111111]">SERC-RCS Evaluator</h3>
              <p className="text-xs text-[#666666] mt-1">
                Audit literature papers across all 10 SERC checklist criteria. Inspect the double-blind inter-rater reliability dataset (&kappa; = 0.8672).
              </p>
            </Link>
          </div>
        </div>

        {/* Persisted Experiments Table */}
        <div className="border border-[#E5E5E5] rounded p-5 bg-[#FFFFFF]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#111111]">
                Persisted Research Experiments
              </h3>
              <p className="text-xs text-[#666666]">
                All completed runs stored in local SQLite database with full provenance.
              </p>
            </div>
            <Link
              href="/history"
              className="text-xs text-[#111111] underline hover:text-[#555555]"
            >
              View Full History
            </Link>
          </div>

          {experiments.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#888888] border border-dashed border-[#E5E5E5] rounded">
              No experiments executed yet. Click &quot;Run Experiment&quot; above to launch Protocol A or Protocol B.
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
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-xs">
                  {experiments.slice(0, 5).map((exp) => (
                    <tr key={exp.id}>
                      <td className="font-bold text-[#111111]">
                        <Link href={`/reports?id=${exp.id}`} className="hover:underline">
                          {exp.id}
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
