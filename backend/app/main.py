"""FastAPI entrypoint: uvicorn app.main:app --reload (from backend/)."""
from __future__ import annotations
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from .catalog import load_catalog
from .ranker import recommend, goal_skills, explain_with_llm
from .feedback import record, aggregates
from .evaluation import report

app = FastAPI(title="SkillPath API", version="0.1.0", description="Hybrid learning-path recommender and evaluation sandbox")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
                   allow_credentials=False, allow_methods=["GET", "POST"], allow_headers=["*"])

class Profile(BaseModel):
    current_skills: list[str] = Field(default_factory=list, max_length=60)
    goal: str = Field(min_length=3, max_length=250)
    difficulty: str = "Beginner"
    hours_per_week: int = Field(default=6, ge=1, le=80)
    completed_courses: list[str] = Field(default_factory=list, max_length=500)
    mode: str = "goal"

class RecommendationRequest(BaseModel):
    profile: Profile
    limit: int = Field(default=5, ge=1, le=7)

class FeedbackRequest(BaseModel):
    resource_id: str = Field(min_length=1, max_length=120)
    helpful: bool

@app.get("/api/health")
def health():
    return {"status": "ok", "resources": len(load_catalog())}

@app.get("/api/meta")
def meta():
    catalog = load_catalog()
    return {"skills": sorted({skill for row in catalog for skill in row["skills"]}),
            "categories": sorted({row["category"] for row in catalog}),
            "resource_count": len(catalog), "dataset": "curated-starter-demo-v1"}

@app.get("/api/catalog")
def catalog(q: str = Query("", max_length=120), category: str = "", difficulty: str = ""):
    items = load_catalog()
    if q.strip():
        needle = q.lower()
        items = [r for r in items if needle in (r["title"] + " " + r["description"] + " " + " ".join(r["skills"])).lower()]
    if category:
        items = [r for r in items if r["category"].lower() == category.lower()]
    if difficulty:
        items = [r for r in items if r["difficulty"].lower() == difficulty.lower()]
    return {"resources": items, "total": len(items)}

@app.post("/api/recommend")
def create_recommendations(payload: RecommendationRequest):
    profile = payload.profile.model_dump()
    if profile["difficulty"] not in ("Beginner", "Intermediate", "Advanced"):
        raise HTTPException(422, "Choose a valid difficulty")
    weights = None
    if profile["mode"] == "similar":
        weights = {"goal": .25, "skills": .32, "difficulty": .18, "quality": .13, "readiness": .12}
    catalog = load_catalog()
    result = recommend(profile, catalog, feedback=aggregates(), weights=weights, limit=payload.limit)
    result["path"] = explain_with_llm(result["path"], profile["goal"])
    return result

@app.get("/api/evaluation")
def evaluation():
    return report(load_catalog())

@app.post("/api/feedback")
def feedback(payload: FeedbackRequest):
    if payload.resource_id not in {r["id"] for r in load_catalog()}:
        raise HTTPException(404, "Resource not found")
    record(payload.resource_id, payload.helpful)
    return {"saved": True}
