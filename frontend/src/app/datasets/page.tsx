"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import MetricsCard from "@/components/MetricsCard";
import { fetchDatasets, createSyntheticBenchmark, uploadDataset, fetchDatasetPreview } from "@/lib/api";
import { Dataset } from "@/lib/types";
import {
  Upload,
  Database,
  Download,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Search,
  Mail,
  ChevronDown,
  ChevronUp,
  Filter,
  Copy,
  Check,
  ShieldCheck,
  Layers,
} from "lucide-react";

export default function DatasetLaboratoryPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [benchmarkFilter, setBenchmarkFilter] = useState("");

  // Live Sample Email Explorer state
  const [sampleEmails, setSampleEmails] = useState<any[]>([]);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [sampleFilter, setSampleFilter] = useState<"ALL" | "HAM" | "SPAM" | "DUPLICATES">("ALL");
  const [sampleSearch, setSampleSearch] = useState("");
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    fetchDatasets()
      .then((data) => {
        setDatasets(data || []);
        if (data && data.length > 0 && !selectedDataset) {
          setSelectedDataset(data[0]);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedDataset?.id) {
      setSampleLoading(true);
      fetchDatasetPreview(selectedDataset.id, 50)
        .then((res) => {
          setSampleEmails(res.sample_rows || []);
          setSampleLoading(false);
        })
        .catch(() => {
          setSampleEmails([]);
          setSampleLoading(false);
        });
    }
  }, [selectedDataset?.id]);

  const handleGenerateSynthetic = async () => {
    setGenerating(true);
    try {
      const newDs = await createSyntheticBenchmark();
      setSelectedDataset(newDs);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to generate benchmark dataset.");
    } finally {
      setGenerating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const uploaded = await uploadDataset(formData);
      setSelectedDataset(uploaded);
      loadData();
    } catch (err: any) {
      setUploadError(err.message || "Upload failed. Please check CSV format.");
    } finally {
      setUploading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered sample emails
  const filteredSamples = sampleEmails.filter((email) => {
    const isSpam = String(email.label).toLowerCase() === "spam" || email.label === 1 || email.label === "1";
    const isDup = email.is_duplicate === true || email.is_duplicate === "true" || email.is_duplicate === 1;

    if (sampleFilter === "HAM" && isSpam) return false;
    if (sampleFilter === "SPAM" && !isSpam) return false;
    if (sampleFilter === "DUPLICATES" && !isDup) return false;

    if (sampleSearch.trim()) {
      const q = sampleSearch.toLowerCase();
      const matchText = (email.text || "").toLowerCase().includes(q);
      const matchSubj = (email.subject || "").toLowerCase().includes(q);
      const matchId = (email.id || "").toLowerCase().includes(q);
      if (!matchText && !matchSubj && !matchId) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#FFFFFF]">
      <Header
        title="Dataset Laboratory"
        description="Inspect, validate, deduplicate, and manage email spam research corpora. Upload custom CSV files or load the 6,000-email multi-epoch benchmark."
        actions={
          <button
            onClick={handleGenerateSynthetic}
            disabled={generating}
            className="px-3.5 py-1.5 text-xs font-mono font-medium rounded bg-[#111111] text-[#FFFFFF] hover:bg-[#333333] transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Sparkles size={14} />
            <span>{generating ? "Generating..." : "Load Synthetic Benchmark (6k Emails)"}</span>
          </button>
        }
      />

      <div className="p-8 max-w-7xl mx-auto space-y-8">
        {/* ============================================================== */}
        {/* 1. UPLOAD & DATASET SELECTION ROW                              */}
        {/* ============================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* File Upload Box */}
          <div className="border border-dashed border-[#CCCCCC] rounded p-5 bg-[#FAFAFA] flex flex-col justify-center items-center text-center">
            <Upload size={22} className="text-[#666666] mb-2" />
            <h3 className="text-xs font-bold font-mono text-[#111111] uppercase tracking-wider mb-1">
              Upload Custom Email Corpus
            </h3>
            <p className="text-[11px] text-[#666666] mb-3">
              CSV with text and label columns. Maximum 50MB.
            </p>
            <label className="px-3.5 py-1.5 text-xs font-mono font-medium border border-[#111111] bg-[#FFFFFF] text-[#111111] rounded hover:bg-[#F0F0F0] cursor-pointer transition-colors">
              {uploading ? "Processing CSV..." : "Select CSV File"}
              <input
                type="file"
                accept=".csv,.tsv,.txt"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
            {uploadError && (
              <p className="text-[11px] text-[#111111] font-mono mt-2 bg-[#EEEEEE] p-1.5 rounded">
                {uploadError}
              </p>
            )}
          </div>

          {/* Dataset Switcher */}
          <div className="md:col-span-2 border border-[#E5E5E5] rounded p-5 bg-[#FFFFFF] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#666666] font-bold">
                  Active Research Datasets ({datasets.length})
                </span>
                <button
                  onClick={loadData}
                  className="text-xs text-[#666666] hover:text-[#111111] flex items-center gap-1 font-mono"
                >
                  <RefreshCw size={12} />
                  <span>Refresh</span>
                </button>
              </div>

              {datasets.length === 0 ? (
                <p className="text-xs text-[#888888] py-4 font-mono">
                  No datasets loaded. Click &quot;Load Synthetic Benchmark&quot; to begin.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {datasets.map((ds) => {
                    const isSelected = selectedDataset?.id === ds.id;
                    const hamRatio = ((ds.ham_count / (ds.row_count || 1)) * 100).toFixed(0);
                    const spamRatio = ((ds.spam_count / (ds.row_count || 1)) * 100).toFixed(0);

                    return (
                      <button
                        key={ds.id}
                        type="button"
                        onClick={() => setSelectedDataset(ds)}
                        className={`p-3 rounded border text-left text-xs transition-colors flex flex-col justify-between ${
                          isSelected
                            ? "border-[#111111] bg-[#111111] text-[#FFFFFF]"
                            : "border-[#E5E5E5] bg-[#FFFFFF] text-[#111111] hover:bg-[#F7F7F7]"
                        }`}
                      >
                        <div>
                          <div className="font-bold truncate">{ds.name}</div>
                          <div
                            className={`text-[10px] font-mono mt-1 ${
                              isSelected ? "text-[#CCCCCC]" : "text-[#666666]"
                            }`}
                          >
                            {(ds.row_count || 0).toLocaleString()} rows &bull; {ds.is_synthetic ? "SYNTHETIC" : "REAL UPLOAD"}
                          </div>
                        </div>

                        {/* Distribution Indicator */}
                        <div className="mt-2.5 space-y-1">
                          <div className="w-full h-1.5 bg-[#DDDDDD] rounded overflow-hidden flex">
                            <div style={{ width: `${hamRatio}%` }} className="bg-[#666666]" title={`Ham: ${hamRatio}%`} />
                            <div style={{ width: `${spamRatio}%` }} className="bg-[#111111]" title={`Spam: ${spamRatio}%`} />
                          </div>
                          <div className={`text-[9px] font-mono flex justify-between ${isSelected ? "text-[#BBBBBB]" : "text-[#888888]"}`}>
                            <span>Ham: {hamRatio}%</span>
                            <span>Spam: {spamRatio}%</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. SELECTED DATASET METRICS & SUMMARY                          */}
        {/* ============================================================== */}
        {selectedDataset && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5E5] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#111111]">
                  {selectedDataset.name}
                </h2>
                <div className="text-xs text-[#666666] font-mono mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>ID: {selectedDataset.id}</span>
                  <span>&bull;</span>
                  <span>File: {selectedDataset.filename}</span>
                  <span>&bull;</span>
                  <span>
                    Status: {selectedDataset.is_synthetic ? "Synthetic Benchmark" : "User Upload"}
                  </span>
                </div>
              </div>

              <a
                href={`/api/datasets/${selectedDataset.id}/export`}
                className="px-3.5 py-1.5 text-xs font-mono font-medium border border-[#CCCCCC] rounded hover:bg-[#F0F0F0] text-[#111111] flex items-center gap-1.5 transition-colors self-start sm:self-auto"
              >
                <Download size={13} />
                <span>Export Sanitized CSV</span>
              </a>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricsCard
                label="Total Messages (N)"
                value={(selectedDataset.row_count || 0).toLocaleString()}
                subtitle="Complete email pool size"
              />
              <MetricsCard
                label="Class Distribution"
                value={`${(selectedDataset.ham_count || 0).toLocaleString()} / ${(selectedDataset.spam_count || 0).toLocaleString()}`}
                subtitle={`Ham: ${(((selectedDataset.ham_count || 0) / (selectedDataset.row_count || 1)) * 100).toFixed(1)}% | Spam: ${(((selectedDataset.spam_count || 0) / (selectedDataset.row_count || 1)) * 100).toFixed(1)}%`}
                badge="Ham / Spam"
              />
              <MetricsCard
                label="Duplicate Density"
                value={(selectedDataset.duplicate_count || 0).toLocaleString()}
                subtitle={`${(((selectedDataset.duplicate_count || 0) / (selectedDataset.row_count || 1)) * 100).toFixed(1)}% duplicate campaign bursts`}
                badge="Pre-Split Audit"
              />
              <MetricsCard
                label="Timestamp Horizon"
                value={
                  selectedDataset.validation_summary?.has_valid_timestamps
                    ? "Chronological"
                    : selectedDataset.min_timestamp
                    ? "Chronological"
                    : "No Timestamps"
                }
                subtitle={
                  selectedDataset.min_timestamp
                    ? `${selectedDataset.min_timestamp.slice(0, 10)} to ${(selectedDataset.max_timestamp || "").slice(0, 10)}`
                    : "Timestamps unavailable"
                }
              />
            </div>

            {/* ============================================================== */}
            {/* 3. LIVE EMAIL CORPUS EXPLORER (ACTUAL EMAIL ROW INSPECTOR)     */}
            {/* ============================================================== */}
            <div className="border border-[#111111] rounded p-6 bg-[#FFFFFF] space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#EEEEEE] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-[#111111] text-[#FFFFFF] rounded uppercase font-bold tracking-wider">
                      Live Data Inspector
                    </span>
                    <span className="text-xs text-[#666666] font-mono">
                      Inspect Raw Email Payloads
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#111111] mt-1">
                    Sample Message Explorer ({filteredSamples.length} showing of {sampleEmails.length} loaded)
                  </h3>
                </div>

                {/* Search Bar */}
                <div className="relative w-full md:w-64">
                  <Search size={14} className="absolute left-2.5 top-2.5 text-[#888888]" />
                  <input
                    type="text"
                    value={sampleSearch}
                    onChange={(e) => setSampleSearch(e.target.value)}
                    placeholder="Search subject or text..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs font-mono border border-[#CCCCCC] rounded bg-[#FAFAFA] text-[#111111] focus:border-[#111111] focus:bg-[#FFFFFF]"
                  />
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { key: "ALL", label: `All (${sampleEmails.length})` },
                  {
                    key: "HAM",
                    label: `Ham Only (${sampleEmails.filter((s) => String(s.label).toLowerCase() === "ham" || s.label === 0).length})`,
                  },
                  {
                    key: "SPAM",
                    label: `Spam Only (${sampleEmails.filter((s) => String(s.label).toLowerCase() === "spam" || s.label === 1).length})`,
                  },
                  {
                    key: "DUPLICATES",
                    label: `Duplicate Bursts (${sampleEmails.filter((s) => s.is_duplicate === true || s.is_duplicate === 1).length})`,
                  },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setSampleFilter(tab.key as any)}
                    className={`px-3 py-1 text-xs font-mono rounded border transition-colors ${
                      sampleFilter === tab.key
                        ? "border-[#111111] bg-[#111111] text-[#FFFFFF] font-bold"
                        : "border-[#E5E5E5] bg-[#FAFAFA] text-[#444444] hover:bg-[#EAEAEA]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Sample Table */}
              {sampleLoading ? (
                <div className="p-8 text-center text-xs font-mono text-[#888888]">
                  Loading email samples from dataset...
                </div>
              ) : filteredSamples.length === 0 ? (
                <div className="p-8 text-center text-xs font-mono text-[#888888] border border-dashed border-[#E5E5E5] rounded">
                  No sample messages matching filter &quot;{sampleFilter}&quot;.
                </div>
              ) : (
                <div className="overflow-x-auto border border-[#E5E5E5] rounded">
                  <table className="table-monochrome w-full">
                    <thead>
                      <tr>
                        <th style={{ width: "12%" }}>Message ID</th>
                        <th style={{ width: "12%" }}>Label</th>
                        <th style={{ width: "16%" }}>Timestamp</th>
                        <th style={{ width: "14%" }}>Audit Status</th>
                        <th style={{ width: "46%" }}>Subject &amp; Body Preview</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono text-xs">
                      {filteredSamples.map((row: any) => {
                        const isSpam = String(row.label).toLowerCase() === "spam" || row.label === 1;
                        const isDup = row.is_duplicate === true || row.is_duplicate === 1;
                        const isExpanded = expandedEmailId === row.id;

                        return (
                          <tr key={row.id} className={isExpanded ? "bg-[#F9F9F9]" : ""}>
                            <td className="font-bold text-[#111111]">{row.id}</td>
                            <td>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  isSpam
                                    ? "border-[#111111] bg-[#111111] text-[#FFFFFF]"
                                    : "border-[#444444] bg-[#F7F7F7] text-[#111111]"
                                }`}
                              >
                                {isSpam ? "SPAM" : "HAM"}
                              </span>
                            </td>
                            <td className="text-[11px] text-[#666666]">
                              {row.timestamp ? String(row.timestamp).slice(0, 16) : "N/A"}
                            </td>
                            <td>
                              {isDup ? (
                                <span className="text-[10px] px-1.5 py-0.5 rounded border border-[#111111] bg-[#EEEEEE] text-[#111111] font-bold">
                                  BURST COPY
                                </span>
                              ) : (
                                <span className="text-[10px] px-1.5 py-0.5 rounded border border-[#CCCCCC] bg-[#FFFFFF] text-[#666666]">
                                  ORIGINAL
                                </span>
                              )}
                            </td>
                            <td>
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="font-bold text-[#111111] truncate max-w-md font-sans">
                                    {row.subject || (row.text ? row.text.slice(0, 60) : "No subject")}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setExpandedEmailId(isExpanded ? null : row.id)}
                                    className="text-[10px] text-[#111111] border border-[#CCCCCC] px-2 py-0.5 rounded hover:bg-[#EAEAEA] flex items-center gap-1 font-mono shrink-0"
                                  >
                                    <span>{isExpanded ? "Collapse" : "Inspect Body"}</span>
                                    {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                  </button>
                                </div>

                                {isExpanded ? (
                                  <div className="p-3 border border-[#CCCCCC] rounded bg-[#FFFFFF] space-y-2 mt-2">
                                    <div className="flex items-center justify-between border-b border-[#EEEEEE] pb-1.5">
                                      <span className="text-[10px] text-[#666666]">FULL MESSAGE TEXT:</span>
                                      <button
                                        type="button"
                                        onClick={() => copyToClipboard(row.text || row.body || "", row.id)}
                                        className="text-[10px] text-[#111111] flex items-center gap-1 hover:underline"
                                      >
                                        {copiedId === row.id ? (
                                          <>
                                            <Check size={11} />
                                            <span>Copied</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy size={11} />
                                            <span>Copy Text</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                    <pre className="text-[11px] font-mono text-[#222222] whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                                      {row.text || row.body || "Empty body"}
                                    </pre>
                                  </div>
                                ) : (
                                  <div className="text-[11px] text-[#666666] truncate max-w-lg">
                                    {row.body || row.text || "No preview"}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Warnings and Quality Audit */}
            <div className="border border-[#E5E5E5] rounded p-5 bg-[#FAFAFA]">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-[#111111] mb-2">
                Dataset Validity &amp; Methodological Notes
              </h3>
              {(!selectedDataset.validation_summary?.warnings || selectedDataset.validation_summary.warnings.length === 0) ? (
                <div className="flex items-center gap-2 text-xs text-[#111111]">
                  <CheckCircle2 size={15} />
                  <span>No validity warnings. Dataset satisfies pre-split verification checks.</span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {(selectedDataset.validation_summary.warnings || []).map((w, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-[#333333]">
                      <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-[#111111]" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Column Mapping Reference */}
            <div className="border border-[#E5E5E5] rounded p-5 bg-[#FFFFFF]">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-[#111111] mb-3">
                Active Feature Column Mapping
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                <div className="p-3 border border-[#E5E5E5] rounded bg-[#FAFAFA]">
                  <div className="text-[10px] text-[#888888]">TEXT COLUMN</div>
                  <div className="font-bold text-[#111111] mt-0.5">{selectedDataset.column_mapping?.text_col || "text"}</div>
                </div>
                <div className="p-3 border border-[#E5E5E5] rounded bg-[#FAFAFA]">
                  <div className="text-[10px] text-[#888888]">LABEL COLUMN</div>
                  <div className="font-bold text-[#111111] mt-0.5">{selectedDataset.column_mapping?.label_col || "label"}</div>
                </div>
                <div className="p-3 border border-[#E5E5E5] rounded bg-[#FAFAFA]">
                  <div className="text-[10px] text-[#888888]">TIMESTAMP COLUMN</div>
                  <div className="font-bold text-[#111111] mt-0.5">{selectedDataset.column_mapping?.timestamp_col || "timestamp"}</div>
                </div>
                <div className="p-3 border border-[#E5E5E5] rounded bg-[#FAFAFA]">
                  <div className="text-[10px] text-[#888888]">ID COLUMN</div>
                  <div className="font-bold text-[#111111] mt-0.5">{selectedDataset.column_mapping?.id_col || "id"}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 4. STRUCTURAL AUDIT OF EIGHT PUBLIC BENCHMARKS (TABLE IV)       */}
        {/* ============================================================== */}
        <div className="border border-[#E5E5E5] rounded p-6 bg-[#FFFFFF] space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-bold block">
                Table IV from Manuscript &bull; Section IV Benchmark Analysis
              </span>
              <h2 className="text-base font-bold text-[#111111] mt-0.5">
                Structural Audit of Eight Public Spam Benchmarks
              </h2>
              <p className="text-xs text-[#666666] mt-1">
                File layout, class balance, and the primary validity traps documented across standard literature corpora.
              </p>
            </div>

            <div className="relative w-full md:w-64">
              <Search size={14} className="absolute left-2.5 top-2.5 text-[#888888]" />
              <input
                type="text"
                value={benchmarkFilter}
                onChange={(e) => setBenchmarkFilter(e.target.value)}
                placeholder="Search corpora, traps, formats..."
                className="w-full pl-8 pr-3 py-1.5 text-xs font-mono border border-[#CCCCCC] rounded bg-[#FAFAFA] text-[#111111] focus:border-[#111111] focus:bg-[#FFFFFF]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="table-monochrome">
              <thead>
                <tr>
                  <th>Corpus &amp; Year</th>
                  <th>File / Feature Format</th>
                  <th>Ham vs. Spam</th>
                  <th>N</th>
                  <th>Check &amp; Leakage Trap</th>
                </tr>
              </thead>
              <tbody className="text-xs font-mono">
                {[
                  {
                    name: "UCI Spambase (1999) [17]",
                    format: "57 numeric columns; no raw text",
                    ratio: "Ham 2,788 (60.6%); spam 1,813 (39.4%)",
                    n: "4,601",
                    trap: "All ham from one engineer's inbox; raw-text tokenizers cannot run.",
                  },
                  {
                    name: "Ling-Spam (2000) [12]",
                    format: "Four text variants (raw, lemm, stop, lemm+stop)",
                    ratio: "Ham 2,412 (83.4%); spam 481 (16.6%)",
                    n: "2,893",
                    trap: "Ham from one linguistics mailing list; preprocessed version often unstated.",
                  },
                  {
                    name: "PU Sets (2000–2004) [12], [13]",
                    format: "Words replaced by integer token IDs",
                    ratio: "Spam 19.7% to 50.0%",
                    n: "1,099–4,139",
                    trap: "Integer codes remove spelling tricks, HTML tags, and word stems; deep models fail.",
                  },
                  {
                    name: "Apache SpamAssassin (2002–2006)",
                    format: "Intact RFC-822 files with headers & HTML",
                    ratio: "Ham 4,150 (68.6%); spam 1,897 (31.4%)",
                    n: "6,047",
                    trap: "Many papers drop the 250 hard_ham files, pushing precision >99% and hiding false alarms.",
                  },
                  {
                    name: "Enron-Spam (2006) [13]",
                    format: "Plain text, 6 user directories (enron1–enron6)",
                    ratio: "Ham 16,545 (49.1%); spam 17,171 (50.9%)",
                    n: "33,716",
                    trap: "Pooling enron1–enron6 before random splitting leaks employee names and terms.",
                  },
                  {
                    name: "NIST TREC (2005–2007) [11]",
                    format: "Time-ordered RFC-822 streams",
                    ratio: "Spam 57.3%, 66.6% per year",
                    n: "92k / 38k / 75k",
                    trap: "Shuffled k-fold leaks later spam waves into earlier folds; breaks chronological validity.",
                  },
                  {
                    name: "CEAS-2008 & CSDMC-2010",
                    format: "Full MIME/HTML bodies with SMTP lines",
                    ratio: "Ham 19.4% & 53.3%; spam 80.6% & 46.7%",
                    n: "141,935 & 4,327",
                    trap: "Subsets sampled without reporting seeds, decoding rules, or header strip logic.",
                  },
                  {
                    name: "Urdu CSV (2018–2024) [4]",
                    format: "Web-harvested or translated CSV",
                    ratio: "About 50.0% ham and 50.0% spam",
                    n: "5,000",
                    trap: "8% to 15% duplicate campaign copies; random split measures memorization.",
                  },
                ]
                  .filter((item) => {
                    if (!benchmarkFilter.trim()) return true;
                    const q = benchmarkFilter.toLowerCase();
                    return (
                      item.name.toLowerCase().includes(q) ||
                      item.format.toLowerCase().includes(q) ||
                      item.ratio.toLowerCase().includes(q) ||
                      item.trap.toLowerCase().includes(q)
                    );
                  })
                  .map((b) => (
                    <tr key={b.name}>
                      <td className="font-bold text-[#111111]">{b.name}</td>
                      <td className="text-[11px] font-sans">{b.format}</td>
                      <td>{b.ratio}</td>
                      <td>{b.n}</td>
                      <td className="text-[11px] font-sans text-[#444444]">{b.trap}</td>
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
