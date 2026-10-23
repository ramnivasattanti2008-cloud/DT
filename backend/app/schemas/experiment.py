"""
Pydantic Schemas for Experiment Execution and Retrieval
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class ExperimentRunRequest(BaseModel):
    dataset_id: str
    name: Optional[str] = None
    protocol: str = "Protocol B"  # "Protocol A" or "Protocol B"
    selected_models: Optional[List[str]] = Field(
        default=["multinomial_nb", "linear_svm", "random_forest", "logistic_regression"]
    )
    target_fpr: float = Field(default=0.0035, ge=0.0001, le=0.50)
    cost_weight_lambda: float = Field(default=99.0, ge=1.0)
    random_seed: int = 42
    notes: Optional[str] = None


class ExperimentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    dataset_id: str
    protocol: str
    is_safe: bool
    random_seed: int
    n_train: int
    n_test: int
    duplicates_purged: int
    target_fpr: float
    cost_weight_lambda: float
    best_model_key: Optional[str] = None
    best_f1: Optional[float] = None
    best_fpr: Optional[float] = None
    best_tcr: Optional[float] = None
    rcs_percentage: Optional[float] = None
    quality_tier: Optional[str] = None
    cari_score: Optional[float] = None
    model_results: List[Dict[str, Any]] = []
    serc_assessment: Dict[str, Any] = {}
    leakage_report: Dict[str, Any] = {}
    deduplication_report: Dict[str, Any] = {}
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
