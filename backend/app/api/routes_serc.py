"""
API Routes for SERC Checklist, RCS Calculation, CARI Scoring, and Historical 20-Study Audit
"""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter
from app.ml.serc_rcs import (
    SERC_CHECKLIST_DEFINITIONS,
    SercGrade,
    calculate_rcs,
)
from app.ml.cari import compute_cari
from app.schemas.serc import SercManualReviewRequest

router = APIRouter(prefix="/api/serc", tags=["SERC-RCS"])

# Historical audited 20 studies from Table 5 of the research paper
HISTORICAL_20_STUDIES = [
    {"study_id": 1, "study": "Drucker et al. (1999)", "era": "Foundational (1999-2009)", "primary_dataset": "AT&T Mail", "c1": 1.0, "c2": 1.0, "c3": 1.0, "c4": 1.0, "c5": 0.5, "c6": 1.0, "c7": 0.5, "c8": 0.0, "c9": 0.0, "c10": 0.5, "tpe": 6.5, "nac": 10, "rcs_pct": 65.0, "tier": "Tier B"},
    {"study_id": 2, "study": "Androutsopoulos et al. (2000)", "era": "Foundational (1999-2009)", "primary_dataset": "Ling-Spam (2,893)", "c1": 1.0, "c2": 1.0, "c3": 1.0, "c4": 1.0, "c5": 1.0, "c6": 1.0, "c7": 1.0, "c8": 0.0, "c9": 0.5, "c10": 1.0, "tpe": 8.5, "nac": 10, "rcs_pct": 85.0, "tier": "Tier A"},
    {"study_id": 3, "study": "Carreras & Marquez (2001)", "era": "Foundational (1999-2009)", "primary_dataset": "PU1 & Ling-Spam", "c1": 1.0, "c2": 1.0, "c3": 1.0, "c4": 1.0, "c5": 1.0, "c6": 1.0, "c7": 1.0, "c8": 0.0, "c9": 0.5, "c10": 0.5, "tpe": 8.0, "nac": 10, "rcs_pct": 80.0, "tier": "Tier A"},
    {"study_id": 4, "study": "Tretyakov (2004)", "era": "Foundational (1999-2009)", "primary_dataset": "PU1 & Ling-Spam", "c1": 1.0, "c2": 1.0, "c3": 0.5, "c4": 0.5, "c5": 0.5, "c6": 1.0, "c7": 0.5, "c8": 0.0, "c9": 0.0, "c10": 0.5, "tpe": 5.5, "nac": 10, "rcs_pct": 55.0, "tier": "Tier C"},
    {"study_id": 5, "study": "Metsis et al. (2006)", "era": "Foundational (1999-2009)", "primary_dataset": "Enron-Spam (33,716)", "c1": 1.0, "c2": 1.0, "c3": 1.0, "c4": 1.0, "c5": 1.0, "c6": 1.0, "c7": 1.0, "c8": 1.0, "c9": 0.5, "c10": 1.0, "tpe": 9.5, "nac": 10, "rcs_pct": 95.0, "tier": "Tier A"},
    {"study_id": 6, "study": "Cormack & Lynam (2007)", "era": "Foundational (1999-2009)", "primary_dataset": "TREC 2005-2006", "c1": 1.0, "c2": 0.5, "c3": 1.0, "c4": 1.0, "c5": 1.0, "c6": 1.0, "c7": 1.0, "c8": 1.0, "c9": 1.0, "c10": 1.0, "tpe": 9.5, "nac": 10, "rcs_pct": 95.0, "tier": "Tier A"},
    {"study_id": 7, "study": "DeBarr & Wechsler (2009)", "era": "Foundational (1999-2009)", "primary_dataset": "SpamAssassin Public", "c1": 1.0, "c2": 1.0, "c3": 1.0, "c4": 0.5, "c5": 1.0, "c6": 1.0, "c7": 0.5, "c8": 0.0, "c9": 0.0, "c10": 0.5, "tpe": 6.5, "nac": 10, "rcs_pct": 65.0, "tier": "Tier B"},
    {"study_id": 8, "study": "Awad & Elseuofi (2011)", "era": "Transitional (2011)", "primary_dataset": "UCI Spambase (4,601)", "c1": 1.0, "c2": 0.5, "c3": 0.5, "c4": 0.5, "c5": 1.0, "c6": 0.5, "c7": 0.0, "c8": 0.0, "c9": 0.5, "c10": 0.0, "tpe": 4.5, "nac": 10, "rcs_pct": 45.0, "tier": "Tier C"},
    {"study_id": 9, "study": "Wijaya & Bisri (2016)", "era": "Contemporary (2016-2023)", "primary_dataset": "UCI Spambase (4,601)", "c1": 1.0, "c2": 0.5, "c3": 1.0, "c4": 0.5, "c5": 0.5, "c6": 0.0, "c7": 0.0, "c8": 0.0, "c9": 0.0, "c10": 0.5, "tpe": 4.0, "nac": 10, "rcs_pct": 40.0, "tier": "Tier C"},
    {"study_id": 10, "study": "Rusland et al. (2017)", "era": "Contemporary (2016-2023)", "primary_dataset": "Spambase & SpamData", "c1": 1.0, "c2": 0.5, "c3": 1.0, "c4": 0.0, "c5": 1.0, "c6": 0.5, "c7": 0.0, "c8": 0.0, "c9": 0.5, "c10": 0.0, "tpe": 4.5, "nac": 10, "rcs_pct": 45.0, "tier": "Tier C"},
    {"study_id": 11, "study": "Agarwal & Kumar (2018)", "era": "Contemporary (2016-2023)", "primary_dataset": "Ling-Spam Corpus", "c1": 1.0, "c2": 1.0, "c3": 0.5, "c4": 0.5, "c5": 1.0, "c6": 0.0, "c7": 0.0, "c8": 0.0, "c9": 0.0, "c10": 0.0, "tpe": 4.0, "nac": 10, "rcs_pct": 40.0, "tier": "Tier C"},
    {"study_id": 12, "study": "Olatunji (2019)", "era": "Contemporary (2016-2023)", "primary_dataset": "UCI Spambase (4,601)", "c1": 1.0, "c2": 0.0, "c3": 1.0, "c4": 1.0, "c5": 0.5, "c6": 0.0, "c7": 0.0, "c8": 0.0, "c9": 0.0, "c10": 0.5, "tpe": 4.0, "nac": 10, "rcs_pct": 40.0, "tier": "Tier C"},
    {"study_id": 13, "study": "Dedeturk & Akay (2020)", "era": "Contemporary (2016-2023)", "primary_dataset": "Spambase & CSDMC2010", "c1": 1.0, "c2": 1.0, "c3": 1.0, "c4": 1.0, "c5": 1.0, "c6": 1.0, "c7": 0.0, "c8": 0.5, "c9": 0.5, "c10": 0.5, "tpe": 7.5, "nac": 10, "rcs_pct": 75.0, "tier": "Tier B"},
    {"study_id": 14, "study": "Gibson et al. (2020)", "era": "Contemporary (2016-2023)", "primary_dataset": "SpamAssassin & Enron", "c1": 1.0, "c2": 1.0, "c3": 1.0, "c4": 0.5, "c5": 1.0, "c6": 0.0, "c7": 0.0, "c8": 0.0, "c9": 0.5, "c10": 0.5, "tpe": 5.5, "nac": 10, "rcs_pct": 55.0, "tier": "Tier C"},
    {"study_id": 15, "study": "Kumar et al. (2020)", "era": "Contemporary (2016-2023)", "primary_dataset": "CSV Spam Dataset", "c1": 0.5, "c2": 0.5, "c3": 1.0, "c4": 0.5, "c5": 1.0, "c6": 0.0, "c7": 0.0, "c8": 0.0, "c9": 0.0, "c10": 0.0, "tpe": 3.5, "nac": 10, "rcs_pct": 35.0, "tier": "Tier D"},
    {"study_id": 16, "study": "Siddique et al. (2021)", "era": "Contemporary (2016-2023)", "primary_dataset": "Urdu Spam (5,000)", "c1": 1.0, "c2": 1.0, "c3": 1.0, "c4": 0.5, "c5": 1.0, "c6": 0.0, "c7": 0.0, "c8": 0.0, "c9": 0.0, "c10": 0.5, "tpe": 5.0, "nac": 10, "rcs_pct": 50.0, "tier": "Tier C"},
    {"study_id": 17, "study": "Kontsewaya et al. (2021)", "era": "Contemporary (2016-2023)", "primary_dataset": "Email Spam Corpus", "c1": 0.5, "c2": 1.0, "c3": 1.0, "c4": 0.0, "c5": 1.0, "c6": 0.0, "c7": 0.0, "c8": 0.0, "c9": 0.0, "c10": 0.0, "tpe": 3.5, "nac": 10, "rcs_pct": 35.0, "tier": "Tier D"},
    {"study_id": 18, "study": "AbdulNabi & Yaseen (2021)", "era": "Contemporary (2016-2023)", "primary_dataset": "Spambase & SpamFilter", "c1": 1.0, "c2": 1.0, "c3": 1.0, "c4": 1.0, "c5": 1.0, "c6": 0.0, "c7": 0.0, "c8": 0.5, "c9": 0.5, "c10": 0.5, "tpe": 6.5, "nac": 10, "rcs_pct": 65.0, "tier": "Tier B"},
    {"study_id": 19, "study": "Nayak et al. (2022)", "era": "Contemporary (2016-2023)", "primary_dataset": "SpamAssassin & Phish", "c1": 1.0, "c2": 1.0, "c3": 1.0, "c4": 0.5, "c5": 1.0, "c6": 0.5, "c7": 0.0, "c8": 0.0, "c9": 0.5, "c10": 0.5, "tpe": 6.0, "nac": 10, "rcs_pct": 60.0, "tier": "Tier B"},
    {"study_id": 20, "study": "Al-zoubi et al. (2023)", "era": "Contemporary (2016-2023)", "primary_dataset": "UCI Spambase (4,601)", "c1": 1.0, "c2": 0.5, "c3": 1.0, "c4": 0.5, "c5": 1.0, "c6": 0.5, "c7": 0.0, "c8": 0.0, "c9": 0.0, "c10": 0.5, "tpe": 5.0, "nac": 10, "rcs_pct": 50.0, "tier": "Tier C"},
]

INTER_RATER_STATS = {
    "total_studies": 20,
    "total_pairs": 200,
    "exact_agreement_count": 183,
    "exact_agreement_pct": 91.50,
    "p_e": 0.3599,
    "cohens_kappa_unweighted": 0.8672,
    "cohens_kappa_weighted": 0.9071,
    "se_kappa": 0.0308,
    "ci_95": [0.8068, 0.9276],
    "z_stat": 28.15,
    "p_value_kappa": 0.0001,
    "foundational_mean_rcs": 77.14,
    "foundational_sd_rcs": 15.77,
    "contemporary_mean_rcs": 49.17,
    "contemporary_sd_rcs": 12.58,
    "overall_mean_rcs": 58.75,
    "overall_sd_rcs": 19.05,
    "welch_t_stat": 4.0073,
    "welch_p_val": 0.00226,
    "mann_whitney_u": 77.5,
    "mann_whitney_p_val": 0.00294,
}


@router.get("/checklist")
def get_checklist_definitions():
    """Returns the 10 SERC checklist criteria definitions."""
    return {"criteria": [d.__dict__ for d in SERC_CHECKLIST_DEFINITIONS]}


@router.get("/historical-studies")
def get_historical_studies():
    """Returns the 20 literature studies audited across 1999-2023 (Table 5)."""
    return {"studies": HISTORICAL_20_STUDIES}


@router.get("/inter-rater-stats")
def get_inter_rater_stats():
    """Returns the double-blind psychometric reliability statistics (Cohen's Kappa = 0.8672)."""
    return INTER_RATER_STATS


@router.post("/calculate")
def calculate_serc_and_cari(req: SercManualReviewRequest):
    """
    Computes RCS percentage, Quality Tier, and CARI score with transparent factor breakdown
    from manual user grades and classifier metrics.
    """
    parsed_grades = {}
    for k, v in req.grades.items():
        v_str = str(v).strip().upper()
        if v_str in ("1.0", "1", "FULL"):
            parsed_grades[k] = SercGrade.FULL
        elif v_str in ("0.5", "HALF", "PARTIAL"):
            parsed_grades[k] = SercGrade.PARTIAL
        elif v_str in ("NA", "N/A", "NOT_APPLICABLE"):
            parsed_grades[k] = SercGrade.NOT_APPLICABLE
        else:
            parsed_grades[k] = SercGrade.OMITTED

    pts, count, rcs, tier = calculate_rcs(parsed_grades)

    cari_score = None
    breakdown_dict = None

    if req.f1_score is not None:
        cari_score, breakdown = compute_cari(
            f1=req.f1_score,
            fpr=req.fpr,
            rcs_percentage=rcs,
            omega=req.omega,
            allow_compatibility_floor=True if req.fpr is None else False,
        )
        if breakdown:
            breakdown_dict = breakdown.to_dict()

    return {
        "points_earned": pts,
        "applicable_count": count,
        "rcs_percentage": round(rcs, 2) if rcs is not None else None,
        "quality_tier": tier.value,
        "cari_score": round(cari_score, 4) if cari_score is not None else None,
        "cari_breakdown": breakdown_dict,
        "grades_evaluated": {k: v.value for k, v in parsed_grades.items()},
    }
