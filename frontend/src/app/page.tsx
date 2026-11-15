"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import MetricsCard from "@/components/MetricsCard";
import { fetchDatasets, fetchExperiments, classifyEmail, fetchSampleEmails } from "@/lib/api";
import { Dataset, Experiment } from "@/lib/types";
import {
  ArrowRight,
  ShieldCheck,
  FlaskConical,
  Database,
  Cpu,
  FileCheck2,
  FileText,
  Send,
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";

export default function OverviewPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"simple" | "research">("simple");

  // Interactive Quick Tester state
  const [samples, setSamples] = useState<any[]>([]);
  const [testText, setTestText] = useState(
    "Subject: Re: Q3 Invoice Reconciliation\n\nHi Sarah, attached is the revised billing reconciliation for the Q3 enterprise license. Please confirm receipt and let me know if you need PO details."
  );
  const [classifying, setClassifying] = useState(false);
  const [quickResult, setQuickResult] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetchDatasets().catch(() => []),
      fetchExperiments().catch(() => []),
      fetchSampleEmails().catch(() => []),
    ]).then(([d, e, s]) => {
      setDatasets(d);
      setExperiments(e);
      setSamples(s);
      setLoading(false);
      // Run initial classification on default sample
      runQuickClassify(testText);
    });
  }, []);

  const runQuickClassify = (text: string) => {
    if (!text.trim()) return;
    setClassifying(true);
    classifyEmail({ text })
      .then((res) => {
        setQuickResult(res);
        setClassifying(false);
      })
      .catch((err) => {
        console.error(err);
        setClassifying(false);
      });
  };

  const handleSelectSample = (sampleText: string) => {
    setTestText(sampleText);
    runQuickClassify(sampleText);
  };

  const protoB = experiments.find((e) => e.protocol.includes("Protocol B"));
  const protoA = experiments.find((e) => e.protocol.includes("Protocol A"));

  // Primary model from quick result (default to Naive Bayes or Logistic Regression)
  const primaryPred = quickResult?.predictions?.find(
    (p: any) => p.model_key === "multinomial_nb"
  ) || quickResult?.predictions?.[0];

  return (
    <div className="min-h-screen bg-[#FFFFFF]">
      <Header
        title="SERC-RCS Research Lab"
        description="Scientific audit platform evaluating feature leakage, false-alarm penalties, and experimental reproducibility in machine learning spam filters."
        actions={
          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex items-center p-0.5 border border-[#CCCCCC] rounded bg-[#FAFAFA]">
              <button
                onClick={() => setViewMode("simple")}
                className={`px-2.5 py-1 text-xs font-mono rounded transition-colors flex items-center gap-1.5 ${
                  viewMode === "simple"
                    ? "bg-[#111111] text-[#FFFFFF] font-bold"
                    : "text-[#666666] hover:text-[#111111]"
                }`}
              >
                <Sparkles size={12} />
                <span>Simple Mode</span>
              </button>
              <button
                onClick={() => setViewMode("research")}
                className={`px-2.5 py-1 text-xs font-mono rounded transition-colors flex items-center gap-1.5 ${
                  viewMode === "research"
                    ? "bg-[#111111] text-[#FFFFFF] font-bold"
                    : "text-[#666666] hover:text-[#111111]"
                }`}
              >
                <BookOpen size={12} />
                <span>Research Mode</span>
              </button>
            </div>

            <Link
              href="/runner"
              className="px-3.5 py-1.5 text-xs font-medium rounded bg-[#111111] text-[#FFFFFF] hover:bg-[#333333] transition-colors flex items-center gap-1.5 font-mono"
            >
              <FlaskConical size={14} />
              <span>Launch Run</span>
            </Link>
          </div>
        }
      />

      <div className="p-8 max-w-7xl mx-auto space-y-8">
        {/* ============================================================== */}
        {/* INTERACTIVE 1-SECOND EMAIL TESTER (SIMPLE & CLEAN)             */}
        {/* ============================================================== */}
        <div className="border border-[#111111] rounded p-6 bg-[#FAFAFA] space-y-4 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-[#E5E5E5] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 bg-[#111111] text-[#FFFFFF] rounded uppercase font-bold tracking-wider">
                  Live Interactive Demo
                </span>
                <span className="text-xs text-[#666666] font-mono">
                  Test Any Email Instantaneously
                </span>
              </div>
              <h2 className="text-base font-bold text-[#111111] mt-1">
                Real-Time Spam &amp; False-Alarm Diagnostic Engine
              </h2>
            </div>
            <div className="text-xs text-[#666666] font-mono">
              Tested simultaneously against all 4 calibrated classifiers
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-mono uppercase text-[#666666] font-medium">
              Click to load an instant test sample:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() =>
                  handleSelectSample(
                    "Subject: Re: Q3 Invoice Reconciliation\n\nHi Sarah, attached is the revised billing reconciliation for the Q3 enterprise license. Please confirm receipt and let me know if you need PO details."
                  )
                }
                className={`p-2.5 rounded border text-left text-xs transition-colors ${
                  testText.includes("Q3 Invoice Reconciliation")
                    ? "border-[#111111] bg-[#111111] text-[#FFFFFF]"
                    : "border-[#E5E5E5] bg-[#FFFFFF] text-[#111111] hover:bg-[#F0F0F0]"
                }`}
              >
                <div className="font-bold flex items-center justify-between">
                  <span>1. Business Invoice (Hard Ham)</span>
                  <span className="text-[10px] font-mono opacity-80">Safe Mail</span>
                </div>
                <div className="text-[10px] mt-0.5 opacity-75 truncate">
                  Tests if filter incorrectly blocks legitimate billing emails
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleSelectSample(
                    "Subject: URGENT: Account Suspension Notice\n\nDear Customer, suspicious activity detected on your account. Click here immediately to verify your credentials within 24 hours or access will be revoked."
                  )
                }
                className={`p-2.5 rounded border text-left text-xs transition-colors ${
                  testText.includes("URGENT: Account Suspension Notice")
                    ? "border-[#111111] bg-[#111111] text-[#FFFFFF]"
                    : "border-[#E5E5E5] bg-[#FFFFFF] text-[#111111] hover:bg-[#F0F0F0]"
                }`}
              >
                <div className="font-bold flex items-center justify-between">
                  <span>2. Credential Phish (Spam)</span>
                  <span className="text-[10px] font-mono opacity-80">Malicious</span>
                </div>
                <div className="text-[10px] mt-0.5 opacity-75 truncate">
                  Urgent psychological trigger impersonating security alerts
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleSelectSample(
                    "Subject: Team Sync on Architecture Review\n\nHey team, let us meet tomorrow at 10 AM to review the system design and microservice boundaries. The meeting link is in the calendar invitation."
                  )
                }
                className={`p-2.5 rounded border text-left text-xs transition-colors ${
                  testText.includes("Team Sync on Architecture Review")
                    ? "border-[#111111] bg-[#111111] text-[#FFFFFF]"
                    : "border-[#E5E5E5] bg-[#FFFFFF] text-[#111111] hover:bg-[#F0F0F0]"
                }`}
              >
                <div className="font-bold flex items-center justify-between">
                  <span>3. Internal Meeting (Normal Ham)</span>
                  <span className="text-[10px] font-mono opacity-80">Safe Mail</span>
                </div>
                <div className="text-[10px] mt-0.5 opacity-75 truncate">
                  Standard internal correspondence without spam keywords
                </div>
              </button>
            </div>
          </div>

          {/* Text Area & Submit */}
          <div className="space-y-2">
            <textarea
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              rows={3}
              placeholder="Or type/paste any custom email message here..."
              className="w-full p-3 text-xs font-mono border border-[#CCCCCC] rounded bg-[#FFFFFF] text-[#111111] focus:border-[#111111] focus:ring-0 resize-y"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#666666] font-mono">
                {testText.length} characters entered
              </span>
              <button
                type="button"
                onClick={() => runQuickClassify(testText)}
                disabled={classifying || !testText.trim()}
                className="px-4 py-2 text-xs font-bold rounded bg-[#111111] text-[#FFFFFF] hover:bg-[#333333] transition-colors flex items-center gap-1.5 font-mono disabled:opacity-50"
              >
                <Send size={13} />
                <span>{classifying ? "Analyzing..." : "Classify Email"}</span>
              </button>
            </div>
          </div>

          {/* Live Result Display */}
          {primaryPred && (
            <div className="p-4 border border-[#CCCCCC] rounded bg-[#FFFFFF] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EEEEEE] pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[#666666]">Verdict:</span>
                  <span
                    className={`px-2.5 py-1 text-xs font-mono font-bold rounded border ${
                      primaryPred.is_spam
                        ? "border-[#111111] bg-[#111111] text-[#FFFFFF]"
                        : "border-[#444444] bg-[#F7F7F7] text-[#111111]"
                    }`}
                  >
                    {primaryPred.is_spam ? "SPAM (BLOCKED)" : "LEGITIMATE (HAM - ALLOWED)"}
                  </span>
                </div>
                <div className="text-xs font-mono text-[#666666]">
                  Evaluator: <strong>{primaryPred.model_name}</strong>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-2.5 border border-[#E5E5E5] rounded bg-[#FAFAFA]">
                  <div className="text-[10px] text-[#666666]">ESTIMATED SPAM RISK</div>
                  <div className="text-base font-bold text-[#111111] mt-0.5">
                    {(primaryPred.predicted_probability * 100).toFixed(1)}%
                  </div>
                  <div className="w-full bg-[#E5E5E5] h-1.5 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className="bg-[#111111] h-full"
                      style={{
                        width: `${Math.min(100, Math.max(2, primaryPred.predicted_probability * 100))}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="p-2.5 border border-[#E5E5E5] rounded bg-[#FAFAFA]">
                  <div className="text-[10px] text-[#666666]">SERC CALIBRATED CUTOFF (&tau;*)</div>
                  <div className="text-base font-bold text-[#111111] mt-0.5">
                    {primaryPred.decision_threshold.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-[#666666] mt-0.5">
                    Tuned at &lambda;=99 (FPR &lt; 0.35%)
                  </div>
                </div>

                <div className="p-2.5 border border-[#E5E5E5] rounded bg-[#FAFAFA]">
                  <div className="text-[10px] text-[#666666]">DEFAULT VS. CALIBRATED</div>
                  <div className="text-xs font-bold text-[#111111] mt-0.5">
                    {primaryPred.predicted_probability > 0.5 && !primaryPred.is_spam
                      ? "Protected from False Alarm!"
                      : primaryPred.is_spam
                      ? "Safely Quarantined"
                      : "Passed Cleanly"}
                  </div>
                  <div className="text-[10px] text-[#666666] mt-0.5">
                    Avoids dropping valid invoices
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-[#666666] leading-relaxed flex items-center justify-between pt-1">
                <span>
                  Tip: A standard naive 0.50 cutoff quarantines 3.3% to 4.3% of valid messages. Protocol B threshold tuning drops false alarms down to 0.15%.
                </span>
                <Link
                  href="/classifier"
                  className="font-bold text-[#111111] underline hover:text-[#555555] flex items-center gap-1 shrink-0 ml-2"
                >
                  <span>Advanced Classifier</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* RESEARCH PAPER MANUSCRIPT BANNER (RESEARCH MODE OR ACCORDION) */}
        {/* ============================================================== */}
        {viewMode === "research" ? (
          <div className="border border-[#111111] rounded p-6 bg-[#FAFAFA] space-y-4">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-[#E5E5E5] pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#666666] block">
                  Research Manuscript &bull; Jain University School of Engineering
                </span>
                <h1 className="text-lg md:text-xl font-bold text-[#111111] tracking-tight mt-1">
                  Inspecting Feature Leakage and False-Alarm Costs With Experimental Reproducibility in Email Spam Classifiers, Through the SERC-RCS Rubric
                </h1>
                <div className="text-xs text-[#333333] font-mono mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-bold text-[#111111]">R. Attanti, P. Shreya, and M. N. Sarwar</span>
                  <span>&bull;</span>
                  <span className="text-[#666666]">CSBS Department, School of Engineering, Jain University, Bengaluru, India</span>
                  <span>&bull;</span>
                  <span className="text-[#666666]">Corresponding: nadeem.sarwar@jainuniversity.ac.in</span>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start">
                <span className="text-[10px] font-mono px-2 py-0.5 border border-[#111111] bg-[#111111] text-[#FFFFFF] rounded">
                  SERC-RCS
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 border border-[#CCCCCC] bg-[#FFFFFF] text-[#333333] rounded">
                  PRISMA 2020
                </span>
              </div>
            </div>

            <div className="text-xs text-[#555555] leading-relaxed space-y-2">
              <p>
                <strong>Abstract:</strong> Test accuracy between 95.0% and 99.9% is often reported by published email spam filters, but they frequently fail on live mail gateways. Four evaluation shortcuts are inspected: <em>(1) keeping duplicate spam bursts</em>, <em>(2) fitting TF-IDF and &chi;&sup2; selection before splitting</em>, <em>(3) shuffling dated mail</em>, and <em>(4) employing a fixed 0.50 cutoff</em>. To audit them, we built a 10-item checklist (<strong>SERC</strong>), a reporting score (<strong>RCS</strong>), and a cost-adjusted index (<strong>CARI</strong>). Two raters applied these to 20 experimental studies drawn from 642 entries (PRISMA 2020, 1999&ndash;2024) and agreed on 183 of 200 item pairs (<strong>Cohen&apos;s &kappa; = 0.8672</strong>, weighted &kappa;<sub>w</sub> = 0.9071). A five-stage ablation on 6,000 dated emails with four classifiers shows what these gaps cost: removing copies, fitting attributes on training data only, splitting by date, and tuning the cutoff cut the false positive rate (FPR) from <strong>3.33%&ndash;4.31%</strong> down to <strong>0.15%&ndash;0.29%</strong>, lifting the total cost ratio (TCR at &lambda; = 99) from <strong>0.16&ndash;0.20 (&lt;1.0)</strong> to <strong>1.58&ndash;2.48 (&gt;1.0)</strong>.
              </p>
            </div>

            {/* Research Questions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs font-mono">
              <div className="p-3 border border-[#E5E5E5] rounded bg-[#FFFFFF]">
                <div className="text-[10px] font-bold text-[#111111]">RQ1: PROCESSING CHAIN CLARITY</div>
                <p className="text-[11px] text-[#666666] font-sans mt-1">
                  Do published spam papers state class ratios, deduplication, train-only attribute fitting, and split rules clearly enough for exact replication?
                </p>
              </div>
              <div className="p-3 border border-[#E5E5E5] rounded bg-[#FFFFFF]">
                <div className="text-[10px] font-bold text-[#111111]">RQ2: COST &amp; TEMPORAL DRIFT VALIDITY</div>
                <p className="text-[11px] text-[#666666] font-sans mt-1">
                  Do performance metrics, probability cutoffs, and partitions reflect the asymmetric cost of blocking valid mail and temporal concept drift?
                </p>
              </div>
              <div className="p-3 border border-[#E5E5E5] rounded bg-[#FFFFFF]">
                <div className="text-[10px] font-bold text-[#111111]">RQ3: CARI INTEGRATED INDEX</div>
                <p className="text-[11px] text-[#666666] font-sans mt-1">
                  Can reporting transparency and false-alarm penalties be unified into one metric that separates gateway-ready filters from leaky baselines?
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Simplified Quick Attribution Banner */
          <div className="border border-[#E5E5E5] rounded p-4 bg-[#FFFFFF] flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-[10px] font-mono uppercase text-[#666666] tracking-wider">
                Research Authorship &bull; Jain University School of Engineering
              </div>
              <div className="text-xs font-bold text-[#111111]">
                Inspecting Feature Leakage &amp; False-Alarm Costs Through the SERC-RCS Rubric
              </div>
              <div className="text-[11px] text-[#555555] font-mono">
                R. Attanti, P. Shreya, and M. N. Sarwar &bull; CSBS Dept &bull; corresponding: nadeem.sarwar@jainuniversity.ac.in
              </div>
            </div>
            <button
              onClick={() => setViewMode("research")}
              className="text-xs font-mono font-medium text-[#111111] border border-[#CCCCCC] px-3 py-1.5 rounded hover:bg-[#F0F0F0] transition flex items-center gap-1.5 self-start md:self-auto shrink-0"
            >
              <BookOpen size={13} />
              <span>View Full Research Text &amp; Tables</span>
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* KPI CARDS (THE 4 ESSENTIAL SCIENTIFIC BENCHMARKS)             */}
        {/* ============================================================== */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-[#111111]">
              Scientific Benchmark Scorecards (6,000 Dated Email Corpus)
            </h2>
            <span className="text-xs text-[#666666] font-mono">
              Protocol B (SERC-Compliant)
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricsCard
              label="Reporting Completeness (RCS)"
              value={protoB?.rcs_percentage ? `${protoB.rcs_percentage.toFixed(0)}%` : "100%"}
              subtitle="Protocol B adheres to all 10 SERC criteria (Tier A)"
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
        </div>

        {/* ============================================================== */}
        {/* PRIMARY ACTION MODULES (1-CLICK DIRECT NAVIGATION)             */}
        {/* ============================================================== */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-[#111111]">
              Primary Research Modules &amp; Tools
            </h2>
            <span className="text-xs text-[#666666] font-mono">
              All modules fully operational
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/classifier"
              className="border border-[#E5E5E5] rounded p-5 bg-[#FFFFFF] hover:border-[#111111] transition group space-y-2 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div className="p-2 bg-[#FAFAFA] rounded border border-[#E5E5E5] group-hover:border-[#111111]">
                  <Cpu size={18} className="text-[#111111]" />
                </div>
                <ArrowRight size={14} className="text-[#888888] group-hover:text-[#111111] transition" />
              </div>
              <h3 className="text-sm font-bold text-[#111111]">Spam Classifier</h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                Test custom emails across all 4 machine learning models. Calibrate thresholds (&tau;*) to eliminate costly false alarms.
              </p>
              <div className="text-[11px] font-mono text-[#111111] font-medium pt-1">
                Open Classifier &rarr;
              </div>
            </Link>

            <Link
              href="/leakage"
              className="border border-[#E5E5E5] rounded p-5 bg-[#FFFFFF] hover:border-[#111111] transition group space-y-2 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div className="p-2 bg-[#FAFAFA] rounded border border-[#E5E5E5] group-hover:border-[#111111]">
                  <ShieldCheck size={18} className="text-[#111111]" />
                </div>
                <ArrowRight size={14} className="text-[#888888] group-hover:text-[#111111] transition" />
              </div>
              <h3 className="text-sm font-bold text-[#111111]">Leakage Audit Engine</h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                Automatically verify the 6 leakage audit tests (burst duplicates, lookahead inversion, pre-split vocabulary leakage).
              </p>
              <div className="text-[11px] font-mono text-[#111111] font-medium pt-1">
                Audit Leakage &rarr;
              </div>
            </Link>

            <Link
              href="/runner"
              className="border border-[#E5E5E5] rounded p-5 bg-[#FFFFFF] hover:border-[#111111] transition group space-y-2 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div className="p-2 bg-[#FAFAFA] rounded border border-[#E5E5E5] group-hover:border-[#111111]">
                  <FlaskConical size={18} className="text-[#111111]" />
                </div>
                <ArrowRight size={14} className="text-[#888888] group-hover:text-[#111111] transition" />
              </div>
              <h3 className="text-sm font-bold text-[#111111]">Experiment Runner</h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                Execute 1-click benchmarks on 6,000 dated emails. Run Protocol A vs Protocol B side-by-side with full persistence.
              </p>
              <div className="text-[11px] font-mono text-[#111111] font-medium pt-1">
                Launch Runner &rarr;
              </div>
            </Link>

            <Link
              href="/comparison"
              className="border border-[#E5E5E5] rounded p-5 bg-[#FFFFFF] hover:border-[#111111] transition group space-y-2 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div className="p-2 bg-[#FAFAFA] rounded border border-[#E5E5E5] group-hover:border-[#111111]">
                  <FileCheck2 size={18} className="text-[#111111]" />
                </div>
                <ArrowRight size={14} className="text-[#888888] group-hover:text-[#111111] transition" />
              </div>
              <h3 className="text-sm font-bold text-[#111111]">Model Comparison</h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                Inspect Table VII and Table VIII ablation matrices across Naive Bayes, Linear SVM, Random Forest, and Logistic Regression.
              </p>
              <div className="text-[11px] font-mono text-[#111111] font-medium pt-1">
                View Comparison &rarr;
              </div>
            </Link>

            <Link
              href="/serc"
              className="border border-[#E5E5E5] rounded p-5 bg-[#FFFFFF] hover:border-[#111111] transition group space-y-2 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div className="p-2 bg-[#FAFAFA] rounded border border-[#E5E5E5] group-hover:border-[#111111]">
                  <CheckCircle2 size={18} className="text-[#111111]" />
                </div>
                <ArrowRight size={14} className="text-[#888888] group-hover:text-[#111111] transition" />
              </div>
              <h3 className="text-sm font-bold text-[#111111]">SERC-RCS Evaluator</h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                Interactive 10-item reproducibility rubric, double-blind inter-rater stats (&kappa; = 0.8672), and PRISMA 2020 matrix.
              </p>
              <div className="text-[11px] font-mono text-[#111111] font-medium pt-1">
                Open Evaluator &rarr;
              </div>
            </Link>

            <Link
              href="/reports"
              className="border border-[#E5E5E5] rounded p-5 bg-[#FFFFFF] hover:border-[#111111] transition group space-y-2 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div className="p-2 bg-[#FAFAFA] rounded border border-[#E5E5E5] group-hover:border-[#111111]">
                  <FileText size={18} className="text-[#111111]" />
                </div>
                <ArrowRight size={14} className="text-[#888888] group-hover:text-[#111111] transition" />
              </div>
              <h3 className="text-sm font-bold text-[#111111]">Research Reports</h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                Generate executive audit summaries, copy complete LaTeX/BibTeX citation entries, and export CSV/JSON audit trails.
              </p>
              <div className="text-[11px] font-mono text-[#111111] font-medium pt-1">
                View Reports &rarr;
              </div>
            </Link>
          </div>
        </div>

        {/* ============================================================== */}
        {/* RESEARCH PAPER TABLES (IF IN RESEARCH MODE)                    */}
        {/* ============================================================== */}
        {viewMode === "research" && (
          <div className="border border-[#E5E5E5] rounded p-6 bg-[#FFFFFF] space-y-4">
            <div className="mb-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#666666] block">
                Table I from Manuscript
              </span>
              <h3 className="text-sm font-bold text-[#111111]">
                Comparison of Past Spam Surveys vs. The Four Contributions of This Work
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="table-monochrome">
                <thead>
                  <tr>
                    <th className="w-1/5">Study Feature</th>
                    <th className="w-2/5">Past Surveys (Dada 2019, Jáñez-Martino 2023, Tusher 2024)</th>
                    <th className="w-2/5">This Work (Attanti, Shreya, &amp; Sarwar 2026)</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  <tr>
                    <td className="font-bold text-[#111111]">Scope</td>
                    <td className="text-[#666666]">Lists ML/DL algorithms, feature wrappers, and published accuracy values.</td>
                    <td className="font-medium text-[#111111]">Audits experimental scripts for pre-split leakage, duplicate bursts, and cutoff tuning.</td>
                  </tr>
                  <tr>
                    <td className="font-bold text-[#111111]">Scoring Sheet</td>
                    <td className="text-[#666666]">No scoring sheet for verifying whether training and test data were kept separate.</td>
                    <td className="font-medium text-[#111111]">10-item SERC rubric applied by two raters to 200 item pairs (&kappa; = 0.8672; &kappa;<sub>w</sub> = 0.9071).</td>
                  </tr>
                  <tr>
                    <td className="font-bold text-[#111111]">Penalty Equations</td>
                    <td className="text-[#666666]">Relies on symmetric precision and F1, which do not punish false alarms.</td>
                    <td className="font-medium text-[#111111]">Defines RCS (0&ndash;100%) and CARI (0&ndash;1), which discount false alarms and weak reporting.</td>
                  </tr>
                  <tr>
                    <td className="font-bold text-[#111111]">Code Test</td>
                    <td className="text-[#666666]">Reports accuracy tables from past papers without running their source code.</td>
                    <td className="font-medium text-[#111111]">Five-stage Python ablation on 6,000 dated emails isolating each leakage flaw.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PERSISTED EXPERIMENTS ARCHIVE TABLE                           */}
        {/* ============================================================== */}
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
              className="text-xs text-[#111111] underline hover:text-[#555555] font-mono"
            >
              View Full History &rarr;
            </Link>
          </div>

          {experiments.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#888888] border border-dashed border-[#E5E5E5] rounded">
              No experiments executed yet. Click &quot;Launch Run&quot; above to execute a benchmark.
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
