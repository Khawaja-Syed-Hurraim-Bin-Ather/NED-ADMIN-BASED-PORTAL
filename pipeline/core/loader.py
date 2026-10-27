"""
Card F4 Phase 2: FYP Data Loader
Idempotently loads extracted JSONL FYP records into Supabase PostgreSQL.
Enforces Non-negotiable Rule #2 (review_status = 'extracted'),
Non-negotiable Rule #6 (Privacy validation before load),
and logs audit trail to public.audit_log.
"""

import os
import json
import argparse
import urllib.request
import urllib.error
from pathlib import Path
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
from pipeline.core.privacy_validator import validate_record


@dataclass
class LoaderSummary:
    total_seen: int = 0
    staged: int = 0
    loaded: int = 0
    errors: int = 0
    error_details: List[str] = field(default_factory=list)


def load_env() -> None:
    """Load environment variables from .env if present."""
    env_path = Path('.env')
    if env_path.exists():
        for line in env_path.read_text(encoding='utf-8').splitlines():
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"\''))


class SupabaseRestClient:
    """Lightweight, zero-dependency REST client for Supabase PostgREST."""

    def __init__(self, url: str, service_role_key: str):
        self.base_url = url.rstrip('/')
        self.key = service_role_key

    def _headers(self, prefer: Optional[str] = None) -> Dict[str, str]:
        headers = {
            'apikey': self.key,
            'Authorization': f'Bearer {self.key}',
            'Content-Type': 'application/json',
        }
        if prefer:
            headers['Prefer'] = prefer
        return headers

    def upsert(
        self, table: str, records: List[Dict[str, Any]], on_conflict: str
    ) -> List[Dict[str, Any]]:
        endpoint = f"{self.base_url}/rest/v1/{table}?on_conflict={on_conflict}"
        headers = self._headers(prefer='return=representation,resolution=merge-duplicates')
        data = json.dumps(records).encode('utf-8')
        req = urllib.request.Request(endpoint, data=data, headers=headers, method='POST')

        try:
            with urllib.request.urlopen(req) as resp:
                body = resp.read().decode('utf-8')
                return json.loads(body) if body else []
        except urllib.error.HTTPError as e:
            err_msg = e.read().decode('utf-8')
            raise RuntimeError(f"HTTP {e.code} on upsert {table}: {err_msg}") from e

    def insert(self, table: str, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        endpoint = f"{self.base_url}/rest/v1/{table}"
        headers = self._headers(prefer='return=representation')
        data = json.dumps(records).encode('utf-8')
        req = urllib.request.Request(endpoint, data=data, headers=headers, method='POST')

        try:
            with urllib.request.urlopen(req) as resp:
                body = resp.read().decode('utf-8')
                return json.loads(body) if body else []
        except urllib.error.HTTPError as e:
            err_msg = e.read().decode('utf-8')
            raise RuntimeError(f"HTTP {e.code} on insert {table}: {err_msg}") from e

    def get_count(self, table: str) -> int:
        endpoint = f"{self.base_url}/rest/v1/{table}?select=count"
        headers = self._headers(prefer='count=exact')
        headers['Range-Unit'] = 'items'
        req = urllib.request.Request(endpoint, headers=headers, method='GET')

        try:
            with urllib.request.urlopen(req) as resp:
                cr = resp.headers.get('content-range', '')
                if '/' in cr:
                    total_str = cr.split('/')[1]
                    return int(total_str) if total_str.isdigit() else 0
                return 0
        except urllib.error.HTTPError as e:
            err_msg = e.read().decode('utf-8')
            raise RuntimeError(f"HTTP {e.code} on count {table}: {err_msg}") from e


def get_supabase_client() -> SupabaseRestClient:
    """Initialize Supabase REST client with service role key."""
    load_env()
    url = os.environ.get('NEXT_PUBLIC_SUPABASE_URL') or os.environ.get('SUPABASE_URL')
    key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

    if not url or not key:
        raise ValueError(
            'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment'
        )

    return SupabaseRestClient(url, key)


def prepare_fyp_payload(record: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transforms extracted record to public.fyp_projects row.
    Ensures strict typing, field naming, and review_status = 'extracted'.
    """
    natural_key = record.get('natural_key')
    if not natural_key:
        raise ValueError('Record is missing required field: natural_key')

    title = record.get('title', '').strip()
    if not title:
        raise ValueError('Record is missing required field: title')

    year = record.get('year')
    if not year:
        raise ValueError('Record is missing required field: year')

    # Allowed enum values
    outcome = record.get('proposal_outcome', 'accepted')
    if outcome not in ('accepted', 'rejected', 'unknown'):
        outcome = 'accepted'

    relevance = record.get('relevance', 'in_scope')
    if relevance not in ('in_scope', 'uncertain', 'out_of_scope'):
        relevance = 'in_scope'

    domain_tags = record.get('domain_tags', [])
    tools = record.get('tools', [])

    return {
        'natural_key': natural_key,
        'schema_version': record.get('schema_version', 'fyp.v2'),
        'title': title,
        'raw_title': record.get('raw_title', title),
        'year': int(year),
        'proposal_outcome': outcome,
        'outcome_reason': record.get('outcome_reason', ''),
        'outcome_evidence': record.get('outcome_evidence', ''),
        'relevance': relevance,
        'relevance_reason': record.get('relevance_reason', []),
        'supervisor': record.get('supervisor', ''),
        'supervisor_title': record.get('supervisor_title', ''),
        'co_supervisor': record.get('co_supervisor', ''),
        'program': record.get('program', ''),
        'department': record.get(
            'department', 'Computer & Information Systems Engineering'
        ),
        'university': record.get(
            'university', 'NED University of Engineering & Technology'
        ),
        'team_size': record.get('team_size'),
        'domain_tags': domain_tags,
        'tags': domain_tags,
        'tags_source': record.get('tags_source', 'derived'),
        'tools': tools,
        'source_file': record.get('source_file', ''),
        'source_page': record.get('source_page'),
        'raw_text_redacted': record.get('raw_text_redacted', ''),
        'confidence': float(record.get('confidence', 0.85)),
        'review_status': 'extracted',  # Rule #2: Admin review queue
        'extracted_at': record.get('extracted_at'),
    }


def load_jsonl_records(filepath: Path) -> List[Dict[str, Any]]:
    """Reads JSON Lines from a file."""
    records = []
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records


class FypLoader:
    def __init__(self, supabase_client: Optional[SupabaseRestClient] = None):
        self.client = supabase_client

    def validate_and_prepare(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """Validates privacy gates and prepares the database payload."""
        is_valid, issues = validate_record(record)
        if not is_valid:
            raise ValueError(f"Privacy validation failed: {'; '.join(issues)}")
        return prepare_fyp_payload(record)

    def load_records(
        self, records: List[Dict[str, Any]], dry_run: bool = False
    ) -> LoaderSummary:
        summary = LoaderSummary(total_seen=len(records))

        prepared_batch = []
        for rec in records:
            try:
                payload = self.validate_and_prepare(rec)
                prepared_batch.append((payload, rec))
                summary.staged += 1
            except Exception as e:
                summary.errors += 1
                summary.error_details.append(f"Record validation error: {e}")

        if dry_run or not self.client:
            return summary

        # Live Database Loading via Supabase PostgREST
        for payload, raw_rec in prepared_batch:
            try:
                # Upsert into fyp_projects on natural_key conflict
                res = self.client.upsert(
                    table='fyp_projects',
                    records=[payload],
                    on_conflict='natural_key',
                )
                summary.loaded += 1

                # Sync approached companies if present
                companies = raw_rec.get('companies_approached', [])
                if companies and res:
                    project_id = res[0]['id']
                    self._sync_companies(
                        project_id, companies, payload.get('source_file', '')
                    )

            except Exception as e:
                summary.errors += 1
                summary.error_details.append(
                    f"DB error on '{payload.get('title', '')}': {e}"
                )

        # Audit log entry for institutional accountability
        try:
            self.client.insert(
                table='audit_log',
                records=[
                    {
                        'action': 'FYP_INGESTION_LOAD',
                        'target_table': 'fyp_projects',
                        'details': {
                            'total_seen': summary.total_seen,
                            'staged': summary.staged,
                            'loaded': summary.loaded,
                            'errors': summary.errors,
                        },
                    }
                ],
            )
        except Exception as e:
            print(f"[Warning] Failed to write audit_log: {e}")

        return summary

    def _sync_companies(
        self, project_id: str, companies: List[str], source_file: str
    ):
        """Syncs companies and associates them with the project."""
        for company_name in companies:
            c_clean = company_name.strip()
            if not c_clean:
                continue
            c_norm = c_clean.lower()
            try:
                c_res = self.client.upsert(
                    table='companies',
                    records=[
                        {
                            'name': c_clean,
                            'name_normalised': c_norm,
                            'source': source_file,
                        }
                    ],
                    on_conflict='name_normalised',
                )
                if c_res:
                    company_id = c_res[0]['id']
                    self.client.upsert(
                        table='fyp_company_interest',
                        records=[
                            {
                                'project_id': project_id,
                                'company_id': company_id,
                                'interest_type': 'approached',
                            }
                        ],
                        on_conflict='project_id,company_id',
                    )
            except Exception as ce:
                print(f"[Warning] Company sync failed for '{c_clean}': {ce}")


def main():
    parser = argparse.ArgumentParser(description='EduCompass FYP Data Loader')
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Validate and prepare payloads without inserting into DB',
    )
    parser.add_argument(
        '--dir',
        type=str,
        default='pipeline/extracted',
        help='Directory containing extracted JSONL files',
    )
    args = parser.parse_args()

    input_dir = Path(args.dir)
    jsonl_files = sorted(list(input_dir.glob('*.jsonl')))

    if not jsonl_files:
        print(f"No .jsonl files found in {input_dir}")
        return

    print(f"=== EduCompass FYP Loader (Dry Run: {args.dry_run}) ===")
    print(f"Found {len(jsonl_files)} files in {input_dir}:")
    for f in jsonl_files:
        print(f" - {f.name}")

    all_records = []
    for f in jsonl_files:
        recs = load_jsonl_records(f)
        all_records.extend(recs)
        print(f"   Read {len(recs)} records from {f.name}")

    print(f"\nTotal records read: {len(all_records)}")

    client = None
    if not args.dry_run:
        client = get_supabase_client()
        initial_count = client.get_count('fyp_projects')
        print(f"Connected to Supabase successfully. Current fyp_projects rows: {initial_count}")

    loader = FypLoader(supabase_client=client)
    summary = loader.load_records(all_records, dry_run=args.dry_run)

    print("\n--- Ingestion Summary ---")
    print(f"Total seen: {summary.total_seen}")
    print(f"Staged:     {summary.staged}")
    print(f"Loaded:     {summary.loaded}")
    print(f"Errors:     {summary.errors}")

    if summary.error_details:
        print("\nErrors encountered:")
        for err in summary.error_details[:5]:
            print(f" - {err}")

    if not args.dry_run and client:
        final_count = client.get_count('fyp_projects')
        print(f"\nFinal fyp_projects rows in database: {final_count}")


if __name__ == '__main__':
    main()
