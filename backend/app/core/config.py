"""
Configuration Settings for SERC-RCS Research Lab Backend
"""

import os
from pathlib import Path
from pydantic import BaseModel


class Settings(BaseModel):
    APP_NAME: str = "SERC-RCS Research Lab"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "true").lower() in ("true", "1")

    # Base Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = Path(__file__).resolve().parent.parent.parent / "data"
    REPORTS_DIR: Path = Path(__file__).resolve().parent.parent.parent / "reports"
    UPLOAD_DIR: Path = Path(__file__).resolve().parent.parent.parent / "data" / "uploads"

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{Path(__file__).resolve().parent.parent.parent / 'serc_rcs.db'}"
    )

    # Security & Uploads
    MAX_UPLOAD_SIZE_BYTES: int = 50 * 1024 * 1024  # 50 MB
    ALLOWED_EXTENSIONS: set = {".csv", ".tsv", ".txt"}
    CORS_ORIGINS: list = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    # Experiment Defaults
    DEFAULT_LAMBDA: float = 99.0
    DEFAULT_TARGET_FPR: float = 0.0035  # 0.35% enterprise gateway ceiling
    DEFAULT_CARI_OMEGA: float = 2.0
    COMPATIBILITY_MODE_DEFAULT: bool = False


settings = Settings()

# Ensure directories exist
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
settings.REPORTS_DIR.mkdir(parents=True, exist_ok=True)
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
