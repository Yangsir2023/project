/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  pipelineEngine.js — Mixed-Initiative AI Generation          ║
 * ║                                                              ║
 * ║  Implements the 4-stage Rewrite-Retrieve-Read pipeline:      ║
 * ║  Stage 1: Intent Rewrite — parse natural language           ║
 * ║  Stage 2: Task Extraction — build node skeleton DAG         ║
 * ║  Stage 3: Pseudocode IR — generate per-node skeleton        ║
 * ║  Stage 4: Compile — turn approved skeletons into HTML       ║
 * ║                                                              ║
 * ║  Ref: PPT Slide 10 (技术引擎解密)                            ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import {
  createPipeline,
  createNode,
  createNodeSkeleton,
  updateNode,
  NODE_STATUS,
  inferStepIcon,
} from './types.js';

/* ─── Utility ──────────────────────────────────────────────── */
function cleanJson(text) {
  return text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

function cleanHtml(text) {
  return text
    .replace(/^```html\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

function safeParseJson(raw) {
  try { return JSON.parse(raw); } catch (_) {}
  try {
    const sanitised = raw.replace(
      /"((?:[^"\\]|\\.)*)"/gs,
      (_, inner) => '"' + inner
        .replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
        .replace(/[\x00-\x1F\x7F]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'))
        + '"',
    );
    return JSON.parse(sanitised);
  } catch (_) {}
  throw new Error('Failed to parse AI response as JSON.');
}

/* ─── Stage Definitions (for loading animation) ────────────── */
export const ENGINE_STAGES = [
  { key: 'rewrite',   label: 'Parsing your intent…',          icon: '🔍', desc: 'Rewriting the request into structured tasks' },
  { key: 'extract',   label: 'Extracting pipeline steps…',    icon: '🗂',  desc: 'Building the DAG skeleton from your prompt' },
  { key: 'skeleton',  label: 'Generating Visual Blocks IR…',  icon: '🧱', desc: 'Creating pseudocode & I/O schema for each step' },
  { key: 'ready',     label: 'Ready for your review',         icon: '👁',  desc: 'Approve each block, then compile' },
];

/* ══════════════════════════════════════════════════════════════
   STAGE 1 + 2: Intent Rewrite + Task Extraction
   Returns an array of raw step objects with title, description,
   inputs, outputs, pseudocode
   ══════════════════════════════════════════════════════════════ */
async function extractTasksSkeleton(model, userRequest) {
  const prompt = `You are Bifrost, a visual AI pipeline architect.

The user wants to build the following data pipeline:
"${userRequest}"

Your job (Stage 1 + 2 of Rewrite-Retrieve-Read):
1. Rewrite the request into a clear, structured pipeline intent.
2. Extract 4–7 atomic pipeline steps as a DAG.

Return ONLY a valid JSON object (no markdown, no explanation):
{
  "title": "Short descriptive pipeline title (max 8 words)",
  "summary": "One sentence describing the pipeline goal (max 20 words)",
  "steps": [
    {
      "title": "Step name (1-3 words, verb-noun)",
      "description": "One sentence: what this step does and why (max 20 words)",
      "type": "ingest|validate|transform|analyze|model|visualize|export|notify|custom",
      "inputs": ["data type 1", "data type 2"],
      "outputs": ["output type 1"],
      "pseudocode": "2–4 lines of readable pseudocode showing the core logic"
    }
  ]
}

Rules:
- Steps must flow logically from data source to final output.
- Each step title must be a meaningful verb or noun phrase.
- Pseudocode should be simple, readable, not real code — think InstructPipe style.
- inputs/outputs should be short labels like "CSV file", "cleaned rows", "ML model".
- DO NOT include markdown, fences, or HTML.`;

  const result = await model.generateContent(prompt);
  const raw    = cleanJson((await result.response).text());
  const parsed = safeParseJson(raw);

  if (!parsed.title || !Array.isArray(parsed.steps) || parsed.steps.length < 2) {
    throw new Error('AI returned an invalid pipeline structure.');
  }

  return parsed;
}

/* ══════════════════════════════════════════════════════════════
   STAGE 3: Compile a single approved node into HTML
   Called per-node when user approves skeleton
   ══════════════════════════════════════════════════════════════ */
export async function compileNodeToHtml(model, pipelineTitle, node) {
  const sk = node.skeleton;
  const revisionNote = node.userNote
    ? `\n\nUser revision note (IMPORTANT — incorporate this): "${node.userNote}"`
    : '';

  const prompt = `You are Bifrost. Compile one step of the "${pipelineTitle}" data pipeline into a standalone HTML preview.

Step: ${sk.title}
Description: ${sk.description}
Type: ${node.type || 'custom'}
Inputs: ${(sk.inputs || []).join(', ') || 'n/a'}
Outputs: ${(sk.outputs || []).join(', ') || 'n/a'}
Pseudocode:
${sk.pseudocode || '(none)'}
${revisionNote}

Requirements:
- Return ONLY valid HTML with embedded CSS. No markdown, no explanation, no code fences.
- Must look like a REAL production tool output: data tables, inline SVG charts, terminal output, or a dashboard panel.
- Use REALISTIC sample data that matches the step's type and I/O schema.
- Professional typography (Google Fonts Inter allowed via CDN link).
- Keep under 3500 characters.
- Dark or light style is fine — make it look impressive.`;

  const result = await model.generateContent(prompt);
  return cleanHtml((await result.response).text());
}

/* ══════════════════════════════════════════════════════════════
   MAIN ENGINE: generatePipeline
   - Generates skeleton (stages 1-3) and returns a Pipeline IR
   - onProgress(stageIndex) called as each stage completes
   ══════════════════════════════════════════════════════════════ */
export async function generatePipeline(model, userRequest, { onProgress } = {}) {
  onProgress?.(0); // Rewriting…

  /* Stage 1+2: Intent rewrite + task extraction */
  const parsed = await extractTasksSkeleton(model, userRequest);
  onProgress?.(1); // Extracting…

  /* Stage 3: Build pipeline IR with skeleton nodes */
  const pipeline = createPipeline({
    title:         parsed.title,
    summary:       parsed.summary,
    phase:         'reviewing',
    isAiGenerated: true,
  });

  parsed.steps.forEach((step, i) => {
    const node = createNode({
      type:   step.type || 'custom',
      status: NODE_STATUS.SKELETON_READY,
      skeleton: createNodeSkeleton({
        icon:        inferStepIcon(step.title),
        title:       step.title,
        description: step.description,
        pseudocode:  step.pseudocode || '',
        inputs:      Array.isArray(step.inputs)  ? step.inputs  : [],
        outputs:     Array.isArray(step.outputs) ? step.outputs : [],
        colorKey:    i,
      }),
    });
    pipeline.nodeOrder.push(node.id);
    pipeline.nodes[node.id] = node;
  });

  onProgress?.(2); // Skeleton ready
  onProgress?.(3); // Ready for review

  return pipeline;
}

/* ══════════════════════════════════════════════════════════════
   COMPILE APPROVED NODES
   Called after user has approved nodes.
   Returns updated pipeline with compiled HTML in each approved node.
   ══════════════════════════════════════════════════════════════ */
export async function compileApprovedNodes(model, pipeline, { onNodeCompiled } = {}) {
  let updated = { ...pipeline, nodes: { ...pipeline.nodes }, phase: 'compiling' };

  const toCompile = pipeline.nodeOrder
    .map((id) => pipeline.nodes[id])
    .filter((n) => n.approved && n.status !== NODE_STATUS.COMPILED);

  for (const node of toCompile) {
    // Set compiling
    updated = updateNode(updated, node.id, { status: NODE_STATUS.COMPILING });
    onNodeCompiled?.(updated);

    try {
      const html = await compileNodeToHtml(model, pipeline.title, node);
      updated = updateNode(updated, node.id, { status: NODE_STATUS.COMPILED, html });
    } catch (err) {
      updated = updateNode(updated, node.id, { status: NODE_STATUS.ERROR });
    }
    onNodeCompiled?.(updated);
  }

  // Check if all nodes done
  const allDone = updated.nodeOrder
    .map((id) => updated.nodes[id])
    .every((n) => n.status === NODE_STATUS.COMPILED || n.status === NODE_STATUS.ERROR);

  return { ...updated, phase: allDone ? 'done' : 'reviewing' };
}

/* ══════════════════════════════════════════════════════════════
   REVISE a single node (after user rejection + note)
   Re-generates skeleton for one node incorporating user note,
   then compiles it.
   ══════════════════════════════════════════════════════════════ */
export async function reviseNode(model, pipeline, nodeId) {
  const node = pipeline.nodes[nodeId];
  if (!node) return pipeline;

  // Mark as revising
  let updated = updateNode(pipeline, nodeId, { status: NODE_STATUS.REVISING });

  const sk = node.skeleton;
  const revisionPrompt = `You are Bifrost. Revise the skeleton for one step of the "${pipeline.title}" pipeline.

Current step: ${sk.title}
Current description: ${sk.description}
Current pseudocode:
${sk.pseudocode}

User revision request: "${node.userNote || 'Please improve this step.'}"

Return ONLY a valid JSON object (no markdown):
{
  "title": "Step name",
  "description": "One sentence description (max 20 words)",
  "inputs": ["input type"],
  "outputs": ["output type"],
  "pseudocode": "2-4 line pseudocode"
}`;

  try {
    const result  = await model.generateContent(revisionPrompt);
    const raw     = cleanJson((await result.response).text());
    const revised = safeParseJson(raw);

    updated = updateNode(updated, nodeId, {
      status: NODE_STATUS.SKELETON_READY,
      userNote: '',
      skeleton: {
        ...sk,
        title:       revised.title       || sk.title,
        description: revised.description || sk.description,
        pseudocode:  revised.pseudocode  || sk.pseudocode,
        inputs:      Array.isArray(revised.inputs)  ? revised.inputs  : sk.inputs,
        outputs:     Array.isArray(revised.outputs) ? revised.outputs : sk.outputs,
        icon:        inferStepIcon(revised.title || sk.title),
      },
    });
  } catch (_) {
    updated = updateNode(updated, nodeId, { status: NODE_STATUS.SKELETON_READY });
  }

  return updated;
}

/* ══════════════════════════════════════════════════════════════
   GENERATE FINAL DASHBOARD PAGE
   Aggregates all compiled nodes into one unified output page
   ══════════════════════════════════════════════════════════════ */
export async function generateFinalDashboard(model, pipeline) {
  const compiledSteps = pipeline.nodeOrder
    .map((id) => pipeline.nodes[id])
    .filter((n) => n.status === NODE_STATUS.COMPILED);

  const stepsContext = compiledSteps
    .map((n, i) => `Step ${i + 1} — ${n.skeleton.title}: ${n.skeleton.description}`)
    .join('\n');

  const prompt = `You are Bifrost. The user has reviewed and confirmed all stages of the "${pipeline.title}" data pipeline.

Pipeline: ${pipeline.title}
Summary: ${pipeline.summary}

Confirmed stages:
${stepsContext}

Generate a single, complete, production-quality HTML page that serves as the FINAL integrated output of this entire pipeline. This page should:
- Visually combine all pipeline stages into one cohesive dashboard
- Show realistic sample data flowing through each stage
- Include a header with the pipeline title and a summary
- Each stage gets a clearly labeled section or card
- Use professional design: data tables, inline SVG charts, status indicators, clean typography

Return ONLY valid HTML with embedded CSS. No markdown. Make it impressive and production-ready.`;

  const result = await model.generateContent(prompt);
  return cleanHtml((await result.response).text());
}
