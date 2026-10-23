"""
SQLAlchemy Model for System and Rubric Settings
"""

from sqlalchemy import Column, String, JSON, DateTime
from sqlalchemy.sql import func
from app.core.database import Base


class SystemSettingModel(Base):
    __tablename__ = "system_settings"

    key = Column(String(64), primary_key=True)
    value_json = Column(JSON, nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
