"""
API Routes for Automated Leakage Auditing
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.experiment import ExperimentModel

router = APIRouter(prefix="/api/leakage", tags=["Leakage Audit"])

LEAKAGE_SAFEGUARD_DESCRIPTIONS = [
    {
        "check_id": "LEAK_DUP_01",
        "name": "Train/Test Duplicate Overlap",
        "rationale": "Checks whether near-duplicate campaign bursts or forwarded memos span across train and test partitions.",
        "failure_consequence": "Classifiers memorize exact template IDs rather than learning generalizable spam features, inflating F1 by up to 1.17 points.",
        "protocol_a_status": "FAIL (480 near-duplicate copies retained unpurged)",
        "protocol_b_status": "PASS (Shingle-Jaccard deduplication purged duplicates prior to split)",
    },
    {
        "check_id": "LEAK_TIME_02",
        "name": "Chronological Train/Test Inversion",
        "rationale": "Checks whether any training message postdates any test message (look-ahead temporal leakage).",
        "failure_consequence": "Classifier trains on future spam campaigns before scoring earlier messages, obscuring concept drift and real-world degradation.",
        "protocol_a_status": "FAIL (Random shuffled 80:20 split interleaves timestamps across train and test)",
        "protocol_b_status": "PASS (Strict chronological 80:20 partition; earliest 80% train, final 20% test)",
    },
    {
        "check_id": "LEAK_VEC_03",
        "name": "Pre-Split Vectorizer Fit",
        "rationale": "Checks whether TfidfVectorizer was fitted globally on the entire corpus before data partitioning.",
        "failure_consequence": "Inverse document frequencies and vocabulary weights leak held-out test token distributions into the training matrix.",
        "protocol_a_status": "FAIL (fit_transform() executed on all 6,000 rows before splitting)",
        "protocol_b_status": "PASS (fit_transform() executed exclusively on training partition)",
    },
    {
        "check_id": "LEAK_FS_04",
        "name": "Supervised Feature Selection Leakage",
        "rationale": "Checks whether supervised Chi-squared (chi2) feature selection accessed held-out test labels.",
        "failure_consequence": "Selects rare burst tokens strongly correlated with test-set labels, creating an illusion of high recall.",
        "protocol_a_status": "FAIL (SelectKBest fitted on full dataset labels)",
        "protocol_b_status": "PASS (SelectKBest fitted strictly on training labels)",
    },
    {
        "check_id": "LEAK_CAL_05",
        "name": "Probability Calibration Overlap",
        "rationale": "Checks whether Platt sigmoid scaling was fitted on the final evaluation test set.",
        "failure_consequence": "Overfits calibration parameters to test margin violations, distorting probability calibration.",
        "protocol_a_status": "PASS (Platt parameters fitted via training CV)",
        "protocol_b_status": "PASS (Platt parameters fitted via 5-fold cross-validation on training data only)",
    },
    {
        "check_id": "LEAK_THR_06",
        "name": "Threshold Selection Test Leakage",
        "rationale": "Checks whether decision cutoff tau* was tuned directly on final evaluation test labels.",
        "failure_consequence": "Artificially satisfies false-positive constraints on test set while failing in live deployment.",
        "protocol_a_status": "PASS (Fixed default tau=0.50 used)",
        "protocol_b_status": "PASS (Cutoff tau* calibrated strictly on validation partition without test set inspection)",
    },
]


@router.get("/definitions")
def get_leakage_definitions():
    """Returns the descriptions and failure consequences for all 6 leakage safeguards."""
    return {"safeguards": LEAKAGE_SAFEGUARD_DESCRIPTIONS}


@router.get("/audit/{experiment_id}")
def get_experiment_leakage_report(experiment_id: str, db: Session = Depends(get_db)):
    """Retrieves the leakage audit report and measured evidence for a saved experiment."""
    record = db.query(ExperimentModel).filter(ExperimentModel.id == experiment_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Experiment not found.")

    return {
        "experiment_id": record.id,
        "name": record.name,
        "protocol": record.protocol,
        "is_safe": record.is_safe,
        "leakage_report": record.leakage_report,
    }
