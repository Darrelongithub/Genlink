"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import "./engine.css";

type Plan = {
  id: string;
  name: string;
  price: number;
  credits: number;
  months: number;
  learners: number;
  accent: string;
};

type CreditRule = {
  id: string;
  label: string;
  detail: string;
  credits: number;
};

const DEFAULT_PLANS: Plan[] = [
  { id: "starter", name: "Starter", price: 100_000, credits: 5_000, months: 12, learners: 100, accent: "#74d9c0" },
  { id: "core", name: "Core", price: 300_000, credits: 25_000, months: 12, learners: 500, accent: "#8ca9ff" },
  { id: "plus", name: "Plus", price: 500_000, credits: 75_000, months: 12, learners: 700, accent: "#f4bf67" },
];

const DEFAULT_RULES: CreditRule[] = [
  { id: "explain", label: "Adapt a concept", detail: "A fresh explanation using the learner’s current evidence", credits: 1 },
  { id: "quiz", label: "Generate a check", detail: "A short, targeted understanding check", credits: 2 },
  { id: "lesson", label: "Personalised lesson", detail: "A complete lesson generated for this learner", credits: 5 },
  { id: "assessment", label: "Full assessment", detail: "Diagnosis, grading and updated learner state", credits: 10 },
];

const activity = [
  { initials: "AM", learner: "Amina M.", action: "Adapted explanation", credits: 1, time: "now" },
  { initials: "JO", learner: "John O.", action: "Understanding check", credits: 2, time: "2 min" },
  { initials: "WK", learner: "Wanjiku K.", action: "Personalised lesson", credits: 5, time: "8 min" },
  { initials: "DK", learner: "David K.", action: "Standard notes", credits: 0, time: "11 min" },
];

const formatNumber = (value: number) => new Intl.NumberFormat("en-KE").format(Math.max(0, Math.round(value || 0)));
const money = (value: number) => `KSh ${formatNumber(value)}`;

function loadLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "null");
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export default function EngineConsole() {
  const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS);
  const [rules, setRules] = useState<CreditRule[]>(DEFAULT_RULES);
  const [selectedPlan, setSelectedPlan] = useState("core");
  const [learners, setLearners] = useState(500);
  const [activePercent, setActivePercent] = useState(70);
  const [actionsPerWeek, setActionsPerWeek] = useState(2);
  const [weeks, setWeeks] = useState(30);
  const [averageCredits, setAverageCredits] = useState(1.5);
  const [learnerLimit, setLearnerLimit] = useState(50);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPlans(loadLocal("adapt:engine-plans", DEFAULT_PLANS));
    setRules(loadLocal("adapt:engine-rules", DEFAULT_RULES));
  }, []);

  const plan = plans.find((item) => item.id === selectedPlan) ?? plans[1];
  const activeLearners = Math.round(learners * activePercent / 100);
  const estimate = Math.ceil(activeLearners * actionsPerWeek * weeks * averageCredits);
  const percentage = Math.min(100, Math.round((estimate / Math.max(1, plan.credits)) * 100));
  const remaining = plan.credits - estimate;
  const perLearner = activeLearners ? Math.floor(plan.credits / activeLearners) : 0;
  const fit = remaining >= 0;
  const recommended = useMemo(
    () => plans.find((item) => item.credits >= estimate && item.learners >= learners) ?? plans[plans.length - 1],
    [plans, estimate, learners],
  );

  function updatePlan(id: string, field: keyof Plan, value: string) {
    setPlans((all) => all.map((item) => item.id === id ? { ...item, [field]: field === "name" ? value : Math.max(0, Number(value)) } : item));
    setSaved(false);
  }

  function updateRule(id: string, credits: number) {
    setRules((all) => all.map((item) => item.id === id ? { ...item, credits: Math.max(0, credits) } : item));
    setSaved(false);
  }

  function saveConfiguration() {
    window.localStorage.setItem("adapt:engine-plans", JSON.stringify(plans));
    window.localStorage.setItem("adapt:engine-rules", JSON.stringify(rules));
    setSaved(true);
    setEditing(false);
  }

  function resetConfiguration() {
    setPlans(DEFAULT_PLANS);
    setRules(DEFAULT_RULES);
    window.localStorage.removeItem("adapt:engine-plans");
    window.localStorage.removeItem("adapt:engine-rules");
    setSaved(false);
  }

  return (
    <main className="engine-shell">
      <aside className="engine-rail">
        <Link href="/engine" className="engine-logo" aria-label="Adapt engine console">
          <span className="engine-logo-mark">a</span>
          <span>ad<b>apt</b><small>engine</small></span>
        </Link>
        <nav aria-label="Engine console sections">
          <a className="active" href="#overview"><GridIcon /> Overview</a>
          <a href="#flow"><FlowIcon /> Engine flow</a>
          <a href="#plans"><LayersIcon /> Plans</a>
          <a href="#calculator"><CalculatorIcon /> Estimator</a>
          <a href="#controls"><SlidersIcon /> Controls</a>
        </nav>
        <div className="engine-rail-bottom">
          <div className="engine-health"><i /> Prototype console · values are samples</div>
          <Link href="/?mock=1" className="engine-learner-link">Open learner experience <span>↗</span></Link>
        </div>
      </aside>

      <section className="engine-main">
        <header className="engine-topbar">
          <div>
            <span className="engine-mobile-brand">adapt engine</span>
            <span className="engine-breadcrumb">Genlink / Nairobi Learning Network</span>
          </div>
          <div className="engine-top-actions">
            <span className="engine-mode"><i /> Prototype · not wired to Genlink</span>
            <button className="engine-button ghost" type="button" onClick={() => setEditing((value) => !value)}>{editing ? "Close editor" : "Configure engine"}</button>
          </div>
        </header>

        <div className="engine-content">
          <section className="engine-hero" id="overview">
            <div>
              <p className="engine-eyebrow">ADAPTIVE INTELLIGENCE LAYER</p>
              <h1>One engine. Every learner’s<br /><em>own way through.</em></h1>
              <p className="engine-lead">Adapt sits behind Genlink. It observes learning evidence, chooses the next teaching move and returns an adapted experience—without replacing the learning platform.</p>
            </div>
            <div className="engine-hero-orbit" aria-label="Adapt engine connected to learning services">
              <span className="orbit-node top">Assess</span>
              <span className="orbit-node right">Adapt</span>
              <span className="orbit-node bottom">Measure</span>
              <span className="orbit-node left">Teach</span>
              <div className="orbit-core"><strong>ADAPT</strong><small>ENGINE</small></div>
            </div>
          </section>

          <p style={{ margin: "0 0 10px", fontSize: 12, letterSpacing: ".04em", opacity: .78 }}>
            SAMPLE FIGURES FOR PRESENTATION — not live usage, not pilot data, not learner data.
          </p>
          <section className="engine-stats" aria-label="Engine summary (sample values)">
            <article><span className="stat-icon violet">◎</span><div><small>Sample credits remaining</small><strong>18,420</strong><span className="positive">illustrative only</span></div></article>
            <article><span className="stat-icon blue">↯</span><div><small>Sample adapted actions</small><strong>6,580</strong><span>no live usage recorded</span></div></article>
            <article><span className="stat-icon mint">◉</span><div><small>Sample active learners</small><strong>347</strong><span>illustrative only</span></div></article>
            <article><span className="stat-icon amber">◇</span><div><small>When credits reach zero</small><strong>Proposed fallback</strong><span>not enforced by the backend yet</span></div></article>
          </section>

          <section className="engine-panel flow-panel" id="flow">
            <div className="panel-heading">
              <div><p className="engine-kicker">HOW IT CONNECTS</p><h2>Adapt is the engine, not the destination</h2></div>
              <span className="live-pill"><i /> contract route exists · Genlink not wired</span>
            </div>
            <div className="engine-flow">
              <FlowNode index="01" title="Genlink" copy="Owns courses, identity and the learner experience." tone="dark" />
              <span className="flow-arrow">→<small>request + evidence</small></span>
              <FlowNode index="02" title="Adapt API" copy="Reads evidence and selects the right learning move." tone="violet" />
              <span className="flow-arrow">→<small>adapted action (metering proposed)</small></span>
              <FlowNode index="03" title="Intelligence" copy="The integration route is deterministic and local; other routes may use an outside service with consent." tone="blue" />
              <span className="flow-arrow">→<small>adapted response</small></span>
              <FlowNode index="04" title="Learner" copy="Would continue inside Genlink — that call is not wired yet." tone="mint" />
            </div>
            <div className="engine-contract">
              <code>Adapt integration route</code>
              <span>One real Adapt route · Genlink does not call it yet · caller-side fallback contract</span>
              <b>contract checked</b>
            </div>
          </section>

          <section className="engine-section" id="plans">
            <div className="section-heading">
              <div><p className="engine-kicker">CONFIGURABLE COMMERCIAL LAYER</p><h2>Annual plans with bounded intelligence</h2></div>
              <p>Example commercial layer only. No credit balance, debit or limit is enforced by the Adapt backend today.</p>
            </div>
            <div className="plan-grid">
              {plans.map((item) => (
                <article className={`plan-card ${item.id === "core" ? "featured" : ""}`} key={item.id} style={{ "--plan-accent": item.accent } as CSSProperties}>
                  {item.id === "core" ? <span className="plan-badge">REFERENCE PLAN</span> : null}
                  {editing ? <input aria-label={`${item.name} plan name`} value={item.name} onChange={(event) => updatePlan(item.id, "name", event.target.value)} /> : <h3>{item.name}</h3>}
                  <div className="plan-price">
                    {editing ? <NumberInput label={`${item.name} price`} value={item.price} onChange={(value) => updatePlan(item.id, "price", value)} /> : <strong>{money(item.price)}</strong>}
                    <span>per institution / {item.months} months</span>
                  </div>
                  <div className="plan-credits">
                    <small>INCLUDED ADAPT CREDITS</small>
                    {editing ? <NumberInput label={`${item.name} credits`} value={item.credits} onChange={(value) => updatePlan(item.id, "credits", value)} /> : <b>{formatNumber(item.credits)}</b>}
                  </div>
                  <ul>
                    <li><CheckIcon /> {editing ? <><NumberInput label={`${item.name} learners`} value={item.learners} onChange={(value) => updatePlan(item.id, "learners", value)} /> learners</> : `Up to ${formatNumber(item.learners)} configured learners`}</li>
                    <li><CheckIcon /> Example usage dashboard (prototype)</li>
                    <li><CheckIcon /> Proposed learner-level limits (not enforced)</li>
                    <li><CheckIcon /> Proposed standard-content fallback</li>
                  </ul>
                </article>
              ))}
            </div>
            {editing ? (
              <div className="editor-actions">
                <button type="button" className="engine-button primary" onClick={saveConfiguration}>Save configuration</button>
                <button type="button" className="engine-button ghost" onClick={resetConfiguration}>Reset examples</button>
                {saved ? <span>Saved in this browser</span> : <span>Presentation values—change them as your research improves.</span>}
              </div>
            ) : null}
          </section>

          <section className="calculator-layout" id="calculator">
            <div className="engine-panel calculator-panel">
              <div className="panel-heading"><div><p className="engine-kicker">USAGE ESTIMATOR</p><h2>Estimate before committing</h2></div><CalculatorIcon /></div>
              <div className="calculator-form">
                <CalcField label="Total learners" value={learners} min={1} max={3000} step={1} onChange={setLearners} output={formatNumber(learners)} />
                <CalcField label="Expected active learners" value={activePercent} min={5} max={100} step={5} onChange={setActivePercent} output={`${activePercent}% · ${formatNumber(activeLearners)}`} />
                <CalcField label="Adapted actions / active learner / week" value={actionsPerWeek} min={0.5} max={10} step={0.5} onChange={setActionsPerWeek} output={String(actionsPerWeek)} />
                <CalcField label="Active learning weeks" value={weeks} min={1} max={52} step={1} onChange={setWeeks} output={String(weeks)} />
                <CalcField label="Average credits / action" value={averageCredits} min={1} max={10} step={0.5} onChange={setAverageCredits} output={String(averageCredits)} />
              </div>
            </div>

            <aside className="estimate-card">
              <p>ESTIMATED ANNUAL NEED</p>
              <strong>{formatNumber(estimate)}</strong>
              <span>Adapt Credits</span>
              <div className="estimate-plan-select">
                <label htmlFor="estimate-plan">Compare with</label>
                <select id="estimate-plan" value={selectedPlan} onChange={(event) => setSelectedPlan(event.target.value)}>
                  {plans.map((item) => <option value={item.id} key={item.id}>{item.name} · {formatNumber(item.credits)}</option>)}
                </select>
              </div>
              <div className="usage-meter"><i style={{ width: `${percentage}%` }} /></div>
              <div className="usage-labels"><span>{percentage}% allocated</span><span>{formatNumber(plan.credits)} available</span></div>
              <div className={`fit-message ${fit ? "good" : "warn"}`}>
                <b>{fit ? `${plan.name} covers this estimate` : `${plan.name} is short by ${formatNumber(Math.abs(remaining))}`}</b>
                <span>{fit ? `${formatNumber(remaining)} credits remain as headroom.` : `Consider ${recommended.name} or an additional credit bundle.`}</span>
              </div>
              <small className="estimate-note">An estimate, not a promise. Real usage data replaces these assumptions after rollout.</small>
            </aside>
          </section>

          <section className="controls-layout" id="controls">
            <div className="engine-panel">
              <div className="panel-heading"><div><p className="engine-kicker">INSTITUTION CONTROLS</p><h2>The institution controls allocation</h2></div><span className="role-pill">ADMIN</span></div>
              <div className="allocation-summary">
                <div><small>Pool</small><strong>{formatNumber(plan.credits)}</strong><span>{plan.name} plan</span></div>
                <div><small>Suggested allowance</small><strong>{formatNumber(perLearner)}</strong><span>credits / active learner</span></div>
                <div><small>Example learner limit</small><strong>{formatNumber(learnerLimit)}</strong><span>this browser only</span></div>
              </div>
              <label className="limit-control">
                <span><b>Default learner limit</b><small>Institutions can override this for an individual learner.</small></span>
                <span className="limit-input"><input type="number" min="0" value={learnerLimit} onChange={(event) => setLearnerLimit(Math.max(0, Number(event.target.value)))} /> credits</span>
              </label>
              <div className="fallback-rule">
                <span className="fallback-icon">↳</span>
                <div><b>Proposed: when adapted credits reach zero</b><p>New adaptation would pause while existing notes, lessons and quizzes stay available in Standard mode. This is a product proposal; the backend does not debit credits.</p></div>
                <span className="enabled-pill">PROPOSED ONLY</span>
              </div>
            </div>

            <div className="engine-panel">
              <div className="panel-heading"><div><p className="engine-kicker">CREDIT RULES</p><h2>What consumes a credit</h2></div>{editing ? <span className="editing-pill">EDITING</span> : null}</div>
              <div className="credit-rules">
                {rules.map((rule) => (
                  <div className="credit-rule" key={rule.id}>
                    <span className="rule-mark">{rule.credits}</span>
                    <div><b>{rule.label}</b><small>{rule.detail}</small></div>
                    {editing ? <NumberInput label={`${rule.label} credits`} value={rule.credits} onChange={(value) => updateRule(rule.id, Number(value))} /> : <strong>{rule.credits} cr</strong>}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="engine-panel activity-panel">
            <div className="panel-heading"><div><p className="engine-kicker">EXPLAINABLE METERING</p><h2>Example credit ledger (sample data)</h2></div><button className="text-button" type="button" disabled title="CSV export is not implemented">Export usage (prototype)</button></div>
            <div className="activity-table" role="table" aria-label="Recent Adapt credit usage">
              <div className="activity-row header" role="row"><span>Learner</span><span>Engine action</span><span>Mode</span><span>Credits</span><span>When</span></div>
              {activity.map((item) => (
                <div className="activity-row" role="row" key={`${item.learner}-${item.time}`}>
                  <span><i className="avatar">{item.initials}</i>{item.learner}</span>
                  <span>{item.action}</span>
                  <span><i className={`mode-dot ${item.credits ? "adapted" : "standard"}`} />{item.credits ? "Adapted" : "Standard"}</span>
                  <strong>{item.credits ? `−${item.credits}` : "0"}</strong>
                  <span>{item.time}</span>
                </div>
              ))}
            </div>
          </section>

          <footer className="engine-footer">
            <span><b>ADAPT</b> is a learning intelligence engine for Genlink.</span>
            <span>Prototype · sample values stored in this browser only · no billing or credit enforcement backend</span>
          </footer>
        </div>
      </section>
    </main>
  );
}

function FlowNode({ index, title, copy, tone }: { index: string; title: string; copy: string; tone: string }) {
  return <article className={`flow-node ${tone}`}><span>{index}</span><div><h3>{title}</h3><p>{copy}</p></div></article>;
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (value: string) => void }) {
  return <input className="inline-number" aria-label={label} type="number" min="0" value={value} onChange={(event) => onChange(event.target.value)} />;
}

function CalcField({ label, value, min, max, step, onChange, output }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void; output: string }) {
  return <label className="calc-field"><span><b>{label}</b><output>{output}</output></span><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

function CheckIcon() { return <span className="check-icon">✓</span>; }
function GridIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>; }
function FlowIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="3"/><circle cx="19" cy="5" r="3"/><circle cx="19" cy="19" r="3"/><path d="M8 11l8-5M8 13l8 5"/></svg>; }
function LayersIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3L3 8l9 5 9-5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5"/></svg>; }
function CalculatorIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="2" width="16" height="20" rx="3"/><path d="M8 6h8v4H8zM8 14h1m3 0h1m3 0h1M8 18h1m3 0h1m3 0h1"/></svg>; }
function SlidersIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h10m4 0h2M4 12h2m4 0h10M4 18h7m4 0h5"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="13" cy="18" r="2"/></svg>; }
