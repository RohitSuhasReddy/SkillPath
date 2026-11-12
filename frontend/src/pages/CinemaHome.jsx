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
      <div className="cinema-layer cinema-stars" data-depth="11" aria-hidden="true">
        {DOTS.map((dot, index) => <i key={index} style={{ left: dot.x + "%", top: dot.y + "%", width: dot.size, height: dot.size, opacity: dot.opacity }}/>)}
      </div>
      <div className="cinema-photos">{PHOTOS.map((photo, index) => <FloatingPhoto photo={photo} index={index} key={photo.key}/>)}</div>
      <div className="cinema-topbar">
        <Link to="/" className="cinema-logo" aria-label="SkillPath home">SKILL<span>/</span>PATH</Link>
        <button className="cinema-menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="cinema-nav" onClick={() => setMenuOpen(!menuOpen)}><span>/</span> {menuOpen ? "Close" : "Menu"}</button>
        <Link to="/build" className="cinema-session">START YOUR PATH <ArrowUpRight size={17}/></Link>
      </div>
      <div className="cinema-heading cinema-layer" data-depth="8">
        <span className="cinema-micro">LEARNING, REIMAGINED.</span>
        <h1><span>LEARNING</span><span>IN MOTION</span></h1>
        <p>Personalized learning paths for your skills, your goals,<br className="cinema-desktop-break"/> and everything you want to become.</p>
      </div>
      <div className="cinema-bottom"><span>PERSONALIZED PATHS / INTELLIGENT RECOMMENDATIONS</span><a href="#cinema-explore" aria-label="Scroll to explore SkillPath">SCROLL TO EXPLORE <ArrowDown size={15}/></a><span>EST. 2026 — ALWAYS LEARNING</span></div>
      <div id="cinema-nav" className={`cinema-navigation ${menuOpen ? "cinema-navigation-open" : ""}`} aria-hidden={!menuOpen} inert={!menuOpen}>
        <div className="cinema-navigation-top"><span>FIND YOUR DIRECTION</span><button type="button" onClick={() => setMenuOpen(false)} aria-label="Close navigation"><X size={25}/></button></div>
        <nav aria-label="SkillPath navigation">{NAVIGATION.map(item => <Link key={item.to} to={item.to} onClick={() => setMenuOpen(false)}><small>{item.number}</small><span>{item.text}</span><ArrowUpRight size={26}/></Link>)}</nav>
        <div className="cinema-navigation-bottom">CURIOUS MINDS NEVER STAND STILL.</div>
      </div>
    </section>
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
