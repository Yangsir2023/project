/**
 * VisualEditor — PPT-like Visual Editor with AI Chat
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';

const BLOCK_TYPES = {
  heading: { label: 'Heading', icon: 'T',  color: '#4f46e5' },
  text:    { label: 'Text',    icon: '¶',  color: '#2563eb' },
  image:   { label: 'Image',   icon: '⊞',  color: '#0891b2' },
  button:  { label: 'Button',  icon: '⏎',  color: '#7c3aed' },
  card:    { label: 'Card',    icon: '▣',  color: '#db2777' },
  list:    { label: 'List',    icon: '≡',  color: '#0d9488' },
  hero:    { label: 'Hero',    icon: '◈',  color: '#d97706' },
  nav:     { label: 'Navbar',  icon: '▬',  color: '#65a30d' },
  divider: { label: 'Divider', icon: '—',  color: '#94a3b8' },
  badge:   { label: 'Badge',   icon: '◉',  color: '#e11d48' },
};

function defaultContent(type) {
  switch (type) {
    case 'heading': return { text: 'Click to enter heading', level: 'h1', align: 'left' };
    case 'text':    return { text: 'Click to enter text content.', align: 'left' };
    case 'image':   return { src: '', alt: 'Image placeholder', fit: 'cover' };
    case 'button':  return { text: 'Click Button', variant: 'primary', href: '#' };
    case 'card':    return { title: 'Card Title', body: 'Card description content', hasImage: false };
    case 'list':    return { items: ['Item one', 'Item two', 'Item three'], style: 'bullet' };
    case 'hero':    return { title: 'Hero Title', sub: 'Subtitle text here', cta: 'Get Started' };
    case 'nav':     return { logo: 'Logo', links: ['Home', 'Features', 'Pricing', 'About'], cta: 'Sign In' };
    case 'divider': return { style: 'line' };
    case 'badge':   return { text: 'Badge', color: '#4f46e5' };
    default:        return { text: '' };
  }
}

const SNAP = 8;
function snap(v) { return Math.round(v / SNAP) * SNAP; }

function BlockRenderer({ block, isEditing, onStartEdit, onContentChange }) {
  const c = block.content;
  const base = {
    width: '100%', height: '100%', display: 'flex', alignItems: 'center',
    justifyContent: block.type === 'nav' ? 'space-between' : 'center',
    overflow: 'hidden', boxSizing: 'border-box', padding: '6px',
  };
  switch (block.type) {
    case 'heading':
      return isEditing ? (
        <input autoFocus className="block-inline-input block-inline-input--heading"
          value={c.text} onChange={e => onContentChange({ ...c, text: e.target.value })}
          onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Enter') onStartEdit(false); }} />
      ) : (
        <div style={base} onDoubleClick={() => onStartEdit(true)}>
          <p className={`block-heading block-heading--${c.level || 'h1'}`} style={{ textAlign: c.align || 'left' }}>{c.text}</p>
        </div>
      );
    case 'text':
      return isEditing ? (
        <textarea autoFocus className="block-inline-textarea" value={c.text}
          onChange={e => onContentChange({ ...c, text: e.target.value })} onClick={e => e.stopPropagation()} />
      ) : (
        <div style={{ ...base, alignItems: 'flex-start', padding: '8px' }} onDoubleClick={() => onStartEdit(true)}>
          <p className="block-text" style={{ textAlign: c.align || 'left' }}>{c.text}</p>
        </div>
      );
    case 'image':
      return (
        <div className="block-image-wrap" style={base}>
          {c.src ? <img src={c.src} alt={c.alt} className="block-image" style={{ objectFit: c.fit }} /> : (
            <div className="block-image-placeholder">
              <span className="block-image-icon">⊞</span>
              <span className="block-image-hint">Double-click to set image URL</span>
            </div>
          )}
        </div>
      );
    case 'button':
      return <div style={base}><button className={`block-button block-button--${c.variant || 'primary'}`}>{c.text}</button></div>;
    case 'card':
      return (
        <div className="block-card">
          {c.hasImage && <div className="block-card-img-placeholder" />}
          <div className="block-card-body">
            {isEditing ? (
              <input autoFocus className="block-inline-input" value={c.title}
                onChange={e => onContentChange({ ...c, title: e.target.value })} onClick={e => e.stopPropagation()} />
            ) : (
              <div className="block-card-title" onDoubleClick={() => onStartEdit(true)}>{c.title}</div>
            )}
            <div className="block-card-body-text">{c.body}</div>
          </div>
        </div>
      );
    case 'list':
      return (
        <div className="block-list-wrap" style={{ ...base, alignItems: 'flex-start', padding: '8px' }}>
          <ul className={`block-list block-list--${c.style || 'bullet'}`}>
            {(c.items || []).map((item, i) => <li key={i} className="block-list-item">{item}</li>)}
          </ul>
        </div>
      );
    case 'hero':
      return (
        <div className="block-hero">
          <div className="block-hero-title">{c.title}</div>
          <div className="block-hero-sub">{c.sub}</div>
          <button className="block-button block-button--primary block-hero-cta">{c.cta}</button>
        </div>
      );
    case 'nav':
      return (
        <div className="block-nav">
          <div className="block-nav-logo">{c.logo}</div>
          <div className="block-nav-links">{(c.links || []).map((l, i) => <span key={i} className="block-nav-link">{l}</span>)}</div>
          <button className="block-button block-button--ghost block-button--sm">{c.cta}</button>
        </div>
      );
    case 'badge':
      return (
        <div style={base}>
          <span className="block-badge" style={{ background: `${c.color}15`, border: `1px solid ${c.color}44`, color: c.color }}>{c.text}</span>
        </div>
      );
    case 'divider':
      return <div style={{ ...base, padding: '0 8px' }}><div className={`block-divider block-divider--${c.style}`} /></div>;
    default:
      return <div style={{ ...base, color: '#94a3b8', fontSize: '12px' }}>{block.type}</div>;
  }
}

const HANDLES = ['n','ne','e','se','s','sw','w','nw'];
function ResizeHandles({ onMouseDown }) {
  return (
    <div className="block-resize-handles">
      {HANDLES.map(dir => (
        <div key={dir} className={`block-resize-handle block-resize-handle--${dir}`}
          onMouseDown={e => { e.stopPropagation(); onMouseDown(e, dir); }} />
      ))}
    </div>
  );
}

function CanvasBlock({ block, isSelected, onSelect, onChange, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(null);
  const dragStart = useRef(null);

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    onSelect(block.id);
    setDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: block.x, oy: block.y };
    const onMove = (me) => {
      const dx = me.clientX - dragStart.current.mx;
      const dy = me.clientY - dragStart.current.my;
      onChange(block.id, { x: snap(Math.max(0, dragStart.current.ox + dx)), y: snap(Math.max(0, dragStart.current.oy + dy)) });
    };
    const onUp = () => { setDragging(false); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
  }, [block, onSelect, onChange]);

  const handleResize = useCallback((e, dir) => {
    e.preventDefault(); e.stopPropagation(); setResizing(dir);
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: block.x, oy: block.y, ow: block.w, oh: block.h };
    const onMove = (me) => {
      const dx = me.clientX - dragStart.current.mx, dy = me.clientY - dragStart.current.my;
      let { ox, oy, ow, oh } = dragStart.current;
      let nx = ox, ny = oy, nw = ow, nh = oh;
      if (dir.includes('e')) nw = snap(Math.max(40, ow + dx));
      if (dir.includes('s')) nh = snap(Math.max(20, oh + dy));
      if (dir.includes('w')) { nw = snap(Math.max(40, ow - dx)); nx = snap(ox + ow - nw); }
      if (dir.includes('n')) { nh = snap(Math.max(20, oh - dy)); ny = snap(oy + oh - nh); }
      onChange(block.id, { x: nx, y: ny, w: nw, h: nh });
    };
    const onUp = () => { setResizing(null); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
  }, [block, onChange]);

  const tc = BLOCK_TYPES[block.type];
  return (
    <div
      className={`canvas-block ${isSelected ? 'is-selected' : ''} ${editing ? 'is-editing' : ''}`}
      style={{ position: 'absolute', left: block.x, top: block.y, width: block.w, height: block.h,
        zIndex: isSelected ? 10 : (block.zIndex || 1), cursor: dragging ? 'grabbing' : (resizing ? 'n-resize' : 'grab'), userSelect: 'none' }}
      onMouseDown={handleMouseDown}
      onDoubleClick={() => { if (!editing) setEditing(true); }}
      onClick={e => { e.stopPropagation(); onSelect(block.id); }}
    >
      {!editing && (
        <div className="canvas-block-typetag" style={{ background: `${tc?.color}12`, borderColor: `${tc?.color}44`, color: tc?.color }}>
          {tc?.icon} {tc?.label}
        </div>
      )}
      <div className="canvas-block-inner">
        <BlockRenderer block={block} isEditing={editing} onStartEdit={setEditing}
          onContentChange={content => onChange(block.id, { content })} />
      </div>
      {isSelected && !editing && (
        <>
          <ResizeHandles onMouseDown={handleResize} />
          <button className="canvas-block-delete" onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onDelete(block.id); }}>×</button>
        </>
      )}
      {editing && (
        <button className="canvas-block-done-edit" onClick={e => { e.stopPropagation(); setEditing(false); }}>Done ✓</button>
      )}
    </div>
  );
}

function SlideThumbnail({ slide, index, isActive, onClick }) {
  const statusColor = { idle: '#94a3b8', skeleton: '#a78bfa', compiling: '#38bdf8', compiled: '#22c55e', error: '#ef4444' }[slide.status] || '#94a3b8';
  return (
    <div className={`slide-thumb ${isActive ? 'is-active' : ''}`} onClick={onClick}>
      <div className="slide-thumb-preview" style={{ background: slide.bgColor || '#f8fafc' }}>
        {(slide.blocks || []).slice(0, 6).map((b, i) => {
          const tc = BLOCK_TYPES[b.type];
          return <div key={b.id || i} className="slide-thumb-block" style={{
            left: `${(b.x/1000)*100}%`, top: `${(b.y/600)*100}%`, width: `${(b.w/1000)*100}%`, height: `${(b.h/600)*100}%`,
            background: tc ? `${tc.color}18` : '#00000008', borderColor: tc ? `${tc.color}44` : '#00000018',
          }} />;
        })}
        <div className="slide-thumb-status" style={{ background: statusColor }} />
      </div>
      <div className="slide-thumb-meta">
        <span className="slide-thumb-num">{index + 1}</span>
        <span className="slide-thumb-name">{slide.name || `Slide ${index + 1}`}</span>
      </div>
    </div>
  );
}

function InspectorPanel({ slide, selectedBlock, onBlockChange, onSlideChange, onCompile, onAddBlock }) {
  if (!slide) return <div className="inspector inspector--empty"><span>Select a slide</span></div>;
  const block = selectedBlock;
  return (
    <div className="inspector">
      <div className="inspector-section">
        <div className="inspector-section-label">Slide</div>
        <input className="inspector-input" value={slide.name || ''} placeholder="Slide name" onChange={e => onSlideChange({ name: e.target.value })} />
      </div>
      <div className="inspector-section">
        <div className="inspector-section-label">Background Color</div>
        <div className="inspector-color-row">
          {['#ffffff','#f8fafc','#f1f5f9','#e2e8f0','#0f172a','#1e293b','#1a1a2e','#111827'].map(c => (
            <button key={c} className={`inspector-color-swatch ${slide.bgColor === c ? 'is-active' : ''}`}
              style={{ background: c, borderColor: slide.bgColor === c ? '#4f46e5' : 'transparent' }}
              onClick={() => onSlideChange({ bgColor: c })} />
          ))}
          <input type="color" className="inspector-color-custom" value={slide.bgColor || '#f8fafc'}
            onChange={e => onSlideChange({ bgColor: e.target.value })} title="Custom colour" />
        </div>
      </div>
      <div className="inspector-section">
        <div className="inspector-section-label">Add Element</div>
        <div className="inspector-block-grid">
          {Object.entries(BLOCK_TYPES).map(([type, cfg]) => (
            <button key={type} className="inspector-add-block" onClick={() => onAddBlock(type)} title={cfg.label}>
              <span className="inspector-add-block-icon" style={{ color: cfg.color }}>{cfg.icon}</span>
              <span className="inspector-add-block-label">{cfg.label}</span>
            </button>
          ))}
        </div>
      </div>
      {block && (
        <div className="inspector-section inspector-section--block">
          <div className="inspector-section-label">
            Element Properties
            <span className="inspector-block-type" style={{ color: BLOCK_TYPES[block.type]?.color }}>
              {' '}{BLOCK_TYPES[block.type]?.icon} {BLOCK_TYPES[block.type]?.label}
            </span>
          </div>
          <div className="inspector-xywh">
            {[{key:'x',label:'X',min:0},{key:'y',label:'Y',min:0},{key:'w',label:'W',min:40},{key:'h',label:'H',min:20}].map(({key,label,min}) => (
              <div key={key} className="inspector-xywh-item">
                <span className="inspector-xywh-label">{label}</span>
                <input type="number" className="inspector-xywh-input" value={Math.round(block[key])} min={min}
                  onChange={e => onBlockChange(block.id, { [key]: parseInt(e.target.value) || min })} />
              </div>
            ))}
          </div>
          {['heading','text','button','badge'].includes(block.type) && (
            <div className="inspector-field">
              <label className="inspector-field-label">Text Content</label>
              <textarea className="inspector-textarea" value={block.content?.text || ''} rows={2}
                onChange={e => onBlockChange(block.id, { content: { ...block.content, text: e.target.value } })} />
            </div>
          )}
          {block.type === 'heading' && (
            <div className="inspector-field">
              <label className="inspector-field-label">Heading Level</label>
              <div className="inspector-radio-row">
                {['h1','h2','h3'].map(l => (
                  <button key={l} className={`inspector-radio-btn ${block.content?.level === l ? 'is-active' : ''}`}
                    onClick={() => onBlockChange(block.id, { content: { ...block.content, level: l } })}>{l}</button>
                ))}
              </div>
            </div>
          )}
          {block.type === 'button' && (
            <div className="inspector-field">
              <label className="inspector-field-label">Button Style</label>
              <div className="inspector-radio-row">
                {['primary','secondary','ghost','danger'].map(v => (
                  <button key={v} className={`inspector-radio-btn ${block.content?.variant === v ? 'is-active' : ''}`}
                    onClick={() => onBlockChange(block.id, { content: { ...block.content, variant: v } })}>{v}</button>
                ))}
              </div>
            </div>
          )}
          {block.type === 'image' && (
            <div className="inspector-field">
              <label className="inspector-field-label">Image URL</label>
              <input className="inspector-input" value={block.content?.src || ''} placeholder="https://..."
                onChange={e => onBlockChange(block.id, { content: { ...block.content, src: e.target.value } })} />
            </div>
          )}
        </div>
      )}
      <div className="inspector-section inspector-section--compile">
        <div className="inspector-section-label">Compile</div>
        <p className="inspector-compile-hint">
          {slide.status === 'compiled' ? '✅ This slide has been compiled to real HTML' : 'When done editing, compile this slide to runnable code'}
        </p>
        <button className={`inspector-compile-btn ${slide.status === 'compiling' ? 'is-loading' : ''} ${slide.status === 'compiled' ? 'is-compiled' : ''}`}
          onClick={onCompile} disabled={slide.status === 'compiling'}>
          {slide.status === 'compiling' ? '⚙ Compiling…' : slide.status === 'compiled' ? '✓ Re-compile' : '▶ Compile this slide'}
        </button>
      </div>
    </div>
  );
}

function AiChatPanel({ slide, slideIndex, apiKey, onBlockPatch }) {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    text: "Hi! I can edit this slide for you.\n\nTry: \"Change the heading to 'Welcome'\", \"Add a dark background\", \"Add a Get Started button\", or \"Remove the image\".",
  }]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [editCount, setEditCount] = useState(0);
  const endRef = useRef(null);

  useEffect(() => {
    setMessages([{ role: 'assistant', text: `Now editing slide: **${slide?.name || 'Untitled'}**\n\nDescribe any change and I'll update the canvas instantly.` }]);
    setEditCount(0);
  }, [slideIndex]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

  const buildContext = () => {
    if (!slide) return 'No slide.';
    const blocks = (slide.blocks || []).map((b, i) => `  [${i}] ${b.type}: ${JSON.stringify(b.content).slice(0,100)}`).join('\n');
    return `Slide: "${slide.name}" | bgColor: ${slide.bgColor || '#ffffff'}\nBlocks (${slide.blocks?.length || 0}):\n${blocks || '  (empty)'}`;
  };

  const send = async () => {
    const text = input.trim();
    if (!text || isTyping) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setIsTyping(true);
    try {
      const key = apiKey || import.meta.env?.VITE_GEMINI_API_KEY || '';
      if (!key) throw new Error('No API key. Set your Gemini API key in settings (⚙).');

      const sysPrompt = `You are Bifrost Edit AI — a precise visual editor assistant.

CURRENT SLIDE STATE:
${buildContext()}

TASK: Parse the user's instruction and output:
1. A <reply> with a brief confirmation of what you changed
2. A <patches> JSON array describing the exact changes

PATCH OPERATIONS:
- Update block:  {"op":"updateIndex","blockIndex":N,"patch":{"content":{"text":"new"}}}
- Move block:    {"op":"updateIndex","blockIndex":N,"patch":{"x":200,"y":100}}
- Resize block:  {"op":"updateIndex","blockIndex":N,"patch":{"w":400,"h":80}}
- Add block:     {"op":"add","type":"button","x":300,"y":400,"w":140,"h":42,"content":{"text":"Click","variant":"primary"}}
- Remove block:  {"op":"remove","blockIndex":N}
- Background:    {"op":"setBg","bgColor":"#0f172a"}

BLOCK TYPE CONTENT SCHEMAS:
- heading: {text, level:"h1"|"h2"|"h3", align:"left"|"center"|"right"}
- text: {text, align:"left"|"center"|"right"}
- button: {text, variant:"primary"|"secondary"|"ghost"|"danger", href:"#"}
- card: {title, body, hasImage:bool}
- list: {items:["..."], style:"bullet"|"number"}
- hero: {title, sub, cta}
- nav: {logo, links:["Home","Features"], cta}
- badge: {text, color:"#hexcolor"}
- image: {src:"", alt:"", fit:"cover"|"contain"}
- divider: {style:"line"}

CANVAS SIZE: 1000×562px

RULES:
- Always output BOTH <reply> and <patches>
- If no block change needed, use <patches>[]</patches>
- Be precise with block indices (0-based)
- Keep positions within canvas bounds

FORMAT:
<reply>Brief explanation of what changed</reply>
<patches>[...array of patch objects...]</patches>`;

      const history = messages.slice(-6).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.text }] }));
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: sysPrompt }] },
          contents: [...history, { role: 'user', parts: [{ text }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
        }),
      });
      if (!resp.ok) throw new Error(`API ${resp.status}`);
      const data = await resp.json();
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      const replyMatch = raw.match(/<reply>([\s\S]*?)<\/reply>/i);
      const patchMatch = raw.match(/<patches>([\s\S]*?)<\/patches>/i);
      const replyText = replyMatch ? replyMatch[1].trim() : raw.replace(/<patches>[\s\S]*?<\/patches>/gi, '').trim() || 'Done!';

      let applied = false;
      if (patchMatch) {
        try {
          const patches = JSON.parse(patchMatch[1].trim());
          if (Array.isArray(patches) && patches.length > 0) {
            onBlockPatch(patches);
            applied = true;
            setEditCount(n => n + patches.length);
          }
        } catch { /* ignore parse errors */ }
      }
      setMessages(prev => [...prev, { role: 'assistant', text: replyText, applied }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: `⚠ ${err.message}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  const quickPrompts = ['Change the heading text', 'Add a CTA button', 'Dark background (#0f172a)', 'Add 3 cards in a row'];

  return (
    <div className="ve-ai-chat">
      <div className="ve-ai-chat-header">
        <span className="ve-ai-chat-icon">✦</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ve-ai-chat-title">AI Edit Assistant</div>
          <div className="ve-ai-chat-subtitle">{slide?.name || 'No slide selected'}</div>
        </div>
        {editCount > 0 && <span className="ve-ai-chat-badge">{editCount} change{editCount !== 1 ? 's' : ''}</span>}
      </div>

      <div className="ve-ai-chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`ve-ai-msg ve-ai-msg--${m.role}`}>
            <div className="ve-ai-msg-role">{m.role === 'user' ? 'You' : 'Bifrost'}</div>
            <div className="ve-ai-msg-text">{m.text}</div>
            {m.applied && <div className="ve-ai-msg-applied">✦ Canvas updated</div>}
          </div>
        ))}
        {isTyping && (
          <div className="ve-ai-msg ve-ai-msg--assistant">
            <div className="ve-ai-msg-role">Bifrost</div>
            <div className="ve-ai-msg-text">
              <span className="chat-typing-dot">.</span><span className="chat-typing-dot">.</span><span className="chat-typing-dot">.</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="ve-ai-quick">
        {quickPrompts.map((p, i) => <button key={i} className="ve-ai-quick-chip" onClick={() => setInput(p)}>{p}</button>)}
      </div>

      <div className="ve-ai-input-bar">
        <textarea className="ve-ai-input" value={input} rows={2} disabled={isTyping}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="e.g. Change heading to 'Welcome', add dark background…" />
        <button className="ve-ai-send-btn" onClick={send} disabled={!input.trim() || isTyping}>
          {isTyping ? '…' : '→'}
        </button>
      </div>
    </div>
  );
}

export default function VisualEditor({
  slides, activeIdx, onActiveChange, onSlidesChange,
  onCompileSlide, onDeploy, isDeploying,
  allCompiled, compiledCount, apiKey,
}) {
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [showCompiledPreview, setShowCompiledPreview] = useState(false);
  const [rightTab, setRightTab] = useState('inspector');
  const canvasRef = useRef(null);

  const slide = slides[activeIdx] || null;
  const selectedBlock = slide?.blocks?.find(b => b.id === selectedBlockId) || null;

  const handleAiBlockPatch = useCallback((patches) => {
    onSlidesChange(prev => prev.map((s, i) => {
      if (i !== activeIdx) return s;
      let blocks = [...(s.blocks || [])];
      let bgColor = s.bgColor;
      for (const p of patches) {
        if (p.op === 'updateIndex' && p.blockIndex !== undefined && blocks[p.blockIndex]) {
          const b = blocks[p.blockIndex];
          const updated = { ...b, ...p.patch };
          if (p.patch?.content) updated.content = { ...b.content, ...p.patch.content };
          blocks[p.blockIndex] = updated;
        } else if (p.op === 'add') {
          blocks.push({
            id: `block-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
            type: p.type || 'text', x: p.x ?? 100, y: p.y ?? 100, w: p.w ?? 200, h: p.h ?? 60,
            zIndex: blocks.length + 1, content: p.content || {},
          });
        } else if (p.op === 'remove' && p.blockIndex !== undefined) {
          blocks.splice(p.blockIndex, 1);
        } else if (p.op === 'setBg') {
          bgColor = p.bgColor;
        }
      }
      return { ...s, blocks, bgColor };
    }));
  }, [activeIdx, onSlidesChange]);

  const handleCanvasClick = useCallback((e) => {
    if (e.target === e.currentTarget || e.target === canvasRef.current) setSelectedBlockId(null);
  }, []);

  useEffect(() => { setSelectedBlockId(null); setShowCompiledPreview(false); }, [activeIdx]);

  const handleBlockChange = useCallback((blockId, patch) => {
    onSlidesChange(prev => prev.map((s, i) => i !== activeIdx ? s : {
      ...s, blocks: s.blocks.map(b => b.id === blockId ? { ...b, ...patch } : b),
    }));
  }, [activeIdx, onSlidesChange]);

  const handleBlockDelete = useCallback((blockId) => {
    setSelectedBlockId(null);
    onSlidesChange(prev => prev.map((s, i) => i !== activeIdx ? s : {
      ...s, blocks: s.blocks.filter(b => b.id !== blockId),
    }));
  }, [activeIdx, onSlidesChange]);

  const handleSlideChange = useCallback((patch) => {
    onSlidesChange(prev => prev.map((s, i) => i === activeIdx ? { ...s, ...patch } : s));
  }, [activeIdx, onSlidesChange]);

  const handleAddBlock = useCallback((type) => {
    const sizes = { nav:{ w:900,h:50 }, hero:{ w:700,h:160 }, divider:{ w:600,h:20 }, button:{ w:140,h:42 },
      badge:{ w:120,h:32 }, image:{ w:240,h:180 }, list:{ w:280,h:120 }, card:{ w:280,h:160 } };
    const { w = 200, h = 60 } = sizes[type] || {};
    const newBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, type,
      x: snap(100 + Math.random() * 400), y: snap(100 + Math.random() * 200), w, h,
      zIndex: (slide?.blocks?.length || 0) + 1, content: defaultContent(type),
    };
    onSlidesChange(prev => prev.map((s, i) => i !== activeIdx ? s : { ...s, blocks: [...(s.blocks || []), newBlock] }));
    setSelectedBlockId(newBlock.id);
  }, [slide, activeIdx, onSlidesChange]);

  const handleAddSlide = useCallback(() => {
    const newSlide = { id: `slide-${Date.now()}`, name: `Slide ${slides.length + 1}`, status: 'idle', bgColor: '#ffffff', blocks: [], html: '' };
    onSlidesChange(prev => [...prev, newSlide]);
    onActiveChange(slides.length);
  }, [slides.length, onSlidesChange, onActiveChange]);

  const handleDuplicateSlide = useCallback((idx) => {
    const src = slides[idx];
    const dup = { ...src, id: `slide-${Date.now()}`, name: `${src.name} (copy)`, status: 'idle', html: '',
      blocks: (src.blocks || []).map(b => ({ ...b, id: `block-${Date.now()}-${Math.random().toString(36).slice(2,7)}` })) };
    const next = [...slides.slice(0, idx+1), dup, ...slides.slice(idx+1)];
    onSlidesChange(next); onActiveChange(idx + 1);
  }, [slides, onSlidesChange, onActiveChange]);

  const handleDeleteSlide = useCallback((idx) => {
    if (slides.length <= 1) return;
    const next = slides.filter((_, i) => i !== idx);
    onSlidesChange(next); onActiveChange(Math.min(idx, next.length - 1));
  }, [slides, onSlidesChange, onActiveChange]);

  return (
    <div className="ve-root">
      <aside className="ve-rail">
        <div className="ve-rail-inner">
          {slides.map((s, i) => (
            <div key={s.id} className="ve-rail-slot">
              <SlideThumbnail slide={s} index={i} isActive={i === activeIdx}
                onClick={() => { onActiveChange(i); setSelectedBlockId(null); }} />
              <div className="ve-rail-actions">
                <button className="ve-rail-action-btn" title="Duplicate" onClick={() => handleDuplicateSlide(i)}>⎘</button>
                <button className="ve-rail-action-btn ve-rail-action-btn--del" title="Delete"
                  onClick={() => handleDeleteSlide(i)} disabled={slides.length <= 1}>×</button>
              </div>
            </div>
          ))}
          <button className="ve-add-slide-btn" onClick={handleAddSlide}>
            <span>+</span><span className="ve-add-slide-label">New Slide</span>
          </button>
        </div>
      </aside>

      <main className="ve-canvas-wrap">
        <div className="ve-canvas-toolbar">
          <div className="ve-canvas-toolbar-left">
            <span className="ve-canvas-slide-name">{slide?.name || `Slide ${activeIdx + 1}`}</span>
            <div className={`ve-canvas-status ve-canvas-status--${slide?.status || 'idle'}`}>
              {{ idle:'○ Draft', skeleton:'◈ Skeleton', compiling:'⚙ Compiling', compiled:'✓ Compiled', error:'✗ Error' }[slide?.status] || '○ Draft'}
            </div>
          </div>
          <div className="ve-canvas-toolbar-center">
            <span className="ve-canvas-hint">Double-click to edit · Drag to move · Corner to resize</span>
          </div>
          <div className="ve-canvas-toolbar-right">
            {slide?.status === 'compiled' && (
              <button className={`ve-toolbar-btn ${showCompiledPreview ? 'is-active' : ''}`}
                onClick={() => setShowCompiledPreview(v => !v)}>
                {showCompiledPreview ? '✎ Back to Edit' : '👁 Preview HTML'}
              </button>
            )}
          </div>
        </div>

        <div className="ve-stage-wrap">
          <div className="ve-stage" style={{ background: slide?.bgColor || '#ffffff' }}
            onClick={handleCanvasClick} ref={canvasRef}>
            {showCompiledPreview && slide?.html ? (
              <iframe className="ve-compiled-frame" srcDoc={slide.html} title={`Slide ${activeIdx+1}`} sandbox="allow-scripts" />
            ) : (
              <>
                {(slide?.blocks || []).map(block => (
                  <CanvasBlock key={block.id} block={block} isSelected={selectedBlockId === block.id}
                    onSelect={setSelectedBlockId} onChange={handleBlockChange} onDelete={handleBlockDelete} />
                ))}
                {(!slide?.blocks?.length) && (
                  <div className="ve-stage-empty">
                    <div className="ve-stage-empty-icon">◈</div>
                    <div className="ve-stage-empty-title">Canvas is empty</div>
                    <div className="ve-stage-empty-sub">Add elements from Properties, or ask AI Chat to generate them</div>
                  </div>
                )}
                {slide?.status === 'compiling' && (
                  <div className="ve-compiling-overlay">
                    <div className="ve-compiling-spinner" />
                    <div className="ve-compiling-text">Compiling slide to HTML…</div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="ve-deploy-bar">
          <div className="ve-deploy-progress">
            <div className="ve-deploy-progress-fill"
              style={{ width: slides.length > 0 ? `${(compiledCount/slides.length)*100}%` : '0%' }} />
          </div>
          <span className="ve-deploy-count">{compiledCount}/{slides.length} compiled</span>
          <button className={`ve-deploy-btn ${allCompiled?'is-ready':''} ${isDeploying?'is-deploying':''}`}
            onClick={onDeploy} disabled={isDeploying}
            title={allCompiled ? 'All compiled — ready to deploy' : 'Compile all slides first'}>
            {isDeploying ? '⚙ Deploying…' : allCompiled ? '🚀 Deploy' : `▶ Compile ${slides.length - compiledCount} more`}
          </button>
        </div>
      </main>

      <div className="ve-right-panel">
        <div className="ve-right-tabs">
          <button className={`ve-right-tab ${rightTab === 'inspector' ? 'is-active' : ''}`} onClick={() => setRightTab('inspector')}>
            ⚙ Properties
          </button>
          <button className={`ve-right-tab ${rightTab === 'ai' ? 'is-active' : ''}`} onClick={() => setRightTab('ai')}>
            ✦ AI Chat
          </button>
        </div>
        {rightTab === 'inspector' ? (
          <InspectorPanel slide={slide} selectedBlock={selectedBlock} onBlockChange={handleBlockChange}
            onSlideChange={handleSlideChange} onCompile={() => onCompileSlide(activeIdx)} onAddBlock={handleAddBlock} />
        ) : (
          <AiChatPanel slide={slide} slideIndex={activeIdx} apiKey={apiKey} onBlockPatch={handleAiBlockPatch} />
        )}
      </div>
    </div>
  );
}
