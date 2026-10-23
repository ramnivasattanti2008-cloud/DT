"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import {
  Settings,
  Sliders,
  Database,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Server,
  FileCode,
  Shield,
  HelpCircle,
} from "lucide-react";
import { fetchSettings, updateSettings } from "@/lib/api";

export default function SettingsPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Configuration state
  const [costLambda, setCostLambda] = useState<number>(99.0);
  const [targetFpr, setTargetFpr] = useState<number>(0.0035);
  const [cariOmega, setCariOmega] = useState<number>(2.0);
  const [compatMode, setCompatMode] = useState<boolean>(false);

  // Runtime info state
  const [serverInfo, setServerInfo] = useState<any>({
    app_name: "SERC-RCS Research Lab",
    version: "1.0.0",
    environment: "development",
    max_upload_size_mb: 50,
    allowed_formats: [".csv", ".tsv", ".txt"],
  });

  const [healthStatus, setHealthStatus] = useState<{
    status: string;
    checked: boolean;
    pingMs?: number;
  }>({
    status: "untested",
    checked: false,
  });

  useEffect(() => {
    loadSettings();
    pingHealth();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      const data = await fetchSettings();
      if (data) {
        setCostLambda(Number(data.cost_weight_lambda ?? 99.0));
        setTargetFpr(Number(data.target_fpr_ceiling ?? 0.0035));
        setCariOmega(Number(data.cari_omega_penalty ?? 2.0));
        setCompatMode(Boolean(data.compatibility_mode ?? false));
        setServerInfo({
          app_name: data.app_name || "SERC-RCS Research Lab",
          version: data.version || "1.0.0",
          environment: data.environment || "production",
          max_upload_size_mb: data.max_upload_size_mb || 50,
          allowed_formats: data.allowed_formats || [".csv", ".tsv", ".txt"],
        });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to load system settings" });
    } finally {
      setLoading(false);
    }
  }

  async function pingHealth() {
    const start = performance.now();
    try {
      const res = await fetch("http://localhost:8000/api/health");
      const elapsed = Math.round(performance.now() - start);
      if (res.ok) {
        setHealthStatus({ status: "healthy", checked: true, pingMs: elapsed });
      } else {
        setHealthStatus({ status: "degraded", checked: true, pingMs: elapsed });
      }
    } catch {
      setHealthStatus({ status: "offline", checked: true });
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setMessage(null);
      await updateSettings({
        cost_weight_lambda: Number(costLambda),
        target_fpr_ceiling: Number(targetFpr),
        cari_omega_penalty: Number(cariOmega),
        compatibility_mode: Boolean(compatMode),
      });
      setMessage({ type: "success", text: "Research settings successfully saved to persistent database." });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to persist settings." });
    } finally {
      setSaving(false);
    }
  }

  function handleResetDefaults() {
    setCostLambda(99.0);
    setTargetFpr(0.0035);
    setCariOmega(2.0);
    setCompatMode(false);
    setMessage({
      type: "success",
      text: "Reset to paper benchmark defaults (lambda = 99, target FPR = 0.35%, omega = 2.0). Click Save to apply.",
    });
  }

  // Calculate theoretical Bayes cutoff
  const bayesCutoff = costLambda / (costLambda + 1);

  return (
    <div className="flex flex-col min-h-screen bg-[#F7F7F7]">
      <Header
        title="Settings & System Configuration"
        description="Manage cost-ratio weights, calibration targets, CARI penalties, and local runtime configuration."
      />

      <div className="p-8 max-w-6xl mx-auto w-full space-y-8">
        {/* Notifications */}
        {message && (
          <div
            className={`p-4 rounded border text-xs flex items-center justify-between font-mono ${
              message.type === "success"
                ? "bg-[#FFFFFF] border-[#111111] text-[#111111]"
                : "bg-[#FFFFFF] border-[#666666] text-[#111111]"
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === "success" ? (
                <CheckCircle size={15} className="text-[#111111]" />
              ) : (
                <AlertTriangle size={15} className="text-[#666666]" />
              )}
              <span>{message.text}</span>
            </div>
            <button
              onClick={() => setMessage(null)}
              className="text-[#888888] hover:text-[#111111] uppercase text-[10px]"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Section 1: Research Evaluation Parameters */}
        <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded p-6 shadow-sm space-y-6">
          <div className="border-b border-[#E5E5E5] pb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sliders size={18} className="text-[#111111]" />
              <div>
                <h2 className="text-sm font-bold uppercase font-mono tracking-tight text-[#111111]">
                  Decision &amp; Cost-Matrix Parameters
                </h2>
                <p className="text-xs text-[#666666]">
                  Mathematical constants governing threshold calculation, weighted accuracy, and CARI
                </p>
              </div>
            </div>
            <button
              onClick={handleResetDefaults}
              className="px-3 py-1.5 border border-[#CCCCCC] rounded text-xs text-[#333333] hover:bg-[#F0F0F0] font-mono"
            >
              Reset Paper Defaults
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Lambda Cost Parameter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold text-[#111111]">
                  Cost Weight Lambda (L)
                </label>
                <span className="text-xs font-mono text-[#666666]">
                  Theoretical Cutoff: tau* = {bayesCutoff.toFixed(4)}
                </span>
              </div>
              <p className="text-[11px] text-[#666666]">
                Specifies the relative asymmetric cost penalty where blocking a legitimate email (false alarm) is
                penalized L times more severely than leaking a spam email into the inbox.
              </p>
              <div className="flex items-center gap-2 pt-1">
                {[9, 99, 999].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setCostLambda(val)}
                    className={`px-3 py-1.5 text-xs font-mono rounded border transition-colors ${
                      costLambda === val
                        ? "bg-[#111111] text-[#FFFFFF] border-[#111111]"
                        : "bg-[#FFFFFF] text-[#333333] border-[#CCCCCC] hover:bg-[#F0F0F0]"
                    }`}
                  >
                    L = {val}
                  </button>
                ))}
                <input
                  type="number"
                  min="1"
                  max="10000"
                  step="1"
                  value={costLambda}
                  onChange={(e) => setCostLambda(parseFloat(e.target.value) || 99.0)}
                  className="w-24 px-2.5 py-1.5 text-xs font-mono border border-[#CCCCCC] rounded bg-[#FFFFFF] text-[#111111]"
                />
              </div>
            </div>

            {/* Target FPR Ceiling */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold text-[#111111]">
                  Target FPR Ceiling (alpha)
                </label>
                <span className="text-xs font-mono text-[#666666]">
                  {(targetFpr * 100).toFixed(2)}% False Alarm Cap
                </span>
              </div>
              <p className="text-[11px] text-[#666666]">
                Upper bound constraint for empirical threshold tuning under Protocol B. The calibration algorithm selects
                the lowest decision cutoff yielding an empirical FPR on training/validation partitions at or below this target.
              </p>
              <div className="flex items-center gap-2 pt-1">
                {[0.001, 0.0035, 0.005, 0.01].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setTargetFpr(val)}
                    className={`px-2.5 py-1.5 text-xs font-mono rounded border transition-colors ${
                      targetFpr === val
                        ? "bg-[#111111] text-[#FFFFFF] border-[#111111]"
                        : "bg-[#FFFFFF] text-[#333333] border-[#CCCCCC] hover:bg-[#F0F0F0]"
                    }`}
                  >
                    {(val * 100).toFixed(2)}%
                  </button>
                ))}
                <input
                  type="number"
                  min="0.0001"
                  max="0.05"
                  step="0.0005"
                  value={targetFpr}
                  onChange={(e) => setTargetFpr(parseFloat(e.target.value) || 0.0035)}
                  className="w-24 px-2.5 py-1.5 text-xs font-mono border border-[#CCCCCC] rounded bg-[#FFFFFF] text-[#111111]"
                />
              </div>
            </div>

            {/* CARI Omega Penalty */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold text-[#111111]">
                  CARI FPR Penalty Factor (omega)
                </label>
                <span className="text-xs font-mono text-[#666666]">
                  Multiplier = {cariOmega.toFixed(1)}x
                </span>
              </div>
              <p className="text-[11px] text-[#666666]">
                Governs the severity of the false-alarm penalty in the CARI metric:
                <br />
                <code className="text-[10px] font-mono text-[#333333] bg-[#F7F7F7] px-1 py-0.5 rounded">
                  CARI = F1 * max(0, 1 - omega * FPR) * (0.50 + RCS / 200)
                </code>
              </p>
              <div className="flex items-center gap-2 pt-1">
                {[1.0, 1.5, 2.0, 2.5, 3.0].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setCariOmega(val)}
                    className={`px-3 py-1.5 text-xs font-mono rounded border transition-colors ${
                      cariOmega === val
                        ? "bg-[#111111] text-[#FFFFFF] border-[#111111]"
                        : "bg-[#FFFFFF] text-[#333333] border-[#CCCCCC] hover:bg-[#F0F0F0]"
                    }`}
                  >
                    {val.toFixed(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Compatibility Mode */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold text-[#111111]">
                  Manuscript Benchmark Reproduction Mode
                </label>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    compatMode
                      ? "border-[#111111] bg-[#111111] text-[#FFFFFF]"
                      : "border-[#CCCCCC] bg-[#F7F7F7] text-[#666666]"
                  }`}
                >
                  {compatMode ? "ENABLED" : "STANDARD"}
                </span>
              </div>
              <p className="text-[11px] text-[#666666]">
                When enabled, the calculation pipeline strictly reproduces Attanti et al. Table III empirical
                baseline assumptions without non-linear floor adjustments.
              </p>
              <div className="pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-[#333333]">
                  <input
                    type="checkbox"
                    checked={compatMode}
                    onChange={(e) => setCompatMode(e.target.checked)}
                    className="w-4 h-4 border-[#CCCCCC] rounded text-[#111111] focus:ring-0"
                  />
                  <span>Enforce exact Attanti et al. (2026) published numerical compatibility</span>
                </label>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E5E5E5] flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-[#111111] text-[#FFFFFF] text-xs font-mono font-bold rounded hover:bg-[#333333] transition-colors disabled:opacity-50"
            >
              {saving ? "Persisting Changes..." : "Save Configuration"}
            </button>
          </div>
        </div>

        {/* Section 2: Platform Architecture & Diagnostics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Server & Runtime Diagnostic */}
          <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
              <div className="flex items-center gap-2">
                <Server size={16} className="text-[#111111]" />
                <h3 className="text-xs font-bold uppercase font-mono text-[#111111]">
                  Backend API &amp; Server Health
                </h3>
              </div>
              <button
                onClick={pingHealth}
                className="p-1 text-[#666666] hover:text-[#111111] hover:bg-[#F0F0F0] rounded"
                title="Ping Server"
              >
                <RefreshCw size={13} />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between py-1 border-b border-[#F0F0F0]">
                <span className="text-[#666666]">Service Name</span>
                <span className="font-bold text-[#111111]">{serverInfo.app_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F0F0F0]">
                <span className="text-[#666666]">API Version</span>
                <span className="text-[#111111]">{serverInfo.version}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F0F0F0]">
                <span className="text-[#666666]">Endpoint Target</span>
                <span className="text-[#111111]">http://localhost:8000</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F0F0F0]">
                <span className="text-[#666666]">Operational Status</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                    healthStatus.status === "healthy"
                      ? "border-[#111111] bg-[#111111] text-[#FFFFFF]"
                      : healthStatus.status === "degraded"
                      ? "border-[#666666] bg-[#F7F7F7] text-[#333333]"
                      : "border-[#999999] bg-[#FFFFFF] text-[#999999]"
                  }`}
                >
                  {healthStatus.status.toUpperCase()}
                  {healthStatus.pingMs ? ` (${healthStatus.pingMs}ms)` : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Database & Storage Architecture */}
          <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-[#E5E5E5] pb-3">
              <Database size={16} className="text-[#111111]" />
              <h3 className="text-xs font-bold uppercase font-mono text-[#111111]">
                Persistence &amp; Storage Engine
              </h3>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between py-1 border-b border-[#F0F0F0]">
                <span className="text-[#666666]">Database Engine</span>
                <span className="font-bold text-[#111111]">SQLite 3 (ACID-compliant)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F0F0F0]">
                <span className="text-[#666666]">Storage File</span>
                <span className="text-[#111111]">backend/serc_rcs.db</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F0F0F0]">
                <span className="text-[#666666]">Upload Payload Cap</span>
                <span className="text-[#111111]">{serverInfo.max_upload_size_mb} MB</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F0F0F0]">
                <span className="text-[#666666]">Supported Archives</span>
                <span className="text-[#111111]">{serverInfo.allowed_formats.join(", ")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Mathematical Reference Card */}
        <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E5E5E5] pb-3">
            <FileCode size={16} className="text-[#111111]" />
            <h3 className="text-xs font-bold uppercase font-mono text-[#111111]">
              Mathematical Invariants &amp; Scoring Formulas Reference
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-3 border border-[#E5E5E5] rounded bg-[#F7F7F7] space-y-1">
              <div className="font-bold text-[#111111] text-[11px]">Weighted Accuracy</div>
              <div className="text-[10px] text-[#666666]">
                WAcc(L) = (L * TN + TP) / (L * N_legit + N_spam)
              </div>
              <p className="text-[10px] text-[#888888] font-sans pt-1">
                Reflects the asymmetric cost of false positives by weighting legitimate email classifications.
              </p>
            </div>

            <div className="p-3 border border-[#E5E5E5] rounded bg-[#F7F7F7] space-y-1">
              <div className="font-bold text-[#111111] text-[11px]">Total Cost Ratio</div>
              <div className="text-[10px] text-[#666666]">
                TCR(L) = N_spam / (L * FP + FN)
              </div>
              <p className="text-[10px] text-[#888888] font-sans pt-1">
                Compares the baseline cost of having no filter against the actual cost with the active filter.
              </p>
            </div>

            <div className="p-3 border border-[#E5E5E5] rounded bg-[#F7F7F7] space-y-1">
              <div className="font-bold text-[#111111] text-[11px]">CARI Score</div>
              <div className="text-[10px] text-[#666666]">
                CARI = F1 * max(0, 1 - 2*FPR) * (0.50 + RCS/200)
              </div>
              <p className="text-[10px] text-[#888888] font-sans pt-1">
                Harmonizes predictive F1, false alarm penalties, and SERC checklist reporting rigor into a 0-1 composite score.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
