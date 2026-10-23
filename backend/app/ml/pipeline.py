"""
Experiment Pipeline Engine: Protocol A & Protocol B Execution
Implements:
- Protocol A (Flawed baseline: duplicate retention, pre-split TF-IDF + Chi2, random 80:20, tau=0.50, UNSAFE)
- Protocol B (SERC-compliant: pre-split deduplication, chronological 80:20, train-only TF-IDF + Chi2, calibrated tau*, SAFE)
- 5-Stage Ablation sequence (A0 -> A1 -> A2 -> A3 -> B)
"""

from typing import Dict, Any, List, Optional, Tuple, Set
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.feature_selection import SelectKBest, chi2
from sklearn.model_selection import train_test_split

from .metrics import compute_confusion_matrix, calculate_all_metrics, ClassificationMetrics
from .serc_rcs import build_protocol_a_assessment, build_protocol_b_assessment, SercAssessment
from .cari import compute_cari, CariBreakdown
from .threshold import calibrate_threshold_for_target_fpr, evaluate_threshold, compute_bayes_threshold
from .deduplication import deduplicate_dataframe, DeduplicationReport
from .leakage_auditor import generate_leakage_audit_report, LeakageAuditReport
from .classifiers import get_all_classifiers, ClassifierWrapper


def prepare_labels(df: pd.DataFrame, label_col: str = "label") -> np.ndarray:
    """Standardizes spam/ham labels into binary 1 (spam) / 0 (ham)."""
    raw = df[label_col].astype(str).str.strip().str.lower()
    return np.where(raw.isin(["spam", "1", "true", "yes", "phish"]), 1, 0)


def run_protocol_a(
    df: pd.DataFrame,
    text_col: str = "text",
    label_col: str = "label",
    timestamp_col: Optional[str] = "timestamp",
    id_col: str = "id",
    random_state: int = 42,
    target_fpr: float = 0.0035,
    lam: float = 99.0,
    selected_models: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Executes Protocol A: Intentionally flawed baseline pipeline (UNSAFE).
    - Retains duplicate bursts
    - Pre-split TF-IDF + Chi2 fitted globally across all data
    - Shuffled stratified 80:20 split
    - Fixed tau = 0.50 cutoff
    """
    if id_col not in df.columns:
        df = df.copy()
        df[id_col] = [f"MSG_{i+1:05d}" for i in range(len(df))]

    # 1. Deliberately keep all duplicates
    n_total = len(df)
    y_all = prepare_labels(df, label_col)

    # 2. Pre-split TF-IDF and Chi-square fitted globally (LEAKAGE BUG)
    vectorizer = TfidfVectorizer(
        sublinear_tf=True,
        min_df=5,
        max_features=460,
        ngram_range=(1, 2),
    )
    X_all_vec = vectorizer.fit_transform(df[text_col].astype(str))

    # Supervised feature selection fitted across ALL data (LEAKAGE BUG)
    k_features = min(460, X_all_vec.shape[1])
    selector = SelectKBest(chi2, k=k_features)
    X_all = selector.fit_transform(X_all_vec, y_all)

    # 3. Shuffled stratified 80:20 split (TEMPORAL LEAKAGE BUG)
    indices = np.arange(n_total)
    train_idx, test_idx = train_test_split(
        indices,
        test_size=0.20,
        random_state=random_state,
        stratify=y_all,
    )

    X_train = X_all[train_idx]
    y_train = y_all[train_idx]
    X_test = X_all[test_idx]
    y_test = y_all[test_idx]

    train_df = df.iloc[train_idx]
    test_df = df.iloc[test_idx]

    train_ids = set(train_df[id_col])
    test_ids = set(test_df[id_col])

    # 4. Train classifiers & evaluate at tau = 0.50
    all_classifiers = get_all_classifiers(random_state=random_state)
    if selected_models:
        all_classifiers = {k: v for k, v in all_classifiers.items() if k in selected_models}

    model_results = []
    serc_assessment = build_protocol_a_assessment()
    rcs_pct = serc_assessment.rcs_percentage or 40.0

    # Extract duplicate groups for audit
    _, dup_report = deduplicate_dataframe(df, text_col=text_col, id_col=id_col, threshold=0.82)
    dup_groups_dict = [
        {"original_id": g.original_id, "duplicate_ids": g.duplicate_ids}
        for g in dup_report.duplicate_groups
    ]

    # Generate Leakage Audit
    train_ts = train_df[timestamp_col] if timestamp_col and timestamp_col in train_df.columns else None
    test_ts = test_df[timestamp_col] if timestamp_col and timestamp_col in test_df.columns else None

    leakage_report = generate_leakage_audit_report(
        protocol_name="Protocol A (Flawed Baseline)",
        train_ids=train_ids,
        test_ids=test_ids,
        duplicate_groups=dup_groups_dict,
        train_timestamps=train_ts,
        test_timestamps=test_ts,
        vectorizer_fit_on_test=True,  # Deliberate flaw
        feature_selection_used_test=True,  # Deliberate flaw
        calibration_fit_on_test=False,
        threshold_selected_on_test=False,
    )

    feature_names = [vectorizer.get_feature_names_out()[i] for i in selector.get_support(indices=True)]

    for model_key, clf in all_classifiers.items():
        clf.fit(X_train, y_train)
        y_test_prob = clf.predict_proba(X_test)
        y_test_pred = (y_test_prob >= 0.50).astype(int)

        cm = compute_confusion_matrix(y_test, y_test_pred)
        metrics = calculate_all_metrics(cm)
        cari_score, cari_breakdown = compute_cari(metrics.f1, metrics.fpr, rcs_pct, omega=2.0)

        top_features = clf.get_feature_importances(feature_names, top_k=15)

        model_results.append({
            "model_key": model_key,
            "display_name": clf.display_name,
            "threshold": 0.5000,
            "metrics": metrics.to_dict(),
            "cari_score": round(cari_score, 4) if cari_score is not None else None,
            "cari_breakdown": cari_breakdown.to_dict() if cari_breakdown else None,
            "top_features": top_features,
            "y_test_prob": y_test_prob.tolist()[:100],  # Sample for inspectability
        })

    return {
        "protocol": "Protocol A (Flawed Baseline)",
        "is_safe_for_validation": False,
        "n_total": n_total,
        "n_train": len(train_idx),
        "n_test": len(test_idx),
        "train_ham": int(np.sum(y_train == 0)),
        "train_spam": int(np.sum(y_train == 1)),
        "test_ham": int(np.sum(y_test == 0)),
        "test_spam": int(np.sum(y_test == 1)),
        "duplicates_purged": 0,
        "model_results": model_results,
        "serc_assessment": serc_assessment.to_dict(),
        "leakage_report": leakage_report.to_dict(),
    }


def run_protocol_b(
    df: pd.DataFrame,
    text_col: str = "text",
    label_col: str = "label",
    timestamp_col: Optional[str] = "timestamp",
    id_col: str = "id",
    random_state: int = 42,
    target_fpr: float = 0.0035,
    lam: float = 99.0,
    selected_models: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Executes Protocol B: Leakage-aware SERC-compliant evaluation (SAFE).
    - Inverted-index Shingle-Jaccard deduplication prior to split
    - Chronological 80:20 train/test partitioning
    - TF-IDF and Chi-square fitted STRICTLY on training split
    - Validation split used for threshold calibration (tau*) targeting FPR <= target_fpr
    - Untouched test set evaluated once
    """
    if id_col not in df.columns:
        df = df.copy()
        df[id_col] = [f"MSG_{i+1:05d}" for i in range(len(df))]

    n_raw = len(df)

    # 1. Pre-split Shingle-Jaccard deduplication
    clean_df, dup_report = deduplicate_dataframe(
        df,
        text_col=text_col,
        id_col=id_col,
        timestamp_col=timestamp_col,
        threshold=0.82,
    )
    n_clean = len(clean_df)

    # 2. Chronological partitioning (earliest 80% train, final 20% test)
    if timestamp_col and timestamp_col in clean_df.columns:
        clean_df = clean_df.sort_values(by=timestamp_col, ascending=True).reset_index(drop=True)
    else:
        # If dataset lacks timestamps, record explicit limitation and split sequentially
        clean_df = clean_df.reset_index(drop=True)

    y_clean = prepare_labels(clean_df, label_col)
    split_point = int(n_clean * 0.80)

    train_df = clean_df.iloc[:split_point].copy()
    test_df = clean_df.iloc[split_point:].copy()

    y_train = y_clean[:split_point]
    y_test = y_clean[split_point:]

    train_ids = set(train_df[id_col])
    test_ids = set(test_df[id_col])

    # 3. Fit TF-IDF vectorizer and Chi-square feature selection on TRAINING DATA ONLY
    vectorizer = TfidfVectorizer(
        sublinear_tf=True,
        min_df=5,
        max_features=310,
        ngram_range=(1, 2),
    )
    X_train_vec = vectorizer.fit_transform(train_df[text_col].astype(str))
    X_test_vec = vectorizer.transform(test_df[text_col].astype(str))

    k_features = min(310, X_train_vec.shape[1])
    selector = SelectKBest(chi2, k=k_features)
    X_train = selector.fit_transform(X_train_vec, y_train)
    X_test = selector.transform(X_test_vec)

    feature_names = [vectorizer.get_feature_names_out()[i] for i in selector.get_support(indices=True)]

    # 4. Internal Chronological Validation Split for Threshold Calibration (Earliest 80% of Train = Fit, Latest 20% of Train = Val)
    n_train_total = len(train_df)
    val_split_pt = int(n_train_total * 0.80)
    X_tr_fit = X_train[:val_split_pt]
    y_tr_fit = y_train[:val_split_pt]
    X_val = X_train[val_split_pt:]
    y_val = y_train[val_split_pt:]

    # 5. Train Classifiers, Calibrate Cutoffs on Val, and Score Once on Test
    all_classifiers = get_all_classifiers(random_state=random_state)
    if selected_models:
        all_classifiers = {k: v for k, v in all_classifiers.items() if k in selected_models}

    model_results = []
    serc_assessment = build_protocol_b_assessment()
    rcs_pct = serc_assessment.rcs_percentage or 100.0

    dup_groups_dict = [
        {"original_id": g.original_id, "duplicate_ids": g.duplicate_ids}
        for g in dup_report.duplicate_groups
    ]

    # Generate Leakage Audit
    train_ts = train_df[timestamp_col] if timestamp_col and timestamp_col in train_df.columns else None
    test_ts = test_df[timestamp_col] if timestamp_col and timestamp_col in test_df.columns else None

    leakage_report = generate_leakage_audit_report(
        protocol_name="Protocol B (SERC-Compliant)",
        train_ids=train_ids,
        test_ids=test_ids,
        duplicate_groups=dup_groups_dict,
        train_timestamps=train_ts,
        test_timestamps=test_ts,
        vectorizer_fit_on_test=False,
        feature_selection_used_test=False,
        calibration_fit_on_test=False,
        threshold_selected_on_test=False,
    )

    for model_key, clf in all_classifiers.items():
        # Fit on validation training partition to find optimal threshold tau*
        clf.fit(X_tr_fit, y_tr_fit)
        val_probs = clf.predict_proba(X_val)

        # Calibrate threshold to satisfy target FPR constraint on validation partition
        calibrated_tau, val_metrics, satisfied = calibrate_threshold_for_target_fpr(
            y_val_true=y_val,
            y_val_prob=val_probs,
            target_fpr=target_fpr,
            min_threshold=0.50,
            max_threshold=0.98,
            lam=lam,
        )

        # Refit on full training split before final test evaluation
        clf.fit(X_train, y_train)
        y_test_prob = clf.predict_proba(X_test)
        y_test_pred = (y_test_prob >= calibrated_tau).astype(int)

        cm = compute_confusion_matrix(y_test, y_test_pred)
        metrics = calculate_all_metrics(cm)
        cari_score, cari_breakdown = compute_cari(metrics.f1, metrics.fpr, rcs_pct, omega=2.0)

        top_features = clf.get_feature_importances(feature_names, top_k=15)

        model_results.append({
            "model_key": model_key,
            "display_name": clf.display_name,
            "threshold": round(float(calibrated_tau), 4),
            "threshold_constraint_satisfied": satisfied,
            "target_fpr_configured": target_fpr,
            "metrics": metrics.to_dict(),
            "cari_score": round(cari_score, 4) if cari_score is not None else None,
            "cari_breakdown": cari_breakdown.to_dict() if cari_breakdown else None,
            "top_features": top_features,
            "y_test_prob": y_test_prob.tolist()[:100],
        })

    return {
        "protocol": "Protocol B (SERC-Compliant)",
        "is_safe_for_validation": True,
        "n_raw": n_raw,
        "n_clean": n_clean,
        "duplicates_purged": dup_report.duplicates_removed,
        "n_train": len(train_df),
        "n_test": len(test_df),
        "train_ham": int(np.sum(y_train == 0)),
        "train_spam": int(np.sum(y_train == 1)),
        "test_ham": int(np.sum(y_test == 0)),
        "test_spam": int(np.sum(y_test == 1)),
        "model_results": model_results,
        "serc_assessment": serc_assessment.to_dict(),
        "leakage_report": leakage_report.to_dict(),
        "deduplication_report": dup_report.to_dict(),
    }
