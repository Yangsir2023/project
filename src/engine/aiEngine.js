/**
 * aiEngine.js — AI 引擎
 *
 * 三个核心函数：
 * 1. generateSkeleton(model, prompt, log)  → 生成 PPT 骨架（幻灯片 + Visual Blocks）
 * 2. compileSlide(model, slide, prompt)    → 将单张幻灯片编译为真实 HTML
 * 3. generateFinalCode(model, slides, prompt) → 合并所有幻灯片生成完整网页 HTML
 */

/* ── JSON 解析辅助 ───────────────────────────────────────────────── */
function parseJsonSafe(raw) {
  // 去掉 markdown 代码块
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  try {
    return JSON.parse(s);
  } catch {
    // 尝试提取第一个合法 JSON 数组或对象
    const m = s.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    if (m) return JSON.parse(m[1]);
    throw new Error('AI 返回了无效的 JSON');
  }
}

/* ── Block ID 生成 ──────────────────────────────────────────────── */
let _bid = 0;
function bid() { return `b${++_bid}-${Date.now().toString(36)}`; }

/* ── 网格对齐 ───────────────────────────────────────────────────── */
function sg(v) { return Math.round(v / 8) * 8; }

/* ══════════════════════════════════════════════════════════════════
   1. generateSkeleton
   ══════════════════════════════════════════════════════════════════ */
export async function generateSkeleton(model, prompt, log = () => {}) {

  log('🧠 解析网站结构意图...');

  const systemInstruction = `你是一个专业的网站架构师和UI设计师。
用户描述他们想要的网站，你需要将网站分解成多个"幻灯片"（页面区块），每张幻灯片代表网站的一个独立区域（如导航栏、Hero区、功能展示、价格方案、页脚等）。

每张幻灯片包含若干"Visual Block"元素，这些元素有位置和尺寸信息（相对于1000×600的画布）。

可用的 block 类型：
- heading  : 标题文字 (content: {text, level: "h1"|"h2"|"h3", align: "left"|"center"|"right"})
- text     : 段落文字 (content: {text, align: "left"|"center"|"right"})
- image    : 图片/图片占位 (content: {src: "", alt, fit: "cover"|"contain"})
- button   : 按钮 (content: {text, variant: "primary"|"secondary"|"ghost"|"danger", href: "#"})
- card     : 卡片 (content: {title, body, hasImage: true|false})
- list     : 列表 (content: {items: ["...","..."], style: "bullet"|"number"})
- hero     : Hero大区块 (content: {title, sub, cta})
- nav      : 导航栏 (content: {logo, links: ["首页","功能"], cta})
- badge    : 徽章/标签 (content: {text, color: "#6366f1"})
- divider  : 分割线 (content: {style: "line"})

重要规则：
1. 合理分配位置：x,y,w,h 都是像素值，画布大小 1000×600，要避免严重重叠
2. 每张幻灯片 3-8 个 blocks，精心布局，代表真实的网站区域
3. 生成 3-6 张幻灯片，覆盖完整的网站结构
4. bgColor 使用深色系（如 #0f172a, #1e293b）或根据风格选择
5. 文字内容要有实际意义，符合用户需求

返回格式（纯 JSON，不要 markdown）：
[
  {
    "id": "slide-1",
    "name": "导航栏",
    "status": "skeleton",
    "bgColor": "#0f172a",
    "blocks": [
      {"id": "b1", "type": "nav",     "x": 0,   "y": 0,   "w": 1000, "h": 60,  "zIndex": 1, "content": {"logo": "品牌名", "links": ["首页","功能","价格"], "cta": "开始使用"}},
      {"id": "b2", "type": "hero",    "x": 100, "y": 80,  "w": 800,  "h": 200, "zIndex": 1, "content": {"title": "震撼大标题", "sub": "副标题内容", "cta": "立即体验"}},
      {"id": "b3", "type": "button",  "x": 350, "y": 310, "w": 150,  "h": 48,  "zIndex": 1, "content": {"text": "免费开始", "variant": "primary", "href": "#"}}
    ]
  }
]`;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: `用户需求：${prompt}` }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
  });

  const raw = result.response.text();
  log('📐 解析 Visual Block 结构...');

  let slides;
  try {
    slides = parseJsonSafe(raw);
  } catch (e) {
    log(`⚠ JSON解析失败，使用默认模板: ${e.message}`);
    slides = buildFallbackSlides(prompt);
  }

  if (!Array.isArray(slides) || slides.length === 0) {
    slides = buildFallbackSlides(prompt);
  }

  // Normalize: ensure all slides have required fields
  return slides.map((s, i) => ({
    id:      s.id     || `slide-${Date.now()}-${i}`,
    name:    s.name   || `幻灯片 ${i + 1}`,
    status:  'skeleton',
    bgColor: s.bgColor || '#1e293b',
    html:    '',
    blocks:  (s.blocks || []).map((b, j) => ({
      id:      b.id      || bid(),
      type:    b.type    || 'text',
      x:       sg(b.x   ?? 50 + j * 20),
      y:       sg(b.y   ?? 50 + j * 20),
      w:       sg(b.w   ?? 200),
      h:       sg(b.h   ?? 60),
      zIndex:  b.zIndex || j + 1,
      content: b.content || {},
    })),
  }));
}

/* ── 降级模板 ────────────────────────────────────────────────────── */
function buildFallbackSlides(prompt) {
  return [
    {
      id: 'slide-1', name: '导航 + Hero', status: 'skeleton', bgColor: '#0f172a',
      blocks: [
        { id: bid(), type: 'nav',     x:0,  y:0,   w:1000, h:56,  zIndex:1, content:{ logo:'Bifrost', links:['首页','功能','关于'], cta:'开始使用' } },
        { id: bid(), type: 'hero',    x:100,y:80,  w:800,  h:200, zIndex:1, content:{ title:'用自然语言，构建你的网站', sub:'告别空白画布，AI 瞬间生成可视化骨架', cta:'免费体验' } },
        { id: bid(), type: 'badge',   x:420,y:60,  w:160,  h:32,  zIndex:2, content:{ text:'✨ 全新发布', color:'#6366f1' } },
        { id: bid(), type: 'button',  x:360,y:304, w:140,  h:48,  zIndex:1, content:{ text:'立即体验', variant:'primary', href:'#' } },
        { id: bid(), type: 'button',  x:520,y:304, w:120,  h:48,  zIndex:1, content:{ text:'查看演示', variant:'ghost', href:'#' } },
      ],
    },
    {
      id: 'slide-2', name: '功能特性', status: 'skeleton', bgColor: '#1e293b',
      blocks: [
        { id: bid(), type: 'heading', x:200,y:40,  w:600,  h:70,  zIndex:1, content:{ text:'三大核心优势', level:'h2', align:'center' } },
        { id: bid(), type: 'card',    x:40, y:130, w:280,  h:200, zIndex:1, content:{ title:'⚡ 瞬间生成', body:'输入意图，0.1秒生成完整骨架', hasImage:false } },
        { id: bid(), type: 'card',    x:360,y:130, w:280,  h:200, zIndex:1, content:{ title:'🎨 PPT式编辑', body:'像改幻灯片一样自由修改', hasImage:false } },
        { id: bid(), type: 'card',    x:680,y:130, w:280,  h:200, zIndex:1, content:{ title:'🚀 一键上线', body:'从想法到上线，分钟级交付', hasImage:false } },
      ],
    },
    {
      id: 'slide-3', name: '底部', status: 'skeleton', bgColor: '#0a0d14',
      blocks: [
        { id: bid(), type: 'divider',  x:40, y:40,  w:920, h:16,  zIndex:1, content:{ style:'line' } },
        { id: bid(), type: 'heading',  x:40, y:80,  w:400, h:50,  zIndex:1, content:{ text:'Bifrost', level:'h3', align:'left' } },
        { id: bid(), type: 'text',     x:40, y:140, w:400, h:60,  zIndex:1, content:{ text:'以自然语言与可视化草图驱动的下一代建站引擎。', align:'left' } },
        { id: bid(), type: 'list',     x:500,y:80,  w:460, h:160, zIndex:1, content:{ items:['产品','定价','文档','联系我们'], style:'bullet' } },
        { id: bid(), type: 'text',     x:40, y:540, w:920, h:40,  zIndex:1, content:{ text:'© 2025 Bifrost. All rights reserved.', align:'center' } },
      ],
    },
  ];
}

/* ══════════════════════════════════════════════════════════════════
   2. compileSlide — 将单张幻灯片的 Visual Blocks 编译为真实 HTML
   ══════════════════════════════════════════════════════════════════ */
export async function compileSlide(model, slide, sitePrompt) {
  const blockSummary = (slide.blocks || []).map(b =>
    `[${b.type}] "${JSON.stringify(b.content).slice(0, 80)}" at (${b.x},${b.y}) size ${b.w}×${b.h}`
  ).join('\n');

  const systemInstruction = `你是一个专业的前端开发工程师，擅长将设计稿转化为高质量 HTML/CSS。
用户有一张"幻灯片"（网站区块的可视化草图），包含若干 Visual Blocks，你需要将其编译为真实可运行的单页 HTML 片段。

要求：
1. 输出完整可运行的 HTML（包含 <html><head><body> 标签）
2. 使用内联 <style> 标签包含所有 CSS，不依赖外部资源
3. 严格还原 block 的相对位置和大小比例（画布 1000×600，换算成百分比布局）
4. 暗色主题为主，使用背景色 ${slide.bgColor || '#1e293b'}
5. 字体使用 system-ui 或 sans-serif
6. 按钮、卡片要有 hover 效果
7. 代码干净，可直接在浏览器运行
8. 不要任何注释，不要 markdown，只输出 HTML`;

  const userMessage = `
网站整体需求：${sitePrompt}

幻灯片名称：${slide.name}
背景色：${slide.bgColor || '#1e293b'}

Visual Blocks：
${blockSummary}

请将这些 Visual Blocks 编译为完整的 HTML 页面。`;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: { temperature: 0.3, maxOutputTokens: 8192 },
  });

  let html = result.response.text().trim();
  // 去掉 markdown 代码块
  html = html.replace(/^```(?:html)?\s*/i, '').replace(/\s*```\s*$/, '');
  if (!html.includes('<html')) {
    html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;background:${slide.bgColor || '#1e293b'};color:#e2e8f0;font-family:system-ui,sans-serif}</style></head><body>${html}</body></html>`;
  }
  return html;
}

/* ══════════════════════════════════════════════════════════════════
   3. generateFinalCode — 合并所有幻灯片生成完整网页
   ══════════════════════════════════════════════════════════════════ */
export async function generateFinalCode(model, slides, sitePrompt) {

  const compiledSlides = slides.filter(s => s.status === 'compiled' && s.html);

  if (compiledSlides.length === 0) {
    // 直接用 blocks 信息生成完整网站
    return generateFromBlocks(model, slides, sitePrompt);
  }

  // 从已编译 HTML 中提取 body 内容并合并
  const sections = compiledSlides.map((s, i) => {
    let body = s.html;
    // 提取 body 内容
    const m = body.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (m) body = m[1];
    // 提取 style
    const styleMatches = [...s.html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)];
    const styles = styleMatches.map(m => m[1]).join('\n');
    return { name: s.name, body, styles };
  });

  const systemInstruction = `你是一个专业的前端开发工程师。
将多个网站区块的 HTML 片段合并为一个完整的、专业的单页网站。

要求：
1. 输出一个完整的 HTML 文档
2. 整合所有区块的样式，消除冲突
3. 区块之间有自然的过渡
4. 添加平滑滚动
5. 响应式设计（移动端友好）
6. 整体风格统一，暗色主题
7. 代码质量高，可直接部署
8. 只输出 HTML，不要 markdown，不要注释`;

  const userMessage = `
网站需求：${sitePrompt}

共 ${sections.length} 个区块：
${sections.map((s, i) => `
--- 区块${i + 1}: ${s.name} ---
样式：${s.styles.slice(0, 500)}...
HTML: ${s.body.slice(0, 600)}...
`).join('\n')}

请将所有区块合并为完整网站 HTML。`;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: { temperature: 0.3, maxOutputTokens: 16384 },
  });

  let html = result.response.text().trim();
  html = html.replace(/^```(?:html)?\s*/i, '').replace(/\s*```\s*$/, '');
  return html;
}

/* ── Fallback: generate from blocks directly ─────────────────────── */
async function generateFromBlocks(model, slides, sitePrompt) {
  const summary = slides.map((s, i) =>
    `区块${i + 1} "${s.name}": ${(s.blocks || []).map(b => `[${b.type}]${JSON.stringify(b.content).slice(0, 50)}`).join(', ')}`
  ).join('\n');

  const result = await model.generateContent({
    contents: [{
      role: 'user',
      parts: [{ text: `
需求：${sitePrompt}

网站结构（${slides.length}个区块）：
${summary}

请生成完整的单页网站 HTML（包含 <html><head><body>），内联所有 CSS，暗色主题，专业级视觉效果。只输出 HTML。` }],
    }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 16384 },
  });

  let html = result.response.text().trim();
  html = html.replace(/^```(?:html)?\s*/i, '').replace(/\s*```\s*$/, '');
  return html;
}
