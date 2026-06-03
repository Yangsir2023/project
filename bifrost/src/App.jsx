import React, { useMemo, useRef, useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import VersionPanel from './VersionPanel.jsx';

const LOG_KEY = 'bifrost_interaction_log';
const stages = [
  'Understanding the request...',
  'Planning the interface...',
  'Generating runnable output...',
  'Rendering the visible result...',
];

const pipelineStages = [
  'Analysing your workflow...',
  'Mapping pipeline stages...',
  'Designing data flow...',
  'Rendering visualisation...',
];

// Icon map for common pipeline step names
const STEP_ICONS = {
  ingest:     '📥', collect:   '📥', import:  '📥', input:    '📥', source:   '📥',
  stream:     '🌊', realtime:  '🌊', queue:   '🌊', buffer:   '🌊', event:    '🌊',
  validate:   '🔍', check:     '🔍', verify:  '🔍', inspect:  '🔍', test:     '🔍',
  clean:      '🧹', sanitize:  '🧹', filter:  '🧹', dedupe:   '🧹',
  transform:  '⚙️', process:   '⚙️', convert: '⚙️', parse:    '⚙️', enrich:   '⚙️',
  join:       '🔗', merge:     '🔗', combine: '🔗', aggregate:'🔗',
  analyze:    '📊', analyse:   '📊', compute: '📊', metrics:  '📊', score:    '📊',
  model:      '🤖', train:     '🤖', predict: '🤖', infer:    '🤖', evaluate: '🤖',
  visualize:  '📈', visualise: '📈', chart:   '📈', report:   '📈', dashboard:'📈',
  store:      '💾', save:      '💾', persist: '💾', write:    '💾', load:     '💾',
  export:     '📤', send:      '📤', deliver: '📤', publish:  '📤', output:   '📤',
  notify:     '🔔', alert:     '🔔', monitor: '🔔', watch:    '🔔',
  auth:       '🔐', secure:    '🔐', encrypt: '🔐',
  api:        '🌐', fetch:     '🌐', request: '🌐', sync:     '🌐',
  cache:      '⚡', index:     '⚡', optimize:'⚡',
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

const starterCode = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
      body { margin: 0; font-family: 'Inter', sans-serif; background: #fafafa; color: #111827; }
      main { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 40px; }
      section { max-width: 640px; background: white; border: 1px solid #eaeaea; padding: 48px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.05); text-align: center; }
      .icon { width: 48px; height: 48px; background: #f3f4f6; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; color: #0070f3; }
      h1 { margin: 0 0 16px; font-size: 32px; font-weight: 700; letter-spacing: -0.02em; }
      p { margin: 0; line-height: 1.6; color: #6b7280; font-size: 16px; }
    </style>
  </head>
  <body>
    <main>
      <section>
        <div class="icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        </div>
        <h1>Bifrost Preview Area</h1>
        <p>Use the AI workspace on the right to generate a web interface or a data pipeline visualization. The output will instantly render in this secure iframe environment.</p>
      </section>
    </main>
  </body>
</html>`;

const defaultHTML = (icon, title, desc) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"><style>body{font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:linear-gradient(135deg,#f8fafc,#f1f5f9);color:#6b7280}.card{background:white;border:1px solid #e5e7eb;border-radius:16px;padding:48px 56px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.04);max-width:480px}.ico{font-size:56px;margin-bottom:20px;line-height:1}h2{color:#111827;font-size:22px;font-weight:700;margin:0 0 8px;letter-spacing:-.01em}p{font-size:14px;line-height:1.6;margin:0}</style></head><body><div class="card"><div class="ico">${icon}</div><h2>${title}</h2><p>${desc}</p></div></body></html>`;

const defaultPipeline = {
  title: 'Data Pipeline Preview',
  summary: 'Describe a backend workflow on the right to visualize the pipeline here.',
  steps: [
    { title: 'Ingest', description: 'Collect raw data from forms, APIs, logs, or uploaded files.', html: defaultHTML('📥', 'Ingest', 'Collect raw data from forms, APIs, logs, or uploaded files.') },
    { title: 'Validate', description: 'Check schema, missing values, ranges, and duplicate records.', html: defaultHTML('🔍', 'Validate', 'Check schema, missing values, ranges, and duplicate records.') },
    { title: 'Transform', description: 'Clean, normalize, enrich, and join the dataset.', html: defaultHTML('⚙️', 'Transform', 'Clean, normalize, enrich, and join the dataset.') },
    { title: 'Analyze', description: 'Run metrics, models, aggregations, or experiment analysis.', html: defaultHTML('📊', 'Analyze', 'Run metrics, models, aggregations, or experiment analysis.') },
    { title: 'Visualize', description: 'Render dashboards, charts, alerts, and reports.', html: defaultHTML('📈', 'Visualize', 'Render dashboards, charts, alerts, and reports.') },
    { title: 'Export', description: 'Send results to CSV, database, dashboard, or research appendix.', html: defaultHTML('📤', 'Export', 'Send results to CSV, database, dashboard, or research appendix.') },
  ],
};

function cleanCode(text) {
  return text.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
}

function cleanJson(text) {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
}

function safeParseJson(raw) {
  // First attempt: direct parse
  try {
    return JSON.parse(raw);
  } catch (_) {}
  // Second attempt: escape unescaped control characters inside JSON string values
  try {
    const sanitised = raw.replace(
      /"((?:[^"\\]|\\.)*)"/gs,
      (_, inner) => '"' + inner
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t')
        // eslint-disable-next-line no-control-regex
        .replace(/[\x00-\x1F\x7F]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'))
      + '"',
    );
    return JSON.parse(sanitised);
  } catch (_) {}
  // Third attempt: extract just the outer JSON object, drop html fields that are broken
  try {
    const noHtml = raw.replace(/"html"\s*:\s*"(?:[^"\\]|\\.)*"/gs, '"html":""');
    return JSON.parse(noHtml);
  } catch (e) {
    throw new Error(`Failed to parse pipeline JSON: ${e.message}`);
  }
}

function hashCode(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

function getStepIcon(title) {
  const key = title.toLowerCase().replace(/[^a-z]/g, '');
  for (const [word, icon] of Object.entries(STEP_ICONS)) {
    if (key.includes(word)) return icon;
  }
  return '🔷';
}

function readLog() {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
  } catch {
    return [];
  }
}

function logEvent(event) {
  const nextLog = [...readLog(), { timestamp: new Date().toISOString(), ...event }];
  localStorage.setItem(LOG_KEY, JSON.stringify(nextLog));
}

// ── Pipeline Wizard (Intro → Steps → Summary) ────────────────────────────

function StepRefineChat({ step, stepIndex, onUpdateHtml, getModel, cleanCode }) {
  const [messages, setMessages] = React.useState([]);
  const [input, setInput] = React.useState('');
  const [refining, setRefining] = React.useState(false);
  const bottomRef = React.useRef(null);

  React.useEffect(() => {
    // Reset chat when switching steps
    setMessages([]);
    setInput('');
  }, [stepIndex]);

  React.useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

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

Generate a COMPLETE standalone HTML page (with embedded CSS, no external dependencies except Google Fonts Inter) that shows this step's output reflecting the user's instruction.
The page must look like a real production tool — real data tables, inline SVG charts, professional typography, colour schemes.
Return ONLY valid HTML, no markdown, no explanation.`;

      const result = await model.generateContent(prompt);
      const resp = await result.response;
      const html = cleanCode(resp.text());
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
          placeholder={`e.g. "Show a dark-mode terminal output" or "Add a bar chart for throughput"`}
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

function PipelineView({ pipeline: initialPipeline, isAiGenerated, onRefineStep, onRequestRegenerate, getModel, cleanCodeFn }) {
  const [pipeline, setPipeline] = React.useState(initialPipeline);
  const [phase, setPhase] = React.useState('intro');
  const [activeIdx, setActiveIdx] = React.useState(0);
  const [confirmed, setConfirmed] = React.useState({});
  const [fullscreen, setFullscreen] = React.useState(false);
  const [finalHtml, setFinalHtml] = React.useState('');
  const [finalLoading, setFinalLoading] = React.useState(false);
  const [finalError, setFinalError] = React.useState('');
  const [showFinal, setShowFinal] = React.useState(false);
  const pipelineIdRef = React.useRef('');

  React.useEffect(() => {
    const newId = initialPipeline.title + '|' + initialPipeline.steps.length;
    if (newId !== pipelineIdRef.current) {
      pipelineIdRef.current = newId;
      setPipeline(initialPipeline);
      setPhase('intro');
      setActiveIdx(0);
      setConfirmed({});
      setFullscreen(false);
      setFinalHtml('');
      setFinalError('');
      setShowFinal(false);
    }
  }, [initialPipeline]);

  const totalSteps = pipeline.steps.length;

  const handleUpdateHtml = (idx, html) => {
    setPipeline((p) => ({
      ...p,
      steps: p.steps.map((s, i) => (i === idx ? { ...s, html } : s)),
    }));
  };

  const confirmStep = () => {
    const next = { ...confirmed, [activeIdx]: true };
    setConfirmed(next);
    if (activeIdx < totalSteps - 1) {
      setActiveIdx(activeIdx + 1);
    } else {
      setPhase('summary');
    }
  };

  // ── INTRO ─────────────────────────────────────────────────────────────────
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
            <p>This visualization walks you through every stage of your data workflow — from raw input to final output. Review each step, refine it with AI, confirm it fits your design, then get a full summary.</p>
          </div>
        </div>

        <div className="pw-intro-steps-grid">
          {pipeline.steps.map((step, i) => {
            const color = NODE_COLORS[i % NODE_COLORS.length];
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
            Get Started — Review Each Stage
            <span className="pw-cta-arrow">→</span>
          </button>
          {onRequestRegenerate && (
            <button className="pw-ghost-btn" onClick={onRequestRegenerate}>↺ Regenerate</button>
          )}
        </div>
      </div>
    );
  }

  // ── STEPS ─────────────────────────────────────────────────────────────────
  if (phase === 'steps') {
    const step = pipeline.steps[activeIdx];
    const color = NODE_COLORS[activeIdx % NODE_COLORS.length];
    const isConfirmed = !!confirmed[activeIdx];
    const isLast = activeIdx === totalSteps - 1;

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
                  style={{ background: NODE_COLORS[i % NODE_COLORS.length].bg, color: NODE_COLORS[i % NODE_COLORS.length].num, borderColor: NODE_COLORS[i % NODE_COLORS.length].border }}>
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

          {/* iframe preview */}
          <div className="pw-step-viewport">
            <div className="pw-viewport-chrome">
              <div className="pw-chrome-dots"><span /><span /><span /></div>
              <span className="pw-chrome-title">{step.title}</span>
              <button
                className="pw-expand-btn"
                onClick={() => setFullscreen(true)}
                title="Open full view"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
              />
            </div>
          </div>

          {/* Fullscreen modal */}
          {fullscreen && (
            <div className="pw-fs-overlay" onClick={(e) => { if (e.target === e.currentTarget) setFullscreen(false); }}>
              <div className="pw-fs-panel">
                {/* Modal chrome bar */}
                <div className="pw-fs-chrome">
                  <div className="pw-chrome-dots">
                    <span onClick={() => setFullscreen(false)} style={{ cursor: 'pointer' }} title="Close" />
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
                    {/* Prev / Next inside modal */}
                    <button className="pw-fs-nav-btn" disabled={activeIdx === 0}
                      onClick={() => setActiveIdx(activeIdx - 1)}>←</button>
                    <span className="pw-fs-nav-pos">{activeIdx + 1}/{totalSteps}</span>
                    <button className="pw-fs-nav-btn" disabled={isLast}
                      onClick={() => setActiveIdx(activeIdx + 1)}>→</button>
                    <button className="pw-fs-close-btn" onClick={() => setFullscreen(false)} title="Close (Esc)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                </div>
                {/* Full iframe */}
                <div className="pw-fs-body">
                  <iframe
                    key={`fs-${activeIdx}-${step.html ? step.html.length : 0}`}
                    title={`${step.title} — full view`}
                    srcDoc={step.html || `<html><body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:Inter,sans-serif;color:#9ca3af;background:#f8fafc"><div style="text-align:center"><div style="font-size:56px;margin-bottom:16px">${getStepIcon(step.title)}</div><p style="font-size:18px;margin:0;font-weight:600;color:#111827">${step.title}</p><p style="font-size:14px;margin:10px 0 0;opacity:.7">${step.description}</p></div></body></html>`}
                    sandbox="allow-scripts allow-same-origin"
                  />
                </div>
                {/* Modal footer: confirm from here too */}
                <div className="pw-fs-footer">
                  <button className="pw-ghost-btn" onClick={() => setFullscreen(false)}>
                    ← Back to Pipeline
                  </button>
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
          {getModel && cleanCodeFn && (
            <StepRefineChat
              key={activeIdx}
              step={step}
              stepIndex={activeIdx}
              onUpdateHtml={handleUpdateHtml}
              getModel={getModel}
              cleanCode={cleanCodeFn}
            />
          )}

          {/* Footer nav */}
          <div className="pw-step-footer">
            <div className="pw-step-nav">
              <button className="pw-nav-btn" disabled={activeIdx === 0} onClick={() => setActiveIdx(activeIdx - 1)}>
                ← Prev
              </button>
              <span className="pw-step-pos">{activeIdx + 1} / {totalSteps}</span>
              <button className="pw-nav-btn" disabled={isLast} onClick={() => { if (!isLast) setActiveIdx(activeIdx + 1); }}>
                Next →
              </button>
            </div>
            <button
              className={`pw-confirm-btn${isConfirmed ? ' is-confirmed' : ''}`}
              onClick={confirmStep}
            >
              {isConfirmed
                ? (isLast ? '✓ Confirmed — View Summary' : '✓ Confirmed — Next Step')
                : (isLast ? 'Confirm Step — View Summary →' : 'Confirm Step — Next →')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  const generateFinalPage = async () => {
    if (!getModel || !cleanCodeFn) return;
    setFinalLoading(true);
    setFinalError('');
    setShowFinal(true);
    try {
      const model = getModel();
      const stepsContext = pipeline.steps
        .map((s, i) => `Step ${i + 1} — ${s.title}: ${s.description}`)
        .join('\n');
      const prompt = `You are Bifrost. The user has reviewed and confirmed all stages of the following data pipeline:

Pipeline: ${pipeline.title}
Summary: ${pipeline.summary}

Stages:
${stepsContext}

Generate a single, complete, production-quality HTML page that serves as the FINAL integrated output of this entire pipeline. This page should:
- Visually combine all pipeline stages into one cohesive dashboard or interface
- Show realistic sample data flowing through each stage
- Use professional design: clear sections, data tables, inline SVG charts, status indicators
- Feel like a real production tool or analytics dashboard that the pipeline produces
- Include a header with the pipeline title and a brief description
- Each stage should have a visible section or panel in the final page

Return ONLY valid HTML with embedded CSS. No markdown, no explanation. Make it impressive.`;

      const result = await model.generateContent(prompt);
      const resp = await result.response;
      setFinalHtml(cleanCodeFn(resp.text()));
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
          const color = NODE_COLORS[i % NODE_COLORS.length];
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
        <button className="pw-cta-btn" onClick={() => { setActiveIdx(0); setPhase('steps'); }}>
          ← Back to Steps
        </button>
        <button className="pw-ghost-btn" onClick={() => { setPhase('intro'); setConfirmed({}); }}>
          Start Over
        </button>
        {onRequestRegenerate && (
          <button className="pw-ghost-btn" onClick={onRequestRegenerate}>↺ Regenerate Pipeline</button>
        )}
        {getModel && (
          <button className="pw-final-btn" onClick={generateFinalPage} disabled={finalLoading}>
            {finalLoading ? (
              <><span className="pw-final-spinner" /> Generating…</>
            ) : (
              <>✦ View Full Pipeline Page</>
            )}
          </button>
        )}
      </div>

      {/* Final page fullscreen modal */}
      {showFinal && (
        <div className="pw-fs-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowFinal(false); }}>
          <div className="pw-fs-panel">
            <div className="pw-fs-chrome">
              <div className="pw-chrome-dots">
                <span onClick={() => setShowFinal(false)} style={{ cursor: 'pointer' }} title="Close" />
                <span /><span />
              </div>
              <div className="pw-fs-chrome-center">
                <span className="pw-fs-title">✦ {pipeline.title} — Full Pipeline Page</span>
                <span className="pw-fs-desc">{pipeline.summary}</span>
              </div>
              <div className="pw-fs-chrome-right">
                {!finalLoading && !finalError && finalHtml && (
                  <button
                    className="pw-fs-nav-btn"
                    title="Regenerate"
                    onClick={generateFinalPage}
                    style={{ width: 'auto', padding: '0 10px', fontSize: '12px', gap: '4px' }}
                  >
                    ↺ Regenerate
                  </button>
                )}
                <button className="pw-fs-close-btn" onClick={() => setShowFinal(false)} title="Close (Esc)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
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
                <iframe
                  key={finalHtml.length}
                  title="Full Pipeline Page"
                  srcDoc={finalHtml}
                  sandbox="allow-scripts allow-same-origin"
                  style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                />
              )}
            </div>

            <div className="pw-fs-footer">
              <button className="pw-ghost-btn" onClick={() => setShowFinal(false)}
                style={{ borderColor: 'rgba(255,255,255,0.15)', color: '#94a3b8', background: 'transparent' }}>
                ← Back to Summary
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  {pipeline.steps.length} stages · AI Generated
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const [prompt, setPrompt] = useState('');
  const [resultMode, setResultMode] = useState('web');
  const [provider, setProvider] = useState('gemini');
  const [code, setCode] = useState(starterCode);
  const [pipeline, setPipeline] = useState(defaultPipeline);
  const [pipelineIsAi, setPipelineIsAi] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello! I am Bifrost, your AI visual coding assistant. Describe the interface or backend process you want to build, and I will instantly render it for you.' },
  ]);
  const [loading, setLoading] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState('');
  const [variants, setVariants] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [versions, setVersions] = useState([]);
  const [currentVersionId, setCurrentVersionId] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const stageTimer = useRef(null);
  const flushTimer = useRef(null);

  const tokenEstimate = useMemo(() => Math.max(1, Math.ceil(code.length / 4)), [code]);

  const getModel = () => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const modelName = import.meta.env.VITE_GEMINI_MODEL;

    if (provider !== 'gemini') {
      throw new Error(`${provider.toUpperCase()} is shown as an architectural option. This prototype currently executes generation through Gemini.`);
    }

    if (!apiKey || !modelName) {
      throw new Error('API Key or model is not configured in .env');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: modelName });
  };

  const contextText = () => messages.slice(-6).map((message) => `${message.role}: ${message.text}`).join('\n');

  const buildPrompt = (request) => `You are Bifrost, a visual AI coding tool. Use the recent conversation as context:
${contextText()}

Generate a complete, production-quality single page web app, standalone interactive interface, or web component as pure HTML with embedded CSS and minimal JavaScript if needed. Return ONLY runnable HTML code, no markdown, no explanations. The result must be immediately visible in an iframe. User request: ${request}`;

  const buildPipelinePrompt = (request, variant = null) => {
    const variantHint = variant ? ` Focus this pipeline specifically on the "${variant}" perspective.` : '';
    return `You are Bifrost, a backend data pipeline visualizer. The user has described a workflow or system.
Your task: design a clear, logical data pipeline for it.${variantHint}

Return ONLY a valid JSON object — no markdown, no explanation, no code fences, no HTML inside the JSON.
The JSON must follow this exact schema:
{
  "title": "Short descriptive title (max 8 words)",
  "summary": "One sentence describing this pipeline (max 25 words)",
  "steps": [
    {
      "title": "Step Name",
      "description": "One sentence describing what this step does and why it matters."
    }
  ]
}

Rules:
- Include 5 to 7 steps specific to the user's request, not generic placeholders.
- Each step name should be a meaningful verb or noun (e.g. "Market Scan", "Filter Signals", "Score Stocks").
- Each description must be concrete and specific to the described workflow.
- Steps must flow logically from data source to final output.
- Do NOT include any HTML in the JSON. Return only title and description per step.

User request: ${request}`;
  };

  const buildStepHtmlPrompt = (pipelineTitle, step) =>
    `You are Bifrost. Generate a standalone HTML page for one step in the "${pipelineTitle}" data pipeline.

Step: ${step.title}
Description: ${step.description}

Requirements:
- Return ONLY valid HTML with embedded CSS. No markdown, no explanation, no JSON.
- Make it look like a REAL production tool output — data tables, inline SVG charts, terminal output, or dashboard panel.
- Use realistic sample data relevant to the step.
- Professional typography (Google Fonts Inter is allowed).
- Dark or light theme — choose what fits best.
- Keep it under 3000 characters.`;

  const generatePipelineWithAI = async (request, variant = null) => {
    const model = getModel();
    const result = await model.generateContent(buildPipelinePrompt(request, variant));
    const response = await result.response;
    const raw = cleanJson(response.text());
    const parsed = safeParseJson(raw);
    if (!parsed.title || !parsed.summary || !Array.isArray(parsed.steps) || parsed.steps.length < 2) {
      throw new Error('AI returned an invalid pipeline structure.');
    }
    // Normalise steps: ensure { title, description } shape, no html yet
    const baseSteps = parsed.steps.map((s) => {
      if (Array.isArray(s)) return { title: s[0], description: s[1], html: '' };
      return { title: s.title || '', description: s.description || '', html: s.html || '' };
    });

    // Generate HTML for each step in parallel (separate API calls — no JSON contamination)
    const stepsWithHtml = await Promise.all(
      baseSteps.map(async (step) => {
        if (step.html) return step; // already has html (shouldn't happen but just in case)
        try {
          const r = await model.generateContent(buildStepHtmlPrompt(parsed.title, step));
          const html = cleanCode(r.response.text());
          return { ...step, html };
        } catch (_) {
          // Fall back to placeholder card if individual step fails
          return { ...step, html: defaultHTML(getStepIcon(step.title), step.title, step.description) };
        }
      }),
    );

    return { title: parsed.title, summary: parsed.summary, steps: stepsWithHtml };
  };

  const refineStepHTML = async (stepIndex, keywords) => {
    const step = pipeline.steps[stepIndex];
    const model = getModel();
    const prompt = `You are Bifrost. Refine the output for pipeline step "${step.title}".
Original description: ${step.description}
User refinement keywords: ${keywords}

Generate ONLY a complete HTML page (with embedded CSS, no external deps except Google Fonts Inter) that shows this step's output.
The page must look like a real production tool — real data tables, inline SVG charts, professional typography, proper color schemes.
Return ONLY valid HTML, no markdown, no explanation. Keep under 3000 characters.`;

    const result = await model.generateContent(prompt);
    const resp = await result.response;
    const html = cleanCode(resp.text());
    // Update pipeline in place so PipelineView preserves activeIdx
    setPipeline((p) => ({
      ...p,
      steps: p.steps.map((s, i) => (i === stepIndex ? { ...s, html } : s)),
    }));
  };

  const startLoading = (mode = 'web') => {
    setLoading(true);
    setStageIndex(0);
    const stageList = mode === 'pipeline' ? pipelineStages : stages;
    stageTimer.current = window.setInterval(() => {
      setStageIndex((index) => (index + 1) % stageList.length);
    }, 2000);
  };

  const stopLoading = () => {
    window.clearInterval(stageTimer.current);
    window.clearInterval(flushTimer.current);
    setLoading(false);
    setIsStreaming(false);
  };

  const saveVersion = (request, output, mode = resultMode) => {
    const nextVersion = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      prompt: request,
      code: mode === 'web' ? output : JSON.stringify(output),
      mode,
    };
    setVersions((items) => [...items, nextVersion]);
    setCurrentVersionId(nextVersion.id);
  };

  const appendConversation = (request, response) => {
    setMessages((items) => [...items, { role: 'user', text: request }, { role: 'assistant', text: response }]);
  };

  const generateCode = async () => {
    if (!prompt.trim()) return;

    const startedAt = Date.now();
    logEvent({ type: 'generate_start', prompt_length: prompt.length, prompt_text: prompt, result_mode: resultMode, provider });
    setError('');
    setVariants([]);
    setSelectedVariant(null);

    if (resultMode === 'pipeline') {
      startLoading('pipeline');
      try {
        const nextPipeline = await generatePipelineWithAI(prompt);
        setPipeline(nextPipeline);
        setPipelineIsAi(true);
        saveVersion(prompt, nextPipeline, 'pipeline');
        appendConversation(prompt, `Generated a ${nextPipeline.steps.length}-stage data pipeline: "${nextPipeline.title}".`);
        logEvent({
          type: 'generate_success',
          duration_ms: Date.now() - startedAt,
          code_length: JSON.stringify(nextPipeline).length,
        });
      } catch (err) {
        setError(err.message || 'Failed to generate pipeline');
        appendConversation(prompt, `Pipeline generation failed: ${err.message || 'Unknown error'}`);
        logEvent({ type: 'generate_error', error_message: err.message || 'Unknown error' });
      } finally {
        stopLoading();
      }
      return;
    }

    startLoading();
    setIsStreaming(true);

    try {
      const model = getModel();
      const stream = await model.generateContentStream(buildPrompt(prompt));
      let accumulated = '';
      let latest = '';

      flushTimer.current = window.setInterval(() => {
        if (latest) setCode(cleanCode(latest));
      }, 500);

      for await (const chunk of stream.stream) {
        accumulated += chunk.text();
        latest = accumulated;
      }

      const html = cleanCode(accumulated);
      setCode(html);
      saveVersion(prompt, html, 'web');
      appendConversation(prompt, 'Generated a runnable web interface and rendered it on the left.');
      logEvent({
        type: 'generate_success',
        duration_ms: Date.now() - startedAt,
        code_length: html.length,
      });
    } catch (err) {
      setError(err.message || 'An error occurred during generation');
      appendConversation(prompt, `Generation failed: ${err.message || 'Unknown error'}`);
      logEvent({ type: 'generate_error', error_message: err.message || 'Unknown error' });
    } finally {
      stopLoading();
    }
  };

  const generateVariants = async () => {
    if (!prompt.trim()) return;

    if (resultMode === 'pipeline') {
      const variantFocuses = [
        'Batch processing & offline analytics',
        'Real-time streaming & low-latency events',
        'ML model training & automated predictions',
      ];
      const variantLabels = ['Batch Analytics', 'Real-time Stream', 'ML Pipeline'];

      const startedAt = Date.now();
      logEvent({ type: 'generate_start', prompt_length: prompt.length, prompt_text: `${prompt} (3 pipeline variants)`, result_mode: resultMode, provider });
      setError('');
      setSelectedVariant(null);
      setVariants(variantLabels.map((label) => ({ label, loading: true, pipeline: null })));
      startLoading('pipeline');

      try {
        const results = await Promise.all(
          variantFocuses.map(async (focus, i) => {
            const p = await generatePipelineWithAI(prompt, focus);
            return { label: variantLabels[i], loading: false, pipeline: p };
          }),
        );
        setVariants(results);
        setSelectedVariant(0);
        setPipeline(results[0].pipeline);
        setPipelineIsAi(true);
        saveVersion(`${prompt} (${variantLabels[0]})`, results[0].pipeline, 'pipeline');
        appendConversation(prompt, `Generated three AI pipeline variants: Batch Analytics, Real-time Stream, and ML Pipeline.`);
        logEvent({
          type: 'generate_success',
          duration_ms: Date.now() - startedAt,
          code_length: results.reduce((t, r) => t + JSON.stringify(r.pipeline).length, 0),
        });
      } catch (err) {
        setError(err.message || 'Unable to generate pipeline variants');
        appendConversation(prompt, `Pipeline variant generation failed: ${err.message || 'Unknown error'}`);
        logEvent({ type: 'generate_error', error_message: err.message || 'Unknown error' });
      } finally {
        stopLoading();
      }
      return;
    }

    const styles = [
      ['Variant A', 'minimalist style, clean white background'],
      ['Variant B', 'dark mode, modern glassmorphism style'],
      ['Variant C', 'colorful gradient style, material design'],
    ];

    const startedAt = Date.now();
    logEvent({ type: 'generate_start', prompt_length: prompt.length, prompt_text: `${prompt} (3 variants)`, result_mode: resultMode, provider });
    setError('');
    setSelectedVariant(null);
    setVariants(styles.map(([label]) => ({ label, loading: true, code: '' })));
    startLoading();

    try {
      const model = getModel();
      const results = await Promise.all(
        styles.map(async ([label, style]) => {
          const result = await model.generateContent(buildPrompt(`${prompt} - ${style}`));
          const response = await result.response;
          return { label, loading: false, code: cleanCode(response.text()) };
        }),
      );

      setVariants(results);
      setSelectedVariant(0);
      setCode(results[0].code);
      saveVersion(`${prompt} (Variant A)`, results[0].code, 'web');
      appendConversation(prompt, 'Generated three visual design variants and selected Variant A.');
      logEvent({
        type: 'generate_success',
        duration_ms: Date.now() - startedAt,
        code_length: results.reduce((total, item) => total + item.code.length, 0),
      });
    } catch (err) {
      setError(err.message || 'Unable to generate variants');
      appendConversation(prompt, `Variant generation failed: ${err.message || 'Unknown error'}`);
      logEvent({ type: 'generate_error', error_message: err.message || 'Unknown error' });
    } finally {
      stopLoading();
    }
  };

  const useVariant = (index) => {
    const variant = variants[index];
    if (!variant) return;
    setSelectedVariant(index);
    if (resultMode === 'pipeline' && variant.pipeline) {
      setPipeline(variant.pipeline);
      setPipelineIsAi(true);
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
  };

  const exportData = () => {
    const rows = readLog();
    const header = 'timestamp,event_type,duration_ms,prompt_length,code_length,result_mode,provider,notes';
    const csvRows = rows.map((row) => [
      row.timestamp,
      row.type,
      row.duration_ms || '',
      row.prompt_length || '',
      row.code_length || '',
      row.result_mode || '',
      row.provider || '',
      (row.prompt_text || row.error_message || '').replaceAll('"', '""'),
    ].map((cell) => `"${cell}"`).join(','));
    const blob = new Blob([[header, ...csvRows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bifrost_log.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const notePreviewViewed = () => {
    logEvent({ type: 'preview_viewed', code_hash: resultMode === 'web' ? hashCode(code) : hashCode(JSON.stringify(pipeline)), result_mode: resultMode, provider });
  };

  return (
    <div className="app-shell">
      <section className="result-pane">
        <header className="result-header">
          <div>
            <p className="eyebrow">Immediate visible output</p>
            <h1>Bifrost</h1>
          </div>
          <div className="result-tools">
            <button className={resultMode === 'web' ? 'tool-tab active' : 'tool-tab'} type="button" onClick={() => setResultMode('web')}>Web App</button>
            <button className={resultMode === 'pipeline' ? 'tool-tab active' : 'tool-tab'} type="button" onClick={() => setResultMode('pipeline')}>Data Pipeline</button>
          </div>
        </header>

        <header className="preview-header">
          <div>
            <strong>{resultMode === 'web' ? 'Runnable Interface Preview' : 'Backend Behaviour Preview'}</strong>
            <span>{resultMode === 'web' ? `~${tokenEstimate} tokens` : `${pipeline.steps.length} stages`}</span>
          </div>
          {isStreaming && <span className="streaming-dot" aria-label="Streaming" />}
        </header>

        {variants.length > 0 && (
          <div className="variant-strip">
            {variants.map((variant, index) => (
              <button
                className={`variant-card ${selectedVariant === index ? 'selected' : ''}`}
                key={variant.label}
                type="button"
                onClick={() => useVariant(index)}
              >
                <span>{variant.label}</span>
                {variant.loading && <div className="variant-loading">Loading...</div>}
                {!variant.loading && resultMode === 'web' && <iframe title={variant.label} srcDoc={variant.code} />}
                {!variant.loading && resultMode === 'pipeline' && (
                  <div className="mini-pipeline">
                    <span className="mini-pipeline-count">{variant.pipeline ? variant.pipeline.steps.length : '—'} stages</span>
                    {variant.pipeline && <span className="mini-pipeline-title">{variant.pipeline.title}</span>}
                  </div>
                )}
                <em>Use This Variant</em>
              </button>
            ))}
          </div>
        )}

        <div className={`preview-frame-wrap${resultMode === 'pipeline' ? ' is-pipeline' : ''}`}>
          {resultMode === 'web' ? (
            <iframe title="Preview" srcDoc={code} onLoad={notePreviewViewed} />
          ) : (
            <PipelineView pipeline={pipeline} isAiGenerated={pipelineIsAi} onRefineStep={refineStepHTML} onRequestRegenerate={generateCode} getModel={getModel} cleanCodeFn={cleanCode} />
          )}
          {loading && (
            <div className="loading-overlay">
              <div className="progress-bar" />
              <div className="loading-center">
                <span>Bifrost</span>
                <p>{(resultMode === 'pipeline' ? pipelineStages : stages)[stageIndex]}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <aside className="chat-pane">
        <header className="chat-brand">
          <div>
            <p className="eyebrow">AI coding workspace</p>
            <h2>Prompt, generate, inspect</h2>
          </div>
          <button className="ghost-btn" type="button" onClick={() => setHistoryOpen(true)}>History</button>
        </header>

        <div className="control-grid">
          <label>
            Output type
            <select value={resultMode} onChange={(event) => setResultMode(event.target.value)}>
              <option value="web">Web / standalone interface</option>
              <option value="pipeline">Backend data pipeline</option>
            </select>
          </label>
          <label>
            AI provider
            <select value={provider} onChange={(event) => setProvider(event.target.value)}>
              <option value="gemini">Gemini API</option>
              <option value="gpt">GPT API option</option>
              <option value="claude">Claude API option</option>
              <option value="local">Local open-source LLM option</option>
            </select>
          </label>
        </div>

        <div className="conversation">
          {messages.map((message, index) => (
            <article className={`message ${message.role}`} key={`${message.role}-${index}`}>
              <strong>{message.role === 'user' ? 'You' : 'Bifrost'}</strong>
              <p>{message.text}</p>
            </article>
          ))}
        </div>

        <label className="prompt-label" htmlFor="prompt">Tell the AI what to build</label>
        <textarea
          id="prompt"
          className="prompt-input"
          value={prompt}
          placeholder="E.g., Create a modern pricing page with toggleable billing cycles..."
          onChange={(event) => setPrompt(event.target.value)}
          disabled={loading}
        />
        <div className="prompt-meta">{prompt.length} characters · context keeps the latest {Math.min(messages.length, 6)} messages</div>

        {error && <div className="error-banner">Error: {error}</div>}

        <div className="action-row">
          <button className="primary-btn" type="button" onClick={generateCode} disabled={loading}>
            {loading ? 'Generating' : 'Generate Visible Result'}
          </button>
          <button className="secondary-btn" type="button" onClick={generateVariants} disabled={loading}>
            Generate 3 Variants
          </button>
        </div>

        <div className="info-panel">
          <h2>Research focus</h2>
          <p>Bifrost prioritizes immediate visible output: runnable UI in an iframe or backend behaviour as a pipeline visualization.</p>
        </div>
      </aside>

      <button className="export-btn" type="button" onClick={exportData}>
        Export Data (CSV)
      </button>

      <VersionPanel
        open={historyOpen}
        versions={versions}
        currentVersionId={currentVersionId}
        onClose={() => setHistoryOpen(false)}
        onRestore={restoreVersion}
      />
    </div>
  );
}

export default App;
