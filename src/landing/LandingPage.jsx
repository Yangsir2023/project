import React, { useState, useEffect } from 'react';
import './LandingPage.css';

/* ─── Pipeline steps ─────────────────────────────── */
const PIPELINE = [
  { id: 1, icon: '💬', label: 'Chat', desc: 'Describe your idea in natural language' },
  { id: 2, icon: '🧠', label: 'RAG Retrieve', desc: 'Component knowledge base retrieval' },
  { id: 3, icon: '📐', label: 'Skeleton', desc: 'AI generates PPT-style visual outline' },
  { id: 4, icon: '🔗', label: 'DAG Engine', desc: 'Build workflow dependency graph' },
  { id: 5, icon: '✏️', label: 'Edit', desc: 'Drag-and-drop visual slide editor' },
  { id: 6, icon: '🔍', label: 'Flowco Validate', desc: 'Data flow analysis & quality check' },
  { id: 7, icon: '🚀', label: 'Deploy', desc: 'One-click publish to Vercel / Netlify' },
];

/* ─── Feature cards ──────────────────────────────── */
const FEATURES = [
  {
    icon: '🤖',
    tag: 'CORE',
    tagColor: 'blue',
    title: 'AI Chat Pipeline',
    desc: 'Gemini-powered conversational interface that clarifies your intent before generating anything.',
    bullets: ['Multi-turn context memory', 'Intent detection & validation', 'Smart clarification prompts'],
  },
  {
    icon: '🔍',
    tag: 'RAG',
    tagColor: 'purple',
    title: 'Component Retrieval (RAG)',
    desc: 'TF-IDF semantic search over 22 component templates and 6 layout patterns.',
    bullets: ['Semantic similarity matching', 'Auto-augmented prompts', 'Layout pattern suggestions'],
  },
  {
    icon: '🗂️',
    tag: 'VISUAL',
    tagColor: 'blue',
    title: 'PPT-style Visual Editor',
    desc: 'Build websites like building slides — every section is an editable card.',
    bullets: ['Drag & drop text boxes', 'Live preview per section', 'Multi-slide management'],
  },
  {
    icon: '🔗',
    tag: 'DAG',
    tagColor: 'orange',
    title: 'DAG Workflow Engine',
    desc: 'Model complex multi-page websites as a dependency graph, not just a linear list.',
    bullets: ['Topological sort execution', 'Cycle detection & warnings', 'Dependency visualization'],
  },
  {
    icon: '🔁',
    tag: 'FLOWCO',
    tagColor: 'green',
    title: 'Flowco Data Flow Validator',
    desc: 'Automatically analyzes your slide data flow and catches errors before code generation.',
    bullets: ['Empty content detection', 'Layout conflict checks', 'Alt-text accessibility audit'],
  },
  {
    icon: '🚀',
    tag: 'DEPLOY',
    tagColor: 'red',
    title: 'One-click Deploy',
    desc: 'From local HTML to a live URL in seconds — supports Vercel, Netlify and local download.',
    bullets: ['Vercel API integration', 'Netlify drag-drop deploy', 'Offline HTML bundle download'],
  },
  {
    icon: '⚡',
    tag: 'SPEED',
    tagColor: 'yellow',
    title: 'Parallel Pipeline Engine',
    desc: 'Skeleton-of-Thought inspired parallel compilation — 3x faster than serial generation.',
    bullets: ['Concurrent slide compilation', 'Intelligent batch scheduling', 'Real-time progress streaming'],
  },
];

/* ─── Tech stack badges ─────────────────────────── */
const STACK = [
  'Gemini 2.5 Flash', 'React 19', 'Vite', 'TF-IDF RAG',
  'DAG Topological Sort', 'Flowco Validator', 'Vercel API', 'Netlify API',
];

/* ─── Stats ─────────────────────────────────────── */
const STATS = [
  { value: '7', unit: 'Stage', label: 'AI Pipeline' },
  { value: '22', unit: 'Built-in', label: 'Components' },
  { value: '6', unit: 'Layout', label: 'Patterns' },
  { value: '3x', unit: 'Faster', label: 'Parallel Engine' },
];

/* ─── Speed comparison ────────────────────────────── */
const SPEED_COMPARE = {
  before: { label: 'Before (Serial)', time: '20s', color: '#f87171' },
  after:  { label: 'After (Parallel)', time: '7s',  color: '#34d399' },
  stages: [
    { name: 'RAG Retrieve',  before: 0.05, after: 0.05 },
    { name: 'Skeleton Gen',  before: 4,    after: 2    },
    { name: 'DAG + Flowco', before: 0.03, after: 0.03 },
    { name: 'Compile ×N',    before: 12,   after: 3.5  },
    { name: 'Final Code',    before: 4,    after: 1.5  },
  ],
};

export default function LandingPage({ onEnter }) {
  const [activePipe, setActivePipe] = useState(0);
  const [visible, setVisible] = useState(false);

  /* Entrance animation */
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  /* Auto-advance pipeline indicator */
  useEffect(() => {
    const t = setInterval(() => {
      setActivePipe(p => (p + 1) % PIPELINE.length);
    }, 1800);
    return () => clearInterval(t);
  }, []);

  const handleEnter = () => {
    setVisible(false);
    setTimeout(() => onEnter(), 350);
  };

  return (
    <div className={`lp-root ${visible ? 'lp-root--visible' : ''}`}>

      {/* ── Animated background ────────────────────── */}
      <div className="lp-bg">
        <div className="lp-bg-orb lp-bg-orb--1" />
        <div className="lp-bg-orb lp-bg-orb--2" />
        <div className="lp-bg-orb lp-bg-orb--3" />
        <div className="lp-bg-grid" />
      </div>

      <div className="lp-scroll">

        {/* ══════════════════════════════════════════
            HERO
            ══════════════════════════════════════════ */}
        <section className="lp-hero">
          <div className="lp-hero-badge">
            <span className="lp-badge-dot" />
            AI-Powered · Visual · End-to-End
          </div>

          <h1 className="lp-hero-title">
            <span className="lp-hero-title-line1">Bifrost</span>
            <span className="lp-hero-title-line2">Visual AI Web Engine</span>
          </h1>

          <p className="lp-hero-sub">
            Describe a website in plain English.<br />
            Bifrost retrieves, generates, validates, and deploys — automatically.
          </p>

          <div className="lp-hero-actions">
            <button className="lp-btn-primary" onClick={handleEnter}>
              <span>Launch App</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <div className="lp-hero-hint">No backend · No signup · API key only</div>
          </div>

          {/* Stats row */}
          <div className="lp-stats">
            {STATS.map(s => (
              <div key={s.label} className="lp-stat">
                <div className="lp-stat-value">
                  {s.value}<span className="lp-stat-unit">{s.unit}</span>
                </div>
                <div className="lp-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════
            PIPELINE VISUALIZER
            ══════════════════════════════════════════ */}
        <section className="lp-section">
          <div className="lp-section-header">
            <span className="lp-section-tag">HOW IT WORKS</span>
            <h2 className="lp-section-title">7-Stage AI Pipeline</h2>
            <p className="lp-section-sub">Every step is visible, editable and explainable</p>
          </div>

          <div className="lp-pipeline">
            {PIPELINE.map((step, i) => (
              <React.Fragment key={step.id}>
                <div
                  className={`lp-pipe-node ${activePipe === i ? 'lp-pipe-node--active' : ''}`}
                  onClick={() => setActivePipe(i)}
                >
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
        </section>

        {/* ══════════════════════════════════════════
            FEATURES GRID
            ══════════════════════════════════════════ */}
        <section className="lp-section">
          <div className="lp-section-header">
            <span className="lp-section-tag">CAPABILITIES</span>
            <h2 className="lp-section-title">Everything You Need</h2>
            <p className="lp-section-sub">From raw idea to deployed website, powered by AI at every stage</p>
          </div>

          <div className="lp-features-grid">
            {FEATURES.map(f => (
              <div key={f.title} className="lp-feature-card">
                <div className="lp-feature-top">
                  <div className="lp-feature-icon">{f.icon}</div>
                  <span className={`lp-feature-tag lp-feature-tag--${f.tagColor}`}>{f.tag}</span>
                </div>
                <h3 className="lp-feature-title">{f.title}</h3>
                <p className="lp-feature-desc">{f.desc}</p>
                <ul className="lp-feature-bullets">
                  {f.bullets.map(b => (
                    <li key={b}>
                      <span className="lp-bullet-check">✓</span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════
            WORKFLOW DIAGRAM
            ══════════════════════════════════════════ */}
        {/* ════════════════════════════════════════
            PERFORMANCE COMPARISON
            ════════════════════════════════════════ */}
        <section className="lp-section">
          <div className="lp-section-header">
            <span className="lp-section-tag">PERFORMANCE</span>
            <h2 className="lp-section-title">3x Faster with Parallel Pipeline</h2>
            <p className="lp-section-sub">Skeleton-of-Thought inspired concurrent compilation</p>
          </div>
          <div className="lp-perf">
            <div className="lp-perf-cards">
              <div className="lp-perf-card lp-perf-card--before">
                <div className="lp-perf-card-label">Before</div>
                <div className="lp-perf-card-time">20s</div>
                <div className="lp-perf-card-desc">Serial compilation</div>
                <div className="lp-perf-card-bar">
                  <div className="lp-perf-bar lp-perf-bar--before" style={{ width: '100%' }} />
                </div>
              </div>
              <div className="lp-perf-arrow">→</div>
              <div className="lp-perf-card lp-perf-card--after">
                <div className="lp-perf-card-label">After</div>
                <div className="lp-perf-card-time">7s</div>
                <div className="lp-perf-card-desc">Parallel compilation</div>
                <div className="lp-perf-card-bar">
                  <div className="lp-perf-bar lp-perf-bar--after" style={{ width: '35%' }} />
                </div>
              </div>
            </div>
            <div className="lp-perf-breakdown">
              <div className="lp-perf-breakdown-title">Stage-by-stage breakdown</div>
              {SPEED_COMPARE.stages.map(s => {
                const beforePct = Math.max(s.before, 0.02) / 20 * 100;
                const afterPct  = Math.max(s.after,  0.02) / 7  * 100;
                return (
                  <div key={s.name} className="lp-perf-row">
                    <div className="lp-perf-row-name">{s.name}</div>
                    <div className="lp-perf-row-bars">
                      <div className="lp-perf-row-bar-wrap">
                        <div className="lp-perf-row-bar lp-perf-row-bar--before" style={{ width: `${beforePct}%` }} />
                        <span className="lp-perf-row-val">{s.before}s</span>
                      </div>
                      <div className="lp-perf-row-bar-wrap">
                        <div className="lp-perf-row-bar lp-perf-row-bar--after" style={{ width: `${afterPct}%` }} />
                        <span className="lp-perf-row-val">{s.after}s</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="lp-perf-total">
                <span>Total</span>
                <span className="lp-perf-total-before">20s</span>
                <span className="lp-perf-total-after">7s</span>
                <span className="lp-perf-total-badge">2.9x speedup</span>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-section lp-section--dark">
          <div className="lp-section-header">
            <span className="lp-section-tag lp-section-tag--light">ARCHITECTURE</span>
            <h2 className="lp-section-title lp-section-title--light">Multi-Stage LLM Pipeline</h2>
            <p className="lp-section-sub lp-section-sub--light">Controlled Natural Language Prompting at every stage</p>
          </div>

          <div className="lp-arch">
            {/* Input layer */}
            <div className="lp-arch-layer">
              <div className="lp-arch-layer-label">INPUT</div>
              <div className="lp-arch-box lp-arch-box--blue">
                <div className="lp-arch-box-icon">💬</div>
                <div className="lp-arch-box-title">User Intent</div>
                <div className="lp-arch-box-sub">Natural language description</div>
              </div>
            </div>

            <div className="lp-arch-vline" />

            {/* Retrieve layer */}
            <div className="lp-arch-layer">
              <div className="lp-arch-layer-label">RETRIEVE</div>
              <div className="lp-arch-row">
                <div className="lp-arch-box lp-arch-box--purple lp-arch-box--sm">
                  <div className="lp-arch-box-icon">🔍</div>
                  <div className="lp-arch-box-title">RAG Engine</div>
                  <div className="lp-arch-box-sub">TF-IDF Semantic Search</div>
                </div>
                <div className="lp-arch-box lp-arch-box--purple lp-arch-box--sm">
                  <div className="lp-arch-box-icon">📚</div>
                  <div className="lp-arch-box-title">Knowledge Base</div>
                  <div className="lp-arch-box-sub">22 Components · 6 Patterns</div>
                </div>
              </div>
            </div>

            <div className="lp-arch-vline" />

            {/* Generate layer */}
            <div className="lp-arch-layer">
              <div className="lp-arch-layer-label">GENERATE</div>
              <div className="lp-arch-box lp-arch-box--blue">
                <div className="lp-arch-box-icon">🧠</div>
                <div className="lp-arch-box-title">Gemini 2.5 Flash</div>
                <div className="lp-arch-box-sub">Augmented prompt → JSON skeleton</div>
              </div>
            </div>

            <div className="lp-arch-vline" />

            {/* Process layer */}
            <div className="lp-arch-layer">
              <div className="lp-arch-layer-label">PROCESS</div>
              <div className="lp-arch-row">
                <div className="lp-arch-box lp-arch-box--orange lp-arch-box--sm">
                  <div className="lp-arch-box-icon">🔗</div>
                  <div className="lp-arch-box-title">DAG Engine</div>
                  <div className="lp-arch-box-sub">Dependency graph</div>
                </div>
                <div className="lp-arch-box lp-arch-box--green lp-arch-box--sm">
                  <div className="lp-arch-box-icon">🔁</div>
                  <div className="lp-arch-box-title">Flowco</div>
                  <div className="lp-arch-box-sub">Data flow validation</div>
                </div>
              </div>
            </div>

            <div className="lp-arch-vline" />

            {/* Output layer */}
            <div className="lp-arch-layer">
              <div className="lp-arch-layer-label">OUTPUT</div>
              <div className="lp-arch-box lp-arch-box--red">
                <div className="lp-arch-box-icon">🚀</div>
                <div className="lp-arch-box-title">Live Website</div>
                <div className="lp-arch-box-sub">Vercel · Netlify · Local HTML</div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            TECH STACK
            ══════════════════════════════════════════ */}
        <section className="lp-section">
          <div className="lp-section-header">
            <span className="lp-section-tag">TECH STACK</span>
            <h2 className="lp-section-title">Built with Modern Tools</h2>
          </div>
          <div className="lp-stack">
            {STACK.map(s => (
              <span key={s} className="lp-stack-badge">{s}</span>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════
            CTA
            ══════════════════════════════════════════ */}
        <section className="lp-cta">
          <div className="lp-cta-glow" />
          <h2 className="lp-cta-title">Ready to build?</h2>
          <p className="lp-cta-sub">
            Add your Gemini API key and start building your first website with AI.
          </p>
          <button className="lp-btn-primary lp-btn-primary--lg" onClick={handleEnter}>
            <span>Launch Bifrost</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 10h12M12 6l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </section>

        {/* Footer */}
        <footer className="lp-footer">
          <span>Bifrost Visual AI Web Engine</span>
          <span className="lp-footer-dot">·</span>
          <span>Newcastle University Dissertation Project</span>
          <span className="lp-footer-dot">·</span>
          <span>Built with Gemini 2.5 Flash</span>
        </footer>

      </div>
    </div>
  );
}
