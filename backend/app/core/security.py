"""
Security Utilities: CSV Formula Injection Prevention and File Validation
"""

import os
import re
from pathlib import Path
from typing import Any
from fastapi import HTTPException, UploadFile
from app.core.config import settings


def sanitize_csv_cell(value: Any) -> Any:
    """
    Prevents CSV / Spreadsheet Formula Injection (CWE-1236).
    If a cell value starts with '=', '+', '-', '@', '\t', or '\r',
    it is prepended with a single quote "'" to neutralize active formula execution.
    """
    if not isinstance(value, str):
        return value

    # Check dangerous prefix characters
    if value and value[0] in ("=", "+", "-", "@", "\t", "\r"):
        return f"'{value}"
    return value


def sanitize_filename(filename: str) -> str:
    """Removes path traversal sequences and unsafe characters from filenames."""
    clean = os.path.basename(filename)
    clean = re.sub(r"[^a-zA-Z0-9_\-\.]", "_", clean)
    return clean or "unnamed_upload"


def validate_uploaded_file(file: UploadFile) -> None:
    """Validates file extension and size constraints."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename cannot be empty.")

    ext = Path(file.filename).suffix.lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Allowed extensions: {', '.join(settings.ALLOWED_EXTENSIONS)}",
        )
