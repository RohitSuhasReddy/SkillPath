"""Load versioned catalogs; prefer the real public dataset once imported."""
from __future__ import annotations
import csv, json, os
from functools import lru_cache
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
PUBLIC=ROOT/"data"/"public_courses.json"
STARTER=ROOT/"data"/"resources.json"
LEVELS={"Beginner","Intermediate","Advanced"}

def normalise(item:dict)->dict:
    row=dict(item)
    for field in ("skills","prerequisites"):
        values=row.get(field,[])
        if isinstance(values,str):values=[v.strip() for v in values.replace("|",",").split(",")]
        row[field]=list(dict.fromkeys(str(s).strip().casefold() for s in values if str(s).strip()))
    for field,default in (("id",""),("title",""),("description",""),("provider","Open learning"),("url",""),("category","General")):
        row[field]=str(row.get(field,default))
    row["difficulty"]=str(row.get("difficulty","Intermediate")).title()
    if row["difficulty"] not in LEVELS:raise ValueError("Invalid difficulty for "+row["id"])
    row["hours"]=max(1,float(row.get("hours",12)))
    row["popularity"]=max(0.,min(1.,float(row.get("popularity",.5))))
    if not row["skills"]:row["skills"]=[row["title"].lower()]
    return row

@lru_cache(maxsize=4)
def _cached(path_string:str,mtime:int)->tuple[dict,...]:
    path=Path(path_string)
    if path.suffix.lower()==".csv":
        with path.open(encoding="utf-8-sig",newline="") as f:raw=list(csv.DictReader(f))
    else:raw=json.loads(path.read_text(encoding="utf-8"))
    items=tuple(normalise(item) for item in raw)
    ids=[item["id"] for item in items]
    if len(ids)!=len(set(ids)):raise ValueError("Duplicate IDs")
    return items

def _selected()->Path:
    env=os.getenv("SKILLPATH_CATALOG")
    if env:
        p=Path(env)
        return p if p.is_absolute() or p.exists() else ROOT/p
    return PUBLIC if PUBLIC.exists() and PUBLIC.stat().st_size>1000 else STARTER

def load_catalog()->list[dict]:
    path=_selected().resolve()
    return list(_cached(str(path),path.stat().st_mtime_ns))

def load_starter_catalog()->list[dict]:
    path=STARTER.resolve()
    return list(_cached(str(path),path.stat().st_mtime_ns))

def catalog_status()->dict:
    path=_selected()
    items=load_catalog()
    public=any(r.get("source")=="coursera-metadata-2024" for r in items)
    return {"count":len(items),"source":"Coursera 2024 public metadata + MIT OCW" if public else "31-resource starter demo",
            "is_public":public,"file":path.name}
