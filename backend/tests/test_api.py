from fastapi.testclient import TestClient
from app.main import app
from app.catalog import load_catalog
from app.ranker import goal_skills

client = TestClient(app)

def test_api_flow():
    meta = client.get("/api/meta")
    assert meta.status_code == 200
    assert meta.json()["resource_count"] >= 20
    catalog = client.get("/api/catalog", params={"category": "Backend"})
    assert catalog.status_code == 200
    assert catalog.json()["total"] > 0
    request = {"profile": {"goal": "Become a backend engineer", "current_skills": ["python", "git"],
                           "difficulty": "Intermediate", "hours_per_week": 5, "mode": "goal"}, "limit": 5}
    path = client.post("/api/recommend", json=request)
    assert path.status_code == 200
    output = path.json()
    assert 1 <= len(output["path"]) <= 5
    assert output["estimated_weeks"] >= 1

def test_invalid_level_rejected():
    response = client.post("/api/recommend", json={"profile": {"goal": "Data analysis", "difficulty": "Expert"}})
    assert response.status_code == 422

def test_evaluation_schema():
    response = client.get("/api/evaluation")
    assert response.status_code == 200
    assert "precision_at_5" in response.json()["metrics"]
    assert "experiments" in response.json()

def test_web_application_goal_maps_to_skills():
    skills = goal_skills("Build web applications", load_catalog())
    assert "react" in skills
