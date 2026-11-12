import React, { useState } from "react";
import { Check, ArrowRight, ArrowLeft, Clock3, Target, SlidersHorizontal, GraduationCap, Plus, X, Sparkles, LoaderCircle } from "lucide-react";
import { PageIntro, Eyebrow, Tag, StateNotice } from "../components.jsx";

const SUGGESTIONS = [
  "Become a data scientist",
  "Become a backend engineer",
  "Learn machine learning",
  "Build web applications",
  "Start learning data analysis",
  "Become an AI engineer",
];
const FALLBACK_SKILLS = ["python", "sql", "statistics", "javascript", "html", "css", "git", "pandas", "machine learning", "react", "api", "excel", "visualization"];

export default function BuildPage({ profile, meta, metaError, onGenerate }) {
  const [draft, setDraft] = useState({ ...profile });
  const [customSkill, setCustomSkill] = useState("");
  const [limit, setLimit] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = (key, value) => setDraft(old => ({ ...old, [key]: value }));
  const toggleSkill = (skill) => set("current_skills", draft.current_skills.includes(skill)
    ? draft.current_skills.filter(s => s !== skill)
    : [...draft.current_skills, skill]);
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try { await onGenerate(draft, limit); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };
  const skills = Array.from(new Set([...FALLBACK_SKILLS, ...meta.skills])).sort().slice(0, 120);
  return <main className="app-page page-build">
    <div className="page-container">
      <PageIntro eyebrow="THE STARTING POINT" index="01" title={<>LET'S MAP<br/><em>YOUR NEXT.</em></>} description="No endless questionnaire. Just the essentials we need to make the next step count."/>
      <div className="builder-layout">
        <form id="path-form" className="builder-form" onSubmit={submit}>
          <section className="form-section"><div className="form-number">01</div><div className="form-body"><div className="form-title"><Target size={22}/><h2>Where do you want to go?</h2></div><p>Set a direction. You can change it whenever you want.</p><label htmlFor="goal" className="field-label">MY LEARNING GOAL</label><input id="goal" className="text-input goal-input" value={draft.goal} maxLength={250} minLength={3} required placeholder="e.g. Become a data scientist" onChange={e => set("goal", e.target.value)}/>
          <div className="suggestions"><span>QUICK STARTS</span><div>{SUGGESTIONS.map(s => <button type="button" key={s} onClick={() => set("goal", s)} className={draft.goal === s ? "suggestion suggestion-active" : "suggestion"}>{s} <ArrowRight size={13}/></button>)}</div></div>
          </div></section>
          <section className="form-section"><div className="form-number">02</div><div className="form-body"><div className="form-title"><GraduationCap size={22}/><h2>What do you already know?</h2></div><p>Your existing knowledge helps us avoid repeating the basics.</p><div className="skills-picker">{skills.map(skill => <Tag key={skill} active={draft.current_skills.includes(skill)} onClick={() => toggleSkill(skill)}>{skill}</Tag>)}</div>
          <div className="add-skill"><input className="text-input" aria-label="Add another skill" placeholder="Add a skill that's not listed..." value={customSkill} onChange={e => setCustomSkill(e.target.value)} onKeyDown={e => { if(e.key === "Enter") {e.preventDefault();const skill=customSkill.trim().toLowerCase();if(skill && !draft.current_skills.includes(skill))set("current_skills",[...draft.current_skills,skill]);setCustomSkill("");}}}/><button type="button" className="add-skill-btn" aria-label="Add skill" onClick={() => {const skill=customSkill.trim().toLowerCase();if(skill && !draft.current_skills.includes(skill)) set("current_skills", [...draft.current_skills,skill]);setCustomSkill("");}}><Plus size={19}/></button></div>
          </div></section>
          <section className="form-section"><div className="form-number">03</div><div className="form-body"><div className="form-title"><SlidersHorizontal size={22}/><h2>Set your pace.</h2></div><p>A path that works with your schedule — not against it.</p>
          <label className="field-label">YOUR CURRENT LEVEL</label><div className="segmented-buttons">{["Beginner","Intermediate","Advanced"].map(level => <button type="button" key={level} className={draft.difficulty === level ? "segment segment-active" : "segment"} onClick={() => set("difficulty",level)}>{level}</button>)}</div>
          <div className="range-top"><label className="field-label" htmlFor="hours">HOURS PER WEEK</label><strong>{draft.hours_per_week} <small>HRS</small></strong></div><input id="hours" type="range" min="1" max="30" value={draft.hours_per_week} onChange={e=>set("hours_per_week",Number(e.target.value))}/><div className="range-labels"><span>1 HR / WEEK</span><span>30 HRS / WEEK</span></div>
          <label className="field-label">HOW SHOULD WE RANK?</label><div className="mode-pair"><button type="button" className={draft.mode==="goal"?"mode-card mode-active":"mode-card"} onClick={()=>set("mode","goal")}><strong>Goal-oriented <Check size={15}/></strong><small>Stretch toward the skills you need next</small></button><button type="button" className={draft.mode==="similar"?"mode-card mode-active":"mode-card"} onClick={()=>set("mode","similar")}><strong>Skills-first <Check size={15}/></strong><small>Build on what's already familiar</small></button></div>
          <div className="range-top"><label className="field-label" htmlFor="count">NUMBER OF PATH STEPS</label><strong>{limit} <small>STEPS</small></strong></div><input id="count" type="range" min="3" max="7" value={limit} onChange={e=>setLimit(Number(e.target.value))}/><div className="range-labels"><span>3 STEPS</span><span>7 STEPS</span></div>
          </div></section>
          {error && <StateNotice title="Couldn't generate your path">{error}</StateNotice>}
          <button type="submit" className="big-submit" disabled={loading || !draft.goal.trim()}>{loading ? <><LoaderCircle className="spin" size={20}/> BUILDING YOUR PATH...</> : <>GENERATE MY PATH <ArrowRight size={22}/></>}</button>
        </form>
        <aside className="builder-aside"><div className="aside-inner"><span className="aside-stamp">YOUR JOURNEY / MADE TO FIT</span><div className="aside-orbit"><div className="orbit-1"/><div className="orbit-2"/><span>YOU<br/>↗</span></div><h3>SMALL STEPS.<br/>BIG SHIFTS.</h3><p>We filter by difficulty and prerequisites, order resources by fit, and stretch course durations across your weekly time budget.</p><div className="aside-stats"><span>HYBRID RANKING</span><span>PREREQUISITE CHECKS</span><span>EXPLAINABLE PICKS</span></div></div></aside>
      </div>
      <div className="data-note">DATA NOTE: This version uses a curated demonstration catalogue. Scores and learning durations are illustrative, not guarantees of learning outcomes.</div>
    </div>
  </main>;
}
