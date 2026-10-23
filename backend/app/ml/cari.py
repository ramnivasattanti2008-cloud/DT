"""
Cost-Adjusted Reproducibility Index (CARI) Engine
Implements the exact mathematical formulation:
    CARI = F1 * max(0, 1 - omega * FPR) * (0.50 + RCS / 200)
where:
    - F1 in [0, 1]
    - FPR in [0, 1]
    - RCS in [0, 100]
    - omega = 2.0 (default false-alarm penalty multiplier)
"""

from dataclasses import dataclass
from typing import Optional, Dict, Any


@dataclass(frozen=True)
class CariBreakdown:
    f1: float
    fpr: float
    rcs_percentage: float
    omega: float
    f1_factor: float
    fpr_penalty_factor: float
    rcs_factor: float
    cari_score: float
    is_compatibility_mode: bool
    notes: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "f1": self.f1,
            "fpr": self.fpr,
            "rcs_percentage": self.rcs_percentage,
            "omega": self.omega,
            "f1_factor": self.f1_factor,
            "fpr_penalty_factor": self.fpr_penalty_factor,
            "rcs_factor": self.rcs_factor,
            "cari_score": self.cari_score,
            "is_compatibility_mode": self.is_compatibility_mode,
            "notes": self.notes,
        }


def compute_cari(
    f1: Optional[float],
    fpr: Optional[float],
    rcs_percentage: Optional[float],
    omega: float = 2.0,
    allow_compatibility_floor: bool = False,
) -> tuple[Optional[float], Optional[CariBreakdown]]:
    """
    Computes CARI score and returns intermediate formula factors.
    Returns (None, None) if essential parameters are missing and compatibility mode is disabled.
    """
    if f1 is None or rcs_percentage is None:
        return None, None

    # Handle missing FPR
    is_compat = False
    effective_fpr = fpr
    note = "Standard CARI calculation."

    if effective_fpr is None:
        if allow_compatibility_floor:
            effective_fpr = 0.05
            is_compat = True
            note = "Manuscript compatibility mode active: missing FPR defaulted to 0.05 penalty floor."
        else:
            return None, None

    # Bounds checking
    f1_clean = max(0.0, min(1.0, float(f1)))
    fpr_clean = max(0.0, min(1.0, float(effective_fpr)))
    rcs_clean = max(0.0, min(100.0, float(rcs_percentage)))

    # Factors:
    # 1. Catch rate factor
    f1_factor = f1_clean

    # 2. False alarm penalty factor: max(0, 1 - omega * FPR)
    fpr_penalty_factor = max(0.0, 1.0 - (omega * fpr_clean))

    # 3. Transparency factor: 0.50 + 0.005 * RCS (which is 0.50 + RCS / 200)
    rcs_factor = 0.50 + (rcs_clean / 200.0)

    # Combined CARI
    cari_score = f1_factor * fpr_penalty_factor * rcs_factor

    breakdown = CariBreakdown(
        f1=f1_clean,
        fpr=fpr_clean,
        rcs_percentage=rcs_clean,
        omega=omega,
        f1_factor=f1_factor,
        fpr_penalty_factor=fpr_penalty_factor,
        rcs_factor=rcs_factor,
        cari_score=float(cari_score),
        is_compatibility_mode=is_compat,
        notes=note,
    )

    return cari_score, breakdown
