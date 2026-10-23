"""
Unit Tests for Automated Leakage Detection
Verifies all 6 leakage audit checks correctly flag flawed conditions (Protocol A)
and certify clean conditions (Protocol B).
"""

import pytest
import pandas as pd
from app.ml.leakage_auditor import (
    audit_train_test_duplicate_overlap,
    audit_chronological_ordering,
    audit_vectorizer_fit_scope,
    audit_feature_selection_leakage,
    audit_calibration_leakage,
    audit_threshold_selection_leakage,
    generate_leakage_audit_report,
)


def test_duplicate_overlap_check():
    # Flawed scenario: duplicate members cross train and test
    train_ids = {"ID_1", "ID_2", "ID_3"}
    test_ids = {"ID_4", "ID_5"}
    duplicate_groups = [
        {"original_id": "ID_1", "duplicate_ids": ["ID_4"]}  # ID_1 in train, ID_4 in test!
    ]
    res_fail = audit_train_test_duplicate_overlap(train_ids, test_ids, duplicate_groups)
    assert res_fail.passed is False
    assert res_fail.status == "FAIL"

    # Clean scenario: duplicates strictly contained or purged
    clean_dup_groups = [
        {"original_id": "ID_1", "duplicate_ids": ["ID_2"]}  # Both in train
    ]
    res_pass = audit_train_test_duplicate_overlap(train_ids, test_ids, clean_dup_groups)
    assert res_pass.passed is True
    assert res_pass.status == "PASS"


def test_chronological_ordering_check():
    # Flawed scenario: lookahead violation (test dates earlier than train dates)
    train_ts = pd.Series([pd.Timestamp("2023-05-01"), pd.Timestamp("2023-09-01")])
    test_ts = pd.Series([pd.Timestamp("2023-02-01"), pd.Timestamp("2023-11-01")])  # Feb 2023 precedes Sep 2023!
    res_fail = audit_chronological_ordering(train_ts, test_ts)
    assert res_fail.passed is False
    assert res_fail.status == "FAIL"

    # Clean scenario: strict chronological ordering
    clean_train_ts = pd.Series([pd.Timestamp("2023-01-01"), pd.Timestamp("2023-08-31")])
    clean_test_ts = pd.Series([pd.Timestamp("2023-09-01"), pd.Timestamp("2023-12-31")])
    res_pass = audit_chronological_ordering(clean_train_ts, clean_test_ts)
    assert res_pass.passed is True
    assert res_pass.status == "PASS"


def test_vectorizer_and_feature_leakage_checks():
    # Pre-split vectorizer fit flag
    assert audit_vectorizer_fit_scope(True).passed is False
    assert audit_vectorizer_fit_scope(False).passed is True

    # Supervised feature selection leakage flag
    assert audit_feature_selection_leakage(True).passed is False
    assert audit_feature_selection_leakage(False).passed is True

    # Calibration leakage flag
    assert audit_calibration_leakage(True).passed is False
    assert audit_calibration_leakage(False).passed is True

    # Threshold selection leakage flag
    assert audit_threshold_selection_leakage(True).passed is False
    assert audit_threshold_selection_leakage(False).passed is True


def test_full_leakage_report_clean_vs_flawed():
    # Full clean report
    report_clean = generate_leakage_audit_report(
        protocol_name="Protocol B",
        train_ids={"A", "B"},
        test_ids={"C", "D"},
        duplicate_groups=[],
        train_timestamps=pd.Series([pd.Timestamp("2023-01-01")]),
        test_timestamps=pd.Series([pd.Timestamp("2023-02-01")]),
        vectorizer_fit_on_test=False,
        feature_selection_used_test=False,
        calibration_fit_on_test=False,
        threshold_selected_on_test=False,
    )
    assert report_clean.is_safe_for_validation is True
    assert report_clean.checks_passed == 6
    assert report_clean.checks_failed == 0

    # Full flawed report
    report_flawed = generate_leakage_audit_report(
        protocol_name="Protocol A",
        train_ids={"A", "B"},
        test_ids={"C", "D"},
        duplicate_groups=[{"original_id": "A", "duplicate_ids": ["C"]}],
        train_timestamps=pd.Series([pd.Timestamp("2023-05-01")]),
        test_timestamps=pd.Series([pd.Timestamp("2023-01-01")]),
        vectorizer_fit_on_test=True,
        feature_selection_used_test=True,
        calibration_fit_on_test=False,
        threshold_selected_on_test=False,
    )
    assert report_flawed.is_safe_for_validation is False
    assert report_flawed.checks_failed >= 3
