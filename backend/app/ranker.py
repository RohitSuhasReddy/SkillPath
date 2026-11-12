"""Deterministic, explainable hybrid scorer with hard safety/learning guardrails."""
from __future__ import annotations
from collections import Counter
from math import ceil
import os
import re
from urllib.request import Request, urlopen
import json

LEVEL = {"Beginner": 0, "Intermediate": 1, "Advanced": 2}
GOAL_MAP = {
    "data scientist": ["python", "statistics", "pandas", "machine learning", "scikit-learn"],
    "data science": ["python", "statistics", "pandas", "machine learning", "scikit-learn"],
    "data analyst": ["sql", "excel", "python", "pandas", "visualization"],
    "data analysis": ["sql", "python", "pandas", "visualization"],
    "machine learning": ["python", "statistics", "machine learning", "scikit-learn"],
    "ml engineer": ["python", "machine learning", "pytorch", "mlops", "deployment"],
    "ai engineer": ["python", "machine learning", "llm", "api", "deployment"],
    "backend": ["python", "git", "api", "fastapi", "sql", "databases"],
    "web developer": ["html", "css", "javascript", "react", "api"],
    "web application": ["html", "css", "javascript", "react", "api"],
    "web app": ["html", "css", "javascript", "react", "api"],
    "frontend": ["html", "css", "javascript", "react"],
    "product analytics": ["sql", "statistics", "experimentation", "visualization"],
    "deep learning": ["python", "machine learning", "pytorch", "deep learning"],
}
DEFAULT_WEIGHTS = {"goal": .45, "skills": .12, "difficulty": .18, "quality": .13, "readiness": .12}
_STORED = {}

def goal_skills(goal: str, catalog: list[dict]) -> list[str]:
    text = goal.lower().strip()
    if not text:
        return []
    match = next((skills for phrase, skills in sorted(GOAL_MAP.items(), key=lambda v: -len(v[0])) if phrase in text), None)
    if match:
        return match
    vocabulary = {s for resource in catalog for s in resource["skills"]}
    return [s for s in sorted(vocabulary, key=len, reverse=True) if re.search(r"(?<!\w)" + re.escape(s) + r"(?!\w)", text)][:8]

def _similarity(tags: set, targets: set) -> float:
    return len(tags & targets) / max(1, len(targets))

def _score(row, known, goal, profile, history, weights, feedback):
    skills = set(row["skills"])
    level = LEVEL[row["difficulty"]]
    preferred = LEVEL.get(profile["difficulty"], 0)
    features = {
        "goal": _similarity(skills, goal),
        "skills": _similarity(skills, known),
        "difficulty": 1.0 if level == preferred else (0.75 if level < preferred else 0.0),
        "quality": row["popularity"],
        "readiness": 1.0 if not row["prerequisites"] else len(set(row["prerequisites"]) & known) / len(row["prerequisites"]),
    }
    raw = sum(features[k] * weights[k] for k in weights)
    duplicates = sum(1 for s in skills if history[s] > 0)
    diversity = min(.17, .035 * duplicates)
    # Avoid recommending an intro course that teaches nothing new.
    already_mastered = .28 if skills.issubset(known) else 0.0
    feedback_bonus = max(-.05, min(.05, .025 * feedback.get(row["id"], 0)))
    return round(max(0., min(1., raw - diversity - already_mastered + feedback_bonus)) * 100, 1), features

def _why(row: dict, newly: list[str], target: set[str]) -> str:
    aligned = [s for s in row["skills"] if s in target]
    if aligned:
        focus = ", ".join(aligned[:2])
        return f"Build {focus} with {row['title']}. " + (
            f"Your existing knowledge covers its prerequisites." if row["prerequisites"] else
            "A solid next step with no required prior concepts."
        )
    return f"Develop {', '.join(newly[:2]) or row['skills'][0]} to strengthen the foundations for your goal."

def recommend(profile: dict, catalog: list[dict], feedback: dict | None = None,
              weights: dict | None = None, limit: int = 5) -> dict:
    feedback = feedback or {}
    weights = weights or DEFAULT_WEIGHTS
    limit = max(1, min(7, int(limit)))
    preferred = profile.get("difficulty", "Beginner")
    if preferred not in LEVEL:
        preferred = "Beginner"
    hours_per_week = max(1, min(80, int(profile.get("hours_per_week", 6))))
    profile = {**profile, "difficulty": preferred}
    known = {str(s).lower().strip() for s in profile.get("current_skills", []) if str(s).strip()}
    completed = set(str(s) for s in profile.get("completed_courses", []))
    for row in catalog:
        if row["id"] in completed:
            known.update(row["skills"])
    goal = set(goal_skills(profile.get("goal", ""), catalog))
    history = Counter()
    used = set(completed)
    path = []
    week = 1
    counts = {"difficulty": 0, "prerequisites": 0, "completed": len(completed)}
    for step in range(limit):
        candidates = []
        for row in catalog:
            if row["id"] in used:
                continue
            if LEVEL[row["difficulty"]] > LEVEL[preferred]:
                if step == 0:
                    counts["difficulty"] += 1
                continue
            if not set(row["prerequisites"]).issubset(known):
                if step == 0:
                    counts["prerequisites"] += 1
                continue
            score, breakdown = _score(row, known, goal, profile, history, weights, feedback)
            # Prefer goal-relevant and foundational courses over low-value filler.
            if goal and not (set(row["skills"]) & goal) and not (set(row["skills"]) & known):
                score = max(0., round(score - 15., 1))
            candidates.append((score, row["id"], row, breakdown))
        if not candidates:
            break
        candidates.sort(key=lambda x: (-x[0], x[1]))
        score, _, selected, breakdown = candidates[0]
        used.add(selected["id"])
        new_skills = [s for s in selected["skills"] if s not in known]
        duration = max(1, ceil(selected["hours"] / hours_per_week))
        path.append({
            **selected, "rank": step + 1, "score": score,
            "feature_breakdown": {k: round(v, 3) for k, v in breakdown.items()},
            "why": _why(selected, new_skills, goal),
            "new_skills": new_skills,
            "duration_weeks": duration, "start_week": week,
            "end_week": week + duration - 1,
        })
        week += duration
        known.update(selected["skills"])
        history.update(selected["skills"])
    return {
        "path": path,
        "goal_skills": sorted(goal),
        "total_hours": round(sum(row["hours"] for row in path), 1),
        "estimated_weeks": week - 1,
        "guardrails": {
            "difficulty": "Hard limit: no courses above your selected level",
            "prerequisites": "Every selected course's prerequisites were met before its step",
            "diversity": "Repeated skill topics are downweighted",
            "time": f"Course time is scheduled across {hours_per_week} hours/week",
            "excluded_at_start": counts,
        },
        "catalog_size": len(catalog),
        "data_status": "Curated starter demonstration catalogue; not a downloaded MOOCCube dataset.",
    }

def explain_with_llm(path: list[dict], goal: str) -> list[dict]:
    """Optional Gemini post-hoc prose only; never feeds text into the ranker."""
    if os.getenv("ENABLE_LLM", "false").lower() != "true" or not os.getenv("GEMINI_API_KEY"):
        return path
    key = os.getenv("GEMINI_API_KEY", "")
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    output = []
    for row in path[:3]:
        cache_key = (row["id"], goal[:150])
        if cache_key not in _STORED:
            prompt = (
                "In one sentence explain why this course helps the learner; do not invent any facts. "
                "Only use the given details. Goal: " + goal[:250] +
                "; Course: " + row["title"] + "; skills: " + ", ".join(row["skills"]) +
                "; prerequisites: " + ", ".join(row["prerequisites"])
            )
            payload = json.dumps({"contents": [{"parts": [{"text": prompt}]}],
                                  "generationConfig": {"temperature": 0.2, "maxOutputTokens": 120}}).encode()
            request = Request(
                f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}",
                data=payload, headers={"Content-Type": "application/json"}, method="POST")
            try:
                with urlopen(request, timeout=5) as response:
                    data = json.load(response)
                _STORED[cache_key] = data["candidates"][0]["content"]["parts"][0]["text"].strip()
            except (ValueError, KeyError, IndexError, OSError):
                _STORED[cache_key] = row["why"]
        output.append({**row, "why": _STORED[cache_key]})
    return output + path[3:]
