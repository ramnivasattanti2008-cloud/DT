"""
Unit Tests for Mathematical Metrics Engine
Verifies hand-calculated values, degenerate confusion matrices, zero division safety,
and cost-sensitive formulas WAcc(lambda) and TCR(lambda).
"""

import pytest
import math
from app.ml.metrics import (
    ConfusionMatrix,
    compute_accuracy,
    compute_precision,
    compute_recall,
    compute_f1,
    compute_fpr,
    compute_fnr,
    compute_specificity,
    compute_mcc,
    compute_wacc,
    compute_tcr,
    calculate_all_metrics,
)


def test_hand_calculated_standard_matrix():
    # TP=480, TN=689, FP=31, FN=0 (Table 6 Multinomial NB Protocol A)
    cm = ConfusionMatrix(tp=480, tn=689, fp=31, fn=0)
    assert cm.total == 1200
    assert cm.total_positives == 480
    assert cm.total_negatives == 720

    acc = compute_accuracy(cm)
    assert acc == pytest.approx(1169 / 1200, rel=1e-4)  # 0.97416 -> 97.42%

    prec = compute_precision(cm)
    assert prec == pytest.approx(480 / 511, rel=1e-4)  # 0.93933 -> 93.93%

    rec = compute_recall(cm)
    assert rec == pytest.approx(1.0, rel=1e-5)  # 100.0%

    f1 = compute_f1(cm)
    assert f1 == pytest.approx(960 / 991, rel=1e-4)  # 0.96871 -> 96.87%

    fpr = compute_fpr(cm)
    assert fpr == pytest.approx(31 / 720, rel=1e-4)  # 0.04305 -> 4.31%

    fnr = compute_fnr(cm)
    assert fnr == pytest.approx(0.0, rel=1e-5)

    spec = compute_specificity(cm)
    assert spec == pytest.approx(689 / 720, rel=1e-4)

    # MCC
    mcc = compute_mcc(cm)
    assert mcc == pytest.approx(0.9481, abs=1e-3)

    # Cost-weighted accuracy at lambda=99
    # WAcc(99) = (480 + 99 * 689) / (480 + 0 + 99 * (689 + 31))
    # = (480 + 68211) / (480 + 99 * 720) = 68691 / (480 + 71280) = 68691 / 71760 = 0.95723 (95.72%)
    wacc_99 = compute_wacc(cm, 99.0)
    assert wacc_99 == pytest.approx(0.9572, abs=1e-3)

    # TCR(99) = (TP + FN) / (99 * FP + FN) = 480 / (99 * 31 + 0) = 480 / 3069 = 0.1564 -> 0.16
    tcr_99 = compute_tcr(cm, 99.0)
    assert tcr_99 == pytest.approx(0.1564, abs=1e-3)


def test_hand_calculated_protocol_b_matrix():
    # Table 6 Multinomial NB Protocol B: TP=360, TN=680, FP=2, FN=62
    cm = ConfusionMatrix(tp=360, tn=680, fp=2, fn=62)
    assert cm.total == 1104
    assert cm.total_positives == 422
    assert cm.total_negatives == 682

    acc = compute_accuracy(cm)
    assert acc == pytest.approx(1040 / 1104, rel=1e-4)  # 0.94202 -> 94.20%

    fpr = compute_fpr(cm)
    assert fpr == pytest.approx(2 / 682, rel=1e-4)  # 0.00293 -> 0.29%

    # TCR(99) = 422 / (99 * 2 + 62) = 422 / (198 + 62) = 422 / 260 = 1.623 -> 1.62
    tcr_99 = compute_tcr(cm, 99.0)
    assert tcr_99 == pytest.approx(1.623, abs=1e-3)


def test_zero_denominator_safety():
    # All zero confusion matrix
    cm_empty = ConfusionMatrix(tp=0, tn=0, fp=0, fn=0)
    assert compute_accuracy(cm_empty) is None
    assert compute_precision(cm_empty) is None
    assert compute_recall(cm_empty) is None
    assert compute_f1(cm_empty) is None
    assert compute_fpr(cm_empty) is None
    assert compute_mcc(cm_empty) == 0.0

    # Matrix with no positive labels (TP=0, FN=0)
    cm_no_pos = ConfusionMatrix(tp=0, tn=100, fp=10, fn=0)
    assert compute_recall(cm_no_pos) is None
    assert compute_precision(cm_no_pos) == 0.0
    assert compute_fpr(cm_no_pos) == pytest.approx(10 / 110)

    # Matrix with perfect predictions (FP=0, FN=0)
    cm_perfect = ConfusionMatrix(tp=50, tn=50, fp=0, fn=0)
    assert compute_accuracy(cm_perfect) == 1.0
    assert compute_precision(cm_perfect) == 1.0
    assert compute_recall(cm_perfect) == 1.0
    assert compute_f1(cm_perfect) == 1.0
    assert compute_fpr(cm_perfect) == 0.0
    assert compute_mcc(cm_perfect) == 1.0
    # TCR with 0 FP and 0 FN returns theoretically high ratio (not crash)
    assert compute_tcr(cm_perfect, 99.0) == 999.0


def test_calculate_all_metrics():
    cm = ConfusionMatrix(tp=100, tn=200, fp=5, fn=10)
    metrics = calculate_all_metrics(cm)
    assert metrics.total == 315
    assert metrics.accuracy is not None
    assert metrics.precision is not None
    assert metrics.recall is not None
    assert metrics.f1 is not None
    assert metrics.fpr is not None
    assert metrics.tcr_99 is not None
