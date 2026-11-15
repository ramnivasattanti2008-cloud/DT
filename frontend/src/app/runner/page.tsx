"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { fetchDatasets, runExperiment } from "@/lib/api";
import { Dataset } from "@/lib/types";
import { FlaskConical, Play, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";

export default function ExperimentRunnerPage() {
  const router = useRouter();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState("");
  const [protocol, setProtocol] = useState("Protocol B");
  const [selectedModels, setSelectedModels] = useState<string[]>([
    "multinomial_nb",
    "linear_svm",
    "random_forest",
    "logistic_regression",
  ]);
  const [targetFpr, setTargetFpr] = useState(0.0035);
  const [costLambda, setCostLambda] = useState(99.0);
  const [randomSeed, setRandomSeed] = useState(42);
  const [notes, setNotes] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedExperimentId, setCompletedExperimentId] = useState<string | null>(null);

  useEffect(() => {
    fetchDatasets().then((data) => {
      setDatasets(data);
      if (data.length > 0) {
        setSelectedDatasetId(data[0].id);
      }
    });
  }, []);

  const handleToggleModel = (key: string) => {
    if (selectedModels.includes(key)) {
      if (selectedModels.length > 1) {
        setSelectedModels(selectedModels.filter((m) => m !== key));
      }
    } else {
      setSelectedModels([...selectedModels, key]);
    }
  };

  const executeRun = async (override?: {
    protocol?: string;
    models?: string[];
    targetFpr?: number;
    costLambda?: number;
    randomSeed?: number;
    notes?: string;
  }) => {
    const dsId = selectedDatasetId || datasets[0]?.id;
    if (!dsId) {
      setError("Please select a dataset.");
      return;
    }

    const runProto = override?.protocol ?? protocol;
    const runModels = override?.models ?? selectedModels;
    const runFpr = override?.targetFpr ?? targetFpr;
    const runLambda = override?.costLambda ?? costLambda;
    const runSeed = override?.randomSeed ?? randomSeed;
    const runNotes = override?.notes ?? notes;

    setRunning(true);
    setError(null);
    setCompletedExperimentId(null);

    try {
      const exp = await runExperiment({
        dataset_id: dsId,
        protocol: runProto,
        selected_models: runModels,
        target_fpr: runFpr,
        cost_weight_lambda: runLambda,
        random_seed: runSeed,
        notes: runNotes || undefined,
      });

      setCompletedExperimentId(exp.id);
      setRunning(false);
    } catch (err: any) {
      setError(err.message || "Failed to execute experiment.");
      setRunning(false);
    }
  };

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    executeRun();
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF]">
      <Header
        title="Experiment Runner"
        description="Configure and launch scientific spam classification experiments under either Protocol A or Protocol B."
      />

      <div className="p-8 max-w-4xl mx-auto space-y-8">
        {/* Quick Launch Shortcuts */}
        <div className="border border-[#111111] rounded p-5 bg-[#FAFAFA] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-bold block">
                1-Click Quick Launch Presets
              </span>
              <h2 className="text-sm font-bold text-[#111111] mt-0.5">
                Execute Benchmark Under Standard Manuscript Configurations
              </h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#CCCCCC] bg-[#FFFFFF] text-[#444444]">
              6,000 Dated Corpus
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              disabled={running || datasets.length === 0}
              onClick={() => {
                setProtocol("Protocol B");
                setSelectedModels(["multinomial_nb", "linear_svm", "random_forest", "logistic_regression"]);
                setTargetFpr(0.0035);
                setCostLambda(99.0);
                setRandomSeed(42);
                setNotes("1-Click Protocol B Run (SERC-Compliant)");
                executeRun({
                  protocol: "Protocol B",
                  models: ["multinomial_nb", "linear_svm", "random_forest", "logistic_regression"],
                  targetFpr: 0.0035,
                  costLambda: 99.0,
                  randomSeed: 42,
                  notes: "1-Click Protocol B Run (SERC-Compliant)",
                });
              }}
              className="p-3 border border-[#111111] bg-[#111111] text-[#FFFFFF] rounded text-left hover:bg-[#333333] transition disabled:opacity-50 group flex flex-col justify-between"
            >
              <div>
                <div className="text-xs font-bold font-mono flex items-center justify-between">
                  <span>⚡ Quick Run: Protocol B (SERC)</span>
                  <span className="text-[10px] bg-[#333333] px-1.5 py-0.5 rounded text-[#FFFFFF]">RECOMMENDED</span>
                </div>
                <p className="text-[11px] text-[#CCCCCC] mt-1 leading-snug">
                  Deduped &bull; Chronological &bull; Train-only fit &bull; Calibrated &tau;* (FPR &lt; 0.35%)
                </p>
              </div>
              <div className="text-[10px] font-mono text-[#E5E5E5] mt-2 group-hover:underline">
                {running && protocol === "Protocol B" ? "Executing Benchmark..." : "Click to Launch Protocol B →"}
              </div>
            </button>

            <button
              type="button"
              disabled={running || datasets.length === 0}
              onClick={() => {
                setProtocol("Protocol A");
                setSelectedModels(["multinomial_nb", "linear_svm", "random_forest", "logistic_regression"]);
                setTargetFpr(0.05);
                setCostLambda(99.0);
                setRandomSeed(42);
                setNotes("1-Click Protocol A Run (Flawed Baseline)");
                executeRun({
                  protocol: "Protocol A",
                  models: ["multinomial_nb", "linear_svm", "random_forest", "logistic_regression"],
                  targetFpr: 0.05,
                  costLambda: 99.0,
                  randomSeed: 42,
                  notes: "1-Click Protocol A Run (Flawed Baseline)",
                });
              }}
              className="p-3 border border-[#CCCCCC] bg-[#FFFFFF] text-[#111111] rounded text-left hover:bg-[#F0F0F0] transition disabled:opacity-50 group flex flex-col justify-between"
            >
              <div>
                <div className="text-xs font-bold font-mono flex items-center justify-between">
                  <span>⚡ Quick Run: Protocol A (Flawed)</span>
                  <span className="text-[10px] border border-[#CCCCCC] px-1.5 py-0.5 rounded text-[#666666]">BASELINE</span>
                </div>
                <p className="text-[11px] text-[#666666] mt-1 leading-snug">
                  480 duplicate bursts &bull; Pre-split TF-IDF &bull; Shuffled &bull; Fixed 0.50 cutoff
                </p>
              </div>
              <div className="text-[10px] font-mono text-[#111111] mt-2 group-hover:underline">
                {running && protocol === "Protocol A" ? "Executing Benchmark..." : "Click to Launch Protocol A →"}
              </div>
            </button>
          </div>
        </div>

        {completedExperimentId && (
          <div className="border border-[#111111] rounded p-5 bg-[#FAFAFA] flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold font-mono text-[#111111]">
                <CheckCircle2 size={16} />
                <span>EXPERIMENT COMPLETED SUCCESSFULLY</span>
              </div>
              <p className="text-xs text-[#666666] mt-1 font-mono">
                Persisted Experiment ID: <strong>{completedExperimentId}</strong>
              </p>
            </div>
            <button
              onClick={() => router.push(`/reports?id=${completedExperimentId}`)}
              className="px-3.5 py-1.5 text-xs font-medium rounded bg-[#111111] text-[#FFFFFF] hover:bg-[#333333] transition-colors flex items-center gap-1.5"
            >
              <span>View Experiment Report</span>
              <ArrowRight size={13} />
            </button>
          </div>
        )}

        <form onSubmit={handleLaunch} className="border border-[#E5E5E5] rounded p-6 bg-[#FFFFFF] space-y-6">
          {/* Step 1: Dataset Selection */}
          <div>
            <label className="text-xs font-bold font-mono uppercase tracking-wider text-[#111111] block mb-2">
              1. Select Evaluation Corpus
            </label>
            {datasets.length === 0 ? (
              <p className="text-xs text-[#888888]">
                No datasets loaded. Please generate or upload a dataset in the Dataset Laboratory.
              </p>
            ) : (
              <select
                value={selectedDatasetId}
                onChange={(e) => setSelectedDatasetId(e.target.value)}
                className="w-full p-2.5 text-xs font-mono border border-[#CCCCCC] rounded bg-[#FFFFFF] text-[#111111]"
              >
                {datasets.map((ds) => (
                  <option key={ds.id} value={ds.id}>
                    {ds.name} &bull; {ds.row_count.toLocaleString()} rows ({ds.is_synthetic ? "Synthetic" : "User Upload"})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Step 2: Protocol Selection */}
          <div>
            <label className="text-xs font-bold font-mono uppercase tracking-wider text-[#111111] block mb-2">
              2. Select Experimental Protocol
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label
                className={`p-4 border rounded cursor-pointer transition-colors block ${
                  protocol === "Protocol B"
                    ? "border-[#111111] bg-[#FAFAFA]"
                    : "border-[#E5E5E5] bg-[#FFFFFF] hover:bg-[#F9F9F9]"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[#111111]">
                    Protocol B (SERC-Compliant)
                  </span>
                  <input
                    type="radio"
                    name="protocol"
                    value="Protocol B"
                    checked={protocol === "Protocol B"}
                    onChange={(e) => setProtocol(e.target.value)}
                    className="accent-[#111111]"
                  />
                </div>
                <p className="text-[11px] text-[#666666] leading-relaxed">
                  Pre-split deduplication, strict chronological 80:20 split, train-only TF-IDF &amp; feature selection, validation threshold tuning (&tau;*). Certified leakage-safe.
                </p>
              </label>

              <label
                className={`p-4 border rounded cursor-pointer transition-colors block ${
                  protocol === "Protocol A"
                    ? "border-[#111111] bg-[#FAFAFA]"
                    : "border-[#E5E5E5] bg-[#FFFFFF] hover:bg-[#F9F9F9]"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[#111111]">
                    Protocol A (Flawed Baseline)
                  </span>
                  <input
                    type="radio"
                    name="protocol"
                    value="Protocol A"
                    checked={protocol === "Protocol A"}
                    onChange={(e) => setProtocol(e.target.value)}
                    className="accent-[#111111]"
                  />
                </div>
                <p className="text-[11px] text-[#666666] leading-relaxed">
                  Retains duplicate bursts, fits TF-IDF &amp; Chi-squared across full corpus before split, shuffled 80:20 split, fixed 0.50 cutoff. Marked UNSAFE.
                </p>
              </label>
            </div>
          </div>

          {/* Step 3: Classifier Architecture Selection */}
          <div>
            <label className="text-xs font-bold font-mono uppercase tracking-wider text-[#111111] block mb-2">
              3. Target Classifier Architectures
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { key: "multinomial_nb", label: "Multinomial NB" },
                { key: "linear_svm", label: "Linear SVM (Platt)" },
                { key: "random_forest", label: "Random Forest" },
                { key: "logistic_regression", label: "Logistic Reg. (L2)" },
              ].map((m) => (
                <label
                  key={m.key}
                  className={`p-2.5 border rounded cursor-pointer text-xs flex items-center justify-between ${
                    selectedModels.includes(m.key)
                      ? "border-[#111111] bg-[#FAFAFA] font-medium"
                      : "border-[#E5E5E5] text-[#666666]"
                  }`}
                >
                  <span>{m.label}</span>
                  <input
                    type="checkbox"
                    checked={selectedModels.includes(m.key)}
                    onChange={() => handleToggleModel(m.key)}
                    className="accent-[#111111]"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Step 4: Cost & Evaluation Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-[#EEEEEE] pt-5">
            <div>
              <label className="text-xs font-bold font-mono text-[#111111] block mb-1">
                Target False-Positive Rate (FPR Ceiling)
              </label>
              <input
                type="number"
                step="0.0005"
                min="0.0005"
                max="0.05"
                value={targetFpr}
                onChange={(e) => setTargetFpr(parseFloat(e.target.value))}
                className="w-full p-2 text-xs font-mono border border-[#CCCCCC] rounded bg-[#FFFFFF] text-[#111111]"
              />
              <span className="text-[10px] text-[#888888] mt-1 block">
                Enterprise limit: 0.0035 (0.35%)
              </span>
            </div>

            <div>
              <label className="text-xs font-bold font-mono text-[#111111] block mb-1">
                False-Alarm Cost Weight (&lambda;)
              </label>
              <select
                value={costLambda}
                onChange={(e) => setCostLambda(parseFloat(e.target.value))}
                className="w-full p-2 text-xs font-mono border border-[#CCCCCC] rounded bg-[#FFFFFF] text-[#111111]"
              >
                <option value={9}>&lambda; = 9 (Moderate Asymmetry)</option>
                <option value={99}>&lambda; = 99 (High Asymmetry, Enterprise)</option>
                <option value={999}>&lambda; = 999 (Severe Asymmetry)</option>
              </select>
              <span className="text-[10px] text-[#888888] mt-1 block">
                Cost of 1 false alarm vs missed spam
              </span>
            </div>

            <div>
              <label className="text-xs font-bold font-mono text-[#111111] block mb-1">
                Random Seed (PRNG)
              </label>
              <input
                type="number"
                value={randomSeed}
                onChange={(e) => setRandomSeed(parseInt(e.target.value))}
                className="w-full p-2 text-xs font-mono border border-[#CCCCCC] rounded bg-[#FFFFFF] text-[#111111]"
              />
              <span className="text-[10px] text-[#888888] mt-1 block">
                Benchmark seed: 42
              </span>
            </div>
          </div>

          {/* Step 5: Optional Notes */}
          <div>
            <label className="text-xs font-bold font-mono uppercase tracking-wider text-[#111111] block mb-1">
              Methodological Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Replication run verifying Table 6 with Q4 concept drift"
              className="w-full p-2 text-xs font-mono border border-[#CCCCCC] rounded bg-[#FFFFFF] text-[#111111]"
            />
          </div>

          {error && (
            <div className="p-3 border border-[#111111] rounded bg-[#F7F7F7] text-xs font-mono text-[#111111] flex items-center gap-2">
              <AlertTriangle size={15} />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={running || datasets.length === 0}
              className="px-6 py-2.5 text-xs font-bold rounded bg-[#111111] text-[#FFFFFF] hover:bg-[#333333] transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Play size={14} />
              <span>{running ? "Training & Auditing..." : "Execute Experiment Run"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
