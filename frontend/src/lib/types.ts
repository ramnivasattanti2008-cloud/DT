export interface MetricValues {
  tp: number;
  tn: number;
  fp: number;
  fn: number;
  total: number;
  accuracy: number | null;
  precision: number | null;
  recall: number | null;
  f1: number | null;
  fpr: number | null;
  fnr: number | null;
  specificity: number | null;
  mcc: number | null;
  wacc_9: number | null;
  wacc_99: number | null;
  tcr_9: number | null;
  tcr_99: number | null;
  tcr_999: number | null;
}

export interface CariBreakdown {
  f1: number;
  fpr: number;
  rcs_percentage: number;
  omega: number;
  f1_factor: number;
  fpr_penalty_factor: number;
  rcs_factor: number;
  cari_score: number;
  is_compatibility_mode: boolean;
  notes: string;
}

export interface ModelResult {
  model_key: string;
  display_name: string;
  threshold: number;
  threshold_constraint_satisfied?: boolean;
  metrics: MetricValues;
  cari_score: number | null;
  cari_breakdown?: CariBreakdown;
  top_features?: Array<{ term: string; weight: number; direction: string }>;
  y_test_prob?: number[];
}

export interface SercEvaluationItem {
  item_id: string;
  grade: string;
  rationale: string;
  evidence_found: string;
  remediation: string;
}

export interface SercAssessment {
  evaluations: Record<string, SercEvaluationItem>;
  points_earned: number;
  applicable_count: number;
  rcs_percentage: number | null;
  tier: string;
}

export interface LeakageCheck {
  check_id: string;
  name: string;
  passed: boolean;
  status: string;
  severity: string;
  evidence: string;
  remediation: string;
}

export interface LeakageReport {
  protocol_name: string;
  is_safe_for_validation: boolean;
  total_checks: number;
  checks_passed: number;
  checks_failed: number;
  checks: LeakageCheck[];
  overall_summary: string;
}

export interface Dataset {
  id: string;
  name: string;
  filename: string;
  row_count: number;
  spam_count: number;
  ham_count: number;
  duplicate_count: number;
  min_timestamp: string | null;
  max_timestamp: string | null;
  is_synthetic: boolean;
  column_mapping: Record<string, string>;
  validation_summary: {
    is_valid: boolean;
    total_rows: number;
    spam_count: number;
    ham_count: number;
    spam_ratio: number;
    duplicate_count: number;
    has_valid_timestamps: boolean;
    warnings: string[];
    errors: string[];
  };
  created_at: string;
}

export interface Experiment {
  id: string;
  name: string;
  dataset_id: string;
  protocol: string;
  is_safe: boolean;
  random_seed: number;
  n_train: number;
  n_test: number;
  duplicates_purged: number;
  target_fpr: number;
  cost_weight_lambda: number;
  best_model_key: string | null;
  best_f1: number | null;
  best_fpr: number | null;
  best_tcr: number | null;
  rcs_percentage: number | null;
  quality_tier: string | null;
  cari_score: number | null;
  model_results: ModelResult[];
  serc_assessment: SercAssessment;
  leakage_report: LeakageReport;
  deduplication_report: any;
  notes: string | null;
  created_at: string;
}

export interface HistoricalStudy {
  study_id: number;
  study: string;
  era: string;
  primary_dataset: string;
  c1: number;
  c2: number;
  c3: number;
  c4: number;
  c5: number;
  c6: number;
  c7: number;
  c8: number;
  c9: number;
  c10: number;
  tpe: number;
  nac: number;
  rcs_pct: number;
  tier: string;
}

export interface InterRaterStats {
  total_studies: number;
  total_pairs: number;
  exact_agreement_count: number;
  exact_agreement_pct: number;
  p_e: number;
  cohens_kappa_unweighted: number;
  cohens_kappa_weighted: number;
  se_kappa: number;
  ci_95: number[];
  z_stat: number;
  p_value_kappa: number;
  foundational_mean_rcs: number;
  contemporary_mean_rcs: number;
  welch_t_stat: number;
  welch_p_val: number;
  mann_whitney_u: number;
  mann_whitney_p_val: number;
}
