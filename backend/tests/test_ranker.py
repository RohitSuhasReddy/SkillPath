from app.catalog import load_catalog
from app.ranker import recommend
from app.evaluation import report

def test_beginner_never_gets_advanced_or_unmet_prerequisites():
    catalog = load_catalog()
    result = recommend({"goal": "Data science", "current_skills": [],
                        "difficulty": "Beginner", "hours_per_week": 4}, catalog)
    assert result["path"]
    known = set()
    for row in result["path"]:
        assert row["difficulty"] == "Beginner"
        assert set(row["prerequisites"]).issubset(known)
        known.update(row["skills"])

def test_time_budget_and_no_duplicate_courses():
    result = recommend({"goal": "Backend engineer", "current_skills": ["python"],
                        "difficulty": "Intermediate", "hours_per_week": 3}, load_catalog(), limit=7)
    assert len({r["id"] for r in result["path"]}) == len(result["path"])
    assert all(r["duration_weeks"] >= 1 for r in result["path"])
    assert result["estimated_weeks"] == sum(r["duration_weeks"] for r in result["path"])

def test_offline_metrics_bounded():
    summary = report(load_catalog())
    assert all(0 <= value <= 1 for value in summary["metrics"].values())
    assert len(summary["ablation"]) == 5
