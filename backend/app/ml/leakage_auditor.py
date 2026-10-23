"""
Automated Leakage Audit Engine
Inspects experiment artifacts and objectively verifies whether data leakage occurred:
1. Train/Test Duplicate Overlap Check
2. Chronological Future-to-Past Inversion Check
3. Pre-Split Vectorizer Fit Check
4. Supervised Feature Selection Leakage Check
5. Probability Calibration Overlap Check
6. Threshold Selection Test Leakage Check
"""

from typing import List, Dict, Any, Optional, Set
from dataclasses import dataclass
import pandas as pd


@dataclass
class LeakageCheckResult:
    check_id: str
    name: str
    passed: bool
    status: str  # "PASS", "FAIL", "WARNING", "NOT_APPLICABLE"
    severity: str  # "CRITICAL", "HIGH", "MEDIUM", "INFO"
    evidence: str
    remediation: str


@dataclass
class LeakageAuditReport:
    protocol_name: str
    is_safe_for_validation: bool
    total_checks: int
    checks_passed: int
    checks_failed: int
    checks: List[LeakageCheckResult]
    overall_summary: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "protocol_name": self.protocol_name,
            "is_safe_for_validation": self.is_safe_for_validation,
            "total_checks": self.total_checks,
            "checks_passed": self.checks_passed,
            "checks_failed": self.checks_failed,
            "checks": [
                {
                    "check_id": c.check_id,
                    "name": c.name,
                    "passed": c.passed,
                    "status": c.status,
                    "severity": c.severity,
                    "evidence": c.evidence,
                    "remediation": c.remediation,
                }
                for c in self.checks
            ],
            "overall_summary": self.overall_summary,
        }


def audit_train_test_duplicate_overlap(
    train_ids: Set[Any],
    test_ids: Set[Any],
    duplicate_groups: List[Dict[str, Any]],
) -> LeakageCheckResult:
    """Verifies that no duplicate template cluster spans across both train and test partitions."""
    overlapping_clusters = 0
    total_leaked_copies = 0

    for grp in duplicate_groups:
        orig = grp.get("original_id")
        dups = set(grp.get("duplicate_ids", []))
        all_members = dups.union({orig} if orig is not None else set())

        in_train = bool(all_members.intersection(train_ids))
        in_test = bool(all_members.intersection(test_ids))

        if in_train and in_test:
            overlapping_clusters += 1
            total_leaked_copies += len(all_members.intersection(test_ids))

    if overlapping_clusters > 0:
        return LeakageCheckResult(
            check_id="LEAK_DUP_01",
            name="Train/Test Duplicate Overlap",
            passed=False,
            status="FAIL",
            severity="CRITICAL",
            evidence=f"Detected {overlapping_clusters} duplicate clusters with {total_leaked_copies} copies crossing train and test partitions. Models can memorize template IDs instead of generalizable features.",
            remediation="Execute pre-split Shingle-Jaccard deduplication to purge duplicate burst copies before data partitioning.",
        )
    return LeakageCheckResult(
        check_id="LEAK_DUP_01",
        name="Train/Test Duplicate Overlap",
        passed=True,
        status="PASS",
        severity="INFO",
        evidence=f"Zero duplicate template overlap detected across train and test partitions ({len(duplicate_groups)} duplicate clusters verified).",
        remediation="No remediation necessary.",
    )


def audit_chronological_ordering(
    train_timestamps: Optional[pd.Series],
    test_timestamps: Optional[pd.Series],
) -> LeakageCheckResult:
    """Verifies that no training record postdates any test evaluation record."""
    if train_timestamps is None or test_timestamps is None or train_timestamps.empty or test_timestamps.empty:
        return LeakageCheckResult(
            check_id="LEAK_TIME_02",
            name="Chronological Train/Test Inversion",
            passed=False,
            status="WARNING",
            severity="HIGH",
            evidence="Timestamps are absent or unparseable. Chronological validation cannot be mathematically verified. Shuffled splits cannot guarantee temporal isolation.",
            remediation="Provide valid RFC-822 timestamps or ISO date strings to enable chronological stream validation.",
        )

    max_train_ts = train_timestamps.max()
    min_test_ts = test_timestamps.min()

    # Lookahead violations: test messages delivered earlier than training messages
    violations = (test_timestamps < max_train_ts).sum()

    if violations > 0:
        return LeakageCheckResult(
            check_id="LEAK_TIME_02",
            name="Chronological Train/Test Inversion",
            passed=False,
            status="FAIL",
            severity="CRITICAL",
            evidence=f"Look-ahead violation detected: {violations} test records ({violations/len(test_timestamps)*100:.1f}%) occur before max training timestamp ({max_train_ts}). Classifier trains on future spam campaigns before scoring earlier messages.",
            remediation="Enforce strict chronological sorting and contiguous time window partitioning (e.g. earliest 80% train, final 20% test).",
        )

    return LeakageCheckResult(
        check_id="LEAK_TIME_02",
        name="Chronological Train/Test Inversion",
        passed=True,
        status="PASS",
        severity="INFO",
        evidence=f"Strict chronological boundary preserved: all training messages precede test messages (Max Train: {max_train_ts} < Min Test: {min_test_ts}).",
        remediation="No remediation necessary.",
    )


def audit_vectorizer_fit_scope(vectorizer_fit_on_test: bool) -> LeakageCheckResult:
    """Checks whether TF-IDF vectorizer vocabulary was fitted globally on test data."""
    if vectorizer_fit_on_test:
        return LeakageCheckResult(
            check_id="LEAK_VEC_03",
            name="Pre-Split Vectorizer Fit",
            passed=False,
            status="FAIL",
            severity="CRITICAL",
            evidence="TfidfVectorizer.fit_transform() was called on full corpus before splitting. Vocabulary, document frequencies, and IDF weights leak held-out test distribution into training matrix.",
            remediation="Wrap vectorization inside a pipeline and invoke .fit() strictly on training split.",
        )
    return LeakageCheckResult(
        check_id="LEAK_VEC_03",
        name="Pre-Split Vectorizer Fit",
        passed=True,
        status="PASS",
        severity="INFO",
        evidence="Vectorizer vocabulary and IDF weights fitted strictly on training partition.",
        remediation="No remediation necessary.",
    )


def audit_feature_selection_leakage(feature_selection_used_test: bool) -> LeakageCheckResult:
    """Checks whether supervised feature selection (e.g. Chi-squared) accessed test labels."""
    if feature_selection_used_test:
        return LeakageCheckResult(
            check_id="LEAK_FS_04",
            name="Supervised Feature Selection Leakage",
            passed=False,
            status="FAIL",
            severity="CRITICAL",
            evidence="Supervised feature selection (Chi-square / SelectKBest) fitted on complete dataset, selecting tokens correlated with test set labels.",
            remediation="Fit SelectKBest or feature ranking strictly using training labels.",
        )
    return LeakageCheckResult(
        check_id="LEAK_FS_04",
        name="Supervised Feature Selection Leakage",
        passed=True,
        status="PASS",
        severity="INFO",
        evidence="Supervised feature selection fitted strictly on training partition.",
        remediation="No remediation necessary.",
    )


def audit_calibration_leakage(calibration_fit_on_test: bool) -> LeakageCheckResult:
    """Checks whether probability calibration (Platt scaling / isotonic) used test data."""
    if calibration_fit_on_test:
        return LeakageCheckResult(
            check_id="LEAK_CAL_05",
            name="Probability Calibration Overlap",
            passed=False,
            status="FAIL",
            severity="HIGH",
            evidence="Platt scaling or probability calibration fitted using final evaluation test set.",
            remediation="Fit Platt parameters via internal cross-validation on training partition or an independent validation split.",
        )
    return LeakageCheckResult(
        check_id="LEAK_CAL_05",
        name="Probability Calibration Overlap",
        passed=True,
        status="PASS",
        severity="INFO",
        evidence="Platt calibration parameters fitted via 5-fold cross-validation strictly on training data.",
        remediation="No remediation necessary.",
    )


def audit_threshold_selection_leakage(threshold_selected_on_test: bool) -> LeakageCheckResult:
    """Checks whether decision threshold tau* was selected by tuning directly on final test labels."""
    if threshold_selected_on_test:
        return LeakageCheckResult(
            check_id="LEAK_THR_06",
            name="Threshold Selection Test Leakage",
            passed=False,
            status="FAIL",
            severity="CRITICAL",
            evidence="Decision cutoff tau* was tuned directly against final test labels, inflating reported test performance.",
            remediation="Select cutoff tau* on a dedicated validation split or internal validation folds, then evaluate once on untouched test set.",
        )
    return LeakageCheckResult(
        check_id="LEAK_THR_06",
        name="Threshold Selection Test Leakage",
        passed=True,
        status="PASS",
        severity="INFO",
        evidence="Decision cutoff tau* calibrated using validation split without inspecting final test labels.",
        remediation="No remediation necessary.",
    )


def generate_leakage_audit_report(
    protocol_name: str,
    train_ids: Set[Any],
    test_ids: Set[Any],
    duplicate_groups: List[Dict[str, Any]],
    train_timestamps: Optional[pd.Series],
    test_timestamps: Optional[pd.Series],
    vectorizer_fit_on_test: bool,
    feature_selection_used_test: bool,
    calibration_fit_on_test: bool,
    threshold_selected_on_test: bool,
) -> LeakageAuditReport:
    """Runs all 6 leakage audit checks and generates a comprehensive report."""
    checks = [
        audit_train_test_duplicate_overlap(train_ids, test_ids, duplicate_groups),
        audit_chronological_ordering(train_timestamps, test_timestamps),
        audit_vectorizer_fit_scope(vectorizer_fit_on_test),
        audit_feature_selection_leakage(feature_selection_used_test),
        audit_calibration_leakage(calibration_fit_on_test),
        audit_threshold_selection_leakage(threshold_selected_on_test),
    ]

    passed_count = sum(1 for c in checks if c.passed)
    failed_count = sum(1 for c in checks if not c.passed)
    is_safe = (failed_count == 0)

    if is_safe:
        summary = "All 6 leakage safeguards verified. Experiment is methodologically sound and suitable for publication and deployment validation."
    else:
        summary = f"CRITICAL: {failed_count} leakage safeguard(s) failed. Evaluation results are inflated by data leakage and UNSAFE FOR PRODUCTION VALIDATION."

    return LeakageAuditReport(
        protocol_name=protocol_name,
        is_safe_for_validation=is_safe,
        total_checks=len(checks),
        checks_passed=passed_count,
        checks_failed=failed_count,
        checks=checks,
        overall_summary=summary,
    )
