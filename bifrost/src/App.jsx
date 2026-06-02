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

const defaultPipeline = {
  title: 'Data Pipeline Preview',
  summary: 'Describe a backend workflow on the right to visualize the pipeline here.',
  steps: [
    ['Ingest', 'Collect raw data from forms, APIs, logs, or uploaded files.'],
    ['Validate', 'Check schema, missing values, ranges, and duplicate records.'],
    ['Transform', 'Clean, normalize, enrich, and join the dataset.'],
    ['Analyze', 'Run metrics, models, aggregations, or experiment analysis.'],
    ['Visualize', 'Render dashboards, charts, alerts, and reports.'],
    ['Export', 'Send results to CSV, database, dashboard, or research appendix.'],
  ],
};

function cleanCode(text) {
  return text.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
}

function cleanJson(text) {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
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

function PipelineView({ pipeline, isAiGenerated }) {
  return (
    <div className="pipeline-canvas">
      <header className="pipeline-header">
        <div className="pipeline-header-badge">
          <span className="pipeline-badge-dot" />
          Backend Behaviour Visualization
          {isAiGenerated && <span className="pipeline-ai-tag">✦ AI Generated</span>}
        </div>
        <h2 className="pipeline-title">{pipeline.title}</h2>
        <p className="pipeline-summary">{pipeline.summary}</p>
      </header>

      <div className="pipeline-intro">
        <div className="pipeline-intro-icon">💡</div>
        <div>
          <strong>What is this Data Pipeline?</strong>
          <p>This visualization represents the sequence of steps data goes through from collection to final output. It helps you understand how raw information is ingested, processed, analyzed, and finally exported or visualized, providing a clear architecture for your backend logic.</p>
        </div>
      </div>

      <div className="pipeline-meta-row">
        <span className="pipeline-stage-count">{pipeline.steps.length} stages</span>
        <div className="pipeline-progress-track">
          {pipeline.steps.map((_, i) => (
            <div key={i} className="pipeline-progress-dot" style={{ animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      </div>

      <div className="pipeline-scroll">
        <div className="pipeline-flow">
          {pipeline.steps.map(([title, description], index) => {
            const color = NODE_COLORS[index % NODE_COLORS.length];
            const icon = getStepIcon(title);
            const isLast = index === pipeline.steps.length - 1;
            return (
              <React.Fragment key={`${title}-${index}`}>
                <article
                  className="pipeline-node"
                  style={{ '--node-bg': color.bg, '--node-border': color.border, '--node-num': color.num }}
                >
                  <div className="pipeline-node-top">
                    <span className="pipeline-node-num" style={{ background: color.bg, color: color.num, borderColor: color.border }}>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="pipeline-node-icon">{icon}</span>
                  </div>
                  <h3 className="pipeline-node-title">{title}</h3>
                  <p className="pipeline-node-desc">{description}</p>
                  <div className="pipeline-node-footer">
                    <span className="pipeline-node-step-label">Step {index + 1} of {pipeline.steps.length}</span>
                    {isLast && <span className="pipeline-node-final-badge">✓ Output</span>}
                  </div>
                </article>
                {!isLast && (
                  <div className="pipeline-connector" aria-hidden="true">
                    <div className="pipeline-connector-line" />
                    <div className="pipeline-connector-arrow">›</div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
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

Return ONLY a valid JSON object — no markdown, no explanation, no code fences. The JSON must follow this exact schema:
{
  "title": "Short descriptive title for this pipeline (max 8 words)",
  "summary": "One sentence describing what this pipeline does (max 25 words)",
  "steps": [
    ["Step Name", "One sentence describing what this step does and why it matters."],
    ...
  ]
}

Rules:
- Include 5 to 8 steps that are specific to the user's request, not generic placeholders.
- Each step name should be a single meaningful verb or noun (e.g. "Ingest", "Deduplicate", "Score", "Notify").
- Each description must be concrete and specific to the described workflow.
- Steps must flow logically from data source to final output.

User request: ${request}`;
  };

  const generatePipelineWithAI = async (request, variant = null) => {
    const model = getModel();
    const result = await model.generateContent(buildPipelinePrompt(request, variant));
    const response = await result.response;
    const raw = cleanJson(response.text());
    const parsed = JSON.parse(raw);
    // Validate shape
    if (!parsed.title || !parsed.summary || !Array.isArray(parsed.steps) || parsed.steps.length < 2) {
      throw new Error('AI returned an invalid pipeline structure.');
    }
    return parsed;
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

        <div className="preview-frame-wrap">
          {resultMode === 'web' ? (
            <iframe title="Preview" srcDoc={code} onLoad={notePreviewViewed} />
          ) : (
            <PipelineView pipeline={pipeline} isAiGenerated={pipelineIsAi} />
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
