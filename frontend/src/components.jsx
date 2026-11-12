import React, { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ArrowRight, MoveUpRight, Sparkles, Check } from "lucide-react";
import { Link } from "react-router-dom";

export function Eyebrow({ children, light = false, index = "01" }) {
  return <span className={`eyebrow ${light ? "eyebrow-light" : ""}`}><span className="eyebrow-dot" /> <span>{index} / {children}</span></span>;
}

export function PillLink({ to, children, light = false, icon = true, className = "" }) {
  const ref = useRef(null);
  const move = (event) => {
    if (!window.matchMedia("(hover:hover) and (prefers-reduced-motion: no-preference)").matches) return;
    const bounds = ref.current.getBoundingClientRect();
    const x = (event.clientX - (bounds.left + bounds.width / 2)) * 0.14;
    const y = (event.clientY - (bounds.top + bounds.height / 2)) * 0.14;
    ref.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };
  const reset = () => { if (ref.current) ref.current.style.transform = "translate3d(0,0,0)"; };
  return <Link ref={ref} to={to} onMouseMove={move} onMouseLeave={reset} className={`pill-link ${light ? "pill-link-light" : ""} ${className}`} data-cursor="OPEN">
    <span>{children}</span>{icon && <span className="pill-link-icon"><ArrowUpRight size={18} /></span>}
  </Link>;
}

export function Cursor() {
  const outer = useRef(null);
  const [label, setLabel] = useState("");
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return;
    const el = outer.current;
    if (!el) return;
    let frame = 0;
    let targetX = -100, targetY = -100;
    let currentX = -100, currentY = -100;
    let active = true;
    const follow = () => {
      currentX += (targetX - currentX) * .23;
      currentY += (targetY - currentY) * .23;
      el.style.transform = `translate3d(${currentX}px,${currentY}px,0) translate(-50%,-50%)`;
      if (active) frame = requestAnimationFrame(follow);
    };
    const onMove = (event) => {
      targetX = event.clientX;
      targetY = event.clientY;
      el.classList.add("cursor-visible");
      const target = event.target.closest?.("[data-cursor]");
      setLabel(target?.dataset.cursor || "");
    };
    const onLeave = () => el.classList.remove("cursor-visible");
    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    frame = requestAnimationFrame(follow);
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);
  return <div className={`custom-cursor ${label ? "cursor-active" : ""}`} ref={outer} aria-hidden="true"><span>{label || "✳"}</span></div>;
}

export function Reveal({ children, className = "", delay = 0 }) {
  const ref = useRef();
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const node = ref.current;
    const obs = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) {
        node.classList.add("is-visible");
        obs.disconnect();
      }
    }, { rootMargin: "0px 0px -50px 0px", threshold: .08 });
    obs.observe(node);
    return () => obs.disconnect();
  }, []);
  return <div ref={ref} className={`reveal is-visible-on-reduced ${className}`} style={{ "--delay": `${delay}ms` }}>{children}</div>;
}

export function LearningArtwork({ variant = "ml", label, compact = false }) {
  const v = variant.toLowerCase();
  return <div className={`artwork artwork-${v} ${compact ? "artwork-compact" : ""}`} aria-label={label || "Abstract learning illustration"}>
    <div className="art-grid" />
    {v === "ml" || v === "machine learning" ? <>
      <div className="art-orb art-orb-one" /><div className="art-orb art-orb-two" />
      <div className="art-satellite" /><span className="art-vertical">MODEL / 001</span>
      <span className="art-symbol">✳</span>
    </> : v === "backend" ? <>
      <div className="art-terminal"><span>→ learning.route()</span><span>200 / OK</span><span>skills = skills + 1</span><span>▮</span></div>
      <span className="art-symbol">{"{ }"}</span>
    </> : v === "data" || v === "data & analytics" ? <>
      <div className="art-chart">{[36, 64, 45, 82, 56, 97, 71].map((height, i) => <span key={i} style={{ height: height + "%" }} />)}</div>
      <span className="art-symbol">↑</span>
    </> : <>
      <div className="art-rings"><span/><span/><span/></div><span className="art-symbol">↗</span>
    </>}
    <div className="art-caption"><span>{label || "NEXT FRONTIER"}</span><ArrowUpRight size={16} /></div>
  </div>;
}

export function PageIntro({ eyebrow, title, description, index = "01" }) {
  return <div className="page-intro"><Eyebrow index={index}>{eyebrow}</Eyebrow><h1>{title}</h1><p>{description}</p></div>;
}

export function StateNotice({ children, title = "Couldn't load this view" }) {
  return <div className="notice" role="alert"><span className="notice-icon">!</span><div><h3>{title}</h3><p>{children}</p></div></div>;
}

export function EmptyState({ title, description, action }) {
  return <div className="empty-state"><Sparkles size={30} /><h3>{title}</h3><p>{description}</p>{action && <Link to={action.to} className="inline-link">{action.text} <ArrowRight size={16}/></Link>}</div>;
}

export function Tag({ children, active, onClick }) {
  if (onClick) return <button type="button" className={`tag tag-button ${active ? "tag-active" : ""}`} aria-pressed={!!active} onClick={onClick}>{active && <Check size={13} />}{children}</button>;
  return <span className="tag">{children}</span>;
}

export function Metric({ value, label, detail }) {
  return <div className="metric"><strong>{value}</strong><span>{label}</span>{detail && <small>{detail}</small>}</div>;
}
