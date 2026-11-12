import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Clock3, Download, ShieldCheck, GitBranch, Sparkles, CheckCircle2, ThumbsUp, ThumbsDown, Pencil, BookOpen, CalendarDays, Target, Layers3 } from "lucide-react";
import { PageIntro, Tag, EmptyState, StateNotice } from "../components.jsx";
import { api } from "../lib/api.js";

function exportMarkdown(result) {
  const title = "SkillPath — " + result.profile.goal;
  const lines = ["# " + title, "", `Level: ${result.profile.difficulty} | ${result.profile.hours_per_week} hours/week`, `Estimated timeline: ${result.estimated_weeks} weeks`, "", "## Recommended path", ""];
  result.path.forEach((row, i) => {
    lines.push(`### ${i+1}. ${row.title}`, `- Provider: ${row.provider}`, `- URL: ${row.url}`, `- Level: ${row.difficulty}`, `- Duration: ${row.hours} hours, weeks ${row.start_week}–${row.end_week}`, `- Why: ${row.why}`, `- Skills: ${row.skills.join(", ")}`, "");
  });
  lines.push("Demo resources and duration estimates are illustrative, not guarantees.");
  const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = "skillpath-learning-path.md"; anchor.click();
  URL.revokeObjectURL(url);
}

export default function PathPage({ result, onRegenerate }) {
  const [votes, setVotes] = useState({});
  const [voteError, setVoteError] = useState("");
  if (!result?.path?.length) return <main className="app-page"><div className="page-container"><PageIntro eyebrow="YOUR PERSONALIZED ROUTE" title={<>YOUR PATH<br/><em>STARTS HERE.</em></>} description="Build your first learning path to see the resources that fit you best."/><EmptyState title="No path generated yet." description="Tell us about your skills and goals and we'll find a sequence that makes sense." action={{to:"/build",text:"Build my first path"}}/></div></main>;

  async function feedback(id, helpful) {
    setVoteError("");
    try { await api("/feedback", { method: "POST", body: JSON.stringify({ resource_id: id, helpful }) }); setVotes(v => ({ ...v, [id]: helpful ? "up" : "down" })); }
    catch (err) { setVoteError(err.message); }
  }

  return <main className="app-page"><div className="page-container">
    <PageIntro eyebrow="YOUR PERSONALIZED ROUTE" index="03" title={<>YOUR NEXT<br/><em>MOVES.</em></>} description={<>Built around your goal: <strong>{result.profile.goal}</strong>. Every step has a reason.</>}/>
    <div className="path-actionbar"><span><span className="status-dot"/> PATH GENERATED / {new Date(result.created_at || Date.now()).toLocaleDateString()}</span><div><button type="button" className="outline-button" onClick={onRegenerate}><Pencil size={16}/> EDIT PROFILE</button><button type="button" className="dark-button" onClick={()=>exportMarkdown(result)}><Download size={16}/> EXPORT .MD</button></div></div>
    <div className="path-summary"><div><span className="summary-label"><Layers3 size={16}/> YOUR LEARNING PLAN</span><strong>{result.path.length.toString().padStart(2,"0")}<small> STEPS</small></strong></div><div><span className="summary-label"><Clock3 size={16}/> ESTIMATED EFFORT</span><strong>{result.total_hours}<small> HOURS</small></strong></div><div><span className="summary-label"><CalendarDays size={16}/> AT {result.profile.hours_per_week} HRS/WEEK</span><strong>{result.estimated_weeks}<small> WEEKS</small></strong></div></div>
    <div className="path-content"><div className="timeline">
      {result.path.map((row,i) => <article className="path-step" key={row.id}><div className="timeline-rail"><span className="step-count">{String(i+1).padStart(2,"0")}</span><div className="timeline-line"/></div>
        <div className="step-content"><div className="step-kicker"><span>STEP {String(i+1).padStart(2,"0")} / {row.category.toUpperCase()}</span><span className="step-match">{row.score}% FIT SCORE</span></div><h2>{row.title}</h2><div className="step-byline">{row.provider} <span>•</span> {row.difficulty} <span>•</span> {row.hours} estimated hrs</div><p className="step-description">{row.description}</p><div className="step-why"><Sparkles size={16}/><p>{row.why}</p></div><div className="step-bottom"><div className="step-tags">{row.skills.slice(0,4).map(s=><Tag key={s}>{s}</Tag>)}</div><span className="week-label">WEEK{row.start_week === row.end_week ? "" : "S"} {row.start_week}{row.start_week === row.end_week ? "" : "–"+row.end_week}</span></div>
        <div className="step-actions"><a className="step-open" href={row.url} target="_blank" rel="noopener noreferrer">OPEN RESOURCE <ArrowUpRight size={16}/></a><div className="helpful-area"><span>WAS THIS USEFUL?</span><button type="button" aria-label={`Mark ${row.title} helpful`} aria-pressed={votes[row.id]==="up"} className={votes[row.id]==="up"?"vote-active":""} disabled={!!votes[row.id]} onClick={()=>feedback(row.id,true)}><ThumbsUp size={17}/></button><button type="button" aria-label={`Mark ${row.title} not helpful`} aria-pressed={votes[row.id]==="down"} className={votes[row.id]==="down"?"vote-active":""} disabled={!!votes[row.id]} onClick={()=>feedback(row.id,false)}><ThumbsDown size={17}/></button></div></div>
        </div></article>)}
    </div>
      <aside className="path-sidebar"><div className="sidebar-panel"><div className="sidebar-eyebrow"><ShieldCheck size={18}/> GUARDRAILS ACTIVE</div><h3>A route with<br/>a reason.</h3><div className="guardrail-row"><CheckCircle2 size={17}/><div><strong>Difficulty aligned</strong><p>No resources above {result.profile.difficulty.toLowerCase()} level.</p></div></div><div className="guardrail-row"><CheckCircle2 size={17}/><div><strong>Prerequisite ready</strong><p>Required concepts are checked before each step.</p></div></div><div className="guardrail-row"><CheckCircle2 size={17}/><div><strong>Skill diversity</strong><p>Repetitive topics receive a ranking penalty.</p></div></div><div className="guardrail-row"><CheckCircle2 size={17}/><div><strong>Time-aware</strong><p>Effort is spread across {result.profile.hours_per_week} hours per week.</p></div></div></div><div className="sidebar-panel sidebar-goal"><span>YOUR TARGET SKILLS</span><div className="skill-cloud">{result.goal_skills.length ? result.goal_skills.map(s=><Tag key={s}>{s}</Tag>) : <p>Try a more specific learning goal to get targeted skill matching.</p>}</div></div><Link className="sidebar-lab" to="/lab">HOW GOOD IS THE RANKER? <ArrowRight size={18}/></Link></aside>
    </div>
    {voteError && <StateNotice title="Feedback not saved">{voteError}</StateNotice>}
    <div className="data-note">FIT SCORES: heuristic hybrid scores on curated demonstration metadata, not probabilities of success. Feedback is stored as anonymous aggregate votes; experiment results are simulated.</div>
  </div></main>;
}
