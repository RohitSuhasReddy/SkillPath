import React, { useEffect, useState } from "react";
import { FlaskConical, ArrowUpRight, ArrowRight, Activity, BarChart3, GitCompareArrows, ShieldCheck, Info, RefreshCcw } from "lucide-react";
import { api } from "../lib/api.js";
import { PageIntro, StateNotice } from "../components.jsx";

const human = key => ({precision_at_5:"Precision@5",ndcg_at_5:"NDCG@5",mrr:"MRR"}[key] || key);
function PercentBar({ value, max = 1, variant = "" }) {
  return <div className={`percent-bar ${variant}`}><span style={{ width: Math.max(0, Math.min(100, value / max * 100)) + "%" }}/></div>;
}

export default function LabPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState("ndcg_at_5");
  const load = () => {setLoading(true);setError("");api("/evaluation").then(setData).catch(e=>setError(e.message)).finally(()=>setLoading(false));};
  useEffect(load, []);
  return <main className="app-page"><div className="page-container">
    <PageIntro eyebrow="BEHIND THE RECOMMENDATIONS" index="04" title={<>PROVE THE<br/><em>PROGRESS.</em></>} description="A transparent look at how our ranking strategies compare — with reproducible proxy evaluations."/>
    <div className="lab-disclosure"><Info size={21}/><div><strong>Research sandbox, not a production experiment.</strong><p>Metrics use 5 manually labeled demo personas. The A/B comparison simulates 250 assignments with a fixed random seed. These are not real users, observed clicks, or causal uplift.</p></div></div>
    {loading && <div className="loading-lab">RUNNING OFFLINE EVALUATIONS<span className="loading-dots">...</span></div>}
    {error && <StateNotice>{error}<button className="retry" type="button" onClick={load}><RefreshCcw size={16}/> Retry</button></StateNotice>}
    {data && <>
      <div className="lab-metrics">{Object.entries(data.metrics).map(([key,value])=><div className="lab-metric" key={key}><div className="lab-metric-label">{human(key)} <Activity size={17}/></div><strong>{value.toFixed(3)}</strong><PercentBar value={value}/><small>PROXY RELEVANCE / HIGHER IS BETTER</small></div>)}</div>
      <section className="lab-section"><div className="lab-section-title"><div><span>01 / FEATURE ABLATION</span><h2>What actually<br/><em>moves the score?</em></h2></div><p>Remove one ranking signal at a time to see how average relevance changes.</p></div>
      <div className="ablation-panel"><div className="ablation-toolbar"><strong>RANKING SIGNAL CONTRIBUTION</strong><div className="metric-switch">{["ndcg_at_5","precision_at_5","mrr"].map(key=><button type="button" key={key} className={metric===key?"metric-switch-active":""} onClick={()=>setMetric(key)}>{human(key)}</button>)}</div></div>
      <div className="ablation-chart"><div className="ablation-row"><span>FULL HYBRID MODEL</span><PercentBar value={data.metrics[metric]}/><strong>{data.metrics[metric].toFixed(3)}</strong></div>{data.ablation.map(row=><div className="ablation-row" key={row.feature_removed}><span>WITHOUT {row.feature_removed.toUpperCase()}</span><PercentBar value={row[metric]} variant="percent-muted"/><strong>{row[metric].toFixed(3)}</strong></div>)}</div></div>
      </section>
      <section className="lab-section"><div className="lab-section-title"><div><span>02 / SIMULATED A/B TEST</span><h2>Two strategies.<br/><em>One question.</em></h2></div><p>Which simulated ranking strategy produces a higher modeled click-through rate?</p></div>
      <div className="experiment-grid"><div className="experiment-card"><span>VARIANT A / BASELINE</span><h3>{data.experiments.strategy_a.name}</h3><strong>{(data.experiments.strategy_a.simulated_ctr*100).toFixed(1)}<small>%</small></strong><PercentBar value={data.experiments.strategy_a.simulated_ctr}/><p>SIMULATED CLICK-THROUGH RATE</p></div><div className="experiment-card experiment-card-accent"><span>VARIANT B / CHALLENGER</span><h3>{data.experiments.strategy_b.name}</h3><strong>{(data.experiments.strategy_b.simulated_ctr*100).toFixed(1)}<small>%</small></strong><PercentBar value={data.experiments.strategy_b.simulated_ctr}/><p>SIMULATED CLICK-THROUGH RATE</p></div><div className="experiment-result"><span>MODELLED RELATIVE LIFT</span><strong>{data.experiments.relative_lift_pct>0?"+":""}{data.experiments.relative_lift_pct}%</strong><p>Based on {data.experiments.samples} fixed-seed synthetic assignments. This does not establish real-world performance.</p></div></div>
      </section>
      <section className="lab-section lab-last"><div className="lab-section-title"><div><span>03 / LEARNER SEGMENTS</span><h2>Different starts.<br/><em>Different results.</em></h2></div><p>Break down offline proxy ranking scores by starting level.</p></div>
      <div className="segment-table"><div className="segment-row segment-heading"><span>SEGMENT</span><span>PRECISION@5</span><span>NDCG@5</span><span>MRR</span></div>{data.segments.map(row=><div className="segment-row" key={row.segment}><strong>{row.segment}</strong><span>{row.precision_at_5.toFixed(3)}</span><span>{row.ndcg_at_5.toFixed(3)}</span><span>{row.mrr.toFixed(3)}</span></div>)}</div>
      </section>
    </>}
    <div className="data-note">METHODOLOGY: {data?.methodology || "See the backend evaluation module for metrics, relevance judgments and deterministic simulations."}</div>
  </div></main>;
}
