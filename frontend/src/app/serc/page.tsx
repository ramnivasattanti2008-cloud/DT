"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import MetricsCard from "@/components/MetricsCard";
import {
  fetchChecklist,
  calculateSercCari,
  fetchHistoricalStudies,
  fetchInterRaterStats,
} from "@/lib/api";
import { HistoricalStudy, InterRaterStats } from "@/lib/types";
import { CheckSquare, Calculator, FileSpreadsheet, Users, HelpCircle } from "lucide-react";

export default function SercEvaluatorPage() {
  const [criteria, setCriteria] = useState<any[]>([]);
  const [studies, setStudies] = useState<HistoricalStudy[]>([]);
  const [interRater, setInterRater] = useState<InterRaterStats | null>(null);

  // Worksheet state for C1 - C10
  const [grades, setGrades] = useState<Record<string, string>>({
    C1: "1.0",
    C2: "1.0",
    C3: "1.0",
    C4: "1.0",
    C5: "1.0",
    C6: "1.0",
    C7: "1.0",
    C8: "1.0",
    C9: "1.0",
    C10: "1.0",
  });
  const [f1Score, setF1Score] = useState(0.9184);
  const [fprScore, setFprScore] = useState(0.0029);
  const [calcResult, setCalcResult] = useState<any>(null);

  useEffect(() => {
    fetchChecklist().then((c) => {
      setCriteria(c);
      const initial: Record<string, string> = {};
      c.forEach((item: any) => {
        initial[item.item_id] = "1.0";
      });
      setGrades(initial);
      recalc(initial, f1Score, fprScore);
    });

    fetchHistoricalStudies().then(setStudies);
    fetchInterRaterStats().then(setInterRater);
  }, []);

  const recalc = (currentGrades: Record<string, string>, f1: number, fpr: number) => {
    calculateSercCari({
      grades: currentGrades,
      f1_score: f1,
      fpr: fpr,
      omega: 2.0,
    }).then(setCalcResult);
  };

  const handleGradeChange = (itemId: string, grade: string) => {
    const updated = { ...grades, [itemId]: grade };
    setGrades(updated);
    recalc(updated, f1Score, fprScore);
  };

  const loadPresetProtocolB = () => {
    const pB: Record<string, string> = {};
    criteria.forEach((c) => { pB[c.item_id] = "1.0"; });
    setGrades(pB);
    setF1Score(0.9184);
    setFprScore(0.0029);
    recalc(pB, 0.9184, 0.0029);
  };

  const loadPresetProtocolA = () => {
    const pA: Record<string, string> = {
      C1: "0.0", // 480 duplicates retained
      C2: "0.0", // Global pre-split TF-IDF fit
      C3: "1.0", // Shuffled stratified 80:20
      C4: "1.0", // Documented models
      C5: "1.0", // Multi-metric
      C6: "1.0", // Matrix reported
      C7: "0.0", // Fixed 0.50 cutoff
      C8: "0.0", // No drift check
      C9: "0.0", // No repo
      C10: "0.0", // No scope section
    };
    setGrades(pA);
    setF1Score(0.9687);
    setFprScore(0.0431);
    recalc(pA, 0.9687, 0.0431);
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF]">
      <Header
        title="SERC-RCS Evaluator &amp; CARI Calculator"
        description="Audit email spam filtering manuscripts across the 10-Item SERC checklist, calculate live RCS, and compute the Cost-Adjusted Reproducibility Index (CARI)."
      />

      <div className="p-8 max-w-7xl mx-auto space-y-8">
        {/* Top Calculator Results Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricsCard
            label="Points Earned (S_raw)"
            value={calcResult ? `${calcResult.points_earned} / ${calcResult.applicable_count}` : "10 / 10"}
            subtitle="Sum of applicable criterion grades"
          />
          <MetricsCard
            label="Reporting Score (RCS)"
            value={calcResult && calcResult.rcs_percentage !== null ? `${calcResult.rcs_percentage}%` : "100%"}
            subtitle="Percentage transparency score"
            badge={calcResult?.quality_tier || "Tier A"}
          />
          <MetricsCard
            label="Quality Tier"
            value={calcResult?.quality_tier || "Tier A"}
            subtitle="Tier A >= 80%, Tier B >= 60%, Tier C >= 40%"
          />
          <MetricsCard
            label="CARI Composite Index"
            value={calcResult?.cari_score !== null && calcResult?.cari_score !== undefined ? calcResult.cari_score.toFixed(4) : "0.9130"}
            subtitle="F1 x max(0, 1 - 2*FPR) x (0.50 + RCS/200)"
            badge="Cost-Adjusted"
          />
        </div>

        {/* Interactive Worksheet & Presets */}
        <div className="border border-[#E5E5E5] rounded p-6 bg-[#FFFFFF]">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-[#EEEEEE] gap-4">
            <div>
              <h2 className="text-sm font-bold text-[#111111] uppercase font-mono tracking-wider">
                10-Item SERC Verification Worksheet
              </h2>
              <p className="text-xs text-[#666666]">
                Grade any study across data hygiene, isolated preprocessing, split design, false alarms, and drift.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadPresetProtocolB}
                className="px-3 py-1 text-xs font-mono border border-[#111111] rounded hover:bg-[#F0F0F0] text-[#111111]"
              >
                Load Protocol B Preset (100% RCS)
              </button>
              <button
                onClick={loadPresetProtocolA}
                className="px-3 py-1 text-xs font-mono border border-[#CCCCCC] rounded hover:bg-[#F0F0F0] text-[#666666]"
              >
                Load Protocol A Preset (40% RCS)
              </button>
            </div>
          </div>

          {/* Metric Inputs for CARI */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 border-b border-[#EEEEEE] bg-[#FAFAFA] p-4 rounded mt-4">
            <div>
              <label className="text-xs font-bold font-mono text-[#111111] block mb-1">
                Reported F1-Score (0 &ndash; 1.0):
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                max="1"
                value={f1Score}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setF1Score(val);
                  recalc(grades, val, fprScore);
                }}
                className="w-full p-2 text-xs font-mono border border-[#CCCCCC] rounded bg-[#FFFFFF] text-[#111111]"
              />
            </div>
            <div>
              <label className="text-xs font-bold font-mono text-[#111111] block mb-1">
                Reported False Positive Rate (FPR, 0 &ndash; 1.0):
              </label>
              <input
                type="number"
                step="0.0005"
                min="0"
                max="1"
                value={fprScore}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setFprScore(val);
                  recalc(grades, f1Score, val);
                }}
                className="w-full p-2 text-xs font-mono border border-[#CCCCCC] rounded bg-[#FFFFFF] text-[#111111]"
              />
            </div>
          </div>

          {/* Checklist Items List */}
          <div className="divide-y divide-[#EEEEEE] mt-4">
            {criteria.map((c) => {
              const currentGrade = grades[c.item_id] || "1.0";

              return (
                <div key={c.item_id} className="py-4 space-y-2">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded border border-[#111111] bg-[#111111] text-[#FFFFFF]">
                        {c.item_id}
                      </span>
                      <h3 className="text-xs font-bold text-[#111111]">{c.name}</h3>
                    </div>

                    {/* Radio Grading Buttons */}
                    <div className="flex items-center gap-4 text-xs font-mono">
                      {[
                        { val: "1.0", label: "Full (1.0)" },
                        { val: "0.5", label: "Partial (0.5)" },
                        { val: "0.0", label: "Omitted (0.0)" },
                        { val: "NA", label: "N/A" },
                      ].map((opt) => (
                        <label key={opt.val} className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name={`grade_${c.item_id}`}
                            value={opt.val}
                            checked={currentGrade === opt.val}
                            onChange={() => handleGradeChange(c.item_id, opt.val)}
                            className="accent-[#111111]"
                          />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-[#555555] leading-relaxed">
                    <strong>Requirement:</strong> {c.description}
                  </p>
                  <p className="text-[11px] text-[#777777]">
                    <strong>Why it matters:</strong> {c.importance}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Double-Blind Inter-Rater Reliability Panel */}
        {interRater && (
          <div className="border border-[#E5E5E5] rounded p-6 bg-[#FAFAFA]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-[#111111] uppercase font-mono tracking-wider">
                  Double-Blind Inter-Rater Reliability Verification
                </h3>
                <p className="text-xs text-[#666666]">
                  Statistical audit across 20 primary studies &times; 10 criteria = 200 paired evaluations (Rater 1: R.A., Rater 2: S.P., Consensus: M.N.S.).
                </p>
              </div>
              <span className="px-2.5 py-1 text-xs font-mono border border-[#111111] bg-[#FFFFFF] rounded">
                &kappa; = {interRater.cohens_kappa_unweighted.toFixed(4)}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 border border-[#CCCCCC] rounded bg-[#FFFFFF]">
                <div className="text-[10px] text-[#888888]">RAW AGREEMENT</div>
                <div className="font-bold text-sm text-[#111111] mt-0.5">
                  {interRater.exact_agreement_pct.toFixed(2)}% (183 / 200)
                </div>
              </div>
              <div className="p-3 border border-[#CCCCCC] rounded bg-[#FFFFFF]">
                <div className="text-[10px] text-[#888888]">UNWEIGHTED KAPPA</div>
                <div className="font-bold text-sm text-[#111111] mt-0.5">
                  &kappa; = {interRater.cohens_kappa_unweighted.toFixed(4)}
                </div>
              </div>
              <div className="p-3 border border-[#CCCCCC] rounded bg-[#FFFFFF]">
                <div className="text-[10px] text-[#888888]">WEIGHTED KAPPA (&kappa;_w)</div>
                <div className="font-bold text-sm text-[#111111] mt-0.5">
                  &kappa;_w = {interRater.cohens_kappa_weighted.toFixed(4)}
                </div>
              </div>
              <div className="p-3 border border-[#CCCCCC] rounded bg-[#FFFFFF]">
                <div className="text-[10px] text-[#888888]">95% CONFIDENCE INTERVAL</div>
                <div className="font-bold text-sm text-[#111111] mt-0.5">
                  [{interRater.ci_95[0].toFixed(4)}, {interRater.ci_95[1].toFixed(4)}]
                </div>
              </div>
            </div>

            <div className="mt-3 text-xs text-[#666666] leading-relaxed">
              <strong>Historical Era Regression:</strong> Foundational era papers (1999&ndash;2009, n=7) averaged{" "}
              <strong>{interRater.foundational_mean_rcs.toFixed(2)}% RCS</strong>, whereas contemporary papers (2016&ndash;2023, n=12) dropped to{" "}
              <strong>{interRater.contemporary_mean_rcs.toFixed(2)}% RCS</strong> (Welch&apos;s t = {interRater.welch_t_stat.toFixed(4)}, p = {interRater.welch_p_val.toFixed(5)}; Mann-Whitney U = {interRater.mann_whitney_u}, p = {interRater.mann_whitney_p_val.toFixed(5)}).
            </div>
          </div>
        )}

        {/* Table 5: 20 Primary Audited Studies Matrix */}
        <div className="border border-[#E5E5E5] rounded p-6 bg-[#FFFFFF]">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-[#111111]">
              Table 5: Longitudinal SERC Matrix (20 Audited Studies, 1999&ndash;2023)
            </h3>
            <p className="text-xs text-[#666666]">
              Consensus point scores (1.0 = Reported, 0.5 = Partial, 0.0 = Omitted) showing widespread post-2015 drops in cutoff tuning (C7) and drift testing (C8).
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="table-monochrome">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Audited Study</th>
                  <th>Era</th>
                  <th>Dataset</th>
                  <th>C1</th>
                  <th>C2</th>
                  <th>C3</th>
                  <th>C4</th>
                  <th>C5</th>
                  <th>C6</th>
                  <th>C7</th>
                  <th>C8</th>
                  <th>C9</th>
                  <th>C10</th>
                  <th>RCS (%)</th>
                  <th>Quality Tier</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {studies.map((s) => (
                  <tr key={s.study_id}>
                    <td>{s.study_id}</td>
                    <td className="font-bold font-sans text-xs text-[#111111]">{s.study}</td>
                    <td className="font-sans text-[11px] text-[#666666]">{s.era}</td>
                    <td className="font-sans text-[11px]">{s.primary_dataset}</td>
                    <td>{s.c1.toFixed(1)}</td>
                    <td>{s.c2.toFixed(1)}</td>
                    <td>{s.c3.toFixed(1)}</td>
                    <td>{s.c4.toFixed(1)}</td>
                    <td>{s.c5.toFixed(1)}</td>
                    <td>{s.c6.toFixed(1)}</td>
                    <td>{s.c7.toFixed(1)}</td>
                    <td>{s.c8.toFixed(1)}</td>
                    <td>{s.c9.toFixed(1)}</td>
                    <td>{s.c10.toFixed(1)}</td>
                    <td className="font-bold">{s.rcs_pct.toFixed(1)}%</td>
                    <td>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] border ${
                          s.tier === "Tier A"
                            ? "border-[#111111] bg-[#111111] text-[#FFFFFF]"
                            : s.tier === "Tier B"
                            ? "border-[#555555] bg-[#F7F7F7] text-[#111111]"
                            : "border-[#CCCCCC] bg-[#FFFFFF] text-[#666666]"
                        }`}
                      >
                        {s.tier}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
