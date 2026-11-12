"""Load and validate versioned local catalogues. No paid or live API dependency."""
from __future__ import annotations
import csv
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CATALOG = ROOT / "data" / "resources.json"
LEVELS = {"Beginner", "Intermediate", "Advanced"}

def normalise(item: dict) -> dict:
    row = dict(item)
    for field in ("skills", "prerequisites"):
        value = row.get(field, [])
        if isinstance(value, str):
            value = [part.strip() for part in value.replace("|", ",").split(",") if part.strip()]
        row[field] = list(dict.fromkeys(str(v).strip().lower() for v in value if str(v).strip()))
    row["id"] = str(row["id"])
    row["title"] = str(row["title"])
    row["description"] = str(row.get("description", ""))
    row["provider"] = str(row.get("provider", "Open learning"))
    row["url"] = str(row.get("url", ""))
    row["category"] = str(row.get("category", "General"))
    row["difficulty"] = str(row.get("difficulty", "Beginner")).title()
    if row["difficulty"] not in LEVELS:
        raise ValueError(f"Invalid difficulty for {row['id']}")
    row["hours"] = max(1, float(row.get("hours", 4)))
    row["popularity"] = max(0.0, min(1.0, float(row.get("popularity", 0.5))))
    if not row["skills"]:
        raise ValueError(f"No skill tags for {row['id']}")
    return row

def load_catalog() -> list[dict]:
    path = Path(os.getenv("SKILLPATH_CATALOG", str(DEFAULT_CATALOG)))
    if path.suffix.lower() == ".csv":
        with path.open(encoding="utf-8-sig", newline="") as f:
            rows = list(csv.DictReader(f))
    else:
        rows = json.loads(path.read_text(encoding="utf-8"))
    catalog = [normalise(item) for item in rows]
    ids = [row["id"] for row in catalog]
    if len(ids) != len(set(ids)):
        raise ValueError("Catalogue contains duplicate ids")
    return catalog
