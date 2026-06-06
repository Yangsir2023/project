import React, {
  useMemo, useRef, useState, useEffect, useCallback,
} from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import VersionPanel from './VersionPanel.jsx';

/* ────────────────────────────────────────────────────────────
   Constants
   ──────────────────────────────────────────────────────────── */

const LOG_KEY     = 'bifrost_interaction_log';
const THEME_KEY   = 'bifrost_theme';
const MAX_CONTEXT = 6;

const GENERATION_STAGES = [
  { label: 'Parsing your intent…',        icon: '🔍' },
  { label: 'Planning interface structure…',icon: '📐' },
  { label: 'Writing production HTML…',    icon: '✍️'  },
  { label: 'Rendering in sandbox…',       icon: '🚀' },
];

const PIPELINE_STAGES = [
  { label: 'Analysing your workflow…',    icon: '🔍' },
  { label: 'Mapping pipeline stages…',   icon: '🗺️' },
  { label: 'Designing data flow…',       icon: '🌊' },
  { label: 'Generating step previews…',  icon: '🎨' },
];

/* Prompt template library (Dify / Typeflow inspiration) */
const PROMPT_TEMPLATES = [
  { icon: '📊', label: 'Dashboard',   text: 'Build a modern analytics dashboard with KPI cards, a line chart, and a data table showing monthly revenue trends.' },
  { icon: '🔐', label: 'Login UI',    text: 'Create a sleek login page with email/password fields, social auth buttons, and smooth form validation feedback.' },
  { icon: '🛒', label: 'E-commerce',  text: 'Design a product card grid with filters, a cart button, and a quick-view modal for an e-commerce store.' },
  { icon: '⚡',  label: 'Pipeline',    text: 'Visualize an ETL data pipeline that ingests CSV files, validates schema, transforms data, and exports to a database.' },
  { icon: '🤖', label: 'AI Chat',     text: 'Create an AI chat interface with message bubbles, typing indicator, and a code block renderer.' },
  { icon: '📈', label: 'Kanban',      text: 'Build a Kanban board with drag-and-drop columns (To Do, In Progress, Done) and task cards with priority labels.' },
];

/* Pipeline step icon map */
const STEP_ICONS = {
  ingest: '📥', collect: '📥', import: '📥', input: '📥', source: '📥',
  stream: '🌊', realtime: '🌊', queue: '🌊', buffer: '🌊', event: '🌊',
  validate: '🔍', check: '🔍', verify: '🔍', inspect: '🔍', test: '🔍',
  clean: '🧹', sanitize: '🧹', filter: '🧹', dedupe: '🧹',
  transform: '⚙️', process: '⚙️', convert: '⚙️', parse: '⚙️', enrich: '⚙️',
  join: '🔗', merge: '🔗', combine: '🔗', aggregate: '🔗',
  analyze: '📊', analyse: '📊', compute: '📊', metrics: '📊', score: '📊',
  model: '🤖', train: '🤖', predict: '🤖', infer: '🤖', evaluate: '🤖',
  visualize: '📈', visualise: '📈', chart: '📈', report: '📈', dashboard: '📈',
  store: '💾', save: '💾', persist: '💾', write: '💾', load: '💾',
  export: '📤', send: '📤', deliver: '📤', publish: '📤', output: '📤',
  notify: '🔔', alert: '🔔', monitor: '🔔', watch: '🔔',
  auth: '🔐', secure: '🔐', encrypt: '🔐',
  api: '🌐', fetch: '🌐', request: '🌐', sync: '🌐',
  cache: '⚡', index: '⚡', optimize: '⚡',
};

const NODE_COLORS = [
  { bg: '#eff6ff', border: '#bfdbfe', num: '#1d4ed8', icon: '#3b82f6' },
  { bg: '#f0fdf4', border: '#bbf7d0', num: '#15803d', icon: '#22c55e' },
  { bg: '#fdf4ff', border: '#e9d5ff', num: '#7e22ce', icon: '#a855f7' },
  { bg: '#fff7ed', border: '#fed7aa', num: '#c2410c', icon: '#f97316' },
  { bg: '#f0f9ff', border: '#bae6fd', num: '#0369a1', icon: '#0ea5e9' },
  { bg: '#fefce8', border: '#fef08a', num: '#854d0e', icon: '#eab308' },
  { bg: '#fff1f2', border: '#fecdd3', num: '#9f1239', icon: '#f43f5e' },
  { bg: '#f0fdfa', border: '#99f6e4', num: '#0f766e', icon: '#14b8a6' },
];

/* Node colors for dark theme */
const NODE_COLORS_DARK = [
  { bg: '#1e3a5f', border: '#1d4ed8', num: '#93c5fd', icon: '#60a5fa' },
  { bg: '#14532d', border: '#15803d', num: '#86efac', icon: '#4ade80' },
  { bg: '#2e1065', border: '#7e22ce', num: '#d8b4fe', icon: '#c084fc' },
  { bg: '#431407', border: '#c2410c', num: '#fdba74', icon: '#fb923c' },
  { bg: '#0c4a6e', border: '#0369a1', num: '#7dd3fc', icon: '#38bdf8' },
  { bg: '#422006', border: '#854d0e', num: '#fde047', icon: '#facc15' },
  { bg: '#4c0519', border: '#9f1239', num: '#fda4af', icon: '#fb7185' },
  { bg: '#134e4a', border: '#0f766e', num: '#5eead4', icon: '#2dd4bf' },
];

const defaultHTML = (icon, title, desc) =>
  `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"><style>body{font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:linear-gradient(135deg,#f8fafc,#f1f5f9);color:#6b7280}.card{background:white;border:1px solid #e5e7eb;border-radius:16px;padding:40px 48px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.06);max-width:480px}.ico{font-size:48px;margin-bottom:16px;line-height:1}h2{color:#111827;font-size:20px;font-weight:700;margin:0 0 8px}p{font-size:13px;line-height:1.6;margin:0}</style></head><body><div class="card"><div class="ico">${icon}</div><h2>${title}</h2><p>${desc}</p></div></body></html>`;

const starterCode = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
      body { margin: 0; font-family: 'Inter', sans-serif; background: #fafafa; color: #111827; }
      main { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 40px; }
      section { max-width: 640px; background: white; border: 1px solid #eaeaea; padding: 48px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 10px 15px -3px rgba(0,0,0,0.05); text-align: center; }
      .icon { width: 52px; height: 52px; background: linear-gradient(135deg,#eff6ff,#f5f3ff); border-radius: 14px; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; font-size: 24px; }
      h1 { margin: 0 0 14px; font-size: 30px; font-weight: 700; letter-spacing: -0.03em; }
      p { margin: 0; line-height: 1.65; color: #6b7280; font-size: 15px; }
    </style>
  </head>
  <body>
    <main>
      <section>
        <div class="icon">🌉</div>
        <h1>Bifrost Preview</h1>
        <p>Describe an interface or backend workflow in the panel on the right. The output will instantly render here.</p>
      </section>
    </main>
  </body>
</html>`;

const defaultPipeline = {
  title: 'Data Pipeline Preview',
  summary: 'Describe a backend workflow to visualize the pipeline here.',
  steps: [
    { title: 'Ingest',    description: 'Collect raw data from forms, APIs, logs, or uploaded files.',   html: defaultHTML('📥', 'Ingest',    'Collect raw data from forms, APIs, logs, or uploaded files.')   },
    { title: 'Validate',  description: 'Check schema, missing values, ranges, and duplicate records.', html: defaultHTML('🔍', 'Validate',  'Check schema, missing values, ranges, and duplicate records.') },
    { title: 'Transform', description: 'Clean, normalize, enrich, and join the dataset.',              html: defaultHTML('⚙️', 'Transform', 'Clean, normalize, enrich, and join the dataset.')              },
    { title: 'Analyze',   description: 'Run metrics, models, aggregations, or experiment analysis.',   html: defaultHTML('📊', 'Analyze',   'Run metrics, models, aggregations, or experiment analysis.')   },
    { title: 'Visualize', description: 'Render dashboards, charts, alerts, and reports.',              html: defaultHTML('📈', 'Visualize', 'Render dashboards, charts, alerts, and reports.')              },
    { title: 'Export',    description: 'Send results to CSV, database, dashboard, or appendix.',       html: defaultHTML('📤', 'Export',    'Send results to CSV, database, dashboard, or appendix.')       },
  ],
};

/* ────────────────────────────────────────────────────────────
   Utility functions
   ──────────────────────────────────────────────────────────── */

function cleanCode(text) {
  return text.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
}

function cleanJson(text) {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
}

function safeParseJson(raw) {
  try { return JSON.parse(raw); } catch (_) {}
  try {
    const sanitised = raw.replace(
      /"((?:[^"\\]|\\.)*)"/gs,
      (_, inner) => '"' + inner
        .replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
        // eslint-disable-next-line no-control-regex
        .replace(/[\x00-\x1F\x7F]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'))
        + '"',
    );
    return JSON.parse(sanitised);
  } catch (_) {}
  try {
    return JSON.parse(raw.replace(/"html"\s*:\s*"(?:[^"\\]|\\.)*"/gs, '"html":""'));
  } catch (e) {
    throw new Error(`Failed to parse pipeline JSON: ${e.message}`);
  }
}

function getStepIcon(title) {
  const key = title.toLowerCase().replace(/[^a-z]/g, '');
  for (const [word, icon] of Object.entries(STEP_ICONS)) {
    if (key.includes(word)) return icon;
  }
  return '🔷';
}

function readLog() {
  try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); }
  catch { return []; }
}

function logEvent(event) {
  const nextLog = [...readLog(), { timestamp: new Date().toISOString(), ...event }];
  localStorage.setItem(LOG_KEY, JSON.stringify(nextLog));
}

/* ────────────────────────────────────────────────────────────
   StepRefineChat component (unchanged logic, refined styling)
   ──────────────────────────────────────────────────────────── */

function StepRefineChat({ step, stepIndex, onUpdateHtml, getModel }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [refining, setRefining] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { setMessages([]); setInput(''); }, [stepIndex]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || refining) return;
    setInput('');
    const userMsg = { role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setRefining(true);

    try {
      const model = getModel();
      const history = messages.map((m) => `${m.role}: ${m.text}`).join('\n');
      const prompt = `You are Bifrost. The user is refining the output for pipeline step "${step.title}".
Step description: ${step.description}
${history ? `\nConversation so far:\n${history}` : ''}

User instruction: ${text}

Generate a COMPLETE standalone HTML page (with embedded CSS, no external dependencies except Google Fonts Inter) that shows this step's output reflecting the user's instruction. The page must look like a real production tool — real data tables, inline SVG charts, professional typography, colour schemes. Return ONLY valid HTML, no markdown, no explanation.`;

      const result = await model.generateContent(prompt);
      const html = cleanCode((await result.response).text());
      onUpdateHtml(stepIndex, html);
      setMessages((prev) => [...prev, { role: 'assistant', text: `Updated the preview for "${step.title}" based on your instruction.` }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', text: `Error: ${err.message || 'Failed to refine step.'}` }]);
    } finally {
      setRefining(false);
    }
  };

  return (
    <div className="pw-refine-chat">
      <div className="pw-refine-chat-header">
        <span className="pw-refine-chat-icon">✏️</span>
        <span className="pw-refine-chat-title">Refine this step</span>
        <span className="pw-refine-chat-hint">Describe changes — AI will regenerate the preview</span>
      </div>

      {messages.length > 0 && (
        <div className="pw-refine-chat-history">
          {messages.map((m, i) => (
            <div key={i} className={`pw-refine-msg pw-refine-msg--${m.role}`}>
              <span className="pw-refine-msg-label">{m.role === 'user' ? 'You' : 'Bifrost'}</span>
              <span className="pw-refine-msg-text">{m.text}</span>
            </div>
          ))}
          {refining && (
            <div className="pw-refine-msg pw-refine-msg--assistant">
              <span className="pw-refine-msg-label">Bifrost</span>
              <span className="pw-refine-msg-text pw-refine-typing">Generating…</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      <div className="pw-refine-input-row">
        <textarea
          className="pw-refine-textarea"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='e.g. "Show a dark-mode terminal output" or "Add a bar chart"'
          disabled={refining}
          rows={2}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
        />
        <button
          className={`pw-refine-send-btn${refining ? ' is-loading' : ''}`}
          onClick={send}
          disabled={!input.trim() || refining}
        >
          {refining ? '…' : '→'}
        </button>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   PipelineView — Intro / Steps / Summary wizard
   ──────────────────────────────────────────────────────────── */

function PipelineView({ pipeline: initialPipeline, isAiGenerated, onRefineStep, onRequestRegenerate, getModel, isDark }) {
  const [pipeline, setPipeline]       = useState(initialPipeline);
  const [phase, setPhase]             = useState('intro');
  const [activeIdx, setActiveIdx]     = useState(0);
  const [confirmed, setConfirmed]     = useState({});
  const [fullscreen, setFullscreen]   = useState(false);
  const [finalHtml, setFinalHtml]     = useState('');
  const [finalLoading, setFinalLoading] = useState(false);
  const [finalError, setFinalError]   = useState('');
  const [showFinal, setShowFinal]     = useState(false);
  const pipelineIdRef = useRef('');

  const colors = isDark ? NODE_COLORS_DARK : NODE_COLORS;

  useEffect(() => {
    const newId = initialPipeline.title + '|' + initialPipeline.steps.length;
    if (newId !== pipelineIdRef.current) {
      pipelineIdRef.current = newId;
      setPipeline(initialPipeline);
      setPhase('intro'); setActiveIdx(0); setConfirmed({});
      setFullscreen(false); setFinalHtml(''); setFinalError(''); setShowFinal(false);
    }
  }, [initialPipeline]);

  /* Global keyboard handler (Linear style) */
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
      if (phase === 'steps') {
        if (e.key === 'ArrowRight' && activeIdx < pipeline.steps.length - 1) {
          setActiveIdx((i) => i + 1);
        } else if (e.key === 'ArrowLeft' && activeIdx > 0) {
          setActiveIdx((i) => i - 1);
        } else if (e.key === 'Escape') {
          if (fullscreen) setFullscreen(false);
          else setPhase('intro');
        } else if (e.key === ' ') {
          e.preventDefault();
          confirmStep();
        }
      } else if (phase === 'intro' || phase === 'summary') {
        if (e.key === 'Escape') onRequestRegenerate && onRequestRegenerate();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, activeIdx, pipeline, fullscreen]);

  const totalSteps = pipeline.steps.length;

  const handleUpdateHtml = (idx, html) => {
    setPipeline((p) => ({ ...p, steps: p.steps.map((s, i) => i === idx ? { ...s, html } : s) }));
  };

  const confirmStep = () => {
    const next = { ...confirmed, [activeIdx]: true };
    setConfirmed(next);
    if (activeIdx < totalSteps - 1) setActiveIdx(activeIdx + 1);
    else setPhase('summary');
  };

  /* ── INTRO ── */
  if (phase === 'intro') {
    return (
      <div className="pw-intro">
        <div className="pw-intro-header">
          <div className="pw-intro-badge">
            {isAiGenerated && <span className="pw-ai-chip">✦ AI Generated</span>}
            <span className="pw-intro-label">Backend Behaviour Visualization</span>
          </div>
          <h2 className="pw-intro-title">{pipeline.title}</h2>
          <p className="pw-intro-summary">{pipeline.summary}</p>
        </div>

        <div className="pw-intro-what">
          <span className="pw-intro-what-icon">💡</span>
          <div>
            <strong>What is this Data Pipeline?</strong>
            <p>Walk through every stage — from raw input to final output. Review each step, refine with AI, confirm it fits your design, then get a unified summary. Use <b>← →</b> to navigate, <b>Space</b> to confirm.</p>
          </div>
        </div>

        <div className="pw-intro-steps-grid">
          {pipeline.steps.map((step, i) => {
            const color = colors[i % colors.length];
            return (
              <div
                key={i}
                className="pw-intro-step-card"
                style={{ '--c-bg': color.bg, '--c-border': color.border, '--c-num': color.num }}
                onClick={() => { setActiveIdx(i); setPhase('steps'); }}
              >
                <div className="pw-intro-step-top">
                  <span className="pw-intro-step-num" style={{ background: color.bg, color: color.num, borderColor: color.border }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="pw-intro-step-icon">{getStepIcon(step.title)}</span>
                </div>
                <div className="pw-intro-step-title">{step.title}</div>
                <div className="pw-intro-step-desc">{step.description}</div>
              </div>
            );
          })}
        </div>

        <div className="pw-intro-actions">
          <button className="pw-cta-btn" onClick={() => { setActiveIdx(0); setPhase('steps'); }}>
            Get Started — Review Each Stage <span className="pw-cta-arrow">→</span>
          </button>
          {onRequestRegenerate && (
            <button className="pw-ghost-btn" onClick={onRequestRegenerate}>↺ Regenerate</button>
          )}
        </div>
      </div>
    );
  }

  /* ── STEPS ── */
  if (phase === 'steps') {
    const step       = pipeline.steps[activeIdx];
    const color      = colors[activeIdx % colors.length];
    const isConfirmed = !!confirmed[activeIdx];
    const isLast     = activeIdx === totalSteps - 1;

    return (
      <div className="pw-steps">
        {/* Sidebar */}
        <div className="pw-steps-sidebar">
          <button className="pw-back-btn" onClick={() => setPhase('intro')}>← Overview</button>
          <div className="pw-steps-list">
            {pipeline.steps.map((s, i) => (
              <button
                key={i}
                className={`pw-step-item${i === activeIdx ? ' is-active' : ''}${confirmed[i] ? ' is-done' : ''}`}
                onClick={() => setActiveIdx(i)}
              >
                <span className="pw-step-item-num"
                  style={{ background: colors[i % colors.length].bg, color: colors[i % colors.length].num, borderColor: colors[i % colors.length].border }}>
                  {confirmed[i] ? '✓' : String(i + 1).padStart(2, '0')}
                </span>
                <span className="pw-step-item-label">
                  <span className="pw-step-item-icon">{getStepIcon(s.title)}</span>
                  {s.title}
                </span>
              </button>
            ))}
          </div>
          <div className="pw-steps-progress">
            <div className="pw-progress-bar-track">
              <div className="pw-progress-bar-fill" style={{ width: `${(Object.keys(confirmed).length / totalSteps) * 100}%` }} />
            </div>
            <span className="pw-progress-label">{Object.keys(confirmed).length} / {totalSteps} confirmed</span>
          </div>
        </div>

        {/* Main */}
        <div className="pw-steps-main">
          {/* Step header */}
          <div className="pw-step-header" style={{ '--c-bg': color.bg, '--c-border': color.border }}>
            <div className="pw-step-header-left">
              <span className="pw-step-header-num" style={{ background: color.bg, color: color.num, borderColor: color.border }}>
                {String(activeIdx + 1).padStart(2, '0')}
              </span>
              <div>
                <div className="pw-step-header-icon-title">
                  <span>{getStepIcon(step.title)}</span>
                  <h3 className="pw-step-title">{step.title}</h3>
                </div>
                <p className="pw-step-desc">{step.description}</p>
              </div>
            </div>
            {isConfirmed && <span className="pw-step-confirmed-badge">✓ Confirmed</span>}
          </div>

          {/* Viewport */}
          <div className="pw-step-viewport">
            <div className="pw-viewport-chrome">
              <div className="pw-chrome-dots"><span /><span /><span /></div>
              <span className="pw-chrome-title">{step.title}</span>
              <button className="pw-expand-btn" onClick={() => setFullscreen(true)} title="Open full view (double-click)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                </svg>
                <span>Expand</span>
              </button>
            </div>
            <div className="pw-viewport-body">
              <iframe
                key={`${activeIdx}-${step.html ? step.html.length : 0}`}
                title={step.title}
                srcDoc={step.html || `<html><body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:Inter,sans-serif;color:#9ca3af;background:#f8fafc"><div style="text-align:center"><div style="font-size:40px;margin-bottom:12px">${getStepIcon(step.title)}</div><p style="font-size:14px;margin:0;font-weight:500">${step.title}</p><p style="font-size:12px;margin:8px 0 0;opacity:.7">${step.description}</p></div></body></html>`}
                sandbox="allow-scripts allow-same-origin"
                onDoubleClick={() => setFullscreen(true)}
              />
            </div>
          </div>

          {/* Fullscreen modal */}
          {fullscreen && (
            <div className="pw-fs-overlay" onClick={(e) => { if (e.target === e.currentTarget) setFullscreen(false); }}>
              <div className="pw-fs-panel">
                <div className="pw-fs-chrome">
                  <div className="pw-chrome-dots">
                    <span onClick={() => setFullscreen(false)} style={{ cursor: 'pointer' }} />
                    <span /><span />
                  </div>
                  <div className="pw-fs-chrome-center">
                    <span className="pw-fs-step-num" style={{ background: color.bg, color: color.num, borderColor: color.border }}>
                      {String(activeIdx + 1).padStart(2, '0')}
                    </span>
                    <span className="pw-fs-step-icon">{getStepIcon(step.title)}</span>
                    <span className="pw-fs-title">{step.title}</span>
                    <span className="pw-fs-desc">{step.description}</span>
                  </div>
                  <div className="pw-fs-chrome-right">
                    <button className="pw-fs-nav-btn" disabled={activeIdx === 0} onClick={() => setActiveIdx(activeIdx - 1)}>←</button>
                    <span className="pw-fs-nav-pos">{activeIdx + 1}/{totalSteps}</span>
                    <button className="pw-fs-nav-btn" disabled={isLast} onClick={() => setActiveIdx(activeIdx + 1)}>→</button>
                    <button className="pw-fs-close-btn" onClick={() => setFullscreen(false)} title="Close (Esc)">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                </div>
                <div className="pw-fs-body">
                  <iframe
                    key={`fs-${activeIdx}-${step.html ? step.html.length : 0}`}
                    title={`${step.title} — full view`}
                    srcDoc={step.html || `<html><body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:Inter,sans-serif;color:#9ca3af;background:#f8fafc"><div style="text-align:center"><div style="font-size:56px;margin-bottom:16px">${getStepIcon(step.title)}</div><p style="font-size:18px;margin:0;font-weight:600;color:#111827">${step.title}</p><p style="font-size:14px;margin:10px 0 0;opacity:.7">${step.description}</p></div></body></html>`}
                    sandbox="allow-scripts allow-same-origin"
                  />
                </div>
                <div className="pw-fs-footer">
                  <button className="pw-ghost-btn" onClick={() => setFullscreen(false)}>← Back to Pipeline</button>
                  <button
                    className={`pw-confirm-btn${isConfirmed ? ' is-confirmed' : ''}`}
                    onClick={() => { confirmStep(); setFullscreen(false); }}
                  >
                    {isConfirmed
                      ? (isLast ? '✓ Confirmed — View Summary' : '✓ Confirmed — Next Step')
                      : (isLast ? 'Confirm Step — View Summary →' : 'Confirm Step — Next →')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Refine chat */}
          {getModel && (
            <StepRefineChat
              key={activeIdx}
              step={step}
              stepIndex={activeIdx}
              onUpdateHtml={handleUpdateHtml}
              getModel={getModel}
            />
          )}

          {/* Footer nav */}
          <div className="pw-step-footer">
            <div className="pw-step-nav">
              <button className="pw-nav-btn" disabled={activeIdx === 0} onClick={() => setActiveIdx(activeIdx - 1)}>← Prev</button>
              <span className="pw-step-pos">{activeIdx + 1} / {totalSteps}</span>
              <button className="pw-nav-btn" disabled={isLast} onClick={() => setActiveIdx(activeIdx + 1)}>Next →</button>
            </div>
            <button className={`pw-confirm-btn${isConfirmed ? ' is-confirmed' : ''}`} onClick={confirmStep}>
              {isConfirmed
                ? (isLast ? '✓ Confirmed — View Summary' : '✓ Confirmed — Next Step')
                : (isLast ? 'Confirm Step — View Summary →' : 'Confirm Step — Next →')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── SUMMARY ── */
  const generateFinalPage = async () => {
    if (!getModel) return;
    setFinalLoading(true); setFinalError(''); setShowFinal(true);
    try {
      const model = getModel();
      const stepsContext = pipeline.steps.map((s, i) => `Step ${i + 1} — ${s.title}: ${s.description}`).join('\n');
      const prompt = `You are Bifrost. The user has reviewed and confirmed all stages of the following data pipeline:

Pipeline: ${pipeline.title}
Summary: ${pipeline.summary}

Stages:
${stepsContext}

Generate a single, complete, production-quality HTML page that serves as the FINAL integrated output of this entire pipeline. This page should:
- Visually combine all pipeline stages into one cohesive dashboard or interface
- Show realistic sample data flowing through each stage
- Use professional design: clear sections, data tables, inline SVG charts, status indicators
- Feel like a real production tool or analytics dashboard
- Include a header with the pipeline title and a brief description
- Each stage should have a visible section or panel

Return ONLY valid HTML with embedded CSS. No markdown, no explanation. Make it impressive.`;

      const result = await model.generateContent(prompt);
      setFinalHtml(cleanCode((await result.response).text()));
    } catch (err) {
      setFinalError(err.message || 'Failed to generate final page.');
    } finally {
      setFinalLoading(false);
    }
  };

  return (
    <div className="pw-summary">
      <div className="pw-summary-header">
        <div className="pw-summary-check">✓</div>
        <h2 className="pw-summary-title">Pipeline Complete</h2>
        <p className="pw-summary-subtitle">All {totalSteps} stages confirmed. Here is your complete data flow architecture.</p>
      </div>

      <div className="pw-summary-pipeline-title">
        <strong>{pipeline.title}</strong>
        <span>{pipeline.summary}</span>
      </div>

      <div className="pw-summary-flow">
        {pipeline.steps.map((step, i) => {
          const color = colors[i % colors.length];
          const isLast = i === totalSteps - 1;
          return (
            <React.Fragment key={i}>
              <div
                className="pw-summary-node"
                style={{ '--c-bg': color.bg, '--c-border': color.border, '--c-num': color.num }}
                onClick={() => { setActiveIdx(i); setPhase('steps'); }}
              >
                <div className="pw-summary-node-top">
                  <span className="pw-summary-node-num" style={{ background: color.bg, color: color.num, borderColor: color.border }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="pw-summary-node-icon">{getStepIcon(step.title)}</span>
                  <span className="pw-summary-done-mark">✓</span>
                </div>
                <div className="pw-summary-node-title">{step.title}</div>
                <div className="pw-summary-node-desc">{step.description}</div>
              </div>
              {!isLast && <div className="pw-summary-arrow">→</div>}
            </React.Fragment>
          );
        })}
      </div>

      <div className="pw-summary-actions">
        <button className="pw-cta-btn" onClick={() => { setActiveIdx(0); setPhase('steps'); }}>← Back to Steps</button>
        <button className="pw-ghost-btn" onClick={() => { setPhase('intro'); setConfirmed({}); }}>Start Over</button>
        {onRequestRegenerate && (
          <button className="pw-ghost-btn" onClick={onRequestRegenerate}>↺ Regenerate Pipeline</button>
        )}
        {getModel && (
          <button className="pw-final-btn" onClick={generateFinalPage} disabled={finalLoading}>
            {finalLoading ? <><span className="pw-final-spinner" /> Generating…</> : <>✦ View Full Pipeline Page</>}
          </button>
        )}
      </div>

      {showFinal && (
        <div className="pw-fs-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowFinal(false); }}>
          <div className="pw-fs-panel">
            <div className="pw-fs-chrome">
              <div className="pw-chrome-dots"><span onClick={() => setShowFinal(false)} style={{ cursor: 'pointer' }} /><span /><span /></div>
              <div className="pw-fs-chrome-center">
                <span className="pw-fs-title">✦ {pipeline.title} — Full Pipeline Page</span>
                <span className="pw-fs-desc">{pipeline.summary}</span>
              </div>
              <div className="pw-fs-chrome-right">
                {!finalLoading && !finalError && finalHtml && (
                  <button className="pw-fs-nav-btn" onClick={generateFinalPage} style={{ width: 'auto', padding: '0 8px', fontSize: '11px' }}>
                    ↺ Regen
                  </button>
                )}
                <button className="pw-fs-close-btn" onClick={() => setShowFinal(false)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>
            </div>
            <div className="pw-fs-body">
              {finalLoading && (
                <div className="pw-final-loading">
                  <div className="pw-final-loading-spinner" />
                  <p>Generating your complete pipeline page…</p>
                  <span>Combining all {totalSteps} stages into one unified view</span>
                </div>
              )}
              {finalError && !finalLoading && (
                <div className="pw-final-error">
                  <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
                  <p>{finalError}</p>
                  <button className="pw-cta-btn" onClick={generateFinalPage} style={{ marginTop: 16 }}>Try Again</button>
                </div>
              )}
              {!finalLoading && !finalError && finalHtml && (
                <iframe key={finalHtml.length} title="Full Pipeline Page" srcDoc={finalHtml} sandbox="allow-scripts allow-same-origin" style={{ width: '100%', height: '100%', border: 'none', display: 'block' }} />
              )}
            </div>
            <div className="pw-fs-footer">
              <button className="pw-ghost-btn" onClick={() => setShowFinal(false)} style={{ borderColor: 'rgba(255,255,255,0.12)', color: '#71717a', background: 'transparent' }}>
                ← Back to Summary
              </button>
              <span style={{ fontSize: 11, color: '#52525b' }}>{pipeline.steps.length} stages · AI Generated</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Keyboard Shortcuts Modal (Linear style)
   ──────────────────────────────────────────────────────────── */

function ShortcutsModal({ onClose }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape' || e.key === '?') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const shortcuts = [
    { desc: 'Generate result',          keys: ['⌘', 'Enter'] },
    { desc: 'Generate 3 variants',      keys: ['⌘', 'Shift', 'Enter'] },
    { desc: 'Toggle dark / light mode', keys: ['⌘', 'D'] },
    { desc: 'Open version history',     keys: ['⌘', 'H'] },
    { desc: 'Export CSV log',           keys: ['⌘', 'E'] },
    { desc: 'Next pipeline step',       keys: ['→'] },
    { desc: 'Previous pipeline step',   keys: ['←'] },
    { desc: 'Confirm current step',     keys: ['Space'] },
    { desc: 'Close / back',             keys: ['Esc'] },
    { desc: 'Show this panel',          keys: ['?'] },
  ];

  return (
    <div className="shortcuts-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="shortcuts-panel">
        <div className="shortcuts-header">
          <h3>⌨️ Keyboard Shortcuts</h3>
          <button className="icon-btn" onClick={onClose}>×</button>
        </div>
        <div className="shortcuts-body">
          {shortcuts.map((s) => (
            <div key={s.desc} className="shortcut-row">
              <span className="shortcut-desc">{s.desc}</span>
              <div className="shortcut-keys">
                {s.keys.map((k, i) => (
                  <React.Fragment key={k}>
                    {i > 0 && <span className="shortcut-plus">+</span>}
                    <span className="kbd">{k}</span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Main App
   ──────────────────────────────────────────────────────────── */

function App() {
  /* Theme */
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => t === 'light' ? 'dark' : 'light');
  }, []);

  /* App state */
  const [prompt, setPrompt]               = useState('');
  const [resultMode, setResultMode]       = useState('web');
  const [provider, setProvider]           = useState('gemini');
  const [code, setCode]                   = useState(starterCode);
  const [pipeline, setPipeline]           = useState(defaultPipeline);
  const [pipelineIsAi, setPipelineIsAi]   = useState(false);
  const [messages, setMessages]           = useState([
    { role: 'assistant', text: 'Hello! I\'m Bifrost — your AI visual coding assistant. Describe an interface or backend process, and I\'ll instantly render it for you. Press ? for keyboard shortcuts.' },
  ]);
  const [loading, setLoading]             = useState(false);
  const [stageIndex, setStageIndex]       = useState(0);
  const [error, setError]                 = useState('');
  const [variants, setVariants]           = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [versions, setVersions]           = useState([]);
  const [currentVersionId, setCurrentVersionId] = useState(null);
  const [historyOpen, setHistoryOpen]     = useState(false);
  const [isStreaming, setIsStreaming]     = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  /* Drag divider state */
  const [chatWidth, setChatWidth]         = useState(420);
  const isDraggingRef                     = useRef(false);
  const dragStartXRef                     = useRef(0);
  const dragStartWidthRef                 = useRef(0);
  const appShellRef                       = useRef(null);
  const dividerRef                        = useRef(null);

  const stageTimer  = useRef(null);
  const flushTimer  = useRef(null);

  const tokenEstimate = useMemo(() => Math.max(1, Math.ceil(code.length / 4)), [code]);
  const charCount     = prompt.length;
  const charClass     = charCount > 2000 ? 'is-danger' : charCount > 1200 ? 'is-warning' : '';

  /* ── Drag divider logic (Vectorizer AI style) ── */
  const onDividerMouseDown = useCallback((e) => {
    e.preventDefault();
    isDraggingRef.current   = true;
    dragStartXRef.current   = e.clientX;
    dragStartWidthRef.current = chatWidth;
    dividerRef.current?.classList.add('is-dragging');
    document.body.style.cursor       = 'col-resize';
    document.body.style.userSelect   = 'none';
  }, [chatWidth]);

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!isDraggingRef.current) return;
      const delta    = dragStartXRef.current - e.clientX;
      const newWidth = Math.max(340, Math.min(600, dragStartWidthRef.current + delta));
      setChatWidth(newWidth);
      if (appShellRef.current) {
        appShellRef.current.style.gridTemplateColumns = `minmax(0, 1fr) ${newWidth}px`;
      }
    };
    const onMouseUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      dividerRef.current?.classList.remove('is-dragging');
      document.body.style.cursor     = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  /* ── Global keyboard shortcuts ── */
  useEffect(() => {
    const onKey = (e) => {
      const isInput = e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT';
      if (e.key === '?' && !isInput) { setShowShortcuts((v) => !v); return; }
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      if (e.key === 'd') { e.preventDefault(); toggleTheme(); }
      else if (e.key === 'h') { e.preventDefault(); setHistoryOpen((v) => !v); }
      else if (e.key === 'e') { e.preventDefault(); exportData(); }
      else if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); generateVariants(); }
      else if (e.key === 'Enter') { e.preventDefault(); generateCode(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prompt, loading]);

  /* ── AI Provider / Model ── */
  const getModel = useCallback(() => {
    if (provider !== 'gemini') {
      throw new Error(`${provider.toUpperCase()} is shown as an architectural option. This prototype executes generation through Gemini.`);
    }
    const apiKey   = import.meta.env.VITE_GEMINI_API_KEY;
    const modelName = import.meta.env.VITE_GEMINI_MODEL;
    if (!apiKey || !modelName) throw new Error('API Key or model is not configured in .env');
    return new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: modelName });
  }, [provider]);

  const contextText = () =>
    messages.slice(-MAX_CONTEXT).map((m) => `${m.role}: ${m.text}`).join('\n');

  const buildPrompt = (request) =>
    `You are Bifrost, a visual AI coding tool. Use the recent conversation as context:\n${contextText()}\n\nGenerate a complete, production-quality single page web app as pure HTML with embedded CSS and minimal JavaScript. Return ONLY runnable HTML code, no markdown, no explanations. The result must be immediately visible in an iframe.\n\nUser request: ${request}`;

  const buildPipelinePrompt = (request, variant = null) => {
    const variantHint = variant ? ` Focus this pipeline specifically on the "${variant}" perspective.` : '';
    return `You are Bifrost, a backend data pipeline visualizer.${variantHint}

Return ONLY a valid JSON object — no markdown, no explanation, no code fences.
Schema:
{
  "title": "Short descriptive title (max 8 words)",
  "summary": "One sentence describing this pipeline (max 25 words)",
  "steps": [
    { "title": "Step Name", "description": "One sentence describing what this step does." }
  ]
}

Rules:
- Include 5 to 7 steps specific to the user's request.
- Each step name should be a meaningful verb or noun.
- Steps must flow logically from data source to final output.
- Do NOT include any HTML in the JSON.

User request: ${request}`;
  };

  const buildStepHtmlPrompt = (pipelineTitle, step) =>
    `You are Bifrost. Generate a standalone HTML page for one step in the "${pipelineTitle}" data pipeline.

Step: ${step.title}
Description: ${step.description}

Requirements:
- Return ONLY valid HTML with embedded CSS. No markdown, no explanation.
- Look like a REAL production tool output — data tables, inline SVG charts, terminal output, or dashboard panel.
- Use realistic sample data. Professional typography (Google Fonts Inter allowed).
- Keep it under 3000 characters.`;

  /* ── Pipeline generation ── */
  const generatePipelineWithAI = async (request, variant = null) => {
    const model  = getModel();
    const result = await model.generateContent(buildPipelinePrompt(request, variant));
    const raw    = cleanJson((await result.response).text());
    const parsed = safeParseJson(raw);
    if (!parsed.title || !parsed.summary || !Array.isArray(parsed.steps) || parsed.steps.length < 2) {
      throw new Error('AI returned an invalid pipeline structure.');
    }
    const baseSteps = parsed.steps.map((s) =>
      Array.isArray(s) ? { title: s[0], description: s[1], html: '' } : { title: s.title || '', description: s.description || '', html: s.html || '' }
    );
    const stepsWithHtml = await Promise.all(
      baseSteps.map(async (step) => {
        if (step.html) return step;
        try {
          const r = await model.generateContent(buildStepHtmlPrompt(parsed.title, step));
          return { ...step, html: cleanCode((await r.response).text()) };
        } catch {
          return { ...step, html: defaultHTML(getStepIcon(step.title), step.title, step.description) };
        }
      }),
    );
    return { title: parsed.title, summary: parsed.summary, steps: stepsWithHtml };
  };

  /* ── Loading state machine ── */
  const startLoading = (mode = 'web') => {
    setLoading(true); setStageIndex(0);
    const list = mode === 'pipeline' ? PIPELINE_STAGES : GENERATION_STAGES;
    stageTimer.current = window.setInterval(() => {
      setStageIndex((i) => (i + 1) % list.length);
    }, 2200);
  };

  const stopLoading = () => {
    window.clearInterval(stageTimer.current);
    window.clearInterval(flushTimer.current);
    setLoading(false); setIsStreaming(false);
  };

  /* ── Version management ── */
  const saveVersion = (request, output, mode = resultMode) => {
    const v = { id: Date.now(), timestamp: new Date().toISOString(), prompt: request, code: mode === 'web' ? output : JSON.stringify(output), mode };
    setVersions((items) => [...items, v]);
    setCurrentVersionId(v.id);
  };

  const appendConversation = (request, response) => {
    setMessages((items) => [...items, { role: 'user', text: request }, { role: 'assistant', text: response }]);
  };

  /* ── Generate ── */
  const generateCode = async () => {
    if (!prompt.trim() || loading) return;
    const startedAt = Date.now();
    logEvent({ type: 'generate_start', prompt_length: prompt.length, prompt_text: prompt, result_mode: resultMode, provider });
    setError(''); setVariants([]); setSelectedVariant(null);

    if (resultMode === 'pipeline') {
      startLoading('pipeline');
      try {
        const next = await generatePipelineWithAI(prompt);
        setPipeline(next); setPipelineIsAi(true);
        saveVersion(prompt, next, 'pipeline');
        appendConversation(prompt, `Generated a ${next.steps.length}-stage data pipeline: "${next.title}".`);
        logEvent({ type: 'generate_success', duration_ms: Date.now() - startedAt, code_length: JSON.stringify(next).length });
      } catch (err) {
        setError(err.message || 'Failed to generate pipeline');
        appendConversation(prompt, `Pipeline generation failed: ${err.message}`);
        logEvent({ type: 'generate_error', error_message: err.message });
      } finally { stopLoading(); }
      return;
    }

    startLoading(); setIsStreaming(true);
    try {
      const model  = getModel();
      const stream = await model.generateContentStream(buildPrompt(prompt));
      let accumulated = ''; let latest = '';

      flushTimer.current = window.setInterval(() => { if (latest) setCode(cleanCode(latest)); }, 500);

      for await (const chunk of stream.stream) { accumulated += chunk.text(); latest = accumulated; }

      const html = cleanCode(accumulated);
      setCode(html);
      saveVersion(prompt, html, 'web');
      appendConversation(prompt, 'Generated a runnable web interface and rendered it on the left.');
      logEvent({ type: 'generate_success', duration_ms: Date.now() - startedAt, code_length: html.length });
    } catch (err) {
      setError(err.message || 'An error occurred during generation');
      appendConversation(prompt, `Generation failed: ${err.message}`);
      logEvent({ type: 'generate_error', error_message: err.message });
    } finally { stopLoading(); }
  };

  /* ── Generate Variants ── */
  const generateVariants = async () => {
    if (!prompt.trim() || loading) return;

    if (resultMode === 'pipeline') {
      const focuses = ['Batch processing & offline analytics', 'Real-time streaming & low-latency events', 'ML model training & automated predictions'];
      const labels  = ['Batch Analytics', 'Real-time Stream', 'ML Pipeline'];
      const startedAt = Date.now();
      logEvent({ type: 'generate_start', prompt_length: prompt.length, prompt_text: `${prompt} (3 pipeline variants)`, result_mode: resultMode, provider });
      setError(''); setSelectedVariant(null);
      setVariants(labels.map((label) => ({ label, loading: true, pipeline: null })));
      startLoading('pipeline');
      try {
        const results = await Promise.all(focuses.map(async (focus, i) => ({ label: labels[i], loading: false, pipeline: await generatePipelineWithAI(prompt, focus) })));
        setVariants(results); setSelectedVariant(0);
        setPipeline(results[0].pipeline); setPipelineIsAi(true);
        saveVersion(`${prompt} (${labels[0]})`, results[0].pipeline, 'pipeline');
        appendConversation(prompt, `Generated three AI pipeline variants: ${labels.join(', ')}.`);
        logEvent({ type: 'generate_success', duration_ms: Date.now() - startedAt });
      } catch (err) {
        setError(err.message || 'Unable to generate pipeline variants');
        logEvent({ type: 'generate_error', error_message: err.message });
      } finally { stopLoading(); }
      return;
    }

    const styles = [
      ['Variant A', 'minimalist style, clean white background, neutral tones'],
      ['Variant B', 'dark mode, glassmorphism style, neon accent'],
      ['Variant C', 'colorful gradient style, material design, vibrant'],
    ];
    const startedAt = Date.now();
    logEvent({ type: 'generate_start', prompt_length: prompt.length, prompt_text: `${prompt} (3 variants)`, result_mode: resultMode, provider });
    setError(''); setSelectedVariant(null);
    setVariants(styles.map(([label]) => ({ label, loading: true, code: '' })));
    startLoading();
    try {
      const model   = getModel();
      const results = await Promise.all(styles.map(async ([label, style]) => {
        const result = await model.generateContent(buildPrompt(`${prompt} - ${style}`));
        return { label, loading: false, code: cleanCode((await result.response).text()) };
      }));
      setVariants(results); setSelectedVariant(0);
      setCode(results[0].code);
      saveVersion(`${prompt} (Variant A)`, results[0].code, 'web');
      appendConversation(prompt, 'Generated three visual design variants and selected Variant A.');
      logEvent({ type: 'generate_success', duration_ms: Date.now() - startedAt });
    } catch (err) {
      setError(err.message || 'Unable to generate variants');
      logEvent({ type: 'generate_error', error_message: err.message });
    } finally { stopLoading(); }
  };

  const useVariant = (index) => {
    const variant = variants[index];
    if (!variant) return;
    setSelectedVariant(index);
    if (resultMode === 'pipeline' && variant.pipeline) {
      setPipeline(variant.pipeline); setPipelineIsAi(true);
      saveVersion(`${prompt} (${variant.label})`, variant.pipeline, 'pipeline');
      return;
    }
    if (variant.code) {
      setCode(variant.code);
      saveVersion(`${prompt} (${variant.label})`, variant.code, 'web');
    }
  };

  const restoreVersion = (version) => {
    setPrompt(version.prompt);
    setCurrentVersionId(version.id);
    setSelectedVariant(null);
    if (version.mode === 'pipeline') {
      setResultMode('pipeline');
      setPipeline(JSON.parse(version.code));
      setPipelineIsAi(true);
    } else {
      setResultMode('web');
      setCode(version.code);
    }
    setHistoryOpen(false);
  };

  const exportData = () => {
    const rows   = readLog();
    const header = 'timestamp,event_type,duration_ms,prompt_length,code_length,result_mode,provider,notes';
    const csvRows = rows.map((row) => [
      row.timestamp, row.type, row.duration_ms || '', row.prompt_length || '',
      row.code_length || '', row.result_mode || '', row.provider || '',
      (row.prompt_text || row.error_message || '').replaceAll('"', '""'),
    ].map((cell) => `"${cell}"`).join(','));
    const blob = new Blob([[header, ...csvRows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'bifrost_log.csv'; link.click();
    URL.revokeObjectURL(url);
  };

  const currentStages = resultMode === 'pipeline' ? PIPELINE_STAGES : GENERATION_STAGES;

  /* ── Divider position (right side) ── */
  const dividerStyle = {
    right: chatWidth - 3,
  };

  return (
    <div
      className="app-shell"
      ref={appShellRef}
      style={{ gridTemplateColumns: `minmax(0, 1fr) ${chatWidth}px` }}
    >
      {/* ══ LEFT: Result Pane ══ */}
      <section className="result-pane">
        {/* Top bar */}
        <header className="result-header">
          <div className="result-brand">
            <div className="result-brand-icon">🌉</div>
            <span className="result-brand-name">Bifrost</span>
            <span className="result-brand-version">v2.0</span>
          </div>

          <div className="result-tools">
            <button
              className={`tool-tab${resultMode === 'web' ? ' active' : ''}`}
              onClick={() => setResultMode('web')}
            >
              <span className="tool-tab-icon">⬡</span> Web App
            </button>
            <button
              className={`tool-tab${resultMode === 'pipeline' ? ' active' : ''}`}
              onClick={() => setResultMode('pipeline')}
            >
              <span className="tool-tab-icon">⬡</span> Data Pipeline
            </button>
          </div>

          <div className="result-header-right">
            <button
              className="kbd-badge"
              onClick={() => setShowShortcuts(true)}
              title="Keyboard shortcuts (?)"
            >
              ⌨️ Shortcuts
            </button>
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode (⌘D)`}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
        </header>

        {/* Preview sub-header */}
        <div className="preview-header">
          <div className="preview-header-left">
            <span className="preview-header-title">
              {resultMode === 'web' ? 'Runnable Interface Preview' : 'Backend Behaviour Preview'}
            </span>
            <span className="preview-header-meta">
              {resultMode === 'web' ? `~${tokenEstimate} tokens` : `${pipeline.steps.length} stages`}
            </span>
          </div>
          {isStreaming && (
            <div className="streaming-indicator">
              <span className="streaming-dot" />
              Streaming…
            </div>
          )}
        </div>

        {/* Variant strip */}
        {variants.length > 0 && (
          <div className="variant-strip">
            {variants.map((variant, index) => (
              <button
                className={`variant-card${selectedVariant === index ? ' selected' : ''}`}
                key={variant.label}
                onClick={() => useVariant(index)}
              >
                <div className="variant-card-label">{variant.label}</div>
                {variant.loading && <div className="variant-loading">Generating…</div>}
                {!variant.loading && resultMode === 'web' && <iframe title={variant.label} srcDoc={variant.code} />}
                {!variant.loading && resultMode === 'pipeline' && (
                  <div className="mini-pipeline">
                    <span className="mini-pipeline-count">{variant.pipeline?.steps.length ?? '—'}</span>
                    {variant.pipeline && <span className="mini-pipeline-title">{variant.pipeline.title}</span>}
                  </div>
                )}
                <div className="variant-card-cta">↗ Use This</div>
              </button>
            ))}
          </div>
        )}

        {/* Main preview */}
        <div className={`preview-frame-wrap${resultMode === 'pipeline' ? ' is-pipeline' : ''}`}>
          {resultMode === 'web' ? (
            <iframe title="Preview" srcDoc={code} />
          ) : (
            <PipelineView
              pipeline={pipeline}
              isAiGenerated={pipelineIsAi}
              onRefineStep={() => {}}
              onRequestRegenerate={generateCode}
              getModel={getModel}
              isDark={theme === 'dark'}
            />
          )}

          {/* Loading overlay — Storm / AgentGPT style */}
          {loading && (
            <div className="loading-overlay">
              <div className="loading-progress-bar" />
              <div className="loading-inner">
                <div className="loading-spinner" />
                <div className="loading-title">Bifrost</div>
                <div className="loading-stages">
                  {currentStages.map((stage, i) => (
                    <div
                      key={stage.label}
                      className={`loading-stage-row${i === stageIndex ? ' is-active' : ''}${i < stageIndex ? ' is-done' : ''}`}
                    >
                      <div className="loading-stage-icon">
                        {i < stageIndex ? '✓' : i === stageIndex ? stage.icon : `${i + 1}`}
                      </div>
                      {stage.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Drag Divider (Vectorizer AI style) ── */}
      <div
        ref={dividerRef}
        className="drag-divider"
        style={dividerStyle}
        onMouseDown={onDividerMouseDown}
        title="Drag to resize panels"
      />

      {/* ══ RIGHT: Chat Pane ══ */}
      <aside className="chat-pane">
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-left">
            <div className="chat-header-title">AI Workspace</div>
            <div className="chat-header-subtitle">Prompt, generate, inspect</div>
          </div>
          <div className="chat-header-actions">
            <button
              className="icon-btn"
              onClick={() => setHistoryOpen(true)}
              title="Version history (⌘H)"
            >
              🕐
            </button>
            <button
              className="icon-btn"
              onClick={exportData}
              title="Export CSV (⌘E)"
            >
              ↓
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="chat-body">
          {/* Output type + Provider */}
          <div className="control-grid">
            <div className="control-item">
              <label className="control-label">Output Type</label>
              <select
                className="control-select"
                value={resultMode}
                onChange={(e) => setResultMode(e.target.value)}
              >
                <option value="web">Web / Interface</option>
                <option value="pipeline">Data Pipeline</option>
              </select>
            </div>
            <div className="control-item">
              <label className="control-label">AI Provider</label>
              <select
                className="control-select"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
              >
                <option value="gemini">Gemini API</option>
                <option value="gpt">GPT (option)</option>
                <option value="claude">Claude (option)</option>
                <option value="local">Local LLM (option)</option>
              </select>
            </div>
          </div>

          {/* Conversation */}
          <div className="conversation">
            {messages.map((msg, i) => (
              <div className={`message ${msg.role}`} key={`${msg.role}-${i}`}>
                <strong>{msg.role === 'user' ? 'You' : 'Bifrost'}</strong>
                <p>{msg.text}</p>
              </div>
            ))}
          </div>

          {/* Prompt Templates (Typeflow / Dify style) */}
          <div className="templates-section">
            <div className="templates-label">Quick Start</div>
            <div className="templates-grid">
              {PROMPT_TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  className="template-chip"
                  onClick={() => setPrompt(t.text)}
                  disabled={loading}
                  title={t.text}
                >
                  <span className="template-chip-icon">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt input */}
          <div className="prompt-section">
            <div className="prompt-label-row">
              <label className="prompt-label">Tell the AI what to build</label>
              <span className={`prompt-char-count${charClass ? ' ' + charClass : ''}`}>
                {charCount}
              </span>
            </div>
            <textarea
              className="prompt-input"
              value={prompt}
              placeholder="E.g. Create a modern pricing page with toggleable billing cycles…"
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); generateCode(); }
              }}
            />
            <div className="prompt-meta">
              context: last {Math.min(messages.length, MAX_CONTEXT)} messages · ⌘↵ to generate
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="error-banner">
              <span className="error-banner-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Action row */}
          <div className="action-row">
            <button
              className="primary-btn"
              onClick={generateCode}
              disabled={loading || !prompt.trim()}
            >
              {loading
                ? <><span className="btn-spinner" /> Generating…</>
                : <>✦ Generate Result</>
              }
            </button>
            <button
              className="secondary-btn"
              onClick={generateVariants}
              disabled={loading || !prompt.trim()}
              title="Generate 3 design variants (⌘⇧↵)"
            >
              ⊞ 3 Variants
            </button>
          </div>
        </div>
      </aside>

      {/* ── Version History Panel ── */}
      <VersionPanel
        open={historyOpen}
        versions={versions}
        currentVersionId={currentVersionId}
        onClose={() => setHistoryOpen(false)}
        onRestore={restoreVersion}
      />

      {/* ── Keyboard Shortcuts Modal ── */}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}

export default App;
