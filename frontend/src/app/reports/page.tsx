"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import MetricsCard from "@/components/MetricsCard";
import ConfusionMatrixView from "@/components/ConfusionMatrixView";
import { fetchExperiments, fetchExperiment } from "@/lib/api";
import { Experiment } from "@/lib/types";
import {
  Download,
  FileText,
  Printer,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Layers,
} from "lucide-react";

function ReportsContent() {
  const searchParams = useSearchParams();
  const queryId = searchParams.get("id");

  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [selectedExp, setSelectedExp] = useState<Experiment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExperiments().then((exps) => {
      setExperiments(exps);
      if (exps.length > 0) {
        const target = queryId ? exps.find((e) => e.id === queryId) || exps[0] : exps[0];
        fetchExperiment(target.id).then((full) => {
          setSelectedExp(full);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
  }, [queryId]);

  const handleSelectExp = (id: string) => {
    setLoading(true);
    fetchExperiment(id).then((full) => {
      setSelectedExp(full);
      setLoading(false);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFFFF] p-8">
        <div className="text-xs font-mono text-[#888888]">Loading research report...</div>
      </div>
    );
  }

  if (!selectedExp) {
    return (
      <div className="min-h-screen bg-[#FFFFFF] p-8">
        <Header title="Research Reports" />
        <div className="p-8 text-center text-xs text-[#888888] border border-dashed border-[#E5E5E5] rounded mt-8">
          No experiments available to report. Launch an experiment in the Experiment Runner first.
        </div>
      </div>
    );
  }

  const bestModel = selectedExp.model_results?.length > 0 ? selectedExp.model_results[0] : null;

  return (
    <div className="min-h-screen bg-[#FFFFFF]">
      <Header
        title="Research Verification Report"
        description="Comprehensive audit report documenting dataset provenance, leakage verification, false-alarm budgets, and SERC-RCS reproducible scores."
        actions={
          <div className="flex items-center gap-2">
            <a
              href={`/api/reports/experiment/${selectedExp.id}/json`}
              className="px-3 py-1.5 text-xs font-medium border border-[#CCCCCC] rounded hover:bg-[#F0F0F0] text-[#111111] flex items-center gap-1.5 transition-colors"
            >
              <Download size={13} />
              <span>JSON</span>
            </a>
            <a
              href={`/api/reports/experiment/${selectedExp.id}/csv`}
              className="px-3 py-1.5 text-xs font-medium border border-[#CCCCCC] rounded hover:bg-[#F0F0F0] text-[#111111] flex items-center gap-1.5 transition-colors"
            >
              <Download size={13} />
              <span>Safe CSV</span>
            </a>
            <a
              href={`/api/reports/experiment/${selectedExp.id}/latex`}
              className="px-3 py-1.5 text-xs font-medium border border-[#CCCCCC] rounded hover:bg-[#F0F0F0] text-[#111111] flex items-center gap-1.5 transition-colors"
            >
              <FileText size={13} />
              <span>LaTeX / BibTeX</span>
            </a>
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 text-xs font-medium rounded bg-[#111111] text-[#FFFFFF] hover:bg-[#333333] transition-colors flex items-center gap-1.5"
            >
              <Printer size={13} />
              <span>Print / PDF</span>
            </button>
          </div>
        }
      />

      <div className="p-8 max-w-5xl mx-auto space-y-8">
        {/* Experiment Selector Bar */}
        <div className="flex items-center justify-between p-3 border border-[#E5E5E5] rounded bg-[#FAFAFA]">
          <div className="text-xs text-[#666666]">
            Select Report:{" "}
            <select
              value={selectedExp.id}
              onChange={(e) => handleSelectExp(e.target.value)}
              className="ml-2 px-2.5 py-1 text-xs font-mono border border-[#CCCCCC] rounded bg-[#FFFFFF] text-[#111111]"
            >
              {experiments.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.protocol} &bull; {e.id} ({new Date(e.created_at).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>
          <span
            className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded border ${
              selectedExp.is_safe
                ? "border-[#555555] bg-[#FFFFFF] text-[#111111]"
                : "border-[#111111] bg-[#111111] text-[#FFFFFF]"
            }`}
          >
            {selectedExp.is_safe ? "CERTIFIED VALID" : "UNSAFE FOR VALIDATION"}
          </span>
        </div>

        {/* Executive Summary Section */}
        <div className="border border-[#E5E5E5] rounded p-6 bg-[#FFFFFF] space-y-4">
          <div className="border-b border-[#EEEEEE] pb-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#666666]">
              Section 1 &bull; Executive Summary
            </span>
            <h2 className="text-lg font-bold text-[#111111] mt-0.5">
              {selectedExp.name}
            </h2>
            <div className="text-xs text-[#666666] font-mono mt-1 flex flex-wrap gap-4">
              <span>Experiment ID: {selectedExp.id}</span>
              <span>&bull;</span>
              <span>Protocol: {selectedExp.protocol}</span>
              <span>&bull;</span>
              <span>Random Seed: {selectedExp.random_seed}</span>
              <span>&bull;</span>
              <span>Created: {new Date(selectedExp.created_at).toLocaleString()}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 border border-[#E5E5E5] rounded bg-[#FAFAFA]">
              <div className="text-[10px] text-[#888888]">RCS TRANSPARENCY</div>
              <div className="font-bold text-base text-[#111111] mt-0.5">
                {selectedExp.rcs_percentage != null ? `${selectedExp.rcs_percentage}%` : "N/A"}
              </div>
              <div className="text-[10px] text-[#666666]">{selectedExp.quality_tier || "N/A"}</div>
            </div>
            <div className="p-3 border border-[#E5E5E5] rounded bg-[#FAFAFA]">
              <div className="text-[10px] text-[#888888]">CARI REPRODUCIBILITY</div>
              <div className="font-bold text-base text-[#111111] mt-0.5">
                {selectedExp.cari_score != null ? selectedExp.cari_score.toFixed(4) : "N/A"}
              </div>
              <div className="text-[10px] text-[#666666]">Score &isin; [0, 1]</div>
            </div>
            <div className="p-3 border border-[#E5E5E5] rounded bg-[#FAFAFA]">
              <div className="text-[10px] text-[#888888]">FALSE ALARMS (FPR)</div>
              <div className="font-bold text-base text-[#111111] mt-0.5">
                {selectedExp.best_fpr != null ? `${(selectedExp.best_fpr * 100).toFixed(2)}%` : "N/A"}
              </div>
              <div className="text-[10px] text-[#666666]">Target: &le;{(selectedExp.target_fpr != null ? (selectedExp.target_fpr * 100).toFixed(2) : "0.35")}%</div>
            </div>
            <div className="p-3 border border-[#E5E5E5] rounded bg-[#FAFAFA]">
              <div className="text-[10px] text-[#888888]">TOTAL COST RATIO (99)</div>
              <div className="font-bold text-base text-[#111111] mt-0.5">
                {selectedExp.best_tcr != null ? selectedExp.best_tcr.toFixed(2) : "N/A"}
              </div>
              <div className="text-[10px] text-[#666666]">Break-even: 1.0</div>
            </div>
          </div>

          <p className="text-xs text-[#444444] leading-relaxed pt-2">
            {selectedExp.is_safe
              ? "Under Protocol B, pre-split Shingle-Jaccard deduplication purged duplicate campaign bursts, and chronological splitting isolated fourth-quarter concept drift. Probability cutoffs calibrated on validation data controlled the false positive rate below 0.35%, achieving positive enterprise utility (TCR > 1.0) and a defensible CARI score."
              : "Under Protocol A, pre-split vocabulary fitting and duplicate burst retention artificially inflated F1-scores by up to 5.03 percentage points. Furthermore, evaluating at the fixed 0.50 threshold generated severe false positive rates (3.33% - 4.31%), inflicting high operational false alarm costs (TCR = 0.16 - 0.20 < 1.0 at lambda = 99)."}
          </p>
        </div>

        {/* Section 2: Model Performance Table */}
        <div className="border border-[#E5E5E5] rounded p-6 bg-[#FFFFFF]">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#666666]">
            Section 2 &bull; Classifier Evaluation Metrics
          </span>
          <h3 className="text-sm font-bold text-[#111111] mb-3">
            Full-Precision Performance Table
          </h3>

          <div className="overflow-x-auto">
            <table className="table-monochrome">
              <thead>
                <tr>
                  <th>Classifier</th>
                  <th>Cutoff &tau;</th>
                  <th>TP</th>
                  <th>TN</th>
                  <th>FP</th>
                  <th>FN</th>
                  <th>Accuracy</th>
                  <th>Precision</th>
                  <th>Recall</th>
                  <th>F1-Score</th>
                  <th>MCC</th>
                  <th>FPR</th>
                  <th>TCR (99)</th>
                  <th>CARI</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {selectedExp.model_results?.map((m) => {
                  const met = m.metrics;
                  return (
                    <tr key={m.model_key}>
                      <td className="font-bold font-sans text-xs text-[#111111]">{m.display_name}</td>
                      <td>{m.threshold != null ? m.threshold.toFixed(4) : "0.5000"}</td>
                      <td>{met.tp}</td>
                      <td>{met.tn}</td>
                      <td>{met.fp}</td>
                      <td>{met.fn}</td>
                      <td>{met.accuracy ? (met.accuracy * 100).toFixed(2) : "0"}%</td>
                      <td>{met.precision ? (met.precision * 100).toFixed(1) : "0"}%</td>
                      <td>{met.recall ? (met.recall * 100).toFixed(1) : "0"}%</td>
                      <td className="font-bold">{met.f1 ? (met.f1 * 100).toFixed(2) : "0"}%</td>
                      <td>{met.mcc ? met.mcc.toFixed(4) : "0"}</td>
                      <td className="font-bold">{met.fpr ? (met.fpr * 100).toFixed(2) : "0"}%</td>
                      <td className="font-bold">{met.tcr_99 ? met.tcr_99.toFixed(2) : "0"}</td>
                      <td className="font-bold">{m.cari_score ? m.cari_score.toFixed(4) : "0"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Confusion Matrix View */}
        {bestModel && (
          <div className="border border-[#E5E5E5] rounded p-6 bg-[#FFFFFF]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#666666]">
              Section 3 &bull; Representative Confusion Matrix
            </span>
            <div className="mt-2">
              <ConfusionMatrixView
                tp={bestModel.metrics.tp}
                tn={bestModel.metrics.tn}
                fp={bestModel.metrics.fp}
                fn={bestModel.metrics.fn}
                title={`Confusion Matrix: ${bestModel.display_name} (Threshold tau = ${bestModel.threshold != null ? bestModel.threshold.toFixed(4) : "0.5000"})`}
                subtitle={`N_test = ${(bestModel.metrics.tp + bestModel.metrics.tn + bestModel.metrics.fp + bestModel.metrics.fn).toLocaleString()} test emails evaluated`}
              />
            </div>
          </div>
        )}

        {/* Section 4: Leakage Audit Findings */}
        <div className="border border-[#E5E5E5] rounded p-6 bg-[#FAFAFA]">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#666666]">
            Section 4 &bull; Leakage Audit Verification
          </span>
          <h3 className="text-sm font-bold text-[#111111] mb-3">
            Safeguard Inspection Status
          </h3>

          <div className="space-y-2">
            {selectedExp.leakage_report?.checks?.map((chk) => (
              <div key={chk.check_id} className="p-3 border border-[#E5E5E5] rounded bg-[#FFFFFF] flex items-start justify-between gap-4 text-xs">
                <div>
                  <div className="font-bold text-[#111111]">{chk.name}</div>
                  <div className="text-[#666666] mt-0.5">{chk.evidence}</div>
                </div>
                <span
                  className={`font-mono text-[10px] px-2 py-0.5 rounded border flex-shrink-0 ${
                    chk.passed
                      ? "border-[#555555] bg-[#F7F7F7] text-[#111111]"
                      : "border-[#111111] bg-[#111111] text-[#FFFFFF]"
                  }`}
                >
                  {chk.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Section 5: Threats to Validity and Scope Limits */}
        <div className="border border-[#E5E5E5] rounded p-6 bg-[#FFFFFF] text-xs text-[#555555] space-y-2 leading-relaxed">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#666666] block">
            Section 5 &bull; Scope &amp; Threats to Validity (SERC Item 10)
          </span>
          <h3 className="text-sm font-bold text-[#111111]">
            Methodological Constraints
          </h3>
          <p>
            1. <strong>Corpus Horizon:</strong> While the 6,000-email benchmark incorporates 8.0% burst duplicates and fourth-quarter concept drift, live production enterprise queues experience continuous, non-stationary semantic rotation over years.
          </p>
          <p>
            2. <strong>False Alarm Costs:</strong> Threshold calibration depends on user-specified cost weights (&lambda;). In settings where false positives carry irreversible regulatory liability, enterprise administrators should test sliding chronological validation windows.
          </p>
          <p>
            3. <strong>Reproducibility Mandate:</strong> In compliance with SERC Item 9, all PRNG seeds, TF-IDF configurations, and exact formula implementations are permanently archived in the software repository.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-[#F7F7F7]">
          <div className="text-xs font-mono text-[#666666]">Loading report data...</div>
        </div>
      }
    >
      <ReportsContent />
    </Suspense>
  );
}
