"""Import a public/exported course CSV into SkillPath schema.

Usage: python scripts/import_catalog.py path/to/public_courses.csv data/imported.json
Input columns: id,title,description,provider,url,category,difficulty,hours,
               skills,prerequisites,popularity.
Skills and prerequisites can be comma- or pipe-separated.
Provide proper source attribution and licensing for any downloaded dataset.
"""
import csv
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.catalog import normalise

if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Usage: python scripts/import_catalog.py input.csv output.json")
    with open(sys.argv[1], encoding="utf-8-sig", newline="") as handle:
        rows = [normalise(row) for row in csv.DictReader(handle)]
    target = Path(sys.argv[2])
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(rows, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Imported {len(rows)} validated resources to {target}")
