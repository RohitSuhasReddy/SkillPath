# SkillPath — Personalized Learning Paths

SkillPath builds explainable 3–7-step course recommendations using topic relevance, goal fit, difficulty, prerequisite metadata where available, available hours, and anonymous feedback.

## What works

- Cinematic dark landing, cursor-driven image parallax, slowly **rotating starfield**, animated original SKILL/PATH wordmark and four scrolling/sticky feature panels.
- Separate pages for Build Your Path, Discover, My Path, and Evaluation Lab.
- Search-first hybrid ranking: TF-IDF n-grams across course title/skills/description, an explicit relevance gate, then difficulty, skill match, quality proxy, prerequisites, diversity and study hours.
- Optional cached Gemini explanations and summary (post-hoc text generation only; never ranking).
- Offline metrics, feature ablation, and seeded simulated A/B experiments. The current evaluation harness uses **5 hand-labelled demonstration personas**, NOT real learner interactions.

## Public course data

**English primary catalog:** [azrai99/coursera-course-dataset](https://huggingface.co/datasets/azrai99/coursera-course-dataset) — a public ~6,650-course metadata snapshot with source-card Apache-2.0 licensing. SkillPath ingests titles, descriptions, skills, organizations, links, difficulty, ratings, schedule estimates.

**Engineering supplement:** six verified public MIT OpenCourseWare resource links, including Signals and Systems (6.003), its introductory lecture series, and Discrete-Time Signal Processing. Skill tags and estimated hours for these rows are project-curated, not official MIT metadata.

**Optional research extension:** [MOOCCubeX](https://github.com/THU-KEG/MOOCCubeX) provides a larger concept/interaction corpus. **MOOCCubeX data has not been imported** in this build; it is Chinese-heavy and much more expensive to process. We don't claim to have it when we don't.

An automated GitHub Actions import downloads the licensed course snapshot, normalizes it, and commits both backend and browser-readable catalogs. See .github/workflows/import-public-catalog.yml and backend/scripts/build_public_catalog.py. To regenerate using your own CSV:

~~~powershell
python backend/scripts/build_public_catalog.py --input .\path\to\coursera_course_2024.csv
~~~

Or run the same command without --input to download it. This is a **one-time ingestion**, not something repeated on every startup.

**Dataset limitations:** Course metadata does not guarantee free access or current availability. Original course prerequisites are frequently missing; SkillPath labels them unknown and never invents them. Topic tags, difficulty, durations and popularity scores can be estimated. Study plans are suggestions, not academic degree advising.

## Start SkillPath on Windows

First-time environment setup (Python 3.10+, Node.js 20+):

~~~powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
cd frontend
npm install
cd ..
~~~

For **all later launches**, from the repo root:

~~~powershell
.\run-dev.ps1
~~~

This starts FastAPI (http://127.0.0.1:8000/docs) and React (http://localhost:5173). The launcher checks installed packages and **does not download them repeatedly**. For the browser-only demo, cd frontend then npm run dev. Browser fallback uses the bundled public catalog after import, or a labelled 31-record demo before import.

## Gemini setup (private API key)

Gemini is available in the backend, but **no live API call is possible until you configure a key**. Create a key at [Google AI Studio](https://aistudio.google.com/apikey), copy backend/.env.example to backend/.env and fill:

~~~dotenv
ENABLE_LLM=true
GEMINI_API_KEY=your_private_key_here
GEMINI_MODEL=gemini-2.5-flash
~~~

Restart FastAPI. The backend loads this .env automatically. NEVER commit or paste your key into the frontend. The backend sends up to 3 ranked course records in one low-temperature Gemini request, caches responses in a local SQLite database, and retains template explanations if unavailable. It does not allow the model to rank or change any course.

## Architecture and evidence

~~~text
Free-text goal + existing skills + time
  → Search index: TF-IDF and domain-specific relevance gate
  → Candidate pool (no irrelevant fillers)
  → Hybrid scoring and prerequisite/difficulty filters
  → Sequential 3–7-step path with weekly duration estimates
  → Optional cached Gemini explanations
  → React user interface + local feedback

Offline Evaluation (5 hand-labelled demo personas):
  → Precision@5, NDCG@5, MRR
  → Feature ablation (goal, skill, difficulty, quality, readiness)
  → Reproducible synthetic A/B comparison
~~~

API: GET /api/health, GET /api/meta, GET /api/catalog (paginated), POST /api/recommend, GET /api/evaluation, POST /api/feedback.

## Test and build

~~~powershell
cd backend
python -m pytest -q
cd ..\frontend
npm run test:unit
npm run build
~~~

GitHub Actions runs the same checks. Tests include **Signals and Systems** relevance regression (no unrelated Docker/Python courses), prerequisite/difficulty constraints, import parsing, and Gemini without a key.

This project intentionally does not scrape paid course platforms, enroll users, or serve course videos.
