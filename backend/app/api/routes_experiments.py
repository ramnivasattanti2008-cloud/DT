"""
API Routes for Experiment Runner, Execution, and Model Comparison
"""

from typing import List, Optional
import uuid
from pathlib import Path
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.dataset import DatasetModel
from app.models.experiment import ExperimentModel
from app.schemas.experiment import ExperimentRunRequest, ExperimentResponse
from app.ml.pipeline import run_protocol_a, run_protocol_b

router = APIRouter(prefix="/api/experiments", tags=["Experiments"])


@router.post("/run", response_model=ExperimentResponse)
def execute_experiment(
    req: ExperimentRunRequest,
    db: Session = Depends(get_db),
):
    """
    Executes a real machine learning experiment (Protocol A or Protocol B)
    on the chosen dataset, computing all metrics, threshold calibrations, and leakage audits.
    """
    dataset = db.query(DatasetModel).filter(DatasetModel.id == req.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Selected dataset not found.")

    if not Path(dataset.file_path).exists():
        raise HTTPException(status_code=404, detail="Dataset file missing on disk.")

    df = pd.read_csv(dataset.file_path)
    mapping = dataset.column_mapping or {}

    text_col = mapping.get("text_col", "text")
    label_col = mapping.get("label_col", "label")
    timestamp_col = mapping.get("timestamp_col", "timestamp")
    id_col = mapping.get("id_col", "id")

    experiment_id = f"exp_{uuid.uuid4().hex[:12]}"
    exp_name = req.name or f"{req.protocol} Run on {dataset.name[:30]}"

    # Execute selected protocol
    if req.protocol.strip().upper() in ("PROTOCOL A", "PROTOCOL A (FLAWED)", "A"):
        res = run_protocol_a(
            df=df,
            text_col=text_col,
            label_col=label_col,
            timestamp_col=timestamp_col,
            id_col=id_col,
            random_state=req.random_seed,
            target_fpr=req.target_fpr,
            lam=req.cost_weight_lambda,
            selected_models=req.selected_models,
        )
        protocol_str = "Protocol A (Flawed Baseline)"
    else:
        res = run_protocol_b(
            df=df,
            text_col=text_col,
            label_col=label_col,
            timestamp_col=timestamp_col,
            id_col=id_col,
            random_state=req.random_seed,
            target_fpr=req.target_fpr,
            lam=req.cost_weight_lambda,
            selected_models=req.selected_models,
        )
        protocol_str = "Protocol B (SERC-Compliant)"

    # Identify best model by F1 or TCR
    best_clf = None
    best_f1 = -1.0
    for m in res["model_results"]:
        f1_val = m["metrics"].get("f1") or 0.0
        if f1_val > best_f1:
            best_f1 = f1_val
            best_clf = m

    serc_ass = res.get("serc_assessment", {})
    leak_rep = res.get("leakage_report", {})

    record = ExperimentModel(
        id=experiment_id,
        name=exp_name,
        dataset_id=req.dataset_id,
        protocol=protocol_str,
        is_safe=res.get("is_safe_for_validation", False),
        random_seed=req.random_seed,
        n_train=res.get("n_train", 0),
        n_test=res.get("n_test", 0),
        duplicates_purged=res.get("duplicates_purged", 0),
        target_fpr=req.target_fpr,
        cost_weight_lambda=req.cost_weight_lambda,
        best_model_key=best_clf["model_key"] if best_clf else None,
        best_f1=best_clf["metrics"].get("f1") if best_clf else None,
        best_fpr=best_clf["metrics"].get("fpr") if best_clf else None,
        best_tcr=best_clf["metrics"].get("tcr_99") if best_clf else None,
        rcs_percentage=serc_ass.get("rcs_percentage"),
        quality_tier=serc_ass.get("tier"),
        cari_score=best_clf.get("cari_score") if best_clf else None,
        model_results=res.get("model_results", []),
        serc_assessment=serc_ass,
        leakage_report=leak_rep,
        deduplication_report=res.get("deduplication_report", {}),
        notes=req.notes,
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    return record


@router.get("", response_model=List[ExperimentResponse])
def list_experiments(
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """Lists saved experiments ordered by newest first."""
    return db.query(ExperimentModel).order_by(ExperimentModel.created_at.desc()).limit(limit).all()


@router.get("/compare")
def compare_experiments(
    ids: str = Query(..., description="Comma-separated experiment IDs"),
    db: Session = Depends(get_db),
):
    """Compares multiple experiments side-by-side."""
    id_list = [i.strip() for i in ids.split(",") if i.strip()]
    records = db.query(ExperimentModel).filter(ExperimentModel.id.in_(id_list)).all()
    if not records:
        raise HTTPException(status_code=404, detail="No matching experiments found.")

    comparison = []
    for r in records:
        comparison.append({
            "id": r.id,
            "name": r.name,
            "protocol": r.protocol,
            "is_safe": r.is_safe,
            "rcs_percentage": r.rcs_percentage,
            "quality_tier": r.quality_tier,
            "cari_score": r.cari_score,
            "best_f1": r.best_f1,
            "best_fpr": r.best_fpr,
            "best_tcr": r.best_tcr,
            "target_fpr": r.target_fpr,
            "cost_weight_lambda": r.cost_weight_lambda,
            "duplicates_purged": r.duplicates_purged,
            "created_at": r.created_at,
            "models": [
                {
                    "model_key": m["model_key"],
                    "display_name": m["display_name"],
                    "threshold": m["threshold"],
                    "metrics": m["metrics"],
                    "cari_score": m["cari_score"],
                }
                for m in r.model_results
            ],
        })

    return {"experiments": comparison}


@router.get("/{experiment_id}", response_model=ExperimentResponse)
def get_experiment(experiment_id: str, db: Session = Depends(get_db)):
    """Retrieves full details of a single experiment."""
    record = db.query(ExperimentModel).filter(ExperimentModel.id == experiment_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Experiment not found.")
    return record


@router.delete("/{experiment_id}")
def delete_experiment(experiment_id: str, db: Session = Depends(get_db)):
    """Deletes an experiment record."""
    record = db.query(ExperimentModel).filter(ExperimentModel.id == experiment_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Experiment not found.")

    db.delete(record)
    db.commit()
    return {"message": "Experiment deleted successfully."}
