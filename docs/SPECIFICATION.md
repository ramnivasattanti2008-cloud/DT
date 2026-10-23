# SERC-RCS RESEARCH LAB: SPECIFICATION & ARCHITECTURE

## 1. Research Grounding & Domain Extraction

From the audited manuscript (*"Auditing Split-Point Leakage, False-Alarm Penalties, and Reporting Gaps in Machine Learning Mail Filters via the SERC-RCS Benchmark"*, Attanti, Shreya, & Sarwar):

### Core Equations:
1. **Multinomial Naive Bayes smoothed token likelihood**:
   $$Pr(x_j \mid c) = \frac{\text{count}(j, c) + \alpha}{\text{total\_count}(c) + \alpha \cdot V}$$
   with Laplace smoothing $\alpha = 0.15$ and log-odds scaling.

2. **Linear SVM with Platt Scaling**:
   Primal L2-squared hinge loss with penalty $C = 1.0$:
   $$Pr(\text{spam} \mid x) = \frac{1}{1 + \exp(-(A \cdot f(x) + B))}$$
   Fitted via cross-validation strictly on training data (no test set leakage).

3. **L2 Logistic Regression**:
   $$Pr(\text{spam} \mid x) = \sigma(w^T x + b) = \frac{1}{1 + \exp(-(w^T x + b))}$$
   Regularization parameter $C = 2.2$.

4. **Random Forest**:
   $B = 100$ trees, feature subsampling ratio $m_{\text{try}} = 0.38$, explicit random seed = 42.

5. **Confusion Matrix & Basic Metrics**:
   - TP: Spam correctly classified as spam
   - TN: Legitimate mail correctly classified as legitimate
   - FP: Legitimate mail incorrectly quarantined as spam (False Alarm)
   - FN: Spam missed by filter
   - $\text{Accuracy} = \frac{TP + TN}{TP + TN + FP + FN}$
   - $\text{Precision} = \frac{TP}{TP + FP}$
   - $\text{Recall} = \frac{TP}{TP + FN}$
   - $F_1 = \frac{2 \cdot TP}{2 \cdot TP + FP + FN}$
   - $\text{FPR} = \frac{FP}{FP + TN}$
   - $\text{FNR} = \frac{FN}{FN + TP}$
   - $\text{Specificity} = \frac{TN}{TN + FP} = 1 - \text{FPR}$
   - $\text{MCC} = \frac{TP \cdot TN - FP \cdot FN}{\sqrt{(TP + FP)(TP + FN)(TN + FP)(TN + FN)}}$

6. **Cost-Sensitive Metrics**:
   - Cost-Weighted Accuracy:
     $$\text{WAcc}(\lambda) = \frac{TP + \lambda \cdot TN}{TP + FN + \lambda \cdot (TN + FP)}$$
   - Total Cost Ratio:
     $$\text{TCR}(\lambda) = \frac{TP + FN}{\lambda \cdot FP + FN} = \frac{N_{\text{spam}}}{\lambda \cdot FP + FN}$$
     Benchmark values: $\lambda = 9$, $\lambda = 99$, $\lambda = 999$.
     A filter with $\text{TCR} < 1.0$ is operationally worse than no filter.

7. **Bayes Theoretical Cutoff vs Empirical Threshold**:
   $$\tau^*(\lambda) = \frac{\lambda}{\lambda + 1}$$
   - For $\lambda = 9$, $\tau^* = 0.9000$.
   - For $\lambda = 99$, $\tau^* = 0.9900$.
   - Validation-selected threshold: threshold $\tau^*$ calibrated on validation split to guarantee $\text{FPR} \le \text{target}$ (e.g. $0.35\%$).

8. **SERC Checklist (10 Items)**:
   - C1: Dataset Priors & Deduplication
   - C2: Train-Only Preprocessing
   - C3: Split Design (Chronological vs Random)
   - C4: Model Settings (Hyperparameters, V cap)
   - C5: Imbalance Metrics (F1, MCC, AUC)
   - C6: Explicit False Alarms (FPR, full matrix)
   - C7: Cost Cutoff Tuning ($\tau^*$, $\lambda$, TCR)
   - C8: Drift & Time Check (Chronological validation)
   - C9: Code & Environment Archive (Repo, seeds, versions)
   - C10: Scope & Limitations
   Grades: 1.0 (Full), 0.5 (Partial), 0.0 (Omitted), NA (Excluded from denominator).

9. **Reporting Completeness Score (RCS)**:
   $$\text{RCS} = 100 \times \frac{\sum_{i \in \text{Applicable}} g_i}{|\text{Applicable}|}$$
   - Tier A: 80–100%
   - Tier B: 60–79.9%
   - Tier C: 40–59.9%
   - Tier D: < 40%

10. **CARI Metric**:
    $$\text{CARI} = F_1 \times \max(0, 1 - \omega \cdot \text{FPR}) \times \left(0.50 + \frac{\text{RCS}}{200}\right)$$
    With default $\omega = 2.0$.

## 2. Platform Architecture
- **Backend**: FastAPI (Python 3.12)
- **Database**: SQLite (local zero-dependency self-contained) with SQLAlchemy 2.0
- **Frontend**: Next.js (React 19 / TypeScript / Tailwind CSS) with strict monochromatic design
- **Testing**: Pytest unit & integration tests, Jest/Vitest frontend component tests
