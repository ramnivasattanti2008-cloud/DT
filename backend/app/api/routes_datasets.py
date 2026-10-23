"""
API Routes for Dataset Laboratory: Upload, Validation, Preview, Deduplication, and Synthetic Generation
"""

from typing import List, Optional
import os
import uuid
from pathlib import Path
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import sanitize_filename, validate_uploaded_file, sanitize_csv_cell
from app.models.dataset import DatasetModel
from app.schemas.dataset import DatasetResponse, DatasetPreview, ColumnMapping, DatasetValidationSummary
from app.ml.data_generator import generate_synthetic_email_corpus
from app.ml.deduplication import deduplicate_dataframe

router = APIRouter(prefix="/api/datasets", tags=["Datasets"])


def detect_columns(columns: List[str]) -> ColumnMapping:
    """Heuristically infers likely column mapping from header names."""
    cols_lower = {c.lower(): c for c in columns}
    text_cand = cols_lower.get("text") or cols_lower.get("body") or cols_lower.get("message") or cols_lower.get("email") or columns[0]
    label_cand = cols_lower.get("label") or cols_lower.get("class") or cols_lower.get("target") or cols_lower.get("spam") or (columns[1] if len(columns) > 1 else columns[0])
    ts_cand = cols_lower.get("timestamp") or cols_lower.get("date") or cols_lower.get("time") or cols_lower.get("datetime")
    id_cand = cols_lower.get("id") or cols_lower.get("msg_id") or cols_lower.get("message_id")

    return ColumnMapping(
        text_col=text_cand,
        label_col=label_cand,
        timestamp_col=ts_cand,
        id_col=id_cand,
    )


@router.post("/upload", response_model=DatasetResponse)
async def upload_dataset(
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
    text_col: Optional[str] = Form(None),
    label_col: Optional[str] = Form(None),
    timestamp_col: Optional[str] = Form(None),
    id_col: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """Uploads a real email dataset (CSV), validates schema, and registers metadata."""
    validate_uploaded_file(file)

    dataset_id = f"ds_{uuid.uuid4().hex[:12]}"
    clean_name = sanitize_filename(file.filename)
    dest_path = settings.UPLOAD_DIR / f"{dataset_id}_{clean_name}"

    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File size exceeds the 50MB security limit.")

    with open(dest_path, "wb") as f:
        f.write(content)

    # Attempt to read CSV
    try:
        df = pd.read_csv(dest_path, nrows=50000)
    except Exception as e:
        if dest_path.exists():
            dest_path.unlink()
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV file: {str(e)}")

    if df.empty:
        if dest_path.exists():
            dest_path.unlink()
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # Determine or infer column mapping
    detected = detect_columns(list(df.columns))
    chosen_mapping = {
        "text_col": text_col or detected.text_col,
        "label_col": label_col or detected.label_col,
        "timestamp_col": timestamp_col or detected.timestamp_col,
        "id_col": id_col or detected.id_col,
    }

    # Validate mapped columns exist
    for col_key, col_val in chosen_mapping.items():
        if col_val and col_val not in df.columns:
            if col_key in ("text_col", "label_col"):
                raise HTTPException(
                    status_code=400,
                    detail=f"Mapped column '{col_val}' for '{col_key}' not found in file headers: {list(df.columns)}",
                )

    # Compute validation stats
    lbl_series = df[chosen_mapping["label_col"]].astype(str).str.lower().str.strip()
    spam_mask = lbl_series.isin(["spam", "1", "true", "yes", "phish"])
    ham_mask = lbl_series.isin(["ham", "0", "false", "no", "legit"])
    spam_count = int(spam_mask.sum())
    ham_count = int(ham_mask.sum())

    # Timestamp checks
    has_valid_ts = False
    min_ts, max_ts = None, None
    ts_col = chosen_mapping.get("timestamp_col")
    if ts_col and ts_col in df.columns:
        try:
            ts_parsed = pd.to_datetime(df[ts_col], errors="coerce")
            valid_ts = ts_parsed.dropna()
            if not valid_ts.empty:
                min_ts = valid_ts.min().to_pydatetime()
                max_ts = valid_ts.max().to_pydatetime()
                has_valid_ts = True
        except Exception:
            has_valid_ts = False

    # Check duplicates count
    txt_col = chosen_mapping["text_col"]
    exact_duplicates = int(df.duplicated(subset=[txt_col]).sum())

    validation_summary = {
        "is_valid": True,
        "total_rows": len(df),
        "spam_count": spam_count,
        "ham_count": ham_count,
        "spam_ratio": round(float(spam_count / len(df)), 4) if len(df) > 0 else 0.0,
        "duplicate_count": exact_duplicates,
        "has_valid_timestamps": has_valid_ts,
        "warnings": [],
        "errors": [],
    }

    if not has_valid_ts:
        validation_summary["warnings"].append(
            "No parseable timestamps found. Chronological evaluation cannot be verified. Shuffled splitting carries look-ahead leakage risks."
        )
    if exact_duplicates > 0:
        validation_summary["warnings"].append(
            f"Found {exact_duplicates} duplicate message rows. Pre-split deduplication required under Protocol B."
        )

    dataset_record = DatasetModel(
        id=dataset_id,
        name=name or clean_name,
        filename=clean_name,
        file_path=str(dest_path),
        row_count=len(df),
        spam_count=spam_count,
        ham_count=ham_count,
        duplicate_count=exact_duplicates,
        min_timestamp=min_ts,
        max_timestamp=max_ts,
        is_synthetic=False,
        column_mapping=chosen_mapping,
        validation_summary=validation_summary,
    )
    db.add(dataset_record)
    db.commit()
    db.refresh(dataset_record)

    return dataset_record


@router.post("/generate-synthetic", response_model=DatasetResponse)
def create_synthetic_benchmark(
    seed: int = 42,
    db: Session = Depends(get_db),
):
    """
    Generates and stores the reproducible 6,000-email benchmark corpus.
    Explicitly labeled SYNTHETIC per research paper specification.
    """
    dataset_id = "ds_synthetic_benchmark_6000"

    # Check if already exists
    existing = db.query(DatasetModel).filter(DatasetModel.id == dataset_id).first()
    if existing:
        return existing

    df = generate_synthetic_email_corpus(seed=seed)
    dest_path = settings.DATA_DIR / "multi_epoch_spam_corpus_6000.csv"
    df.to_csv(dest_path, index=False)

    min_ts = df["timestamp"].min().to_pydatetime()
    max_ts = df["timestamp"].max().to_pydatetime()

    validation_summary = {
        "is_valid": True,
        "total_rows": 6000,
        "spam_count": 2400,
        "ham_count": 3600,
        "spam_ratio": 0.40,
        "duplicate_count": 480,
        "has_valid_timestamps": True,
        "notes": "Faithfully generated synthetic benchmark modeled on the research paper's multi-epoch email distribution.",
        "warnings": [
            "Demonstration benchmark dataset. Explicitly synthetic per engineering directive."
        ],
        "errors": [],
    }

    dataset_record = DatasetModel(
        id=dataset_id,
        name="Multi-Epoch Email Spam Benchmark (6,000 Synthetic Emails)",
        filename="multi_epoch_spam_corpus_6000.csv",
        file_path=str(dest_path),
        row_count=6000,
        spam_count=2400,
        ham_count=3600,
        duplicate_count=480,
        min_timestamp=min_ts,
        max_timestamp=max_ts,
        is_synthetic=True,
        column_mapping={
            "text_col": "text",
            "label_col": "label",
            "timestamp_col": "timestamp",
            "id_col": "id",
        },
        validation_summary=validation_summary,
    )
    db.add(dataset_record)
    db.commit()
    db.refresh(dataset_record)

    return dataset_record


@router.get("", response_model=List[DatasetResponse])
def list_datasets(db: Session = Depends(get_db)):
    """Lists all available datasets."""
    return db.query(DatasetModel).order_by(DatasetModel.created_at.desc()).all()


@router.get("/{dataset_id}", response_model=DatasetResponse)
def get_dataset(dataset_id: str, db: Session = Depends(get_db)):
    """Retrieves a single dataset by ID."""
    record = db.query(DatasetModel).filter(DatasetModel.id == dataset_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    return record


@router.get("/{dataset_id}/preview", response_model=DatasetPreview)
def preview_dataset(dataset_id: str, limit: int = 10, db: Session = Depends(get_db)):
    """Previews the first rows of a dataset with column detection."""
    record = db.query(DatasetModel).filter(DatasetModel.id == dataset_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    if not Path(record.file_path).exists():
        raise HTTPException(status_code=404, detail="Dataset file missing on disk.")

    df = pd.read_csv(record.file_path, nrows=limit)
    mapping = detect_columns(list(df.columns))

    return DatasetPreview(
        columns=list(df.columns),
        sample_rows=df.fillna("").to_dict(orient="records"),
        total_preview_rows=len(df),
        detected_mapping=mapping,
    )


@router.get("/{dataset_id}/export")
def export_dataset(dataset_id: str, db: Session = Depends(get_db)):
    """Downloads dataset with formula injection sanitization applied."""
    record = db.query(DatasetModel).filter(DatasetModel.id == dataset_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    if not Path(record.file_path).exists():
        raise HTTPException(status_code=404, detail="File missing on disk.")

    df = pd.read_csv(record.file_path)
    # Apply CSV formula injection protection to all text columns
    for col in df.select_dtypes(include=["object"]).columns:
        df[col] = df[col].apply(sanitize_csv_cell)

    export_path = settings.DATA_DIR / f"sanitized_{record.filename}"
    df.to_csv(export_path, index=False)

    return FileResponse(
        path=export_path,
        filename=f"safe_{record.filename}",
        media_type="text/csv",
    )


@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: str, db: Session = Depends(get_db)):
    """Deletes a dataset record and its file."""
    record = db.query(DatasetModel).filter(DatasetModel.id == dataset_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    p = Path(record.file_path)
    if p.exists() and "synthetic" not in record.id:
        try:
            p.unlink()
        except Exception:
            pass

    db.delete(record)
    db.commit()
    return {"message": "Dataset deleted successfully."}
