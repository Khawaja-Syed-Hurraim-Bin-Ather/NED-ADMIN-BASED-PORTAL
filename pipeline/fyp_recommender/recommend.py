"""
Recommendation filtering, ranking, and query layer for FYP Recommender.
Enforces sorting (industry score desc, then stars desc), filtering, pagination, and limits.
"""

from typing import List, Dict, Any, Optional

def filter_and_rank(
    records: List[Dict[str, Any]],
    degree: Optional[str] = None,
    industry_ready: Optional[bool] = None,
    domain: Optional[str] = None,
    language: Optional[str] = None,
    min_score: int = 0,
    page: int = 1,
    page_size: int = 10,
    max_results: int = 50,
) -> Dict[str, Any]:
    """
    Applies filters, sorts by (industry_score DESC, stars DESC), and paginates.
    """
    filtered = []
    for r in records:
        if degree and degree.lower() != "all":
            if r.get("degree_tag", "").lower() != degree.lower():
                continue

        if industry_ready is not None:
            if bool(r.get("is_industry_ready")) != industry_ready:
                continue

        if domain and domain.lower() != "all":
            if r.get("domain", "").lower() != domain.lower():
                continue

        if language and language.lower() != "all":
            if (r.get("language") or "").lower() != language.lower():
                continue

        if r.get("industry_score", 0) < min_score:
            continue

        filtered.append(r)

    # Sort primarily by industry score descending, then by stars descending
    filtered.sort(key=lambda x: (x.get("industry_score", 0), x.get("stars", 0)), reverse=True)

    # Apply hard cap
    capped = filtered[:max_results]
    total_capped = len(capped)

    # Paginate
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    page_items = capped[start_idx:end_idx]

    message = ""
    if total_capped == 0:
        message = "No projects found matching the specified criteria. Try lowering the minimum score or clearing filters."

    return {
        "items": page_items,
        "total": total_capped,
        "total_unfiltered": len(records),
        "page": page,
        "page_size": page_size,
        "has_next": end_idx < total_capped,
        "has_prev": page > 1,
        "message": message,
    }
