"""
Pydantic Schemas for Live and Batch Classifier Inference
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field


class ClassifyRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=50000)
    protocol: str = "Protocol B"
    model_key: Optional[str] = "logistic_regression"
    threshold: Optional[float] = None  # If None, use model's calibrated tau*


class SingleModelPrediction(BaseModel):
    model_key: str
    display_name: str
    predicted_probability: float
    decision_threshold: float
    predicted_label: str  # "spam" or "ham"
    diagnostic: str


class ClassifyResponse(BaseModel):
    input_text: str
    predictions: List[SingleModelPrediction]
    matched_features: List[Dict[str, Any]]
    explanation: str


class BatchClassifyItem(BaseModel):
    id: Optional[str] = None
    text: str


class BatchClassifyRequest(BaseModel):
    items: List[BatchClassifyItem]
    model_key: str = "logistic_regression"
    threshold: Optional[float] = None


class BatchClassifyResponse(BaseModel):
    total_processed: int
    spam_count: int
    ham_count: int
    results: List[Dict[str, Any]]
