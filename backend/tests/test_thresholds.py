"""
Unit Tests for Threshold Calibration and Deduplication Engine
"""

import pytest
import numpy as np
import pandas as pd
from app.ml.threshold import (
    compute_bayes_threshold,
    calibrate_threshold_for_target_fpr,
    generate_threshold_curve,
)
from app.ml.deduplication import (
    get_word_shingles,
    jaccard_similarity,
    deduplicate_dataframe,
)


def test_bayes_threshold():
    # Theoretical rule: tau*(lambda) = lambda / (lambda + 1)
    tau_9 = compute_bayes_threshold(9.0)
    assert tau_9 == pytest.approx(0.9000, rel=1e-5)

    tau_99 = compute_bayes_threshold(99.0)
    assert tau_99 == pytest.approx(0.9900, rel=1e-5)


def test_validation_threshold_calibration():
    # Construct a synthetic validation set where higher thresholds decrease FPR
    rng = np.random.RandomState(42)
    # 200 ham (y=0) with probabilities mostly between 0.05 and 0.40, with some outliers up to 0.75
    ham_probs = rng.beta(a=1.5, b=6.0, size=200)
    # 100 spam (y=1) with probabilities mostly between 0.50 and 0.99
    spam_probs = rng.beta(a=6.0, b=1.5, size=100)

    y_val = np.array([0] * 200 + [1] * 100)
    y_prob = np.concatenate([ham_probs, spam_probs])

    target_fpr = 0.01  # Max 1% false alarm rate (at most 2 false alarms out of 200)
    chosen_tau, res, satisfied = calibrate_threshold_for_target_fpr(
        y_val_true=y_val,
        y_val_prob=y_prob,
        target_fpr=target_fpr,
        min_threshold=0.50,
        max_threshold=0.95,
        lam=99.0,
    )

    assert satisfied is True
    assert chosen_tau >= 0.50
    assert res["fpr"] <= target_fpr


def test_threshold_curve_generation():
    y_true = np.array([0, 0, 0, 1, 1, 1])
    y_prob = np.array([0.1, 0.2, 0.4, 0.6, 0.8, 0.9])
    curve = generate_threshold_curve(y_true, y_prob, steps=10)
    assert len(curve) == 10
    assert "threshold" in curve[0]
    assert "fpr" in curve[0]
    assert "recall" in curve[0]


def test_deduplication():
    # Exact and near duplicate text
    doc1 = "Please review the quarterly financial spreadsheet and attend the board meeting"
    doc2 = "Please review the quarterly financial spreadsheet and attend the board meeting [Ref 123]"
    doc3 = "Completely distinct pharmacy spam offering cheap pills and medications"

    shingles1 = get_word_shingles(doc1, k=2)
    shingles2 = get_word_shingles(doc2, k=2)
    shingles3 = get_word_shingles(doc3, k=2)

    sim_1_2 = jaccard_similarity(shingles1, shingles2)
    sim_1_3 = jaccard_similarity(shingles1, shingles3)

    assert sim_1_2 >= 0.75  # Heavy near-duplicate overlap
    assert sim_1_3 == 0.0  # Zero overlap

    # Test deduplication on a DataFrame
    df = pd.DataFrame([
        {"id": "MSG_01", "timestamp": "2023-01-01", "text": doc1, "label": "ham"},
        {"id": "MSG_02", "timestamp": "2023-01-02", "text": doc2, "label": "ham"},  # duplicate copy
        {"id": "MSG_03", "timestamp": "2023-01-03", "text": doc3, "label": "spam"},
    ])

    clean_df, report = deduplicate_dataframe(df, text_col="text", id_col="id", timestamp_col="timestamp", threshold=0.75)
    assert len(clean_df) == 2
    assert report.duplicates_removed == 1
    # Check that earliest original (MSG_01) was retained
    assert "MSG_01" in clean_df["id"].values
    assert "MSG_02" not in clean_df["id"].values
