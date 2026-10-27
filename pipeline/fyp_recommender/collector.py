"""
Collector module for EduCompass FYP Recommender.
Orchestrates GitHub API search, deduplication, filtering, README fetching,
and scoring pipeline.
"""

import os
import sys
import yaml
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from pipeline.fyp_recommender.github_client import GitHubClient
from pipeline.fyp_recommender.scoring import (
    tag_degree,
    tag_domain,
    compute_industry_score,
)

def load_config(config_path: Optional[str] = None) -> Dict[str, Any]:
    """Load configuration YAML."""
    if not config_path:
        config_path = str(Path(__file__).parent.parent / "config" / "fyp_config.yaml")
    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

class FYPCollector:
    def __init__(self, config: Optional[Dict[str, Any]] = None, client: Optional[GitHubClient] = None):
        self.config = config or load_config()
        self.client = client or GitHubClient()

    def _is_recently_updated(self, pushed_at_str: Optional[str], max_months: int = 36) -> bool:
        if not pushed_at_str:
            return False
        try:
            pushed_dt = datetime.fromisoformat(pushed_at_str.replace("Z", "+00:00"))
            now_dt = datetime.now(timezone.utc)
            days = (now_dt - pushed_dt).days
            return days <= (max_months * 30.5)
        except Exception:
            return False

    def collect(self, max_total: Optional[int] = None) -> List[Dict[str, Any]]:
        topics = self.config.get("topics", ["final-year-project", "fyp"])
        filters = self.config.get("filters", {})
        min_stars = filters.get("min_stars", 4)
        max_months = filters.get("max_months_since_update", 36)
        allow_forks = filters.get("allow_forks", True)
        exclude_archived = filters.get("exclude_archived", True)
        require_readme = filters.get("require_readme", True)

        fetch_per_topic = self.config.get("limits", {}).get("fetch_per_topic", 30)
        if max_total:
            fetch_per_topic = max(10, min(fetch_per_topic, max_total))

        cse_kw = self.config.get("keywords", {}).get("cse", [])
        cs_kw = self.config.get("keywords", {}).get("cs", [])
        domains_cfg = self.config.get("domains", {})
        signals_cfg = self.config.get("industry_signals", {})
        ind_threshold = self.config.get("scoring", {}).get("industry_ready_threshold", 6)

        seen_repos: Dict[str, Dict[str, Any]] = {}
        print(f"=== FYP Recommender Collection Starting ===")
        print(f" Topics: {topics}")
        print(f" Filters: min_stars={min_stars}, max_months={max_months}, allow_forks={allow_forks}, exclude_archived={exclude_archived}")

        # Phase 1: Search repositories across topics
        for topic in topics:
            print(f"\nSearching topic: '{topic}'...")
            items = self.client.search_repositories(
                topic=topic,
                min_stars=min_stars,
                allow_forks=allow_forks,
                exclude_archived=exclude_archived,
                per_page=fetch_per_topic,
                page=1,
            )
            print(f"  Found {len(items)} repos for topic '{topic}'.")
            for item in items:
                full_name = item.get("full_name")
                if not full_name:
                    continue
                if full_name not in seen_repos:
                    # Apply cheap pre-filters
                    if not self._is_recently_updated(item.get("pushed_at"), max_months):
                        continue
                    seen_repos[full_name] = item

                if max_total and len(seen_repos) >= max_total:
                    break
            if max_total and len(seen_repos) >= max_total:
                break

        print(f"\nTotal candidate repositories after deduplication & cheap filter: {len(seen_repos)}")

        # Phase 2: Fetch READMEs and compute scoring
        results: List[Dict[str, Any]] = []
        candidates = list(seen_repos.values())
        if max_total:
            candidates = candidates[:max_total]

        for idx, repo in enumerate(candidates, start=1):
            full_name = repo.get("full_name", "")
            owner = repo.get("owner", {}).get("login", "")
            repo_name = repo.get("name", "")

            print(f"[{idx}/{len(candidates)}] Processing {full_name}...", end=" ", flush=True)

            # Fetch README
            readme_text = self.client.get_readme_content(owner, repo_name)
            if require_readme and (not readme_text or not readme_text.strip()):
                print("SKIPPED (no README)")
                continue

            # Build full text for keyword matching (title + description + topics + readme)
            desc = repo.get("description") or ""
            topics_list = repo.get("topics") or []
            combined_text = f"{repo_name} {desc} {' '.join(topics_list)} {readme_text or ''}"

            # Scoring & Tagging
            degree_res = tag_degree(combined_text, cse_kw, cs_kw)
            domain = tag_domain(combined_text, domains_cfg)
            industry_res = compute_industry_score(repo, readme_text or "", signals_cfg, ind_threshold)

            license_info = repo.get("license") or {}
            license_name = license_info.get("spdx_id") or license_info.get("name") or None

            record = {
                "id": str(repo.get("id")),
                "full_name": full_name,
                "name": repo_name,
                "owner": owner,
                "html_url": repo.get("html_url"),
                "description": desc,
                "stars": repo.get("stargazers_count", 0),
                "forks": repo.get("forks_count", 0),
                "language": repo.get("language") or "Other",
                "pushed_at": repo.get("pushed_at"),
                "created_at": repo.get("created_at"),
                "license": license_name,
                "topics": topics_list,
                "degree_tag": degree_res["degree_tag"],
                "cs_hits": degree_res["cs_hits"],
                "cse_hits": degree_res["cse_hits"],
                "domain": domain,
                "industry_score": industry_res["industry_score"],
                "is_industry_ready": industry_res["is_industry_ready"],
                "industry_label": industry_res["industry_label"],
                "signals": industry_res["signals"],
                "readme_excerpt": (readme_text[:300].strip().replace("\n", " ") if readme_text else ""),
            }

            results.append(record)
            print(f"DONE -> {record['degree_tag']}, {record['domain']}, Score: {record['industry_score']}/10 ({record['industry_label']})")

        print(f"\n=== Completed Collection: {len(results)} valid enriched repositories ===")
        return results
