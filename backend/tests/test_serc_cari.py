"""
Unit Tests for SERC-RCS Rubric and CARI Scoring Engine
Verifies:
1. RCS formula and tier boundaries (A, B, C, D)
2. Handling of NA (not applicable) items
3. CARI calculation and formula factor breakdown
4. Edge cases (FPR = 0, High FPR, missing metrics, compatibility mode)
"""

import pytest
from app.ml.serc_rcs import (
    SercGrade,
    QualityTier,
    calculate_rcs,
    build_protocol_a_assessment,
    build_protocol_b_assessment,
)
from app.ml.cari import compute_cari


def test_rcs_calculation_and_tiers():
    # 10 full grades -> 100% (Tier A)
    grades_all_full = {f"C{i}": SercGrade.FULL for i in range(1, 11)}
    pts, count, rcs, tier = calculate_rcs(grades_all_full)
    assert pts == 10.0
    assert count == 10
    assert rcs == 100.0
    assert tier == QualityTier.TIER_A

    # Protocol A preset: 4 full, 6 omitted -> 4.0 / 10 = 40.0% (Tier C)
    proto_a = build_protocol_a_assessment()
    assert proto_a.points_earned == 4.0
    assert proto_a.applicable_count == 10
    assert proto_a.rcs_percentage == 40.0
    assert proto_a.tier == QualityTier.TIER_C

    # Protocol B preset: 10 full -> 10.0 / 10 = 100.0% (Tier A)
    proto_b = build_protocol_b_assessment()
    assert proto_b.points_earned == 10.0
    assert proto_b.applicable_count == 10
    assert proto_b.rcs_percentage == 100.0
    assert proto_b.tier == QualityTier.TIER_A

    # Tier B boundary: 7.0 / 10 = 70.0%
    grades_b = {f"C{i}": SercGrade.FULL if i <= 7 else SercGrade.OMITTED for i in range(1, 11)}
    _, _, rcs_b, tier_b = calculate_rcs(grades_b)
    assert rcs_b == 70.0
    assert tier_b == QualityTier.TIER_B

    # Tier D boundary: 3.5 / 10 = 35.0%
    grades_d = {f"C{i}": SercGrade.FULL if i <= 3 else (SercGrade.PARTIAL if i == 4 else SercGrade.OMITTED) for i in range(1, 11)}
    _, _, rcs_d, tier_d = calculate_rcs(grades_d)
    assert rcs_d == 35.0
    assert tier_d == QualityTier.TIER_D


def test_rcs_with_na_items():
    # 8 applicable items: 6 full, 2 partial, 2 NA
    grades_na = {
        "C1": SercGrade.FULL,
        "C2": SercGrade.FULL,
        "C3": SercGrade.FULL,
        "C4": SercGrade.FULL,
        "C5": SercGrade.FULL,
        "C6": SercGrade.FULL,
        "C7": SercGrade.PARTIAL,
        "C8": SercGrade.PARTIAL,
        "C9": SercGrade.NOT_APPLICABLE,
        "C10": SercGrade.NOT_APPLICABLE,
    }
    pts, count, rcs, tier = calculate_rcs(grades_na)
    # Points = 6*1.0 + 2*0.5 = 7.0. Count = 8.
    # RCS = 100 * (7.0 / 8) = 87.5% -> Tier A
    assert pts == 7.0
    assert count == 8
    assert rcs == 87.5
    assert tier == QualityTier.TIER_A

    # All NA items -> Undefined
    grades_all_na = {f"C{i}": SercGrade.NOT_APPLICABLE for i in range(1, 11)}
    pts_zero, count_zero, rcs_zero, tier_zero = calculate_rcs(grades_all_na)
    assert count_zero == 0
    assert rcs_zero is None
    assert tier_zero == QualityTier.UNDEFINED


def test_cari_calculation_paper_values():
    # Table 6 Multinomial NB Protocol A:
    # F1 = 96.87% (0.9687), FPR = 4.31% (0.0431), RCS = 40.0%
    # CARI = 0.9687 * max(0, 1 - 2 * 0.0431) * (0.50 + 40 / 200)
    # = 0.9687 * (1 - 0.0862) * (0.50 + 0.20)
    # = 0.9687 * 0.9138 * 0.70 = 0.61964 -> 0.6197
    cari, breakdown = compute_cari(f1=0.9687, fpr=0.0431, rcs_percentage=40.0)
    assert cari == pytest.approx(0.6197, abs=1e-3)
    assert breakdown is not None
    assert breakdown.f1_factor == pytest.approx(0.9687)
    assert breakdown.fpr_penalty_factor == pytest.approx(1.0 - 2 * 0.0431)
    assert breakdown.rcs_factor == pytest.approx(0.70)

    # Table 6 Multinomial NB Protocol B:
    # F1 = 91.84% (0.9184), FPR = 0.29% (0.0029), RCS = 100.0%
    # CARI = 0.9184 * (1 - 2 * 0.0029) * (0.50 + 100 / 200)
    # = 0.9184 * 0.9942 * 1.00 = 0.91307 -> 0.9130
    cari_b, _ = compute_cari(f1=0.9184, fpr=0.0029, rcs_percentage=100.0)
    assert cari_b == pytest.approx(0.9130, abs=1e-3)


def test_cari_boundary_and_edge_cases():
    # Zero FPR: max penalty factor is 1.0
    cari_zero_fpr, b_zero = compute_cari(f1=0.90, fpr=0.0, rcs_percentage=100.0)
    assert b_zero.fpr_penalty_factor == 1.0
    assert cari_zero_fpr == pytest.approx(0.90 * 1.0 * 1.0)

    # Catastrophic FPR >= 50% with omega=2.0 -> penalty factor collapses to 0.0
    cari_high_fpr, b_high = compute_cari(f1=0.95, fpr=0.55, rcs_percentage=100.0)
    assert b_high.fpr_penalty_factor == 0.0
    assert cari_high_fpr == 0.0

    # Missing FPR without compatibility mode returns None
    cari_missing, _ = compute_cari(f1=0.90, fpr=None, rcs_percentage=80.0, allow_compatibility_floor=False)
    assert cari_missing is None

    # Missing FPR with compatibility mode uses 0.05 floor
    cari_compat, b_compat = compute_cari(f1=0.90, fpr=None, rcs_percentage=80.0, allow_compatibility_floor=True)
    assert cari_compat is not None
    assert b_compat.is_compatibility_mode is True
    assert b_compat.fpr == 0.05
