import catalogue from "../data/resources.json";

/**
 * Browser-only fallback for the portfolio demo.
 * This deliberately does NOT pretend to be a live API or a production model.
 * Data is the same checked-in, manually-curated starter catalogue as the backend.
 */
const LEVEL = { Beginner: 0, Intermediate: 1, Advanced: 2 };
const WEIGHTS = { goal: 0.45, skills: 0.12, difficulty: 0.18, quality: 0.13, readiness: 0.12 };
const SKILLS_FIRST = { goal: 0.25, skills: 0.32, difficulty: 0.18, quality: 0.13, readiness: 0.12 };
const GOAL_FIRST = { goal: 0.65, skills: 0.08, difficulty: 0.12, quality: 0.08, readiness: 0.07 };
const GOAL_MAP = [
  ["data scientist", ["python","statistics","pandas","machine learning","scikit-learn"]],
  ["data science", ["python","statistics","pandas","machine learning","scikit-learn"]],
  ["data analyst", ["sql","excel","python","pandas","visualization"]],
  ["data analysis", ["sql","python","pandas","visualization"]],
  ["machine learning", ["python","statistics","machine learning","scikit-learn"]],
  ["ml engineer", ["python","machine learning","pytorch","mlops","deployment"]],
  ["ai engineer", ["python","machine learning","llm","api","deployment"]],
  ["backend", ["python","git","api","fastapi","sql","databases"]],
  ["web application", ["html","css","javascript","react","api"]],
  ["web app", ["html","css","javascript","react","api"]],
  ["web developer", ["html","css","javascript","react","api"]],
  ["frontend", ["html","css","javascript","react"]],
  ["product analytics", ["sql","statistics","experimentation","visualization"]],
  ["deep learning", ["python","machine learning","pytorch","deep learning"]]
];
const asArray = value => Array.isArray(value) ? value : [];
const normalize = value => String(value || "").trim().toLowerCase();
const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
const round = (value, n = 4) => Number(value.toFixed(n));
const intersects = (one, two) => [...one].some(x => two.has(x));

export function offlineGoalSkills(goal) {
  const text = normalize(goal);
  const matching = [...GOAL_MAP].sort((a,b) => b[0].length - a[0].length).find(([phrase]) => text.includes(phrase));
  if (matching) return matching[1];
  const vocabulary = [...new Set(catalogue.flatMap(r => r.skills))].sort((a,b) => b.length-a.length);
  return vocabulary.filter(skill => text.includes(skill)).slice(0,8);
}

function readVotes() {
  try { return JSON.parse(localStorage.getItem("skillpath.demo-feedback.v1") || "{}"); } catch { return {}; }
}
function writeVote(id, helpful) {
  const votes = readVotes();
  votes[id] = clamp((votes[id] || 0) + (helpful ? 1 : -1), -100, 100);
  try { localStorage.setItem("skillpath.demo-feedback.v1", JSON.stringify(votes)); } catch {}
}

export function offlineRecommend(profile, limit = 5, weights = null, useFeedback = true) {
  if (!profile?.goal || normalize(profile.goal).length < 3) throw new Error("Enter a learning goal with at least 3 characters.");
  if (!(profile.difficulty in LEVEL)) throw new Error("Choose Beginner, Intermediate, or Advanced.");
  const weekHours = clamp(Number(profile.hours_per_week) || 6, 1, 80);
  const goal = new Set(offlineGoalSkills(profile.goal));
  const mastered = new Set(asArray(profile.current_skills).map(normalize).filter(Boolean));
  const completed = new Set(asArray(profile.completed_courses));
  for (const course of catalogue) if (completed.has(course.id)) course.skills.forEach(s => mastered.add(s));
  const history = {};
  const used = new Set(completed);
  const path = [];
  const factors = weights || (profile.mode === "similar" ? SKILLS_FIRST : WEIGHTS);
  const votes = useFeedback ? readVotes() : {};
  let startWeek = 1;
  const excluded = {difficulty: 0, prerequisites: 0, completed: completed.size};
  for (let step = 0; step < clamp(limit,1,7); step++) {
    const candidates = [];
    for (const course of catalogue) {
      if (used.has(course.id)) continue;
      if (LEVEL[course.difficulty] > LEVEL[profile.difficulty]) {
        if (step === 0) excluded.difficulty++;
        continue;
      }
      if (!course.prerequisites.every(s => mastered.has(s))) {
        if (step === 0) excluded.prerequisites++;
        continue;
      }
      const tags = new Set(course.skills);
      const overlap = (set) => [...tags].filter(s => set.has(s)).length / Math.max(1, set.size);
      const features = {
        goal: overlap(goal),
        skills: overlap(mastered),
        difficulty: course.difficulty === profile.difficulty ? 1 : 0.75,
        quality: course.popularity,
        readiness: course.prerequisites.length ? course.prerequisites.filter(s => mastered.has(s)).length / course.prerequisites.length : 1,
      };
      const diversity = Math.min(0.17, 0.035 * course.skills.filter(s => history[s]).length);
      const alreadyKnown = course.skills.every(s => mastered.has(s)) ? 0.28 : 0;
      const feedback = clamp(0.025 * (votes[course.id] || 0), -0.05, 0.05);
      const raw = Object.entries(factors).reduce((sum, [name, weight]) => sum + features[name] * weight, 0);
      let score = round(clamp((raw - diversity - alreadyKnown + feedback) * 100, 0, 100), 1);
      if (goal.size && !intersects(tags, goal) && !intersects(tags, mastered)) score = Math.max(0, round(score - 15,1));
      candidates.push({ course, score, features });
    }
    if (!candidates.length) break;
    candidates.sort((a,b) => b.score - a.score || a.course.id.localeCompare(b.course.id));
    const {course,score,features} = candidates[0];
    used.add(course.id);
    const newSkills = course.skills.filter(s => !mastered.has(s));
    const useful = course.skills.filter(s => goal.has(s)).slice(0,2);
    const reason = useful.length
      ? "Build " + useful.join(", ") + " with " + course.title + ". " +
        (course.prerequisites.length ? "Your existing knowledge covers its prerequisites." : "A solid next step with no required prior concepts.")
      : "Develop " + (newSkills.slice(0,2).join(", ") || course.skills[0]) + " to strengthen the foundations for your goal.";
    const duration = Math.max(1, Math.ceil(course.hours / weekHours));
    path.push({
      ...course, rank: step + 1, score,
      feature_breakdown: Object.fromEntries(Object.entries(features).map(([key,value]) => [key, round(value,3)])),
      new_skills: newSkills, why: reason,
      duration_weeks: duration, start_week: startWeek, end_week: startWeek + duration - 1
    });
    startWeek += duration;
    course.skills.forEach(s => { mastered.add(s); history[s] = (history[s] || 0) + 1; });
  }
  return {
    path, goal_skills: [...goal].sort(),
    total_hours: round(path.reduce((sum,r) => sum + r.hours,0),1),
    estimated_weeks: startWeek - 1,
    catalog_size: catalogue.length,
    guardrails: {
      difficulty: "Courses above the selected level are excluded",
      prerequisites: "Prerequisites are checked at every step",
      diversity: "Repeated topics are downweighted",
      time: "Courses are spread across " + weekHours + " hours/week",
      excluded_at_start: excluded
    },
    data_status: "Offline browser demo: curated starter catalogue and heuristic scores. Start the API for server-backed recommendations.",
    engine_mode: "browser-demo"
  };
}

const PERSONAS = [
  {goal:"Become a data scientist",current_skills:["python"],difficulty:"Intermediate",hours_per_week:8,relevant:["stats-foundations","pandas-guide","ml-intro","scikit-guide","data-viz"]},
  {goal:"Become a backend engineer",current_skills:["python","git"],difficulty:"Intermediate",hours_per_week:6,relevant:["api-foundations","fastapi-guide","sql-course","db-design","testing-python"]},
  {goal:"Start learning data analysis",current_skills:[],difficulty:"Beginner",hours_per_week:5,relevant:["python-basics","sql-course","excel-basics","stats-foundations","data-viz"]},
  {goal:"Become a frontend developer",current_skills:["html","css"],difficulty:"Intermediate",hours_per_week:10,relevant:["js-guide","react-docs","accessibility","git-basics","web-fundamentals"]},
  {goal:"Learn machine learning",current_skills:["python","statistics"],difficulty:"Intermediate",hours_per_week:8,relevant:["ml-intro","scikit-guide","pandas-guide","data-viz","model-evaluation"]}
];
const relevantIds = persona => offlineRecommend({...persona,mode:"goal"},7,null,false).path.map(r=>r.id);
function metrics(ids, relevant) {
  const set = new Set(relevant);
  const hits = ids.slice(0,5).map(s => Number(set.has(s)));
  const dcg = hits.reduce((sum,hit,index) => sum + hit / Math.log2(index+2),0);
  const ideal = [...Array(Math.min(5,set.size)).keys()].reduce((sum,index) => sum + 1 / Math.log2(index+2),0);
  const first = ids.findIndex(s => set.has(s));
  return {precision_at_5:hits.reduce((s,v)=>s+v,0)/5,ndcg_at_5:ideal ? dcg/ideal : 0,mrr:first >= 0 ? 1/(first+1) : 0};
}
function averageMetrics(personas, weights) {
  const results = personas.map(persona => {
    const ids = offlineRecommend({...persona,mode:"goal"},7,weights,false).path.map(r=>r.id);
    return metrics(ids,persona.relevant);
  });
  return Object.fromEntries(["precision_at_5","ndcg_at_5","mrr"].map(key => [key,round(results.reduce((s,r)=>s+r[key],0)/results.length)]));
}
let memoizedEvaluation;
function offlineEvaluation() {
  if (memoizedEvaluation) return memoizedEvaluation;
  const baseline = averageMetrics(PERSONAS,WEIGHTS);
  const ablation = Object.keys(WEIGHTS).map(name => {
    const next = {...WEIGHTS,[name]:0};
    const total = Object.values(next).reduce((a,b)=>a+b,0);
    Object.keys(next).forEach(key => next[key] /= total);
    const result = averageMetrics(PERSONAS,next);
    return {feature_removed:name,...result,ndcg_delta:round(result.ndcg_at_5-baseline.ndcg_at_5)};
  });
  // Same fixed pseudo-random stream and relevance-proxy click model for each strategy.
  let seed = 42;
  const rand = () => { seed = (Math.imul(seed,1664525) + 1013904223) >>> 0; return seed/2**32; };
  const clicks = Array.from({length:250},(_,index) => ({persona:PERSONAS[index % PERSONAS.length],roll:rand()}));
  function ctr(weights) {
    const success = clicks.reduce((sum,{persona,roll}) => {
      const ids = offlineRecommend({...persona,mode:"goal"},5,weights,false).path.map(r=>r.id);
      const score = ids.reduce((acc,id,index)=>acc + (persona.relevant.includes(id) ? 1/(index+1) : 0),0);
      return sum + Number(roll < Math.min(0.82,0.08 + 0.20*score));
    },0);
    return round(success/clicks.length);
  }
  const a=ctr(WEIGHTS),b=ctr(GOAL_FIRST);
  memoizedEvaluation={
    methodology:"Offline browser demo: five manually labeled example personas, with a fixed-seed simulation of 250 synthetic assignments. Not real learner data or measured online lift.",
    metrics:baseline,ablation,
    experiments:{
      strategy_a:{name:"Balanced hybrid",simulated_ctr:a},
      strategy_b:{name:"Goal-first",simulated_ctr:b},
      relative_lift_pct:round(a ? (b-a)/a*100 : 0,1),
      samples:250
    },
    segments:["Beginner","Intermediate"].map(segment=>({segment,...averageMetrics(PERSONAS.filter(p=>p.difficulty===segment),WEIGHTS)})),
    engine_mode:"browser-demo"
  };
  return memoizedEvaluation;
}

export function offlineRequest(path, options = {}) {
  const url = new URL(path,"http://skillpath.local");
  const body = options.body ? JSON.parse(options.body) : {};
  switch(url.pathname) {
    case "/health":return {status:"browser-demo",resources:catalogue.length};
    case "/meta":return {
      skills:[...new Set(catalogue.flatMap(c=>c.skills))].sort(),
      categories:[...new Set(catalogue.map(c=>c.category))].sort(),
      resource_count:catalogue.length,
      dataset:"curated-starter-demo-v1",engine_mode:"browser-demo"
    };
    case "/catalog": {
      const q=normalize(url.searchParams.get("q"));
      const category=normalize(url.searchParams.get("category"));
      const difficulty=normalize(url.searchParams.get("difficulty"));
      const resources=catalogue.filter(r=>
        (!q || (r.title+" "+r.description+" "+r.skills.join(" ")).toLowerCase().includes(q))
        && (!category || normalize(r.category)===category)
        && (!difficulty || normalize(r.difficulty)===difficulty));
      return {resources,total:resources.length,engine_mode:"browser-demo"};
    }
    case "/recommend":return offlineRecommend(body.profile,body.limit);
    case "/feedback":{
      if (!catalogue.some(r=>r.id===body.resource_id)) throw new Error("Resource not found");
      writeVote(body.resource_id,Boolean(body.helpful));
      return {saved:true,engine_mode:"browser-demo"};
    }
    case "/evaluation":return offlineEvaluation();
    default:throw new Error("Unknown offline demo endpoint: "+url.pathname);
  }
}
