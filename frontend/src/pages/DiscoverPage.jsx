import React, { useEffect, useState } from "react";
import { Search, ArrowUpRight, ArrowRight, CheckCircle2, BookOpen, Clock3, SlidersHorizontal, X, RefreshCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { PageIntro, LearningArtwork, Tag, StateNotice, EmptyState } from "../components.jsx";

function artFor(category) {
  if (category === "Machine Learning" || category === "AI Engineering" || category === "MLOps") return "ml";
  if (category === "Backend") return "backend";
  if (category === "Data & Analytics") return "data";
  return "other";
}

export default function DiscoverPage({ meta, profile, setProfile }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [difficulty, setDifficulty] = useState("All");
  const [resources, setResources] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (category !== "All") params.set("category", category);
    if (difficulty !== "All") params.set("difficulty", difficulty);
    api("/catalog?" + params.toString()).then(data => {
      if (active) { setResources(data.resources); setLoading(false); }
    }).catch(e => { if (active) { setError(e.message); setLoading(false); } });
    return () => { active = false; };
  }, [query, category, difficulty]);

  const completed = new Set(profile.completed_courses || []);
  function toggleCompleted(id) {
    const next = completed.has(id) ? [...completed].filter(v => v !== id) : [...completed, id];
    setProfile(old => ({...old, completed_courses: next}));
  }

  return <main className="app-page"><div className="page-container">
    <PageIntro eyebrow="THE RESOURCE LIBRARY" index="02" title={<>FEED YOUR<br/><em>CURIOSITY.</em></>} description="A curated set of learning resources to explore. Each one is tagged for skills, level and effort."/>
    <div className="catalogue-toolbar"><label className="search-box"><Search size={19}/><input placeholder="Search topics, skills, or resources..." aria-label="Search resources" value={query} onChange={e=>setQuery(e.target.value)}/>{query && <button onClick={()=>setQuery("")} title="Clear search" aria-label="Clear search"><X size={16}/></button>}</label><label className="filter-select"><SlidersHorizontal size={17}/><select aria-label="Filter difficulty" value={difficulty} onChange={e=>setDifficulty(e.target.value)}>{["All","Beginner","Intermediate","Advanced"].map(s=><option key={s} value={s}>{s === "All" ? "All levels" : s}</option>)}</select></label></div>
    <div className="category-pills">{["All", ...meta.categories].map(item => <button type="button" key={item} aria-pressed={category===item} className={category===item?"category-pill category-pill-active":"category-pill"} onClick={()=>setCategory(item)}>{item}</button>)}</div>
    <div className="result-summary"><span>{loading ? "LOADING LIBRARY" : `${resources.length} RESOURCES FOUND`}</span><span>CURATED STARTER DATASET / V1</span></div>
    {error ? <StateNotice>{error}</StateNotice> : !loading && !resources.length ? <EmptyState title="No matching resources." description="Try a different keyword, level, or category."/> :
    <div className="catalogue-grid">{resources.map((resource, i) => <article className="resource-card" key={resource.id}>
      <div className="resource-cover"><LearningArtwork variant={artFor(resource.category)} label={resource.category.toUpperCase()} compact/><span className="resource-cover-number">{String(i+1).padStart(2,"0")}/</span></div>
      <div className="resource-info"><div className="resource-kicker"><span>{resource.provider}</span><span>{resource.difficulty}</span></div><h2>{resource.title}</h2><p>{resource.description}</p><div className="resource-skills">{resource.skills.slice(0,3).map(s=><Tag key={s}>{s}</Tag>)}</div><div className="resource-meta"><span><Clock3 size={15}/> {resource.hours} estimated hours</span><span><BookOpen size={15}/> {resource.prerequisites.length ? `${resource.prerequisites.length} prereq(s)` : "No prerequisites"}</span></div>
      <div className="resource-actions"><a href={resource.url} target="_blank" rel="noopener noreferrer" className="resource-open">OPEN RESOURCE <ArrowUpRight size={17}/></a><button className={completed.has(resource.id)?"complete-button complete-button-active":"complete-button"} title={completed.has(resource.id)?"Remove completed status":"Mark completed"} aria-pressed={completed.has(resource.id)} onClick={()=>toggleCompleted(resource.id)}><CheckCircle2 size={18}/><span>{completed.has(resource.id)?"Completed":"Mark done"}</span></button></div></div>
    </article>)}</div>}
    <div className="catalogue-bottom"><div><strong>Ready to make it personal?</strong><p>Let the ranking engine pick the next best resources for your exact situation.</p></div><Link className="dark-button" to="/build">BUILD MY PATH <ArrowRight size={18}/></Link></div>
    <div className="data-note">RESOURCE NOTE: This starter library was manually curated and includes estimated hours/popularity proxies. Import a licensed public dataset for research-grade evaluations.</div>
  </div></main>;
}
