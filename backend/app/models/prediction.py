"""
SQLAlchemy Model for Real-Time and Batch Inference Predictions
"""

from sqlalchemy import Column, String, Float, Boolean, DateTime, JSON, Text, Integer
from sqlalchemy.sql import func
from app.core.database import Base


class PredictionLogModel(Base):
    __tablename__ = "prediction_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    input_text = Column(Text, nullable=False)
    predicted_probability = Column(Float, nullable=False)
    predicted_label = Column(String(16), nullable=False)  # "spam" or "ham"
    decision_threshold = Column(Float, nullable=False)
    model_name = Column(String(64), nullable=False)
    protocol = Column(String(32), default="Protocol B")
    active_tokens = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
