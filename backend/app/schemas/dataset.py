"""
Pydantic Schemas for Dataset Upload, Mapping, and Inspection
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class ColumnMapping(BaseModel):
    text_col: str = "text"
    label_col: str = "label"
    timestamp_col: Optional[str] = "timestamp"
    id_col: Optional[str] = "id"


class DatasetPreview(BaseModel):
    columns: List[str]
    sample_rows: List[Dict[str, Any]]
    total_preview_rows: int
    detected_mapping: ColumnMapping


class DatasetValidationSummary(BaseModel):
    is_valid: bool
    total_rows: int
    spam_count: int
    ham_count: int
    spam_ratio: float
    duplicate_count: int
    min_timestamp: Optional[str] = None
    max_timestamp: Optional[str] = None
    has_valid_timestamps: bool
    warnings: List[str] = []
    errors: List[str] = []


class DatasetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    filename: str
    row_count: int
    spam_count: int
    ham_count: int
    duplicate_count: int
    min_timestamp: Optional[datetime] = None
    max_timestamp: Optional[datetime] = None
    is_synthetic: bool
    column_mapping: Dict[str, Any]
    validation_summary: Dict[str, Any]
    created_at: Optional[datetime] = None
