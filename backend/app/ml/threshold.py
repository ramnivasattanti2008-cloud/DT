"""
Threshold Calibration and False-Alarm Control Engine
Implements:
1. Theoretical cost-derived Bayes threshold: tau*(lambda) = lambda / (lambda + 1)
2. Empirical threshold search on training/validation split to satisfy target FPR ceiling
3. Threshold sweep generator across [0.01, 0.99] for interactive trade-off analysis
"""

from typing import List, Dict, Optional, Tuple, Any
import numpy as np
from .metrics import compute_confusion_matrix, calculate_all_metrics, ConfusionMatrix


def compute_bayes_threshold(lam: float) -> float:
    """
    Theoretical Bayes-optimal decision cutoff:
    tau*(lambda) = lambda / (lambda + 1)
    e.g. lambda = 9 -> tau* = 0.9000
         lambda = 99 -> tau* = 0.9900
    """
    return float(lam / (lam + 1.0))


def evaluate_threshold(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    threshold: float,
    lam: float = 99.0
) -> Dict[str, Any]:
    """Evaluates a single threshold against probabilities."""
    y_pred = (y_prob >= threshold).astype(int)
    cm = compute_confusion_matrix(y_true, y_pred)
    metrics = calculate_all_metrics(cm)
    return {
        "threshold": float(threshold),
        "tp": cm.tp,
        "tn": cm.tn,
        "fp": cm.fp,
        "fn": cm.fn,
        "accuracy": metrics.accuracy,
        "precision": metrics.precision,
        "recall": metrics.recall,
        "f1": metrics.f1,
        "fpr": metrics.fpr,
        "fnr": metrics.fnr,
        "specificity": metrics.specificity,
        "mcc": metrics.mcc,
        "tcr_9": metrics.tcr_9,
        "tcr_99": metrics.tcr_99,
        "tcr_custom": metrics.tcr_99 if lam == 99.0 else metrics.tcr_9,
    }


def calibrate_threshold_for_target_fpr(
    y_val_true: np.ndarray,
    y_val_prob: np.ndarray,
    target_fpr: float = 0.0035,
    min_threshold: float = 0.50,
    max_threshold: float = 0.99,
    num_steps: int = 1000,
    lam: float = 99.0,
) -> Tuple[float, Dict[str, Any], bool]:
    """
    Finds the lowest decision threshold on validation data that guarantees FPR <= target_fpr.
    Returns:
        (chosen_threshold, validation_metrics, constraint_satisfied_bool)
    """
    thresholds = np.linspace(min_threshold, max_threshold, num_steps)
    best_threshold = max_threshold
    best_res = None
    satisfied = False

    for t in thresholds:
        res = evaluate_threshold(y_val_true, y_val_prob, float(t), lam=lam)
        fpr = res["fpr"] or 0.0
        if fpr <= target_fpr:
            best_threshold = float(t)
            best_res = res
            satisfied = True
            break

    if not satisfied:
        # If no threshold satisfies target FPR, use max threshold and flag unsatisfied
        best_threshold = float(max_threshold)
        best_res = evaluate_threshold(y_val_true, y_val_prob, best_threshold, lam=lam)

    return best_threshold, best_res, satisfied


def generate_threshold_curve(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    steps: int = 50,
    lam: float = 99.0
) -> List[Dict[str, Any]]:
    """Generates evaluation metrics across a sweep of thresholds for visualization."""
    curve = []
    for t in np.linspace(0.02, 0.98, steps):
        res = evaluate_threshold(y_true, y_prob, float(t), lam=lam)
        curve.append({
            "threshold": round(float(t), 4),
            "fpr": round(float(res["fpr"] or 0.0), 5),
            "recall": round(float(res["recall"] or 0.0), 5),
            "precision": round(float(res["precision"] or 0.0), 5),
            "f1": round(float(res["f1"] or 0.0), 5),
            "accuracy": round(float(res["accuracy"] or 0.0), 5),
            "tcr": round(float(res["tcr_99"] or 0.0), 3),
            "fp": res["fp"],
            "fn": res["fn"],
        })
    return curve
