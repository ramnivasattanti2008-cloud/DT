"""
Model Implementations for Email Spam Filtering
Implements the four audited classifiers with explicit hyperparameters from the paper:
1. Multinomial Naive Bayes (Laplace alpha = 0.15)
2. Linear Support Vector Machine (C = 1.0) with Platt probability calibration fit on training-only CV
3. Random Forest (B = 100, max_features = 0.38, random_state = 42)
4. L2-Regularized Logistic Regression (C = 2.2, lbfgs, random_state = 42)
"""

from typing import Dict, Any, Optional, Tuple, List
import numpy as np
from sklearn.naive_bayes import MultinomialNB
from sklearn.svm import LinearSVC
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression


class ClassifierWrapper:
    """Unified wrapper around scikit-learn models providing probability outputs and feature weights."""

    def __init__(self, model_key: str, display_name: str, model_instance: Any, params: Dict[str, Any]):
        self.model_key = model_key
        self.display_name = display_name
        self.model = model_instance
        self.params = params
        self.is_fitted = False

    def fit(self, X: Any, y: np.ndarray) -> "ClassifierWrapper":
        self.model.fit(X, y)
        self.is_fitted = True
        return self

    def predict_proba(self, X: Any) -> np.ndarray:
        if not self.is_fitted:
            raise RuntimeError(f"Model {self.display_name} has not been trained yet.")
        if hasattr(self.model, "predict_proba"):
            probs = self.model.predict_proba(X)
            # Return positive class (spam, label=1) probabilities
            if probs.shape[1] >= 2:
                return probs[:, 1]
            return probs[:, 0]
        elif hasattr(self.model, "decision_function"):
            # Platt sigmoid fallback if model somehow has only decision_function
            df = self.model.decision_function(X)
            return 1.0 / (1.0 + np.exp(-df))
        else:
            raise NotImplementedError(f"Model {self.display_name} lacks probability outputs.")

    def predict(self, X: Any, threshold: float = 0.50) -> np.ndarray:
        probs = self.predict_proba(X)
        return (probs >= threshold).astype(int)

    def get_feature_importances(self, feature_names: List[str], top_k: int = 20) -> List[Dict[str, Any]]:
        """Extracts top positive (spam-indicative) and negative (ham-indicative) feature weights."""
        if not self.is_fitted or not feature_names:
            return []

        weights: Optional[np.ndarray] = None
        base_model = self.model

        if isinstance(base_model, CalibratedClassifierCV):
            # For calibrated SVM, average base estimator coefficients
            if hasattr(base_model, "calibrated_classifiers_"):
                sub_weights = []
                for cc in base_model.calibrated_classifiers_:
                    estimator = getattr(cc, "estimator", getattr(cc, "base_estimator", None))
                    if estimator and hasattr(estimator, "coef_"):
                        sub_weights.append(estimator.coef_[0])
                if sub_weights:
                    weights = np.mean(sub_weights, axis=0)
        elif hasattr(base_model, "coef_"):
            weights = base_model.coef_[0]
        elif hasattr(base_model, "feature_importances_"):
            weights = base_model.feature_importances_
        elif hasattr(base_model, "feature_log_prob_"):
            # For Naive Bayes, log-likelihood ratio: log(P(w|spam)) - log(P(w|ham))
            weights = base_model.feature_log_prob_[1] - base_model.feature_log_prob_[0]

        if weights is None or len(weights) != len(feature_names):
            return []

        indexed = list(zip(feature_names, weights))
        indexed.sort(key=lambda x: abs(x[1]), reverse=True)

        return [
            {
                "term": term,
                "weight": round(float(w), 5),
                "direction": "spam" if w > 0 else "ham",
            }
            for term, w in indexed[:top_k]
        ]


def build_multinomial_nb(alpha: float = 0.15) -> ClassifierWrapper:
    """Multinomial Naive Bayes with Laplace smoothing alpha=0.15 (Table 6 configuration)."""
    model = MultinomialNB(alpha=alpha, force_alpha=True)
    return ClassifierWrapper(
        model_key="multinomial_nb",
        display_name="Multinomial Naive Bayes",
        model_instance=model,
        params={"alpha": alpha, "class_prior": None},
    )


def build_linear_svm(c: float = 1.0, random_state: int = 42) -> ClassifierWrapper:
    """
    Linear SVM with Platt probability scaling fit via 5-fold cross-validation
    strictly on training data (avoiding calibration leakage).
    """
    base_svm = LinearSVC(C=c, penalty="l2", loss="squared_hinge", random_state=random_state, max_iter=3000)
    # CalibratedClassifierCV with cv=5 fits sigmoid scaling parameters strictly on training CV folds
    calibrated = CalibratedClassifierCV(estimator=base_svm, method="sigmoid", cv=5)
    return ClassifierWrapper(
        model_key="linear_svm",
        display_name="Linear SVM (Platt Scaled)",
        model_instance=calibrated,
        params={"C": c, "loss": "squared_hinge", "calibration": "sigmoid_cv5", "random_state": random_state},
    )


def build_random_forest(n_estimators: int = 100, max_features: float = 0.38, random_state: int = 42) -> ClassifierWrapper:
    """Random Forest with B=100 trees and 0.38 feature subsampling (Table 6 configuration)."""
    rf = RandomForestClassifier(
        n_estimators=n_estimators,
        max_features=max_features,
        random_state=random_state,
        n_jobs=-1,
    )
    return ClassifierWrapper(
        model_key="random_forest",
        display_name="Random Forest",
        model_instance=rf,
        params={"n_estimators": n_estimators, "max_features": max_features, "random_state": random_state},
    )


def build_logistic_regression(c: float = 2.2, random_state: int = 42) -> ClassifierWrapper:
    """L2-Regularized Logistic Regression with C=2.2 (Table 6 configuration)."""
    lr = LogisticRegression(
        C=c,
        solver="lbfgs",
        random_state=random_state,
        max_iter=2000,
    )
    return ClassifierWrapper(
        model_key="logistic_regression",
        display_name="Logistic Regression (L2)",
        model_instance=lr,
        params={"C": c, "penalty": "l2", "solver": "lbfgs", "random_state": random_state},
    )


def get_all_classifiers(random_state: int = 42) -> Dict[str, ClassifierWrapper]:
    """Returns factory instances of all four primary classifiers."""
    return {
        "multinomial_nb": build_multinomial_nb(alpha=0.15),
        "linear_svm": build_linear_svm(c=1.0, random_state=random_state),
        "random_forest": build_random_forest(n_estimators=100, max_features=0.38, random_state=random_state),
        "logistic_regression": build_logistic_regression(c=2.2, random_state=random_state),
    }
