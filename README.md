# SERC-RCS Research Lab

> **A Scientific Platform for Auditing Split-Point Leakage, False-Alarm Costs, and Reporting Rigor in Machine Learning Mail Filters**

Based on the research paper:  
*“Evaluating Feature Leakage and False-Alarm Costs With Experimental Reproducibility in Email Spam Classifiers Through the SERC-RCS Rubric”* (Attanti, Shreya, & Sarwar).

---

## 1. Executive Summary & Purpose

The **SERC-RCS Research Lab** is an end-to-end, runnable research and operational platform designed to answer five scientific questions:

1. **Is the experiment vulnerable to data leakage?** (Pre-split vectorizer fitting, duplicate bursts, lookahead chronological inversion, supervised feature selection leakage).
2. **How many legitimate emails would be incorrectly blocked?** (Quantifying false alarm rates and asymmetric misclassification costs).
3. **Does the model remain effective on future, chronologically unseen messages?** (Evaluating temporal concept drift on holdout time windows).
4. **Can another researcher independently reproduce the result?** (Full determinism, seeded benchmarks, and parameter archival).
5. **Does the experiment satisfy the SERC checklist and achieve a defensible RCS and CARI score?**

### Live Public Deployment Link
The application is deployed with a live public HTTPS domain:
- **Public Web Application**: [https://contacting-ongoing-circuit-diverse.trycloudflare.com](https://contacting-ongoing-circuit-diverse.trycloudflare.com)
- **Public API Documentation**: [https://contacting-ongoing-circuit-diverse.trycloudflare.com/api/docs](https://contacting-ongoing-circuit-diverse.trycloudflare.com/api/docs)
*(Accessible globally with full SSL encryption and universal origin proxying)*

---

## 2. Core Architecture & Tech Stack

The platform is built with a decoupled, high-performance architecture:

```
├── backend/                    # Python 3.12+ FastAPI ML & Experiment Service
│   ├── app/
│   │   ├── api/                # REST API Routes (Datasets, Classifiers, Experiments, Leakage, SERC, Reports, Settings)
│   │   ├── core/               # Configuration, SQLite Database, Security (CSV Formula Sanitizer)
│   │   ├── ml/                 # Scientific ML Core: Classifiers, Metrics, Deduplication, Leakage, CARI, Pipeline
│   │   ├── models/             # SQLAlchemy ORM Models (Datasets, Experiments, Predictions, Settings)
│   │   └── schemas/            # Pydantic V2 Request & Response Schemas
│   └── tests/                  # 20 Comprehensive Pytest Unit & Integration Tests (100% Pass)
├── frontend/                   # Next.js 14 (App Router) + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── app/                # 10 Primary Dedicated Research Pages
│   │   ├── components/         # Reusable Strict-Monochrome Components & Charts
│   │   └── lib/                # Typed REST Client & Data Contracts
└── docs/                       # Technical Specifications & Mathematical Proofs
```

### Strict Monochromatic Design System
The frontend adheres to a strict, high-contrast monochrome design philosophy (pure whites `#FFFFFF`, deep grays `#111111`, `#0A0A0A`, `#666666`, hairlines `#E5E5E5`, and backgrounds `#F7F7F7`). It uses zero colored accents or decorative emojis, ensuring publication-ready clarity and Swiss typographic restraint.

---

## 3. Ten Primary Navigation Pages

The platform features 10 fully implemented, functional web interfaces:

| Page | Route | Description |
| :--- | :--- | :--- |
| **Overview** | `/` | Executive platform summary, key empirical findings from Attanti et al., and interactive workflow cards. |
| **Dataset Laboratory** | `/datasets` | Upload CSV/TSV corpora, automated header detection, Shingle-Jaccard deduplication audit, and benchmark generation. |
| **Spam Classifier** | `/classifier` | Real-time multi-model inference comparing default cutoffs ($\tau = 0.50$) against SERC cost-calibrated thresholds ($\tau^*$). |
| **Leakage Audit** | `/leakage` | Automated 6-point leakage verification engine detecting duplicate cross-contamination, lookahead inversion, and vectorizer leakage. |
| **Experiment Runner** | `/runner` | Configurable runner executing Protocol A (flawed baseline) or Protocol B (leakage-aware, calibrated) across 4 classifiers. |
| **Model Comparison** | `/comparison` | Interactive ablation explorer comparing Protocol A vs Protocol B metrics, confusion matrices, and TCR curves. |
| **SERC-RCS Evaluator** | `/serc` | Interactive 10-Item SERC scoring interface with automated RCS percentage, Quality Tiers (Tier A–D), and live CARI calculation. |
| **Research Reports** | `/reports` | Publication-ready scientific verification reports with print formatting, CSV download, and JSON audit bundle export. |
| **Experiment History** | `/history` | Searchable, persistent database archive of all past runs with safety badges, metrics, and deep-link inspections. |
| **Settings** | `/settings` | System configuration for cost penalty $\lambda$, target FPR ceiling $\alpha$, CARI penalty $\omega$, and SQLite diagnostics. |

---

## 4. Scientific & Mathematical Specifications

### 4.1. Supported Classifiers
1. **Multinomial Naive Bayes**: Laplace smoothing $\alpha = 0.15$ with log-odds likelihoods.
2. **Linear SVM (Platt-Calibrated)**: Primal L2-hinge loss with $C = 1.0$, calibrated via training-only 5-fold cross-validation.
3. **Random Forest**: $B = 100$ trees, feature subsampling ratio $m_{\text{try}} = 0.38$, fixed PRNG seed $42$.
4. **Logistic Regression (L2)**: Regularization parameter $C = 2.2$ with L-BFGS solver.

### 4.2. Experimental Protocols
- **Protocol A (Flawed Literature Baseline - UNSAFE)**:
  - Retains duplicate burst copies.
  - Fits TF-IDF and supervised Chi-square feature selection globally *before* partitioning.
  - Shuffled stratified 80:20 train/test split ignoring message chronology.
  - Evaluates at an arbitrary, fixed decision cutoff $\tau = 0.50$.
- **Protocol B (SERC-Compliant - SAFE)**:
  - Pre-split Shingle-Jaccard deduplication ($s = 0.82$) purging duplicate copies.
  - Deterministic chronological train/test split preserving temporal causality.
  - Preprocessing and feature selection fit strictly on the training partition.
  - Empirical threshold calibration $\tau^*$ chosen to satisfy $\text{FPR} \le \text{target}$ on validation data.

### 4.3. Key Mathematical Invariants
- **Cost-Weighted Accuracy**:
  $$\text{WAcc}(\lambda) = \frac{TP + \lambda \cdot TN}{TP + FN + \lambda \cdot (TN + FP)}$$
- **Total Cost Ratio**:
  $$\text{TCR}(\lambda) = \frac{N_{\text{spam}}}{\lambda \cdot FP + FN}$$
- **Bayes Theoretical Cutoff**:
  $$\tau^*(\lambda) = \frac{\lambda}{\lambda + 1}$$
- **Reporting Completeness Score (RCS)**:
  $$\text{RCS} = 100 \times \frac{\sum_{i \in \text{Applicable}} g_i}{|\text{Applicable}|}$$
- **Cost-Adjusted Reproducibility Index (CARI)**:
  $$\text{CARI} = F_1 \times \max(0, 1 - \omega \cdot \text{FPR}) \times \left(0.50 + \frac{\text{RCS}}{200}\right)$$

---

## 5. Quickstart & Installation

### Prerequisites
- Python 3.12+
- Node.js 18+ and npm 9+

### Backend Setup
1. Open a terminal in the project root:
   ```bash
   # Windows PowerShell
   $env:PYTHONPATH="backend"
   python -m pip install -r backend/requirements.txt
   ```
2. Run automated test suite:
   ```bash
   pytest backend/tests -v
   ```
   *(All 20 tests should pass in ~11s)*
3. Start the FastAPI backend server:
   ```bash
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
   ```
   API interactive documentation will be available at `http://127.0.0.1:8000/docs`.

### Frontend Setup
1. In a separate terminal, navigate to `frontend`:
   ```bash
   cd frontend
   npm install
   ```
2. Build and start the Next.js production server:
   ```bash
   npm run build
   npm run start -- -p 3000
   ```
3. Open your browser at:
   `http://localhost:3000`

---

## 6. Automated Test Coverage

The test suite in `backend/tests/` verifies all research guarantees:

- `test_metrics.py`: Hand-calculated confusion matrices, zero-division safety, WAcc, TCR.
- `test_serc_cari.py`: 10-Item rubric grading, RCS tiers, CARI boundary conditions.
- `test_thresholds.py`: Bayes theoretical cutoffs, validation FPR tuning, Shingle-Jaccard deduplication.
- `test_leakage_safeguards.py`: All 6 automated leakage checks (duplicate cross-contamination, lookahead timestamp inversion, pre-split vectorizer fitting).
- `test_pipeline.py`: Full end-to-end execution of Protocol A and Protocol B.
- `test_api_integration.py`: Live HTTP API integration tests for health, SERC calculation, and inference.

---

## 7. Security Hardening

- **CSV Formula Injection Mitigation (CWE-1236)**: All exported CSV cells are passed through `sanitize_csv_cell()` to escape prefix characters (`=`, `+`, `-`, `@`, `\t`, `\r`) with single quotes.
- **Upload Protection**: File size validation capped at 50 MB, file extension verification, and safe filename extraction preventing directory traversal attacks.
- **Advisory Classification**: Classifier inference is explicitly sandboxed for diagnostic research; no automated email modification, forwarding, or deletion is performed.

---

## 8. License & Attribution

Designed and engineered for scientific evaluation of email spam filtering literature. When citing this benchmark or platform, refer to the accompanying paper:
*“Evaluating Feature Leakage and False-Alarm Costs With Experimental Reproducibility in Email Spam Classifiers Through the SERC-RCS Rubric”* (Attanti et al., 2026).
