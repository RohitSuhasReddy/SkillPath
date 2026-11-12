"""Relevance and provenance regression tests."""
from app.catalog import normalise, load_starter_catalog, load_catalog
from app.ranker import recommend
from app.gemini import explain_path, status as gemini_status
from scripts.build_public_catalog import MIT, parse_row

def profile(goal, difficulty="Beginner"):
    return {"goal":goal,"current_skills":[],"difficulty":difficulty,
            "hours_per_week":5,"completed_courses":[],"mode":"goal"}

def mit_resources():
    return [normalise({
        "id":id,"title":title,"description":description,
        "difficulty":level,"skills":skills,"prerequisites":[],"hours":28,
        "popularity":.75,"provider":"MIT OpenCourseWare","url":url
    }) for id,title,description,level,skills,url in MIT]

def test_signals_and_systems_never_selects_unrelated_starter_courses():
    result=recommend(profile("Study signals and systems"),load_starter_catalog(),limit=7)
    assert result["path"] == []
    assert result["matched_resources"] == 0
    assert result["no_matches_reason"]

def test_signals_course_matches_ocw_and_honors_difficulty():
    combined=load_starter_catalog()+mit_resources()
    beginner=recommend(profile("Study signals and systems"),combined,limit=5)
    assert beginner["path"]
    assert all("mit-signals" in r["id"] for r in beginner["path"])
    assert all(r["difficulty"]=="Beginner" for r in beginner["path"])
    advanced=recommend(profile("Signals and Systems","Advanced"),combined,limit=5)
    assert advanced["path"]
    assert all("mit-signals" in r["id"] for r in advanced["path"])
    assert not any("Docker" in r["title"] or "Python" in r["title"] for r in advanced["path"])

def test_unknown_topic_never_fabricates_other_courses():
    result=recommend(profile("quantum banana tattoo repair"),load_starter_catalog())
    assert not result["path"]
    assert result["no_matches_reason"]

def test_public_import_preserves_source_gaps():
    item=parse_row({
        "title":"Signals and Systems","Description":"Fourier analysis and convolution",
        "URL":"https://www.coursera.org/learn/signals","Level":"Intermediate level",
        "Schedule":"15 hours to complete","Skills":"['Signal Processing', 'Fourier Transform']",
        "Organization":"University","rating":"4.8","enrolled":"2000"
    },1)
    assert item["hours"]==15
    assert item["prerequisites"]==[]
    assert item["prerequisite_source"]=="not provided"
    assert "signal processing" in item["skills"]

def test_missing_gemini_key_never_changes_ranking(monkeypatch):
    monkeypatch.setenv("ENABLE_LLM","true")
    monkeypatch.delenv("GEMINI_API_KEY",raising=False)
    assert gemini_status()["status"]=="key_missing"
    result=recommend(profile("Signals and Systems"),mit_resources())
    prev=[(row["id"],row["score"]) for row in result["path"]]
    result=explain_path(result,"Signals and Systems")
    assert [(row["id"],row["score"]) for row in result["path"]]==prev
    assert result["explanation_source"]=="template"

def test_catalog_fallback_is_not_empty():
    assert len(load_catalog()) >= 31
