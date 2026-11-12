# SkillPath ↗

**Find the next thing worth learning.** A multi-page, motion-forward learning-path recommender powered by an explainable hybrid ranking engine, hard prerequisite/difficulty guardrails, and a transparent offline evaluation lab.

## What it does

- **Landing:** editorial typography, magnetic CTAs, floating topic artwork, custom cursor (desktop) and reduced-motion fallbacks.
- **Build a path:** choose existing skills, goal, level, available hours per week, ranking mode, and 3–7 steps.
- **Discover:** search/filter the starter catalogue, open public learning resources, mark courses completed.
- **My path:** dynamically sequenced prerequisites, per-course fit breakdown, time-aware week ranges, explanations, feedback, Markdown export.
- **Evaluation lab:** synthetic proxy Precision@5 / NDCG@5 / MRR, feature ablation, segment analysis, and fixed-seed simulated A/B comparison.

**Design reference:** [Made to Disrupt](https://madetodisrupt.com/#work). The site was unavailable to automated inspection during the first implementation, so the reference-inspired palette/type live in `frontend/src/styles.css` and can be visually calibrated. No reference artwork, code, or animations are copied. Hero illustrations are SkillPath-specific CSS artwork.

## Tech stack

React 18 + Vite / CSS + Lucide icons → FastAPI + Pydantic → Python rule-aware hybrid scoring → local JSON catalogue + SQLite anonymous feedback. Gemini is **optional and post-ranking only**.

## Run locally (first time)

Prerequisites: **Python 3.10+** and **Node.js 20+**. From the cloned repo root, in PowerShell:

```powershell
git clone https://github.com/RohitSuhasReddy/SkillPath.git
cd SkillPath
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

Open a **second terminal** at the repo root:

```powershell
cd frontend
npm install
npm run dev
```

Visit **http://localhost:5173**. API interactive docs: **http://localhost:8000/docs**.

On macOS/Linux, activate with `source .venv/bin/activate` instead.

### Later runs

Terminal 1:

```powershell
cd SkillPath
.\.venv\Scripts\Activate.ps1
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

Terminal 2:

```powershell
cd SkillPath/frontend
npm run dev
```

`npm install` and `pip install` are only needed again when dependencies change.

## Architecture

```text
Profile + goal + completed courses
             |
     Resource catalogue
             |
Skill/goal + difficulty + quality + readiness features
             |
  Hybrid scorer + hard guardrails
  (difficulty, prereqs, diversity)
             |
    Sequential 3–7-step plan
       + weekly schedule
             |
 Optional Gemini explanation
      (never changes scores)
             |
  React app → path + feedback
             |
Offline metrics / ablation / synthetic A/B
```

### API routes

| Route | Purpose |
|---|---|
| `GET /api/health` | API/catalogue status |
| `GET /api/meta` | Skills/categories |
| `GET /api/catalog` | Filterable resources |
| `POST /api/recommend` | Ranked learning path |
| `POST /api/feedback` | Aggregate useful/not-useful vote |
| `GET /api/evaluation` | Offline synthetic metrics |

## Data honesty and importing real datasets

The included **31 resources are a manually curated demo catalogue** pointing at free learning materials. Estimated course durations and popularity proxies are illustrative; **these are not MOOCCube, MOOCCubeX, or Kaggle data**. Metrics use manually specified proxy relevance labels for five demo personas, **not real users**. A/B results use 250 seeded synthetic assignments and **are not causal/production lift estimates**.

To import a licensed, attributed CSV with columns `id,title,description,provider,url,category,difficulty,hours,skills,prerequisites,popularity`:

```powershell
cd backend
python scripts/import_catalog.py path/to/resources.csv data/imported.json
$env:SKILLPATH_CATALOG="data/imported.json"
python -m uvicorn app.main:app --reload --port 8000
```

Skill lists can be comma- or pipe-separated. Import only files whose license permits use, and maintain attribution in `backend/data/SOURCES.md`. For serious offline evaluation replace demo relevance labels with held-out real interactions/labels.

## Optional explanations with Gemini

With backend terminal active, set:

```powershell
$env:ENABLE_LLM="true"
$env:GEMINI_API_KEY="your_key_here"
$env:GEMINI_MODEL="gemini-2.5-flash"
```

Restart the API. Without a key, SkillPath displays deterministic explanations and all ranking functionality still works. No API key is sent to the browser, and key files are gitignored.

## Checks

```powershell
cd backend
python -m pytest -q
cd ../frontend
npm run build
```

The pipeline runs these checks on GitHub pushes. This is a **portfolio/research prototype**, not a complete learning management system: no scraped paid catalogues, authentication, payments, or course player.
