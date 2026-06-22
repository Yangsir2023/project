/**
 * Pipeline PPT Engine — AI 生成引擎 (PPT 模式)
 *
 * Rewrite-Retrieve-Read 四阶段流水线:
 *   Stage 1: 意图重写与提取  (解析自然语言 → 结构化任务序列)
 *   Stage 2: PPT 骨架生成   (生成幻灯片 IR — 标题/文本/代码块)
 *   Stage 3: 骨架验证与修整 (确保数据结构完整性)
 *   Stage 4: 准备 Human-in-the-loop 审批
 */

import {
  createPipeline,
  createSlide,
  createBlock,
  BLOCK_TYPE,
  SLIDE_LAYOUT,
  SLIDE_STATUS,
  PIPELINE_PHASE,
  SLIDE_THEMES,
  inferStepIcon,
} from './types.js';

/* ── Engine Stages (展示进度用) ──────────────────────────── */
export const ENGINE_STAGES = [
  { label: 'Parsing intent…',          icon: '🔍' },
  { label: 'Designing slide layout…',  icon: '🎨' },
  { label: 'Generating PPT skeleton…', icon: '📐' },
  { label: 'Preparing for review…',    icon: '✅' },
];

/* ── 主生成函数 ──────────────────────────────────────────── */
/**
 * generatePipeline — 将自然语言描述转换为 PPT-IR 管道
 * @param {object} model — Gemini model instance
 * @param {string} userPrompt — 用户输入
 * @param {object} opts — { onProgress(stageIndex) }
 * @returns {object} pipeline — 符合 types.js IR 格式的管道对象
 */
export async function generatePipeline(model, userPrompt, opts = {}) {
  const { onProgress } = opts;

  // ── Stage 1: 意图重写与提取 ─────────────────────────────
  onProgress?.(0);
  const rewritePrompt = `
You are a data pipeline architect AI.
The user wants to build a data pipeline: "${userPrompt}"

Step 1: Rewrite the user's intent into a clear, structured pipeline description.
Step 2: Extract exactly 4-6 pipeline steps.

Respond ONLY with valid JSON in this format:
{
  "title": "Pipeline title (max 6 words)",
  "summary": "One sentence summary of what this pipeline does",
  "steps": [
    {
      "title": "Step name (2-3 words)",
      "type": "ingest|validate|transform|analyze|export|custom",
      "description": "Clear 1-2 sentence description of this step",
      "inputs": ["input1", "input2"],
      "outputs": ["output1"],
      "pseudocode": "# 4-6 lines of pseudocode\\nline2\\nline3\\nline4"
    }
  ]
}

Rules:
- 4-6 steps only
- Each step must have at least 1 input and 1 output
- Pseudocode should be 4-6 lines of realistic, specific pseudocode (not generic)
- step types must be one of: ingest, validate, transform, analyze, export, custom
- Do NOT include markdown or explanations, ONLY JSON
`.trim();

  let stepDefs = [];
  let pipelineTitle = 'AI Pipeline';
  let pipelineSummary = '';

  try {
    const res  = await model.generateContent(rewritePrompt);
    const text = res.response.text().replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(text);
    stepDefs       = parsed.steps || [];
    pipelineTitle  = parsed.title || 'AI Pipeline';
    pipelineSummary = parsed.summary || '';
  } catch (err) {
    // Fallback: generate a minimal pipeline
    stepDefs = [
      { title: 'Ingest',    type: 'ingest',    description: 'Collect input data.',     inputs: ['Source'],   outputs: ['Raw Data'],   pseudocode: `# Ingest\ndata = source.load()\nreturn validate_schema(data)` },
      { title: 'Process',   type: 'transform', description: 'Transform and clean data.',inputs: ['Raw Data'], outputs: ['Clean Data'], pseudocode: `# Process\nclean = normalize(data)\nreturn clean` },
      { title: 'Analyze',   type: 'analyze',   description: 'Run analysis or model.',   inputs: ['Clean Data'],outputs: ['Results'],  pseudocode: `# Analyze\nresults = model.run(clean)\nreturn results` },
      { title: 'Export',    type: 'export',    description: 'Export results.',          inputs: ['Results'],  outputs: ['Output'],    pseudocode: `# Export\ndb.write(results)\nreturn "done"` },
    ];
    pipelineTitle = userPrompt.slice(0, 40);
  }

  // ── Stage 2: 设计幻灯片布局 ─────────────────────────────
  onProgress?.(1);
  await new Promise((r) => setTimeout(r, 300)); // micro-pause for UX

  // ── Stage 3: 生成 PPT Skeleton ─────────────────────────
  onProgress?.(2);

  const pipeline = createPipeline({
    title:   pipelineTitle,
    summary: pipelineSummary,
    phase:   PIPELINE_PHASE.REVIEW,
    isAiGenerated: true,
  });

  // Layout rotation for variety
  const layouts = [
    SLIDE_LAYOUT.TITLE_CONTENT,
    SLIDE_LAYOUT.CODE_PREVIEW,
    SLIDE_LAYOUT.TWO_COLUMN,
    SLIDE_LAYOUT.FULL_CHART,
    SLIDE_LAYOUT.CHECKLIST,
  ];

  stepDefs.forEach((step, i) => {
    const icon   = inferStepIcon(step.title);
    const layout = layouts[i % layouts.length];
    const theme  = SLIDE_THEMES[i % SLIDE_THEMES.length];

    // Build content blocks based on layout
    let blocks = [];

    if (layout === SLIDE_LAYOUT.TWO_COLUMN) {
      // Left: title + description | Right: code
      blocks = [
        createBlock({ type: BLOCK_TYPE.TITLE,   content: `${icon} ${step.title}`,      x: 3,  y: 4,  w: 44, h: 14 }),
        createBlock({ type: BLOCK_TYPE.TEXT,    content: step.description,              x: 3,  y: 22, w: 44, h: 35 }),
        createBlock({ type: BLOCK_TYPE.BADGE,   content: JSON.stringify(step.inputs.map((i) => `→ ${i}`).concat(step.outputs.map((o) => `← ${o}`))),
                                                                                        x: 3,  y: 60, w: 44, h: 20 }),
        createBlock({ type: BLOCK_TYPE.CODE,    content: step.pseudocode, language: 'python', x: 51, y: 4,  w: 46, h: 80 }),
        createBlock({ type: BLOCK_TYPE.CONNECTOR, content: JSON.stringify({ inputs: step.inputs, outputs: step.outputs }),
                                                                                        x: 3,  y: 88, w: 94, h: 10 }),
      ];
    } else if (layout === SLIDE_LAYOUT.CODE_PREVIEW) {
      // Title top, code left, checklist right
      blocks = [
        createBlock({ type: BLOCK_TYPE.TITLE,   content: `${icon} ${step.title}`,       x: 3,  y: 3,  w: 94, h: 12 }),
        createBlock({ type: BLOCK_TYPE.CODE,    content: step.pseudocode, language: 'python', x: 3,  y: 18, w: 55, h: 60 }),
        createBlock({ type: BLOCK_TYPE.TEXT,    content: step.description,               x: 62, y: 18, w: 35, h: 30 }),
        createBlock({ type: BLOCK_TYPE.BADGE,   content: JSON.stringify([
                        '✅ Schema validated',
                        '🔄 State: pending',
                        `📥 ${step.inputs[0] || 'Input'}`,
                        `📤 ${step.outputs[0] || 'Output'}`,
                      ]),                                                                x: 62, y: 52, w: 35, h: 26 }),
        createBlock({ type: BLOCK_TYPE.CONNECTOR, content: JSON.stringify({ inputs: step.inputs, outputs: step.outputs }),
                                                                                        x: 3,  y: 83, w: 94, h: 14 }),
      ];
    } else if (layout === SLIDE_LAYOUT.CHECKLIST) {
      blocks = [
        createBlock({ type: BLOCK_TYPE.TITLE,   content: `${icon} ${step.title}`,       x: 5,  y: 4,  w: 90, h: 14 }),
        createBlock({ type: BLOCK_TYPE.TEXT,    content: step.description,               x: 5,  y: 21, w: 90, h: 16 }),
        createBlock({ type: BLOCK_TYPE.BADGE,   content: JSON.stringify([
                        `📥 Input: ${step.inputs.join(', ')}`,
                        `📤 Output: ${step.outputs.join(', ')}`,
                        '🔄 Status: Pending Review',
                        '🛡 Validation: Enabled',
                        '📊 Logging: Active',
                      ]),                                                                x: 5,  y: 41, w: 42, h: 45 }),
        createBlock({ type: BLOCK_TYPE.CODE,    content: step.pseudocode, language: 'python', x: 52, y: 41, w: 43, h: 45 }),
        createBlock({ type: BLOCK_TYPE.CONNECTOR, content: JSON.stringify({ inputs: step.inputs, outputs: step.outputs }),
                                                                                        x: 5,  y: 89, w: 90, h: 10 }),
      ];
    } else {
      // Default: TITLE_CONTENT — title + text + code stacked
      blocks = [
        createBlock({ type: BLOCK_TYPE.TITLE,   content: `${icon} ${step.title}`,       x: 5,  y: 3,  w: 90, h: 13 }),
        createBlock({ type: BLOCK_TYPE.TEXT,    content: step.description,               x: 5,  y: 19, w: 90, h: 14 }),
        createBlock({ type: BLOCK_TYPE.CODE,    content: step.pseudocode, language: 'python', x: 5,  y: 36, w: 90, h: 48 }),
        createBlock({ type: BLOCK_TYPE.CONNECTOR, content: JSON.stringify({ inputs: step.inputs, outputs: step.outputs }),
                                                                                        x: 5,  y: 88, w: 90, h: 11 }),
      ];
    }

    const slide = createSlide({
      stepTitle:   step.title,
      stepType:    step.type,
      stepIcon:    icon,
      description: step.description,
      layout,
      themeIndex:  i % SLIDE_THEMES.length,
      blocks,
      inputs:      step.inputs  || [],
      outputs:     step.outputs || [],
      status:      SLIDE_STATUS.SKELETON,
    });

    pipeline.slideOrder.push(slide.id);
    pipeline.slides[slide.id] = slide;
  });

  // ── Stage 4: 准备审批 ────────────────────────────────────
  onProgress?.(3);
  await new Promise((r) => setTimeout(r, 200));

  return pipeline;
}

/* ── Final Dashboard Generator ───────────────────────────── */
export async function generateFinalDashboard(model, pipeline) {
  const slides = pipeline.slideOrder.map((id) => pipeline.slides[id]).filter(Boolean);
  const prompt = `
Create a stunning, professional HTML dashboard for this completed pipeline:

Title: "${pipeline.title}"
Summary: "${pipeline.summary}"

Pipeline Steps:
${slides.map((s, i) => `${i+1}. ${s.stepIcon} ${s.stepTitle}
   Description: ${s.description}
   Inputs: ${(s.inputs||[]).join(', ')}
   Outputs: ${(s.outputs||[]).join(', ')}`).join('\n\n')}

Create a complete, self-contained HTML dashboard with:
1. Hero section: pipeline title, summary, total steps
2. Horizontal pipeline flow visualization with connecting arrows
3. Each step as a card with: icon, number, title, description, I/O pills
4. Stats bar: total steps, compiled count, data flow summary
5. Dark professional theme (#0f1117 background, blue/purple accents)
6. Smooth CSS animations (fade-in cards, pulse on step numbers)
7. Responsive design, full viewport

Respond with ONLY the complete HTML starting with <!DOCTYPE html>.
`.trim();
  const res = await model.generateContent(prompt);
  return res.response.text().replace(/```html|```/g, '').trim();
}
