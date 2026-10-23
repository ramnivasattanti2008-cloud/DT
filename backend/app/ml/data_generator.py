"""
Synthetic Benchmark Corpus Generator (6,000 Dated Email Records)
Faithfully implements the structural specifications of the research paper:
- 6,000 dated email records (2023-01-01 to 2023-12-31)
- 3,600 Ham (60.0%) and 2,400 Spam (40.0%)
- 480 near-duplicate burst copies (288 spam copies + 192 forwarded memo copies from 60 templates)
- 6% Hard-Ham commercial newsletters & billing receipts with heavy retail lexical overlap
- Q4 concept-drift phishing waves (DocuSign, SharePoint, MFA push, QR code verification)
Explicitly marked as SYNTHETIC DEMONSTRATION DATA per the engineering directive.
"""

from typing import List, Dict, Any, Tuple
import datetime
import random
import pandas as pd


# Vocabulary banks based on the research paper
CORP_HAM_TOKENS = [
    "quarterly", "forecast", "pipeline", "spreadsheet", "allocation", "engineering",
    "deployment", "board", "agenda", "compliance", "memorandum", "maintenance",
    "logistics", "minutes", "committee", "payroll", "colleague", "milestone",
    "schedule", "deadline", "vendor", "reconciliation", "workshop", "seminar"
]

ENRON_STYLE_HAM_TOKENS = [
    "houston_desk", "dynegy_merger", "bammel_storage", "vince_kaminski", "ect_corp",
    "caiso_tariff", "enron_north_america", "ferc_filing", "sitara_deal", "farmer_daren",
    "gas_scheduling", "louise_kitchen"
]

HARD_HAM_TOKENS = [
    "monthly", "customer", "billing", "statement", "free", "webinar", "registration",
    "confirm", "account", "notification", "preferences", "click", "href_link",
    "html_table", "discount", "offer", "subscribe", "receipt", "voucher", "rewards"
]

RETAIL_SPAM_TOKENS = [
    "urgent", "winner", "guaranteed", "cash", "prize", "claim", "million", "dollars",
    "lottery", "beneficiary", "wire_transfer", "viagra", "cialis", "cheap",
    "pharmacy", "pills", "medications", "jackpot", "refinance", "mortgage", "rolex", "replica"
]

Q4_DRIFT_SPAM_TOKENS = [
    "docusign_envelope", "sharepoint_shared", "action_required", "mfa_push_token",
    "qr_code_verify", "remittance_advice_pdf", "ach_settlement", "reauthenticate_session",
    "zero_trust_gateway", "compliance_portal", "cloud_identity", "security_advisory"
]


def generate_synthetic_email_corpus(seed: int = 42) -> pd.DataFrame:
    """
    Generates the reproducible 6,000-email benchmark dataset.
    Returns DataFrame with columns:
        [id, timestamp, subject, body, text, label, is_duplicate, duplicate_template_id, category, is_synthetic]
    """
    rng = random.Random(seed)
    start_date = datetime.datetime(2023, 1, 1, 8, 0, 0)
    end_date = datetime.datetime(2023, 12, 31, 20, 0, 0)
    total_seconds = int((end_date - start_date).total_seconds())

    # We need 6,000 total records:
    # 5,520 unique messages + 480 duplicate copies
    # Target class distribution across 6,000: 2,400 spam (40.0%), 3,600 ham (60.0%)
    # Duplicate distribution: 288 spam copies + 192 ham copies = 480 copies
    # Therefore, unique pool must have:
    # 2,400 - 288 = 2,112 unique spam messages
    # 3,600 - 192 = 3,408 unique ham messages
    # Total unique = 2,112 + 3,408 = 5,520 unique messages

    records: List[Dict[str, Any]] = []

    # 1. Generate 3,408 unique ham messages
    for i in range(3408):
        # 6% of ham are hard-ham commercial HTML newsletters
        is_hard_ham = (i < int(3408 * 0.06))
        if is_hard_ham:
            selected_tokens = rng.sample(HARD_HAM_TOKENS, k=rng.randint(6, 10))
            selected_tokens += rng.sample(CORP_HAM_TOKENS, k=rng.randint(2, 4))
            subj = f"Monthly Account Notification: {' '.join(selected_tokens[:3])}"
            category = "hard_ham"
        else:
            selected_tokens = rng.sample(CORP_HAM_TOKENS, k=rng.randint(6, 11))
            if rng.random() < 0.25:
                selected_tokens += rng.sample(ENRON_STYLE_HAM_TOKENS, k=rng.randint(1, 3))
            subj = f"Corporate Update: {' '.join(selected_tokens[:3])}"
            category = "standard_ham"

        body = f"Please be advised regarding {' '.join(selected_tokens)}. Contact the team for further details."
        text = f"Subject: {subj} | Body: {body}"
        ts = start_date + datetime.timedelta(seconds=rng.randint(0, total_seconds))

        records.append({
            "id": f"MSG_{len(records)+1:05d}",
            "timestamp": ts,
            "subject": subj,
            "body": body,
            "text": text,
            "label": "ham",
            "is_duplicate": False,
            "duplicate_template_id": None,
            "category": category,
            "is_synthetic": True,
        })

    # 2. Generate 2,112 unique spam messages
    # In Q4 (final 20% by time), 18% of spam switch to cloud phishing / concept drift
    q4_cutoff_seconds = int(total_seconds * 0.80)

    for i in range(2112):
        rel_time = rng.randint(0, total_seconds)
        ts = start_date + datetime.timedelta(seconds=rel_time)
        is_q4 = (rel_time >= q4_cutoff_seconds)

        if is_q4 and (rng.random() < 0.35):
            # Q4 Concept Drift phishing
            tokens = rng.sample(Q4_DRIFT_SPAM_TOKENS, k=rng.randint(4, 7))
            tokens += rng.sample(CORP_HAM_TOKENS, k=rng.randint(3, 5))  # padded with normal office words
            subj = f"URGENT: {' '.join(tokens[:2])}"
            category = "q4_drift_phishing"
        else:
            # Standard retail spam
            tokens = rng.sample(RETAIL_SPAM_TOKENS, k=rng.randint(6, 10))
            subj = f"Exclusive Announcement: {' '.join(tokens[:2])}"
            category = "retail_spam"

        body = f"Important notification regarding {' '.join(tokens)}. Take immediate action by accessing details."
        text = f"Subject: {subj} | Body: {body}"

        records.append({
            "id": f"MSG_{len(records)+1:05d}",
            "timestamp": ts,
            "subject": subj,
            "body": body,
            "text": text,
            "label": "spam",
            "is_duplicate": False,
            "duplicate_template_id": None,
            "category": category,
            "is_synthetic": True,
        })

    # 3. Create 60 duplicate templates and 480 duplicate burst copies:
    # 288 spam copies and 192 forwarded ham copies
    # Pick 36 spam templates and 24 ham templates (total 60 templates)
    # 288 / 36 = 8 copies per spam template
    # 192 / 24 = 8 copies per ham template
    spam_templates = rng.sample([r for r in records if r["label"] == "spam"], 36)
    ham_templates = rng.sample([r for r in records if r["label"] == "ham"], 24)

    template_idx = 1
    # Generate spam copies
    for tmpl in spam_templates:
        tmpl_id = f"TPL_SPAM_{template_idx:02d}"
        tmpl["duplicate_template_id"] = tmpl_id  # Mark original template
        template_idx += 1
        for c in range(8):
            # Burst copies sent shortly after original or throughout timeline
            copy_ts = tmpl["timestamp"] + datetime.timedelta(minutes=rng.randint(5, 7200))
            # Minor surface noise (near-duplicate)
            copy_body = tmpl["body"] + f" [Ref-{rng.randint(100, 999)}]"
            copy_text = f"Subject: {tmpl['subject']} | Body: {copy_body}"
            records.append({
                "id": f"MSG_{len(records)+1:05d}",
                "timestamp": copy_ts,
                "subject": tmpl["subject"],
                "body": copy_body,
                "text": copy_text,
                "label": "spam",
                "is_duplicate": True,
                "duplicate_template_id": tmpl_id,
                "category": tmpl["category"],
                "is_synthetic": True,
            })

    # Generate ham forwarded memo copies
    for tmpl in ham_templates:
        tmpl_id = f"TPL_HAM_{template_idx:02d}"
        tmpl["duplicate_template_id"] = tmpl_id
        template_idx += 1
        for c in range(8):
            copy_ts = tmpl["timestamp"] + datetime.timedelta(minutes=rng.randint(10, 10000))
            copy_body = f"FWD: {tmpl['body']} [Forwarded by Admin]"
            copy_text = f"Subject: FWD: {tmpl['subject']} | Body: {copy_body}"
            records.append({
                "id": f"MSG_{len(records)+1:05d}",
                "timestamp": copy_ts,
                "subject": f"FWD: {tmpl['subject']}",
                "body": copy_body,
                "text": copy_text,
                "label": "ham",
                "is_duplicate": True,
                "duplicate_template_id": tmpl_id,
                "category": tmpl["category"],
                "is_synthetic": True,
            })

    df = pd.DataFrame(records)
    # Sort chronologically by timestamp
    df = df.sort_values(by="timestamp").reset_index(drop=True)
    # Re-assign sequential IDs to maintain clean order
    df["id"] = [f"MSG_{i+1:05d}" for i in range(len(df))]
    return df
