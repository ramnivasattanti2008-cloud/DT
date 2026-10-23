"""
Near-Duplicate and Burst Deduplication Engine
Implements:
1. Exact string deduplication
2. Inverted-index Shingle-Jaccard near-duplicate deduplication
3. Full audit trail tracking: groups, retained original ID, purged copy IDs
"""

from typing import List, Dict, Set, Tuple, Any, Optional
import re
from dataclasses import dataclass, field
import pandas as pd


@dataclass
class DuplicateGroup:
    group_id: int
    original_id: Any
    duplicate_ids: List[Any]
    similarity_score: float
    representative_text: str


@dataclass
class DeduplicationReport:
    total_input_rows: int
    unique_rows_retained: int
    duplicates_removed: int
    duplicate_groups: List[DuplicateGroup]
    method: str
    threshold: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_input_rows": self.total_input_rows,
            "unique_rows_retained": self.unique_rows_retained,
            "duplicates_removed": self.duplicates_removed,
            "duplicate_groups": [
                {
                    "group_id": g.group_id,
                    "original_id": str(g.original_id),
                    "duplicate_ids": [str(x) for x in g.duplicate_ids],
                    "similarity_score": round(g.similarity_score, 4),
                    "representative_text": g.representative_text[:120] + "..." if len(g.representative_text) > 120 else g.representative_text,
                }
                for g in self.duplicate_groups
            ],
            "method": self.method,
            "threshold": self.threshold,
        }


def get_word_shingles(text: str, k: int = 2) -> Set[str]:
    """Generates k-word shingles from normalized text."""
    clean = re.sub(r"[^a-zA-Z0-9_\s]", " ", text.lower())
    words = clean.split()
    if len(words) < k:
        return set(words)
    return set(" ".join(words[i : i + k]) for i in range(len(words) - k + 1))


def jaccard_similarity(set_a: Set[str], set_b: Set[str]) -> float:
    """Computes Jaccard similarity between two sets."""
    if not set_a and not set_b:
        return 1.0
    if not set_a or not set_b:
        return 0.0
    intersection = len(set_a.intersection(set_b))
    union = len(set_a.union(set_b))
    return float(intersection / union) if union > 0 else 0.0


def deduplicate_dataframe(
    df: pd.DataFrame,
    text_col: str = "text",
    id_col: str = "id",
    timestamp_col: Optional[str] = "timestamp",
    threshold: float = 0.82,
    shingle_k: int = 3,
) -> Tuple[pd.DataFrame, DeduplicationReport]:
    """
    Purges exact and near-duplicate records using an inverted index and Shingle-Jaccard similarity.
    Optimized with candidate pre-filtering: shared_count / len(shingles_i) >= threshold.
    Sorts chronologically if timestamp_col is present, ensuring earliest original is retained.
    """
    total_input = len(df)
    if total_input == 0:
        return df.copy(), DeduplicationReport(0, 0, 0, [], "shingle_jaccard", threshold)

    work_df = df.copy()
    if id_col not in work_df.columns:
        work_df[id_col] = [f"ROW_{i}" for i in range(len(work_df))]

    if timestamp_col and timestamp_col in work_df.columns:
        try:
            work_df = work_df.sort_values(by=timestamp_col, ascending=True)
        except Exception:
            pass

    rows = work_df.to_dict("records")
    shingles_list = [get_word_shingles(str(r[text_col]), k=shingle_k) for r in rows]

    # Build inverted index, skipping high-frequency boilerplate shingles (> 5% of documents)
    max_doc_freq = max(50, int(total_input * 0.05))
    raw_inverted_index: Dict[str, List[int]] = {}
    for idx, s_set in enumerate(shingles_list):
        for shingle in s_set:
            if shingle not in raw_inverted_index:
                raw_inverted_index[shingle] = []
            raw_inverted_index[shingle].append(idx)

    # Filter out overly common boilerplate shingles
    inverted_index = {
        sh: idxs for sh, idxs in raw_inverted_index.items() if len(idxs) <= max_doc_freq
    }

    purged_indices: Set[int] = set()
    duplicate_groups: List[DuplicateGroup] = []
    group_counter = 1

    for i in range(len(rows)):
        if i in purged_indices:
            continue

        shingles_i = shingles_list[i]
        len_i = len(shingles_i)
        if len_i == 0:
            continue

        min_shared_needed = int(len_i * threshold)

        # Count shared shingles with forward candidates
        candidate_counts: Dict[int, int] = {}
        for sh in shingles_i:
            if sh in inverted_index:
                for cand in inverted_index[sh]:
                    if cand > i and cand not in purged_indices:
                        candidate_counts[cand] = candidate_counts.get(cand, 0) + 1

        dups_in_group: List[Any] = []
        max_sim = 0.0

        for cand, shared_count in candidate_counts.items():
            # Mathematical upper bound: |A ∩ B| / |A ∪ B| <= shared_count / len_i
            if shared_count < min_shared_needed:
                continue

            sim = jaccard_similarity(shingles_i, shingles_list[cand])
            if sim >= threshold:
                purged_indices.add(cand)
                dups_in_group.append(rows[cand][id_col])
                if sim > max_sim:
                    max_sim = sim

        if dups_in_group:
            duplicate_groups.append(
                DuplicateGroup(
                    group_id=group_counter,
                    original_id=rows[i][id_col],
                    duplicate_ids=dups_in_group,
                    similarity_score=max_sim,
                    representative_text=str(rows[i][text_col]),
                )
            )
            group_counter += 1

    clean_df = work_df.iloc[[idx for idx in range(len(rows)) if idx not in purged_indices]].copy()
    duplicates_removed = len(purged_indices)
    unique_retained = len(clean_df)

    report = DeduplicationReport(
        total_input_rows=total_input,
        unique_rows_retained=unique_retained,
        duplicates_removed=duplicates_removed,
        duplicate_groups=duplicate_groups,
        method="shingle_jaccard",
        threshold=threshold,
    )

    return clean_df, report
