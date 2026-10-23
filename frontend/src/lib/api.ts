import {
  Dataset,
  Experiment,
  HistoricalStudy,
  InterRaterStats,
} from "./types";

const API_BASE = typeof window !== "undefined" ? "/api" : (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api");

export async function fetchHealth(): Promise<any> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error("Backend service unreachable");
  return res.json();
}

export async function fetchDatasets(): Promise<Dataset[]> {
  const res = await fetch(`${API_BASE}/datasets`);
  if (!res.ok) throw new Error("Failed to load datasets");
  return res.json();
}

export async function fetchDataset(id: string): Promise<Dataset> {
  const res = await fetch(`${API_BASE}/datasets/${id}`);
  if (!res.ok) throw new Error("Failed to load dataset");
  return res.json();
}

export async function createSyntheticBenchmark(): Promise<Dataset> {
  const res = await fetch(`${API_BASE}/datasets/generate-synthetic`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to generate synthetic benchmark");
  return res.json();
}

export async function uploadDataset(formData: FormData): Promise<Dataset> {
  const res = await fetch(`${API_BASE}/datasets/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(err.detail || "Upload failed");
  }
  return res.json();
}

export async function fetchExperiments(): Promise<Experiment[]> {
  const res = await fetch(`${API_BASE}/experiments`);
  if (!res.ok) throw new Error("Failed to load experiments");
  return res.json();
}

export async function fetchExperiment(id: string): Promise<Experiment> {
  const res = await fetch(`${API_BASE}/experiments/${id}`);
  if (!res.ok) throw new Error("Failed to load experiment");
  return res.json();
}

export async function runExperiment(payload: {
  dataset_id: string;
  name?: string;
  protocol: string;
  selected_models: string[];
  target_fpr: number;
  cost_weight_lambda: number;
  random_seed: number;
  notes?: string;
}): Promise<Experiment> {
  const res = await fetch(`${API_BASE}/experiments/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Experiment run failed" }));
    throw new Error(err.detail || "Experiment run failed");
  }
  return res.json();
}

export async function classifyEmail(payload: {
  text: string;
  protocol?: string;
  model_key?: string;
  threshold?: number;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/classifiers/classify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Classification failed");
  return res.json();
}

export async function fetchSampleEmails(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/classifiers/sample-emails`);
  if (!res.ok) throw new Error("Failed to load sample emails");
  const data = await res.json();
  return data.samples || [];
}

export async function fetchChecklist(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/serc/checklist`);
  if (!res.ok) throw new Error("Failed to load SERC checklist");
  const data = await res.json();
  return data.criteria || [];
}

export async function calculateSercCari(payload: {
  grades: Record<string, string>;
  f1_score?: number;
  fpr?: number;
  omega?: number;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/serc/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("SERC calculation failed");
  return res.json();
}

export async function fetchHistoricalStudies(): Promise<HistoricalStudy[]> {
  const res = await fetch(`${API_BASE}/serc/historical-studies`);
  if (!res.ok) throw new Error("Failed to load historical studies");
  const data = await res.json();
  return data.studies || [];
}

export async function fetchInterRaterStats(): Promise<InterRaterStats> {
  const res = await fetch(`${API_BASE}/serc/inter-rater-stats`);
  if (!res.ok) throw new Error("Failed to load inter-rater stats");
  return res.json();
}

export async function fetchLeakageDefinitions(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/leakage/definitions`);
  if (!res.ok) throw new Error("Failed to load leakage definitions");
  const data = await res.json();
  return data.safeguards || [];
}

export async function fetchSettings(): Promise<any> {
  const res = await fetch(`${API_BASE}/settings`);
  if (!res.ok) throw new Error("Failed to load settings");
  return res.json();
}

export async function updateSettings(payload: any): Promise<any> {
  const res = await fetch(`${API_BASE}/settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update settings");
  return res.json();
}

export async function fetchExperimentLatex(id: string): Promise<string> {
  const res = await fetch(`${API_BASE}/reports/experiment/${id}/latex`);
  if (!res.ok) throw new Error("Failed to generate LaTeX table");
  return res.text();
}
