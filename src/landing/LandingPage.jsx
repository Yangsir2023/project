import React, { useState, useEffect } from 'react';
import './LandingPage.css';

/* ─── Pipeline steps (Section ②) ─────────────────── */
const PIPELINE = [
  { id: 1, icon: '💬', label: 'Chat',     desc: 'Describe your idea in natural language', gate: false },
  { id: 2, icon: '🧠', label: 'RAG',       desc: 'Component knowledge base retrieval',        gate: false },
  { id: 3, icon: '📐', label: 'Proposal',  desc: 'AI generates skeleton → user CONFIRMS',      gate: true  },  // human gate
  { id: 4, icon: '🔗', label: 'DAG',       desc: 'Build workflow dependency graph',            gate: false },
  { id: 5, icon: '✏️', label: 'Edit',      desc: 'Drag-and-drop visual editor → user EDITS',   gate: true  },  // human gate
  { id: 6, icon: '🔍', label: 'Flowco',    desc: 'Data flow analysis & quality check',         gate: false },
  { id: 7, icon: '🚀', label: 'Deploy',    desc: 'One-click publish to live URL',              gate: false },
];

/* ─── Five Intervention Types (Section ③) ────────── */
const INTERVENTIONS = [
  {
    icon: '✅', tag: 'PROPOSAL', tagColor: 'blue',
    title: 'Slide Confirmation',
    desc: 'User reviews and approves the AI-generated skeleton before any code is produced.',
    thesis: 'Review and approve the AI plan before any code is written — the "propose → confirm" step.',
  },
  {
    icon: '🔧', tag: 'EDITOR', tagColor: 'orange',
    title: 'Block Patching',
    desc: 'Direct manipulation of individual content blocks — edit text, swap images, restyle inline.',
    thesis: 'Edit any block directly — no need to re-prompt the AI.',
  },
  {
    icon: '↔️', tag: 'SPATIAL', tagColor: 'purple',
    title: 'Spatial Rearrangement',
    desc: 'Drag blocks to reorder sections — the layout reflects user intent, not AI guesswork.',
    thesis: 'Rearrange layout by dragging — your intent, not the AI’s guess.',
  },
  {
    icon: '➕', tag: 'INSPECTOR', tagColor: 'green',
    title: 'Element Add / Remove',
    desc: 'Insert new components or delete unwanted ones through the Inspector panel.',
    thesis: 'Add or remove sections freely to shape the page structure.',
  },
  {
    icon: '💬', tag: 'AI PANEL', tagColor: 'blue',
    title: 'Chat-Patch',
    desc: 'Request changes via natural language while preserving existing manual edits.',
    thesis: 'Ask for changes in plain language while keeping your manual edits.',
  },
];

/* ─── Architecture layers (Section ①) ─────────────── */
const ARCH_LAYERS = [
  {
    label: 'INPUT',
    boxes: [
      { icon: '💬', title: 'User Intent', sub: 'Natural language description', color: 'blue' },
    ],
  },
  {
    label: 'RETRIEVE',
    boxes: [
      { icon: '🔍', title: 'RAG Engine',   sub: 'TF-IDF Semantic Search', color: 'purple' },
      { icon: '📚', title: 'Knowledge Base', sub: '22 Components · 6 Patterns', color: 'purple' },
    ],
  },
  {
    label: 'GENERATE',
    boxes: [
      { icon: '🧠', title: 'Gemini 2.5 Flash', sub: 'Augmented prompt → JSON skeleton', color: 'blue' },
    ],
  },
  {
    label: 'PROCESS',
    boxes: [
      { icon: '🔗', title: 'DAG Engine', sub: 'Dependency graph', color: 'orange' },
      { icon: '🔁', title: 'Flowco', sub: 'Data flow validation', color: 'green' },
    ],
  },
  {
    label: 'OUTPUT',
    boxes: [
      { icon: '🚀', title: 'Live Website', sub: 'Vercel · Netlify · Local HTML', color: 'red' },
    ],
  },
];

export default function LandingPage({ onEnter }) {
  const [activePipe, setActivePipe] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setActivePipe(p => (p + 1) % PIPELINE.length);
    }, 2000);
    return () => clearInterval(t);
  }, []);

  const handleEnter = () => {
    setVisible(false);
    setTimeout(() => onEnter(), 350);
  };

  return (
    <div className={`lp-root ${visible ? 'lp-root--visible' : ''}`}>

      {/* ── Background ───────────────────────────── */}
      <div className="lp-bg">
        <div className="lp-bg-orb lp-bg-orb--1" />
        <div className="lp-bg-orb lp-bg-orb--2" />
        <div className="lp-bg-orb lp-bg-orb--3" />
        <div className="lp-bg-grid" />
      </div>

      <div className="lp-scroll">

        {/* ══════════════════════════════════════════
            HERO — Research Prototype Framing
            ══════════════════════════════════════════ */}
        <section className="lp-hero">
          <div className="lp-hero-badge">
            <span className="lp-badge-dot" />
            Research Prototype &middot; Newcastle University MSc Dissertation
          </div>

          <h1 className="lp-hero-title">
            <span className="lp-hero-title-line1">Bifrost</span>
            <span className="lp-hero-title-line2">Human-Controlled AI Visual Content Generation</span>
          </h1>

          <p className="lp-hero-sub">
            A research prototype that tests one question:<br />
            <span className="lp-hero-rq">"If we keep humans in control during AI visual content generation, do they trust the output more?"</span>
          </p>

          <div className="lp-hero-actions">
            <button className="lp-btn-primary" onClick={handleEnter}>
              <span>Launch App</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <div className="lp-hero-hint">n = 24 &middot; between-subjects &middot; t(22) = 3.74, p &lt; .001</div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            SECTION ① · ARCHITECTURE
            ══════════════════════════════════════════ */}
        <section className="lp-section lp-section--dark lp-s1">
          <div className="lp-section-header">
            <span className="lp-section-tag lp-section-tag--num">① ARCHITECTURE</span>
            <h2 className="lp-section-title">Multi-Stage Pipeline with Human Checkpoints</h2>
            <p className="lp-section-sub">
              Control Authority Loop: human decision points sit BETWEEN every layer — not just at the end.
            </p>
          </div>

          <div className="lp-arch">
            {ARCH_LAYERS.map((layer, li) => (
              <React.Fragment key={layer.label}>
                <div className="lp-arch-layer">
                  <div className="lp-arch-layer-label">{layer.label}</div>
                  <div className={layer.boxes.length > 1 ? 'lp-arch-row' : ''}>
                    {layer.boxes.map((box, bi) => (
                      <div key={bi} className={`lp-arch-box lp-arch-box--${box.color} ${layer.boxes.length > 1 ? 'lp-arch-box--sm' : ''}`}>
                        <div className="lp-arch-box-icon">{box.icon}</div>
                        <div className="lp-arch-box-title">{box.title}</div>
                        <div className="lp-arch-box-sub">{box.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {li < ARCH_LAYERS.length - 1 && (
                  <div className="lp-arch-vline-wrap">
                    <div className="lp-arch-vline" />
                    <div className="lp-arch-checkpoint">
                      <span className="lp-arch-check-icon">🛑</span>
                      <span className="lp-arch-check-label">Human Checkpoint</span>
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="lp-s1-note">
            🛑 <b>Control is continuous:</b> human checkpoints sit between every layer of the pipeline — not just a final approval step.
          </div>
        </section>

        {/* ══════════════════════════════════════════
            SECTION ② · PIPELINE
            ══════════════════════════════════════════ */}
        <section className="lp-section lp-s2">
          <div className="lp-section-header">
            <span className="lp-section-tag lp-section-tag--num">② PIPELINE</span>
            <h2 className="lp-section-title">7 Stages, 2 Human Gates</h2>
            <p className="lp-section-sub">
              Staged design prevents "<em>silent error propagation</em>":
              errors are caught before commitment, not discovered after deployment.
            </p>
          </div>

          <div className="lp-pipeline">
            {PIPELINE.map((step, i) => (
              <React.Fragment key={step.id}>
                <div
                  className={`lp-pipe-node ${activePipe === i ? 'lp-pipe-node--active' : ''} ${step.gate ? 'lp-pipe-node--gate' : ''}`}
                  onClick={() => setActivePipe(i)}
                >
                  {step.gate && <div className="lp-pipe-gate-badge">HUMAN GATE</div>}
                  <div className="lp-pipe-icon">{step.icon}</div>
                  <div className="lp-pipe-label">{step.label}</div>
                  <div className="lp-pipe-desc">{step.desc}</div>
                  <div className="lp-pipe-num">{i + 1}</div>
                </div>
                {i < PIPELINE.length - 1 && (
                  <div className={`lp-pipe-arrow ${activePipe > i ? 'lp-pipe-arrow--done' : ''}`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12h14M15 8l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="lp-s2-note">
            🟧 <b>Two control gates:</b> Proposal and Edit are where the human stays in command. Catching mistakes here stops them from silently spreading downstream.
          </div>
        </section>

        {/* ══════════════════════════════════════════
            SECTION ③ · FIVE INTERVENTIONS
            ══════════════════════════════════════════ */}
        <section className="lp-section lp-section--dark lp-s3">
          <div className="lp-section-header">
            <span className="lp-section-tag lp-section-tag--num">③ INTERVENTIONS</span>
            <h2 className="lp-section-title">Five Control Mechanisms</h2>
            <p className="lp-section-sub">
              These are not product features — they are the <b>experimental operationalization</b> of control authority.<br />
              A between-subjects user study (n=24) tested whether these mechanisms <b>increase trust in AI-generated output</b>.<br />
              Result: <b>t(22)=3.74, p&lt;.001, d=1.53</b> — a large effect size (Bifrost M=5.75 vs baseline M=4.00).
            </p>
          </div>

          <div className="lp-interventions-grid">
            {INTERVENTIONS.map(iv => (
              <div key={iv.title} className="lp-intervention-card">
                <div className="lp-intervention-top">
                  <div className="lp-intervention-icon">{iv.icon}</div>
                  <span className={`lp-feature-tag lp-feature-tag--${iv.tagColor}`}>{iv.tag}</span>
                </div>
                <h3 className="lp-intervention-title">{iv.title}</h3>
                <p className="lp-intervention-desc">{iv.desc}</p>
                <div className="lp-intervention-thesis">{iv.thesis}</div>
              </div>
            ))}
          </div>

          <div className="lp-s3-note">
            🔵 <b>Why it matters:</b> these five mechanisms are how users keep control.
            In the study, having them significantly increased trust (<b>t(22)=3.74, p&lt;.001, d=1.53</b>).
          </div>
        </section>

        {/* ══════════════════════════════════════════
            FOOTER (simplified)
            ══════════════════════════════════════════ */}
        <footer className="lp-footer">
          <span>Bifrost</span>
          <span className="lp-footer-dot">&middot;</span>
          <span>Newcastle University &mdash; School of Computing</span>
          <span className="lp-footer-dot">&middot;</span>
          <span>CSC8099 MSc Dissertation</span>
        </footer>

      </div>
    </div>
  );
}
