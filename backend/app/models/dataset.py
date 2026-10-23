"""
SQLAlchemy Model for Uploaded and Synthetic Datasets
"""

from sqlalchemy import Column, String, Integer, Boolean, DateTime, JSON, Text
from sqlalchemy.sql import func
from app.core.database import Base


class DatasetModel(Base):
    __tablename__ = "datasets"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    row_count = Column(Integer, default=0)
    spam_count = Column(Integer, default=0)
    ham_count = Column(Integer, default=0)
    duplicate_count = Column(Integer, default=0)
    min_timestamp = Column(DateTime, nullable=True)
    max_timestamp = Column(DateTime, nullable=True)
    is_synthetic = Column(Boolean, default=False)
    column_mapping = Column(JSON, default=dict)  # text_col, label_col, timestamp_col, id_col
    validation_summary = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
