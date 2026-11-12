"""Hybrid learning-path ranking with corpus retrieval, hard topic relevance gate
and sequential prerequisite / difficulty / time guardrails.

The LLM is deliberately absent here: ranking is 100% deterministic.
"""
from __future__ import annotations
from collections import Counter
from functools import lru_cache
from math import ceil
import re

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import normalize

LEVEL = {"Beginner": 0, "Intermediate": 1, "Advanced": 2}
DEFAULT_WEIGHTS = {"goal": .54, "skills": .12, "difficulty": .12, "quality": .12, "readiness": .10}
SKILLS_FIRST = {"goal": .35, "skills": .30, "difficulty": .12, "quality": .12, "readiness": .11}
GOAL_MAP = {
    "data scientist": ["python", "statistics", "pandas", "machine learning", "scikit-learn"],
    "data science": ["python", "statistics", "pandas", "machine learning", "scikit-learn"],
    "data analyst": ["sql", "excel", "python", "pandas", "visualization"],
    "data analysis": ["sql", "statistics", "visualization", "pandas"],
    "machine learning": ["machine learning", "model evaluation", "scikit-learn"],
    "backend": ["api", "fastapi", "sql", "databases", "backend"],
    "web application": ["html", "css", "javascript", "react", "api"],
    "web developer": ["javascript", "react", "html", "css"],
    "frontend": ["javascript", "react", "html", "css"],
    "ai engineer": ["machine learning", "llm", "api", "deployment"],
    "signals and systems": ["signal processing", "fourier transform", "convolution", "lti systems", "laplace transform", "sampling", "z transform"],
    "signal processing": ["signals and systems", "fourier transform", "convolution", "sampling", "digital signal processing", "filter design"],
    "control systems": ["feedback control", "control systems", "linear systems", "state space"],
    "computer networks": ["computer networks", "tcp", "ip", "routing", "network protocols"],
    "digital electronics": ["digital electronics", "logic circuits", "digital systems"],
    "operating systems": ["operating systems", "process scheduling", "memory management"],
}
# Strict domain anchors prevent a "signals and systems" request drifting to
# software systems, general probability, Python, Docker, etc.
DOMAIN_ANCHORS = {
    "signals and systems": ("signal", "fourier", "convolution", "laplace", "z transform", "lti", "dsp", "frequency response"),
    "signal processing": ("signal", "fourier", "convolution", "sampling", "filter", "dsp", "spectrum"),
    "control systems": ("control system", "feedback", "state space", "control theory", "dynamics"),
    "operating systems": ("operating system", "process management", "kernel", "memory management", "scheduling"),
    "computer networks": ("network", "routing", "tcp", "ip protocol", "packet"),
}
STOP = {"a", "an", "the", "of", "for", "course", "courses", "learn", "learning", "study", "want",
        "become", "about", "master", "fundamentals", "basic", "beginner", "advanced", "from", "with"}

def goal_skills(goal: str, catalog: list[dict]) -> list[str]:
    text = goal.casefold().strip()
    phrases = [(key, tags) for key, tags in GOAL_MAP.items() if key in text]
    if phrases:
        return list(max(phrases, key=lambda x: len(x[0]))[1])
    vocabulary = {skill for row in catalog for skill in row.get("skills", ())}
    return [s for s in sorted(vocabulary, key=len, reverse=True)
            if len(s) > 2 and re.search(r"(?<!\w)" + re.escape(s) + r"(?!\w)", text)][:8]

def _domain(goal: str) -> tuple[str, ...] | None:
    text = goal.casefold()
    matches = [(phrase, anchors) for phrase, anchors in DOMAIN_ANCHORS.items() if phrase in text]
    return max(matches, key=lambda v: len(v[0]))[1] if matches else None

def _has_anchor(row: dict, anchors: tuple[str, ...]) -> bool:
    # Only title and skill tags, never broad descriptions, count as evidence
    # for strict engineering domains.
    title = (row.get("title") or "").casefold()
    skills = " ".join(row.get("skills", [])).casefold()
    text = title + " " + skills
    return any(re.search(r"(?<!\w)" + re.escape(anchor) + r"(?!\w)", text)
               for anchor in anchors)

def _document(row: dict) -> str:
    title = row.get("title", "")
    skills = " ".join(row.get("skills", []))
    desc = row.get("description", "")[:1100]
    return ((title + " ") * 4 + (skills + " ") * 2 + desc).strip()

_INDEX = {}
def _corpus_index(catalog: list[dict]):
    # Rebuild if a different imported catalog/version replaces the starter data.
    key = (len(catalog), catalog[0]["id"], catalog[-1]["id"], catalog[0].get("title"))
    if key not in _INDEX:
        vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2),
                                     max_features=90000, sublinear_tf=True, min_df=1)
        matrix = vectorizer.fit_transform([_document(row) for row in catalog])
        _INDEX.clear()
        _INDEX[key] = (vectorizer, normalize(matrix))
    return _INDEX[key]

def _retrieve(goal: str, catalog: list[dict]) -> tuple[list[tuple[float,dict]], dict]:
    if not goal.strip():
        return [], {"matches": 0, "query": goal}
    vocab = goal_skills(goal, catalog)
    query_terms = [word for word in re.findall(r"[a-z0-9]+", goal.lower()) if word not in STOP]
    query = " ".join([goal] * 3 + vocab + [" ".join(query_terms)])
    vectorizer, matrix = _corpus_index(catalog)
    query_vector = vectorizer.transform([query])
    similarities = (matrix @ query_vector.T).toarray().ravel()
    anchors = _domain(goal)
    matched = [(float(score), row) for score, row in zip(similarities, catalog)
               if score >= .045 and (not anchors or _has_anchor(row, anchors))]
    matched.sort(key=lambda pair: (-pair[0], pair[1]["id"]))
    top = matched[0][0] if matched else 0.
    cutoff = max(.055, min(.16, top * .20))
    pool = [(score,row) for score,row in matched if score >= cutoff][:360]
    return pool, {"matches": len(pool), "query": goal, "anchor_filter": bool(anchors),
                  "top_similarity": round(top,4)}

def _score(row, known, goals, relevance, preferred, history, weights, feedback):
    skills = set(row.get("skills", []))
    overlap = len(skills & known) / max(1,len(known))
    features = {
        "goal": min(1., relevance),
        "skills": overlap,
        "difficulty": 1. if row["difficulty"] == preferred else .68,
        "quality": row.get("popularity", .5),
        "readiness": 1. if not row.get("prerequisites") else
            len(set(row["prerequisites"]) & known) / max(1,len(row["prerequisites"])),
    }
    # The goal weight can never be won by generic quality/difficulty alone:
    # retrieval must have passed the semantic/lexical relevance gate first.
    raw = sum(features[k]*weights[k] for k in weights)
    diversity = min(.22, .035*sum(history.get(s,0) for s in skills))
    already_known = .26 if skills and skills.issubset(known) else 0.
    fb = max(-.025,min(.025,.008*feedback.get(row["id"],0)))
    return round(max(0.,min(1.,raw - diversity - already_known + fb))*100,1), features

def recommend(profile: dict, catalog: list[dict], feedback: dict | None = None,
              weights: dict | None = None, limit: int = 5) -> dict:
    if not catalog:
        return {"path":[], "goal_skills":[], "total_hours":0, "estimated_weeks":0,
                "guardrails":{}, "catalog_size":0, "matched_resources":0,
                "no_matches_reason":"No course catalogue has been loaded."}
    preferred = profile.get("difficulty","Beginner")
    if preferred not in LEVEL:
        raise ValueError("Invalid difficulty")
    hours = max(1,min(80,int(profile.get("hours_per_week",6))))
    weights = weights or (SKILLS_FIRST if profile.get("mode") == "similar" else DEFAULT_WEIGHTS)
    feedback = feedback or {}
    known = {str(s).casefold().strip() for s in profile.get("current_skills",[]) if str(s).strip()}
    completed = {str(s) for s in profile.get("completed_courses", [])}
    for row in catalog:
        if row["id"] in completed: known.update(row["skills"])
    targets = set(goal_skills(profile.get("goal",""),catalog))
    pool, retrieval = _retrieve(profile.get("goal",""),catalog)
    used, history, path, week = set(completed), Counter(), [], 1
    excluded = {"difficulty":0,"prerequisites":0,"completed":len(completed)}
    for i in range(max(1,min(7,int(limit)))):
        candidates = []
        for relevance,row in pool:
            if row["id"] in used: continue
            if LEVEL[row["difficulty"]] > LEVEL[preferred]:
                if i==0: excluded["difficulty"]+=1
                continue
            if not set(row["prerequisites"]).issubset(known):
                if i==0: excluded["prerequisites"]+=1
                continue
            score,features = _score(row,known,targets,relevance,preferred,history,weights,feedback)
            candidates.append((score,relevance,row["id"],row,features))
        if not candidates: break
        candidates.sort(key=lambda item:(-item[0],-item[1],item[2]))
        score,relevance,_,selected,features = candidates[0]
        used.add(selected["id"])
        new_skills = [s for s in selected["skills"] if s not in known]
        duration=max(1,ceil(selected["hours"]/hours))
        target_skills=[s for s in selected["skills"] if s in targets]
        why=("Matches your goal through " + ", ".join(target_skills[:2]) + "."
             if target_skills else
             "Relevant to your goal based on the course title, skills, and description.")
        path.append({
            **selected,"rank":i+1,"score":score,"text_relevance":round(relevance,3),
            "feature_breakdown":{k:round(v,3) for k,v in features.items()},
            "why":why,"new_skills":new_skills,
            "duration_weeks":duration,"start_week":week,"end_week":week+duration-1
        })
        week += duration
        known.update(selected["skills"])
        history.update(selected["skills"])
    reason=None
    if not pool:
        reason="No sufficiently relevant learning resources were found for this topic. Try a more specific subject or import an expanded catalogue."
    elif not path:
        reason="Related resources exist, but none satisfy your selected difficulty and known prerequisites. Try Intermediate or add your existing skills."
    summary=("Start with " + path[0]["title"] + ", then build towards " +
             path[-1]["title"] + "." if path else reason)
    return {
        "path":path,"goal_skills":sorted(targets),
        "total_hours":round(sum(row["hours"] for row in path),1),
        "estimated_weeks":week-1,"matched_resources":retrieval["matches"],
        "retrieval":retrieval,"no_matches_reason":reason,
        "path_summary":summary,"explanation_source":"template",
        "catalog_size":len(catalog),
        "guardrails":{
            "difficulty":"No courses above selected level",
            "prerequisites":"Enforced when prerequisite metadata exists; missing metadata is labelled unknown",
            "diversity":"Repeated skill topics are downweighted",
            "time":f"Scheduled at {hours} hours/week",
            "excluded_at_start":excluded,
        },
        "data_status":"Public metadata ranking where available; course difficulty and missing prerequisites may be approximate."
    }
