"""
SQLAlchemy Model for Persisted Experiments and Benchmarks
"""

from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, JSON, Text
from sqlalchemy.sql import func
from app.core.database import Base


class ExperimentModel(Base):
    __tablename__ = "experiments"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    dataset_id = Column(String(64), nullable=False, index=True)
    protocol = Column(String(64), nullable=False)  # "Protocol A" or "Protocol B"
    is_safe = Column(Boolean, default=False)
    random_seed = Column(Integer, default=42)
    n_train = Column(Integer, default=0)
    n_test = Column(Integer, default=0)
    duplicates_purged = Column(Integer, default=0)
    target_fpr = Column(Float, default=0.0035)
    cost_weight_lambda = Column(Float, default=99.0)

    # Aggregated Summary Scores
    best_model_key = Column(String(64), nullable=True)
    best_f1 = Column(Float, nullable=True)
    best_fpr = Column(Float, nullable=True)
    best_tcr = Column(Float, nullable=True)
    rcs_percentage = Column(Float, nullable=True)
    quality_tier = Column(String(32), nullable=True)
    cari_score = Column(Float, nullable=True)

    # Detailed Artifacts Stored as JSON
    model_results = Column(JSON, default=list)  # Metrics and outputs per classifier
    serc_assessment = Column(JSON, default=dict)  # Complete C1-C10 evaluations
    leakage_report = Column(JSON, default=dict)  # All 6 leakage audit checks
    deduplication_report = Column(JSON, default=dict)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
