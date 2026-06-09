/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  Bifrost Pipeline — Intermediate Representation (IR) Types  ║
 * ║  Inspired by: LLM4Workflow (DAG), InstructPipe, Flowco       ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Core idea from PPT slide 4 (学术基石):
 *   "我们将晦涩的图论与伪代码，转化为大众最熟悉的 PPT 排版范式"
 *
 * A pipeline is modeled as a DAG (Directed Acyclic Graph) of nodes.
 * Each node has:
 *   - An IR skeleton (visual intermediate representation)
 *   - A status in the state machine
 *   - An optional compiled HTML preview
 */

/* ─── Node Status State Machine ───────────────────────────────
 *
 *  idle ──► skeleton_pending ──► skeleton_ready
 *                                      │
 *                               user_reviewing
 *                                 │         │
 *                           approved      rejected
 *                              │              │
 *                        compiling         revising
 *                              │
 *                           compiled
 *
 * ─────────────────────────────────────────────────────────── */
export const NODE_STATUS = {
  IDLE:             'idle',
  SKELETON_PENDING: 'skeleton_pending',
  SKELETON_READY:   'skeleton_ready',
  USER_REVIEWING:   'user_reviewing',
  APPROVED:         'approved',
  REJECTED:         'rejected',
  REVISING:         'revising',
  COMPILING:        'compiling',
  COMPILED:         'compiled',
  ERROR:            'error',
};

/* ─── Node Types ──────────────────────────────────────────── */
export const NODE_TYPE = {
  // Data ingestion
  SOURCE:    'source',
  INGEST:    'ingest',
  // Processing
  TRANSFORM: 'transform',
  VALIDATE:  'validate',
  FILTER:    'filter',
  ENRICH:    'enrich',
  // Analysis
  ANALYZE:   'analyze',
  MODEL:     'model',
  // Output
  VISUALIZE: 'visualize',
  EXPORT:    'export',
  NOTIFY:    'notify',
  // Custom
  CUSTOM:    'custom',
};

/* ─── Node Skeleton (IR) ──────────────────────────────────── */
/**
 * NodeSkeleton = the "PPT slide" intermediate representation.
 * This is what the user sees and tweaks BEFORE compilation.
 * Fields mirror a PPT block layout that anyone can understand.
 */
export function createNodeSkeleton(overrides = {}) {
  return {
    // Displayed on the Visual Block card
    icon:        overrides.icon        || '🔷',
    title:       overrides.title       || 'Untitled Step',
    subtitle:    overrides.subtitle    || '',
    description: overrides.description || '',
    // Pseudocode preview (from InstructPipe concept)
    pseudocode:  overrides.pseudocode  || '',
    // Input / Output schema hints (shown as tag pills)
    inputs:      overrides.inputs      || [],   // string[]
    outputs:     overrides.outputs     || [],   // string[]
    // Visual style hint for the block
    colorKey:    overrides.colorKey    || 0,    // index into palette
  };
}

/* ─── Pipeline Node ───────────────────────────────────────── */
export function createNode(overrides = {}) {
  const id = overrides.id || `node_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  return {
    id,
    type:       overrides.type       || NODE_TYPE.CUSTOM,
    status:     overrides.status     || NODE_STATUS.IDLE,
    skeleton:   overrides.skeleton   || createNodeSkeleton(),
    html:       overrides.html       || '',       // compiled preview HTML
    // User feedback collected during Human-in-the-loop review
    userNote:   overrides.userNote   || '',
    approved:   overrides.approved   || false,
    // Position in the canvas grid (column, row)
    col:        overrides.col        ?? 0,
    row:        overrides.row        ?? 0,
  };
}

/* ─── Pipeline IR ─────────────────────────────────────────── */
export function createPipeline(overrides = {}) {
  return {
    id:          overrides.id          || `pipe_${Date.now()}`,
    title:       overrides.title       || 'New Pipeline',
    summary:     overrides.summary     || '',
    // Ordered node IDs defining the linear path (for display)
    // Real DAG edges stored in `edges`
    nodeOrder:   overrides.nodeOrder   || [],
    nodes:       overrides.nodes       || {},     // Record<id, Node>
    // DAG edges: [{ from: id, to: id }]
    edges:       overrides.edges       || [],
    // Overall pipeline phase
    phase:       overrides.phase       || 'idle', // idle | generating | reviewing | compiling | done
    isAiGenerated: overrides.isAiGenerated || false,
    createdAt:   overrides.createdAt   || new Date().toISOString(),
  };
}

/* ─── Helper: get ordered nodes array ─────────────────────── */
export function getOrderedNodes(pipeline) {
  return pipeline.nodeOrder
    .map((id) => pipeline.nodes[id])
    .filter(Boolean);
}

/* ─── Helper: update node in pipeline (immutable) ─────────── */
export function updateNode(pipeline, nodeId, patch) {
  return {
    ...pipeline,
    nodes: {
      ...pipeline.nodes,
      [nodeId]: { ...pipeline.nodes[nodeId], ...patch },
    },
  };
}

/* ─── Helper: update node skeleton ───────────────────────── */
export function updateNodeSkeleton(pipeline, nodeId, skeletonPatch) {
  const node = pipeline.nodes[nodeId];
  if (!node) return pipeline;
  return updateNode(pipeline, nodeId, {
    skeleton: { ...node.skeleton, ...skeletonPatch },
  });
}

/* ─── Step icon map (from PPT concept) ─────────────────────── */
export const STEP_ICONS = {
  ingest: '📥', collect: '📥', import: '📥', input: '📥', source: '📥', load: '📥',
  stream: '🌊', realtime: '🌊', queue: '🌊', buffer: '🌊', event: '🌊',
  validate: '🔍', check: '🔍', verify: '🔍', inspect: '🔍', test: '🔍',
  clean: '🧹', sanitize: '🧹', filter: '🧹', dedupe: '🧹',
  transform: '⚙️', process: '⚙️', convert: '⚙️', parse: '⚙️', enrich: '⚙️',
  join: '🔗', merge: '🔗', combine: '🔗', aggregate: '🔗',
  analyze: '📊', analyse: '📊', compute: '📊', metrics: '📊', score: '📊',
  model: '🤖', train: '🤖', predict: '🤖', infer: '🤖', evaluate: '🤖',
  visualize: '📈', visualise: '📈', chart: '📈', report: '📈', dashboard: '📈',
  store: '💾', save: '💾', persist: '💾', write: '💾',
  export: '📤', send: '📤', deliver: '📤', publish: '📤', output: '📤',
  notify: '🔔', alert: '🔔', monitor: '🔔', watch: '🔔',
  auth: '🔐', secure: '🔐', encrypt: '🔐',
  api: '🌐', fetch: '🌐', request: '🌐', sync: '🌐',
  cache: '⚡', index: '⚡', optimize: '⚡',
};

export function inferStepIcon(title = '') {
  const key = title.toLowerCase().replace(/[^a-z]/g, '');
  for (const [word, icon] of Object.entries(STEP_ICONS)) {
    if (key.includes(word)) return icon;
  }
  return '🔷';
}

/* ─── Color Palettes ──────────────────────────────────────── */
export const NODE_PALETTE_LIGHT = [
  { bg: '#eff6ff', border: '#bfdbfe', num: '#1d4ed8', icon: '#3b82f6', label: 'Blue'   },
  { bg: '#f0fdf4', border: '#bbf7d0', num: '#15803d', icon: '#22c55e', label: 'Green'  },
  { bg: '#fdf4ff', border: '#e9d5ff', num: '#7e22ce', icon: '#a855f7', label: 'Purple' },
  { bg: '#fff7ed', border: '#fed7aa', num: '#c2410c', icon: '#f97316', label: 'Orange' },
  { bg: '#f0f9ff', border: '#bae6fd', num: '#0369a1', icon: '#0ea5e9', label: 'Sky'    },
  { bg: '#fefce8', border: '#fef08a', num: '#854d0e', icon: '#eab308', label: 'Yellow' },
  { bg: '#fff1f2', border: '#fecdd3', num: '#9f1239', icon: '#f43f5e', label: 'Rose'   },
  { bg: '#f0fdfa', border: '#99f6e4', num: '#0f766e', icon: '#14b8a6', label: 'Teal'   },
];

export const NODE_PALETTE_DARK = [
  { bg: '#1e3a5f', border: '#1d4ed8', num: '#93c5fd', icon: '#60a5fa', label: 'Blue'   },
  { bg: '#14532d', border: '#15803d', num: '#86efac', icon: '#4ade80', label: 'Green'  },
  { bg: '#2e1065', border: '#7e22ce', num: '#d8b4fe', icon: '#c084fc', label: 'Purple' },
  { bg: '#431407', border: '#c2410c', num: '#fdba74', icon: '#fb923c', label: 'Orange' },
  { bg: '#0c4a6e', border: '#0369a1', num: '#7dd3fc', icon: '#38bdf8', label: 'Sky'    },
  { bg: '#422006', border: '#854d0e', num: '#fde047', icon: '#facc15', label: 'Yellow' },
  { bg: '#4c0519', border: '#9f1239', num: '#fda4af', icon: '#fb7185', label: 'Rose'   },
  { bg: '#134e4a', border: '#0f766e', num: '#5eead4', icon: '#2dd4bf', label: 'Teal'   },
];
