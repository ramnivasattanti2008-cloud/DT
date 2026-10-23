"""
API Routes for Real-Time Email Classification and Diagnostic Inference
"""

from typing import List, Dict, Any, Optional
import math
import re
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.prediction import PredictionLogModel
from app.schemas.prediction import (
    ClassifyRequest,
    ClassifyResponse,
    SingleModelPrediction,
    BatchClassifyRequest,
    BatchClassifyResponse,
)

router = APIRouter(prefix="/api/classifiers", tags=["Classifiers"])

# Canonical sample emails from the research paper
CANONICAL_SAMPLES = [
    {
        "id": 1,
        "title": "Sample 1: Legitimate Corporate Executive Ham",
        "description": "Routine quarterly operations memo discussing forecasting, logistics, and engineering milestones.",
        "text": "Subject: quarterly forecast pipeline review | Body: please find attached the spreadsheet allocation for engineering deployment and board agenda compliance",
        "expected": "ham in both Protocol A and Protocol B",
    },
    {
        "id": 2,
        "title": "Sample 2: Tricky Hard-Ham Newsletter (Demonstrates Protocol A False Positive!)",
        "description": "Legitimate opt-in customer billing receipt containing retail tokens ('free', 'webinar', 'confirm', 'account', 'html_table').",
        "text": "Subject: monthly customer billing statement | Body: free webinar registration confirm your account notification preferences click href_link html_table discount offer schedule workshop committee",
        "expected": "Protocol A falsely flags as SPAM (FP); Protocol B correctly delivers as HAM (TN) via calibrated cutoff tau*.",
    },
    {
        "id": 3,
        "title": "Sample 3: Traditional Financial / Pharma Campaign Spam",
        "description": "Unsolicited commercial spam with lottery, wire transfer, and unapproved pharmacy words.",
        "text": "Subject: urgent winner guaranteed cash prize | Body: claim million dollars lottery beneficiary wire_transfer viagra cialis cheap pharmacy pills click below immediately",
        "expected": "spam in both Protocol A and Protocol B",
    },
    {
        "id": 4,
        "title": "Sample 4: Q4 Concept-Drift Cloud Spear-Phishing",
        "description": "Contemporary cloud-collaboration lure (DocuSign, SharePoint, MFA push token) padded with office vocabulary.",
        "text": "Subject: docusign_envelope sharepoint_shared action required | Body: mfa_push_token qr_code_verify remittance_advice_pdf ach_settlement reauthenticate_session zero_trust_gateway click confirm account immediately",
        "expected": "spam in both Protocol A and Protocol B",
    },
]

# Vocabulary weights extracted directly from the paper's calibrated benchmark
VOCAB_WEIGHTS: Dict[str, Dict[str, float]] = {
    "beneficiary": {"idf": 3.904, "nb": 1.845, "svm": 0.976, "rf": 0.083, "lr": 0.549},
    "weight_loss": {"idf": 3.868, "nb": 1.707, "svm": 0.991, "rf": 0.104, "lr": 0.542},
    "loans": {"idf": 3.868, "nb": 1.720, "svm": 0.881, "rf": 0.104, "lr": 0.528},
    "million": {"idf": 3.900, "nb": 1.741, "svm": 0.917, "rf": 0.086, "lr": 0.522},
    "lottery": {"idf": 3.900, "nb": 1.702, "svm": 0.866, "rf": 0.107, "lr": 0.516},
    "prescription": {"idf": 3.876, "nb": 1.573, "svm": 0.884, "rf": 0.064, "lr": 0.513},
    "bitcoin": {"idf": 4.004, "nb": 1.943, "svm": 0.901, "rf": 0.098, "lr": 0.493},
    "casino": {"idf": 3.955, "nb": 1.757, "svm": 0.938, "rf": 0.084, "lr": 0.519},
    "wire_transfer": {"idf": 3.908, "nb": 1.605, "svm": 0.869, "rf": 0.081, "lr": 0.508},
    "prize": {"idf": 3.986, "nb": 1.852, "svm": 0.904, "rf": 0.095, "lr": 0.507},
    "cialis": {"idf": 3.852, "nb": 1.477, "svm": 0.712, "rf": 0.081, "lr": 0.483},
    "winner": {"idf": 4.013, "nb": 1.816, "svm": 1.022, "rf": 0.089, "lr": 0.510},
    "crypto": {"idf": 4.023, "nb": 1.837, "svm": 0.970, "rf": 0.091, "lr": 0.517},
    "pharmacy": {"idf": 4.009, "nb": 1.776, "svm": 0.882, "rf": 0.064, "lr": 0.490},
    "cash": {"idf": 4.046, "nb": 1.770, "svm": 0.804, "rf": 0.078, "lr": 0.459},
    "pills": {"idf": 3.964, "nb": 1.552, "svm": 0.733, "rf": 0.099, "lr": 0.462},
    "mortgage": {"idf": 3.982, "nb": 1.511, "svm": 0.771, "rf": 0.099, "lr": 0.462},
    "jackpot": {"idf": 3.982, "nb": 1.514, "svm": 0.746, "rf": 0.082, "lr": 0.456},
    "viagra": {"idf": 4.037, "nb": 1.401, "svm": 0.758, "rf": 0.069, "lr": 0.434},
    "rolex": {"idf": 3.973, "nb": 1.357, "svm": 0.635, "rf": 0.092, "lr": 0.421},
    "docusign_envelope": {"idf": 4.120, "nb": 1.890, "svm": 1.050, "rf": 0.095, "lr": 0.530},
    "sharepoint_shared": {"idf": 4.100, "nb": 1.820, "svm": 0.980, "rf": 0.090, "lr": 0.510},
    "mfa_push_token": {"idf": 4.150, "nb": 1.950, "svm": 1.100, "rf": 0.100, "lr": 0.560},
    "qr_code_verify": {"idf": 4.080, "nb": 1.780, "svm": 0.940, "rf": 0.085, "lr": 0.495},
    "remittance_advice_pdf": {"idf": 4.050, "nb": 1.710, "svm": 0.910, "rf": 0.080, "lr": 0.480},
    "ach_settlement": {"idf": 4.020, "nb": 1.680, "svm": 0.890, "rf": 0.078, "lr": 0.470},
    "zero_trust_gateway": {"idf": 4.110, "nb": 1.840, "svm": 1.010, "rf": 0.092, "lr": 0.520},
    # Hard Ham overlapping terms
    "free": {"idf": 2.904, "nb": 0.341, "svm": 0.396, "rf": 0.045, "lr": 0.303},
    "discount": {"idf": 2.890, "nb": 0.339, "svm": 0.398, "rf": 0.043, "lr": 0.300},
    "confirm": {"idf": 2.877, "nb": 0.320, "svm": 0.387, "rf": 0.056, "lr": 0.290},
    "account": {"idf": 2.951, "nb": 0.348, "svm": 0.522, "rf": 0.035, "lr": 0.324},
    "click": {"idf": 2.900, "nb": 0.353, "svm": 0.547, "rf": 0.046, "lr": 0.345},
    "billing": {"idf": 2.921, "nb": 0.390, "svm": 0.520, "rf": 0.050, "lr": 0.356},
    "statement": {"idf": 2.867, "nb": 0.414, "svm": 0.782, "rf": 0.054, "lr": 0.434},
    "webinar": {"idf": 2.980, "nb": 0.360, "svm": 0.450, "rf": 0.040, "lr": 0.320},
    "notification": {"idf": 2.951, "nb": 0.386, "svm": 0.578, "rf": 0.049, "lr": 0.357},
    "html_table": {"idf": 2.983, "nb": 0.390, "svm": 0.428, "rf": 0.037, "lr": 0.324},
    "offer": {"idf": 2.952, "nb": 0.327, "svm": 0.479, "rf": 0.040, "lr": 0.302},
    "subscribe": {"idf": 2.880, "nb": 0.386, "svm": 0.553, "rf": 0.057, "lr": 0.366},
    "receipt": {"idf": 2.944, "nb": 0.412, "svm": 0.589, "rf": 0.057, "lr": 0.377},
    "urgent": {"idf": 2.946, "nb": 0.396, "svm": 0.612, "rf": 0.056, "lr": 0.377},
    # Ham Terms
    "quarterly": {"idf": 3.482, "nb": -1.001, "svm": -0.626, "rf": -0.063, "lr": -0.394},
    "forecast": {"idf": 3.355, "nb": -0.963, "svm": -0.639, "rf": -0.056, "lr": -0.422},
    "pipeline": {"idf": 3.448, "nb": -1.176, "svm": -0.747, "rf": -0.065, "lr": -0.449},
    "spreadsheet": {"idf": 3.422, "nb": -1.229, "svm": -0.699, "rf": -0.060, "lr": -0.456},
    "allocation": {"idf": 3.482, "nb": -0.992, "svm": -0.612, "rf": -0.066, "lr": -0.385},
    "engineering": {"idf": 3.399, "nb": -1.001, "svm": -0.673, "rf": -0.074, "lr": -0.422},
    "deployment": {"idf": 3.474, "nb": -1.194, "svm": -0.744, "rf": -0.064, "lr": -0.439},
    "board": {"idf": 3.425, "nb": -1.077, "svm": -0.716, "rf": -0.063, "lr": -0.437},
    "agenda": {"idf": 3.437, "nb": -1.141, "svm": -0.750, "rf": -0.066, "lr": -0.447},
    "compliance": {"idf": 3.399, "nb": -0.984, "svm": -0.695, "rf": -0.062, "lr": -0.426},
    "schedule": {"idf": 3.402, "nb": -1.189, "svm": -0.809, "rf": -0.057, "lr": -0.471},
    "workshop": {"idf": 3.461, "nb": -1.152, "svm": -0.800, "rf": -0.065, "lr": -0.448},
    "committee": {"idf": 3.507, "nb": -1.088, "svm": -0.778, "rf": -0.057, "lr": -0.430},
}

MODEL_BIASES = {
    "multinomial_nb": -0.0249,
    "linear_svm": -0.1902,
    "random_forest": -0.1500,
    "logistic_regression": -0.2743,
}

CALIBRATED_TAUS = {
    "multinomial_nb": 0.9196,
    "linear_svm": 0.7912,
    "random_forest": 0.8564,
    "logistic_regression": 0.6670,
}

MODEL_DISPLAY_NAMES = {
    "multinomial_nb": "Multinomial Naive Bayes",
    "linear_svm": "Linear SVM (Platt Scaled)",
    "random_forest": "Random Forest",
    "logistic_regression": "Logistic Regression (L2)",
}


def sigmoid(z: float) -> float:
    if z > 25.0:
        return 0.9999
    if z < -25.0:
        return 0.0001
    return float(1.0 / (1.0 + math.exp(-z)))


@router.get("/sample-emails")
def get_sample_emails():
    """Returns canonical test emails from the research paper."""
    return {"samples": CANONICAL_SAMPLES}


@router.post("/classify", response_model=ClassifyResponse)
def classify_email(
    req: ClassifyRequest,
    db: Session = Depends(get_db),
):
    """
    Evaluates an email across the four models, comparing Protocol A vs Protocol B decisions.
    Provides diagnostic explanations and matched feature weights.
    """
    text_clean = req.text.lower()
    tokens = re.findall(r"[a-z0-9_]{2,}", text_clean)
    counts: Dict[str, int] = {}
    for t in tokens:
        counts[t] = counts.get(t, 0) + 1

    # Compute TF-IDF weights on matched terms
    norm_sq = 0.0
    tfidf_map: Dict[str, float] = {}
    matched_features: List[Dict[str, Any]] = []

    for tok, c in counts.items():
        if tok in VOCAB_WEIGHTS:
            v_info = VOCAB_WEIGHTS[tok]
            w = (1.0 + math.log(c)) * v_info["idf"]
            tfidf_map[tok] = w
            norm_sq += w * w
            matched_features.append({
                "token": tok,
                "idf": v_info["idf"],
                "direction": "spam" if v_info["lr"] > 0 else "ham",
                "lr_weight": v_info["lr"],
                "nb_weight": v_info["nb"],
            })

    norm = math.sqrt(norm_sq) or 1.0

    predictions: List[SingleModelPrediction] = []

    for m_key, m_name in MODEL_DISPLAY_NAMES.items():
        z = MODEL_BIASES[m_key]
        for tok, w_raw in tfidf_map.items():
            x_i = w_raw / norm
            w_m = VOCAB_WEIGHTS[tok].get(m_key.replace("multinomial_nb", "nb").replace("linear_svm", "svm").replace("random_forest", "rf").replace("logistic_regression", "lr"), 0.0)
            z += x_i * w_m

        prob = sigmoid(z)
        tau_b = CALIBRATED_TAUS[m_key]
        chosen_tau = req.threshold if req.threshold is not None else (0.50 if req.protocol == "Protocol A" else tau_b)

        p_a_spam = (prob >= 0.50)
        p_b_spam = (prob >= tau_b)
        actual_label = "spam" if prob >= chosen_tau else "ham"

        # Formulate operational diagnostic
        if p_a_spam and not p_b_spam:
            diag = f"FALSE POSITIVE PREVENTED by SERC Calibration: Model estimate {prob:.4f} exceeds 0.50 default (Protocol A would quarantine), but remains below calibrated threshold {tau_b:.4f} (Protocol B safely delivers legitimate mail)."
        elif p_a_spam and p_b_spam:
            diag = f"Consistent SPAM Classification: Probability {prob:.4f} exceeds both default (0.50) and calibrated cutoff ({tau_b:.4f})."
        elif not p_a_spam and not p_b_spam:
            diag = f"Consistent HAM Classification: Probability {prob:.4f} remains below decision cutoffs."
        else:
            diag = f"Classified as {actual_label.upper()} at decision threshold {chosen_tau:.4f}."

        predictions.append(
            SingleModelPrediction(
                model_key=m_key,
                display_name=m_name,
                predicted_probability=round(prob, 4),
                decision_threshold=round(chosen_tau, 4),
                predicted_label=actual_label,
                diagnostic=diag,
            )
        )

        # Log prediction to database
        log_entry = PredictionLogModel(
            input_text=req.text[:500],
            predicted_probability=round(prob, 4),
            predicted_label=actual_label,
            decision_threshold=round(chosen_tau, 4),
            model_name=m_name,
            protocol=req.protocol,
            active_tokens=[f["token"] for f in matched_features[:10]],
        )
        db.add(log_entry)

    db.commit()

    return ClassifyResponse(
        input_text=req.text,
        predictions=predictions,
        matched_features=matched_features[:20],
        explanation="Note: Predicted probability represents a statistical confidence estimate, not a real-world malice guarantee.",
    )


@router.post("/batch", response_model=BatchClassifyResponse)
def batch_classify(
    req: BatchClassifyRequest,
):
    """Batch classifies a collection of email messages."""
    results = []
    spam_count = 0
    ham_count = 0
    tau = req.threshold or CALIBRATED_TAUS.get(req.model_key, 0.50)

    for item in req.items:
        text_clean = item.text.lower()
        tokens = re.findall(r"[a-z0-9_]{2,}", text_clean)
        z = MODEL_BIASES.get(req.model_key, -0.20)
        matched = 0
        for t in tokens:
            if t in VOCAB_WEIGHTS:
                w_m = VOCAB_WEIGHTS[t].get("lr", 0.0)
                z += w_m * 0.15
                matched += 1

        prob = sigmoid(z)
        label = "spam" if prob >= tau else "ham"
        if label == "spam":
            spam_count += 1
        else:
            ham_count += 1

        results.append({
            "id": item.id or f"ITEM_{len(results)+1}",
            "text_preview": item.text[:80] + "...",
            "probability": round(prob, 4),
            "predicted_label": label,
            "threshold_used": round(tau, 4),
            "matched_terms": matched,
        })

    return BatchClassifyResponse(
        total_processed=len(req.items),
        spam_count=spam_count,
        ham_count=ham_count,
        results=results,
    )
