/**
 * Pipeline PPT-IR — Intermediate Representation (PPT 模式)
 *
 * PPT 核心概念 (来自 Visual_AI_Web_Engine.pptx):
 *   - 每个 pipeline 节点 = 一张"幻灯片" (Slide)
 *   - 幻灯片包含多种内容块 (SlideBlock): 标题/文本/代码/图表/图片/数据表
 *   - AI 生成骨架 → 用户 PPT 式编辑 → 系统编译为代码
 *   - Human-in-the-loop: 每张幻灯片独立审批
 */

/* ── 内容块类型 ─────────────────────────────────────────────── */
export const BLOCK_TYPE = {
  TITLE:     'title',      // 大标题
  TEXT:      'text',       // 段落文本
  CODE:      'code',       // 代码/伪代码
  CHART:     'chart',      // 数据图表 (饼图/折线/柱状)
  IMAGE:     'image',      // 图片占位框
  TABLE:     'table',      // 数据表格
  BADGE:     'badge',      // 状态徽章列表
  CONNECTOR: 'connector',  // 连接器/IO 标注
};

/* ── 幻灯片布局模板 ─────────────────────────────────────────── */
export const SLIDE_LAYOUT = {
  TITLE_ONLY:     'title_only',      // 纯标题 + 副标题
  TITLE_CONTENT:  'title_content',   // 标题 + 内容块
  TWO_COLUMN:     'two_column',      // 左右双栏
  CODE_PREVIEW:   'code_preview',    // 左代码 + 右预览
  FULL_CHART:     'full_chart',      // 全幅图表
  CHECKLIST:      'checklist',       // 清单式
};

/* ── 幻灯片状态 ─────────────────────────────────────────────── */
export const SLIDE_STATUS = {
  IDLE:      'idle',       // 未生成
  SKELETON:  'skeleton',   // 骨架已生成，待审批
  EDITING:   'editing',    // 用户正在编辑
  APPROVED:  'approved',   // 用户已审批
  COMPILING: 'compiling',  // AI 正在编译为代码
  COMPILED:  'compiled',   // 编译完成（有 html）
  REJECTED:  'rejected',   // 拒绝，需修订
  ERROR:     'error',      // 编译出错
};

/* ── 整体管道阶段 ────────────────────────────────────────────── */
export const PIPELINE_PHASE = {
  IDLE:      'idle',
  PARSING:   'parsing',    // 意图解析
  SKELETON:  'skeleton',   // 生成骨架幻灯片
  REVIEW:    'review',     // 等待用户审批
  COMPILING: 'compiling',  // 逐片编译
  DONE:      'done',       // 全部完成
};

/* ── 颜色主题（对应 PPT 里的色块系统）─────────────────────── */
export const SLIDE_THEMES = [
  { bg: '#1e3a5f', accent: '#60a5fa', text: '#e0f2fe', border: '#3b82f6' },  // 深蓝
  { bg: '#1a2e1a', accent: '#4ade80', text: '#dcfce7', border: '#22c55e' },  // 深绿
  { bg: '#2d1b3d', accent: '#c084fc', text: '#f3e8ff', border: '#a855f7' },  // 深紫
  { bg: '#2d1f0f', accent: '#fb923c', text: '#fff7ed', border: '#f97316' },  // 深橙
  { bg: '#1f2937', accent: '#94a3b8', text: '#f1f5f9', border: '#64748b' },  // 深灰
  { bg: '#1c2537', accent: '#38bdf8', text: '#e0f2fe', border: '#0ea5e9' },  // 科技蓝
];

/* ── 工厂函数 ────────────────────────────────────────────────── */

/** 创建一个内容块 */
export function createBlock(overrides = {}) {
  const id = `block_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  return {
    id,
    type:     overrides.type     ?? BLOCK_TYPE.TEXT,
    content:  overrides.content  ?? '',
    language: overrides.language ?? 'python',   // for CODE blocks
    caption:  overrides.caption  ?? '',
    // 位置 (相对幻灯片画布, %)
    x:        overrides.x        ?? 5,
    y:        overrides.y        ?? 10,
    w:        overrides.w        ?? 90,
    h:        overrides.h        ?? 20,
    style:    overrides.style    ?? {},          // 额外样式覆盖
    ...overrides,
    id,
  };
}

/** 创建一张幻灯片 */
export function createSlide(overrides = {}) {
  const id = `slide_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const themeIdx = overrides.themeIndex ?? Math.floor(Math.random() * SLIDE_THEMES.length);
  return {
    id,
    status:      overrides.status     ?? SLIDE_STATUS.IDLE,
    layout:      overrides.layout     ?? SLIDE_LAYOUT.TITLE_CONTENT,
    themeIndex:  themeIdx,
    theme:       SLIDE_THEMES[themeIdx],
    // 标识信息
    stepTitle:   overrides.stepTitle  ?? 'New Step',
    stepType:    overrides.stepType   ?? 'custom',
    stepIcon:    overrides.stepIcon   ?? '🔹',
    description: overrides.description ?? '',
    // 内容块列表（按 y 轴排列）
    blocks:      overrides.blocks     ?? [],
    // I/O 标注
    inputs:      overrides.inputs     ?? [],
    outputs:     overrides.outputs    ?? [],
    // Human-in-the-loop
    reviewNote:  overrides.reviewNote ?? '',
    // 编译结果
    html:        overrides.html       ?? '',
    compiledAt:  null,
    ...overrides,
    id,
    theme: SLIDE_THEMES[themeIdx],
  };
}

/** 创建整个管道 */
export function createPipeline(overrides = {}) {
  return {
    id:         `pipe_${Date.now()}`,
    title:      overrides.title    ?? 'Untitled Pipeline',
    summary:    overrides.summary  ?? '',
    phase:      overrides.phase    ?? PIPELINE_PHASE.IDLE,
    slideOrder: overrides.slideOrder ?? [],
    slides:     overrides.slides   ?? {},
    isAiGenerated: overrides.isAiGenerated ?? false,
    createdAt:  Date.now(),
    ...overrides,
  };
}

/* ── 幻灯片 CRUD 辅助 ────────────────────────────────────────── */

export function updateSlide(pipeline, slideId, patch) {
  if (!pipeline.slides[slideId]) return pipeline;
  return {
    ...pipeline,
    slides: {
      ...pipeline.slides,
      [slideId]: { ...pipeline.slides[slideId], ...patch },
    },
  };
}

export function updateBlock(pipeline, slideId, blockId, patch) {
  const slide = pipeline.slides[slideId];
  if (!slide) return pipeline;
  return updateSlide(pipeline, slideId, {
    blocks: slide.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b)),
  });
}

export function addSlide(pipeline, slide, afterId = null) {
  const order = [...pipeline.slideOrder];
  const idx = afterId ? order.indexOf(afterId) : order.length - 1;
  order.splice(idx + 1, 0, slide.id);
  return {
    ...pipeline,
    slideOrder: order,
    slides: { ...pipeline.slides, [slide.id]: slide },
  };
}

export function removeSlide(pipeline, slideId) {
  const order = pipeline.slideOrder.filter((id) => id !== slideId);
  const slides = { ...pipeline.slides };
  delete slides[slideId];
  return { ...pipeline, slideOrder: order, slides };
}

export function moveSlide(pipeline, slideId, direction) {
  const order = [...pipeline.slideOrder];
  const idx = order.indexOf(slideId);
  if (direction === 'left' && idx > 0) {
    [order[idx - 1], order[idx]] = [order[idx], order[idx - 1]];
  } else if (direction === 'right' && idx < order.length - 1) {
    [order[idx + 1], order[idx]] = [order[idx], order[idx + 1]];
  }
  return { ...pipeline, slideOrder: order };
}

/* ── Icon 推断 ───────────────────────────────────────────────── */
export function inferStepIcon(title = '') {
  const t = title.toLowerCase();
  if (t.includes('ingest') || t.includes('input') || t.includes('collect')) return '📥';
  if (t.includes('valid') || t.includes('check') || t.includes('verify'))   return '✅';
  if (t.includes('clean') || t.includes('transform') || t.includes('process')) return '🔄';
  if (t.includes('analyz') || t.includes('model') || t.includes('train'))   return '🧠';
  if (t.includes('export') || t.includes('output') || t.includes('deploy')) return '🚀';
  if (t.includes('fetch') || t.includes('api') || t.includes('request'))    return '🌐';
  if (t.includes('store') || t.includes('save') || t.includes('database'))  return '🗄️';
  if (t.includes('notify') || t.includes('alert') || t.includes('send'))    return '📢';
  if (t.includes('filter') || t.includes('select') || t.includes('query'))  return '🔍';
  if (t.includes('join') || t.includes('merge') || t.includes('combine'))   return '🔗';
  return '🔷';
}

/* ── 默认管道（展示用）────────────────────────────────────────── */
export function buildDefaultPipeline() {
  const steps = [
    { icon: '📥', title: 'Data Ingest',  type: 'ingest',    layout: SLIDE_LAYOUT.TITLE_CONTENT, themeIndex: 0,
      desc: 'Collect raw data from APIs, forms, files, or event streams.',
      pseudocode: '# Stage 1: Ingest\nsource = DataSource(config)\nraw = source.fetch(start=T0, end=T1)\nvalidate_schema(raw)',
      inputs: ['CSV File', 'REST API'], outputs: ['Raw DataFrame'] },
    { icon: '✅', title: 'Validate',     type: 'validate',  layout: SLIDE_LAYOUT.TWO_COLUMN,   themeIndex: 1,
      desc: 'Check schema completeness, data types, and constraint violations.',
      pseudocode: '# Stage 2: Validate\nschema.check(raw)\nassert no_nulls(raw, cols=required)\nreport = quality_report(raw)',
      inputs: ['Raw DataFrame'], outputs: ['Validated Data', 'Error Report'] },
    { icon: '🔄', title: 'Transform',   type: 'transform', layout: SLIDE_LAYOUT.CODE_PREVIEW,  themeIndex: 2,
      desc: 'Normalize, enrich, deduplicate, and join datasets.',
      pseudocode: '# Stage 3: Transform\nclean  = normalize(validated)\njoined = join(clean, lookup_table)\nenriched = add_features(joined)',
      inputs: ['Validated Data'], outputs: ['Feature DataFrame'] },
    { icon: '🧠', title: 'Analyze',     type: 'analyze',   layout: SLIDE_LAYOUT.FULL_CHART,    themeIndex: 3,
      desc: 'Run statistical models, ML inference, or aggregation pipelines.',
      pseudocode: '# Stage 4: Analyze\nmodel.fit(train_df)\npredictions = model.predict(enriched)\nmetrics = evaluate(predictions, ground_truth)',
      inputs: ['Feature DataFrame'], outputs: ['Predictions', 'Metrics'] },
    { icon: '🚀', title: 'Export',      type: 'export',    layout: SLIDE_LAYOUT.CHECKLIST,     themeIndex: 4,
      desc: 'Write results to CSV, database, dashboard API, or trigger alerts.',
      pseudocode: '# Stage 5: Export\ndb.write(predictions, table="results")\ndashboard.push(metrics)\nalert_if(error_rate > threshold)',
      inputs: ['Predictions', 'Metrics'], outputs: ['DB Table', 'Dashboard'] },
  ];

  const pipe = createPipeline({
    title: 'Data Processing Pipeline',
    summary: 'A 5-stage AI-generated data pipeline. Click any slide to edit, then Approve → Compile.',
    phase: PIPELINE_PHASE.IDLE,
  });

  steps.forEach((s, i) => {
    const blocks = [
      createBlock({ type: BLOCK_TYPE.TITLE,   content: s.title, x: 5, y: 5,  w: 90, h: 12 }),
      createBlock({ type: BLOCK_TYPE.TEXT,    content: s.desc,  x: 5, y: 20, w: 90, h: 18 }),
      createBlock({ type: BLOCK_TYPE.CODE,    content: s.pseudocode, language: 'python', x: 5, y: 42, w: 90, h: 45 }),
      createBlock({ type: BLOCK_TYPE.CONNECTOR, content: JSON.stringify({ inputs: s.inputs, outputs: s.outputs }), x: 5, y: 90, w: 90, h: 8 }),
    ];
    const slide = createSlide({
      stepTitle:   s.title,
      stepType:    s.type,
      stepIcon:    s.icon,
      description: s.desc,
      layout:      s.layout,
      themeIndex:  s.themeIndex,
      blocks,
      inputs:      s.inputs,
      outputs:     s.outputs,
      status:      SLIDE_STATUS.IDLE,
    });
    pipe.slideOrder.push(slide.id);
    pipe.slides[slide.id] = slide;
  });

  return pipe;
}
