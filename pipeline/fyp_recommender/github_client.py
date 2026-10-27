"""
GitHub API client for EduCompass FYP Recommender.
Reads token from environment / .env, handles rate limits, pagination, and README decoding.
"""

import os
import sys
import time
import json
import base64
import ssl
import urllib.request
import urllib.error
from pathlib import Path
from typing import Optional, Dict, Any, List

def _load_env_if_needed():
    """Fallback to load GITHUB_TOKEN from known .env locations if not present in os.environ."""
    if os.environ.get("GITHUB_TOKEN"):
        return
    for p in [Path(".env"), Path(".secrets/env.master"), Path("apps/web/.env.local"), Path("../.env")]:
        if p.exists():
            for line in p.read_text(encoding="utf-8", errors="ignore").splitlines():
                line = line.strip()
                if line.startswith("GITHUB_TOKEN="):
                    val = line.split("=", 1)[1].strip().strip('"').strip("'")
                    os.environ["GITHUB_TOKEN"] = val
                    return

class GitHubClient:
    BASE_URL = "https://api.github.com"

    def __init__(self, token: Optional[str] = None):
        _load_env_if_needed()
        self.token = token or os.environ.get("GITHUB_TOKEN")
        if not self.token:
            raise ValueError(
                "GITHUB_TOKEN is missing! Please configure it in your .env or environment variables."
            )
        self.ssl_ctx = ssl.create_default_context()

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/vnd.github+json",
            "User-Agent": "EduCompass-FYP-Recommender/1.0",
        }

    def _request(self, endpoint: str, params: Optional[Dict[str, Any]] = None, retries: int = 3) -> Optional[Dict[str, Any]]:
        url = endpoint if endpoint.startswith("http") else f"{self.BASE_URL}{endpoint}"
        if params:
            query = urllib.parse.urlencode(params)
            url = f"{url}?{query}"

        for attempt in range(retries):
            req = urllib.request.Request(url, headers=self._headers())
            try:
                with urllib.request.urlopen(req, context=self.ssl_ctx, timeout=15) as resp:
                    # Check rate limits
                    remaining = resp.headers.get("X-RateLimit-Remaining")
                    if remaining and int(remaining) < 5:
                        reset_ts = resp.headers.get("X-RateLimit-Reset")
                        wait_sec = max(1, int(reset_ts) - int(time.time())) if reset_ts else 10
                        print(f"[GitHubClient] Approaching rate limit (remaining={remaining}). Waiting {wait_sec}s...")
                        time.sleep(min(wait_sec, 60))
                    
                    data = resp.read().decode("utf-8")
                    return json.loads(data) if data else {}
            except urllib.error.HTTPError as e:
                if e.code == 404:
                    # e.g., No README found
                    return None
                elif e.code in (403, 429):
                    reset_ts = e.headers.get("X-RateLimit-Reset")
                    wait_sec = max(5, int(reset_ts) - int(time.time())) if reset_ts else 30
                    print(f"[GitHubClient] Rate limit or access issue (HTTP {e.code}). Attempt {attempt+1}/{retries}, waiting {wait_sec}s...")
                    time.sleep(min(wait_sec, 60))
                elif e.code == 422:
                    # e.g., pagination beyond 1000 limit
                    print(f"[GitHubClient] HTTP 422 Unprocessable Entity (e.g. pagination limit): {url}")
                    return None
                else:
                    if attempt == retries - 1:
                        print(f"[GitHubClient] HTTP {e.code} error on {url}: {e}")
                        return None
                    time.sleep(2)
            except Exception as e:
                if attempt == retries - 1:
                    print(f"[GitHubClient] Request failed for {url}: {e}")
                    return None
                time.sleep(2)
        return None

    def check_rate_limit(self) -> Dict[str, Any]:
        """Check rate limit status."""
        data = self._request("/rate_limit") or {}
        return data.get("resources", {})

    def search_repositories(
        self,
        topic: str,
        min_stars: int = 4,
        allow_forks: bool = True,
        exclude_archived: bool = True,
        per_page: int = 50,
        page: int = 1,
    ) -> List[Dict[str, Any]]:
        """Search repos by topic and basic filter queries."""
        query_parts = [f"topic:{topic}"]
        if min_stars > 0:
            query_parts.append(f"stars:>={min_stars}")
        if not allow_forks:
            query_parts.append("fork:false")
        if exclude_archived:
            query_parts.append("archived:false")

        q = " ".join(query_parts)
        params = {
            "q": q,
            "sort": "stars",
            "order": "desc",
            "per_page": min(per_page, 100),
            "page": page,
        }

        # Add brief delay to respect 30 req/min search rate limit
        time.sleep(1.0)
        res = self._request("/search/repositories", params=params)
        if not res:
            return []
        return res.get("items", [])

    def get_readme_content(self, owner: str, repo: str) -> Optional[str]:
        """Fetch and decode README content for a repository."""
        data = self._request(f"/repos/{owner}/{repo}/readme")
        if not data:
            return None
        content_b64 = data.get("content")
        if not content_b64:
            return None
        try:
            raw_bytes = base64.b64decode(content_b64)
            return raw_bytes.decode("utf-8", errors="replace")
        except Exception as e:
            print(f"[GitHubClient] Error decoding README for {owner}/{repo}: {e}")
            return None
