import React, {
  useState, useEffect, useRef, useCallback,
} from 'react';
import VisualEditor from './editor/VisualEditor.jsx';
import ProposalViewer from './proposal/ProposalViewer.jsx';
import DAGViewer from './dag/DAGViewer.jsx';
import DeployPanel from './deploy/DeployPanel.jsx';
import { generateSkeleton, compileSlide, generateFinalCode } from './engine/aiEngine.js';
import { augmentPromptWithRAG, getRecommendedComponents, getRecommendedPatterns, getRAGKnowledgeText } from './rag/ragEngine.js';

/* ─── System Instruction 常量（供 Context Caching 复用） ─── */
const SYSTEM_INSTRUCTION_SKELETON = `You are a professional website architect and UI designer.
The user describes the website they want, and you need to break it down into multiple "slides" (page sections), each representing a distinct area of the website (e.g., navbar, Hero section, feature showcase, pricing, footer, etc.).

Each slide contains several "Visual Block" elements with position and size information (relative to a 1000×600 canvas).

Available block types:
- heading: Title text (content: {text, level: "h1"|"h2"|"h3", align: "left"|"center"|"right"})
- text: Paragraph text (content: {text, align: "left"|"center"|"right"})
- image: Image placeholder (content: {src: "", alt, fit: "cover"|"contain"})
- button: Button (content: {text, variant: "primary"|"secondary"|"ghost"|"danger", href: "#"})
- card: Card (content: {title, body, hasImage: true|false})
- list: List (content: {items: ["...","..."], style: "bullet"|"number"})
- hero: Hero section (content: {title, sub, cta})
- nav: Navbar (content: {logo, links: ["Home","Features"], cta})
- badge: Badge/tag (content: {text, color: "#6366f1"})
- divider: Divider (content: {style: "line"})

Important rules:
1. Reasonably distribute positions: x,y,w,h are pixel values, canvas size 1000×600, avoid severe overlap
2. Each slide has 3-8 blocks, carefully laid out, representing real website areas
3. Generate 3-6 slides covering the complete website structure
4. bgColor uses dark colors (e.g., #0f172a, #1e293b) or choose according to style
5. Text content should be meaningful and match user needs.

Return format (pure JSON, no markdown):
[
  {
    "name": "Navbar + Hero",
    "bgColor": "#0f172a",
    "blocks": [
      {"type": "nav",     "x": 0,    "y": 0,   "w": 1000, "h": 60,  "zIndex": 1, "content": {"logo": "Brand", "links": ["Home","Features","Pricing"], "cta": "Get Started"}},
      {"type": "hero",    "x": 100,  "y": 100, "w": 800,  "h": 200, "zIndex": 1, "content": {"title": "Big Title", "sub": "Subtitle", "cta": "Try Now"}}
    ]
  }
]`;

const SYSTEM_INSTRUCTION_COMPILE = `You are a professional front-end developer.
Compile the visual blocks of a slide into a real, runnable HTML page.
Requirements:
1. Output complete HTML (with <html><head><body> tags)
2. Use inline <style> for all CSS, no external resources
3. Strictly restore block positions and sizes (canvas 1000×600, convert to percentage layout)
4. Light theme, clean and professional, suitable for academic screenshots
5. Font: system-ui, sans-serif
6. Buttons and cards should have hover effects
7. Clean code, directly runnable in browser
8. No comments, no markdown, output HTML only`;

const SYSTEM_INSTRUCTION_FINAL = `Merge multiple HTML fragments into one complete, professional single-page website.
Requirements: 1) Output complete HTML document 2) Integrate all styles, resolve conflicts 3) Natural transitions between sections 4) Smooth scrolling 5) Responsive design 6) Unified light theme, clean and professional 7) High code quality, deployable 8) Output HTML only, no markdown, no comments`;
import { buildDAGFromSlides, getDAGStats } from './dag/dagEngine.js';
import { analyzeFlow, formatFlowReport, FLOW_STATUS, VALIDATION_LEVEL } from './flowco/flowcoEngine.js';
import { DEPLOY_TARGET, DEPLOY_STATUS } from './deploy/deployService.js';
import LandingPage from './landing/LandingPage.jsx';
import './App.css';

/* ─── API Key (supports .env or localStorage) ────────────── */
function getApiKey() {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey) return envKey;
  const stored = localStorage.getItem('bifrost_api_key');
  return stored || '';
}

function setApiKey(key) {
  localStorage.setItem('bifrost_api_key', key);
}

/* ─── Conversation history ───────────────────────────────── */
function buildSystemPrompt() {
  return `You are Bifrost, a visual AI web engine assistant.
The user is building a website using a PPT-like visual editor.
You help them refine their intent, suggest improvements, and answer questions.
Keep responses concise and helpful. Always respond in English.
When the user's intent is clear, signal it by ending with: [READY_TO_GENERATE]`;
}

/* ─── Phase definitions ──────────────────────────────────── */
const PHASE = {
  CHAT:      'chat',
  COMPILING: 'compiling',
  PROPOSAL:  'proposal',
  EDIT:      'edit',
  DEPLOYING: 'deploying',
  DONE:      'done',
};

/* ─── Demo prompts ─────────────────────────────────────────────── */
const DEMO_PROMPTS = [
  'Design a minimalist photography portfolio with dark mode toggle',
  'Build an artisan coffee shop website with product showcase and cart',
  'Create a SaaS landing page with features, pricing tiers and CTA',
  'Make a personal blog homepage with article list, tags and search',
];

/* ─── Root App ─────────────────────────────────────────────────── */
export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [phase, setPhaseState]       = useState(PHASE.CHAT);
  const [apiKey, setApiKeyState]     = useState(getApiKey());
  const [showApiInput, setShowApiInput] = useState(!getApiKey());
  const [apiInputValue, setApiInputValue] = useState('');
  const [apiError, setApiError]       = useState('');

  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hello! I'm Bifrost, your visual AI website builder.\n\nDescribe the website you want to build — I'll help clarify your requirements, then generate an editable PPT-style visual sketch." }
  ]);
  const [inputText, setInputText]   = useState('');
  const [isTyping, setIsTyping]     = useState(false);

  const [slides, setSlides]       = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [finalHtml, setFinalHtml] = useState('');
  const [error, setError]         = useState('');
  const [compileLog, setCompileLog] = useState([]);
  const [deployUrl, setDeployUrl]   = useState('');
  const [userIntent, setUserIntent]   = useState('');

  /* ── LandingPage → 进入 Chat ─────────────────────────── */
  const handleGetStarted = useCallback(() => {
    setShowLanding(false);
    setPhaseState(PHASE.CHAT);
    setMessages([
      { role: 'assistant', text: "Welcome to Bifrost! 🎉\n\nDescribe the website you want to build — I'll help clarify your requirements, then generate an editable PPT-style visual sketch." }
    ]);
  }, []);

  // ── RAG state ──────────────────────────────────────────
  const [ragComponents, setRagComponents] = useState([]);
  const [ragPatterns, setRagPatterns]     = useState([]);
  const [showRagPanel, setShowRagPanel]   = useState(false);

  // ── DAG state ──────────────────────────────────────────
  const [dag, setDag]           = useState(null);
  const [showDagPanel, setShowDagPanel] = useState(false);

  // ── Flowco state ───────────────────────────────────────
  const [flowReport, setFlowReport]     = useState(null);
  const [showFlowPanel, setShowFlowPanel] = useState(false);

  // ── Deploy state ───────────────────────────────────────
  const [showDeployPanel, setShowDeployPanel] = useState(false);
  const [isDeployingReal, setIsDeployingReal] = useState(false);

  // ── Context Cache state (Gemini Caching API) ─────────
  const [cachedContentName, setCachedContentName] = useState(
    () => localStorage.getItem('bifrost_cache_name') || null
  );
  const [cacheExpiry, setCacheExpiry] = useState(
    () => parseInt(localStorage.getItem('bifrost_cache_expiry')) || 0
  );
  const cacheEnsuring = useRef(false);

  const chatEndRef  = useRef(null);
  const inputRef    = useRef(null);

  /* Auto-scroll chat */
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  /* Focus input */
  useEffect(() => {
    if (phase === PHASE.CHAT && inputRef.current && !showApiInput) {
      inputRef.current.focus();
    }
  }, [phase, showApiInput]);

  /* ── Save API Key ──────────────────────────────────────────── */
  const handleSaveApiKey = useCallback(() => {
    const key = apiInputValue.trim();
    if (!key) {
      setApiError('Please enter a valid API Key.');
      return;
    }
    setApiKey(key);
    setApiKeyState(key);
    setShowApiInput(false);
    setApiError('');
    setMessages([
      { role: 'assistant', text: '✅ API Key saved! You can now start chatting.\n\nDescribe the website you want to build.' }
    ]);
  }, [apiInputValue]);

  /* ── Send chat message ──────────────────────────────────────── */
  const handleSend = useCallback(async () => {
    if (!inputText.trim() || isTyping) return;

    const key = getApiKey();
    if (!key) {
      setShowApiInput(true);
      return;
    }

    const userMsg = { role: 'user', text: inputText.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);
    setError('');

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;

      const historyForAPI = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.text }],
        }));

      const payload = {
        systemInstruction: { parts: [{ text: buildSystemPrompt() }] },
        contents: [...historyForAPI, { role: 'user', parts: [{ text: userMsg.text }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
      };

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error?.message || `API error ${resp.status}`);
      }

      const data = await resp.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text
                    || 'Sorry, I did not receive a valid response.';

      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);

      if (reply.includes('[READY_TO_GENERATE]')) {
        setTimeout(() => {
          handleGenerate(userMsg.text);
        }, 600);
      }

    } catch (err) {
      console.error('Chat error:', err);
      setError(`Chat error: ${err.message}`);
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: `(Demo mode) I understand your request: "${userMsg.text}"\n\nGenerating your website sketch now... [READY_TO_GENERATE]`
      }]);
      setTimeout(() => {
        handleGenerate(userMsg.text);
      }, 800);
    } finally {
      setIsTyping(false);
    }
  }, [inputText, isTyping, messages]);

  /* ── Generate skeleton → 进入提案确认阶段 ─────────────────── */
  const handleGenerate = useCallback(async (overridePrompt) => {
    const promptToUse = overridePrompt || messages.filter(m => m.role === 'user').map(m => m.text).join('\n');
    if (!promptToUse.trim()) return;

    setError('');
    setCompileLog([]);
    setPhaseState(PHASE.COMPILING);

    try {
      const log = (msg) => setCompileLog(prev => [...prev, msg]);

      // ── Stage 0: RAG 检索增强 ──────────────────────────────
      log('🔍 Analysing intent…');
      log('📚 Retrieving relevant components from knowledge base (RAG)…');
      const ragResults = getRecommendedComponents(promptToUse, 6);
      const patResults = getRecommendedPatterns(promptToUse);
      setRagComponents(ragResults);
      setRagPatterns(patResults);

      if (ragResults.length > 0) {
        log(`🧩 Found ${ragResults.length} matching components via RAG`);
        if (patResults.length > 0) {
          log(`🗂 Matched layout pattern: ${patResults[0].pattern.name}`);
        }
      }

      // RAG 增强 Prompt
      const augmentedPrompt = augmentPromptWithRAG(promptToUse);
      log('📐 Generating PPT proposal slides with RAG context…');

      const key = getApiKey();
      let rawSlides;

      if (key) {
        try {
          rawSlides = await generateSkeletonREST(key, augmentedPrompt, log);
        } catch (e) {
          console.warn('AI generate failed, using fallback:', e.message);
          rawSlides = buildFallbackSlides(promptToUse);
        }
      } else {
        await delay(1200);
        rawSlides = buildFallbackSlides(promptToUse);
      }

      const slidesWithProposal = rawSlides.map(s => ({ ...s, proposalStatus: 'pending' }));
      setSlides(slidesWithProposal);
      setUserIntent(promptToUse);
      log(`✅ Generated ${rawSlides.length} slides`);

      // ── DAG 构建 ────────────────────────────────────────────
      log('🕸 Building DAG dependency graph…');
      const newDag = buildDAGFromSlides(slidesWithProposal, promptToUse);
      setDag(newDag);
      const dagStats = getDAGStats(newDag);
      log(`◈ DAG: ${dagStats.totalNodes} nodes, ${dagStats.parallelGroups} layers, max parallelism ×${dagStats.maxParallelism}`);

      // ── Flowco 数据流分析 ────────────────────────────────────
      log('🔬 Running Flowco data flow analysis…');
      const report = analyzeFlow(slidesWithProposal);
      setFlowReport(report);
      const fmt = formatFlowReport(report);
      log(`${fmt.icon} Flowco: ${fmt.summaryText}`);

      log('💬 Entering proposal review mode — discuss each slide…');
      await delay(400);
      setPhaseState(PHASE.PROPOSAL);
      setActiveIdx(0);
    } catch (err) {
      setError(err.message || 'Generation failed, please try again');
      setPhaseState(PHASE.CHAT);
    }
  }, [messages]);

  /* ── Re-run Flowco when slides change ────────────────── */
  const handleSlidesChangeWithFlowco = useCallback((newSlides) => {
    setSlides(newSlides);
    // 幻灯片每次变化都重新分析数据流
    const report = analyzeFlow(newSlides);
    setFlowReport(report);
    // 同步更新 DAG
    const newDag = buildDAGFromSlides(newSlides, userIntent);
    setDag(newDag);
  }, [userIntent]);

  /* ── Compile single slide ──────────────────────────────────── */
  const handleCompileSlide = useCallback(async (idx) => {
    const slide = slides[idx];
    if (!slide) return;
    setError('');
    const key = getApiKey();

    setSlides(prev => prev.map((s, i) =>
      i === idx ? { ...s, status: 'compiling' } : s
    ));

    try {
      let html;
      if (key) {
        html = await compileSlideREST(key, slide, getPromptFromMessages(messages));
      } else {
        await delay(1000);
        html = generateDemoHtml(slide);
      }
      setSlides(prev => prev.map((s, i) =>
        i === idx ? { ...s, status: 'compiled', html } : s
      ));
    } catch (err) {
      setSlides(prev => prev.map((s, i) =>
        i === idx ? { ...s, status: 'error', error: err.message } : s
      ));
      setError(`Compile failed: ${err.message}`);
    }
  }, [slides, messages]);

  /* ── Compile ALL slides in parallel (concurrency-controlled) ── */
  const handleCompileAll = useCallback(async (indices) => {
    const key = getApiKey();
    if (!key || indices.length === 0) return;

    const CONCURRENCY = 3; // Gemini Flash RPM ~15, safe concurrency
    const total = indices.length;
    let completed = 0;

    setCompileLog(prev => [...prev, `🚀 Parallel compile started: ${total} slides, concurrency=${CONCURRENCY}`]);

    // Mark all target slides as compiling
    setSlides(prev => prev.map((s, i) =>
      indices.includes(i) ? { ...s, status: 'compiling' } : s
    ));

    // Process in batches
    for (let start = 0; start < total; start += CONCURRENCY) {
      const batch = indices.slice(start, start + CONCURRENCY);
      setCompileLog(prev => [...prev, `⚡ Batch ${Math.floor(start / CONCURRENCY) + 1}: compiling slides [${batch.map(i => i + 1).join(', ')}]…`]);

      const results = await Promise.allSettled(
        batch.map(idx => {
          const slide = slides[idx];
          if (!slide) return Promise.resolve({ idx, html: null, error: 'Slide not found' });
          return compileSlideREST(key, slide, getPromptFromMessages(messages))
            .then(html => ({ idx, html, error: null }))
            .catch(err => ({ idx, html: null, error: err.message }));
        })
      );

      // Update slides with results
      const batchResults = results.map(r => r.status === 'fulfilled' ? r.value : { idx: -1, html: null, error: 'Promise rejected' });
      setSlides(prev => prev.map((s, i) => {
        const r = batchResults.find(br => br.idx === i);
        if (!r) return s;
        if (r.error) return { ...s, status: 'error', error: r.error };
        completed++;
        setCompileLog(prev => [...prev.filter(l => !l.includes('✅') || !l.includes(`Slide ${i + 1}`)), `✅ Slide ${i + 1} compiled (${completed}/${total})`]);
        return { ...s, status: 'compiled', html: r.html };
      }));
    }

    setCompileLog(prev => [...prev, `🎉 All ${total} slides compiled in parallel!`]);
  }, [slides, messages]);

  /* ── Proposal → Edit (with auto parallel compile) ─────────── */
  const handleProceedToEdit = useCallback(() => {
    setPhaseState(PHASE.COMPILING);
    setCompileLog(prev => [...prev, '🎨 Entering visual editor, starting parallel compile…']);

    // Auto-trigger parallel compile for all skeleton slides
    const toCompile = slides
      .map((s, i) => s.status === 'skeleton' ? i : -1)
      .filter(i => i >= 0);

    if (toCompile.length > 0) {
      handleCompileAll(toCompile);
    }

    setTimeout(() => {
      setPhaseState(PHASE.EDIT);
      setActiveIdx(0);
    }, 600);
  }, [slides, handleCompileAll]);

  /* ── Deploy ─────────────────────────────────────────────────── */
  const handleDeploy = useCallback(async () => {
    setPhaseState(PHASE.DEPLOYING);
    setError('');
    try {
      const key = getApiKey();
      let html;
      if (key) {
        html = await generateFinalCodeREST(key, slides, getPromptFromMessages(messages));
      } else {
        await delay(1500);
        html = generateDemoFullHtml(slides);
      }
      setFinalHtml(html);
      setDeployUrl(`https://bifrost.app/preview/${Date.now()}`);
      setPhaseState(PHASE.DONE);
    } catch (err) {
      setError(err.message || 'Deployment failed');
      setPhaseState(PHASE.EDIT);
    }
  }, [slides, messages]);

  /* ── Reset ──────────────────────────────────────────────────── */
  const handleReset = () => {
    setPhaseState(PHASE.CHAT);
    setInputText('');
    setMessages([
      { role: 'assistant', text: "Hello! I'm Bifrost, your visual AI website builder.\n\nDescribe the website you want to build — I'll help clarify your requirements, then generate an editable PPT-style visual sketch." }
    ]);
    setSlides([]);
    setFinalHtml('');
    setDeployUrl('');
    setError('');
    setCompileLog([]);
    setActiveIdx(0);
  };

  /* ── Derived ─────────────────────────────────────────────────── */
  const compiledCount  = slides.filter(s => s.status === 'compiled').length;
  const allCompiled    = slides.length > 0 && compiledCount === slides.length;

  /* ═════════════════════════════════════════════════════════
      RENDER
      ═════════════════════════════════════════════════════════ */
  return (
    <div className="app" data-phase={phase}>
      {showLanding ? (
        <LandingPage onEnter={handleGetStarted} />
      ) : (<>
      {/* ── Top nav ─────────────────────────────────────────────── */}
      <header className="topbar">
        <div className="topbar-logo" onClick={handleReset}>
          <span className="topbar-logo-icon">◈</span>
          <span className="topbar-logo-name">Bifrost</span>
          <span className="topbar-logo-tag">Visual AI</span>
        </div>

        <nav className="phase-stepper">
          {[
            { key: PHASE.CHAT,      label: 'Chat',     num: '1' },
            { key: PHASE.COMPILING, label: 'Generate', num: '2' },
            { key: PHASE.PROPOSAL,  label: 'Proposal', num: '3' },
            { key: PHASE.EDIT,      label: 'Edit',     num: '4' },
            { key: PHASE.DONE,      label: 'Deploy',   num: '5' },
          ].map(({ key, label, num }, i, arr) => {
            const order = [PHASE.CHAT, PHASE.COMPILING, PHASE.PROPOSAL, PHASE.EDIT, PHASE.DEPLOYING, PHASE.DONE];
            const phaseIdx = order.indexOf(phase);
            const stepIdx  = order.indexOf(key);
            const isDone   = phaseIdx > stepIdx;
            const isActive = phase === key
              || (key === PHASE.EDIT && (phase === PHASE.DEPLOYING || phase === PHASE.EDIT))
              || (key === PHASE.PROPOSAL && phase === PHASE.PROPOSAL)
              || (key === PHASE.DONE && phase === PHASE.DONE);
            return (
              <React.Fragment key={key}>
                <div className={`phase-step ${isDone ? 'is-done' : ''} ${isActive ? 'is-active' : ''}`}>
                  <div className="phase-step-num">{isDone ? '✓' : num}</div>
                  <span className="phase-step-label">{label}</span>
                </div>
                {i < arr.length - 1 && (
                  <div className={`phase-connector ${isDone ? 'is-done' : ''}`} />
                )}
              </React.Fragment>
            );
          })}
        </nav>

        <div className="topbar-right">
          {/* ── 新功能快捷按钮 ── 仅在生成后显示 ── */}
          {slides.length > 0 && (
            <>
              {/* RAG 提示 */}
              {ragComponents.length > 0 && (
                <button
                  className="topbar-btn topbar-btn--feature"
                  onClick={() => setShowRagPanel(v => !v)}
                  title="RAG — Component Suggestions"
                >
                  📚 RAG <span className="topbar-btn-badge">{ragComponents.length}</span>
                </button>
              )}
              {/* DAG 依赖图 */}
              {dag && (
                <button
                  className="topbar-btn topbar-btn--feature"
                  onClick={() => setShowDagPanel(v => !v)}
                  title="DAG — Workflow Dependencies"
                >
                  ◈ DAG
                </button>
              )}
              {/* Flowco 校验 */}
              {flowReport && (() => {
                const fmt = formatFlowReport(flowReport);
                return (
                  <button
                    className={`topbar-btn topbar-btn--feature topbar-btn--flow-${flowReport.status}`}
                    onClick={() => setShowFlowPanel(v => !v)}
                    title="Flowco — Data Flow Validation"
                  >
                    {fmt.icon} Flowco
                    {flowReport.summary.errors > 0 && (
                      <span className="topbar-btn-badge topbar-btn-badge--error">{flowReport.summary.errors}</span>
                    )}
                  </button>
                );
              })()}
            </>
          )}

          {phase !== PHASE.CHAT && (
            <button className="topbar-btn" onClick={handleReset}>↩ Start Over</button>
          )}
          <button className="topbar-btn topbar-btn--sm" onClick={() => setShowApiInput(v => !v)} title="Set API Key">
            ⚙
          </button>
        </div>
      </header>

      {/* ── API Key Input Modal ────────────────────────────────── */}
      {showApiInput && (
        <div className="api-modal-overlay" onClick={() => { if (apiKey) setShowApiInput(false); }}>
          <div className="api-modal" onClick={e => e.stopPropagation()}>
            <h3 className="api-modal-title">Set Gemini API Key</h3>
            <p className="api-modal-desc">
              Enter your <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">Gemini API Key</a> for AI chat and code generation. The key is stored locally in your browser.
            </p>
            <input
              className="api-modal-input"
              type="password"
              placeholder="AIza..."
              value={apiInputValue}
              onChange={e => setApiInputValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveApiKey(); }}
            />
            {apiError && <div className="api-modal-error">{apiError}</div>}
            <div className="api-modal-actions">
              {apiKey && (
                <button className="api-modal-btn api-modal-btn--cancel" onClick={() => setShowApiInput(false)}>
                  Cancel
                </button>
              )}
              <button className="api-modal-btn api-modal-btn--save" onClick={handleSaveApiKey}>
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Error Banner ─────────────────────────────────────────── */}
      {error && (
        <div className="error-banner">
          <span>⚠ {error}</span>
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════
          PHASE 1: CHAT
          ═════════════════════════════════════════════════════════ */}
      {phase === PHASE.CHAT && (
        <main className="chat-stage">
          <div className="chat-layout">
            {/* Left: Chat panel */}
            <div className="chat-panel">
              <div className="chat-panel-header">
                <span className="chat-panel-icon">💬</span>
                <span className="chat-panel-title">Bifrost Chat</span>
                {apiKey && <span className="chat-panel-badge">API Connected</span>}
              </div>

              <div className="chat-messages">
                {messages.map((m, i) => (
                  <div key={i} className={`chat-msg chat-msg--${m.role}`}>
                    <div className="chat-msg-role">{m.role === 'user' ? 'You' : 'Bifrost'}</div>
                    <div className="chat-msg-text">{m.text.replace(/\[READY_TO_GENERATE\]/g, '')}</div>
                  </div>
                ))}
                {isTyping && (
                  <div className="chat-msg chat-msg--assistant">
                    <div className="chat-msg-role">Bifrost</div>
                    <div className="chat-msg-text">
                      <span className="chat-typing-dot">.</span>
                      <span className="chat-typing-dot">.</span>
                      <span className="chat-typing-dot">.</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="chat-input-bar">
                <textarea
                  ref={inputRef}
                  className="chat-input"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                  }}
                  placeholder="Describe the website you want to build..."
                  rows={2}
                />
                <button
                  className="chat-send-btn"
                  onClick={handleSend}
                  disabled={!inputText.trim() || isTyping}
                >
                  Send
                </button>
              </div>
            </div>

            {/* Right: Info panel */}
            <div className="chat-info">
              <h1 className="chat-info-title">
                Build your website<br/>with natural language
              </h1>
              <p className="chat-info-sub">
                Describe your idea → AI clarifies requirements → Generate a PPT-style visual sketch → Edit freely like slides → Launch in one click
              </p>

              <div className="chat-demos">
                <span className="chat-demos-label">Try these:</span>
                {DEMO_PROMPTS.map((p, i) => (
                  <button
                    key={i}
                    className="chat-demo-chip"
                    onClick={() => setInputText(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <div className="chat-features">
                {[
                  { icon: '⚡', title: 'Instant Skeleton', desc: 'Parse intent instantly, generate a complete page structure' },
                  { icon: '🎨', title: 'PPT-style Editing', desc: 'Drag text boxes, adjust layout — intuitive by design' },
                  { icon: '🔒', title: '100% Hallucination Guard', desc: 'What you see is what you get — AI errors are visible and fixable' },
                  { icon: '🚀', title: 'One-click Deploy', desc: 'From idea to live site in minutes' },
                ].map(({ icon, title, desc }) => (
                  <div key={title} className="chat-feature-card">
                    <div className="chat-feature-icon">{icon}</div>
                    <div className="chat-feature-title">{title}</div>
                    <div className="chat-feature-desc">{desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      )}

      {/* ═════════════════════════════════════════════════════════
          PHASE 2: COMPILING
          ═════════════════════════════════════════════════════════ */}
      {phase === PHASE.COMPILING && (
        <main className="compile-stage">
          <div className="compile-center">
            <div className="compile-spinner">
              <div className="compile-spinner-ring" />
              <div className="compile-spinner-ring compile-spinner-ring--2" />
              <div className="compile-spinner-core">AI</div>
            </div>
            <h2 className="compile-title">Generating Page Structure</h2>
            <p className="compile-sub">Turning your idea into a PPT-style visual sketch…</p>

            <div className="compile-log">
              {compileLog.map((line, i) => (
                <div key={i} className="compile-log-line">
                  <span className="compile-log-dot" />
                  <span>{line}</span>
                </div>
              ))}
              <div className="compile-log-cursor" />
            </div>
          </div>
        </main>
      )}

      {/* ═════════════════════════════════════════════════════════
          PHASE 3: PROPOSAL（PPT 提案 + 每页对话框）
          ═════════════════════════════════════════════════════════ */}
      {phase === PHASE.PROPOSAL && (
        <ProposalViewer
          slides={slides}
          onSlidesChange={handleSlidesChangeWithFlowco}
          onProceedToEdit={handleProceedToEdit}
          userIntent={userIntent}
          apiKey={apiKey}
          flowReport={flowReport}
          dag={dag}
          ragComponents={ragComponents}
          ragPatterns={ragPatterns}
        />
      )}

      {/* ═════════════════════════════════════════════════════════
          PHASE 4: VISUAL EDIT
          ═════════════════════════════════════════════════════════ */}
      {(phase === PHASE.EDIT || phase === PHASE.DEPLOYING) && (
        <VisualEditor
          slides={slides}
          activeIdx={activeIdx}
          onActiveChange={setActiveIdx}
          onSlidesChange={setSlides}
          onCompileSlide={handleCompileSlide}
          onDeploy={handleDeploy}
          isDeploying={phase === PHASE.DEPLOYING}
          allCompiled={allCompiled}
          compiledCount={compiledCount}
          apiKey={apiKey}
        />
      )}

      {/* ═════════════════════════════════════════════════════════
          PHASE 5: DONE
          ═════════════════════════════════════════════════════════ */}
      {phase === PHASE.DONE && (
        <main className="done-stage">
          <div className="done-left">
            <div className="done-success-badge">✓ Generated</div>
            <h2 className="done-title">Your website is ready to deploy</h2>

            <div className="done-stats">
              {[
                { label: 'Slides', value: slides.length },
                { label: 'Lines of code', value: `~${Math.round(finalHtml.length / 50)}` },
                { label: 'Time taken', value: '< 1 min' },
              ].map(({ label, value }) => (
                <div key={label} className="done-stat">
                  <div className="done-stat-value">{value}</div>
                  <div className="done-stat-label">{label}</div>
                </div>
              ))}
            </div>

            {/* ── Flowco 摘要 ──────────────────────────── */}
            {flowReport && (() => {
              const fmt = formatFlowReport(flowReport);
              return (
                <div className={`done-flow-badge done-flow-badge--${flowReport.status}`}>
                  <span>{fmt.icon} Flowco: {fmt.summaryText}</span>
                  {flowReport.status !== FLOW_STATUS.VALID && (
                    <button className="done-flow-details" onClick={() => setShowFlowPanel(true)}>
                      View Issues
                    </button>
                  )}
                </div>
              );
            })()}

            {/* ── 快捷操作 ─────────────────────────────── */}
            <div className="done-actions">
              <button className="done-btn done-btn--primary" onClick={() => {
                const w = window.open();
                w?.document.write(finalHtml);
                w?.document.close();
              }}>🚀 Open Preview</button>
              <button className="done-btn" onClick={() => setPhaseState(PHASE.EDIT)}>✎ Continue Editing</button>
              <button className="done-btn" onClick={handleReset}>↩ Start Over</button>
            </div>

            {/* ── 真实部署面板 ─────────────────────────── */}
            <DeployPanel
              html={finalHtml}
              isDeploying={isDeployingReal}
              setIsDeploying={setIsDeployingReal}
              onDeployComplete={(result) => {
                setDeployUrl(result.url);
              }}
            />
          </div>

          <div className="done-right">
            <div className="done-preview-bar">
              <div className="done-preview-dots"><span/><span/><span/></div>
              <div className="done-preview-url">
                {deployUrl && deployUrl !== `https://bifrost.app/preview/${Date.now()}`
                  ? deployUrl
                  : 'Preview'}
              </div>
            </div>
            <iframe
              className="done-preview-frame"
              srcDoc={finalHtml}
              title="Preview"
              sandbox="allow-scripts"
            />
          </div>
        </main>
      )}
      {/* ═════════════════════════════════════════════════════════
          RAG PANEL — 右侧滑出面板
          ═════════════════════════════════════════════════════════ */}
      {showRagPanel && (
        <div className="side-panel-overlay" onClick={() => setShowRagPanel(false)}>
          <div className="side-panel" onClick={e => e.stopPropagation()}>
            <div className="side-panel-header">
              <span className="side-panel-icon">📚</span>
              <span className="side-panel-title">RAG — Component Suggestions</span>
              <button className="side-panel-close" onClick={() => setShowRagPanel(false)}>×</button>
            </div>
            <div className="side-panel-body">
              {ragPatterns.length > 0 && (
                <div className="rag-section">
                  <div className="rag-section-title">🗂 Matched Layout Patterns</div>
                  {ragPatterns.map(({ pattern, score }) => (
                    <div key={pattern.id} className="rag-pattern-card">
                      <div className="rag-pattern-name">{pattern.name}</div>
                      <div className="rag-pattern-desc">{pattern.description}</div>
                      <div className="rag-pattern-score">Relevance: {(score * 100).toFixed(0)}%</div>
                      <div className="rag-pattern-colors">
                        <span style={{ background: pattern.colorScheme.primary }} className="rag-color-dot" />
                        <span style={{ background: pattern.colorScheme.bg }} className="rag-color-dot" />
                        <span className="rag-pattern-color-text">{pattern.colorScheme.primary}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {ragComponents.length > 0 && (
                <div className="rag-section">
                  <div className="rag-section-title">🧩 Recommended Components</div>
                  {ragComponents.map(({ component, score }) => (
                    <div key={component.id} className="rag-comp-card">
                      <div className="rag-comp-header">
                        <span className="rag-comp-type">[{component.blockType}]</span>
                        <span className="rag-comp-name">{component.name}</span>
                        <span className="rag-comp-score">{(score * 100).toFixed(0)}%</span>
                      </div>
                      <div className="rag-comp-desc">{component.description}</div>
                      <div className="rag-comp-css">{component.cssHints}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════
          DAG PANEL — 依赖关系图
          ═════════════════════════════════════════════════════════ */}
      {showDagPanel && dag && (
        <div className="side-panel-overlay" onClick={() => setShowDagPanel(false)}>
          <div className="side-panel side-panel--wide" onClick={e => e.stopPropagation()}>
            <div className="side-panel-header">
              <span className="side-panel-icon">◈</span>
              <span className="side-panel-title">DAG — Workflow Dependencies</span>
              <button className="side-panel-close" onClick={() => setShowDagPanel(false)}>×</button>
            </div>
            <div className="side-panel-body side-panel-body--fill">
              <DAGViewer
                dag={dag}
                onNodeClick={(node) => {
                  if (node.slideIndex !== null) {
                    setActiveIdx(node.slideIndex);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════
          FLOWCO PANEL — 数据流分析
          ═════════════════════════════════════════════════════════ */}
      {showFlowPanel && flowReport && (
        <div className="side-panel-overlay" onClick={() => setShowFlowPanel(false)}>
          <div className="side-panel" onClick={e => e.stopPropagation()}>
            <div className="side-panel-header">
              <span className="side-panel-icon">🔬</span>
              <span className="side-panel-title">Flowco — Data Flow Analysis</span>
              <button className="side-panel-close" onClick={() => setShowFlowPanel(false)}>×</button>
            </div>
            <div className="side-panel-body">
              {/* 摘要 */}
              {(() => {
                const fmt = formatFlowReport(flowReport);
                return (
                  <div className={`flow-summary flow-summary--${flowReport.status}`}>
                    <span className="flow-summary-icon">{fmt.icon}</span>
                    <div>
                      <div className="flow-summary-status">{fmt.statusText}</div>
                      <div className="flow-summary-counts">{fmt.summaryText}</div>
                    </div>
                  </div>
                );
              })()}

              {/* Issue 列表 */}
              {flowReport.issues.length === 0 ? (
                <div className="flow-no-issues">✅ No issues found — your data flow looks clean!</div>
              ) : (
                <div className="flow-issues">
                  {[VALIDATION_LEVEL.ERROR, VALIDATION_LEVEL.WARNING, VALIDATION_LEVEL.INFO].map(level => {
                    const levelIssues = flowReport.issues.filter(i => i.level === level);
                    if (levelIssues.length === 0) return null;
                    const icons = { error: '❌', warning: '⚠️', info: '💡' };
                    return (
                      <div key={level} className="flow-issue-group">
                        <div className={`flow-issue-group-title flow-issue-group-title--${level}`}>
                          {icons[level]} {level.charAt(0).toUpperCase() + level.slice(1)}s ({levelIssues.length})
                        </div>
                        {levelIssues.map((issue, i) => (
                          <div key={i} className={`flow-issue flow-issue--${issue.level}`}>
                            <div className="flow-issue-code">{issue.code}</div>
                            <div className="flow-issue-msg">{issue.message}</div>
                            {issue.fix && (
                              <div className="flow-issue-fix">💡 Fix: {issue.fix}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </>)}
  </div>
);
}

/* ═══════════════════════════════════════════════════════════════
    REST API wrappers (no SDK needed)
    ═══════════════════════════════════════════════════════════════ */

async function generateSkeletonREST(apiKey, prompt, log) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  log('📡 Calling Gemini API…');

  const systemInstruction = `You are a professional website architect and UI designer.
The user describes the website they want, and you need to break it down into multiple "slides" (page sections), each representing a distinct area of the website (e.g., navbar, Hero section, feature showcase, pricing, footer, etc.).

Each slide contains several "Visual Block" elements with position and size information (relative to a 1000×600 canvas).

Available block types:
- heading: Title text (content: {text, level: "h1"|"h2"|"h3", align: "left"|"center"|"right"})
- text: Paragraph text (content: {text, align: "left"|"center"|"right"})
- image: Image placeholder (content: {src: "", alt, fit: "cover"|"contain"})
- button: Button (content: {text, variant: "primary"|"secondary"|"ghost"|"danger", href: "#"})
- card: Card (content: {title, body, hasImage: true|false})
- list: List (content: {items: ["...","..."], style: "bullet"|"number"})
- hero: Hero section (content: {title, sub, cta})
- nav: Navbar (content: {logo, links: ["Home","Features"], cta})
- badge: Badge/tag (content: {text, color: "#6366f1"})
- divider: Divider (content: {style: "line"})

Important rules:
1. Reasonably distribute positions: x,y,w,h are pixel values, canvas size 1000×600, avoid severe overlap
2. Each slide has 3-8 blocks, carefully laid out, representing real website areas
3. Generate 3-6 slides covering the complete website structure
4. bgColor uses dark colors (e.g., #0f172a, #1e293b) or choose according to style
5. Text content should be meaningful and match user needs

Return format (pure JSON, no markdown):
[
  {
    "name": "Navbar + Hero",
    "bgColor": "#0f172a",
    "blocks": [
      {"type": "nav",     "x": 0,    "y": 0,   "w": 1000, "h": 60,  "zIndex": 1, "content": {"logo": "Brand", "links": ["Home","Features","Pricing"], "cta": "Get Started"}},
      {"type": "hero",    "x": 100,  "y": 100, "w": 800,  "h": 200, "zIndex": 1, "content": {"title": "Big Title", "sub": "Subtitle", "cta": "Try Now"}}
    ]
  }
]`;

  const payload = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: 'user', parts: [{ text: `User requirement: ${prompt}` }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) { const d = await resp.json().catch(() => ({})); throw new Error(d.error?.message || `API ${resp.status}`); }
  const data = await resp.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  log('📐 解析 Visual Block 结构...');

  let s = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  let slides;
  try { slides = JSON.parse(s); } catch {
    const m = s.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    if (m) slides = JSON.parse(m[1]); else throw new Error('AI returned invalid JSON');
  }
  if (!Array.isArray(slides) || slides.length === 0) throw new Error('Invalid slides array');

  return slides.map((s, i) => ({
    id:      s.id || `slide-${Date.now()}-${i}`,
    name:    s.name || `幻灯片 ${i + 1}`,
    status:  'skeleton',
    bgColor: s.bgColor || '#f8fafc',
    html:    '',
    blocks:  (s.blocks || []).map((b, j) => ({
      id:      b.id || `b${j}-${Date.now().toString(36)}`,
      type:    b.type || 'text',
      x:       Math.round((b.x   ?? 50 + j * 20) / 8) * 8,
      y:       Math.round((b.y   ?? 50 + j * 20) / 8) * 8,
      w:       Math.round((b.w   ?? 200) / 8) * 8,
      h:       Math.round((b.h   ?? 60) / 8) * 8,
      zIndex:  b.zIndex || j + 1,
      content: b.content || {},
    })),
  }));
}

async function compileSlideREST(apiKey, slide, sitePrompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const blockSummary = (slide.blocks || []).map(b =>
    `[${b.type}] "${JSON.stringify(b.content).slice(0, 60)}" at (${b.x},${b.y}) ${b.w}×${b.h}`
  ).join('\n');

  const payload = {
    systemInstruction: { parts: [{ text: `You are a professional front-end developer.
Compile the visual blocks of a slide into a real, runnable HTML page.
Requirements:
1. Output complete HTML (with <html><head><body> tags)
2. Use inline <style> for all CSS, no external resources
3. Strictly restore block positions and sizes (canvas 1000×600, convert to percentage layout)
4. Light theme, clean and professional, suitable for academic screenshots
5. Font: system-ui, sans-serif
6. Buttons and cards should have hover effects
7. Clean code, directly runnable in browser
8. No comments, no markdown, output HTML only` }] },
    contents: [{ role: 'user', parts: [{ text: `Site context: ${sitePrompt}\n\nSlide name: ${slide.name}\nBackground: ${slide.bgColor}\n\nBlocks:\n${blockSummary}\n\nPlease compile these blocks into a complete HTML page.` }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 8192 },
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) { const d = await resp.json().catch(() => ({})); throw new Error(d.error?.message || `API ${resp.status}`); }
  const data = await resp.json();
  let html = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  html = html.replace(/^```(?:html)?\s*/i, '').replace(/\s*```\s*$/, '');
  if (!html.includes('<html')) {
    html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;background:#f8fafc;color:#1e293b;font-family:system-ui,sans-serif}</style></head><body>${html}</body></html>`;
  }
  return html;
}

async function generateFinalCodeREST(apiKey, slides, sitePrompt) {
  const compiledSlides = slides.filter(s => s.status === 'compiled' && s.html);
  if (compiledSlides.length === 0) {
    return generateFromBlocksREST(apiKey, slides, sitePrompt);
  }
  const sections = compiledSlides.map(s => {
    const m = s.html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    return { name: s.name, body: m ? m[1] : s.html };
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const payload = {
    systemInstruction: { parts: [{ text: `Merge multiple HTML fragments into one complete, professional single-page website.
Requirements: 1) Output complete HTML document 2) Integrate all styles, resolve conflicts 3) Natural transitions between sections 4) Smooth scrolling 5) Responsive design 6) Unified light theme, clean and professional 7) High code quality, deployable 8) Output HTML only, no markdown, no comments` }] },
    contents: [{ role: 'user', parts: [{ text: `Site: ${sitePrompt}\n\nMerge these ${sections.length} sections into one HTML:\n${sections.map((s, i) => `--- Section ${i+1}: ${s.name} ---\n${s.body.slice(0, 800)}...`).join('\n')}\n\nOutput the complete merged HTML.` }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 16384 },
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) { const d = await resp.json().catch(() => ({})); throw new Error(d.error?.message || `API ${resp.status}`); }
  const data = await resp.json();
  let html = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  html = html.replace(/^```(?:html)?\s*/i, '').replace(/\s*```\s*$/, '');
  return html;
}

async function generateFromBlocksREST(apiKey, slides, sitePrompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const summary = slides.map((s, i) =>
    `Section ${i+1} "${s.name}": ${(s.blocks || []).map(b => `[${b.type}]${JSON.stringify(b.content).slice(0,40)}`).join(', ')}`
  ).join('\n');

  const payload = {
    contents: [{ role: 'user', parts: [{ text: `Requirement: ${sitePrompt}\n\nSite structure (${slides.length} sections):\n${summary}\n\nPlease generate a complete single-page website HTML (with <html><head><body>), inline all CSS, light theme, clean and professional visual design. Output HTML only.` }] }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 16384 },
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) { const d = await resp.json().catch(() => ({})); throw new Error(d.error?.message || `API ${resp.status}`); }
  const data = await resp.json();
  let html = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  html = html.replace(/^```(?:html)?\s*/i, '').replace(/\s*```\s*$/, '');
  return html;
}

/* ═══════════════════════════════════════════════════════════════
    Fallback / Demo functions (no API key needed)
    ═══════════════════════════════════════════════════════════════ */

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function getPromptFromMessages(messages) {
  return messages.filter(m => m.role === 'user').map(m => m.text).join('\n') || 'a modern website';
}

let _bid = 0;
function bid() { return `b${++_bid}-${Date.now().toString(36)}`; }

function buildFallbackSlides(prompt) {
  return [
    {
      id: 'slide-1', name: '导航 + Hero', status: 'skeleton', bgColor: '#f8fafc',
      blocks: [
        { id: bid(), type: 'nav',     x:0,    y:0,    w:1000, h:56,  zIndex:1, content:{ logo:'Bifrost', links:['首页','功能','关于'], cta:'开始使用' } },
        { id: bid(), type: 'hero',    x:80,   y:100,  w:800,  h:180, zIndex:1, content:{ title:'用自然语言，构建你的网站', sub:'告别空白画布，AI 瞬间生成可视化骨架', cta:'免费体验' } },
        { id: bid(), type: 'button',  x:340,  y:300,  w:160,  h:48,  zIndex:1, content:{ text:'立即体验', variant:'primary', href:'#' } },
        { id: bid(), type: 'badge',   x:400,  y:70,   w:160,  h:32,  zIndex:2, content:{ text:'✨ 全新发布', color:'#6366f1' } },
      ],
    },
    {
      id: 'slide-2', name: '功能特性', status: 'skeleton', bgColor: '#ffffff',
      blocks: [
        { id: bid(), type: 'heading', x:200, y:40,  w:600, h:60,  zIndex:1, content:{ text:'三大核心优势', level:'h2', align:'center' } },
        { id: bid(), type: 'card',    x:40,  y:120, w:280, h:200, zIndex:1, content:{ title:'⚡ 瞬间生成', body:'输入意图，0.1秒生成完整骨架', hasImage:false } },
        { id: bid(), type: 'card',    x:360, y:120, w:280, h:200, zIndex:1, content:{ title:'🎨 PPT式编辑', body:'像改幻灯片一样自由修改', hasImage:false } },
        { id: bid(), type: 'card',    x:660, y:120, w:280, h:200, zIndex:1, content:{ title:'🚀 一键上线', body:'从想法到上线，分钟级交付', hasImage:false } },
      ],
    },
    {
      id: 'slide-3', name: '页脚', status: 'skeleton', bgColor: '#f1f5f9',
      blocks: [
        { id: bid(), type: 'divider', x:40,  y:30,  w:920, h:16,  zIndex:1, content:{ style:'line' } },
        { id: bid(), type: 'heading', x:40,  y:70,  w:300, h:40,  zIndex:1, content:{ text:'Bifrost', level:'h3', align:'left' } },
        { id: bid(), type: 'text',     x:40,  y:120, w:400, h:60,  zIndex:1, content:{ text:'以自然语言与可视化草图驱动的下一代建站引擎。', align:'left' } },
        { id: bid(), type: 'list',     x:500, y:70,  w:400, h:120, zIndex:1, content:{ items:['产品','定价','文档','联系我们'], style:'bullet' } },
      ],
    },
  ];
}

function generateDemoHtml(slide) {
  const bg = slide.bgColor || '#f8fafc';
  const blocksHtml = (slide.blocks || []).map(b => {
    const x = (b.x / 1000 * 100).toFixed(1);
    const y = (b.y / 600 * 100).toFixed(1);
    const w = (b.w / 1000 * 100).toFixed(1);
    const h = (b.h / 600 * 100).toFixed(1);
    return `<div style="position:absolute;left:${x}%;top:${y}%;width:${w}%;height:${h}%;display:flex;align-items:center;justify-content:center;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:6px;font-size:13px;color:#475569;">${b.type}</div>`;
  }).join('\n');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;background:${bg};position:relative;width:1000px;height:600px;">${blocksHtml}</body></html>`;
}

function generateDemoFullHtml(slides) {
  const sections = (slides || []).map(s => {
    const bg = s.bgColor || '#ffffff';
    const blocks = (s.blocks || []).map(b => {
      const label = b.type === 'heading' ? `<h2>${b.content?.text || ''}</h2>`
                  : b.type === 'text' ? `<p>${b.content?.text || ''}</p>`
                  : b.type === 'button' ? `<button style="padding:8px 20px;background:#6366f1;color:white;border:none;border-radius:6px;">${b.content?.text || '按钮'}</button>`
                  : `<div style="padding:8px;border:1px solid #e2e8f0;border-radius:6px;">${b.type}</div>`;
      return `<div style="position:absolute;left:${(b.x/1000*100)}%;top:${(b.y/600*100)}%;width:${(b.w/1000*100)}%;height:${(b.h/600*100)}%;overflow:hidden;">${label}</div>`;
    }).join('\n');
    return `<section style="position:relative;width:100%;height:600px;background:${bg};border-bottom:1px solid #e2e8f0;">${blocks}</section>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Bifrost - Visual AI Website</title>
  <style>
    body { margin:0; font-family: system-ui,sans-serif; color:#1e293b; }
    section { position:relative; width:100%; height:100vh; min-height:600px; }
    @media(max-width:768px) { section { height:auto; min-height:400px; padding:20px; } }
  </style>
</head>
<body>
${sections}
</body>
</html>`;
}
