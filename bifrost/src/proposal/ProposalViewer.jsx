import React, { useState, useCallback, useRef, useEffect } from 'react';

/* ─── System prompt for slide-specific dialog ─────────────── */
function buildSlideDialogPrompt(slideName, slideBlocks, userIntent) {
  const blocksSummary = (slideBlocks || []).map(b =>
    `[${b.type}] ${JSON.stringify(b.content).slice(0, 80)}`
  ).join(', ');

  return `You are Bifrost, a professional website requirement analyst.
The user is building a website described as: "${userIntent}"

You are discussing a specific page section: **"${slideName}"**
Current elements: ${blocksSummary || '(none yet)'}

Your role:
1. Help the user refine requirements for THIS page only.
2. If the user asks to change a block — e.g. "make the button bigger", "add a card", "remove the image" — respond with a JSON patch at the end of your message using this format:
   [BLOCK_PATCH]{"op":"update","blockIndex":0,"patch":{"content":{"text":"New text"}}}[/BLOCK_PATCH]
   or [BLOCK_PATCH]{"op":"add","type":"card","x":100,"y":200,"w":300,"h":160,"content":{"title":"New Card","body":"Description"}}[/BLOCK_PATCH]
   or [BLOCK_PATCH]{"op":"remove","blockIndex":1}[/BLOCK_PATCH]
3. Ask ONE clear follow-up question after making changes.
4. When requirements are fully confirmed, end with: [SLIDE_READY]

Always respond in English.`;
}

const SNAP = 8;
function snap(v) { return Math.round(v / SNAP) * SNAP; }

/* ─── Draggable Block Preview ────────────────────────────── */
function DraggableBlock({ block, index, isSelected, onSelect, onChange }) {
  const dragRef = useRef(null);
  const resizeRef = useRef(null);

  const typeStyle = {
    heading: { bg: '#ede9fe', color: '#7c3aed', icon: 'H' },
    text:    { bg: '#e0f2fe', color: '#0284c7', icon: 'T' },
    hero:    { bg: '#fce7f3', color: '#db2777', icon: '★' },
    nav:     { bg: '#f0fdf4', color: '#16a34a', icon: '≡' },
    button:  { bg: '#fff7ed', color: '#ea580c', icon: '▣' },
    card:    { bg: '#fef3c7', color: '#d97706', icon: '▢' },
    list:    { bg: '#f1f5f9', color: '#475569', icon: '☰' },
    badge:   { bg: '#fef2f2', color: '#dc2626', icon: '◉' },
    image:   { bg: '#ecfeff', color: '#0891b2', icon: '▣' },
    divider: { bg: '#f8fafc', color: '#94a3b8', icon: '—' },
  };
  const s = typeStyle[block.type] || typeStyle.text;

  /* Scale: proposal stage is 900×506 rendering a 1000×600 canvas */
  const scaleX = 900 / 1000;
  const scaleY = 506 / 600;

  const handleDragMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect(index);
    const startMx = e.clientX, startMy = e.clientY;
    const startX = block.x, startY = block.y;

    const onMove = (me) => {
      const dx = (me.clientX - startMx) / scaleX;
      const dy = (me.clientY - startMy) / scaleY;
      onChange(index, {
        x: snap(Math.max(0, startX + dx)),
        y: snap(Math.max(0, startY + dy)),
      });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [block, index, onSelect, onChange, scaleX, scaleY]);

  const handleResizeMouseDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const startMx = e.clientX, startMy = e.clientY;
    const startW = block.w, startH = block.h;

    const onMove = (me) => {
      const dw = (me.clientX - startMx) / scaleX;
      const dh = (me.clientY - startMy) / scaleY;
      onChange(index, {
        w: snap(Math.max(40, startW + dw)),
        h: snap(Math.max(20, startH + dh)),
      });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [block, index, onChange, scaleX, scaleY]);

  const pxX = block.x * scaleX;
  const pxY = block.y * scaleY;
  const pxW = block.w * scaleX;
  const pxH = block.h * scaleY;

  return (
    <div
      style={{
        position: 'absolute',
        left: pxX,
        top: pxY,
        width: pxW,
        height: pxH,
        backgroundColor: s.bg,
        border: `${isSelected ? '2px solid #4f46e5' : `1.5px solid ${s.color}`}`,
        borderRadius: 4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'grab',
        userSelect: 'none',
        boxShadow: isSelected ? '0 0 0 2px rgba(79,70,229,0.25)' : 'none',
        zIndex: isSelected ? 10 : 1,
        boxSizing: 'border-box',
      }}
      onMouseDown={handleDragMouseDown}
      onClick={(e) => { e.stopPropagation(); onSelect(index); }}
    >
      <span style={{ fontSize: 14, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.icon}</span>
      <span style={{ fontSize: 9, fontWeight: 600, color: '#64748b', marginTop: 2 }}>{block.type}</span>

      {/* SE resize handle */}
      {isSelected && (
        <div
          style={{
            position: 'absolute',
            bottom: -4,
            right: -4,
            width: 10,
            height: 10,
            background: '#4f46e5',
            border: '2px solid white',
            borderRadius: 2,
            cursor: 'se-resize',
            zIndex: 20,
          }}
          onMouseDown={handleResizeMouseDown}
        />
      )}
    </div>
  );
}

/* ─── Dialog Message ─────────────────────────────────────── */
function DialogMessage({ msg }) {
  const isUser = msg.role === 'user';
  const cleanText = msg.text
    .replace(/\[BLOCK_PATCH\][\s\S]*?\[\/BLOCK_PATCH\]/g, '')
    .replace(/\[SLIDE_READY\]/g, '')
    .trim();
  return (
    <div className={`pv-dialog-msg ${isUser ? 'pv-dialog-msg--user' : 'pv-dialog-msg--ai'}`}>
      <div className="pv-dialog-msg-role">{isUser ? 'You' : 'Bifrost'}</div>
      <div className="pv-dialog-msg-text">{cleanText}</div>
      {msg.text.includes('[SLIDE_READY]') && (
        <div className="pv-dialog-ready-badge">✓ Requirements confirmed</div>
      )}
      {msg.blockPatched && (
        <div className="pv-dialog-ready-badge" style={{ background: '#dbeafe', color: '#1d4ed8' }}>
          ✦ Blocks updated on canvas
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export default function ProposalViewer({ slides, userIntent, apiKey, onSlidesChange, onProceedToEdit }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [slideDialogs, setSlideDialogs] = useState({});
  const [dialogInputs, setDialogInputs] = useState({});
  const [isTyping, setIsTyping] = useState(false);
  const [selectedBlockIdx, setSelectedBlockIdx] = useState(null);
  const dialogEndRef = useRef(null);

  const activeSlide = slides[activeIdx];
  const activeDialog = slideDialogs[activeIdx] || [
    { role: 'assistant', text: `Let's look at the "${activeSlide?.name || 'this page'}" section. What content do you want here? Any specific ideas?` }
  ];

  useEffect(() => {
    setSelectedBlockIdx(null);
  }, [activeIdx]);

  useEffect(() => {
    if (dialogEndRef.current) {
      dialogEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeDialog]);

  /* Apply a BLOCK_PATCH from AI response */
  const applyBlockPatch = useCallback((idx, patchJson) => {
    try {
      const patch = JSON.parse(patchJson);
      onSlidesChange(prev => prev.map((s, i) => {
        if (i !== idx) return s;
        const blocks = [...(s.blocks || [])];
        if (patch.op === 'update' && patch.blockIndex !== undefined) {
          blocks[patch.blockIndex] = { ...blocks[patch.blockIndex], ...patch.patch };
          if (patch.patch.content) {
            blocks[patch.blockIndex].content = { ...blocks[patch.blockIndex].content, ...patch.patch.content };
          }
        } else if (patch.op === 'add') {
          const newBlock = {
            id: `b-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
            type: patch.type || 'text',
            x: patch.x || 100, y: patch.y || 100,
            w: patch.w || 200, h: patch.h || 60,
            zIndex: blocks.length + 1,
            content: patch.content || {},
          };
          blocks.push(newBlock);
        } else if (patch.op === 'remove' && patch.blockIndex !== undefined) {
          blocks.splice(patch.blockIndex, 1);
        }
        return { ...s, blocks };
      }));
      return true;
    } catch {
      return false;
    }
  }, [onSlidesChange]);

  /* Handle block drag/resize in proposal canvas */
  const handleBlockChange = useCallback((blockIdx, patch) => {
    onSlidesChange(prev => prev.map((s, i) => {
      if (i !== activeIdx) return s;
      return {
        ...s,
        blocks: s.blocks.map((b, j) => j === blockIdx ? { ...b, ...patch } : b),
      };
    }));
  }, [activeIdx, onSlidesChange]);

  /* Send dialog message */
  const handleDialogSend = useCallback(async (idx) => {
    const input = (dialogInputs[idx] || '').trim();
    if (!input || isTyping) return;

    const slide = slides[idx];
    if (!slide) return;

    const userMsg = { role: 'user', text: input };
    const currentDialog = slideDialogs[idx] || [];

    setSlideDialogs(prev => ({ ...prev, [idx]: [...currentDialog, userMsg] }));
    setDialogInputs(prev => ({ ...prev, [idx]: '' }));
    setIsTyping(true);

    try {
      if (apiKey) {
        const systemPrompt = buildSlideDialogPrompt(slide.name, slide.blocks, userIntent);
        const history = currentDialog
          .filter(m => m.role === 'user' || m.role === 'assistant')
          .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.text }] }));

        const payload = {
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [...history, { role: 'user', parts: [{ text: input }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
        };

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!resp.ok) throw new Error(`API ${resp.status}`);

        const data = await resp.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Got it! I've noted your requirements.";

        /* Extract and apply block patches */
        let blockPatched = false;
        const patchMatches = [...reply.matchAll(/\[BLOCK_PATCH\]([\s\S]*?)\[\/BLOCK_PATCH\]/g)];
        for (const match of patchMatches) {
          const applied = applyBlockPatch(idx, match[1].trim());
          if (applied) blockPatched = true;
        }

        setSlideDialogs(prev => ({
          ...prev,
          [idx]: [...(prev[idx] || currentDialog), userMsg, { role: 'assistant', text: reply, blockPatched }],
        }));

        if (reply.includes('[SLIDE_READY]')) {
          onSlidesChange(prev => prev.map((s, i) => i === idx ? { ...s, proposalStatus: 'confirmed' } : s));
        }
      } else {
        await new Promise(r => setTimeout(r, 600));
        setSlideDialogs(prev => ({
          ...prev,
          [idx]: [...(prev[idx] || currentDialog), userMsg, {
            role: 'assistant',
            text: `Got it! Your requirements for "${slide.name}" are clear. Anything else to add? [SLIDE_READY]`
          }],
        }));
        onSlidesChange(prev => prev.map((s, i) => i === idx ? { ...s, proposalStatus: 'confirmed' } : s));
      }
    } catch (err) {
      console.error('Dialog error:', err);
      setSlideDialogs(prev => ({
        ...prev,
        [idx]: [...(prev[idx] || currentDialog), userMsg, { role: 'assistant', text: 'Sorry, something went wrong. Please try again.' }],
      }));
    } finally {
      setIsTyping(false);
    }
  }, [slideDialogs, dialogInputs, isTyping, slides, apiKey, userIntent, onSlidesChange, applyBlockPatch]);

  const toggleSlideConfirm = useCallback((idx) => {
    onSlidesChange(prev =>
      prev.map((s, i) => i === idx ? { ...s, proposalStatus: s.proposalStatus === 'confirmed' ? 'pending' : 'confirmed' } : s)
    );
  }, [onSlidesChange]);

  const confirmedCount = slides.filter(s => s.proposalStatus === 'confirmed').length;
  const allConfirmed = slides.length > 0 && confirmedCount === slides.length;

  return (
    <main className="pv-root">
      {/* ── Left Rail ── */}
      <aside className="pv-rail">
        <div className="pv-rail-header">
          <span className="pv-rail-icon">📋</span>
          <span className="pv-rail-title">Page Proposal</span>
          <span className="pv-rail-badge">{confirmedCount}/{slides.length}</span>
        </div>
        <div className="pv-rail-list">
          {slides.map((slide, i) => {
            const isActive = i === activeIdx;
            const isConfirmed = slide.proposalStatus === 'confirmed';
            const hasDialog = (slideDialogs[i] || []).length > 1;
            return (
              <button
                key={slide.id || i}
                className={`pv-thumb ${isActive ? 'pv-thumb--active' : ''} ${isConfirmed ? 'pv-thumb--confirmed' : ''}`}
                onClick={() => setActiveIdx(i)}
              >
                <div className="pv-thumb-num">{i + 1}</div>
                <div className="pv-thumb-info">
                  <div className="pv-thumb-name">{slide.name || `Slide ${i + 1}`}</div>
                  <div className="pv-thumb-meta">
                    {slide.blocks?.length || 0} elements
                    {hasDialog && <span> · discussed</span>}
                  </div>
                </div>
                <div className="pv-thumb-status">{isConfirmed ? '✓' : '○'}</div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── Center Canvas ── */}
      <section className="pv-canvas">
        <div className="pv-canvas-header">
          <span className="pv-canvas-slide-name">{activeSlide?.name || 'Untitled'}</span>
          <span className={`pv-canvas-status ${activeSlide?.proposalStatus === 'confirmed' ? 'pv-canvas-status--done' : 'pv-canvas-status--pending'}`}>
            {activeSlide?.proposalStatus === 'confirmed' ? '✓ Confirmed' : '○ In Review'}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94a3b8' }}>
            Drag blocks to reposition · Corner handle to resize
          </span>
        </div>

        <div className="pv-canvas-stage">
          <div
            className="pv-stage-bg"
            style={{ backgroundColor: activeSlide?.bgColor || '#f8fafc', cursor: 'default' }}
            onClick={() => setSelectedBlockIdx(null)}
          >
            {activeSlide?.blocks?.length > 0 ? (
              activeSlide.blocks.map((block, j) => (
                <DraggableBlock
                  key={block.id || j}
                  block={block}
                  index={j}
                  isSelected={selectedBlockIdx === j}
                  onSelect={setSelectedBlockIdx}
                  onChange={handleBlockChange}
                />
              ))
            ) : (
              <div className="pv-stage-empty">
                <div className="pv-stage-empty-icon">📄</div>
                <div className="pv-stage-empty-text">No content yet — describe what you want in the chat →</div>
              </div>
            )}
          </div>
        </div>

        <div className="pv-canvas-actions">
          <div className="pv-canvas-nav">
            <button className="pv-nav-btn" disabled={activeIdx === 0}
              onClick={() => setActiveIdx(i => Math.max(0, i - 1))}>← Prev</button>
            <span className="pv-nav-indicator">{activeIdx + 1} / {slides.length}</span>
            <button className="pv-nav-btn" disabled={activeIdx >= slides.length - 1}
              onClick={() => setActiveIdx(i => Math.min(slides.length - 1, i + 1))}>Next →</button>
          </div>
          <div className="pv-canvas-actions-right">
            <button
              className={`pv-action-btn ${activeSlide?.proposalStatus === 'confirmed' ? 'pv-action-btn--active' : ''}`}
              onClick={() => toggleSlideConfirm(activeIdx)}
            >
              {activeSlide?.proposalStatus === 'confirmed' ? '✓ Confirmed' : 'Confirm Page'}
            </button>
            {allConfirmed && (
              <button className="pv-action-btn pv-action-btn--primary" onClick={onProceedToEdit}>
                Enter Editor →
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Right Dialog Panel ── */}
      <aside className="pv-dialog">
        <div className="pv-dialog-header">
          <span className="pv-dialog-icon">💬</span>
          <span className="pv-dialog-title">Page Discussion</span>
          <span className="pv-dialog-subtitle">Slide {activeIdx + 1} · {activeSlide?.name}</span>
        </div>

        <div className="pv-dialog-messages">
          {activeDialog.map((msg, i) => <DialogMessage key={i} msg={msg} />)}
          {isTyping && (
            <div className="pv-dialog-msg pv-dialog-msg--ai">
              <div className="pv-dialog-msg-role">Bifrost</div>
              <div className="pv-dialog-typing">
                <span className="pv-dialog-typing-dot">.</span>
                <span className="pv-dialog-typing-dot">.</span>
                <span className="pv-dialog-typing-dot">.</span>
              </div>
            </div>
          )}
          <div ref={dialogEndRef} />
        </div>

        <div className="pv-dialog-input-bar">
          <textarea
            className="pv-dialog-input"
            value={dialogInputs[activeIdx] || ''}
            onChange={e => setDialogInputs(prev => ({ ...prev, [activeIdx]: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleDialogSend(activeIdx); } }}
            placeholder={`Describe what you want on "${activeSlide?.name || 'this page'}"…`}
            rows={2}
          />
          <button
            className="pv-dialog-send"
            disabled={!(dialogInputs[activeIdx] || '').trim() || isTyping}
            onClick={() => handleDialogSend(activeIdx)}
          >
            Send
          </button>
        </div>

        <div className="pv-dialog-hints">
          <span className="pv-dialog-hints-label">Try saying:</span>
          {[
            '"Add a large heading and a subtitle"',
            '"Change the button to say Get Started"',
            '"Add 3 feature cards below"',
          ].map((hint, i) => (
            <button
              key={i}
              className="pv-dialog-hint-chip"
              onClick={() => setDialogInputs(prev => ({ ...prev, [activeIdx]: hint.replace(/"/g, '') }))}
            >
              {hint}
            </button>
          ))}
        </div>
      </aside>
    </main>
  );
}
