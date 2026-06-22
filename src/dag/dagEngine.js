/**
 * DAG Engine — Directed Acyclic Graph Workflow Engine
 *
 * 实现 LLM4Workflow 概念：
 *   - 将网站页面/组件建模为 DAG 节点
 *   - 节点间依赖关系（如"购物车"依赖"用户登录"）
 *   - 拓扑排序决定生成顺序
 *   - 支持并行生成（无依赖的节点可同时处理）
 */

/* ═══════════════════════════════════════════════════════
   DAG 节点类型定义
   ═══════════════════════════════════════════════════════ */

export const NODE_TYPE = {
  PAGE:       'page',        // 整个页面/路由
  SECTION:    'section',     // 页面区块（Hero、Features等）
  COMPONENT:  'component',   // 具体UI组件（Button、Card等）
  DATA:       'data',        // 数据依赖（API、State等）
  LAYOUT:     'layout',      // 布局容器
};

export const EDGE_TYPE = {
  DEPENDS_ON:   'depends_on',    // A 依赖 B（A必须在B之后生成）
  SHARES_DATA:  'shares_data',   // A 与 B 共享数据
  EXTENDS:      'extends',       // A 继承/扩展 B
  NAVIGATES_TO: 'navigates_to',  // A 包含跳转到 B 的链接
};

export const NODE_STATUS = {
  PENDING:    'pending',
  READY:      'ready',       // 所有依赖已完成，可以生成
  IN_PROGRESS:'in_progress',
  COMPLETED:  'completed',
  ERROR:      'error',
};

/* ═══════════════════════════════════════════════════════
   工厂函数
   ═══════════════════════════════════════════════════════ */

let _nodeCounter = 0;
export function createNode(overrides = {}) {
  const id = overrides.id || `node_${++_nodeCounter}_${Date.now().toString(36)}`;
  return {
    id,
    type:        overrides.type        || NODE_TYPE.SECTION,
    label:       overrides.label       || 'Untitled Node',
    description: overrides.description || '',
    status:      overrides.status      || NODE_STATUS.PENDING,
    slideIndex:  overrides.slideIndex  ?? null,  // 对应的幻灯片索引
    dependencies: [],  // 依赖的节点 ID 列表（这些节点必须先完成）
    dependents:  [],   // 依赖此节点的节点 ID 列表
    metadata:    overrides.metadata    || {},
    position:    overrides.position    || { x: 0, y: 0 },  // 可视化位置
    ...overrides,
    id,
    dependencies: overrides.dependencies || [],
    dependents:   overrides.dependents   || [],
  };
}

export function createEdge(fromId, toId, type = EDGE_TYPE.DEPENDS_ON, label = '') {
  return {
    id:    `edge_${fromId}_${toId}`,
    from:  fromId,
    to:    toId,
    type,
    label,
  };
}

/* ═══════════════════════════════════════════════════════
   DAG 核心类
   ═══════════════════════════════════════════════════════ */

export class DAGEngine {
  constructor() {
    this.nodes = new Map();   // nodeId → node
    this.edges = new Map();   // edgeId → edge
  }

  /* ── 节点管理 ─────────────────────────────────────── */

  addNode(node) {
    this.nodes.set(node.id, { ...node });
    return this;
  }

  updateNode(nodeId, patch) {
    const node = this.nodes.get(nodeId);
    if (node) this.nodes.set(nodeId, { ...node, ...patch });
    return this;
  }

  removeNode(nodeId) {
    this.nodes.delete(nodeId);
    // 删除相关边
    this.edges.forEach((edge, edgeId) => {
      if (edge.from === nodeId || edge.to === nodeId) {
        this.edges.delete(edgeId);
      }
    });
    // 清理其他节点的依赖
    this.nodes.forEach(node => {
      node.dependencies = node.dependencies.filter(d => d !== nodeId);
      node.dependents   = node.dependents.filter(d => d !== nodeId);
    });
    return this;
  }

  /* ── 边管理 ───────────────────────────────────────── */

  addEdge(fromId, toId, type = EDGE_TYPE.DEPENDS_ON, label = '') {
    if (!this.nodes.has(fromId) || !this.nodes.has(toId)) {
      console.warn(`[DAG] Cannot add edge: node not found (${fromId} → ${toId})`);
      return this;
    }

    // 检查是否会产生循环
    if (this._wouldCreateCycle(fromId, toId)) {
      console.warn(`[DAG] Cycle detected: cannot add edge ${fromId} → ${toId}`);
      return this;
    }

    const edge = createEdge(fromId, toId, type, label);
    this.edges.set(edge.id, edge);

    // 更新节点的 dependencies/dependents
    const fromNode = this.nodes.get(fromId);
    const toNode   = this.nodes.get(toId);

    if (type === EDGE_TYPE.DEPENDS_ON) {
      // fromId depends on toId (fromId → toId 意为 fromId 依赖 toId)
      if (!fromNode.dependencies.includes(toId)) {
        fromNode.dependencies = [...fromNode.dependencies, toId];
      }
      if (!toNode.dependents.includes(fromId)) {
        toNode.dependents = [...toNode.dependents, fromId];
      }
    }

    return this;
  }

  removeEdge(edgeId) {
    const edge = this.edges.get(edgeId);
    if (edge) {
      const fromNode = this.nodes.get(edge.from);
      const toNode   = this.nodes.get(edge.to);
      if (fromNode) fromNode.dependencies = fromNode.dependencies.filter(d => d !== edge.to);
      if (toNode)   toNode.dependents     = toNode.dependents.filter(d => d !== edge.from);
      this.edges.delete(edgeId);
    }
    return this;
  }

  /* ── 拓扑排序 (Kahn's Algorithm) ────────────────── */

  /**
   * 拓扑排序 — 返回节点的合法执行顺序
   * @returns {Array<string>} 按依赖顺序排列的节点 ID 数组
   * @throws {Error} 如果检测到循环依赖
   */
  topologicalSort() {
    const inDegree = new Map();
    this.nodes.forEach((_, id) => inDegree.set(id, 0));

    this.edges.forEach(edge => {
      if (edge.type === EDGE_TYPE.DEPENDS_ON) {
        inDegree.set(edge.from, (inDegree.get(edge.from) || 0) + 1);
      }
    });

    const queue = [];
    inDegree.forEach((degree, id) => {
      if (degree === 0) queue.push(id);
    });

    const sorted = [];
    while (queue.length > 0) {
      const nodeId = queue.shift();
      sorted.push(nodeId);

      const node = this.nodes.get(nodeId);
      (node?.dependents || []).forEach(depId => {
        const newDegree = (inDegree.get(depId) || 0) - 1;
        inDegree.set(depId, newDegree);
        if (newDegree === 0) queue.push(depId);
      });
    }

    if (sorted.length !== this.nodes.size) {
      throw new Error('[DAG] Circular dependency detected!');
    }

    return sorted;
  }

  /**
   * 获取并行执行组 — 同一组内的节点可以并行生成
   * @returns {Array<Array<string>>} 按层级分组的节点 ID
   */
  getParallelGroups() {
    const inDegree = new Map();
    this.nodes.forEach((_, id) => inDegree.set(id, 0));

    this.edges.forEach(edge => {
      if (edge.type === EDGE_TYPE.DEPENDS_ON) {
        inDegree.set(edge.from, (inDegree.get(edge.from) || 0) + 1);
      }
    });

    const groups = [];
    const remaining = new Set(this.nodes.keys());

    while (remaining.size > 0) {
      const group = [];
      remaining.forEach(id => {
        if (inDegree.get(id) === 0) group.push(id);
      });

      if (group.length === 0) break; // 检测到循环

      groups.push(group);
      group.forEach(nodeId => {
        remaining.delete(nodeId);
        const node = this.nodes.get(nodeId);
        (node?.dependents || []).forEach(depId => {
          inDegree.set(depId, (inDegree.get(depId) || 0) - 1);
        });
      });
    }

    return groups;
  }

  /**
   * 更新节点状态，同时刷新依赖节点的 READY 状态
   */
  markNodeCompleted(nodeId) {
    this.updateNode(nodeId, { status: NODE_STATUS.COMPLETED });

    // 检查所有依赖此节点的节点是否已经 READY
    const node = this.nodes.get(nodeId);
    (node?.dependents || []).forEach(depId => {
      const depNode = this.nodes.get(depId);
      if (!depNode) return;
      const allDepsCompleted = depNode.dependencies.every(dId => {
        const dNode = this.nodes.get(dId);
        return dNode?.status === NODE_STATUS.COMPLETED;
      });
      if (allDepsCompleted) {
        this.updateNode(depId, { status: NODE_STATUS.READY });
      }
    });

    return this;
  }

  /* ── 查询方法 ─────────────────────────────────────── */

  getNode(id) { return this.nodes.get(id); }
  getEdge(id) { return this.edges.get(id); }
  getAllNodes() { return Array.from(this.nodes.values()); }
  getAllEdges() { return Array.from(this.edges.values()); }

  getReadyNodes() {
    return this.getAllNodes().filter(n => n.status === NODE_STATUS.READY);
  }

  getRootNodes() {
    return this.getAllNodes().filter(n => n.dependencies.length === 0);
  }

  getLeafNodes() {
    return this.getAllNodes().filter(n => n.dependents.length === 0);
  }

  /* ── 循环检测 ─────────────────────────────────────── */

  _wouldCreateCycle(fromId, toId) {
    // DFS 从 toId 开始，看能否到达 fromId
    const visited = new Set();
    const stack = [toId];
    while (stack.length > 0) {
      const curr = stack.pop();
      if (curr === fromId) return true;
      if (visited.has(curr)) continue;
      visited.add(curr);
      const node = this.nodes.get(curr);
      (node?.dependents || []).forEach(d => stack.push(d));
    }
    return false;
  }

  /* ── 序列化 ───────────────────────────────────────── */

  toJSON() {
    return {
      nodes: this.getAllNodes(),
      edges: this.getAllEdges(),
    };
  }

  static fromJSON(data) {
    const dag = new DAGEngine();
    (data.nodes || []).forEach(n => dag.addNode(n));
    (data.edges || []).forEach(e => {
      dag.edges.set(e.id, e);
    });
    return dag;
  }

  /* ── 可视化布局计算（分层布局）────────────────────── */

  computeLayout(nodeWidth = 160, nodeHeight = 60, hGap = 80, vGap = 60) {
    const groups = this.getParallelGroups();
    const totalLayers = groups.length;

    groups.forEach((group, layerIdx) => {
      const groupSize = group.length;
      group.forEach((nodeId, i) => {
        const x = layerIdx * (nodeWidth + hGap);
        const y = i * (nodeHeight + vGap) - ((groupSize - 1) * (nodeHeight + vGap)) / 2;
        this.updateNode(nodeId, { position: { x, y } });
      });
    });

    return {
      width:  totalLayers * (nodeWidth + hGap),
      height: Math.max(...groups.map(g => g.length)) * (nodeHeight + vGap),
    };
  }
}

/* ═══════════════════════════════════════════════════════
   AI 驱动的 DAG 生成
   ═══════════════════════════════════════════════════════ */

/**
 * 根据用户需求 + slides 自动构建 DAG
 * 分析幻灯片间的依赖关系
 */
export function buildDAGFromSlides(slides, userPrompt = '') {
  const dag = new DAGEngine();

  if (!slides || slides.length === 0) return dag;

  // 创建节点
  slides.forEach((slide, idx) => {
    const node = createNode({
      id:          `node_slide_${idx}`,
      type:        NODE_TYPE.SECTION,
      label:       slide.name || `Slide ${idx + 1}`,
      description: `Section: ${slide.name}`,
      slideIndex:  idx,
      status:      idx === 0 ? NODE_STATUS.READY : NODE_STATUS.PENDING,
      metadata:    {
        bgColor: slide.bgColor,
        blocks:  (slide.blocks || []).map(b => b.type),
      },
    });
    dag.addNode(node);
  });

  // 分析依赖关系（基于幻灯片内容类型）
  const nodeIds = slides.map((_, idx) => `node_slide_${idx}`);

  slides.forEach((slide, idx) => {
    const hasNav    = (slide.blocks || []).some(b => b.type === 'nav');
    const hasFooter = slide.name?.toLowerCase().includes('footer');
    const hasHero   = (slide.blocks || []).some(b => b.type === 'hero');
    const hasCart   = slide.name?.toLowerCase().includes('cart');
    const hasLogin  = slide.name?.toLowerCase().includes('login') || slide.name?.toLowerCase().includes('auth');

    // 购物车依赖登录
    if (hasCart) {
      const loginIdx = slides.findIndex((s, i) =>
        s.name?.toLowerCase().includes('login') || s.name?.toLowerCase().includes('auth')
      );
      if (loginIdx >= 0 && loginIdx !== idx) {
        dag.addEdge(`node_slide_${idx}`, `node_slide_${loginIdx}`, EDGE_TYPE.DEPENDS_ON, 'requires auth');
      }
    }

    // Navbar 是所有 Section 的前置（如果存在的话且不是自身）
    if (!hasNav && idx > 0) {
      const navIdx = slides.findIndex(s => (s.blocks || []).some(b => b.type === 'nav'));
      if (navIdx >= 0 && navIdx !== idx) {
        dag.addEdge(`node_slide_${idx}`, `node_slide_${navIdx}`, EDGE_TYPE.DEPENDS_ON, 'needs nav');
      }
    }

    // Footer 依赖所有内容区块
    if (hasFooter) {
      slides.forEach((_, depIdx) => {
        if (depIdx !== idx) {
          const depSlide = slides[depIdx];
          const depHasFooter = depSlide.name?.toLowerCase().includes('footer');
          if (!depHasFooter) {
            dag.addEdge(`node_slide_${idx}`, `node_slide_${depIdx}`, EDGE_TYPE.DEPENDS_ON, 'footer after content');
          }
        }
      });
    }

    // 页面间导航关系（顺序关联）
    if (idx > 0 && !hasNav && !hasFooter) {
      dag.addEdge(`node_slide_${idx}`, `node_slide_${idx - 1}`, EDGE_TYPE.NAVIGATES_TO, 'page flow');
    }
  });

  // 计算可视化布局
  dag.computeLayout();

  // 更新初始 READY 状态
  dag.getRootNodes().forEach(n => {
    dag.updateNode(n.id, { status: NODE_STATUS.READY });
  });

  return dag;
}

/**
 * 将 DAG 转为 Mermaid 语法（用于文档/展示）
 */
export function dagToMermaid(dag) {
  const lines = ['graph LR'];
  dag.getAllNodes().forEach(node => {
    lines.push(`  ${node.id}["${node.label}"]`);
  });
  dag.getAllEdges().forEach(edge => {
    const label = edge.label ? `|${edge.label}|` : '';
    lines.push(`  ${edge.from} -->${label} ${edge.to}`);
  });
  return lines.join('\n');
}

/**
 * 获取 DAG 统计信息
 */
export function getDAGStats(dag) {
  const nodes = dag.getAllNodes();
  const edges = dag.getAllEdges();
  const groups = dag.getParallelGroups();

  return {
    totalNodes:      nodes.length,
    totalEdges:      edges.length,
    parallelGroups:  groups.length,
    maxParallelism:  Math.max(...groups.map(g => g.length), 1),
    rootNodes:       dag.getRootNodes().length,
    leafNodes:       dag.getLeafNodes().length,
    completedNodes:  nodes.filter(n => n.status === NODE_STATUS.COMPLETED).length,
    readyNodes:      nodes.filter(n => n.status === NODE_STATUS.READY).length,
  };
}
