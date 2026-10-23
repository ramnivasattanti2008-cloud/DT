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

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDatasetId) {
      setError("Please select a dataset.");
      return;
    }

    setRunning(true);
    setError(null);
    setCompletedExperimentId(null);

    try {
      const exp = await runExperiment({
        dataset_id: selectedDatasetId,
        protocol,
        selected_models: selectedModels,
        target_fpr: targetFpr,
        cost_weight_lambda: costLambda,
        random_seed: randomSeed,
        notes: notes || undefined,
      });

      setCompletedExperimentId(exp.id);
      setRunning(false);
    } catch (err: any) {
      setError(err.message || "Failed to execute experiment.");
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF]">
      <Header
        title="Experiment Runner"
        description="Configure and launch scientific spam classification experiments under either Protocol A or Protocol B."
      />

      <div className="p-8 max-w-4xl mx-auto space-y-8">
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
