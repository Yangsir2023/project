/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  VisualCanvas — PPT-style Visual Blocks editor              ║
 * ║  PPT 核心理念: "像修改幻灯片一样拖拽文本框、调整图片位置"      ║
 * ║  Ref: Slide 7 (创新优势二: Visual Blocks 交互)              ║
 * ╚══════════════════════════════════════════════════════════════╝
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  NODE_STATUS,
  NODE_PALETTE_LIGHT,
  NODE_PALETTE_DARK,
  getOrderedNodes,
  updateNode,
  updateNodeSkeleton,
  inferStepIcon,
} from './types.js';

/* ─── Status Badge ─────────────────────────────────────────── */
function StatusBadge({ status }) {
  const map = {
    [NODE_STATUS.IDLE]:             { label: 'Idle',        cls: 'status-idle'     },
    [NODE_STATUS.SKELETON_PENDING]: { label: 'Generating…', cls: 'status-pending'  },
    [NODE_STATUS.SKELETON_READY]:   { label: 'Review',      cls: 'status-review'   },
    [NODE_STATUS.USER_REVIEWING]:   { label: 'Reviewing',   cls: 'status-review'   },
    [NODE_STATUS.APPROVED]:         { label: '✓ Approved',  cls: 'status-approved' },
    [NODE_STATUS.REJECTED]:         { label: '↩ Revising',  cls: 'status-revising' },
    [NODE_STATUS.REVISING]:         { label: 'Revising…',   cls: 'status-pending'  },
    [NODE_STATUS.COMPILING]:        { label: 'Compiling…',  cls: 'status-pending'  },
    [NODE_STATUS.COMPILED]:         { label: '✦ Done',      cls: 'status-done'     },
    [NODE_STATUS.ERROR]:            { label: '⚠ Error',     cls: 'status-error'    },
  };
  const info = map[status] || { label: status, cls: 'status-idle' };
  return <span className={`vb-status-badge ${info.cls}`}>{info.label}</span>;
}

/* ─── Pseudocode Block ─────────────────────────────────────── */
function PseudocodeBlock({ code }) {
  if (!code) return null;
  return (
    <div className="vb-pseudocode">
      <div className="vb-pseudocode-label">Pseudocode</div>
      <pre className="vb-pseudocode-content">{code}</pre>
    </div>
  );
}

/* ─── IO Pill Row ──────────────────────────────────────────── */
function IOPills({ items, direction }) {
  if (!items || items.length === 0) return null;
  return (
    <div className={`vb-io-row vb-io-${direction}`}>
      <span className="vb-io-label">{direction === 'in' ? 'IN' : 'OUT'}</span>
      <div className="vb-io-pills">
        {items.map((item, i) => (
          <span key={i} className={`vb-io-pill vb-io-pill--${direction}`}>{item}</span>
        ))}
      </div>
    </div>
  );
}

/* ─── Single Visual Block Card ─────────────────────────────── */
function VisualBlock({
  node,
  index,
  isSelected,
  isLast,
  palette,
  onSelect,
  onApprove,
  onReject,
  onEditField,
  onAddAfter,
  onDelete,
  onMoveLeft,
  onMoveRight,
}) {
  const color   = palette[node.skeleton.colorKey % palette.length];
  const isReady = node.status === NODE_STATUS.SKELETON_READY
               || node.status === NODE_STATUS.USER_REVIEWING;
  const isDone  = node.status === NODE_STATUS.COMPILED;
  const isPending = node.status === NODE_STATUS.SKELETON_PENDING
                 || node.status === NODE_STATUS.COMPILING
                 || node.status === NODE_STATUS.REVISING;

  return (
    <div
      className={`vb-block${isSelected ? ' is-selected' : ''}${isDone ? ' is-done' : ''}${isPending ? ' is-pending' : ''}`}
      style={{ '--c-bg': color.bg, '--c-border': color.border, '--c-num': color.num, '--c-icon': color.icon }}
      onClick={() => onSelect(node.id)}
    >
      {/* Block header */}
      <div className="vb-block-header">
        <div className="vb-block-num" style={{ background: color.bg, color: color.num, borderColor: color.border }}>
          {String(index + 1).padStart(2, '0')}
        </div>
        <div className="vb-block-icon">{node.skeleton.icon}</div>
        <div className="vb-block-title-wrap">
          {isSelected ? (
            <input
              className="vb-block-title-input"
              value={node.skeleton.title}
              onChange={(e) => onEditField(node.id, 'title', e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="Step name…"
            />
          ) : (
            <div className="vb-block-title">{node.skeleton.title}</div>
          )}
          <StatusBadge status={node.status} />
        </div>

        {/* Delete button */}
        <button
          className="vb-block-delete"
          onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
          title="Remove this step"
        >×</button>
      </div>

      {/* Description */}
      {isSelected ? (
        <textarea
          className="vb-block-desc-input"
          value={node.skeleton.description}
          onChange={(e) => onEditField(node.id, 'description', e.target.value)}
          onClick={(e) => e.stopPropagation()}
          placeholder="Describe what this step does…"
          rows={2}
        />
      ) : (
        node.skeleton.description && (
          <div className="vb-block-desc">{node.skeleton.description}</div>
        )
      )}

      {/* Pseudocode */}
      {isPending ? (
        <div className="vb-block-skeleton-shimmer">
          <div className="vb-shimmer-line" style={{ width: '80%' }} />
          <div className="vb-shimmer-line" style={{ width: '60%' }} />
          <div className="vb-shimmer-line" style={{ width: '70%' }} />
        </div>
      ) : (
        <PseudocodeBlock code={node.skeleton.pseudocode} />
      )}

      {/* I/O schema */}
      <div className="vb-block-io">
        <IOPills items={node.skeleton.inputs}  direction="in"  />
        <IOPills items={node.skeleton.outputs} direction="out" />
      </div>

      {/* Human-in-the-loop review buttons */}
      {isReady && (
        <div className="vb-block-review-row" onClick={(e) => e.stopPropagation()}>
          <span className="vb-review-hint">Does this match your intent?</span>
          <div className="vb-review-actions">
            <button className="vb-reject-btn"  onClick={() => onReject(node.id)}>↩ Revise</button>
            <button className="vb-approve-btn" onClick={() => onApprove(node.id)}>✓ Approve</button>
          </div>
        </div>
      )}

      {/* Compiled preview miniature */}
      {isDone && node.html && (
        <div className="vb-block-preview">
          <div className="vb-preview-label">Preview</div>
          <iframe
            title={node.skeleton.title}
            srcDoc={node.html}
            sandbox="allow-scripts allow-same-origin"
            className="vb-preview-iframe"
          />
        </div>
      )}

      {/* Move arrows (shown on hover) */}
      {isSelected && (
        <div className="vb-block-move-row" onClick={(e) => e.stopPropagation()}>
          <button className="vb-move-btn" disabled={index === 0}    onClick={() => onMoveLeft(node.id)}  title="Move left">←</button>
          <button className="vb-move-btn" disabled={isLast}         onClick={() => onMoveRight(node.id)} title="Move right">→</button>
        </div>
      )}
    </div>
  );
}

/* ─── Add Step Button ──────────────────────────────────────── */
function AddStepBtn({ onAdd }) {
  return (
    <button className="vb-add-btn" onClick={onAdd} title="Add a new step">
      <span className="vb-add-icon">＋</span>
      <span className="vb-add-label">Add Step</span>
    </button>
  );
}

/* ─── Edge Arrow ───────────────────────────────────────────── */
function EdgeArrow() {
  return <div className="vb-edge-arrow" aria-hidden="true">→</div>;
}

/* ─── Pipeline Phase Header ────────────────────────────────── */
function PhaseHeader({ pipeline, onRequestRegenerate }) {
  const phaseLabel = {
    idle:        'Ready to generate',
    generating:  '✦ AI is building your pipeline…',
    reviewing:   '👁 Review & approve each step',
    compiling:   '⚙ Compiling approved steps…',
    done:        '✅ Pipeline ready',
  };
  const approvedCount = Object.values(pipeline.nodes).filter(n => n.approved).length;
  const totalCount    = pipeline.nodeOrder.length;

  return (
    <div className="vb-phase-header">
      <div className="vb-phase-left">
        {pipeline.isAiGenerated && <span className="vb-ai-chip">✦ AI Generated</span>}
        <span className="vb-phase-title">{pipeline.title}</span>
        {pipeline.summary && <span className="vb-phase-summary">{pipeline.summary}</span>}
      </div>
      <div className="vb-phase-right">
        <span className="vb-phase-status">{phaseLabel[pipeline.phase] || pipeline.phase}</span>
        {pipeline.phase === 'reviewing' && (
          <span className="vb-phase-progress">{approvedCount}/{totalCount} approved</span>
        )}
        {onRequestRegenerate && (
          <button className="vb-regen-btn" onClick={onRequestRegenerate}>↺ Regenerate</button>
        )}
      </div>
    </div>
  );
}

/* ─── Step Detail Pane (Human-in-the-loop sidebar) ─────────── */
function StepDetailPane({ node, palette, onClose, onApprove, onReject, onEditNote, onExpandPreview }) {
  if (!node) return null;
  const color = palette[node.skeleton.colorKey % palette.length];

  return (
    <div className="vb-detail-pane">
      <div className="vb-detail-header">
        <div className="vb-detail-icon" style={{ color: color.icon }}>{node.skeleton.icon}</div>
        <div className="vb-detail-title-block">
          <div className="vb-detail-title">{node.skeleton.title}</div>
          <StatusBadge status={node.status} />
        </div>
        <button className="vb-detail-close" onClick={onClose}>×</button>
      </div>

      {node.skeleton.description && (
        <div className="vb-detail-section">
          <div className="vb-detail-section-label">Description</div>
          <p className="vb-detail-desc">{node.skeleton.description}</p>
        </div>
      )}

      {node.skeleton.pseudocode && (
        <div className="vb-detail-section">
          <div className="vb-detail-section-label">Pseudocode (IR)</div>
          <pre className="vb-detail-pseudocode">{node.skeleton.pseudocode}</pre>
        </div>
      )}

      {(node.skeleton.inputs?.length > 0 || node.skeleton.outputs?.length > 0) && (
        <div className="vb-detail-section">
          <div className="vb-detail-section-label">Data Schema</div>
          <IOPills items={node.skeleton.inputs}  direction="in"  />
          <IOPills items={node.skeleton.outputs} direction="out" />
        </div>
      )}

      {/* Intent alignment — Human-in-the-loop */}
      {(node.status === NODE_STATUS.SKELETON_READY || node.status === NODE_STATUS.USER_REVIEWING) && (
        <div className="vb-detail-section vb-detail-review">
          <div className="vb-detail-section-label">Intent Alignment Check</div>
          <p className="vb-detail-review-hint">
            Does the AI's skeleton match what you envisioned for this step?
            Approve to compile, or leave a note to revise.
          </p>
          <textarea
            className="vb-detail-note"
            value={node.userNote}
            onChange={(e) => onEditNote(node.id, e.target.value)}
            placeholder="Optional: describe what needs to change…"
            rows={3}
          />
          <div className="vb-detail-review-btns">
            <button className="vb-reject-btn vb-reject-btn--lg" onClick={() => onReject(node.id)}>
              ↩ Revise with note
            </button>
            <button className="vb-approve-btn vb-approve-btn--lg" onClick={() => onApprove(node.id)}>
              ✓ Approve & Compile
            </button>
          </div>
        </div>
      )}

      {/* Compiled HTML preview */}
      {node.status === NODE_STATUS.COMPILED && node.html && (
        <div className="vb-detail-section">
          <div className="vb-detail-section-label">
            Compiled Preview
            <button className="vb-expand-link" onClick={() => onExpandPreview(node.id)}>
              ↗ Expand
            </button>
          </div>
          <div className="vb-detail-preview-wrap">
            <iframe
              title={`${node.skeleton.title} preview`}
              srcDoc={node.html}
              sandbox="allow-scripts allow-same-origin"
              className="vb-detail-preview-iframe"
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main VisualCanvas Component ──────────────────────────── */
export default function VisualCanvas({
  pipeline,
  onPipelineChange,
  onRequestRegenerate,
  isDark,
}) {
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [expandedNodeId, setExpandedNodeId] = useState(null);
  const scrollRef = useRef(null);

  const palette = isDark ? NODE_PALETTE_DARK : NODE_PALETTE_LIGHT;
  const nodes   = getOrderedNodes(pipeline);
  const selectedNode = selectedNodeId ? pipeline.nodes[selectedNodeId] : null;

  /* ── Keyboard: Escape closes pane, ←→ navigate ── */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { setSelectedNodeId(null); setExpandedNodeId(null); }
      if (!selectedNodeId) return;
      const idx  = pipeline.nodeOrder.indexOf(selectedNodeId);
      if (e.key === 'ArrowRight' && idx < pipeline.nodeOrder.length - 1) {
        setSelectedNodeId(pipeline.nodeOrder[idx + 1]);
      }
      if (e.key === 'ArrowLeft' && idx > 0) {
        setSelectedNodeId(pipeline.nodeOrder[idx - 1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedNodeId, pipeline.nodeOrder]);

  /* ── Actions ── */
  const handleApprove = useCallback((nodeId) => {
    onPipelineChange(updateNode(pipeline, nodeId, { status: NODE_STATUS.APPROVED, approved: true }));
  }, [pipeline, onPipelineChange]);

  const handleReject = useCallback((nodeId) => {
    onPipelineChange(updateNode(pipeline, nodeId, { status: NODE_STATUS.REJECTED, approved: false }));
  }, [pipeline, onPipelineChange]);

  const handleEditField = useCallback((nodeId, field, value) => {
    onPipelineChange(updateNodeSkeleton(pipeline, nodeId, { [field]: value }));
  }, [pipeline, onPipelineChange]);

  const handleEditNote = useCallback((nodeId, note) => {
    onPipelineChange(updateNode(pipeline, nodeId, { userNote: note }));
  }, [pipeline, onPipelineChange]);

  const handleDelete = useCallback((nodeId) => {
    const newOrder = pipeline.nodeOrder.filter((id) => id !== nodeId);
    const { [nodeId]: _removed, ...newNodes } = pipeline.nodes;
    onPipelineChange({ ...pipeline, nodeOrder: newOrder, nodes: newNodes });
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  }, [pipeline, onPipelineChange, selectedNodeId]);

  const handleAddAfter = useCallback((afterId) => {
    const newNode = createNode({
      skeleton: createNodeSkeleton({ title: 'New Step', icon: '🔷', description: '', pseudocode: '', inputs: [], outputs: [], colorKey: pipeline.nodeOrder.length }),
      status: NODE_STATUS.IDLE,
    });
    const idx       = afterId ? pipeline.nodeOrder.indexOf(afterId) : pipeline.nodeOrder.length - 1;
    const newOrder  = [...pipeline.nodeOrder];
    newOrder.splice(idx + 1, 0, newNode.id);
    onPipelineChange({ ...pipeline, nodeOrder: newOrder, nodes: { ...pipeline.nodes, [newNode.id]: newNode } });
    setSelectedNodeId(newNode.id);
  }, [pipeline, onPipelineChange]);

  const handleAddEnd = useCallback(() => {
    const newNode = createNode({
      skeleton: createNodeSkeleton({
        title: 'New Step', icon: '🔷', description: '',
        pseudocode: '', inputs: [], outputs: [],
        colorKey: pipeline.nodeOrder.length,
      }),
      status: NODE_STATUS.IDLE,
    });
    onPipelineChange({
      ...pipeline,
      nodeOrder: [...pipeline.nodeOrder, newNode.id],
      nodes: { ...pipeline.nodes, [newNode.id]: newNode },
    });
    setSelectedNodeId(newNode.id);
    setTimeout(() => scrollRef.current?.scrollTo({ left: 999999, behavior: 'smooth' }), 100);
  }, [pipeline, onPipelineChange]);

  const handleMoveLeft = useCallback((nodeId) => {
    const idx = pipeline.nodeOrder.indexOf(nodeId);
    if (idx <= 0) return;
    const newOrder = [...pipeline.nodeOrder];
    [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
    onPipelineChange({ ...pipeline, nodeOrder: newOrder });
  }, [pipeline, onPipelineChange]);

  const handleMoveRight = useCallback((nodeId) => {
    const idx = pipeline.nodeOrder.indexOf(nodeId);
    if (idx >= pipeline.nodeOrder.length - 1) return;
    const newOrder = [...pipeline.nodeOrder];
    [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
    onPipelineChange({ ...pipeline, nodeOrder: newOrder });
  }, [pipeline, onPipelineChange]);

  return (
    <div className={`visual-canvas${selectedNode ? ' has-detail' : ''}`}>
      {/* Phase header bar */}
      <PhaseHeader pipeline={pipeline} onRequestRegenerate={onRequestRegenerate} />

      {/* Blocks scroll track */}
      <div className="vb-track-wrap" ref={scrollRef}>
        <div className="vb-track">
          {nodes.map((node, i) => (
            <React.Fragment key={node.id}>
              <VisualBlock
                node={node}
                index={i}
                isSelected={selectedNodeId === node.id}
                isLast={i === nodes.length - 1}
                palette={palette}
                onSelect={setSelectedNodeId}
                onApprove={handleApprove}
                onReject={handleReject}
                onEditField={handleEditField}
                onAddAfter={handleAddAfter}
                onDelete={handleDelete}
                onMoveLeft={handleMoveLeft}
                onMoveRight={handleMoveRight}
              />
              {i < nodes.length - 1 && <EdgeArrow />}
            </React.Fragment>
          ))}
          <AddStepBtn onAdd={handleAddEnd} />
        </div>
      </div>

      {/* Human-in-the-loop detail sidebar */}
      {selectedNode && (
        <StepDetailPane
          node={selectedNode}
          palette={palette}
          onClose={() => setSelectedNodeId(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          onEditNote={handleEditNote}
          onExpandPreview={(id) => setExpandedNodeId(id)}
        />
      )}

      {/* Full-screen preview modal */}
      {expandedNodeId && pipeline.nodes[expandedNodeId]?.html && (
        <div className="vb-fullscreen-overlay" onClick={() => setExpandedNodeId(null)}>
          <div className="vb-fullscreen-panel" onClick={(e) => e.stopPropagation()}>
            <div className="vb-fs-bar">
              <span>{pipeline.nodes[expandedNodeId].skeleton.icon} {pipeline.nodes[expandedNodeId].skeleton.title}</span>
              <button className="vb-fs-close" onClick={() => setExpandedNodeId(null)}>× Close</button>
            </div>
            <iframe
              title="Full preview"
              srcDoc={pipeline.nodes[expandedNodeId].html}
              sandbox="allow-scripts allow-same-origin"
              className="vb-fullscreen-iframe"
            />
          </div>
        </div>
      )}
    </div>
  );
}
