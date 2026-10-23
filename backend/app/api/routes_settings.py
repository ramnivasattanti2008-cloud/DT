"""
API Routes for System Settings and Configuration
"""

from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.config import settings
from app.core.database import get_db
from app.models.settings import SystemSettingModel

router = APIRouter(prefix="/api/settings", tags=["Settings"])


class SettingsUpdateRequest(BaseModel):
    cost_weight_lambda: float = 99.0
    target_fpr_ceiling: float = 0.0035
    cari_omega_penalty: float = 2.0
    compatibility_mode: bool = False


@router.get("")
def get_system_settings(db: Session = Depends(get_db)):
    """Retrieves current platform settings and defaults."""
    record = db.query(SystemSettingModel).filter(SystemSettingModel.key == "platform_config").first()
    if record:
        return record.value_json

    # Default configuration
    default_config = {
        "cost_weight_lambda": settings.DEFAULT_LAMBDA,
        "target_fpr_ceiling": settings.DEFAULT_TARGET_FPR,
        "cari_omega_penalty": settings.DEFAULT_CARI_OMEGA,
        "compatibility_mode": settings.COMPATIBILITY_MODE_DEFAULT,
        "app_name": settings.APP_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "max_upload_size_mb": 50,
        "allowed_formats": list(settings.ALLOWED_EXTENSIONS),
    }
    return default_config


@router.post("")
def update_system_settings(req: SettingsUpdateRequest, db: Session = Depends(get_db)):
    """Updates operational settings."""
    record = db.query(SystemSettingModel).filter(SystemSettingModel.key == "platform_config").first()
    config_dict = {
        "cost_weight_lambda": req.cost_weight_lambda,
        "target_fpr_ceiling": req.target_fpr_ceiling,
        "cari_omega_penalty": req.cari_omega_penalty,
        "compatibility_mode": req.compatibility_mode,
        "app_name": settings.APP_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
    }

    if record:
        record.value_json = config_dict
    else:
        record = SystemSettingModel(key="platform_config", value_json=config_dict)
        db.add(record)

    db.commit()
    return {"message": "Settings updated successfully.", "settings": config_dict}
