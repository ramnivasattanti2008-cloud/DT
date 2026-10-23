"""
Pydantic Schemas for SERC Rubric and Historical Audit Data
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field


class SercGradeItemUpdate(BaseModel):
    grade: str  # "1.0", "0.5", "0.0", "NA"
    rationale: Optional[str] = None
    evidence_found: Optional[str] = None


class SercManualReviewRequest(BaseModel):
    grades: Dict[str, str]  # C1 -> "1.0", "0.5", "0.0", "NA"
    f1_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    fpr: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    omega: float = 2.0
    notes: Optional[str] = None


class HistoricalStudyRecord(BaseModel):
    study_id: int
    study: str
    era: str
    primary_dataset: str
    c1: float
    c2: float
    c3: float
    c4: float
    c5: float
    c6: float
    c7: float
    c8: float
    c9: float
    c10: float
    tpe: float
    nac: int
    rcs_pct: float
    tier: str


class InterRaterStats(BaseModel):
    total_studies: int
    total_pairs: int
    exact_agreement_count: int
    exact_agreement_pct: float
    p_e: float
    cohens_kappa_unweighted: float
    cohens_kappa_weighted: float
    se_kappa: float
    ci_95: List[float]
    z_stat: float
    p_value_kappa: float
    foundational_mean_rcs: float
    contemporary_mean_rcs: float
    welch_t_stat: float
    welch_p_val: float
    mann_whitney_u: float
    mann_whitney_p_val: float
