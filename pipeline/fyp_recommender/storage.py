"""
Storage module for EduCompass FYP Recommender.
Provides CSV export, JSON caching, cache age detection, and optional Supabase sync.
"""

import os
import csv
import json
import time
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

DEFAULT_DATA_DIR = Path("pipeline/data")
WEB_DATA_DIR = Path("apps/web/public/data")

def ensure_directories():
    DEFAULT_DATA_DIR.mkdir(parents=True, exist_ok=True)
    WEB_DATA_DIR.mkdir(parents=True, exist_ok=True)

def is_cache_fresh(file_path: Path, max_days: int = 7) -> bool:
    """Checks if a cache file exists and was modified within max_days."""
    if not file_path.exists():
        return False
    mtime = file_path.stat().st_mtime
    age_seconds = time.time() - mtime
    return age_seconds <= (max_days * 86400)

def save_to_json(records: List[Dict[str, Any]], path: Optional[Path] = None) -> Path:
    ensure_directories()
    out_path = path or (DEFAULT_DATA_DIR / "fyp_recommendations.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2, ensure_ascii=False)
    
    # Also sync to web public data directory so frontend has immediate access
    web_path = WEB_DATA_DIR / "fyp_recommendations.json"
    try:
        with open(web_path, "w", encoding="utf-8") as f:
            json.dump(records, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"[Storage] Warning: Failed to copy to web dir: {e}")
        
    return out_path

def save_to_csv(records: List[Dict[str, Any]], path: Optional[Path] = None) -> Path:
    ensure_directories()
    out_path = path or (DEFAULT_DATA_DIR / "fyp_recommendations.csv")
    if not records:
        return out_path

    fieldnames = [
        "id", "full_name", "name", "owner", "html_url", "description",
        "stars", "forks", "language", "pushed_at", "license", "topics",
        "degree_tag", "cs_hits", "cse_hits", "domain",
        "industry_score", "is_industry_ready", "industry_label",
        "readme_excerpt"
    ]

    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for r in records:
            row = dict(r)
            if isinstance(row.get("topics"), list):
                row["topics"] = ", ".join(row["topics"])
            writer.writerow(row)

    return out_path

def load_from_json(path: Optional[Path] = None) -> List[Dict[str, Any]]:
    target = path or (DEFAULT_DATA_DIR / "fyp_recommendations.json")
    if not target.exists():
        target = WEB_DATA_DIR / "fyp_recommendations.json"
    if not target.exists():
        return []
    with open(target, "r", encoding="utf-8") as f:
        return json.load(f)
