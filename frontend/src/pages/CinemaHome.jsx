import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ArrowDown, X } from "lucide-react";
import "../cinema.css";

/**
 * The landing experience is deliberately separate from the utilitarian app UI.
 * Each data-depth layer uses its own GPU-composited transform, driven by ONE
 * eased pointer position. The resting rotations remain on inner card elements.
 */
const PHOTOS = [
  { key: "light", side: "top-left", depth: 33, src: "https://images.unsplash.com/photo-1771320515748-a3b5c65ba9f8?auto=format&fit=crop&w=850&q=85", label: "Creative thinking" },
  { key: "code", side: "top-tiny", depth: 50, src: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=500&q=85", label: "Programming" },
  { key: "study", side: "top-center", depth: 24, src: "https://images.unsplash.com/photo-1456324504439-367cee3b3c32?auto=format&fit=crop&w=520&q=85", label: "Research and ideas" },
  { key: "people", side: "top-right", depth: 46, src: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=950&q=85", label: "Collaborative learning" },
  { key: "concepts", side: "mid-left", depth: 60, src: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=560&q=85", label: "Digital skill building" },
  { key: "research", side: "mid-right", depth: 35, src: "https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=750&q=85", label: "Learning together" },
  { key: "knowledge", side: "lower-left", depth: 47, src: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=650&q=85", label: "Knowledge and books" },
  { key: "building", side: "lower-mid", depth: 68, src: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=480&q=85", label: "Software engineering" },
  { key: "next", side: "lower-right", depth: 39, src: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=950&q=85", label: "Future possibilities" },
];

const NAVIGATION = [
  { to: "/", text: "Home", number: "01" },
  { to: "/build", text: "Build your path", number: "02" },
  { to: "/discover", text: "Discover resources", number: "03" },
  { to: "/path", text: "Your learning path", number: "04" },
  { to: "/lab", text: "Evaluation lab", number: "05" },
];

const DOTS = Array.from({ length: 190 }, (_, index) => {
  // Seeded pseudo-random positions prevent the stars shifting on rerenders.
  const fract = value => value - Math.floor(value);
  return {
    x: 22 + fract(Math.sin(index * 127.1 + 43.9) * 43758.5453) * 56,
    y: 11 + fract(Math.sin(index * 311.7 + 11.3) * 29418.321) * 78,
    opacity: .06 + fract(Math.sin(index * 62.17) * 34632.1) * .27,
    size: index % 9 === 0 ? 3 : index % 4 === 0 ? 2 : 1.1,
  };
});

function useHeroParallax(heroRef) {
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return undefined;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (motion.matches || !pointer.matches) return undefined;
    const layers = Array.from(hero.querySelectorAll("[data-depth]"));
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let frame = 0, running = true;

    function onMove(e) {
      const rect = hero.getBoundingClientRect();
      const nx = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
      const ny = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
      target.x = Math.max(-1, Math.min(1, nx));
      target.y = Math.max(-1, Math.min(1, ny));
    }
    function reset() { target.x = 0; target.y = 0; }
    function animate() {
      // Eased, continuous movement — visual inertia instead of a snapped hover.
      current.x += (target.x - current.x) * .065;
      current.y += (target.y - current.y) * .065;
      for (const layer of layers) {
        const depth = Number(layer.dataset.depth) || 0;
        layer.style.transform = `translate3d(${(-current.x * depth).toFixed(2)}px, ${(-current.y * depth).toFixed(2)}px, 0)`;
      }
      if (running) frame = requestAnimationFrame(animate);
    }
    hero.addEventListener("pointermove", onMove, { passive: true });
    hero.addEventListener("pointerleave", reset);
    window.addEventListener("blur", reset);
    frame = requestAnimationFrame(animate);
    return () => {
      running = false;
      cancelAnimationFrame(frame);
      hero.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerleave", reset);
      window.removeEventListener("blur", reset);
      for (const layer of layers) layer.style.transform = "";
    };
  }, [heroRef]);
}

function FloatingPhoto({ photo, index }) {
  const [broken, setBroken] = useState(false);
  return <div className={`cinema-layer scene-${photo.side}`} data-depth={photo.depth} aria-hidden="true">
    <div className="cinema-photo-wrap" style={{ "--card-index": index }}>
      {broken
        ? <div className={`cinema-photo-fallback fallback-${index % 4}`}><span>{String(index + 1).padStart(2,"0")}</span><span>SKILLPATH / LEARN</span></div>
        : <img src={photo.src} alt="" loading={index < 4 ? "eager" : "lazy"} decoding="async" onError={() => setBroken(true)}/>}
      <div className="cinema-photo-sheen"/>
    </div>
  </div>;
}


const JOURNEY_CARDS = [
  {
    number: "01", category: "THE STARTING POINT",
    heading: ["MADE FOR", "YOU."],
    tagline: "Your experience is the starting line.",
    description: "Tell SkillPath what you already know, what you want to become, and how much time you have. No generic roadmap, no one-size-fits-all plan.",
    image: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1400&q=85",
    alt: "A library of books representing possibilities for learning",
    to: "/build", action: "CREATE YOUR PROFILE"
  },
  {
    number: "02", category: "THE INTELLIGENCE",
    heading: ["RELEVANCE", "FIRST."],
    tagline: "Good recommendations have a reason.",
    description: "A transparent hybrid ranking system matches real skill gaps, learning goals, difficulty and prerequisite readiness. The next resource is chosen for fit, not hype.",
    image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1400&q=85",
    alt: "Computer code and software development work",
    to: "/discover", action: "EXPLORE RESOURCES"
  },
  {
    number: "03", category: "THE ROUTE",
    heading: ["SMALL STEPS.", "BIG SHIFTS."],
    tagline: "Learn in the right order, at your pace.",
    description: "Skills build on skills. Prerequisites, difficulty limits, topic diversity, and weekly time budgets turn a scattered list of courses into a usable path.",
    image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1400&q=85",
    alt: "Students collaborating around a laptop",
    to: "/path", action: "SEE YOUR PATH"
  },
  {
    number: "04", category: "THE EVIDENCE",
    heading: ["MEASURE", "THE MATCH."],
    tagline: "Less guessing. More accountability.",
    description: "Look under the hood with Precision@K, NDCG, feature ablation and simulated A/B comparisons. Clear evaluation, with demo metrics labelled as simulated.",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=85",
    alt: "A laptop used for analysis and technology work",
    to: "/lab", action: "OPEN EVALUATION LAB"
  }
];

function useScrollWork() {
  const stageRef = useRef(null);
  useEffect(() => {
    const node = stageRef.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const cards = Array.from(node.querySelectorAll(".cinema-work-card"));
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      for (const card of cards) {
        const rect = card.getBoundingClientRect();
        const approaching = Math.max(0, Math.min(1,(vh * 1.14 - rect.top) / (vh * .7)));
        const retreat = Math.max(0, Math.min(1,(vh*.1 - rect.bottom) / (vh * .55)));
        card.style.setProperty("--arrival",approaching.toFixed(3));
        card.style.setProperty("--leaving",retreat.toFixed(3));
      }
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };
    window.addEventListener("scroll",schedule,{passive:true});
    window.addEventListener("resize",schedule);
    update();
    return () => {
      window.removeEventListener("scroll",schedule);
      window.removeEventListener("resize",schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  },[]);
  return stageRef;
}

function WorkSequence() {
  const stageRef = useScrollWork();
  return <section className="cinema-work" id="cinema-approach" aria-label="How SkillPath works">
    <div className="cinema-work-intro"><span className="cinema-work-index">02 / OUR APPROACH</span>
      <h2>THE <span>WAY</span><br/>FORWARD.</h2>
      <p>A thoughtful route from where you are to where you want to be.</p>
    </div>
    <div className="cinema-work-stack" ref={stageRef}>
      {JOURNEY_CARDS.map((card, index) => <article className="cinema-work-card" key={card.number} style={{"--stack-index": index,"zIndex": index+1}}>
        <div className="cinema-work-picture">
          <img src={card.image} alt={card.alt} loading="lazy" />
          <div className="cinema-work-photo-number">SKILLPATH / {card.number}</div>
        </div>
        <div className="cinema-work-content">
          <div className="cinema-work-small"><span>/</span> {card.number} — {card.category}</div>
          <div className="cinema-work-content-body">
            <h3><span>{card.heading[0]}</span><span>{card.heading[1]}</span></h3>
            <strong>{card.tagline}</strong>
            <p>{card.description}</p>
            <Link className="cinema-work-link" to={card.to}>{card.action}<ArrowUpRight size={18}/></Link>
          </div>
          <div className="cinema-work-step">A CLEARER WAY TO LEARN. <span>{card.number} / 04</span></div>
        </div>
      </article>)}
    </div>
  </section>;
}

export default function CinemaHome({ resourceCount }) {
  const heroRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  useHeroParallax(heroRef);
  useEffect(() => {
    const escape = e => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, []);
  useEffect(() => { document.body.style.overflow = menuOpen ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [menuOpen]);
  return <main className="cinema-home">
    <section ref={heroRef} className="cinema-hero" aria-label="Welcome to SkillPath">
      <div className="cinema-vignette"/>
      <div className="cinema-layer cinema-stars" data-depth="11" aria-hidden="true"><div className="cinema-starfield-rotor">
        {DOTS.map((dot, index) => <i key={index} style={{ left: dot.x + "%", top: dot.y + "%", width: dot.size, height: dot.size, opacity: dot.opacity }}/>)}
      </div></div>
      <div className="cinema-photos">{PHOTOS.map((photo, index) => <FloatingPhoto photo={photo} index={index} key={photo.key}/>)}</div>
      <div className="cinema-topbar">
        <Link to="/" className="cinema-logo" aria-label="SkillPath home"><span className="cinema-logo-part">SKILL</span><span className="cinema-logo-slash">/</span><span className="cinema-logo-part">PATH</span><i className="cinema-logo-shine"/></Link>
        <button className="cinema-menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="cinema-nav" onClick={() => setMenuOpen(!menuOpen)}><span>/</span> {menuOpen ? "Close" : "Menu"}</button>
        <Link to="/build" className="cinema-session">START YOUR PATH <ArrowUpRight size={17}/></Link>
      </div>
      <div className="cinema-heading cinema-layer" data-depth="8">
        <span className="cinema-micro">LEARNING, REIMAGINED.</span>
        <h1><span>LEARNING</span><span>IN MOTION</span></h1>
        <p>Personalized learning paths for your skills, your goals,<br className="cinema-desktop-break"/> and everything you want to become.</p>
      </div>
      <div className="cinema-bottom"><span>PERSONALIZED PATHS / INTELLIGENT RECOMMENDATIONS</span><a href="#cinema-approach" aria-label="Scroll to discover the SkillPath approach">SCROLL TO EXPLORE <ArrowDown size={15}/></a><span>EST. 2026 — ALWAYS LEARNING</span></div>
      <div id="cinema-nav" className={`cinema-navigation ${menuOpen ? "cinema-navigation-open" : ""}`} aria-hidden={!menuOpen} inert={!menuOpen}>
        <div className="cinema-navigation-top"><span>FIND YOUR DIRECTION</span><button type="button" onClick={() => setMenuOpen(false)} aria-label="Close navigation"><X size={25}/></button></div>
        <nav aria-label="SkillPath navigation">{NAVIGATION.map(item => <Link key={item.to} to={item.to} onClick={() => setMenuOpen(false)}><small>{item.number}</small><span>{item.text}</span><ArrowUpRight size={26}/></Link>)}</nav>
        <div className="cinema-navigation-bottom">CURIOUS MINDS NEVER STAND STILL.</div>
      </div>
    </section>
    <WorkSequence/>
    <section id="cinema-explore" className="cinema-explore">
      <div className="cinema-explore-head"><span>01 / THE NEXT CHAPTER</span><h2>Less searching.<br/><em>More becoming.</em></h2><p>Tell us where you're headed. We'll connect the skills, prerequisites and resources into a path that fits your life — not somebody else's.</p></div>
      <div className="cinema-explore-links">
        <Link to="/build"><span>01 / MAKE A PLAN</span><strong>Build your learning path.</strong><ArrowUpRight size={31}/></Link>
        <Link to="/discover"><span>02 / GET INSPIRED</span><strong>Explore {resourceCount || 31} learning resources.</strong><ArrowUpRight size={31}/></Link>
        <Link to="/lab"><span>03 / SEE THE SCIENCE</span><strong>Inside the recommendation engine.</strong><ArrowUpRight size={31}/></Link>
      </div>
      <p className="cinema-explore-note">STARTER RESOURCES AND EVALUATION ARE DEMONSTRATION DATA — NOT OBSERVED LEARNER PERFORMANCE.</p>
    </section>
  </main>;
}
