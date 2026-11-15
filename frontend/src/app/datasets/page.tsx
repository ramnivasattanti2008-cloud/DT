"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import MetricsCard from "@/components/MetricsCard";
import { fetchDatasets, createSyntheticBenchmark, uploadDataset } from "@/lib/api";
import { Dataset } from "@/lib/types";
import {
  Upload,
  Database,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Search,
} from "lucide-react";

export default function DatasetLaboratoryPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [benchmarkFilter, setBenchmarkFilter] = useState("");

  const loadData = () => {
    setLoading(true);
    fetchDatasets()
      .then((data) => {
        setDatasets(data);
        if (data.length > 0 && !selectedDataset) {
          setSelectedDataset(data[0]);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

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

  return (
    <div className="min-h-screen bg-[#FFFFFF]">
      <Header
        title="Dataset Laboratory"
        description="Inspect, validate, deduplicate, and manage email spam research corpora. Upload custom CSV files or load the 6,000-email multi-epoch benchmark."
        actions={
          <button
            onClick={handleGenerateSynthetic}
            disabled={generating}
            className="px-3.5 py-1.5 text-xs font-medium rounded bg-[#111111] text-[#FFFFFF] hover:bg-[#333333] transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Sparkles size={14} />
            <span>{generating ? "Generating Benchmark..." : "Load Synthetic Benchmark (6k Emails)"}</span>
          </button>
        }
      />

      <div className="p-8 max-w-7xl mx-auto space-y-8">
        {/* Upload and Dataset Selector Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* File Upload Dropzone */}
          <div className="border border-dashed border-[#CCCCCC] rounded p-5 bg-[#FAFAFA] flex flex-col justify-center items-center text-center">
            <Upload size={24} className="text-[#666666] mb-2" />
            <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider mb-1">
              Upload Custom Email Corpus
            </h3>
            <p className="text-[11px] text-[#666666] mb-3">
              CSV with text and label columns. Maximum 50MB.
            </p>
            <label className="px-3 py-1.5 text-xs font-medium border border-[#111111] bg-[#FFFFFF] text-[#111111] rounded hover:bg-[#F0F0F0] cursor-pointer transition-colors">
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

          {/* Dataset Selector */}
          <div className="md:col-span-2 border border-[#E5E5E5] rounded p-5 bg-[#FFFFFF] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#666666]">
                  Active Research Datasets ({datasets.length})
                </span>
                <button
                  onClick={loadData}
                  className="text-xs text-[#666666] hover:text-[#111111] flex items-center gap-1"
                >
                  <RefreshCw size={12} />
                  <span>Refresh</span>
                </button>
              </div>

              {datasets.length === 0 ? (
                <p className="text-xs text-[#888888] py-4">
                  No datasets loaded. Click &quot;Load Synthetic Benchmark&quot; to begin.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {datasets.map((ds) => (
                    <button
                      key={ds.id}
                      onClick={() => setSelectedDataset(ds)}
                      className={`p-3 rounded border text-left text-xs transition-colors ${
                        selectedDataset?.id === ds.id
                          ? "border-[#111111] bg-[#111111] text-[#FFFFFF]"
                          : "border-[#E5E5E5] bg-[#FFFFFF] text-[#111111] hover:bg-[#F7F7F7]"
                      }`}
                    >
                      <div className="font-bold truncate">{ds.name}</div>
                      <div
                        className={`text-[10px] font-mono mt-1 ${
                          selectedDataset?.id === ds.id ? "text-[#CCCCCC]" : "text-[#666666]"
                        }`}
                      >
                        {ds.row_count.toLocaleString()} rows &bull; {ds.is_synthetic ? "SYNTHETIC" : "REAL UPLOAD"}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Selected Dataset Inspection */}
        {selectedDataset && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#111111]">
                  {selectedDataset.name}
                </h2>
                <div className="text-xs text-[#666666] font-mono mt-0.5 flex items-center gap-3">
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
                className="px-3 py-1.5 text-xs font-medium border border-[#CCCCCC] rounded hover:bg-[#F0F0F0] text-[#111111] flex items-center gap-1.5 transition-colors"
              >
                <Download size={13} />
                <span>Export Sanitized CSV</span>
              </a>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricsCard
                label="Total Message Count (N)"
                value={selectedDataset.row_count.toLocaleString()}
                subtitle="Complete email pool size"
              />
              <MetricsCard
                label="Class Distribution"
                value={`${selectedDataset.ham_count.toLocaleString()} / ${selectedDataset.spam_count.toLocaleString()}`}
                subtitle={`Ham: ${((selectedDataset.ham_count / (selectedDataset.row_count || 1)) * 100).toFixed(1)}% | Spam: ${((selectedDataset.spam_count / (selectedDataset.row_count || 1)) * 100).toFixed(1)}%`}
                badge="Ham / Spam"
              />
              <MetricsCard
                label="Duplicate Density"
                value={selectedDataset.duplicate_count.toLocaleString()}
                subtitle={`${((selectedDataset.duplicate_count / (selectedDataset.row_count || 1)) * 100).toFixed(1)}% duplicate campaign bursts`}
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
                    ? `${new Date(selectedDataset.min_timestamp).toLocaleDateString()} to ${new Date(selectedDataset.max_timestamp || "").toLocaleDateString()}`
                    : "Timestamps unavailable"
                }
              />
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

        {/* Section IV: Structural Audit of Eight Public Spam Benchmarks (Table IV) */}
        <div className="border border-[#E5E5E5] rounded p-6 bg-[#FFFFFF] space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#666666] block">
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
