/**
 * DAGViewer — 有向无环图可视化组件
 *
 * 展示幻灯片/页面间的依赖关系
 * 支持：节点点击、状态着色、依赖连线
 */

import React, { useState, useCallback, useMemo } from 'react';
import { NODE_STATUS, EDGE_TYPE, getDAGStats } from './dagEngine.js';

/* ── 节点颜色映射 ────────────────────────────────────── */
const STATUS_COLORS = {
  [NODE_STATUS.PENDING]:     { bg: '#1e293b', border: '#475569', text: '#94a3b8', badge: 'Pending' },
  [NODE_STATUS.READY]:       { bg: '#1e3a5f', border: '#3b82f6', text: '#93c5fd', badge: 'Ready' },
  [NODE_STATUS.IN_PROGRESS]: { bg: '#2d1b3d', border: '#8b5cf6', text: '#c4b5fd', badge: 'Working' },
  [NODE_STATUS.COMPLETED]:   { bg: '#1a2e1a', border: '#22c55e', text: '#86efac', badge: '✓ Done' },
  [NODE_STATUS.ERROR]:       { bg: '#2d1515', border: '#ef4444', text: '#fca5a5', badge: '✗ Error' },
};

const EDGE_COLORS = {
  [EDGE_TYPE.DEPENDS_ON]:   '#f59e0b',
  [EDGE_TYPE.SHARES_DATA]:  '#06b6d4',
  [EDGE_TYPE.EXTENDS]:      '#8b5cf6',
  [EDGE_TYPE.NAVIGATES_TO]: '#64748b',
};

/* ── DAG 节点组件 ────────────────────────────────────── */
function DAGNode({ node, isSelected, onClick }) {
  const colors = STATUS_COLORS[node.status] || STATUS_COLORS[NODE_STATUS.PENDING];
  const NODE_W = 150;
  const NODE_H = 56;

  return (
    <g
      transform={`translate(${node.position.x}, ${node.position.y})`}
      onClick={() => onClick(node)}
      style={{ cursor: 'pointer' }}
    >
      {/* Shadow */}
      <rect
        x={2} y={2}
        width={NODE_W} height={NODE_H}
        rx={8}
        fill="rgba(0,0,0,0.4)"
      />
      {/* Body */}
      <rect
        width={NODE_W} height={NODE_H}
        rx={8}
        fill={colors.bg}
        stroke={isSelected ? '#fff' : colors.border}
        strokeWidth={isSelected ? 2.5 : 1.5}
        style={{ transition: 'all 0.2s' }}
      />
      {/* Label */}
      <text
        x={NODE_W / 2}
        y={NODE_H / 2 - 6}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={colors.text}
        fontSize="12"
        fontWeight="600"
        fontFamily="system-ui, sans-serif"
      >
        {node.label.length > 18 ? node.label.slice(0, 16) + '…' : node.label}
      </text>
      {/* Status badge */}
      <text
        x={NODE_W / 2}
        y={NODE_H / 2 + 12}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={colors.border}
        fontSize="9"
        fontFamily="system-ui, sans-serif"
      >
        {colors.badge}
      </text>
      {/* Slide index indicator */}
      {node.slideIndex !== null && (
        <circle cx={12} cy={12} r={9} fill={colors.border} opacity="0.9" />
      )}
      {node.slideIndex !== null && (
        <text x={12} y={12} textAnchor="middle" dominantBaseline="middle"
          fill="#fff" fontSize="9" fontWeight="bold" fontFamily="system-ui">
          {node.slideIndex + 1}
        </text>
      )}
    </g>
  );
}

/* ── 边/连线组件 ─────────────────────────────────────── */
function DAGEdge({ edge, fromNode, toNode }) {
  if (!fromNode || !toNode) return null;

  const NODE_W = 150;
  const NODE_H = 56;

  const x1 = fromNode.position.x + NODE_W;
  const y1 = fromNode.position.y + NODE_H / 2;
  const x2 = toNode.position.x;
  const y2 = toNode.position.y + NODE_H / 2;

  const midX = (x1 + x2) / 2;
  const color = EDGE_COLORS[edge.type] || '#64748b';

  const path = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;

  return (
    <g>
      <defs>
        <marker
          id={`arrow-${edge.id}`}
          markerWidth="8" markerHeight="6"
          refX="7" refY="3"
          orient="auto"
        >
          <path d="M 0 0 L 8 3 L 0 6 z" fill={color} opacity="0.8" />
        </marker>
      </defs>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeDasharray={edge.type === EDGE_TYPE.NAVIGATES_TO ? '4,3' : 'none'}
        markerEnd={`url(#arrow-${edge.id})`}
        opacity="0.7"
      />
      {edge.label && (
        <text
          x={midX}
          y={(y1 + y2) / 2 - 6}
          textAnchor="middle"
          fill={color}
          fontSize="9"
          fontFamily="system-ui"
          opacity="0.8"
        >
          {edge.label}
        </text>
      )}
    </g>
  );
}

/* ── 主 DAGViewer 组件 ───────────────────────────────── */
export default function DAGViewer({ dag, onNodeClick, className = '' }) {
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, scale: 1 });

  const nodes = dag ? dag.getAllNodes() : [];
  const edges = dag ? dag.getAllEdges() : [];
  const stats = dag ? getDAGStats(dag) : null;

  // 计算 SVG 画布尺寸
  const bounds = useMemo(() => {
    if (nodes.length === 0) return { minX: 0, minY: 0, maxX: 800, maxY: 400 };
    const xs = nodes.map(n => n.position.x);
    const ys = nodes.map(n => n.position.y);
    return {
      minX: Math.min(...xs) - 40,
      minY: Math.min(...ys) - 60,
      maxX: Math.max(...xs) + 200,
      maxY: Math.max(...ys) + 120,
    };
  }, [nodes]);

  const svgWidth  = Math.max(bounds.maxX - bounds.minX, 400);
  const svgHeight = Math.max(bounds.maxY - bounds.minY, 200);

  const handleNodeClick = useCallback((node) => {
    setSelectedNodeId(prev => prev === node.id ? null : node.id);
    onNodeClick?.(node);
  }, [onNodeClick]);

  if (!dag || nodes.length === 0) {
    return (
      <div className={`dag-empty ${className}`}>
        <div className="dag-empty-icon">◈</div>
        <div className="dag-empty-text">DAG will appear here after generation</div>
      </div>
    );
  }

  const selectedNode = selectedNodeId ? dag.getNode(selectedNodeId) : null;

  return (
    <div className={`dag-viewer ${className}`}>
      {/* ── Stats Bar ──────────────────────────────────── */}
      {stats && (
        <div className="dag-stats-bar">
          <span className="dag-stat">
            <span className="dag-stat-val">{stats.totalNodes}</span>
            <span className="dag-stat-lbl">Nodes</span>
          </span>
          <span className="dag-stat-sep">·</span>
          <span className="dag-stat">
            <span className="dag-stat-val">{stats.totalEdges}</span>
            <span className="dag-stat-lbl">Edges</span>
          </span>
          <span className="dag-stat-sep">·</span>
          <span className="dag-stat">
            <span className="dag-stat-val">{stats.parallelGroups}</span>
            <span className="dag-stat-lbl">Layers</span>
          </span>
          <span className="dag-stat-sep">·</span>
          <span className="dag-stat">
            <span className="dag-stat-val dag-stat-val--green">{stats.completedNodes}</span>
            <span className="dag-stat-lbl">Done</span>
          </span>
          <span className="dag-stat-sep">·</span>
          <span className="dag-stat">
            <span className="dag-stat-val dag-stat-val--blue">{stats.readyNodes}</span>
            <span className="dag-stat-lbl">Ready</span>
          </span>
          {stats.maxParallelism > 1 && (
            <>
              <span className="dag-stat-sep">·</span>
              <span className="dag-stat dag-stat--highlight">
                <span className="dag-stat-val">×{stats.maxParallelism}</span>
                <span className="dag-stat-lbl">Max Parallel</span>
              </span>
            </>
          )}
        </div>
      )}

      {/* ── SVG Graph ─────────────────────────────────── */}
      <div className="dag-canvas-wrap">
        <svg
          viewBox={`${bounds.minX} ${bounds.minY} ${svgWidth} ${svgHeight}`}
          width="100%"
          height="100%"
          className="dag-svg"
        >
          {/* Edges first (behind nodes) */}
          <g className="dag-edges">
            {edges.map(edge => (
              <DAGEdge
                key={edge.id}
                edge={edge}
                fromNode={dag.getNode(edge.from)}
                toNode={dag.getNode(edge.to)}
              />
            ))}
          </g>
          {/* Nodes */}
          <g className="dag-nodes">
            {nodes.map(node => (
              <DAGNode
                key={node.id}
                node={node}
                isSelected={selectedNodeId === node.id}
                onClick={handleNodeClick}
              />
            ))}
          </g>
        </svg>
      </div>

      {/* ── Node Detail Panel ─────────────────────────── */}
      {selectedNode && (
        <div className="dag-detail">
          <div className="dag-detail-header">
            <span className="dag-detail-title">{selectedNode.label}</span>
            <button className="dag-detail-close" onClick={() => setSelectedNodeId(null)}>×</button>
          </div>
          <div className="dag-detail-body">
            <div className="dag-detail-row">
              <span className="dag-detail-key">Status</span>
              <span className="dag-detail-val" style={{ color: STATUS_COLORS[selectedNode.status]?.border }}>
                {STATUS_COLORS[selectedNode.status]?.badge || selectedNode.status}
              </span>
            </div>
            {selectedNode.description && (
              <div className="dag-detail-row">
                <span className="dag-detail-key">Description</span>
                <span className="dag-detail-val">{selectedNode.description}</span>
              </div>
            )}
            {selectedNode.dependencies.length > 0 && (
              <div className="dag-detail-row">
                <span className="dag-detail-key">Depends On</span>
                <div className="dag-detail-deps">
                  {selectedNode.dependencies.map(depId => {
                    const depNode = dag.getNode(depId);
                    return (
                      <span key={depId} className="dag-dep-tag"
                        onClick={() => handleNodeClick(depNode)}>
                        {depNode?.label || depId}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            {selectedNode.dependents.length > 0 && (
              <div className="dag-detail-row">
                <span className="dag-detail-key">Required By</span>
                <div className="dag-detail-deps">
                  {selectedNode.dependents.map(depId => {
                    const depNode = dag.getNode(depId);
                    return (
                      <span key={depId} className="dag-dep-tag dag-dep-tag--out"
                        onClick={() => handleNodeClick(depNode)}>
                        {depNode?.label || depId}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            {selectedNode.slideIndex !== null && (
              <div className="dag-detail-row">
                <span className="dag-detail-key">Slide</span>
                <span className="dag-detail-val">#{selectedNode.slideIndex + 1}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Legend ────────────────────────────────────── */}
      <div className="dag-legend">
        <span className="dag-legend-title">Edge types:</span>
        {Object.entries(EDGE_COLORS).map(([type, color]) => (
          <span key={type} className="dag-legend-item">
            <span className="dag-legend-dot" style={{ background: color }} />
            <span className="dag-legend-label">{type.replace('_', ' ')}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
