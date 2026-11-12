"""FastAPI learning path backend."""
from __future__ import annotations
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from .catalog import load_catalog, load_starter_catalog, catalog_status
from .ranker import recommend
from .feedback import record, aggregates
from .evaluation import report
from .gemini import explain_path, status as llm_status

app=FastAPI(title="SkillPath API",version="1.1.0",description="Search-grounded hybrid ranking and offline evaluation")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173","http://127.0.0.1:5173"],
    allow_methods=["GET","POST"],allow_headers=["*"],allow_credentials=False
)
class Profile(BaseModel):
    current_skills:list[str]=Field(default_factory=list,max_length=60)
    goal:str=Field(min_length=3,max_length=250)
    difficulty:str="Beginner"
    hours_per_week:int=Field(default=6,ge=1,le=80)
    completed_courses:list[str]=Field(default_factory=list,max_length=500)
    mode:str="goal"

class RecommendationRequest(BaseModel):
    profile:Profile
    limit:int=Field(default=5,ge=1,le=7)

class FeedbackRequest(BaseModel):
    resource_id:str=Field(min_length=1,max_length=120)
    helpful:bool

@app.get("/api/health")
def health():
    return {"status":"ok","catalog":catalog_status(),"llm":llm_status()}

@app.get("/api/meta")
def meta():
    catalog=load_catalog()
    # Limit the huge skills list to a manageable UI set, but retain full
    # free-text skill input for any discipline.
    counts={}
    for row in catalog:
        for skill in row["skills"]:
            if len(skill)<65:counts[skill]=counts.get(skill,0)+1
    skills=sorted(counts,key=lambda skill:(-counts[skill],skill))[:140]
    return {"skills":skills,"categories":sorted({r["category"] for r in catalog}),
            "resource_count":len(catalog),"dataset":catalog_status()["source"],
            "is_public_catalog":catalog_status()["is_public"],"llm":llm_status()}

@app.get("/api/catalog")
def catalog(q:str=Query("",max_length=120),category:str="",difficulty:str="",
            page:int=Query(1,ge=1),page_size:int=Query(18,ge=1,le=60)):
    from .ranker import _retrieve
    rows=load_catalog()
    if q.strip():
        ranked,_=_retrieve(q,rows)
        rows=[row for _,row in ranked]
    if category:rows=[row for row in rows if row["category"].lower()==category.lower()]
    if difficulty:rows=[row for row in rows if row["difficulty"].lower()==difficulty.lower()]
    total=len(rows)
    start=(page-1)*page_size
    return {"resources":rows[start:start+page_size],"total":total,
            "page":page,"page_size":page_size,"source":catalog_status()["source"]}

@app.post("/api/recommend")
def create_recommendations(payload:RecommendationRequest):
    profile=payload.profile.model_dump()
    if profile["difficulty"] not in ("Beginner","Intermediate","Advanced"):
        raise HTTPException(422,"Choose a valid difficulty")
    result=recommend(profile,load_catalog(),aggregates(),limit=payload.limit)
    result=explain_path(result,profile["goal"])
    result["catalog_source"]=catalog_status()["source"]
    result["is_public_catalog"]=catalog_status()["is_public"]
    return result

@app.get("/api/evaluation")
def evaluation():
    # The benchmark is fixed, manually labelled and clearly identified. Running
    # its reference IDs against a new public catalogue would invalidate metrics.
    out=report(load_starter_catalog())
    out["catalog_source"]="Starter benchmark (5 hand-labelled personas; no real user outcomes)"
    return out

@app.post("/api/feedback")
def feedback(payload:FeedbackRequest):
    if payload.resource_id not in {r["id"] for r in load_catalog()}:
        raise HTTPException(404,"Resource not found")
    record(payload.resource_id,payload.helpful)
    return {"saved":True}
