/**
 * PptEditor — PPT 模式 Pipeline 编辑器
 *
 * 布局（对标 PowerPoint / Google Slides）:
 *   ┌─────────────────────────────────────────────────────┐
 *   │  Header Bar: pipeline title + phase progress + CTA │
 *   ├──────────┬──────────────────────────┬──────────────┤
 *   │  Slide   │                          │   Inspector  │
 *   │  Panel   │    Canvas (Slide View)   │   (Right     │
 *   │  (Left   │                          │    Panel)    │
 *   │  Nav)    │                          │              │
 *   └──────────┴──────────────────────────┴──────────────┘
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  SLIDE_STATUS, PIPELINE_PHASE, BLOCK_TYPE, SLIDE_LAYOUT, SLIDE_THEMES,
  createSlide, createBlock, addSlide, removeSlide, moveSlide, updateSlide, updateBlock,
  inferStepIcon,
} from './types.js';

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Sub-components
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/* ── Status Chip ── */
function StatusChip({ status }) {
  const map = {
    [SLIDE_STATUS.IDLE]:      { label: 'Draft',     cls: 'ppt-chip ppt-chip--idle'      },
    [SLIDE_STATUS.SKELETON]:  { label: 'Review',    cls: 'ppt-chip ppt-chip--skeleton'  },
    [SLIDE_STATUS.EDITING]:   { label: 'Editing',   cls: 'ppt-chip ppt-chip--editing'   },
    [SLIDE_STATUS.APPROVED]:  { label: 'Approved',  cls: 'ppt-chip ppt-chip--approved'  },
    [SLIDE_STATUS.COMPILING]: { label: 'Compiling', cls: 'ppt-chip ppt-chip--compiling' },
    [SLIDE_STATUS.COMPILED]:  { label: 'Done',      cls: 'ppt-chip ppt-chip--compiled'  },
    [SLIDE_STATUS.REJECTED]:  { label: 'Rejected',  cls: 'ppt-chip ppt-chip--rejected'  },
    [SLIDE_STATUS.ERROR]:     { label: 'Error',     cls: 'ppt-chip ppt-chip--error'      },
  };
  const info = map[status] ?? { label: status, cls: 'ppt-chip ppt-chip--idle' };
  return <span className={info.cls}>{info.label}</span>;
}

/* ── Phase Progress Bar ── */
const PHASES = [
  PIPELINE_PHASE.PARSING,
  PIPELINE_PHASE.SKELETON,
  PIPELINE_PHASE.REVIEW,
  PIPELINE_PHASE.COMPILING,
  PIPELINE_PHASE.DONE,
];
function PhaseBar({ phase }) {
  const idx = PHASES.indexOf(phase);
  if (phase === PIPELINE_PHASE.IDLE) return null;
  return (
    <div className="ppt-phase-bar">
      {PHASES.map((p, i) => (
        <React.Fragment key={p}>
          <div className={`ppt-phase-step ${i <= idx ? 'is-done' : ''} ${i === idx ? 'is-active' : ''}`}>
            <div className="ppt-phase-dot" />
            <span className="ppt-phase-label">{p}</span>
          </div>
          {i < PHASES.length - 1 && <div className={`ppt-phase-line ${i < idx ? 'is-done' : ''}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ── Slide Thumbnail (Left Nav) ── */
function SlideThumbnail({ slide, index, isSelected, onClick, onDelete, onMove, isFirst, isLast }) {
  const theme = SLIDE_THEMES[slide.themeIndex ?? 0];
  return (
    <div
      className={`ppt-thumb ${isSelected ? 'is-selected' : ''} ppt-thumb--status-${slide.status}`}
      onClick={onClick}
    >
      {/* Mini slide preview */}
      <div className="ppt-thumb-preview" style={{ background: theme.bg, borderColor: theme.border }}>
        <div className="ppt-thumb-icon">{slide.stepIcon}</div>
        <div className="ppt-thumb-title" style={{ color: theme.text }}>{slide.stepTitle}</div>
        <StatusChip status={slide.status} />
        {slide.status === SLIDE_STATUS.COMPILED && (
          <div className="ppt-thumb-check">✓</div>
        )}
        {slide.status === SLIDE_STATUS.COMPILING && (
          <div className="ppt-thumb-spinner" />
        )}
      </div>
      {/* Slide number */}
      <div className="ppt-thumb-num">{String(index + 1).padStart(2, '0')}</div>
      {/* Controls */}
      <div className="ppt-thumb-controls">
        <button className="ppt-thumb-btn" disabled={isFirst} onClick={(e) => { e.stopPropagation(); onMove('left'); }} title="Move left">‹</button>
        <button className="ppt-thumb-btn" disabled={isLast}  onClick={(e) => { e.stopPropagation(); onMove('right'); }} title="Move right">›</button>
        <button className="ppt-thumb-btn ppt-thumb-btn--del" onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Delete">✕</button>
      </div>
    </div>
  );
}

/* ── Add Slide Button ── */
function AddSlideBtn({ onClick }) {
  return (
    <button className="ppt-thumb ppt-thumb-add" onClick={onClick}>
      <div className="ppt-thumb-add-inner">
        <span className="ppt-thumb-add-icon">＋</span>
        <span className="ppt-thumb-add-label">Add Step</span>
      </div>
    </button>
  );
}

/* ── Content Block Renderer ── */
function BlockView({ block, isEditing, onChange, onSelect, isSelected }) {
  const style = {
    position: 'absolute',
    left:   `${block.x}%`,
    top:    `${block.y}%`,
    width:  `${block.w}%`,
    height: `${block.h}%`,
    ...block.style,
  };

  const cls = `ppt-block ppt-block--${block.type} ${isSelected ? 'is-selected' : ''}`;

  const handleClick = (e) => { e.stopPropagation(); onSelect(block.id); };

  if (block.type === BLOCK_TYPE.TITLE) {
    return (
      <div className={cls} style={style} onClick={handleClick}>
        {isEditing && isSelected ? (
          <input
            className="ppt-block-input ppt-block-input--title"
            value={block.content}
            onChange={(e) => onChange({ content: e.target.value })}
            autoFocus
          />
        ) : (
          <h2 className="ppt-block-title-text">{block.content || 'Click to edit title'}</h2>
        )}
      </div>
    );
  }

  if (block.type === BLOCK_TYPE.TEXT) {
    return (
      <div className={cls} style={style} onClick={handleClick}>
        {isEditing && isSelected ? (
          <textarea
            className="ppt-block-textarea"
            value={block.content}
            onChange={(e) => onChange({ content: e.target.value })}
            autoFocus
          />
        ) : (
          <p className="ppt-block-text-content">{block.content || 'Click to edit text…'}</p>
        )}
      </div>
    );
  }

  if (block.type === BLOCK_TYPE.CODE) {
    return (
      <div className={cls} style={style} onClick={handleClick}>
        <div className="ppt-code-header">
          <div className="ppt-code-dots"><span /><span /><span /></div>
          <span className="ppt-code-lang">{block.language || 'python'}</span>
        </div>
        {isEditing && isSelected ? (
          <textarea
            className="ppt-block-code-edit"
            value={block.content}
            onChange={(e) => onChange({ content: e.target.value })}
            autoFocus
            spellCheck={false}
          />
        ) : (
          <pre className="ppt-block-code-view">{block.content || '# Click to edit pseudocode…'}</pre>
        )}
      </div>
    );
  }

  if (block.type === BLOCK_TYPE.IMAGE) {
    return (
      <div className={cls} style={style} onClick={handleClick}>
        <div className="ppt-image-placeholder">
          <span className="ppt-image-icon">🖼</span>
          <span className="ppt-image-label">{block.caption || 'Image Placeholder'}</span>
        </div>
      </div>
    );
  }

  if (block.type === BLOCK_TYPE.BADGE) {
    let items = [];
    try { items = JSON.parse(block.content); } catch (_) { items = (block.content || '').split('\n').filter(Boolean); }
    return (
      <div className={cls} style={style} onClick={handleClick}>
        <div className="ppt-badge-list">
          {items.map((item, i) => (
            <span key={i} className="ppt-badge-item">{item}</span>
          ))}
        </div>
      </div>
    );
  }

  if (block.type === BLOCK_TYPE.CONNECTOR) {
    let io = { inputs: [], outputs: [] };
    try { io = JSON.parse(block.content); } catch (_) {}
    return (
      <div className={cls} style={style} onClick={handleClick}>
        <div className="ppt-connector-row">
          <div className="ppt-connector-group ppt-connector-group--in">
            <span className="ppt-connector-label">IN</span>
            <div className="ppt-connector-pills">
              {(io.inputs || []).map((inp, i) => (
                <span key={i} className="ppt-connector-pill ppt-connector-pill--in">{inp}</span>
              ))}
            </div>
          </div>
          <div className="ppt-connector-arrow">→</div>
          <div className="ppt-connector-group ppt-connector-group--out">
            <span className="ppt-connector-label">OUT</span>
            <div className="ppt-connector-pills">
              {(io.outputs || []).map((out, i) => (
                <span key={i} className="ppt-connector-pill ppt-connector-pill--out">{out}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (block.type === BLOCK_TYPE.TABLE) {
    let rows = [];
    try { rows = JSON.parse(block.content); } catch (_) {}
    if (!Array.isArray(rows) || rows.length === 0) rows = [['Column A','Column B','Column C'],['Value 1','Value 2','Value 3']];
    return (
      <div className={cls} style={style} onClick={handleClick}>
        <table className="ppt-table">
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className={ri === 0 ? 'ppt-table-head' : ''}>
                {row.map((cell, ci) => (
                  <td key={ci} className="ppt-table-cell">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Fallback
  return (
    <div className={cls} style={style} onClick={handleClick}>
      <div className="ppt-block-fallback">{block.content}</div>
    </div>
  );
}

/* ── Slide Canvas (Main Editor Area) ── */
function SlideCanvas({ slide, isEditing, onSlideChange, onApprove, onReject, onCompile, isDark }) {
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [reviewNote, setReviewNote] = useState(slide.reviewNote || '');
  const theme = SLIDE_THEMES[slide.themeIndex ?? 0];
  const canApprove = slide.status === SLIDE_STATUS.SKELETON || slide.status === SLIDE_STATUS.EDITING || slide.status === SLIDE_STATUS.IDLE;
  const canEdit    = slide.status !== SLIDE_STATUS.COMPILING;

  const handleBlockChange = useCallback((blockId, patch) => {
    const updated = {
      ...slide,
      blocks: slide.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b)),
    };
    onSlideChange(updated);
  }, [slide, onSlideChange]);

  const handleCanvasClick = () => setSelectedBlockId(null);

  // Show compiled preview if done
  if (slide.status === SLIDE_STATUS.COMPILED && slide.html) {
    return (
      <div className="ppt-canvas ppt-canvas--compiled">
        <div className="ppt-canvas-compiled-bar">
          <span>🎉 Compiled</span>
          <span className="ppt-canvas-compiled-title">{slide.stepIcon} {slide.stepTitle}</span>
          <button className="ppt-canvas-edit-btn" onClick={() => onSlideChange({ ...slide, status: SLIDE_STATUS.EDITING })}>
            ✏️ Edit Again
          </button>
        </div>
        <iframe
          title={slide.stepTitle}
          srcDoc={slide.html}
          sandbox="allow-scripts allow-same-origin"
          className="ppt-canvas-iframe"
        />
      </div>
    );
  }

  // Compiling state
  if (slide.status === SLIDE_STATUS.COMPILING) {
    return (
      <div className="ppt-canvas ppt-canvas--compiling" style={{ background: theme.bg }}>
        <div className="ppt-compiling-inner">
          <div className="ppt-compiling-spinner" />
          <p className="ppt-compiling-text">Compiling slide into code…</p>
          <span className="ppt-compiling-subtitle">{slide.stepIcon} {slide.stepTitle}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`ppt-canvas ppt-canvas--editor ${isEditing ? 'is-editing' : ''}`}
      style={{ background: theme.bg }}
      onClick={handleCanvasClick}
    >
      {/* Slide ratio wrapper (16:9) */}
      <div className="ppt-canvas-stage">
        {/* Slide number badge */}
        <div className="ppt-canvas-slide-badge" style={{ color: theme.accent }}>
          <StatusChip status={slide.status} />
        </div>

        {/* Content Blocks */}
        {slide.blocks.map((block) => (
          <BlockView
            key={block.id}
            block={block}
            isEditing={isEditing && canEdit}
            isSelected={selectedBlockId === block.id}
            onSelect={setSelectedBlockId}
            onChange={(patch) => handleBlockChange(block.id, patch)}
          />
        ))}

        {/* Empty state */}
        {slide.blocks.length === 0 && (
          <div className="ppt-canvas-empty" style={{ color: theme.text }}>
            <div className="ppt-canvas-empty-icon">{slide.stepIcon}</div>
            <p className="ppt-canvas-empty-text">This slide is empty. AI will fill it when generating.</p>
          </div>
        )}
      </div>

      {/* Review / Approve Bar (Human-in-the-loop) */}
      {(slide.status === SLIDE_STATUS.SKELETON || slide.status === SLIDE_STATUS.EDITING) && (
        <div className="ppt-review-bar">
          <div className="ppt-review-hint">
            🤖 Review this slide — approve to compile, or reject to revise
          </div>
          <textarea
            className="ppt-review-note"
            placeholder="Add a revision note (optional)…"
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            rows={2}
          />
          <div className="ppt-review-actions">
            <button className="ppt-btn ppt-btn--reject" onClick={() => onReject(slide.id, reviewNote)}>
              ✕ Request Revision
            </button>
            <button className="ppt-btn ppt-btn--approve" onClick={() => onApprove(slide.id, reviewNote)}>
              ✓ Approve &amp; Compile
            </button>
          </div>
        </div>
      )}

      {/* Approved bar - waiting to compile */}
      {slide.status === SLIDE_STATUS.APPROVED && (
        <div className="ppt-review-bar ppt-review-bar--approved">
          <div className="ppt-review-hint ppt-review-hint--approved">
            ✅ Approved — ready to compile into code
          </div>
          <button className="ppt-btn ppt-btn--compile" onClick={() => onCompile(slide.id)}>
            ⚙ Compile This Slide
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Inspector Panel (Right) ── */
function InspectorPanel({ slide, pipeline, onSlideChange, onApprove, onReject, onCompile, onCompileAll }) {
  const [note, setNote] = useState(slide?.reviewNote || '');
  if (!slide) {
    return (
      <div className="ppt-inspector ppt-inspector--empty">
        <p>Select a slide to inspect</p>
      </div>
    );
  }
  const theme = SLIDE_THEMES[slide.themeIndex ?? 0];
  const totalSlides = pipeline.slideOrder.length;
  const compiled    = pipeline.slideOrder.filter((id) => pipeline.slides[id]?.status === SLIDE_STATUS.COMPILED).length;
  const approved    = pipeline.slideOrder.filter((id) => pipeline.slides[id]?.status === SLIDE_STATUS.APPROVED).length;

  return (
    <div className="ppt-inspector">
      {/* Header */}
      <div className="ppt-inspector-header" style={{ borderBottomColor: theme.border }}>
        <span className="ppt-inspector-icon">{slide.stepIcon}</span>
        <div>
          <div className="ppt-inspector-title">{slide.stepTitle}</div>
          <StatusChip status={slide.status} />
        </div>
      </div>

      {/* Pipeline Progress */}
      <div className="ppt-inspector-section">
        <div className="ppt-inspector-section-label">Pipeline Progress</div>
        <div className="ppt-inspector-progress-row">
          <div className="ppt-inspector-progress-bar">
            <div
              className="ppt-inspector-progress-fill"
              style={{ width: `${(compiled / totalSlides) * 100}%`, background: theme.accent }}
            />
          </div>
          <span className="ppt-inspector-progress-text">{compiled}/{totalSlides} compiled</span>
        </div>
        {approved > 0 && (
          <button className="ppt-btn ppt-btn--compile-all" onClick={onCompileAll}>
            ⚙ Compile All Approved ({approved})
          </button>
        )}
      </div>

      {/* Slide Info */}
      <div className="ppt-inspector-section">
        <div className="ppt-inspector-section-label">Step Description</div>
        <p className="ppt-inspector-desc">{slide.description || '—'}</p>
      </div>

      {/* I/O */}
      <div className="ppt-inspector-section">
        <div className="ppt-inspector-section-label">Inputs</div>
        <div className="ppt-inspector-pills">
          {(slide.inputs || []).map((inp, i) => (
            <span key={i} className="ppt-inspector-pill ppt-inspector-pill--in">{inp}</span>
          ))}
          {(!slide.inputs || slide.inputs.length === 0) && <span className="ppt-inspector-pill-empty">—</span>}
        </div>
        <div className="ppt-inspector-section-label" style={{ marginTop: 8 }}>Outputs</div>
        <div className="ppt-inspector-pills">
          {(slide.outputs || []).map((out, i) => (
            <span key={i} className="ppt-inspector-pill ppt-inspector-pill--out">{out}</span>
          ))}
          {(!slide.outputs || slide.outputs.length === 0) && <span className="ppt-inspector-pill-empty">—</span>}
        </div>
      </div>

      {/* Theme Picker */}
      <div className="ppt-inspector-section">
        <div className="ppt-inspector-section-label">Slide Theme</div>
        <div className="ppt-inspector-themes">
          {SLIDE_THEMES.map((t, i) => (
            <button
              key={i}
              className={`ppt-theme-swatch ${(slide.themeIndex ?? 0) === i ? 'is-active' : ''}`}
              style={{ background: t.bg, borderColor: t.border }}
              onClick={() => onSlideChange({ ...slide, themeIndex: i, theme: t })}
              title={`Theme ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Human-in-the-loop Quick Actions */}
      {(slide.status === SLIDE_STATUS.SKELETON || slide.status === SLIDE_STATUS.EDITING) && (
        <div className="ppt-inspector-section ppt-inspector-section--review">
          <div className="ppt-inspector-section-label">Human Review</div>
          <textarea
            className="ppt-inspector-note"
            rows={3}
            placeholder="Revision note (optional)…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="ppt-inspector-review-btns">
            <button className="ppt-btn ppt-btn--reject ppt-btn--sm" onClick={() => onReject(slide.id, note)}>
              ✕ Reject
            </button>
            <button className="ppt-btn ppt-btn--approve ppt-btn--sm" onClick={() => onApprove(slide.id, note)}>
              ✓ Approve
            </button>
          </div>
        </div>
      )}

      {slide.status === SLIDE_STATUS.APPROVED && (
        <div className="ppt-inspector-section">
          <button className="ppt-btn ppt-btn--compile" style={{ width: '100%' }} onClick={() => onCompile(slide.id)}>
            ⚙ Compile This Slide
          </button>
        </div>
      )}
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Main PptEditor Component
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export default function PptEditor({
  pipeline,
  onPipelineChange,
  onRequestRegenerate,
  isDark,
  getModel,
}) {
  const [selectedSlideId, setSelectedSlideId] = useState(
    pipeline.slideOrder[0] ?? null
  );
  const [isEditing, setIsEditing] = useState(false);
  const [showFinalDash, setShowFinalDash] = useState(false);
  const [finalHtml, setFinalHtml] = useState('');
  const [finalLoading, setFinalLoading] = useState(false);
  const thumbsRef = useRef(null);

  // Auto-select first slide when pipeline reloads
  useEffect(() => {
    if (!selectedSlideId || !pipeline.slides[selectedSlideId]) {
      setSelectedSlideId(pipeline.slideOrder[0] ?? null);
    }
  }, [pipeline.slideOrder]);

  const selectedSlide = pipeline.slides[selectedSlideId] ?? null;
  const allCompiled   = pipeline.slideOrder.length > 0 &&
    pipeline.slideOrder.every((id) => pipeline.slides[id]?.status === SLIDE_STATUS.COMPILED);

  /* ── Pipeline Mutation Helpers ── */
  const updatePipeline = useCallback((patch) => {
    onPipelineChange({ ...pipeline, ...patch });
  }, [pipeline, onPipelineChange]);

  const handleSlideChange = useCallback((updatedSlide) => {
    updatePipeline({
      slides: { ...pipeline.slides, [updatedSlide.id]: updatedSlide },
    });
  }, [pipeline, updatePipeline]);

  const handleApprove = useCallback((slideId, note = '') => {
    updatePipeline({
      slides: {
        ...pipeline.slides,
        [slideId]: { ...pipeline.slides[slideId], status: SLIDE_STATUS.APPROVED, reviewNote: note },
      },
    });
  }, [pipeline, updatePipeline]);

  const handleReject = useCallback(async (slideId, note = '') => {
    if (!getModel) return;
    // Mark as revising
    const revising = {
      ...pipeline,
      slides: {
        ...pipeline.slides,
        [slideId]: { ...pipeline.slides[slideId], status: SLIDE_STATUS.COMPILING, reviewNote: note },
      },
    };
    onPipelineChange(revising);
    try {
      const model = getModel();
      const slide = pipeline.slides[slideId];
      const revisionPrompt = `
You are revising one pipeline step's slide content based on user feedback.

Step: "${slide.stepTitle}"
Description: "${slide.description}"
User note: "${note || 'General revision needed'}"

Current slide blocks (JSON):
${JSON.stringify(slide.blocks.map((b) => ({ type: b.type, content: b.content.slice(0, 200) })), null, 2)}

Please return ONLY a valid JSON array of revised blocks.
Each block must have: type, content, x(0-100), y(0-100), w(0-100), h(0-100).
Types: title, text, code, badge, connector, table.
Connector content must be JSON: {"inputs":[],"outputs":[]}.
Badge content must be a JSON array of strings.
Keep structure, only refine content. Respond with ONLY the JSON array.
      `.trim();
      const result = await model.generateContent(revisionPrompt);
      const raw = result.response.text().replace(/```json|```/g, '').trim();
      let newBlocks = [];
      try { newBlocks = JSON.parse(raw); } catch (_) { newBlocks = slide.blocks; }
      updatePipeline({
        slides: {
          ...pipeline.slides,
          [slideId]: { ...pipeline.slides[slideId], blocks: newBlocks, status: SLIDE_STATUS.SKELETON },
        },
      });
    } catch (err) {
      updatePipeline({
        slides: {
          ...pipeline.slides,
          [slideId]: { ...pipeline.slides[slideId], status: SLIDE_STATUS.ERROR },
        },
      });
    }
  }, [pipeline, onPipelineChange, getModel]);

  const handleCompile = useCallback(async (slideId) => {
    if (!getModel) return;
    updatePipeline({
      slides: { ...pipeline.slides, [slideId]: { ...pipeline.slides[slideId], status: SLIDE_STATUS.COMPILING } },
    });
    try {
      const model = getModel();
      const slide = pipeline.slides[slideId];
      const compilePrompt = `
You are compiling one pipeline step into a beautiful standalone HTML card.

Step: "${slide.stepTitle}"
Description: "${slide.description}"
Inputs: ${JSON.stringify(slide.inputs || [])}
Outputs: ${JSON.stringify(slide.outputs || [])}

Slide blocks:
${slide.blocks.map((b) => `[${b.type.toUpperCase()}] ${b.content.slice(0, 400)}`).join('\n\n')}

Generate a complete, self-contained HTML page for this pipeline step.
Requirements:
- Dark background (#1e2433), white/light text
- Show step icon, title, description prominently
- Display pseudocode in a styled code block
- Show Input→Output flow at the bottom
- Use inline CSS only (no external libraries)
- Make it look like a professional pipeline step card
- Width: 100%, height: auto

Respond with ONLY the HTML code starting with <!DOCTYPE html>.
      `.trim();
      const result = await model.generateContent(compilePrompt);
      const html = result.response.text().replace(/```html|```/g, '').trim();
      const currentPipeline = pipeline;
      const allDone = currentPipeline.slideOrder
        .filter((id) => id !== slideId)
        .every((id) => currentPipeline.slides[id]?.status === SLIDE_STATUS.COMPILED);

      updatePipeline({
        slides: {
          ...pipeline.slides,
          [slideId]: {
            ...pipeline.slides[slideId],
            status: SLIDE_STATUS.COMPILED,
            html,
            compiledAt: Date.now(),
          },
        },
        phase: allDone ? PIPELINE_PHASE.DONE : pipeline.phase,
      });
    } catch (err) {
      updatePipeline({
        slides: { ...pipeline.slides, [slideId]: { ...pipeline.slides[slideId], status: SLIDE_STATUS.ERROR } },
      });
    }
  }, [pipeline, updatePipeline, getModel]);

  const handleCompileAll = useCallback(() => {
    const approvedIds = pipeline.slideOrder.filter(
      (id) => pipeline.slides[id]?.status === SLIDE_STATUS.APPROVED
    );
    approvedIds.forEach((id) => handleCompile(id));
  }, [pipeline, handleCompile]);

  const handleAddSlide = useCallback(() => {
    const idx = pipeline.slideOrder.length;
    const newSlide = createSlide({
      stepTitle:   'New Step',
      stepIcon:    '🔷',
      description: 'Describe this pipeline step…',
      themeIndex:  idx % SLIDE_THEMES.length,
      status:      SLIDE_STATUS.IDLE,
      blocks: [
        createBlock({ type: BLOCK_TYPE.TITLE,   content: 'New Step', x: 5, y: 5,  w: 90, h: 15 }),
        createBlock({ type: BLOCK_TYPE.TEXT,    content: 'Describe this step…', x: 5, y: 24, w: 90, h: 20 }),
        createBlock({ type: BLOCK_TYPE.CODE,    content: '# Pseudocode here', language: 'python', x: 5, y: 48, w: 90, h: 40 }),
        createBlock({ type: BLOCK_TYPE.CONNECTOR, content: JSON.stringify({ inputs: ['Input'], outputs: ['Output'] }), x: 5, y: 91, w: 90, h: 8 }),
      ],
    });
    const updated = addSlide(pipeline, newSlide, selectedSlideId);
    onPipelineChange(updated);
    setSelectedSlideId(newSlide.id);
  }, [pipeline, selectedSlideId, onPipelineChange]);

  const handleDeleteSlide = useCallback((slideId) => {
    if (pipeline.slideOrder.length <= 1) return;
    const updated = removeSlide(pipeline, slideId);
    onPipelineChange(updated);
    if (selectedSlideId === slideId) {
      setSelectedSlideId(updated.slideOrder[0] ?? null);
    }
  }, [pipeline, selectedSlideId, onPipelineChange]);

  const handleMoveSlide = useCallback((slideId, direction) => {
    onPipelineChange(moveSlide(pipeline, slideId, direction));
  }, [pipeline, onPipelineChange]);

  /* ── Final Dashboard Generation ── */
  const handleViewDashboard = useCallback(async () => {
    setShowFinalDash(true);
    setFinalLoading(true);
    try {
      const model = getModel();
      const slides = pipeline.slideOrder.map((id) => pipeline.slides[id]);
      const prompt = `
Create a beautiful, professional HTML dashboard that combines all these pipeline steps:

Pipeline: "${pipeline.title}"
Summary: "${pipeline.summary}"

Steps:
${slides.map((s, i) => `${i+1}. ${s.stepIcon} ${s.stepTitle}: ${s.description}`).join('\n')}

Data Flow:
${slides.map((s) => `${s.stepTitle}: [${(s.inputs||[]).join(', ')}] → [${(s.outputs||[]).join(', ')}]`).join('\n')}

Generate a complete, standalone HTML dashboard with:
- Dark theme professional design
- Pipeline flow visualization (horizontal steps with arrows)
- Each step shown as a card with: icon, title, description, status (✓ compiled)
- A summary section at the top
- Smooth animations, gradient accents
- Inline CSS only
Width: 100vw, Height: 100vh

Respond with ONLY the HTML code starting with <!DOCTYPE html>.
      `.trim();
      const result = await model.generateContent(prompt);
      const html = result.response.text().replace(/```html|```/g, '').trim();
      setFinalHtml(html);
    } catch (_) {
      setFinalHtml('<html><body style="background:#1e2433;color:white;display:flex;align-items:center;justify-content:center;height:100vh"><p>Failed to generate dashboard.</p></body></html>');
    } finally {
      setFinalLoading(false);
    }
  }, [pipeline, getModel]);

  /* ── Keyboard Shortcuts ── */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setIsEditing(false);
      if (e.key === 'Enter' && !e.shiftKey && !isEditing) setIsEditing(true);
      if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowLeft') {
        const idx = pipeline.slideOrder.indexOf(selectedSlideId);
        if (idx > 0) setSelectedSlideId(pipeline.slideOrder[idx - 1]);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowRight') {
        const idx = pipeline.slideOrder.indexOf(selectedSlideId);
        if (idx < pipeline.slideOrder.length - 1) setSelectedSlideId(pipeline.slideOrder[idx + 1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pipeline, selectedSlideId, isEditing]);

  /* ── Render ── */
  return (
    <div className={`ppt-editor ${isDark ? 'ppt-dark' : ''}`}>

      {/* ── Top Bar ── */}
      <div className="ppt-topbar">
        <div className="ppt-topbar-left">
          <div className="ppt-topbar-title">{pipeline.title}</div>
          <div className="ppt-topbar-summary">{pipeline.summary}</div>
        </div>
        <PhaseBar phase={pipeline.phase} />
        <div className="ppt-topbar-right">
          <button
            className={`ppt-topbar-btn ${isEditing ? 'is-active' : ''}`}
            onClick={() => setIsEditing((v) => !v)}
            title="Toggle edit mode (Enter / Esc)"
          >
            {isEditing ? '✅ Editing' : '✏️ Edit'}
          </button>
          <button className="ppt-topbar-btn" onClick={onRequestRegenerate} title="Regenerate pipeline">
            ↺ Regenerate
          </button>
          {allCompiled && (
            <button className="ppt-topbar-btn ppt-topbar-btn--cta" onClick={handleViewDashboard}>
              ✦ View Dashboard
            </button>
          )}
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="ppt-main">

        {/* Left: Slide Navigation */}
        <div className="ppt-nav" ref={thumbsRef}>
          <div className="ppt-nav-inner">
            {pipeline.slideOrder.map((slideId, idx) => {
              const slide = pipeline.slides[slideId];
              if (!slide) return null;
              return (
                <SlideThumbnail
                  key={slideId}
                  slide={slide}
                  index={idx}
                  isSelected={selectedSlideId === slideId}
                  isFirst={idx === 0}
                  isLast={idx === pipeline.slideOrder.length - 1}
                  onClick={() => setSelectedSlideId(slideId)}
                  onDelete={() => handleDeleteSlide(slideId)}
                  onMove={(dir) => handleMoveSlide(slideId, dir)}
                />
              );
            })}
            <AddSlideBtn onClick={handleAddSlide} />
          </div>
        </div>

        {/* Center: Canvas */}
        <div className="ppt-canvas-wrap">
          {selectedSlide ? (
            <SlideCanvas
              slide={selectedSlide}
              isEditing={isEditing}
              onSlideChange={handleSlideChange}
              onApprove={handleApprove}
              onReject={handleReject}
              onCompile={handleCompile}
              isDark={isDark}
            />
          ) : (
            <div className="ppt-canvas-wrap-empty">
              <p>No slides. Click "Add Step" to start.</p>
            </div>
          )}
        </div>

        {/* Right: Inspector */}
        <InspectorPanel
          slide={selectedSlide}
          pipeline={pipeline}
          onSlideChange={handleSlideChange}
          onApprove={handleApprove}
          onReject={handleReject}
          onCompile={handleCompile}
          onCompileAll={handleCompileAll}
        />
      </div>

      {/* ── Final Dashboard Modal ── */}
      {showFinalDash && (
        <div className="ppt-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowFinalDash(false); }}>
          <div className="ppt-modal">
            <div className="ppt-modal-bar">
              <div className="ppt-modal-bar-dots"><span /><span /><span /></div>
              <span className="ppt-modal-title">✦ {pipeline.title} — Full Dashboard</span>
              <button className="ppt-modal-close" onClick={() => setShowFinalDash(false)}>✕</button>
            </div>
            <div className="ppt-modal-body">
              {finalLoading ? (
                <div className="ppt-modal-loading">
                  <div className="ppt-modal-spinner" />
                  <p>Generating final dashboard…</p>
                </div>
              ) : (
                <iframe
                  title="Final Dashboard"
                  srcDoc={finalHtml}
                  sandbox="allow-scripts allow-same-origin"
                  className="ppt-modal-iframe"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
