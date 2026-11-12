import CinemaHome from "./pages/CinemaHome.jsx";
import React, { useEffect, useState } from "react";
import { Routes, Route, Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { ArrowUpRight, ArrowRight, Menu, X, Compass, FlaskConical, Route as RouteIcon, Zap, MoveDownRight, MoveRight, CheckCircle2 } from "lucide-react";
import { api, useStoredState } from "./lib/api.js";
import { Cursor, Eyebrow, LearningArtwork, PillLink, Reveal } from "./components.jsx";
import BuildPage from "./pages/BuildPage.jsx";
import DiscoverPage from "./pages/DiscoverPage.jsx";
import PathPage from "./pages/PathPage.jsx";
import LabPage from "./pages/LabPage.jsx";

const DEFAULT_PROFILE = {
  current_skills: ["python"],
  goal: "Become a data scientist",
  difficulty: "Intermediate",
  hours_per_week: 6,
  completed_courses: [],
  mode: "goal"
};
const NAV = [
  { to: "/", text: "Home", end: true },
  { to: "/build", text: "Build a path" },
  { to: "/discover", text: "Discover" },
  { to: "/path", text: "My path" },
  { to: "/lab", text: "Evaluation lab" },
];

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: "auto" }); }, [pathname]);
  return null;
}

function Header() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);
  return <header className="site-header">
    <Link to="/" className="brand" aria-label="SkillPath home"><span className="brand-word">SKILL<span>/</span>PATH</span></Link>
    <nav className={`main-nav ${open ? "main-nav-open" : ""}`} aria-label="Primary navigation">
      {NAV.map(item => <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `nav-item ${isActive ? "nav-item-active" : ""}`}>{item.text}</NavLink>)}
    </nav>
    <div className="header-actions"><Link to="/build" className="header-cta" data-cursor="GO">GET STARTED <ArrowUpRight size={17} /></Link>
      <button type="button" className="mobile-menu" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X size={25}/> : <Menu size={25}/>}</button>
    </div>
  </header>;
}

function Footer() {
  return <footer className="footer"><div className="footer-top"><div><div className="eyebrow"><span className="eyebrow-dot"/> A BETTER WAY TO LEARN</div><h2>MAKE YOUR<br/><em>NEXT MOVE.</em></h2></div><PillLink to="/build">Build my path</PillLink></div>
    <div className="footer-bottom"><Link to="/" className="footer-brand">SKILL<span>/</span>PATH</Link><span>LEARN WITH INTENTION. © 2026 SKILLPATH</span><span>BUILT FOR CURIOUS MINDS ↗</span></div>
  </footer>;
}

function Landing({ resourceCount }) {
  return <main className="landing">
    <Cursor />
    <section className="hero">
      <div className="hero-noise" aria-hidden="true" />
      <div className="hero-topline"><span><span className="live-dot"/> YOUR GROWTH STARTS HERE</span><span>PERSONALIZED LEARNING / 001</span></div>
      <div className="hero-content">
        <div className="hero-copy">
          <span className="hero-kicker">A DIFFERENT KIND OF LEARNING PLATFORM <span>✳</span></span>
          <h1 className="hero-title"><span>LEARN</span><span>WHAT</span><span className="hero-tilt">MATTERS<span className="hero-dot">.</span></span></h1>
          <div className="hero-bottom-row"><p>Less searching. More becoming.<br/>A learning path built around <em>where you are</em> and <em>where you want to go.</em></p><PillLink to="/build">Find your next step</PillLink></div>
        </div>
        <div className="hero-art" aria-label="Learning tracks in data science, backend engineering, and analytics">
          <div className="hero-art-label">PICK A DIRECTION. WE'LL DRAW THE ROUTE.</div>
          <Link to="/discover" className="hero-art-card hero-card-one" data-cursor="EXPLORE"><LearningArtwork variant="ml" label="MACHINE LEARNING" /></Link>
          <Link to="/discover" className="hero-art-card hero-card-two" data-cursor="EXPLORE"><LearningArtwork variant="backend" label="BACKEND SYSTEMS" /></Link>
          <Link to="/discover" className="hero-art-card hero-card-three" data-cursor="EXPLORE"><LearningArtwork variant="data" label="DATA / ANALYTICS" /></Link>
          <div className="hero-art-star" aria-hidden="true">✳</div>
        </div>
      </div>
      <div className="hero-floor"><span>SCROLL TO EXPLORE <MoveDownRight size={17}/></span><span>01 — 03</span><div className="hero-floor-line"/></div>
    </section>
    <div className="marquee" aria-hidden="true"><div className="marquee-inner">DON'T JUST LEARN <span>✳</span> LEARN WITH DIRECTION <span>✳</span> DON'T JUST LEARN <span>✳</span> LEARN WITH DIRECTION <span>✳</span></div></div>
    <section className="story-section">
      <div className="section-inner"><Reveal><Eyebrow index="02">THE IDEA</Eyebrow><h2 className="story-headline">The internet has <span>everything.</span><br/>Your time has <em>limits.</em></h2></Reveal>
      <div className="story-grid">
        <Reveal delay={80}><p className="story-description">SkillPath turns a big, noisy catalogue of learning resources into a clear series of next steps — personalized for your skills, ambition and schedule.</p><PillLink to="/build" light>Design your journey</PillLink></Reveal>
        <Reveal delay={160}><div className="story-features"><div><span>01</span><strong>Tell us where you're headed</strong><p>Set a goal and the skills you already have.</p></div><div><span>02</span><strong>Get an intentional sequence</strong><p>Hybrid ranking and real prerequisite checks.</p></div><div><span>03</span><strong>Understand every pick</strong><p>See the reasoning and the guardrails.</p></div></div></Reveal>
      </div></div>
    </section>
    <section className="tracks-section"><div className="section-inner"><Reveal><div className="tracks-head"><div><Eyebrow index="03">YOUR NEXT FRONTIER</Eyebrow><h2>FOLLOW THE<br/><em>CURIOSITY.</em></h2></div><p>No one-size-fits-all roadmaps. Explore real resources, then build a route that fits you.</p></div></Reveal>
      <div className="tracks-grid"><Reveal><Link to="/discover" className="track-card" data-cursor="EXPLORE"><LearningArtwork variant="ml" label="MACHINE LEARNING"/><div className="track-card-bottom"><div><span>TRACK 001</span><h3>Make machines<br/>think.</h3></div><ArrowUpRight size={28}/></div></Link></Reveal>
      <Reveal delay={100}><Link to="/discover" className="track-card" data-cursor="EXPLORE"><LearningArtwork variant="backend" label="BACKEND ENGINEERING"/><div className="track-card-bottom"><div><span>TRACK 002</span><h3>Build the<br/>backbone.</h3></div><ArrowUpRight size={28}/></div></Link></Reveal>
      <Reveal delay={200}><Link to="/discover" className="track-card" data-cursor="EXPLORE"><LearningArtwork variant="data" label="DATA & ANALYTICS"/><div className="track-card-bottom"><div><span>TRACK 003</span><h3>Find the<br/>signal.</h3></div><ArrowUpRight size={28}/></div></Link></Reveal></div>
      <div className="tracks-bottom"><span>START WITH {resourceCount || "31"} CURATED DEMO RESOURCES</span><Link to="/discover" className="text-arrow">Browse the catalogue <MoveRight size={19}/></Link></div>
    </div></section>
  </main>;
}

export default function App() {
  const [profile, setProfile] = useStoredState("skillpath.profile.v1", DEFAULT_PROFILE);
  const [pathResult, setPathResult] = useStoredState("skillpath.path.v1", null);
  const [meta, setMeta] = useState({ skills: [], categories: [], resource_count: 0 });
  const [metaError, setMetaError] = useState("");
  const navigate = useNavigate();
  const isHome = useLocation().pathname === "/";

  useEffect(() => {
    api("/meta").then(setMeta).catch(err => setMetaError(err.message));
  }, []);

  async function generate(nextProfile, limit) {
    const data = await api("/recommend", { method: "POST", body: JSON.stringify({ profile: nextProfile, limit }) });
    setProfile(nextProfile);
    setPathResult({ ...data, profile: nextProfile, created_at: new Date().toISOString() });
    navigate("/path");
  }

  return <div className="app-shell"><ScrollToTop/>{!isHome && <Header/>}
    <Routes>
      <Route path="/" element={<CinemaHome resourceCount={meta.resource_count} />}/>
      <Route path="/build" element={<BuildPage profile={profile} meta={meta} metaError={metaError} onGenerate={generate}/>}/>
      <Route path="/discover" element={<DiscoverPage meta={meta} profile={profile} setProfile={setProfile}/>}/>
      <Route path="/path" element={<PathPage result={pathResult} onRegenerate={() => navigate("/build")}/>}/>
      <Route path="/lab" element={<LabPage/>}/>
      <Route path="*" element={<div className="not-found"><span>404 / LOST YOUR WAY?</span><h1>Wrong turn.<br/><em>New route.</em></h1><PillLink to="/">Back to home</PillLink></div>}/>
    </Routes>
    <Footer/>
  </div>;
}
