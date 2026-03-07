import argparse
import csv
import json
import re
from pathlib import Path
from typing import Callable
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen


DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
    ),
    "Accept": "*/*",
}


def extract_doi(url: str) -> str | None:
    match = re.search(r"10\.\d{4,9}/[-._;()/:A-Za-z0-9]+", url)
    if not match:
        return None
    doi = match.group(0).rstrip(".,);]")
    for marker in ("/suppl_file/", "/abstract", "/full", "/pdf", "?"):
        if marker in doi:
            doi = doi.split(marker, 1)[0]
    return doi


def build_openalex_url(doi: str) -> str:
    return f"https://api.openalex.org/works/https://doi.org/{doi}"


def load_manifest(manifest_path: Path) -> list[dict[str, str]]:
    with manifest_path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def write_manifest(manifest_path: Path, rows: list[dict[str, str]]) -> None:
    if not rows:
        return
    fieldnames: list[str] = []
    for row in rows:
        for key in row.keys():
            if key not in fieldnames:
                fieldnames.append(key)
    with manifest_path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def fetch_json(url: str) -> dict:
    request = Request(url, headers=DEFAULT_HEADERS)
    with urlopen(request, timeout=60) as response:
        return json.load(response)


def sanitize_stem(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]+", "_", value).strip("_") or "record"


def enrich_failed_record(
    record: dict[str, str],
    output_dir: Path,
    fetch_json: Callable[[str], dict] = fetch_json,
) -> dict[str, str]:
    updated = dict(record)
    doi = extract_doi(record.get("url", ""))
    if not doi:
        updated["status"] = "download_failed_no_doi"
        return updated

    output_dir.mkdir(parents=True, exist_ok=True)
    try:
        payload = fetch_json(build_openalex_url(doi))
    except (HTTPError, URLError, TimeoutError):
        updated["status"] = "download_failed_openalex"
        return updated

    metadata_path = output_dir / f"{sanitize_stem(doi)}_openalex.json"
    metadata_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    primary_location = payload.get("primary_location") or {}
    open_access = payload.get("open_access") or {}
    updated["openalex_metadata_file"] = str(metadata_path)
    updated["openalex_landing_url"] = primary_location.get("landing_page_url") or ""
    updated["openalex_pdf_url"] = (
        open_access.get("oa_url")
        or primary_location.get("pdf_url")
        or ""
    )
    updated["status"] = "metadata_only"
    return updated


def retry_failed_sources(
    manifest_path: Path,
    fetch_json_func: Callable[[str], dict] = fetch_json,
) -> int:
    rows = load_manifest(manifest_path)
    output_dir = manifest_path.parent / "fallback_metadata"
    changed = 0

    for index, row in enumerate(rows):
        if not (row.get("status") or "").startswith("download_failed"):
            continue
        updated = enrich_failed_record(row, output_dir, fetch_json=fetch_json_func)
        if updated != row:
            rows[index] = updated
            changed += 1

    if changed:
        write_manifest(manifest_path, rows)
    return changed


def main() -> int:
    parser = argparse.ArgumentParser(description="补充知识源抓取失败项的备用元数据。")
    parser.add_argument("--manifest", type=Path, required=True, help="CSV 清单路径")
    args = parser.parse_args()

    changed = retry_failed_sources(args.manifest)
    print(f"updated={changed}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
