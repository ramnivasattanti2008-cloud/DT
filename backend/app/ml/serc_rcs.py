"""
SERC-RCS Rubric and Audit Engine
Implements the 10-Item Spam Evaluation and Reproducibility Checklist (SERC),
Reporting Completeness Score (RCS) calculation, Quality Tier classification,
and historical benchmark data for the 20 audited literature studies (1999-2023).
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from enum import Enum


class SercGrade(str, Enum):
    FULL = "1.0"
    PARTIAL = "0.5"
    OMITTED = "0.0"
    NOT_APPLICABLE = "NA"


class QualityTier(str, Enum):
    TIER_A = "Tier A"
    TIER_B = "Tier B"
    TIER_C = "Tier C"
    TIER_D = "Tier D"
    UNDEFINED = "Undefined"


@dataclass
class SercItemDefinition:
    item_id: str  # C1 - C10
    name: str
    description: str
    required_evidence: str
    importance: str
    full_criteria: str
    partial_criteria: str
    omitted_criteria: str


SERC_CHECKLIST_DEFINITIONS: List[SercItemDefinition] = [
    SercItemDefinition(
        item_id="C1",
        name="Dataset Priors & Deduplication",
        description="Archive link, message total N, spam/ham split, and pre-split duplicate removal check.",
        required_evidence="Documented dataset source/URL, total N, exact spam/ham counts, and deduplication mechanism.",
        importance="Prevents near-duplicate campaign bursts and forwarded threads from contaminating both train and test splits.",
        full_criteria="Dataset link/source, exact spam/ham counts, and explicit pre-split deduplication method documented.",
        partial_criteria="Dataset name and sample size mentioned, but duplicate filtering skipped or unstated.",
        omitted_criteria="Unspecified corpus or undocumented scraping without provenance or duplicate check.",
    ),
    SercItemDefinition(
        item_id="C2",
        name="Train-Only Preprocessing",
        description="Tokenizer, stopword, and header rules, plus proof that TF-IDF and Chi-square fit on training data only.",
        required_evidence="Explicit verification that vectorizer vocabulary and feature selectors are fitted solely on training split.",
        importance="Blocks test-set document frequencies and label correlations from leaking into features.",
        full_criteria="Replicable text-cleaning steps with verifiable fit on training partition only.",
        partial_criteria="Text preprocessing mentioned, but fit_transform() executed on whole dataset or ambiguous.",
        omitted_criteria="Global pre-split vectorization or missing preprocessing pipeline details.",
    ),
    SercItemDefinition(
        item_id="C3",
        name="Split Design",
        description="Exact train/validation/test counts, stratification, and timestamp vs. random split justification.",
        required_evidence="Partition counts and split strategy (chronological vs random) clearly reported.",
        importance="Guards against future-to-past temporal leakage on time-ordered mail streams.",
        full_criteria="Exact sample counts for all partitions and chronological split justification.",
        partial_criteria="Split ratio stated (e.g. 80:20) without exact partition sizes or chronological justification.",
        omitted_criteria="Unstated split sizes, arbitrary subsetting, or undeclared cross-validation folds.",
    ),
    SercItemDefinition(
        item_id="C4",
        name="Model Settings",
        description="Specific model formulation (e.g., Multinomial NB), feature cap V, and tuned parameters.",
        required_evidence="Exact algorithm variants, hyperparameter grids, smoothing alpha, penalty C, tree count B, etc.",
        importance="Allows independent researchers to reproduce identical decision boundaries and model capacity.",
        full_criteria="Exact model variant, vocabulary size cap V, and all hyperparameters reported.",
        partial_criteria="General algorithm family named (e.g. 'SVM') with default or partial hyperparameters.",
        omitted_criteria="Model name only without parameters, formulation, or library settings.",
    ),
    SercItemDefinition(
        item_id="C5",
        name="Imbalance Metrics",
        description="Precision, Recall, F1, MCC, and AUC curves reported alongside raw Accuracy.",
        required_evidence="Multi-metric evaluation table reporting F1, Precision, Recall, and MCC/AUC.",
        importance="Prevents majority-class accuracy illusions on imbalanced mail corpora.",
        full_criteria="Precision, Recall, F1, and either MCC or ROC-AUC reported.",
        partial_criteria="Accuracy plus Precision, Recall, or F1 reported, but MCC/AUC omitted.",
        omitted_criteria="Raw Accuracy alone reported.",
    ),
    SercItemDefinition(
        item_id="C6",
        name="Explicit False Alarms",
        description="Direct False Positive Rate (FPR) percentage, Specificity, or complete 4-cell confusion matrix.",
        required_evidence="FPR, Specificity, or explicit TP, TN, FP, FN counts for every evaluated model.",
        importance="Measures how often legitimate business, academic, or personal mail gets incorrectly quarantined.",
        full_criteria="Explicit FPR percentage or 4-cell confusion matrix reported for every model.",
        partial_criteria="FPR or confusion matrix given for only a subset of models or best model.",
        omitted_criteria="False Positive Rate completely omitted or hidden across all model tables.",
    ),
    SercItemDefinition(
        item_id="C7",
        name="Cost Cutoff Tuning",
        description="Calibrated probability cutoff tau*, cost weight lambda, TCR score, or Recall at FPR <= 0.50%.",
        required_evidence="Threshold selection protocol, asymmetric cost parameter lambda, or TCR calculation.",
        importance="Aligns decision boundaries with the high real-world cost of blocking legitimate email.",
        full_criteria="Cost weight lambda, calibrated threshold tau*, or Total Cost Ratio (TCR) evaluated.",
        partial_criteria="Explicit recognition of default tau=0.50 cutoff without asymmetric tuning.",
        omitted_criteria="Cutoff tuning unmentioned; uncalibrated library default silently assumed.",
    ),
    SercItemDefinition(
        item_id="C8",
        name="Drift & Time Check",
        description="Time-ordered split evaluation or out-of-domain testing on a second mail archive.",
        required_evidence="Chronological holdout window or cross-corpus evaluation against adversarial drift.",
        importance="Checks whether filter accuracy holds up when spammers rotate topics and obfuscation tricks.",
        full_criteria="Chronological holdout evaluation or cross-domain archive validation executed.",
        partial_criteria="Multi-dataset random evaluation without time-ordered drift assessment.",
        omitted_criteria="Single static shuffled partition; concept drift ignored.",
    ),
    SercItemDefinition(
        item_id="C9",
        name="Code & Environment Archive",
        description="Package versions, PRNG seeds, compute specifications, and a permanent code repository link.",
        required_evidence="Repository link, random seeds, exact software versions, and hardware environment.",
        importance="Enables independent verification and turnkey reproduction in seconds.",
        full_criteria="Public code repository link with exact package versions and PRNG seeds.",
        partial_criteria="Library names or general software environment mentioned without code repo or seeds.",
        omitted_criteria="No code, scripts, seeds, or package environment information provided.",
    ),
    SercItemDefinition(
        item_id="C10",
        name="Scope & Limitations",
        description="Clear discussion of corpus age, single-inbox bias, language scope, and gateway drift limits.",
        required_evidence="Dedicated section discussing threats to validity, operational deployment caveats, and dataset limits.",
        importance="Prevents static offline laboratory benchmarks from being oversold as live enterprise filters.",
        full_criteria="Dedicated limitations section covering inbox bias, drift, and production relay constraints.",
        partial_criteria="Brief or one-line caveat regarding dataset size or general ML limits.",
        omitted_criteria="No discussion of limitations, bias, or operational scope constraints.",
    ),
]


@dataclass
class SercItemEvaluation:
    item_id: str
    grade: SercGrade
    rationale: str
    evidence_found: str
    remediation: str


@dataclass
class SercAssessment:
    evaluations: Dict[str, SercItemEvaluation]
    points_earned: float
    applicable_count: int
    rcs_percentage: Optional[float]
    tier: QualityTier

    def to_dict(self) -> Dict[str, Any]:
        return {
            "evaluations": {
                k: {
                    "item_id": v.item_id,
                    "grade": v.grade.value,
                    "rationale": v.rationale,
                    "evidence_found": v.evidence_found,
                    "remediation": v.remediation,
                }
                for k, v in self.evaluations.items()
            },
            "points_earned": self.points_earned,
            "applicable_count": self.applicable_count,
            "rcs_percentage": self.rcs_percentage,
            "tier": self.tier.value,
        }


def calculate_rcs(grades: Dict[str, SercGrade]) -> tuple[float, int, Optional[float], QualityTier]:
    """
    Computes points earned, number of applicable items, RCS percentage, and Quality Tier.
    RCS = 100 * (sum of applicable grades / number of applicable checks)
    Tier A: 80–100%
    Tier B: 60–79.9%
    Tier C: 40–59.9%
    Tier D: < 40%
    """
    points = 0.0
    applicable = 0

    for item_id, grade in grades.items():
        if grade == SercGrade.NOT_APPLICABLE:
            continue
        applicable += 1
        if grade == SercGrade.FULL:
            points += 1.0
        elif grade == SercGrade.PARTIAL:
            points += 0.5
        elif grade == SercGrade.OMITTED:
            points += 0.0

    if applicable == 0:
        return 0.0, 0, None, QualityTier.UNDEFINED

    rcs = (points / applicable) * 100.0

    if rcs >= 80.0:
        tier = QualityTier.TIER_A
    elif rcs >= 60.0:
        tier = QualityTier.TIER_B
    elif rcs >= 40.0:
        tier = QualityTier.TIER_C
    else:
        tier = QualityTier.TIER_D

    return points, applicable, rcs, tier


def build_protocol_a_assessment() -> SercAssessment:
    """Returns the baseline SERC assessment for Protocol A (40.0% RCS, Tier C)."""
    evals = {
        "C1": SercItemEvaluation("C1", SercGrade.OMITTED, "Near-duplicate campaign bursts and memo copies deliberately retained unpurged.", "480 duplicates retained in corpus.", "Purge near-duplicate burst templates before splitting."),
        "C2": SercItemEvaluation("C2", SercGrade.OMITTED, "TF-IDF and Chi-square fitted globally across full corpus before split.", "Pre-split vectorizer fit on all 6,000 rows.", "Fit vectorizer and feature selectors on training partition only."),
        "C3": SercItemEvaluation("C3", SercGrade.FULL, "Stratified random 80:20 split with exact counts.", "4,800 train, 1,200 test.", "Use chronological partitioning on time-ordered mail."),
        "C4": SercItemEvaluation("C4", SercGrade.FULL, "All model formulations, hyperparameter grids, and seeds documented.", "NumPy/SciPy/Scikit implementations with seed 42.", "None required."),
        "C5": SercItemEvaluation("C5", SercGrade.FULL, "F1, Accuracy, Precision, Recall, MCC, and ROC-AUC reported.", "Complete multi-metric reporting.", "None required."),
        "C6": SercItemEvaluation("C6", SercGrade.FULL, "Explicit 4-cell confusion matrix and FPR reported.", "TP/TN/FP/FN and FPR calculated.", "None required."),
        "C7": SercItemEvaluation("C7", SercGrade.OMITTED, "Default symmetric cutoff tau=0.50 used without cost tuning.", "Fixed tau=0.50 cutoff.", "Calibrate threshold tau* using training/validation split."),
        "C8": SercItemEvaluation("C8", SercGrade.OMITTED, "Random split ignores timestamps and temporal concept drift.", "Shuffled 80:20 split.", "Evaluate on chronologically subsequent holdout test window."),
        "C9": SercItemEvaluation("C9", SercGrade.OMITTED, "Protocol A baseline represents undocumented/opaque literature pipeline.", "Code parameters logged for audit comparison only.", "Release complete reproducible codebase and PRNG seed."),
        "C10": SercItemEvaluation("C10", SercGrade.OMITTED, "Protocol A omits operational gateway failure caveats.", "No operational risk warnings included in baseline.", "Document false alarm costs and concept drift failure modes."),
    }
    # 4.0 points / 10 = 40.0% (Tier C)
    points, count, rcs, tier = calculate_rcs({k: v.grade for k, v in evals.items()})
    return SercAssessment(evaluations=evals, points_earned=points, applicable_count=count, rcs_percentage=rcs, tier=tier)


def build_protocol_b_assessment() -> SercAssessment:
    """Returns the compliant SERC assessment for Protocol B (100.0% RCS, Tier A)."""
    evals = {
        "C1": SercItemEvaluation("C1", SercGrade.FULL, "Pre-split Jaccard deduplication purges 480 burst copies, leaving 5,520 clean emails.", "Deduplication audit log with template original IDs.", "None needed."),
        "C2": SercItemEvaluation("C2", SercGrade.FULL, "TF-IDF and Chi-square feature selection fitted strictly on training partition.", "Pipeline fits vectorizer on training rows only.", "None needed."),
        "C3": SercItemEvaluation("C3", SercGrade.FULL, "Chronological 80:20 split (4,416 train, 1,104 test) preventing future-to-past leakage.", "Strict timestamp ordering verified.", "None needed."),
        "C4": SercItemEvaluation("C4", SercGrade.FULL, "Complete model parameters, Laplace smoothing alpha=0.15, C=1.0/2.2, B=100, seed=42.", "All parameters documented in experiment configuration.", "None needed."),
        "C5": SercItemEvaluation("C5", SercGrade.FULL, "Full suite: Accuracy, Precision, Recall, F1, MCC, and ROC-AUC.", "All metrics computed at full precision.", "None needed."),
        "C6": SercItemEvaluation("C6", SercGrade.FULL, "Explicit FPR and 4-cell confusion matrix reported for every model.", "FPR in [0.15%, 0.29%], confusion counts logged.", "None needed."),
        "C7": SercItemEvaluation("C7", SercGrade.FULL, "Empirical threshold calibration tau* tuned on validation split for lambda=99 (FPR <= 0.35%).", "Calibrated tau* between 0.6670 and 0.9196.", "None needed."),
        "C8": SercItemEvaluation("C8", SercGrade.FULL, "Chronological Q4 final test window evaluating resilience against concept drift.", "Untouched Q4 holdout partition evaluated once.", "None needed."),
        "C9": SercItemEvaluation("C9", SercGrade.FULL, "Complete open-source repository with versioned dependencies and deterministic seed.", "Self-contained executable harness.", "None needed."),
        "C10": SercItemEvaluation("C10", SercGrade.FULL, "Thorough analysis of false alarm penalties, corpus age, and production gateway scope.", "Dedicated limitations section.", "None needed."),
    }
    points, count, rcs, tier = calculate_rcs({k: v.grade for k, v in evals.items()})
    return SercAssessment(evaluations=evals, points_earned=points, applicable_count=count, rcs_percentage=rcs, tier=tier)
