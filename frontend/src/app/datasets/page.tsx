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
} from "lucide-react";

export default function DatasetLaboratoryPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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
                <tr>
                  <td className="font-bold text-[#111111]">UCI Spambase (1999) [17]</td>
                  <td className="text-[11px] font-sans">57 numeric columns; no raw text</td>
                  <td>Ham 2,788 (60.6%); spam 1,813 (39.4%)</td>
                  <td>4,601</td>
                  <td className="text-[11px] font-sans text-[#444444]">All ham from one engineer&apos;s inbox; raw-text tokenizers cannot run.</td>
                </tr>
                <tr>
                  <td className="font-bold text-[#111111]">Ling-Spam (2000) [12]</td>
                  <td className="text-[11px] font-sans">Four text variants (raw, lemm, stop, lemm+stop)</td>
                  <td>Ham 2,412 (83.4%); spam 481 (16.6%)</td>
                  <td>2,893</td>
                  <td className="text-[11px] font-sans text-[#444444]">Ham from one linguistics mailing list; preprocessed version often unstated.</td>
                </tr>
                <tr>
                  <td className="font-bold text-[#111111]">PU Sets (2000&ndash;2004) [12], [13]</td>
                  <td className="text-[11px] font-sans">Words replaced by integer token IDs</td>
                  <td>Spam 19.7% to 50.0%</td>
                  <td>1,099&ndash;4,139</td>
                  <td className="text-[11px] font-sans text-[#444444]">Integer codes remove spelling tricks, HTML tags, and word stems; deep models fail.</td>
                </tr>
                <tr>
                  <td className="font-bold text-[#111111]">Apache SpamAssassin (2002&ndash;2006)</td>
                  <td className="text-[11px] font-sans">Intact RFC-822 files with headers &amp; HTML</td>
                  <td>Ham 4,150 (68.6%); spam 1,897 (31.4%)</td>
                  <td>6,047</td>
                  <td className="text-[11px] font-sans text-[#444444]">Many papers drop the 250 hard_ham files, pushing precision &gt;99% and hiding false alarms.</td>
                </tr>
                <tr>
                  <td className="font-bold text-[#111111]">Enron-Spam (2006) [13]</td>
                  <td className="text-[11px] font-sans">Plain text, 6 user directories (enron1&ndash;enron6)</td>
                  <td>Ham 16,545 (49.1%); spam 17,171 (50.9%)</td>
                  <td>33,716</td>
                  <td className="text-[11px] font-sans text-[#444444]">Pooling enron1&ndash;enron6 before random splitting leaks employee names and terms.</td>
                </tr>
                <tr>
                  <td className="font-bold text-[#111111]">NIST TREC (2005&ndash;2007) [11]</td>
                  <td className="text-[11px] font-sans">Time-ordered RFC-822 streams</td>
                  <td>Spam 57.3%, 66.6% per year</td>
                  <td>92k / 38k / 75k</td>
                  <td className="text-[11px] font-sans text-[#444444]">Shuffled k-fold leaks later spam waves into earlier folds; breaks chronological validity.</td>
                </tr>
                <tr>
                  <td className="font-bold text-[#111111]">CEAS-2008 &amp; CSDMC-2010</td>
                  <td className="text-[11px] font-sans">Full MIME/HTML bodies with SMTP lines</td>
                  <td>Ham 19.4% &amp; 53.3%; spam 80.6% &amp; 46.7%</td>
                  <td>141,935 &amp; 4,327</td>
                  <td className="text-[11px] font-sans text-[#444444]">Subsets sampled without reporting seeds, decoding rules, or header strip logic.</td>
                </tr>
                <tr>
                  <td className="font-bold text-[#111111]">Urdu CSV (2018&ndash;2024) [4]</td>
                  <td className="text-[11px] font-sans">Web-harvested or translated CSV</td>
                  <td>About 50.0% ham and 50.0% spam</td>
                  <td>5,000</td>
                  <td className="text-[11px] font-sans text-[#444444]">8% to 15% duplicate campaign copies; random split measures memorization.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
