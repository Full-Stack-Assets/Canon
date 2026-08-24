#!/usr/bin/env python3
"""Validate completed visual-reference records without making network requests."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any
from urllib.parse import urlparse


MATCH_CLASSES = {"official_exact", "retailer_exact", "archive_reference"}
SEARCH_OR_AGGREGATOR_HOSTS = {
    "bing.com",
    "google.com",
    "images.google.com",
    "lens.google.com",
    "pinterest.com",
    "www.bing.com",
    "www.google.com",
    "www.pinterest.com",
}
IMAGE_SUFFIXES = (".avif", ".gif", ".jpeg", ".jpg", ".png", ".webp")


def _text(record: dict[str, Any], key: str) -> str:
    value = record.get(key, "")
    return value.strip() if isinstance(value, str) else ""


def _host_is_blocked(host: str) -> bool:
    host = host.lower().split(":", 1)[0]
    return any(host == blocked or host.endswith(f".{blocked}") for blocked in SEARCH_OR_AGGREGATOR_HOSTS)


def _validate_http_url(value: str, *, landing_page: bool) -> str | None:
    try:
        parsed = urlparse(value)
    except ValueError:
        return "is not a valid URL"
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return "must be an absolute http or https URL"
    if _host_is_blocked(parsed.netloc):
        return "must not use a search, cached-result, or aggregator host"
    if landing_page and parsed.path.lower().endswith(IMAGE_SUFFIXES):
        return "must be a landing page URL, not a direct image file"
    return None


def validate_record(record: Any, position: int) -> list[str]:
    if not isinstance(record, dict):
        return [f"record {position}: must be a JSON object"]

    prefix = f"record {position}"
    errors: list[str] = []
    item_id = _text(record, "Item ID")
    classification = _text(record, "Sourcing Classification")
    selected = _text(record, "Selected Visual Reference URL")
    direct = _text(record, "Direct Image URL")
    match_class = _text(record, "Match Class")
    status = _text(record, "Reference Status")
    notes = _text(record, "Review Notes")

    for field, value in (("Item ID", item_id), ("Sourcing Classification", classification), ("Reference Status", status), ("Review Notes", notes)):
        if not value:
            errors.append(f"{prefix}: {field} is required")

    manual = classification.casefold() == "generic/unbranded" or status.casefold() == "manual only / omitted"
    if manual:
        if selected or direct or match_class:
            errors.append(f"{prefix}: manual/omitted records must leave both URLs and Match Class blank")
        return errors

    if not selected:
        errors.append(f"{prefix}: Selected Visual Reference URL is required for a verified reference")
    else:
        problem = _validate_http_url(selected, landing_page=True)
        if problem:
            errors.append(f"{prefix}: Selected Visual Reference URL {problem}")

    if not match_class:
        errors.append(f"{prefix}: Match Class is required for a verified reference")
    elif match_class not in MATCH_CLASSES:
        errors.append(f"{prefix}: Match Class must be one of {', '.join(sorted(MATCH_CLASSES))}")

    if direct:
        problem = _validate_http_url(direct, landing_page=False)
        if problem:
            errors.append(f"{prefix}: Direct Image URL {problem}")

    return errors


def load_records(path: Path) -> list[Any]:
    if path.suffix.lower() == ".jsonl":
        records: list[Any] = []
        for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
            if not line.strip():
                continue
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError as error:
                raise ValueError(f"line {line_number}: invalid JSON: {error.msg}") from error
        return records

    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        raise ValueError(f"invalid JSON: {error.msg}") from error
    return payload if isinstance(payload, list) else [payload]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", type=Path, help="JSON object, JSON array, or JSONL file")
    args = parser.parse_args()

    try:
        records = load_records(args.path)
    except (OSError, ValueError) as error:
        print(f"FAIL: {error}", file=sys.stderr)
        return 2

    if not records:
        print("FAIL: no records found", file=sys.stderr)
        return 1

    errors = [error for index, record in enumerate(records, start=1) for error in validate_record(record, index)]
    if errors:
        for error in errors:
            print(f"FAIL: {error}", file=sys.stderr)
        return 1

    print(f"PASS: {len(records)} record(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

