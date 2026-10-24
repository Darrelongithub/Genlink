"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";

import { useFocusTrap } from "@/lib/a11y/useFocusTrap";
import {
  buildIllustrativeCsv,
  clearEngineStorage,
  cloneDefaultPlans,
  cloneDefaultRules,
  DEFAULT_ESTIMATOR,
  DEFAULT_PLANS,
  evaluateEstimate,
  EXAMPLE_ACTIVITY,
  formatCount,
  formatDecimal,
  formatKsh,
  LIMITS,
  readEngineStorage,
  sanitizeNumber,
  writeEngineStorage,
  type CreditRule,
  type EnginePlan,
} from "@/lib/engine/console";

import "./engine.css";

const NAV_SECTIONS = [
  { id: "overview", label: "Overview", icon: "grid" },
  { id: "flow", label: "Engine flow", icon: "flow" },
  { id: "plans", label: "Plans", icon: "layers" },
  { id: "calculator", label: "Estimator", icon: "calculator" },
  { id: "controls", label: "Controls", icon: "sliders" },
  { id: "activity", label: "Sample ledger", icon: "ledger" },
] as const;

export default function EngineConsole() {
  const [plans, setPlans] = useState<EnginePlan[]>(() => cloneDefaultPlans());
  const [rules, setRules] = useState<CreditRule[]>(() => cloneDefaultRules());
  const [selectedPlan, setSelectedPlan] = useState("core");
  const [learners, setLearners] = useState<number>(DEFAULT_ESTIMATOR.learners);
  const [activePercent, setActivePercent] = useState<number>(DEFAULT_ESTIMATOR.activePercent);
  const [actionsPerWeek, setActionsPerWeek] = useState<number>(DEFAULT_ESTIMATOR.actionsPerWeek);
  const [weeks, setWeeks] = useState<number>(DEFAULT_ESTIMATOR.weeks);
  const [averageCredits, setAverageCredits] = useState<number>(DEFAULT_ESTIMATOR.averageCredits);
  const [learnerLimit, setLearnerLimit] = useState<number>(DEFAULT_ESTIMATOR.learnerLimit);

  const [editing, setEditing] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [validationNotice, setValidationNotice] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>("overview");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [resetEpoch, setResetEpoch] = useState(0);

  const drawerRef = useFocusTrap(drawerOpen);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const loaded = readEngineStorage();
    setPlans(loaded.plans);
    setRules(loaded.rules);
    if (!loaded.storageAvailable) {
      setStatusNote("Browser storage is unavailable — edits apply to this tab only.");
    } else if (loaded.repaired) {
      setStatusNote("Restored valid example defaults after detecting corrupted saved values.");
    }
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        menuButtonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  useEffect(() => {
    function onResize() {
      if (window.innerWidth > 860 && drawerOpen) {
        setDrawerOpen(false);
      }
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [drawerOpen]);

  const evaluation = useMemo(
    () =>
      evaluateEstimate({
        learners,
        activePercent,
        actionsPerWeek,
        weeks,
        averageCredits,
        plans,
        selectedPlanId: selectedPlan,
      }),
    [learners, activePercent, actionsPerWeek, weeks, averageCredits, plans, selectedPlan],
  );

  const estimatorModified =
    learners !== DEFAULT_ESTIMATOR.learners ||
    activePercent !== DEFAULT_ESTIMATOR.activePercent ||
    actionsPerWeek !== DEFAULT_ESTIMATOR.actionsPerWeek ||
    weeks !== DEFAULT_ESTIMATOR.weeks ||
    averageCredits !== DEFAULT_ESTIMATOR.averageCredits;

  function updatePlanName(id: string, rawName: string) {
    setPlans((all) =>
      all.map((item) => (item.id === id ? { ...item, name: rawName.slice(0, 40) } : item)),
    );
    setStatusNote(null);
  }

  function normalizePlanName(id: string) {
    setPlans((all) =>
      all.map((item) => {
        if (item.id !== id) return item;
        const fallback = DEFAULT_PLANS.find((d) => d.id === id)?.name ?? "Plan";
        const trimmed = item.name.trim();
        return { ...item, name: trimmed || fallback };
      }),
    );
  }

  function updatePlanMetric(id: string, field: "price" | "credits" | "learners", value: number) {
    setPlans((all) => all.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
    setStatusNote(null);
  }

  function updateRuleCredits(id: string, credits: number) {
    setRules((all) => all.map((item) => (item.id === id ? { ...item, credits } : item)));
    setStatusNote(null);
  }

  function saveConfiguration() {
    const normalizedPlans = plans.map((item) => {
      const fallback = DEFAULT_PLANS.find((d) => d.id === item.id)?.name ?? "Plan";
      return { ...item, name: item.name.trim() || fallback };
    });
    setPlans(normalizedPlans);
    const result = writeEngineStorage(normalizedPlans, rules);
    setEditing(false);
    setStatusNote(
      result.persisted
        ? "Saved example configuration in this browser (not live billing)."
        : "Applied for this tab — browser storage is unavailable.",
    );
  }

  function resetConfiguration() {
    const freshPlans = cloneDefaultPlans();
    const freshRules = cloneDefaultRules();
    setPlans(freshPlans);
    setRules(freshRules);
    setSelectedPlan("core");
    setLearners(DEFAULT_ESTIMATOR.learners);
    setActivePercent(DEFAULT_ESTIMATOR.activePercent);
    setActionsPerWeek(DEFAULT_ESTIMATOR.actionsPerWeek);
    setWeeks(DEFAULT_ESTIMATOR.weeks);
    setAverageCredits(DEFAULT_ESTIMATOR.averageCredits);
    setLearnerLimit(DEFAULT_ESTIMATOR.learnerLimit);
    setValidationNotice(null);
    setResetEpoch((n) => n + 1);
    const cleared = clearEngineStorage();
    setStatusNote(
      cleared.cleared
        ? "Reset plans, credit rules and estimator to default examples."
        : "Reset to default examples for this session.",
    );
  }

  function resetEstimatorOnly() {
    setLearners(DEFAULT_ESTIMATOR.learners);
    setActivePercent(DEFAULT_ESTIMATOR.activePercent);
    setActionsPerWeek(DEFAULT_ESTIMATOR.actionsPerWeek);
    setWeeks(DEFAULT_ESTIMATOR.weeks);
    setAverageCredits(DEFAULT_ESTIMATOR.averageCredits);
    setValidationNotice(null);
    setResetEpoch((n) => n + 1);
    setStatusNote("Estimator inputs reset to default example assumptions.");
  }

  function downloadSampleCsv() {
    const csv = buildIllustrativeCsv(plans, rules, evaluation);
    try {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "adapt-engine-illustrative-example.csv";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1_000);
      setStatusNote("Downloaded illustrative CSV summary (labelled non-live example data).");
    } catch {
      setStatusNote("Sample CSV download is not supported in this browser.");
    }
  }

  const navContent = (
    <>
      <div className="engine-rail-head">
        <Link href="/engine" className="engine-logo" onClick={() => setDrawerOpen(false)}>
          <span className="engine-logo-mark" aria-hidden="true">a</span>
          <span>
            ad<b>apt</b>
            <small>engine</small>
          </span>
        </Link>
        {drawerOpen ? (
          <button
            type="button"
            className="engine-drawer-close"
            onClick={() => {
              setDrawerOpen(false);
              menuButtonRef.current?.focus();
            }}
          >
            Close
          </button>
        ) : null}
      </div>

      <nav aria-label="Engine console sections">
        {NAV_SECTIONS.map((section) => {
          const isCurrent = activeSection === section.id;
          return (
            <a
              key={section.id}
              className={isCurrent ? "active" : undefined}
              aria-current={isCurrent ? "location" : undefined}
              href={`#${section.id}`}
              onClick={() => {
                setActiveSection(section.id);
                setDrawerOpen(false);
              }}
            >
              <NavIcon kind={section.icon} />
              <span>{section.label}</span>
            </a>
          );
        })}
      </nav>

      <div className="engine-rail-bottom">
        <div className="engine-health" role="note" aria-label="Console environment status">
          <div className="engine-health-row">
            <i aria-hidden="true" />
            <span>Presentation console · local only</span>
          </div>
          <small>No live institution or billing connected</small>
        </div>
        <Link href="/" className="engine-learner-link" onClick={() => setDrawerOpen(false)}>
          <span>Open learner app</span>
          <span aria-hidden="true">↗</span>
        </Link>
        <Link href="/?mock=1" className="engine-learner-link subtle" onClick={() => setDrawerOpen(false)}>
          <span>Preview sample learner</span>
          <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </>
  );

  return (
    <div className="engine-shell">
      <button
        type="button"
        className={`engine-backdrop${drawerOpen ? " open" : ""}`}
        aria-label="Close sections menu"
        tabIndex={-1}
        onClick={() => {
          setDrawerOpen(false);
          menuButtonRef.current?.focus();
        }}
      />

      <aside
        id="engine-rail-drawer"
        ref={drawerRef}
        className={`engine-rail${drawerOpen ? " open" : ""}`}
        aria-label="Engine operator navigation"
      >
        {navContent}
      </aside>

      <div className="engine-main">
        <header className="engine-topbar">
          <div className="engine-topbar-left">
            <button
              ref={menuButtonRef}
              type="button"
              className="engine-menu-btn"
              aria-expanded={drawerOpen}
              aria-controls="engine-rail-drawer"
              onClick={() => setDrawerOpen((open) => !open)}
            >
              <span aria-hidden="true">☰</span>
              <span>Sections</span>
            </button>
            <span className="engine-mobile-brand">adapt engine</span>
            <span className="engine-breadcrumb">
              Genlink / Nairobi Learning Network <em>(illustrative scenario)</em>
            </span>
          </div>
          <div className="engine-top-actions">
            <span className="engine-mode">
              <i aria-hidden="true" />
              <span>Presentation · example data</span>
            </span>
            <button
              className="engine-button ghost engine-print-btn"
              type="button"
              onClick={() => window.print()}
            >
              Print view
            </button>
            <button
              className="engine-button primary-outline"
              type="button"
              aria-pressed={editing}
              onClick={() => setEditing((value) => !value)}
            >
              {editing ? "Close editor" : "Configure engine"}
            </button>
          </div>
        </header>

        <main id="main-content" className="engine-content" tabIndex={-1}>
          <div className="engine-print-banner" role="note">
            <strong>ADAPT Engine for Genlink — Illustrative Presentation Configuration.</strong>{" "}
            All commercial figures, institution counts and ledger rows on this page are editable examples, not live usage or a billing statement.
          </div>

          {statusNote ? (
            <div className="engine-status-banner" role="status" aria-live="polite">
              <span>{statusNote}</span>
              <button type="button" className="engine-banner-dismiss" onClick={() => setStatusNote(null)}>
                Dismiss
              </button>
            </div>
          ) : null}

          <section className="engine-hero" id="overview" aria-labelledby="engine-hero-heading">
            <div>
              <p className="engine-eyebrow">ADAPTIVE INTELLIGENCE LAYER · OPERATOR VIEW</p>
              <h1 id="engine-hero-heading">
                One engine. Every learner’s
                <br />
                <em>own way through.</em>
              </h1>
              <p className="engine-lead">
                Adapt sits behind Genlink as an institutional intelligence layer. It observes learning evidence,
                chooses the next teaching move, and returns an adapted experience—without replacing the host learning platform.
              </p>
              <div className="engine-disclaimer-strip" role="note">
                <strong>Example configuration:</strong> Values below illustrate how an institution can bound and audit adaptive credit usage. Nothing on this screen connects to live billing or production student records.
              </div>
            </div>
            <div className="engine-hero-orbit" role="img" aria-label="Diagram: Adapt engine connecting Assess, Teach, Adapt, and Measure around the host platform">
              <span className="orbit-node top" aria-hidden="true">Assess</span>
              <span className="orbit-node right" aria-hidden="true">Adapt</span>
              <span className="orbit-node bottom" aria-hidden="true">Measure</span>
              <span className="orbit-node left" aria-hidden="true">Teach</span>
              <div className="orbit-core" aria-hidden="true">
                <strong>ADAPT</strong>
                <small>ENGINE</small>
              </div>
            </div>
          </section>

          <section className="engine-snapshot-wrap" aria-labelledby="snapshot-heading">
            <div className="snapshot-header">
              <div>
                <p className="engine-kicker">ILLUSTRATIVE SCENARIO SNAPSHOT</p>
                <h2 id="snapshot-heading">Sample mid-year institution state</h2>
              </div>
              <span className="sample-pill">Example figures · not live telemetry</span>
            </div>
            <div className="engine-stats">
              <article>
                <span className="stat-icon violet" aria-hidden="true">◎</span>
                <div>
                  <small>Credits remaining (sample)</small>
                  <strong>18,420</strong>
                  <span className="positive">Example: 73.7% of 25,000 Core pool</span>
                </div>
              </article>
              <article>
                <span className="stat-icon blue" aria-hidden="true">↯</span>
                <div>
                  <small>Adapted actions (sample)</small>
                  <strong>6,580</strong>
                  <span>Illustrative mid-term count</span>
                </div>
              </article>
              <article>
                <span className="stat-icon mint" aria-hidden="true">◉</span>
                <div>
                  <small>Active learners (sample)</small>
                  <strong>347</strong>
                  <span>Example cohort of 500 configured</span>
                </div>
              </article>
              <article>
                <span className="stat-icon amber" aria-hidden="true">◇</span>
                <div>
                  <small>At zero credits</small>
                  <strong>Standard mode</strong>
                  <span>Course notes, quizzes &amp; simple lessons stay open</span>
                </div>
              </article>
            </div>
          </section>

          <section className="engine-panel flow-panel" id="flow" aria-labelledby="flow-heading">
            <div className="panel-heading">
              <div>
                <p className="engine-kicker">HOW IT CONNECTS</p>
                <h2 id="flow-heading">Adapt is the engine, not the destination</h2>
              </div>
              <span className="contract-pill">Stateless HTTP contract</span>
            </div>
            <div className="engine-flow">
              <FlowNode index="01" title="Genlink" copy="Owns courses, identity and the learner-facing classroom." tone="dark" />
              <span className="flow-arrow" aria-hidden="true">→<small>request + evidence</small></span>
              <FlowNode index="02" title="Adapt API" copy="Reads attempt evidence and selects the next learning move." tone="violet" />
              <span className="flow-arrow" aria-hidden="true">→<small>metered action</small></span>
              <FlowNode index="03" title="Intelligence" copy="Routes deterministic rules or adaptive generation by task and learner consent." tone="blue" />
              <span className="flow-arrow" aria-hidden="true">→<small>adapted response</small></span>
              <FlowNode index="04" title="Learner" copy="Continues inside Genlink at their own pace—never locked out." tone="mint" />
            </div>
            <div className="engine-contract">
              <code>HTTP POST · /api/v1/integration/adapt</code>
              <span>One stateless integration route · auditable receipts · local simple-mode fallback</span>
              <b>Schema example</b>
            </div>
          </section>

          <section className="engine-section" id="plans" aria-labelledby="plans-heading">
            <div className="section-heading">
              <div>
                <p className="engine-kicker">CONFIGURABLE COMMERCIAL LAYER (NON-FINAL EXAMPLES)</p>
                <h2 id="plans-heading">Annual plans with bounded intelligence</h2>
              </div>
              <p>
                Example commercial tiers for discussion. Platform access remains open all year; credits meter only newly generated adaptive actions.
              </p>
            </div>

            <div className="plan-grid">
              {plans.map((item) => (
                <article
                  className={`plan-card ${item.id === "core" ? "featured" : ""}`}
                  key={`${item.id}-${resetEpoch}`}
                  style={{ "--plan-accent": item.accent } as CSSProperties}
                >
                  <div className="plan-card-top">
                    <h3>{item.name || "Unnamed plan"}</h3>
                    <span className="plan-badge">
                      {item.id === "core" ? "REFERENCE EXAMPLE" : "EXAMPLE TIER"}
                    </span>
                  </div>

                  {editing ? (
                    <div className="plan-edit-field">
                      <label htmlFor={`plan-name-${item.id}`}>Plan name</label>
                      <input
                        id={`plan-name-${item.id}`}
                        className="inline-text"
                        type="text"
                        maxLength={40}
                        value={item.name}
                        onChange={(event) => updatePlanName(item.id, event.target.value)}
                        onBlur={() => normalizePlanName(item.id)}
                      />
                    </div>
                  ) : null}

                  <div className="plan-price">
                    {editing ? (
                      <NumericField
                        key={`price-${item.id}-${resetEpoch}`}
                        label={`${item.name || "Plan"} annual example price (KSh)`}
                        value={item.price}
                        min={0}
                        max={LIMITS.planPriceMax}
                        decimals={0}
                        onChange={(val, note) => {
                          updatePlanMetric(item.id, "price", val);
                          if (note) setValidationNotice(note);
                        }}
                      />
                    ) : (
                      <strong>{formatKsh(item.price)}</strong>
                    )}
                    <span>example per institution / {item.months} months</span>
                  </div>

                  <div className="plan-credits">
                    <small>INCLUDED ADAPT CREDITS (EXAMPLE)</small>
                    {editing ? (
                      <NumericField
                        key={`credits-${item.id}-${resetEpoch}`}
                        label={`${item.name || "Plan"} included credits`}
                        value={item.credits}
                        min={0}
                        max={LIMITS.planCreditsMax}
                        decimals={0}
                        onChange={(val, note) => {
                          updatePlanMetric(item.id, "credits", val);
                          if (note) setValidationNotice(note);
                        }}
                      />
                    ) : (
                      <b>{formatCount(item.credits)}</b>
                    )}
                  </div>

                  <ul>
                    <li>
                      <CheckIcon />
                      {editing ? (
                        <div className="plan-learners-edit">
                          <NumericField
                            key={`learners-${item.id}-${resetEpoch}`}
                            label={`${item.name || "Plan"} learner capacity`}
                            value={item.learners}
                            min={0}
                            max={LIMITS.planLearnersMax}
                            decimals={0}
                            compact
                            onChange={(val, note) => {
                              updatePlanMetric(item.id, "learners", val);
                              if (note) setValidationNotice(note);
                            }}
                          />
                          <span>configured learners</span>
                        </div>
                      ) : (
                        <span>Up to {formatCount(item.learners)} configured learners</span>
                      )}
                    </li>
                    <li><CheckIcon /><span>Institution credit ledger &amp; audit trail</span></li>
                    <li><CheckIcon /><span>Adjustable per-learner credit limits</span></li>
                    <li><CheckIcon /><span>Standard mode &amp; simple lessons never lock</span></li>
                  </ul>
                </article>
              ))}
            </div>

            <div className="editor-actions">
              {editing ? (
                <>
                  <button type="button" className="engine-button primary" onClick={saveConfiguration}>
                    Save configuration
                  </button>
                  <button type="button" className="engine-button ghost" onClick={resetConfiguration}>
                    Reset all examples
                  </button>
                  <span>Saved locally in this browser for presentation planning only.</span>
                </>
              ) : (
                <>
                  <button type="button" className="engine-button ghost" onClick={() => setEditing(true)}>
                    Edit example plans &amp; credit rules
                  </button>
                  <button type="button" className="engine-button ghost" onClick={resetConfiguration}>
                    Reset examples
                  </button>
                  <span>All commercial figures are non-final placeholders and remain editable.</span>
                </>
              )}
            </div>
          </section>

          <section className="calculator-layout" id="calculator" aria-labelledby="calculator-heading">
            <div className="engine-panel calculator-panel">
              <div className="panel-heading">
                <div>
                  <p className="engine-kicker">USAGE ESTIMATOR</p>
                  <h2 id="calculator-heading">Estimate before committing</h2>
                </div>
                {estimatorModified ? (
                  <button type="button" className="engine-button ghost" onClick={resetEstimatorOnly}>
                    Reset estimator
                  </button>
                ) : (
                  <span className="sample-pill">Interactive calculator</span>
                )}
              </div>

              {validationNotice ? (
                <p className="calc-validation-note" role="status" aria-live="polite">
                  {validationNotice}
                </p>
              ) : null}

              <div className="calculator-form">
                <CalcField
                  key={`calc-learners-${resetEpoch}`}
                  label="Total learners"
                  hint={`0 to ${formatCount(LIMITS.learnersMax)} learners`}
                  value={learners}
                  min={0}
                  max={LIMITS.learnersMax}
                  sliderMax={LIMITS.learnersSliderMax}
                  step={1}
                  decimals={0}
                  summary={`${formatCount(evaluation.learners)} learners`}
                  onChange={(val, note) => {
                    setLearners(val);
                    setValidationNotice(note);
                  }}
                />
                <CalcField
                  key={`calc-active-${resetEpoch}`}
                  label="Expected active learners (%)"
                  hint={`${formatCount(evaluation.activeLearners)} active learners`}
                  value={activePercent}
                  min={0}
                  max={LIMITS.activePercentMax}
                  sliderMax={LIMITS.activePercentMax}
                  step={5}
                  decimals={1}
                  summary={`${formatDecimal(evaluation.activePercent, 1)}% · ${formatCount(evaluation.activeLearners)} active`}
                  onChange={(val, note) => {
                    setActivePercent(val);
                    setValidationNotice(note);
                  }}
                />
                <CalcField
                  key={`calc-actions-${resetEpoch}`}
                  label="Adapted actions / active learner / week"
                  hint="Supports zero and decimals (e.g. 0.5, 2.5)"
                  value={actionsPerWeek}
                  min={0}
                  max={LIMITS.actionsPerWeekMax}
                  sliderMax={LIMITS.actionsSliderMax}
                  step={0.5}
                  decimals={2}
                  summary={`${formatDecimal(evaluation.actionsPerWeek, 2)} / wk`}
                  onChange={(val, note) => {
                    setActionsPerWeek(val);
                    setValidationNotice(note);
                  }}
                />
                <CalcField
                  key={`calc-weeks-${resetEpoch}`}
                  label="Active learning weeks / year"
                  hint="0 to 52 weeks"
                  value={weeks}
                  min={0}
                  max={LIMITS.weeksMax}
                  sliderMax={LIMITS.weeksMax}
                  step={1}
                  decimals={1}
                  summary={`${formatDecimal(evaluation.weeks, 1)} wks`}
                  onChange={(val, note) => {
                    setWeeks(val);
                    setValidationNotice(note);
                  }}
                />
                <CalcField
                  key={`calc-avg-credits-${resetEpoch}`}
                  label="Average credits / adapted action"
                  hint="Weighted blend of credit rules below"
                  value={averageCredits}
                  min={0}
                  max={LIMITS.averageCreditsMax}
                  sliderMax={LIMITS.averageCreditsSliderMax}
                  step={0.25}
                  decimals={2}
                  summary={`${formatDecimal(evaluation.averageCredits, 2)} cr`}
                  onChange={(val, note) => {
                    setAverageCredits(val);
                    setValidationNotice(note);
                  }}
                />
              </div>
            </div>

            <aside className="estimate-card" aria-labelledby="estimate-card-heading">
              <p id="estimate-card-heading" className="estimate-kicker">ESTIMATED ANNUAL NEED (EXAMPLE)</p>
              <output className="estimate-output" aria-live="polite">
                <strong className="estimate-total">{formatCount(evaluation.estimatedCredits)}</strong>
                <span className="estimate-unit">Adapt Credits / year</span>
                <span className="sr-only">
                  {`. ${evaluation.verdictTitle}. ${evaluation.verdictDetail}`}
                </span>
              </output>

              <div className="estimate-plan-select">
                <label htmlFor="estimate-plan">Compare against configured plan</label>
                <select
                  id="estimate-plan"
                  value={evaluation.selectedPlan.id}
                  onChange={(event) => setSelectedPlan(event.target.value)}
                >
                  {plans.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.name} · {formatCount(item.credits)} cr · up to {formatCount(item.learners)} learners
                    </option>
                  ))}
                </select>
              </div>

              <div
                className="usage-meter"
                role="progressbar"
                aria-label="Estimated credit usage against selected plan"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={evaluation.meterWidthPercent}
                aria-valuetext={`${evaluation.allocationPercent}% of ${evaluation.selectedPlan.name} credit pool`}
              >
                <i
                  className={evaluation.overAllocated ? "over" : undefined}
                  style={{ width: `${evaluation.meterWidthPercent}%` }}
                />
              </div>
              <div className="usage-labels">
                <span>
                  {evaluation.overAllocated && evaluation.selectedPlan.credits === 0
                    ? "Exceeds 0-credit plan"
                    : `${formatCount(evaluation.allocationPercent)}% of credit pool`}
                </span>
                <span>{formatCount(evaluation.selectedPlan.credits)} credits in plan</span>
              </div>

              <div className={`fit-message ${evaluation.verdictTone}`} role="status" aria-live="polite">
                <b>
                  <span aria-hidden="true">{evaluation.overallFit ? "✓ " : "! "}</span>
                  {evaluation.verdictTitle}
                </b>
                <span>{evaluation.verdictDetail}</span>
              </div>

              <small className="estimate-note">
                Planning estimate only — not a quote or commitment. Institutions replace these assumptions with measured pilot usage.
              </small>
            </aside>
          </section>

          <section className="controls-layout" id="controls" aria-labelledby="controls-heading">
            <div className="engine-panel">
              <div className="panel-heading">
                <div>
                  <p className="engine-kicker">INSTITUTION CONTROLS</p>
                  <h2 id="controls-heading">The institution controls allocation</h2>
                </div>
                <span className="role-pill">Operator policy</span>
              </div>

              <div className="allocation-summary">
                <div>
                  <small>Selected pool</small>
                  <strong>{formatCount(evaluation.selectedPlan.credits)}</strong>
                  <span>{evaluation.selectedPlan.name} example</span>
                </div>
                <div>
                  <small>Even split / active learner</small>
                  <strong>{formatCount(evaluation.perActiveLearnerCredits)}</strong>
                  <span>credits / active learner</span>
                </div>
                <div>
                  <small>Default learner cap</small>
                  <strong>{formatCount(learnerLimit)}</strong>
                  <span>adjustable per learner</span>
                </div>
              </div>

              <div className="limit-control">
                <div>
                  <label htmlFor="default-learner-limit" className="limit-label">
                    Default learner credit cap
                  </label>
                  <small id="default-learner-limit-desc">
                    Example safeguard so one heavy session cannot exhaust the shared institutional pool.
                  </small>
                </div>
                <div className="limit-input">
                  <NumericField
                    key={`limit-${resetEpoch}`}
                    id="default-learner-limit"
                    describedBy="default-learner-limit-desc"
                    label="Default learner credit cap"
                    hideLabel
                    compact
                    value={learnerLimit}
                    min={0}
                    max={LIMITS.learnerLimitMax}
                    decimals={0}
                    onChange={(val, note) => {
                      setLearnerLimit(val);
                      if (note) setValidationNotice(note);
                    }}
                  />
                  <span>credits</span>
                </div>
              </div>

              <div className="fallback-rule">
                <span className="fallback-icon" aria-hidden="true">↳</span>
                <div>
                  <b>When adapted credits reach zero (Standard mode fallback)</b>
                  <p>
                    Newly generated adaptations pause cleanly. Existing Genlink course notes, standard quizzes,
                    and Adapt’s built-in deterministic simple-mode lessons stay available with zero lockouts.
                  </p>
                </div>
                <span className="enabled-pill">Always open</span>
              </div>
            </div>

            <div className="engine-panel" aria-labelledby="rules-heading">
              <div className="panel-heading">
                <div>
                  <p className="engine-kicker">CREDIT RULES (EXAMPLE WEIGHTS)</p>
                  <h2 id="rules-heading">What consumes a credit</h2>
                </div>
                {editing ? <span className="editing-pill">Editing</span> : <span className="sample-pill">Configurable</span>}
              </div>
              <div className="credit-rules">
                {rules.map((rule) => (
                  <div className="credit-rule" key={`${rule.id}-${resetEpoch}`}>
                    <span className="rule-mark" aria-hidden="true">{formatDecimal(rule.credits, 2)}</span>
                    <div>
                      <b>{rule.label}</b>
                      <small>{rule.detail}</small>
                    </div>
                    {editing ? (
                      <div className="rule-edit-wrap">
                        <NumericField
                          key={`rule-${rule.id}-${resetEpoch}`}
                          label={`${rule.label} credit cost`}
                          hideLabel
                          compact
                          value={rule.credits}
                          min={0}
                          max={LIMITS.ruleCreditsMax}
                          decimals={2}
                          onChange={(val, note) => {
                            updateRuleCredits(rule.id, val);
                            if (note) setValidationNotice(note);
                          }}
                        />
                        <span aria-hidden="true">cr</span>
                      </div>
                    ) : (
                      <strong>{formatDecimal(rule.credits, 2)} cr</strong>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="engine-panel activity-panel" id="activity" aria-labelledby="activity-heading">
            <div className="panel-heading activity-heading">
              <div>
                <p className="engine-kicker">EXPLAINABLE METERING · SAMPLE LEDGER</p>
                <h2 id="activity-heading">Illustrative credit activity</h2>
              </div>
              <div className="activity-actions">
                <span className="sample-pill">Sample rows · not real students</span>
                <button className="engine-button ghost" type="button" onClick={downloadSampleCsv}>
                  Download sample CSV
                </button>
              </div>
            </div>

            <div className="activity-table-scroll" role="region" aria-label="Scrollable sample credit ledger" tabIndex={0}>
              <table className="activity-table">
                <caption className="sr-only">
                  Illustrative example rows showing how Genlink and Adapt record adapted versus standard-mode actions.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Learner (illustrative)</th>
                    <th scope="col">Engine action</th>
                    <th scope="col">Delivery mode</th>
                    <th scope="col">Credits metered</th>
                    <th scope="col">Sample offset</th>
                  </tr>
                </thead>
                <tbody>
                  {EXAMPLE_ACTIVITY.map((item) => (
                    <tr key={`${item.learner}-${item.windowLabel}`}>
                      <td>
                        <span className="learner-cell">
                          <i className="avatar" aria-hidden="true">{item.initials}</i>
                          <span>{item.learner}</span>
                        </span>
                      </td>
                      <td>{item.action}</td>
                      <td>
                        <span className={`mode-badge ${item.credits > 0 ? "adapted" : "standard"}`}>
                          <span aria-hidden="true">{item.credits > 0 ? "● " : "○ "}</span>
                          {item.credits > 0 ? "Adapted" : "Standard (unmetered)"}
                        </span>
                      </td>
                      <td>
                        <strong className={item.credits > 0 ? "credit-debit" : "credit-zero"}>
                          {item.credits > 0 ? `−${formatDecimal(item.credits, 2)}` : "0"}
                        </strong>
                      </td>
                      <td>{item.windowLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <footer className="engine-footer">
            <span>
              <b>ADAPT</b> is an adaptive learning intelligence engine designed to sit behind Genlink.
            </span>
            <span>Presentation environment · example commercial figures remain editable and non-final</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

function FlowNode({ index, title, copy, tone }: { index: string; title: string; copy: string; tone: string }) {
  return (
    <article className={`flow-node ${tone}`}>
      <span>Step {index}</span>
      <div>
        <h3>{title}</h3>
        <p>{copy}</p>
      </div>
    </article>
  );
}

function NumericField({
  id,
  label,
  hideLabel = false,
  describedBy,
  value,
  min,
  max,
  decimals = 0,
  compact = false,
  onChange,
}: {
  id?: string;
  label: string;
  hideLabel?: boolean;
  describedBy?: string;
  value: number;
  min: number;
  max: number;
  decimals?: number;
  compact?: boolean;
  onChange: (value: number, notice: string | null) => void;
}) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [draft, setDraft] = useState<string>(() => String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDraft(String(value));
    }
  }, [value, focused]);

  function handleChange(raw: string) {
    setDraft(raw);
    const trimmed = raw.trim();
    if (trimmed === "") {
      onChange(min, null);
      return;
    }
    // Allow intermediate decimal point while typing (e.g. "1." or "0.")
    if (/^\d+\.$/.test(trimmed)) {
      const whole = sanitizeNumber(trimmed.slice(0, -1), { min, max, fallback: min, decimals });
      onChange(whole.value, null);
      return;
    }
    const checked = sanitizeNumber(trimmed, { min, max, fallback: min, decimals });
    if (checked.invalid) {
      onChange(checked.value, `${label}: enter a valid number between ${formatCount(min)} and ${formatDecimal(max, decimals)}.`);
    } else if (checked.clamped) {
      onChange(checked.value, `${label}: clamped to ${formatDecimal(checked.value, decimals)} (valid range ${formatCount(min)}–${formatCount(max)}).`);
    } else {
      onChange(checked.value, null);
    }
  }

  function handleBlur() {
    setFocused(false);
    const checked = sanitizeNumber(draft, { min, max, fallback: min, decimals });
    onChange(checked.value, null);
    setDraft(String(checked.value));
  }

  return (
    <div className={`numeric-field${compact ? " compact" : ""}`}>
      <label htmlFor={inputId} className={hideLabel ? "sr-only" : "numeric-field-label"}>
        {label}
      </label>
      <input
        id={inputId}
        className={`inline-number${compact ? " compact" : ""}`}
        type="text"
        inputMode={decimals > 0 ? "decimal" : "numeric"}
        aria-describedby={describedBy}
        value={focused ? draft : String(value)}
        onFocus={() => {
          setFocused(true);
          setDraft(String(value));
        }}
        onChange={(event) => handleChange(event.target.value)}
        onBlur={handleBlur}
      />
    </div>
  );
}

function CalcField({
  label,
  hint,
  value,
  min,
  max,
  sliderMax,
  step,
  decimals,
  summary,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  sliderMax: number;
  step: number;
  decimals: number;
  summary: string;
  onChange: (value: number, notice: string | null) => void;
}) {
  const inputId = useId();
  const hintId = useId();
  const sliderVal = Math.min(sliderMax, Math.max(min, value));

  return (
    <div className="calc-field">
      <div className="calc-field-top">
        <div>
          <label htmlFor={inputId} className="calc-field-label">
            {label}
          </label>
          <span id={hintId} className="calc-field-hint">
            {hint}
          </span>
        </div>
        <div className="calc-field-controls">
          <NumericField
            id={inputId}
            describedBy={hintId}
            label={label}
            hideLabel
            compact
            value={value}
            min={min}
            max={max}
            decimals={decimals}
            onChange={onChange}
          />
          <output htmlFor={inputId} className="calc-field-output">
            {summary}
          </output>
        </div>
      </div>
      <input
        className="calc-range"
        type="range"
        aria-label={`${label} slider`}
        min={min}
        max={sliderMax}
        step={step}
        value={sliderVal}
        onChange={(event) => onChange(Number(event.target.value), null)}
      />
    </div>
  );
}

function CheckIcon() {
  return (
    <span className="check-icon" aria-hidden="true">
      ✓
    </span>
  );
}

function NavIcon({ kind }: { kind: (typeof NAV_SECTIONS)[number]["icon"] }) {
  switch (kind) {
    case "grid":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="3" width="7" height="7" rx="2" />
          <rect x="14" y="3" width="7" height="7" rx="2" />
          <rect x="3" y="14" width="7" height="7" rx="2" />
          <rect x="14" y="14" width="7" height="7" rx="2" />
        </svg>
      );
    case "flow":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="5" cy="12" r="3" />
          <circle cx="19" cy="5" r="3" />
          <circle cx="19" cy="19" r="3" />
          <path d="M8 11l8-5M8 13l8 5" />
        </svg>
      );
    case "layers":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3L3 8l9 5 9-5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5" />
        </svg>
      );
    case "calculator":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="2" width="16" height="20" rx="3" />
          <path d="M8 6h8v4H8zM8 14h1m3 0h1m3 0h1M8 18h1m3 0h1m3 0h1" />
        </svg>
      );
    case "sliders":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 6h10m4 0h2M4 12h2m4 0h10M4 18h7m4 0h5" />
          <circle cx="16" cy="6" r="2" />
          <circle cx="8" cy="12" r="2" />
          <circle cx="13" cy="18" r="2" />
        </svg>
      );
    case "ledger":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 10h18M9 10v10" />
        </svg>
      );
  }
}
