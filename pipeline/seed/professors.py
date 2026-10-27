"""
pipeline/seed/professors.py
===========================
Phase 2 Loader: Professor Profiles (Card M2)

Reads docs/data/professors/professors.json, validates with Pydantic,
then upserts into public.professors and public.professor_supervised_projects
via the Supabase REST API (no live scraping - Rule #1).

All records are inserted with review_status = 'extracted' (Rule #2).
Records with name_status other than 'confirmed' are inserted as 'flagged'.
No PII (names excepted - these are faculty who consented, D11) - no student
names, no roll numbers, no emails, no phone numbers (Rule #3).

Usage:
    python -m pipeline.seed.professors [--dry-run]
"""

import hashlib
import json
import os
import re
import sys
from pathlib import Path
from typing import Optional

from pydantic import BaseModel, field_validator, model_validator

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

VALID_REVIEW_STATUS = {"extracted", "flagged", "approved", "rejected", "published"}
VALID_NAME_STATUS = {"confirmed", "inferred", "partial", "missing"}
VALID_AREA_SOURCE = {"stated", "derived", "stated+derived"}

# Controlled domain vocabulary (must match pipeline/vocab/domains.json)
VALID_DOMAIN_TAGS = {
    "ai-ml", "computer-vision", "nlp", "web", "iot", "embedded",
    "cybersecurity", "data", "networks", "blockchain", "ar-vr",
    "healthcare-tech", "agriculture-tech", "fintech", "education-tech",
}
# Extended area tags (EDUCOMPASS_PROFESSOR_PROFILES.md Section 5)
VALID_AREA_TAGS = {
    "computer-architecture", "vlsi-hardware", "hpc-cloud", "optimization",
    "computational-biology", "software-engineering", "simulation",
    "remote-sensing", "compilers", "quantum", "education-tech",
}

# PII detection patterns (Rule #3) - these must NOT appear in any text field
_PII_PATTERNS = [
    re.compile(r'\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b', re.IGNORECASE),    # email
    re.compile(r'\b\d{5,20}\b'),                                        # roll numbers / phone
    re.compile(r'\+?92[-\s]?\d{3}[-\s]?\d{7}\b'),                     # PK phone
]


def _check_pii(value: str) -> None:
    """Raise ValueError if any PII pattern is found in value."""
    for pattern in _PII_PATTERNS:
        if pattern.search(value):
            raise ValueError(f"PII detected in field value: {value[:40]}...")


class ProfessorRecord(BaseModel):
    slug: str
    name: Optional[str]
    title: Optional[str]
    rank: Optional[str]
    name_status: str
    qualification: Optional[str]
    research_areas: Optional[str]
    research_areas_source: Optional[str]
    domain_tags: list[str]
    area_tags: list[str]
    highlights: Optional[str]
    selected_publications: list[str]
    fydp_supervised: list[str]
    postgraduate_projects: list[str]
    contact_route: None  # Must always be null in JSON (added by hand after consent)
    is_simulated: bool
    source: str
    review_status: str
    review_flags: list[str]

    @field_validator("name_status")
    @classmethod
    def valid_name_status(cls, v: str) -> str:
        if v not in VALID_NAME_STATUS:
            raise ValueError(f"Invalid name_status: {v!r}")
        return v

    @field_validator("research_areas_source")
    @classmethod
    def valid_area_source(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_AREA_SOURCE:
            raise ValueError(f"Invalid research_areas_source: {v!r}")
        return v

    @field_validator("domain_tags", mode="before")
    @classmethod
    def valid_domain_tags(cls, v: list) -> list:
        for tag in v:
            if tag not in VALID_DOMAIN_TAGS:
                raise ValueError(f"Unknown domain_tag: {tag!r} — add to pipeline/vocab/domains.json or professors.json area_tags")
        return v

    @field_validator("area_tags", mode="before")
    @classmethod
    def valid_area_tags(cls, v: list) -> list:
        for tag in v:
            if tag not in VALID_AREA_TAGS:
                raise ValueError(f"Unknown area_tag: {tag!r} — add to VALID_AREA_TAGS in professors.py")
        return v

    @field_validator("contact_route")
    @classmethod
    def contact_must_be_null(cls, v) -> None:
        if v is not None:
            raise ValueError("contact_route must be null — add by hand after consent")
        return v

    @field_validator("is_simulated")
    @classmethod
    def must_not_be_simulated(cls, v: bool) -> bool:
        if v:
            raise ValueError("is_simulated must be false for real faculty data")
        return v

    @model_validator(mode="after")
    def check_pii_in_text_fields(self) -> "ProfessorRecord":
        """Scan all text fields for PII patterns."""
        text_fields = [
            self.name, self.qualification, self.research_areas,
            self.highlights, *(self.selected_publications),
            *(self.fydp_supervised), *(self.postgraduate_projects),
        ]
        for field_val in text_fields:
            if field_val:
                _check_pii(field_val)
        return self

    def natural_key(self) -> str:
        return hashlib.sha1(f"professor:{self.slug}".encode()).hexdigest()

    def effective_review_status(self) -> str:
        """
        Records with name_status != 'confirmed' load as 'flagged' (ingestion guide step 3).
        Records with any review_flags also load as 'flagged'.
        """
        if self.name_status != "confirmed" or self.review_flags:
            return "flagged"
        return "extracted"


# ---------------------------------------------------------------------------
# Supabase REST client (same pattern as pipeline/core/loader.py)
# ---------------------------------------------------------------------------

class SupabaseRestClient:
    def __init__(self, url: str, service_key: str):
        import urllib.request
        self._url = url.rstrip("/")
        self._key = service_key
        self._urllib = urllib.request

    def _request(self, method: str, path: str, body: dict | list | None = None) -> tuple[int, dict | list]:
        import json as _json
        import urllib.error
        url = f"{self._url}/rest/v1/{path}"
        data = _json.dumps(body).encode() if body is not None else None
        headers = {
            "apikey": self._key,
            "Authorization": f"Bearer {self._key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation,resolution=merge-duplicates",
        }
        req = self._urllib.Request(url, data=data, headers=headers, method=method)
        try:
            with self._urllib.urlopen(req, timeout=30) as resp:
                return resp.status, _json.loads(resp.read())
        except urllib.error.HTTPError as e:
            body_text = e.read().decode()
            raise RuntimeError(f"HTTP {e.code} {method} {path}: {body_text}") from e

    def upsert(self, table: str, row: dict, on_conflict: str = "slug") -> dict:
        status, result = self._request(
            "POST",
            f"{table}?on_conflict={on_conflict}",
            row,
        )
        if status not in (200, 201):
            raise RuntimeError(f"Upsert failed on {table}: status={status} result={result}")
        if isinstance(result, list):
            return result[0] if result else {}
        return result

    def select(self, table: str, filter_str: str) -> list:
        _, result = self._request("GET", f"{table}?{filter_str}")
        return result if isinstance(result, list) else []


# ---------------------------------------------------------------------------
# Main loader
# ---------------------------------------------------------------------------

def load_professors(dry_run: bool = False) -> None:
    root = Path(__file__).parent.parent.parent
    json_path = root / "docs" / "data" / "professors" / "professors.json"
    env_path = root / "apps" / "api" / ".env.local"

    # Load env
    env: dict[str, str] = {}
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if "=" in line and not line.startswith("#"):
                k, _, v = line.partition("=")
                env[k.strip()] = v.strip().strip('"').strip("'")

    supabase_url = env.get("SUPABASE_URL") or os.environ.get("SUPABASE_URL", "")
    service_key = env.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

    if not supabase_url or not service_key:
        print("⚠️  SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required. Set in apps/api/.env.local or environment.")
        sys.exit(1)

    raw = json.loads(json_path.read_text(encoding="utf-8"))
    professors_raw: list[dict] = raw.get("professors", [])

    print(f"📖 Found {len(professors_raw)} professor records in {json_path.name}")

    client = SupabaseRestClient(supabase_url, service_key) if not dry_run else None

    inserted = 0
    skipped_missing = 0
    flagged = 0
    errors: list[str] = []

    for raw_prof in professors_raw:
        try:
            prof = ProfessorRecord.model_validate(raw_prof)
        except Exception as exc:
            errors.append(f"  ✗ Validation error for slug={raw_prof.get('slug','?')}: {exc}")
            continue

        # Step 3: records with name_status='missing' load as flagged but a warning is shown
        if prof.name_status == "missing":
            skipped_missing += 1
            print(f"  ⚠️  MISSING name — will load as flagged (DO NOT PUBLISH): slug={prof.slug}")

        eff_status = prof.effective_review_status()
        if eff_status == "flagged":
            flagged += 1

        professor_row = {
            "slug": prof.slug,
            "name": prof.name or f"[Name needed — {prof.rank or 'Faculty'}]",
            "title": prof.title,
            "rank": prof.rank,
            "department": "Computer & Information Systems Engineering",
            "research_areas": [a.strip() for a in (prof.research_areas or "").split(";") if a.strip()],
            "research_areas_source": prof.research_areas_source,
            "domain_tags": prof.domain_tags,
            "area_tags": prof.area_tags,
            "qualification": prof.qualification,
            "highlights": prof.highlights,
            "selected_publications": prof.selected_publications,
            "contact_route": None,
            "is_simulated": prof.is_simulated,
            "name_status": prof.name_status,
            "review_status": eff_status,
            "source": prof.source,
            "consent_note": raw.get("consent_note"),
        }

        if dry_run:
            print(f"  [DRY-RUN] Would upsert professor: {prof.slug} → status={eff_status}")
            inserted += 1
            continue

        # Upsert professor row
        assert client is not None
        upserted = client.upsert("professors", professor_row, on_conflict="slug")
        professor_id = upserted.get("id")
        if not professor_id:
            errors.append(f"  ✗ No id returned for slug={prof.slug}")
            continue

        # Insert supervised project titles
        project_rows = [
            {"professor_id": professor_id, "title": t, "kind": "fydp"}
            for t in prof.fydp_supervised
        ] + [
            {"professor_id": professor_id, "title": t, "kind": "postgraduate"}
            for t in prof.postgraduate_projects
        ]

        for prow in project_rows:
            try:
                client.upsert(
                    "professor_supervised_projects",
                    prow,
                    on_conflict="professor_id,title",
                )
            except RuntimeError as e:
                print(f"    ⚠️  Supervised project upsert failed ({prow['title'][:40]}): {e}")

        # Log review flags as ingestion_record
        flag_text = "; ".join(prof.review_flags) if prof.review_flags else None
        ingestion_row = {
            "entity_type": "professor",
            "payload": professor_row,
            "status": eff_status,
        }
        if flag_text:
            ingestion_row["review_notes"] = flag_text

        client.upsert("ingestion_records", ingestion_row, on_conflict="entity_type")

        inserted += 1
        flag_note = f" [{len(prof.review_flags)} flags]" if prof.review_flags else ""
        print(f"  ✓ {prof.slug} → {eff_status}{flag_note}")

    print()
    print(f"{'[DRY-RUN] ' if dry_run else ''}Summary: {inserted} upserted, {skipped_missing} missing-name (flagged), {flagged} total flagged, {len(errors)} errors")
    if errors:
        print("\nErrors:")
        for e in errors:
            print(e)
        sys.exit(1)


if __name__ == "__main__":
    dry = "--dry-run" in sys.argv
    load_professors(dry_run=dry)
