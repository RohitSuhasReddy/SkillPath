"""Transparent synthetic/proxy offline evaluation; not a real online experiment."""
from __future__ import annotations
import math
import random
from statistics import mean
from .ranker import DEFAULT_WEIGHTS, recommend

# Hand-labeled relevance lists for demo personas; deliberately distinct from ranker scores.
PERSONAS = [
    {"goal": "Become a data scientist", "current_skills": ["python"], "difficulty": "Intermediate", "hours_per_week": 8,
     "relevant": ["stats-foundations", "pandas-guide", "ml-intro", "scikit-guide", "data-viz"]},
    {"goal": "Become a backend engineer", "current_skills": ["python", "git"], "difficulty": "Intermediate", "hours_per_week": 6,
     "relevant": ["api-foundations", "fastapi-guide", "sql-course", "db-design", "testing-python"]},
    {"goal": "Start learning data analysis", "current_skills": [], "difficulty": "Beginner", "hours_per_week": 5,
     "relevant": ["python-basics", "sql-course", "excel-basics", "stats-foundations", "data-viz"]},
    {"goal": "Become a frontend developer", "current_skills": ["html", "css"], "difficulty": "Intermediate", "hours_per_week": 10,
     "relevant": ["js-guide", "react-docs", "accessibility", "git-basics", "web-fundamentals"]},
    {"goal": "Learn machine learning", "current_skills": ["python", "statistics"], "difficulty": "Intermediate", "hours_per_week": 8,
     "relevant": ["ml-intro", "scikit-guide", "pandas-guide", "data-viz", "model-evaluation"]},
]

def _metrics(ids: list[str], relevant: list[str], k: int = 5) -> dict:
    ranked = ids[:k]
    relevant_set = set(relevant)
    hits = [int(v in relevant_set) for v in ranked]
    dcg = sum(hit / math.log2(pos + 2) for pos, hit in enumerate(hits))
    ideal = sum(1 / math.log2(pos + 2) for pos in range(min(k, len(relevant_set))))
    rank = next((i + 1 for i, v in enumerate(ids) if v in relevant_set), None)
    return {
        "precision_at_5": sum(hits) / k,
        "ndcg_at_5": dcg / ideal if ideal else 0.,
        "mrr": 1 / rank if rank else 0.,
    }

def _evaluate_variant(catalog: list[dict], weights=None):
    records = []
    for persona in PERSONAS:
        profile = {k: v for k, v in persona.items() if k != "relevant"}
        ids = [r["id"] for r in recommend(profile, catalog, weights=weights, limit=7)["path"]]
        records.append(_metrics(ids, persona["relevant"]))
    return {key: round(mean(row[key] for row in records), 4) for key in records[0]}

def report(catalog: list[dict]) -> dict:
    baseline = _evaluate_variant(catalog)
    ablation = []
    for feature in DEFAULT_WEIGHTS:
        weights = dict(DEFAULT_WEIGHTS)
        weights[feature] = 0
        total = sum(weights.values())
        weights = {k: v / total for k, v in weights.items()}
        metrics = _evaluate_variant(catalog, weights)
        ablation.append({"feature_removed": feature, **metrics,
                         "ndcg_delta": round(metrics["ndcg_at_5"] - baseline["ndcg_at_5"], 4)})
    # Fixed random seed; same synthetic scenarios, common random numbers across strategies.
    rng = random.Random(42)
    scenarios = [PERSONAS[i % len(PERSONAS)] for i in range(250)]
    noise = [rng.random() for _ in scenarios]
    goal_first = {"goal": .65, "skills": .08, "difficulty": .12, "quality": .08, "readiness": .07}
    def simulated_ctr(weights):
        clicks = []
        for persona, roll in zip(scenarios, noise):
            ids = [r["id"] for r in recommend(persona, catalog, weights=weights, limit=5)["path"]]
            relevance = sum(1 / (i + 1) for i, rid in enumerate(ids) if rid in persona["relevant"])
            p = min(.82, .08 + .20 * relevance)
            clicks.append(int(roll < p))
        return round(mean(clicks), 4)
    a = simulated_ctr(DEFAULT_WEIGHTS)
    b = simulated_ctr(goal_first)
    return {
        "methodology": "Proxy relevance labels for 5 manually specified demo personas; simulated A/B over 250 synthetic assignments using a fixed seed. Not real learner interaction data or causal evidence.",
        "metrics": baseline, "ablation": ablation,
        "experiments": {"strategy_a": {"name": "Balanced hybrid", "simulated_ctr": a},
                        "strategy_b": {"name": "Goal-first", "simulated_ctr": b},
                        "relative_lift_pct": round(((b - a) / a * 100) if a else 0., 1),
                        "samples": 250},
        "segments": [
            {"segment": "Beginner", **_evaluate_segment(catalog, "Beginner")},
            {"segment": "Intermediate", **_evaluate_segment(catalog, "Intermediate")},
        ],
    }

def _evaluate_segment(catalog, difficulty):
    personas = [p for p in PERSONAS if p["difficulty"] == difficulty]
    rows = [_metrics([r["id"] for r in recommend(p, catalog, limit=7)["path"]], p["relevant"]) for p in personas]
    return {key: round(mean(row[key] for row in rows), 4) for key in rows[0]}
