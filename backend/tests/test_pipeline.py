"""
Integration Tests for ML Pipelines (Protocol A and Protocol B)
"""

import pytest
import numpy as np
import pandas as pd
from app.ml.data_generator import generate_synthetic_email_corpus
from app.ml.pipeline import run_protocol_a, run_protocol_b


def test_pipeline_execution_small_sample():
    # Use a 200-sample slice of the synthetic corpus for quick integration test
    full_df = generate_synthetic_email_corpus(seed=42)
    sample_df = full_df.iloc[:200].copy()

    # Run Protocol A
    res_a = run_protocol_a(
        sample_df,
        text_col="text",
        label_col="label",
        timestamp_col="timestamp",
        id_col="id",
        selected_models=["multinomial_nb", "logistic_regression"],
    )

    assert res_a["protocol"] == "Protocol A (Flawed Baseline)"
    assert res_a["is_safe_for_validation"] is False
    assert len(res_a["model_results"]) == 2
    assert res_a["leakage_report"]["is_safe_for_validation"] is False
    assert res_a["serc_assessment"]["rcs_percentage"] == 40.0

    # Run Protocol B
    res_b = run_protocol_b(
        sample_df,
        text_col="text",
        label_col="label",
        timestamp_col="timestamp",
        id_col="id",
        selected_models=["multinomial_nb", "logistic_regression"],
        target_fpr=0.02,
    )

    assert res_b["protocol"] == "Protocol B (SERC-Compliant)"
    assert res_b["is_safe_for_validation"] is True
    assert len(res_b["model_results"]) == 2
    assert res_b["leakage_report"]["is_safe_for_validation"] is True
    assert res_b["serc_assessment"]["rcs_percentage"] == 100.0
