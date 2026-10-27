"""
Scoring and tagging module for EduCompass FYP Recommender.
Implements word-boundary keyword matching for CS/CSE degree tagging,
domain classification, and multi-signal 0-10 industry readiness scoring.
"""

import re
from datetime import datetime, timezone
from typing import Dict, Any, List, Tuple

def _count_keyword_hits(text: str, keywords: List[str]) -> Tuple[int, List[str]]:
    """Count how many keywords match as whole words/phrases in the given text."""
    if not text:
        return 0, []
    text_lower = text.lower()
    matches = []
    for kw in keywords:
        kw_clean = kw.strip().lower()
        if not kw_clean:
            continue
        # Escape for regex and allow multi-word phrases with word boundaries
        pattern = r"\b" + re.escape(kw_clean) + r"\b"
        if re.search(pattern, text_lower):
            matches.append(kw_clean)
    return len(matches), matches

def tag_degree(text: str, cse_keywords: List[str], cs_keywords: List[str]) -> Dict[str, Any]:
    """
    Tags a project as CSE, CS, or General based on word-boundary keyword hits.
    - CSE if cse_hits > cs_hits
    - CS if cs_hits >= 1 and cse_hits <= cs_hits
    - General otherwise
    """
    cse_hits, cse_matches = _count_keyword_hits(text, cse_keywords)
    cs_hits, cs_matches = _count_keyword_hits(text, cs_keywords)

    if cse_hits > cs_hits:
        degree_tag = "CSE"
    elif cs_hits >= 1 and cse_hits <= cs_hits:
        degree_tag = "CS"
    else:
        degree_tag = "General"

    return {
        "degree_tag": degree_tag,
        "cs_hits": cs_hits,
        "cse_hits": cse_hits,
        "cs_matches": cs_matches,
        "cse_matches": cse_matches,
    }

def tag_domain(text: str, domain_config: Dict[str, List[str]]) -> str:
    """Classify project into dominant domain based on keyword frequency."""
    best_domain = "general"
    max_hits = 0

    for domain_name, kw_list in domain_config.items():
        hits, _ = _count_keyword_hits(text, kw_list)
        if hits > max_hits:
            max_hits = hits
            best_domain = domain_name

    return best_domain

def compute_industry_score(
    repo_data: Dict[str, Any],
    readme_text: str,
    signals_config: Dict[str, List[str]],
    threshold: int = 6
) -> Dict[str, Any]:
    """
    Computes 0-10 industry readiness score and individual signal flags.
    Points breakdown:
    1. Stars >= 10 (+1)
    2. Forks >= 3 (+1)
    3. Updated within 12 months (+1)
    4. README length >= 1500 chars (+1)
    5. Has license (+1)
    6. Mentions Docker (+1)
    7. Mentions tests (+1)
    8. Mentions CI/CD (+1)
    9. Mentions deployment / demo (+1)
    10. Mentions auth or DB (+1)
    """
    stars = repo_data.get("stargazers_count", 0) or 0
    forks = repo_data.get("forks_count", 0) or 0
    has_license = bool(repo_data.get("license"))
    
    # Check recency (updated within 12 months)
    pushed_at_str = repo_data.get("pushed_at") or repo_data.get("updated_at")
    recent_update = False
    if pushed_at_str:
        try:
            # e.g. 2024-05-10T12:00:00Z
            pushed_dt = datetime.fromisoformat(pushed_at_str.replace("Z", "+00:00"))
            now_dt = datetime.now(timezone.utc)
            days_diff = (now_dt - pushed_dt).days
            recent_update = (days_diff <= 365)
        except Exception:
            recent_update = False

    readme = readme_text or ""
    readme_len = len(readme)

    # Keyword signal checks in README
    docker_hits, _ = _count_keyword_hits(readme, signals_config.get("docker", []))
    tests_hits, _ = _count_keyword_hits(readme, signals_config.get("tests", []))
    ci_hits, _ = _count_keyword_hits(readme, signals_config.get("ci_cd", []))
    deploy_hits, _ = _count_keyword_hits(readme, signals_config.get("deployment", []))
    auth_db_hits, _ = _count_keyword_hits(readme, signals_config.get("auth_db", []))

    signals = {
        "sig_stars_10": stars >= 10,
        "sig_forks_3": forks >= 3,
        "sig_recent_update": recent_update,
        "sig_readme_length": readme_len >= 1500,
        "sig_has_license": has_license,
        "sig_docker": docker_hits > 0,
        "sig_tests": tests_hits > 0,
        "sig_ci_cd": ci_hits > 0,
        "sig_deployment": deploy_hits > 0,
        "sig_auth_db": auth_db_hits > 0,
    }

    score = sum(1 for val in signals.values() if val)
    is_industry_ready = (score >= threshold)

    return {
        "industry_score": score,
        "is_industry_ready": is_industry_ready,
        "industry_label": "Yes" if is_industry_ready else "No",
        "signals": signals,
    }
