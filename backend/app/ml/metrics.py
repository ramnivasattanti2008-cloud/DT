"""
SERC-RCS Research Lab: Mathematical Metrics Engine
Implements mathematically rigorous binary classification metrics, asymmetric false-alarm cost metrics,
and error-handling for degenerate confusion matrices.
"""

from dataclasses import dataclass
from typing import Optional, Dict, Any
import math
import numpy as np


@dataclass(frozen=True)
class ConfusionMatrix:
    tp: int
    tn: int
    fp: int
    fn: int

    @property
    def total(self) -> int:
        return self.tp + self.tn + self.fp + self.fn

    @property
    def total_positives(self) -> int:
        return self.tp + self.fn

    @property
    def total_negatives(self) -> int:
        return self.tn + self.fp


@dataclass(frozen=True)
class ClassificationMetrics:
    tp: int
    tn: int
    fp: int
    fn: int
    total: int
    accuracy: Optional[float]
    precision: Optional[float]
    recall: Optional[float]
    f1: Optional[float]
    fpr: Optional[float]
    fnr: Optional[float]
    specificity: Optional[float]
    mcc: Optional[float]
    wacc_9: Optional[float]
    wacc_99: Optional[float]
    tcr_9: Optional[float]
    tcr_99: Optional[float]
    tcr_999: Optional[float]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "tp": self.tp,
            "tn": self.tn,
            "fp": self.fp,
            "fn": self.fn,
            "total": self.total,
            "accuracy": self.accuracy,
            "precision": self.precision,
            "recall": self.recall,
            "f1": self.f1,
            "fpr": self.fpr,
            "fnr": self.fnr,
            "specificity": self.specificity,
            "mcc": self.mcc,
            "wacc_9": self.wacc_9,
            "wacc_99": self.wacc_99,
            "tcr_9": self.tcr_9,
            "tcr_99": self.tcr_99,
            "tcr_999": self.tcr_999,
        }


def compute_confusion_matrix(y_true: np.ndarray, y_pred: np.ndarray) -> ConfusionMatrix:
    """
    Computes TP, TN, FP, FN where 1 is Positive (Spam) and 0 is Negative (Ham).
    """
    y_t = np.asarray(y_true, dtype=int)
    y_p = np.asarray(y_pred, dtype=int)

    tp = int(np.sum((y_t == 1) & (y_p == 1)))
    tn = int(np.sum((y_t == 0) & (y_p == 0)))
    fp = int(np.sum((y_t == 0) & (y_p == 1)))
    fn = int(np.sum((y_t == 1) & (y_p == 0)))

    return ConfusionMatrix(tp=tp, tn=tn, fp=fp, fn=fn)


def safe_divide(numerator: float, denominator: float, default: Optional[float] = None) -> Optional[float]:
    """Safe division returning default (e.g. None or 0.0) when denominator is 0."""
    if denominator == 0 or math.isnan(denominator):
        return default
    return float(numerator / denominator)


def compute_accuracy(cm: ConfusionMatrix) -> Optional[float]:
    """Accuracy = (TP + TN) / Total"""
    return safe_divide(cm.tp + cm.tn, cm.total)


def compute_precision(cm: ConfusionMatrix) -> Optional[float]:
    """Precision = TP / (TP + FP)"""
    return safe_divide(cm.tp, cm.tp + cm.fp)


def compute_recall(cm: ConfusionMatrix) -> Optional[float]:
    """Recall = TP / (TP + FN)"""
    return safe_divide(cm.tp, cm.tp + cm.fn)


def compute_f1(cm: ConfusionMatrix) -> Optional[float]:
    """F1 = 2 * TP / (2 * TP + FP + FN)"""
    denom = 2 * cm.tp + cm.fp + cm.fn
    return safe_divide(2 * cm.tp, denom)


def compute_fpr(cm: ConfusionMatrix) -> Optional[float]:
    """False Positive Rate (False Alarm Rate) = FP / (FP + TN)"""
    return safe_divide(cm.fp, cm.fp + cm.tn)


def compute_fnr(cm: ConfusionMatrix) -> Optional[float]:
    """False Negative Rate (Miss Rate) = FN / (FN + TP)"""
    return safe_divide(cm.fn, cm.fn + cm.tp)


def compute_specificity(cm: ConfusionMatrix) -> Optional[float]:
    """Specificity = TN / (TN + FP) = 1 - FPR"""
    return safe_divide(cm.tn, cm.tn + cm.fp)


def compute_mcc(cm: ConfusionMatrix) -> Optional[float]:
    """
    Matthews Correlation Coefficient (MCC):
    MCC = (TP*TN - FP*FN) / sqrt((TP+FP)*(TP+FN)*(TN+FP)*(TN+FN))
    """
    numerator = (cm.tp * cm.tn) - (cm.fp * cm.fn)
    denom_prod = (cm.tp + cm.fp) * (cm.tp + cm.fn) * (cm.tn + cm.fp) * (cm.tn + cm.fn)
    if denom_prod <= 0:
        return 0.0
    denominator = math.sqrt(denom_prod)
    return safe_divide(numerator, denominator, default=0.0)


def compute_wacc(cm: ConfusionMatrix, lam: float) -> Optional[float]:
    """
    Cost-Weighted Accuracy:
    WAcc(lambda) = (TP + lambda * TN) / (TP + FN + lambda * (TN + FP))
    """
    numerator = cm.tp + (lam * cm.tn)
    denominator = cm.tp + cm.fn + (lam * (cm.tn + cm.fp))
    return safe_divide(numerator, denominator)


def compute_tcr(cm: ConfusionMatrix, lam: float) -> Optional[float]:
    """
    Total Cost Ratio:
    TCR(lambda) = (TP + FN) / (lambda * FP + FN) = N_spam / (lambda * FP + FN)
    A TCR < 1.0 indicates the filter performs worse than doing nothing (no filter).
    """
    n_spam = cm.tp + cm.fn
    denom = (lam * cm.fp) + cm.fn
    if denom == 0:
        # If no false alarms and no misses, TCR is theoretically infinite or undefined
        return None if n_spam == 0 else 999.0
    return safe_divide(n_spam, denom)


def calculate_all_metrics(cm: ConfusionMatrix) -> ClassificationMetrics:
    """Computes all classification and cost-sensitive metrics from a confusion matrix."""
    return ClassificationMetrics(
        tp=cm.tp,
        tn=cm.tn,
        fp=cm.fp,
        fn=cm.fn,
        total=cm.total,
        accuracy=compute_accuracy(cm),
        precision=compute_precision(cm),
        recall=compute_recall(cm),
        f1=compute_f1(cm),
        fpr=compute_fpr(cm),
        fnr=compute_fnr(cm),
        specificity=compute_specificity(cm),
        mcc=compute_mcc(cm),
        wacc_9=compute_wacc(cm, 9.0),
        wacc_99=compute_wacc(cm, 99.0),
        tcr_9=compute_tcr(cm, 9.0),
        tcr_99=compute_tcr(cm, 99.0),
        tcr_999=compute_tcr(cm, 999.0),
    )
