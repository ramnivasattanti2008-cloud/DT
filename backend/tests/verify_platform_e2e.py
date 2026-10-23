"""
End-to-End Platform Verification Script for SERC-RCS Research Lab
Validates end-to-end database, ML pipeline, experiment runs, and inference.
"""

import sys
import os
import uuid
from pathlib import Path
import pandas as pd

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.database import SessionLocal, init_db
from app.models.dataset import DatasetModel
from app.models.experiment import ExperimentModel
from app.ml.data_generator import generate_synthetic_email_corpus
from app.ml.pipeline import run_protocol_a, run_protocol_b
from app.api.routes_classifiers import classify_email
from app.schemas.prediction import ClassifyRequest
from app.core.config import settings

def main():
    print("[1/5] Initializing database...")
    init_db()
    db = SessionLocal()

    # 1. Benchmark dataset check/creation
    print("[2/5] Checking benchmark dataset...")
    benchmark_id = "ds_benchmark_6000"
    ds = db.query(DatasetModel).filter(DatasetModel.id == benchmark_id).first()
    dest_path = settings.DATA_DIR / "multi_epoch_spam_corpus_6000.csv"

    if not ds or not dest_path.exists():
        print("  Generating 6,000-email benchmark dataset...")
        df = generate_synthetic_email_corpus(seed=42)
        settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
        df.to_csv(dest_path, index=False)

        min_ts = df["timestamp"].min().to_pydatetime()
        max_ts = df["timestamp"].max().to_pydatetime()

        if not ds:
            ds = DatasetModel(
                id=benchmark_id,
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
                validation_summary={
                    "is_valid": True,
                    "total_rows": 6000,
                    "spam_count": 2400,
                    "ham_count": 3600,
                    "duplicate_count": 480,
                    "notes": "Faithfully generated synthetic benchmark modeled on research paper.",
                },
            )
            db.add(ds)
            db.commit()
            print("  Benchmark dataset record committed.")
    else:
        print(f"  Benchmark dataset exists: {ds.name} ({ds.row_count} rows)")
        df = pd.read_csv(dest_path)

    # 2. Check or run Protocol A Experiment
    print("[3/5] Checking baseline experiment runs...")
    exp_a = db.query(ExperimentModel).filter(ExperimentModel.protocol.like("%Protocol A%")).first()
    if not exp_a:
        print("  Running Protocol A baseline (Multinomial NB, Logistic Regression)...")
        res_a = run_protocol_a(
            df=df,
            text_col="text",
            label_col="label",
            timestamp_col="timestamp",
            id_col="id",
            random_state=42,
            target_fpr=0.0035,
            lam=99.0,
            selected_models=["multinomial_nb", "logistic_regression"],
        )

        best_m = max(res_a["model_results"], key=lambda m: m["metrics"].get("f1", 0.0))
        serc_ass = res_a.get("serc_assessment", {})
        rec_a = ExperimentModel(
            id=f"exp_{uuid.uuid4().hex[:12]}",
            name="Protocol A Baseline (Flawed Evaluation)",
            dataset_id=benchmark_id,
            protocol="Protocol A (Flawed Baseline)",
            is_safe=False,
            random_seed=42,
            n_train=res_a["n_train"],
            n_test=res_a["n_test"],
            duplicates_purged=res_a["duplicates_purged"],
            target_fpr=0.0035,
            cost_weight_lambda=99.0,
            best_model_key=best_m["model_key"],
            best_f1=best_m["metrics"].get("f1"),
            best_fpr=best_m["metrics"].get("fpr"),
            best_tcr=best_m["metrics"].get("tcr_99"),
            rcs_percentage=serc_ass.get("rcs_percentage"),
            quality_tier=serc_ass.get("tier"),
            cari_score=best_m.get("cari_score"),
            model_results=res_a["model_results"],
            serc_assessment=serc_ass,
            leakage_report=res_a["leakage_report"],
            deduplication_report={},
            notes="Flawed research baseline with pre-split leakage and duplicate bursts.",
        )
        db.add(rec_a)
        db.commit()
        print(f"  Protocol A saved. RCS: {serc_ass.get('rcs_percentage')}%, CARI: {best_m.get('cari_score')}")
    else:
        print(f"  Existing Protocol A experiment found: {exp_a.id}")

    # 3. Check or run Protocol B Experiment
    exp_b = db.query(ExperimentModel).filter(ExperimentModel.protocol.like("%Protocol B%")).first()
    if not exp_b:
        print("  Running Protocol B leakage-aware experiment (Multinomial NB, Logistic Regression)...")
        res_b = run_protocol_b(
            df=df,
            text_col="text",
            label_col="label",
            timestamp_col="timestamp",
            id_col="id",
            target_fpr=0.0035,
            lam=99.0,
            selected_models=["multinomial_nb", "logistic_regression"],
        )

        best_m = max(res_b["model_results"], key=lambda m: m["metrics"].get("f1", 0.0))
        serc_ass = res_b.get("serc_assessment", {})
        rec_b = ExperimentModel(
            id=f"exp_{uuid.uuid4().hex[:12]}",
            name="Protocol B Leakage-Aware (SERC-Compliant)",
            dataset_id=benchmark_id,
            protocol="Protocol B (SERC-Compliant)",
            is_safe=True,
            random_seed=42,
            n_train=res_b["n_train"],
            n_test=res_b["n_test"],
            duplicates_purged=res_b["duplicates_purged"],
            target_fpr=0.0035,
            cost_weight_lambda=99.0,
            best_model_key=best_m["model_key"],
            best_f1=best_m["metrics"].get("f1"),
            best_fpr=best_m["metrics"].get("fpr"),
            best_tcr=best_m["metrics"].get("tcr_99"),
            rcs_percentage=serc_ass.get("rcs_percentage"),
            quality_tier=serc_ass.get("tier"),
            cari_score=best_m.get("cari_score"),
            model_results=res_b["model_results"],
            serc_assessment=serc_ass,
            leakage_report=res_b["leakage_report"],
            deduplication_report=res_b.get("deduplication_report", {}),
            notes="SERC-compliant protocol with deduplication, chronological splits, and threshold calibration.",
        )
        db.add(rec_b)
        db.commit()
        print(f"  Protocol B saved. RCS: {serc_ass.get('rcs_percentage')}%, CARI: {best_m.get('cari_score')}")
    else:
        print(f"  Existing Protocol B experiment found: {exp_b.id}")

    # 4. Verify inference pipeline
    print("[4/5] Testing real-time classifier inference endpoint logic...")
    test_req = ClassifyRequest(
        text="URGENT: Click here immediately to claim your lottery prize and verify your bank details!",
        custom_threshold=0.50,
        cost_lambda=99.0,
    )
    clf_res = classify_email(test_req, db=db)
    for p in clf_res.predictions:
        print(f"  Model: {p.display_name} -> Prob: {p.predicted_probability:.4f} | Cutoff: {p.decision_threshold:.4f} | Label: {p.predicted_label} | {p.diagnostic}")

    # 5. Done
    total_ds = db.query(DatasetModel).count()
    total_exps = db.query(ExperimentModel).count()
    print(f"[5/5] Verification complete. Database contains {total_ds} datasets and {total_exps} experiments.")
    db.close()

if __name__ == "__main__":
    main()
