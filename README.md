# SkillPath

**Learn what matters next.** SkillPath turns a learning goal, your existing skills, and a weekly time budget into a practical 3–7-step course plan.

Built with **React + FastAPI**, a search-first hybrid ranker, optional **Gemini explanations**, and an offline evaluation lab.

## What's inside

| Page | What you can do |
| --- | --- |
| **Home** | Explore the dark, motion-led landing page |
| **Build a path** | Enter your goal, current skills, level, and study hours |
| **Discover** | Search and filter **6,651** course records |
| **My path** | See ranked courses, reasoning, prerequisites where known, and weekly pacing |
| **Evaluation lab** | Compare Precision@5, NDCG@5, MRR, ablations, and simulated A/B results |

The ranker retrieves topic-relevant courses *before* applying difficulty, skill match, quality, and other guardrails. If no suitable matches exist, it says so rather than recommending unrelated subjects.

## Run locally

Requires **Python 3.10+**, **Node.js 20+**, and Windows PowerShell.

**First time only** — run these from the repository root:

```powershell
git clone https://github.com/RohitSuhasReddy/SkillPath.git
cd SkillPath

python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt

cd frontend
npm install
cd ..
```

**Everyday launch** — from the SkillPath folder:

```powershell
.\run-dev.ps1
```

The launcher opens **FastAPI** and **Vite** in separate terminals using your existing dependencies. It doesn't reinstall anything.

- **App:** http://localhost:5173
- **API docs:** http://127.0.0.1:8000/docs

To run *just* the frontend, use `cd frontend; npm run dev`. If the API is offline, SkillPath switches to a **labeled browser demo**; Gemini won't run in that mode.

## Gemini (optional)

Gemini writes short explanations for the **already-ranked** courses. It never decides their scores or order. To enable it:

```powershell
if (!(Test-Path backend\.env)) { Copy-Item backend\.env.example backend\.env }
notepad backend\.env
```

Set these values in `backend/.env`:

```dotenv
ENABLE_LLM=true
GEMINI_API_KEY=your_private_key
GEMINI_MODEL=gemini-2.5-flash
```

Get a key from [Google AI Studio](https://aistudio.google.com/apikey), then restart the backend. The key stays on the server; `.env` is ignored by Git. Without a key, the app uses deterministic explanations.

## Data and evaluation

- **6,645 course records:** [English Coursera metadata snapshot](https://huggingface.co/datasets/azrai99/coursera-course-dataset) (2024).
- **6 engineering resources:** [MIT OpenCourseWare](https://ocw.mit.edu/) links, including Signals and Systems.
- **Source details:** [dataset provenance](backend/data/SOURCES.md).

The dataset is bundled with the repo. To rebuild it from the public source **only when needed**:

```powershell
python backend/scripts/build_public_catalog.py
```

Course availability, prices, prerequisites, and durations are not always verified in the source metadata. The evaluation lab uses **five labeled demo profiles and simulated interactions**—not real learner outcomes. MOOCCubeX is *not* imported.

## Tests

```powershell
cd backend
python -m pytest -q
cd ../frontend
npm run test:unit
npm run build
```

GitHub Actions checks both sides of the app. For a quick API check, open `http://127.0.0.1:8000/api/health`.

---

SkillPath is a **portfolio/research prototype** for recommendation systems, ranking, evaluation, and explainability—not a course hosting platform.
