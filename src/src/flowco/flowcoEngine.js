/**
 * Flowco Engine — Data Flow Analysis & Validation
 *
 * 实现数据流可视化与校验：
 *   - 分析每个幻灯片/组件的数据输入输出
 *   - 检测未定义变量、类型不匹配、悬空引用
 *   - 生成可视化数据流图
 *   - 提供修复建议
 */

/* ═══════════════════════════════════════════════════════
   数据流类型定义
   ═══════════════════════════════════════════════════════ */

export const DATA_TYPE = {
  STRING:   'string',
  NUMBER:   'number',
  BOOLEAN:  'boolean',
  OBJECT:   'object',
  ARRAY:    'array',
  IMAGE:    'image',
  URL:      'url',
  UNKNOWN:  'unknown',
};

export const VALIDATION_LEVEL = {
  ERROR:   'error',    // 必须修复（会导致生成失败）
  WARNING: 'warning',  // 建议修复（可能影响质量）
  INFO:    'info',     // 提示（优化建议）
};

export const FLOW_STATUS = {
  VALID:    'valid',
  INVALID:  'invalid',
  WARNING:  'warning',
  UNCHECKED:'unchecked',
};

/* ═══════════════════════════════════════════════════════
   数据流节点分析
   ═══════════════════════════════════════════════════════ */

/**
 * 分析单个 Block 的数据输入/输出
 */
function analyzeBlock(block) {
  const inputs  = [];
  const outputs = [];
  const c = block.content || {};

  switch (block.type) {
    case 'nav':
      inputs.push({ name: 'logo',  type: DATA_TYPE.STRING,  required: true,  value: c.logo });
      inputs.push({ name: 'links', type: DATA_TYPE.ARRAY,   required: true,  value: c.links });
      inputs.push({ name: 'cta',   type: DATA_TYPE.STRING,  required: false, value: c.cta });
      outputs.push({ name: 'navigation_state', type: DATA_TYPE.OBJECT });
      outputs.push({ name: 'current_route',    type: DATA_TYPE.STRING });
      break;

    case 'hero':
      inputs.push({ name: 'title', type: DATA_TYPE.STRING, required: true,  value: c.title });
      inputs.push({ name: 'sub',   type: DATA_TYPE.STRING, required: false, value: c.sub });
      inputs.push({ name: 'cta',   type: DATA_TYPE.STRING, required: false, value: c.cta });
      outputs.push({ name: 'cta_click_event', type: DATA_TYPE.OBJECT });
      break;

    case 'button':
      inputs.push({ name: 'text',    type: DATA_TYPE.STRING, required: true,  value: c.text });
      inputs.push({ name: 'variant', type: DATA_TYPE.STRING, required: false, value: c.variant });
      inputs.push({ name: 'href',    type: DATA_TYPE.URL,    required: false, value: c.href });
      outputs.push({ name: 'click_event', type: DATA_TYPE.OBJECT });
      break;

    case 'card':
      inputs.push({ name: 'title',    type: DATA_TYPE.STRING,  required: true,  value: c.title });
      inputs.push({ name: 'body',     type: DATA_TYPE.STRING,  required: false, value: c.body });
      inputs.push({ name: 'hasImage', type: DATA_TYPE.BOOLEAN, required: false, value: c.hasImage });
      if (c.hasImage) {
        inputs.push({ name: 'imageUrl', type: DATA_TYPE.IMAGE, required: false, value: null });
      }
      break;

    case 'image':
      inputs.push({ name: 'src', type: DATA_TYPE.IMAGE, required: false, value: c.src });
      inputs.push({ name: 'alt', type: DATA_TYPE.STRING, required: true, value: c.alt });
      outputs.push({ name: 'load_status', type: DATA_TYPE.BOOLEAN });
      break;

    case 'list':
      inputs.push({ name: 'items', type: DATA_TYPE.ARRAY, required: true, value: c.items });
      inputs.push({ name: 'style', type: DATA_TYPE.STRING, required: false, value: c.style });
      outputs.push({ name: 'selected_item', type: DATA_TYPE.STRING });
      break;

    case 'heading':
      inputs.push({ name: 'text',  type: DATA_TYPE.STRING, required: true, value: c.text });
      inputs.push({ name: 'level', type: DATA_TYPE.STRING, required: false, value: c.level });
      inputs.push({ name: 'align', type: DATA_TYPE.STRING, required: false, value: c.align });
      break;

    case 'text':
      inputs.push({ name: 'text',  type: DATA_TYPE.STRING, required: true, value: c.text });
      inputs.push({ name: 'align', type: DATA_TYPE.STRING, required: false, value: c.align });
      break;

    case 'badge':
      inputs.push({ name: 'text',  type: DATA_TYPE.STRING, required: true,  value: c.text });
      inputs.push({ name: 'color', type: DATA_TYPE.STRING, required: false, value: c.color });
      break;

    case 'divider':
      inputs.push({ name: 'style', type: DATA_TYPE.STRING, required: false, value: c.style });
      break;

    default:
      inputs.push({ name: 'content', type: DATA_TYPE.UNKNOWN, required: false, value: c });
  }

  return { inputs, outputs };
}

/**
 * 分析单张幻灯片的数据流
 */
function analyzeSlide(slide) {
  const blockAnalyses = (slide.blocks || []).map(block => ({
    blockId:   block.id,
    blockType: block.type,
    ...analyzeBlock(block),
  }));

  // 收集幻灯片级别的输入/输出
  const slideInputs  = [];
  const slideOutputs = [];

  blockAnalyses.forEach(ba => {
    ba.inputs.forEach(inp => {
      if (!inp.value && inp.required !== false) {
        slideInputs.push({ ...inp, blockId: ba.blockId, blockType: ba.blockType });
      }
    });
    ba.outputs.forEach(out => {
      slideOutputs.push({ ...out, blockId: ba.blockId, blockType: ba.blockType });
    });
  });

  return {
    slideId:      slide.id,
    slideName:    slide.name,
    blockAnalyses,
    inputs:       slideInputs,
    outputs:      slideOutputs,
  };
}

/* ═══════════════════════════════════════════════════════
   Flowco 校验引擎
   ═══════════════════════════════════════════════════════ */

/**
 * 校验单个 Block 的数据完整性
 */
function validateBlock(block) {
  const issues = [];
  const c = block.content || {};

  // 通用校验
  if (!block.type) {
    issues.push({
      level:   VALIDATION_LEVEL.ERROR,
      code:    'MISSING_TYPE',
      message: 'Block is missing a type definition',
      blockId: block.id,
      fix:     'Assign a valid block type (heading, text, image, button, etc.)',
    });
  }

  // 类型特定校验
  switch (block.type) {
    case 'heading':
      if (!c.text || c.text.trim() === '') {
        issues.push({
          level:   VALIDATION_LEVEL.ERROR,
          code:    'EMPTY_HEADING',
          message: `Heading block (${block.id}) has empty text`,
          blockId: block.id,
          fix:     'Add meaningful heading text',
        });
      }
      if (c.text && c.text.length > 200) {
        issues.push({
          level:   VALIDATION_LEVEL.WARNING,
          code:    'HEADING_TOO_LONG',
          message: `Heading text is very long (${c.text.length} chars). H1 should be < 80 chars.`,
          blockId: block.id,
          fix:     'Shorten the heading for better readability',
        });
      }
      if (c.level && !['h1', 'h2', 'h3', 'h4'].includes(c.level)) {
        issues.push({
          level:   VALIDATION_LEVEL.WARNING,
          code:    'INVALID_HEADING_LEVEL',
          message: `Invalid heading level: ${c.level}`,
          blockId: block.id,
          fix:     'Use h1, h2, or h3',
        });
      }
      break;

    case 'image':
      if (!c.alt || c.alt.trim() === '') {
        issues.push({
          level:   VALIDATION_LEVEL.WARNING,
          code:    'MISSING_ALT_TEXT',
          message: `Image block (${block.id}) missing alt text — bad for accessibility & SEO`,
          blockId: block.id,
          fix:     'Add descriptive alt text',
        });
      }
      if (!c.src || c.src.trim() === '') {
        issues.push({
          level:   VALIDATION_LEVEL.INFO,
          code:    'EMPTY_IMAGE_SRC',
          message: `Image block (${block.id}) has no source URL`,
          blockId: block.id,
          fix:     'Add an image URL or use a placeholder service like https://picsum.photos',
        });
      }
      break;

    case 'button':
      if (!c.text || c.text.trim() === '') {
        issues.push({
          level:   VALIDATION_LEVEL.ERROR,
          code:    'EMPTY_BUTTON_TEXT',
          message: `Button block (${block.id}) has empty label`,
          blockId: block.id,
          fix:     'Add button text',
        });
      }
      if (c.href && c.href !== '#' && !c.href.startsWith('http') && !c.href.startsWith('/') && !c.href.startsWith('#')) {
        issues.push({
          level:   VALIDATION_LEVEL.WARNING,
          code:    'INVALID_HREF',
          message: `Button href "${c.href}" may be invalid`,
          blockId: block.id,
          fix:     'Use a valid URL starting with http://, /, or #',
        });
      }
      break;

    case 'nav':
      if (!c.logo || c.logo.trim() === '') {
        issues.push({
          level:   VALIDATION_LEVEL.WARNING,
          code:    'MISSING_LOGO',
          message: `Navigation block (${block.id}) has no logo/brand name`,
          blockId: block.id,
          fix:     'Add a logo or brand name',
        });
      }
      if (!c.links || !Array.isArray(c.links) || c.links.length === 0) {
        issues.push({
          level:   VALIDATION_LEVEL.WARNING,
          code:    'EMPTY_NAV_LINKS',
          message: `Navigation block (${block.id}) has no links`,
          blockId: block.id,
          fix:     'Add navigation links (e.g., ["Home", "About", "Contact"])',
        });
      }
      break;

    case 'list':
      if (!c.items || !Array.isArray(c.items) || c.items.length === 0) {
        issues.push({
          level:   VALIDATION_LEVEL.ERROR,
          code:    'EMPTY_LIST',
          message: `List block (${block.id}) has no items`,
          blockId: block.id,
          fix:     'Add at least one list item',
        });
      }
      break;

    case 'card':
      if (!c.title || c.title.trim() === '') {
        issues.push({
          level:   VALIDATION_LEVEL.WARNING,
          code:    'MISSING_CARD_TITLE',
          message: `Card block (${block.id}) has no title`,
          blockId: block.id,
          fix:     'Add a card title',
        });
      }
      break;

    case 'hero':
      if (!c.title || c.title.trim() === '') {
        issues.push({
          level:   VALIDATION_LEVEL.ERROR,
          code:    'MISSING_HERO_TITLE',
          message: `Hero block (${block.id}) has no title — this is a critical element`,
          blockId: block.id,
          fix:     'Add a compelling hero headline',
        });
      }
      if (!c.cta || c.cta.trim() === '') {
        issues.push({
          level:   VALIDATION_LEVEL.WARNING,
          code:    'MISSING_HERO_CTA',
          message: `Hero block (${block.id}) has no call-to-action`,
          blockId: block.id,
          fix:     'Add a CTA text like "Get Started" or "Learn More"',
        });
      }
      break;
  }

  // 尺寸/位置校验
  if (block.w < 20 || block.h < 10) {
    issues.push({
      level:   VALIDATION_LEVEL.WARNING,
      code:    'BLOCK_TOO_SMALL',
      message: `Block (${block.id}) is very small (${block.w}×${block.h}px) — may not render properly`,
      blockId: block.id,
      fix:     'Increase block dimensions',
    });
  }

  if (block.x < 0 || block.y < 0) {
    issues.push({
      level:   VALIDATION_LEVEL.WARNING,
      code:    'BLOCK_OUT_OF_BOUNDS',
      message: `Block (${block.id}) position is outside the canvas (x=${block.x}, y=${block.y})`,
      blockId: block.id,
      fix:     'Move the block inside the canvas area',
    });
  }

  return issues;
}

/**
 * 校验幻灯片结构
 */
function validateSlide(slide, slideIndex, allSlides) {
  const issues = [];
  const blocks = slide.blocks || [];

  // 空幻灯片
  if (blocks.length === 0) {
    issues.push({
      level:   VALIDATION_LEVEL.ERROR,
      code:    'EMPTY_SLIDE',
      message: `Slide "${slide.name}" (index ${slideIndex}) has no blocks`,
      slideId: slide.id,
      fix:     'Add at least one block to this slide',
    });
    return issues;
  }

  // 每个 block 校验
  blocks.forEach(block => {
    const blockIssues = validateBlock(block);
    issues.push(...blockIssues.map(i => ({ ...i, slideId: slide.id })));
  });

  // 首张幻灯片没有 nav
  if (slideIndex === 0) {
    const hasNav = blocks.some(b => b.type === 'nav');
    if (!hasNav && allSlides.length > 1) {
      issues.push({
        level:   VALIDATION_LEVEL.INFO,
        code:    'NO_NAVBAR_FIRST_SLIDE',
        message: `First slide "${slide.name}" has no navigation bar`,
        slideId: slide.id,
        fix:     'Consider adding a navigation component to the first slide',
      });
    }
  }

  // 重叠检测
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const a = blocks[i];
      const b = blocks[j];
      const overlap = !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
      if (overlap) {
        const overlapArea = (
          Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
        ) * (
          Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
        );
        if (overlapArea > 200) {
          issues.push({
            level:   VALIDATION_LEVEL.WARNING,
            code:    'BLOCK_OVERLAP',
            message: `Blocks "${a.type}" and "${b.type}" overlap by ${overlapArea}px²`,
            slideId: slide.id,
            blockId: [a.id, b.id],
            fix:     'Adjust block positions to avoid overlap',
          });
        }
      }
    }
  }

  // 无 CTA 检测（非功能性页面）
  const hasCTA = blocks.some(b => b.type === 'button' || (b.type === 'hero' && b.content?.cta));
  const isUtilitySlide = slide.name?.toLowerCase().includes('footer') ||
                          slide.name?.toLowerCase().includes('divider');
  if (!hasCTA && !isUtilitySlide && slideIndex < allSlides.length - 1) {
    issues.push({
      level:   VALIDATION_LEVEL.INFO,
      code:    'NO_CTA',
      message: `Slide "${slide.name}" has no call-to-action element`,
      slideId: slide.id,
      fix:     'Consider adding a button or CTA to guide user flow',
    });
  }

  return issues;
}

/* ═══════════════════════════════════════════════════════
   完整项目校验
   ═══════════════════════════════════════════════════════ */

/**
 * 对整个幻灯片项目进行 Flowco 分析
 * @param {Array} slides
 * @returns {FlowcoReport}
 */
export function analyzeFlow(slides) {
  if (!slides || slides.length === 0) {
    return {
      status:     FLOW_STATUS.UNCHECKED,
      issues:     [],
      slideFlows: [],
      summary:    { errors: 0, warnings: 0, infos: 0 },
      dataFlowMap: {},
    };
  }

  const allIssues = [];
  const slideFlows = [];

  // 逐幻灯片分析
  slides.forEach((slide, idx) => {
    const flow = analyzeSlide(slide);
    const issues = validateSlide(slide, idx, slides);
    slideFlows.push({ ...flow, issues });
    allIssues.push(...issues);
  });

  // 全局校验：检查跨幻灯片数据流一致性
  const globalIssues = validateGlobalFlow(slides);
  allIssues.push(...globalIssues);

  // 生成数据流图
  const dataFlowMap = buildDataFlowMap(slideFlows);

  const summary = {
    errors:   allIssues.filter(i => i.level === VALIDATION_LEVEL.ERROR).length,
    warnings: allIssues.filter(i => i.level === VALIDATION_LEVEL.WARNING).length,
    infos:    allIssues.filter(i => i.level === VALIDATION_LEVEL.INFO).length,
  };

  const status = summary.errors > 0 ? FLOW_STATUS.INVALID
               : summary.warnings > 0 ? FLOW_STATUS.WARNING
               : FLOW_STATUS.VALID;

  return {
    status,
    issues: allIssues,
    slideFlows,
    summary,
    dataFlowMap,
  };
}

/**
 * 全局数据流校验
 */
function validateGlobalFlow(slides) {
  const issues = [];

  // 检查是否有重复的 H1 标题
  const h1Blocks = [];
  slides.forEach(slide => {
    (slide.blocks || []).forEach(block => {
      if (block.type === 'heading' && block.content?.level === 'h1') {
        h1Blocks.push({ block, slideName: slide.name });
      }
    });
  });
  if (h1Blocks.length > 1) {
    issues.push({
      level:   VALIDATION_LEVEL.WARNING,
      code:    'MULTIPLE_H1',
      message: `Found ${h1Blocks.length} H1 headings across slides — only one H1 is recommended per page for SEO`,
      fix:     'Change additional H1 elements to H2 or H3',
    });
  }

  // 检查是否有内容（至少一个 hero 或 heading）
  const hasHeroOrHeading = slides.some(s =>
    (s.blocks || []).some(b => b.type === 'hero' || (b.type === 'heading' && b.content?.level === 'h1'))
  );
  if (!hasHeroOrHeading) {
    issues.push({
      level:   VALIDATION_LEVEL.WARNING,
      code:    'NO_HERO_OR_H1',
      message: 'No hero section or H1 heading found — the website may lack a clear primary message',
      fix:     'Add a hero section or H1 heading to establish the page purpose',
    });
  }

  // 检查是否有 footer
  const hasFooter = slides.some(s => s.name?.toLowerCase().includes('footer'));
  if (!hasFooter && slides.length > 2) {
    issues.push({
      level:   VALIDATION_LEVEL.INFO,
      code:    'NO_FOOTER',
      message: 'No footer slide detected — consider adding a footer for better UX',
      fix:     'Add a footer slide with copyright, links, and contact info',
    });
  }

  return issues;
}

/**
 * 构建数据流图（节点→边 映射）
 */
function buildDataFlowMap(slideFlows) {
  const map = {};

  slideFlows.forEach(sf => {
    map[sf.slideId] = {
      name:    sf.slideName,
      inputs:  sf.inputs,
      outputs: sf.outputs,
      blocks:  sf.blockAnalyses.length,
    };
  });

  return map;
}

/* ═══════════════════════════════════════════════════════
   修复建议生成器
   ═══════════════════════════════════════════════════════ */

/**
 * 为每个 issue 生成 AI Prompt 修复建议
 */
export function generateFixSuggestions(issues, slides) {
  return issues
    .filter(i => i.level === VALIDATION_LEVEL.ERROR || i.level === VALIDATION_LEVEL.WARNING)
    .map(issue => ({
      issue,
      prompt: `Fix: ${issue.message}. ${issue.fix}`,
      patchHint: generatePatchHint(issue, slides),
    }));
}

function generatePatchHint(issue, slides) {
  if (!issue.slideId) return null;

  const slide = slides.find(s => s.id === issue.slideId);
  if (!slide) return null;

  switch (issue.code) {
    case 'EMPTY_HEADING':
      return {
        type: 'BLOCK_PATCH',
        action: 'update',
        blockId: issue.blockId,
        content: { text: 'Add Your Heading Here' },
      };
    case 'EMPTY_BUTTON_TEXT':
      return {
        type: 'BLOCK_PATCH',
        action: 'update',
        blockId: issue.blockId,
        content: { text: 'Get Started' },
      };
    case 'EMPTY_IMAGE_SRC':
      return {
        type: 'BLOCK_PATCH',
        action: 'update',
        blockId: issue.blockId,
        content: { src: 'https://picsum.photos/800/400' },
      };
    default:
      return null;
  }
}

/* ═══════════════════════════════════════════════════════
   摘要格式化工具
   ═══════════════════════════════════════════════════════ */

export function formatFlowReport(report) {
  const { summary, status } = report;
  const icon = status === FLOW_STATUS.VALID ? '✅'
             : status === FLOW_STATUS.WARNING ? '⚠️'
             : status === FLOW_STATUS.INVALID ? '❌' : '⏸';

  return {
    icon,
    statusText: status.charAt(0).toUpperCase() + status.slice(1),
    summaryText: `${summary.errors} error${summary.errors !== 1 ? 's' : ''}, ${summary.warnings} warning${summary.warnings !== 1 ? 's' : ''}, ${summary.infos} tip${summary.infos !== 1 ? 's' : ''}`,
    isBlocking: summary.errors > 0,
  };
}
