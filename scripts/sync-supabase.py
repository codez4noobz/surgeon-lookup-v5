#!/usr/bin/env python3
"""
Sync surgeon data from the research folder into Supabase.

Source of truth:
    /Users/gdoughty/Documents/Claude/OUTPUTS/Surgeon Research/all surgeon research/surgeons.db

What it does:
    1. Reads every table from the source SQLite database.
    2. UPSERTs rows into Supabase (insert new, update existing by NPI).
    3. Deletes rows that no longer exist in the source (so removed providers
       don't linger in the app).
    4. Reports counts before, after, and what changed.

Idempotent: running twice in a row produces no changes the second time.

Requirements:
    - .env.local must contain:
        NEXT_PUBLIC_SUPABASE_URL=...
        SUPABASE_SERVICE_ROLE_KEY=...
    - Python 3.9+ (uses sqlite3 + urllib from the standard library, no pip needed)

Usage:
    npm run sync
    or
    python3 scripts/sync-supabase.py
    or override the source path:
    SOURCE_DB=/path/to/other.db python3 scripts/sync-supabase.py
"""
from __future__ import annotations

import json
import os
import sqlite3
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Callable, Iterable

# ---- config ----

PROJECT_ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = PROJECT_ROOT / ".env.local"

DEFAULT_SOURCE = (
    "/Users/gdoughty/Documents/Claude/OUTPUTS/"
    "Surgeon Research/all surgeon research/surgeons.db"
)

BATCH_SIZE = 500

# Tables to sync, in dependency order (providers must come first, FKs after)
TABLES = ["providers", "publications", "payments", "scores", "emails"]


# ---- env loading ----

def load_env(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    if not path.exists():
        return env
    for raw in path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def get_credentials() -> tuple[str, str]:
    env = load_env(ENV_FILE)
    url = env.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get(
        "NEXT_PUBLIC_SUPABASE_URL"
    )
    key = env.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get(
        "SUPABASE_SERVICE_ROLE_KEY"
    )
    if not url or not key:
        sys.stderr.write(
            "Missing credentials. Add these to .env.local:\n"
            "  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co\n"
            "  SUPABASE_SERVICE_ROLE_KEY=eyJ...\n\n"
            "Find the service role key at Supabase Dashboard -> "
            "Project Settings -> API -> service_role (eye icon to reveal).\n"
        )
        sys.exit(1)
    return url.rstrip("/"), key


# ---- HTTP helpers ----

def http_request(
    method: str,
    url: str,
    key: str,
    body: bytes | None = None,
    extra_prefer: str | None = None,
) -> tuple[int, bytes]:
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    prefer_parts = ["return=minimal"]
    if extra_prefer:
        prefer_parts.append(extra_prefer)
    headers["Prefer"] = ",".join(prefer_parts)

    req = urllib.request.Request(url, data=body, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def upsert_batch(
    url: str, key: str, table: str, rows: list[dict], conflict_col: str = "npi"
) -> None:
    body = json.dumps(rows).encode("utf-8")
    code, msg = http_request(
        "POST",
        f"{url}/rest/v1/{table}?on_conflict={conflict_col}",
        key,
        body=body,
        extra_prefer="resolution=merge-duplicates",
    )
    if code >= 300:
        sys.stderr.write(
            f"\n  HTTP {code} upserting into {table}\n  {msg.decode()[:500]}\n"
            f"  Sample row: {json.dumps(rows[0])[:300]}\n"
        )
        sys.exit(1)


def delete_batch(url: str, key: str, table: str, npis: list[str]) -> None:
    if not npis:
        return
    # PostgREST supports DELETE with `in.(...)` filter
    quoted = ",".join(f'"{n}"' for n in npis)
    full_url = f"{url}/rest/v1/{table}?npi=in.({quoted})"
    code, msg = http_request("DELETE", full_url, key)
    if code >= 300:
        sys.stderr.write(
            f"\n  HTTP {code} deleting from {table}\n  {msg.decode()[:500]}\n"
        )
        sys.exit(1)


def fetch_all_npis(url: str, key: str, table: str) -> set[str]:
    """Page through providers.npi (or scores.npi etc.) to build a set."""
    page_size = 1000
    offset = 0
    npis: set[str] = set()
    while True:
        full_url = (
            f"{url}/rest/v1/{table}?select=npi"
            f"&offset={offset}&limit={page_size}"
        )
        req = urllib.request.Request(
            full_url,
            headers={"apikey": key, "Authorization": f"Bearer {key}"},
        )
        with urllib.request.urlopen(req, timeout=60) as resp:
            page = json.loads(resp.read())
        if not page:
            break
        for r in page:
            npis.add(r["npi"])
        if len(page) < page_size:
            break
        offset += page_size
    return npis


def fetch_email_ids(url: str, key: str) -> set[tuple[str, str]]:
    """For emails table: identity is (npi, email). We diff on this pair."""
    page_size = 1000
    offset = 0
    pairs: set[tuple[str, str]] = set()
    while True:
        full_url = (
            f"{url}/rest/v1/emails?select=npi,email"
            f"&offset={offset}&limit={page_size}"
        )
        req = urllib.request.Request(
            full_url,
            headers={"apikey": key, "Authorization": f"Bearer {key}"},
        )
        with urllib.request.urlopen(req, timeout=60) as resp:
            page = json.loads(resp.read())
        if not page:
            break
        for r in page:
            pairs.add((r["npi"], r["email"] or ""))
        if len(page) < page_size:
            break
        offset += page_size
    return pairs


# ---- SQLite readers ----

def parse_json(v: Any) -> Any:
    if v is None or v == "":
        return None
    if not isinstance(v, str):
        return v
    try:
        return json.loads(v)
    except json.JSONDecodeError:
        return None


def read_source(db_path: Path) -> dict[str, list[dict]]:
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row

    providers = [
        {
            "npi": r["npi"],
            "last_name": r["last_name"],
            "first_name": r["first_name"],
            "middle_name": r["middle_name"],
            "credential": r["credential"],
            "sex": r["sex"],
            "city": r["city"],
            "state": r["state"],
            "zip": r["zip"],
            "phone": r["phone"],
            "address_line1": r["address_line1"],
            "enumeration_date": r["enumeration_date"],
            "primary_taxonomy": r["primary_taxonomy"],
            "primary_taxonomy_label": r["primary_taxonomy_label"],
        }
        for r in conn.execute(
            "SELECT npi,last_name,first_name,middle_name,credential,sex,"
            "city,state,zip,phone,address_line1,enumeration_date,"
            "primary_taxonomy,primary_taxonomy_label FROM providers"
        )
    ]

    publications = [
        {
            "npi": r["npi"],
            "pubmed_total": r["pubmed_total"] or 0,
            "bari_foregut_count": r["bari_foregut_count"] or 0,
            "top_titles": parse_json(r["top_titles"]),
            "last_searched": r["last_searched"],
        }
        for r in conn.execute(
            "SELECT npi,pubmed_total,bari_foregut_count,top_titles,"
            "last_searched FROM publications"
        )
    ]

    payments = [
        {
            "npi": r["npi"],
            "op_total_usd": r["op_total_usd"] or 0,
            "op_record_count": r["op_record_count"] or 0,
            "op_top_mfrs": parse_json(r["op_top_mfrs"]),
            "op_top_products": parse_json(r["op_top_products"]),
            "op_top_natures": parse_json(r["op_top_natures"]),
            "last_searched": r["last_searched"],
        }
        for r in conn.execute(
            "SELECT npi,op_total_usd,op_record_count,op_top_mfrs,"
            "op_top_products,op_top_natures,last_searched FROM payments"
        )
    ]

    scores = [
        {
            "npi": r["npi"],
            "kol_score": r["kol_score"] or 0,
            "tier": r["tier"],
            "last_computed": r["last_computed"],
        }
        for r in conn.execute(
            "SELECT npi,kol_score,tier,last_computed FROM scores"
        )
    ]

    emails = [
        {
            "npi": r["npi"],
            "email": r["email"],
            "source": r["source"],
            "affiliations": parse_json(r["affiliations"]),
            "last_searched": r["last_searched"],
        }
        for r in conn.execute(
            "SELECT npi,email,source,affiliations,last_searched FROM emails"
        )
    ]

    conn.close()
    return {
        "providers": providers,
        "publications": publications,
        "payments": payments,
        "scores": scores,
        "emails": emails,
    }


# ---- progress helpers ----

def progress(label: str, done: int, total: int, t_start: float) -> None:
    elapsed = max(time.time() - t_start, 0.001)
    rate = done / elapsed
    eta = (total - done) / rate if rate > 0 else 0
    sys.stdout.write(
        f"\r  {label}: {done:>6,} / {total:,} ({rate:>5.0f}/s, eta {eta:>4.0f}s)"
    )
    sys.stdout.flush()


def batched(items: Iterable, size: int) -> Iterable[list]:
    chunk: list = []
    for it in items:
        chunk.append(it)
        if len(chunk) >= size:
            yield chunk
            chunk = []
    if chunk:
        yield chunk


# ---- main sync ----

def sync_table_by_npi(
    url: str,
    key: str,
    table: str,
    rows: list[dict],
    existing_npis: set[str],
) -> dict[str, int]:
    """Generic NPI-keyed sync: upsert all source rows, delete missing ones."""
    print(f"\n{table}:")
    print(f"  source rows: {len(rows):,}")
    print(f"  existing in supabase: {len(existing_npis):,}")

    source_npis = {r["npi"] for r in rows}
    to_delete = sorted(existing_npis - source_npis)
    print(f"  to delete: {len(to_delete):,}")
    print(f"  to upsert: {len(rows):,}")

    # Upsert
    t0 = time.time()
    done = 0
    for chunk in batched(rows, BATCH_SIZE):
        upsert_batch(url, key, table, chunk)
        done += len(chunk)
        progress("upsert", done, len(rows), t0)
    if rows:
        print()

    # Delete missing
    if to_delete:
        t0 = time.time()
        done = 0
        for chunk in batched(to_delete, BATCH_SIZE):
            delete_batch(url, key, table, chunk)
            done += len(chunk)
            progress("delete", done, len(to_delete), t0)
        print()

    return {"upserted": len(rows), "deleted": len(to_delete)}


def sync_emails(
    url: str, key: str, rows: list[dict], existing_pairs: set[tuple[str, str]]
) -> dict[str, int]:
    """Emails are identified by (npi, email). Diff on that pair."""
    print(f"\nemails:")
    print(f"  source rows: {len(rows):,}")
    print(f"  existing in supabase: {len(existing_pairs):,}")

    source_pairs = {(r["npi"], r["email"] or "") for r in rows}
    to_delete_pairs = existing_pairs - source_pairs
    to_insert_pairs = source_pairs - existing_pairs
    to_update_pairs = source_pairs & existing_pairs

    print(f"  new: {len(to_insert_pairs):,}")
    print(f"  unchanged: {len(to_update_pairs):,}")
    print(f"  to delete: {len(to_delete_pairs):,}")

    # For inserts: just POST the new rows
    new_rows = [
        r for r in rows if (r["npi"], r["email"] or "") in to_insert_pairs
    ]

    if new_rows:
        t0 = time.time()
        done = 0
        for chunk in batched(new_rows, BATCH_SIZE):
            # Plain insert, no on_conflict since these are new
            body = json.dumps(chunk).encode("utf-8")
            code, msg = http_request(
                "POST", f"{url}/rest/v1/emails", key, body=body
            )
            if code >= 300:
                sys.stderr.write(
                    f"\n  HTTP {code} inserting emails:\n  "
                    f"{msg.decode()[:500]}\n"
                )
                sys.exit(1)
            done += len(chunk)
            progress("insert", done, len(new_rows), t0)
        print()

    # For deletes: PostgREST doesn't support multi-column 'in', so delete by NPI
    # and then re-upsert affected NPIs. Simpler: delete one (npi,email) at a time
    # for the small number of stale entries.
    if to_delete_pairs:
        print(f"  deleting {len(to_delete_pairs):,} stale email rows...")
        t0 = time.time()
        done = 0
        for npi, email in to_delete_pairs:
            # URL-encode email value
            from urllib.parse import quote
            full_url = (
                f"{url}/rest/v1/emails?npi=eq.{npi}&email=eq.{quote(email)}"
            )
            code, msg = http_request("DELETE", full_url, key)
            if code >= 300:
                sys.stderr.write(
                    f"\n  HTTP {code} deleting email ({npi},{email}):\n  "
                    f"{msg.decode()[:500]}\n"
                )
                # Don't fail on individual delete errors
            done += 1
            if done % 100 == 0:
                progress("delete", done, len(to_delete_pairs), t0)
        progress("delete", done, len(to_delete_pairs), t0)
        print()

    return {
        "inserted": len(to_insert_pairs),
        "unchanged": len(to_update_pairs),
        "deleted": len(to_delete_pairs),
    }


def get_table_count(url: str, key: str, table: str) -> int:
    full_url = f"{url}/rest/v1/{table}?select=count"
    req = urllib.request.Request(
        full_url,
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Prefer": "count=exact",
            "Range-Unit": "items",
            "Range": "0-0",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        # Total count is in Content-Range: 0-0/22073
        cr = resp.headers.get("Content-Range", "")
        if "/" in cr:
            return int(cr.split("/")[-1])
    return -1


def main() -> int:
    source_path = Path(os.environ.get("SOURCE_DB", DEFAULT_SOURCE))
    if not source_path.exists():
        sys.stderr.write(f"Source database not found:\n  {source_path}\n")
        return 1

    url, key = get_credentials()

    print(f"Source: {source_path}")
    print(f"Target: {url}")
    print()

    # Before
    print("Current Supabase row counts:")
    for t in TABLES:
        n = get_table_count(url, key, t)
        print(f"  {t}: {n:,}")

    # Read source
    print("\nReading source database...")
    t0 = time.time()
    data = read_source(source_path)
    for t in TABLES:
        print(f"  {t}: {len(data[t]):,}")
    print(f"  (read in {time.time() - t0:.1f}s)")

    # Existing NPIs in each table (for diffing)
    print("\nFetching existing NPIs from Supabase...")
    existing_by_table: dict[str, set] = {}
    for t in TABLES:
        if t == "emails":
            existing_by_table[t] = fetch_email_ids(url, key)
        else:
            existing_by_table[t] = fetch_all_npis(url, key, t)
        print(f"  {t}: {len(existing_by_table[t]):,}")

    # Sync in order. Providers first because of FKs.
    results: dict[str, dict] = {}
    for t in ["providers", "publications", "payments", "scores"]:
        results[t] = sync_table_by_npi(
            url, key, t, data[t], existing_by_table[t]
        )

    # Emails has its own logic
    results["emails"] = sync_emails(url, key, data["emails"], existing_by_table["emails"])

    # After
    print("\nFinal Supabase row counts:")
    for t in TABLES:
        n = get_table_count(url, key, t)
        print(f"  {t}: {n:,}")

    print("\nSummary of changes:")
    for t, r in results.items():
        print(f"  {t}: {r}")

    print("\nSync complete.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
