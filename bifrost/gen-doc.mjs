import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } from "docx";
import { writeFileSync } from "fs";

const BORDER_NONE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const BORDER_BOTTOM = { style: BorderStyle.SINGLE, size: 6, color: "4472C4" };
const BLUE = "4472C4";
const DARK = "1F2937";
const GRAY = "6B7280";
const LIGHT_BG = "F3F4F6";

function heading(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 120 },
    children: [new TextRun({ text, color: BLUE, bold: true, size: 28 })],
  });
}

function body(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 80 },
    ...opts,
    children: [new TextRun({ text, color: DARK, size: 21, font: "Microsoft YaHei", ...opts })],
  });
}

function bodyCN(text) {
  return new Paragraph({
    spacing: { before: 60, after: 40 },
    children: [new TextRun({ text: "    " + text, color: DARK, size: 21, font: "Microsoft YaHei" })],
  });
}

function bodyEN(text) {
  return new Paragraph({
    spacing: { before: 0, after: 60 },
    children: [new TextRun({ text: "    " + text, color: GRAY, size: 20, font: "Calibri", italics: true })],
  });
}

function divider() {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    border: { bottom: { style: BorderStyle.DOTTED, size: 1, color: "CBD5E1" } },
    children: [],
  });
}

function featureTable(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 35, type: WidthType.PERCENTAGE },
            shading: { fill: BLUE },
            children: [new Paragraph({ children: [new TextRun({ text: "功能 / Feature", color: "FFFFFF", bold: true, size: 20, font: "Microsoft YaHei" })] })],
          }),
          new TableCell({
            width: { size: 65, type: WidthType.PERCENTAGE },
            shading: { fill: BLUE },
            children: [new Paragraph({ children: [new TextRun({ text: "说明 / Description", color: "FFFFFF", bold: true, size: 20, font: "Microsoft YaHei" })] })],
          }),
        ],
      }),
      ...rows.map(([feat, desc], i) =>
        new TableRow({
          shading: i % 2 === 0 ? { fill: LIGHT_BG } : undefined,
          children: [
            new TableCell({
              width: { size: 35, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: feat, color: DARK, size: 20, font: "Microsoft YaHei", bold: true })] })],
            }),
            new TableCell({
              width: { size: 65, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: desc, color: DARK, size: 20, font: "Microsoft YaHei" })] })],
            }),
          ],
        })
      ),
    ],
  });
}

const doc = new Document({
  sections: [
    {
      properties: {},
      children: [
        // ============ TITLE ============
        new Paragraph({ spacing: { after: 60 }, children: [] }),
        new Paragraph({
          alignment: "center",
          spacing: { after: 40 },
          children: [new TextRun({ text: "Bifrost", size: 52, bold: true, color: BLUE })],
        }),
        new Paragraph({
          alignment: "center",
          spacing: { after: 120 },
          children: [new TextRun({ text: "全栈个人AI研究助手  ·  Full-Stack Personal AI Research Assistant", size: 24, color: GRAY, italics: true })],
        }),

        new Paragraph({
          alignment: "center",
          spacing: { after: 200 },
          border: { bottom: BORDER_BOTTOM },
          children: [new TextRun({ text: "项目文档  ·  Project Documentation", size: 22, color: GRAY })],
        }),

        // ============ 1. OVERVIEW ============
        heading("一、项目概述  |  1. Overview"),
        bodyCN("Bifrost 是一个基于 React + Vite 的全栈个人 AI 研究助手，运行在本地浏览器。"),
        bodyEN("Bifrost is a full-stack personal AI research assistant built with React + Vite, running locally in your browser."),
        bodyCN("用户选择研究主题后，AI 自动完成信息搜索、内容生成、质量审查全流程，最终输出结构化的研究报告。"),
        bodyEN("After selecting a topic, the AI automatically handles the entire workflow: information search, content generation, and quality review, producing a structured research report."),
        bodyCN("技术栈：React 18 + Vite + Google Gemini API"),
        bodyEN("Tech stack: React 18 + Vite + Google Gemini API"),

        divider(),

        // ============ 2. WORKFLOW ============
        heading("二、核心工作流  |  2. Core Workflow"),
        bodyCN("输入主题 → 自动搜索 → AI 整理 → 生成报告 → 质量审查 → 多版本迭代"),
        bodyEN("Enter topic → Auto search → AI organize → Generate report → Quality review → Multi-version iteration"),

        divider(),

        // ============ 3. FEATURES TABLE ============
        heading("三、功能一览  |  3. Feature List"),
        featureTable([
          ["🌐 AI 搜索\nAI Search", "输入任意主题，AI 自动联网搜索并搜集相关资料。\nEnter any topic, AI auto-searches the web and collects relevant materials."],
          ["📄 报告生成\nReport Generation", "将搜索结果整理为结构化研究报告，含目录、分节、引用。\nConverts search results into structured reports with TOC, sections, and citations."],
          ["🔍 质量审查\nQuality Review", "AI 自动检查报告质量：完整性、逻辑一致性、引用准确性。\nAI auto-checks report quality: completeness, logic consistency, citation accuracy."],
          ["📊 管线模式\nPipeline Mode", "分步骤可视化管线：搜索→整理→起草→审查→定稿，每步可单独 refine。\nVisual step-by-step pipeline: Search → Organize → Draft → Review → Finalize, each step independently refinable."],
          ["🎨 可视化流图\nVisual Flow", "纯图标圆形节点 + 粒子动画连接线，拖拽重排阶段，自动播放巡览。\nIcon-only circle nodes + particle animation connectors, drag-to-reorder, auto-play tour."],
          ["📦 版本管理\nVersion Mgmt", "每次生成保留历史版本，可对比、回退、删除，最多保留 5 个版本。\nEach generation keeps history; compare, rollback or delete, up to 5 versions retained."],
          ["🖥️ 全屏预览\nFullscreen", "任意阶段内容可全屏展开，左右键切换阶段，Esc 退出。\nFullscreen any stage, arrow keys to navigate between stages, Esc to exit."],
          ["⌨️ 键盘操作\nKeyboard", "全键盘可操作：Space 自动播放，← → 导航，Esc 退出。\nFully keyboard-operable: Space auto-play, ← → navigate, Esc to exit."],
          ["🌗 主题切换\nTheme Toggle", "支持亮色/暗色主题一键切换。\nLight/Dark theme one-click toggle."],
          ["⚡ Vite 构建\nVite Build", "Vite 开发服务器热更新 + 生产构建优化，部署于 3007 端口。\nVite dev server with HMR + optimized production build, deployed on port 3007."],
        ]),

        divider(),

        // ============ 4. MODES ============
        heading("四、三种工作模式  |  4. Three Working Modes"),
        bodyCN("Bifrost 提供三种工作模式，适应不同研究需求："),
        bodyEN("Bifrost offers three working modes to adapt to different research needs:"),

        bodyCN("① 简报模式 (Brief)：快速概览，适合简单问题，几分钟出结果。"),
        bodyEN("① Brief Mode: Quick overview for simple questions, results in minutes."),
        bodyCN("② 深度模式 (Deep)：完整研究报告，含详细分析、多源引用、章节结构。"),
        bodyEN("② Deep Mode: Full research report with detailed analysis, multi-source citations, chapter structure."),
        bodyCN("③ 管线模式 (Pipeline)：分步可视化，每步可控、可调整、可重做。"),
        bodyEN("③ Pipeline Mode: Step-by-step visualization, each step controllable, adjustable, and re-runnable."),

        divider(),

        // ============ 5. PIPELINE DETAIL ============
        heading("五、管线模式详解  |  5. Pipeline Mode In-Depth"),

        bodyCN("阶段节点（纯图标圆形，拖拽可调序）："),
        bodyEN("Stage nodes (icon-only circles, drag-to-reorder):"),
        bodyCN("🔍 搜索 → 🗂️ 整理 → ✍️ 起草 → ✅ 审查 → 📝 定稿"),
        bodyEN("🔍 Search → 🗂️ Organize → ✍️ Draft → ✅ Review → 📝 Finalize"),

        bodyCN("交互方式："),
        bodyEN("Interactions:"),
        bodyCN("  • 单击节点 — 切换阶段，viewport 实时更新"),
        bodyEN("  • Click node — switch stage, viewport updates in real time"),
        bodyCN("  • 双击节点 — 全屏预览当前阶段内容"),
        bodyEN("  • Double-click — fullscreen preview current stage"),
        bodyCN("  • 拖拽节点 — 重排管线执行顺序"),
        bodyEN("  • Drag node — reorder pipeline execution"),
        bodyCN("  • 拖动分隔条 — 调整 iframe 视窗高度"),
        bodyEN("  • Drag divider — adjust iframe viewport height"),
        bodyCN("  • Space 键 — 自动播放/暂停"),
        bodyEN("  • Space key — auto-play / pause"),

        divider(),

        // ============ 6. VERSION MGMT ============
        heading("六、版本管理  |  6. Version Management"),
        bodyCN("每次 AI 报告生成后自动保存为版本记录，支持："),
        bodyEN("Every AI report generation is automatically saved as a version record, supporting:"),
        bodyCN("  • 版本列表展示（编号、日期、主题）"),
        bodyEN("  • Version list display (number, date, topic)"),
        bodyCN("  • 一键加载历史版本"),
        bodyEN("  • One-click load historical version"),
        bodyCN("  • 版本删除（最多保留 5 个版本）"),
        bodyEN("  • Version deletion (max 5 versions retained)"),
        bodyCN("  • 自动带时间戳命名"),
        bodyEN("  • Auto-naming with timestamp"),

        divider(),

        // ============ 7. FUTURE ============
        heading("七、未来改进方向  |  7. Future Improvements"),

        bodyCN("1. 后端服务集成"),
        bodyEN("1. Backend Service Integration"),
        bodyCN("    目前纯前端运行，API Key 暴露在浏览器中。计划引入 Node.js 后端中间层处理 API 调用，保护密钥安全。"),
        bodyEN("    Currently pure front-end, API key exposed in browser. Plan to introduce Node.js backend middleware for secure API calls."),

        bodyCN("2. 持久化存储"),
        bodyEN("2. Persistent Storage"),
        bodyCN("    版本数据目前仅存于浏览器 localStorage。计划接入数据库（如 SQLite / Supabase）实现云端同步。"),
        bodyEN("    Version data currently only in browser localStorage. Plan to add database (SQLite / Supabase) for cloud sync."),

        bodyCN("3. 多模态输入"),
        bodyEN("3. Multi-Modal Input"),
        bodyCN("    目前仅支持文本输入。计划支持文件上传（PDF / DOCX / 图片），AI 直接分析文档内容。"),
        bodyEN("    Currently text-only. Plan to support file upload (PDF / DOCX / images), AI directly analyzes document content."),

        bodyCN("4. 协作功能"),
        bodyEN("4. Collaboration Features"),
        bodyCN("    添加报告分享链接、评论标注、多人协作编辑等功能。"),
        bodyEN("    Add report sharing links, comments & annotations, multi-user collaborative editing."),

        bodyCN("5. 导出格式扩展"),
        bodyEN("5. Export Format Expansion"),
        bodyCN("    目前仅 HTML 输出。计划支持导出为 DOCX、PDF、Markdown 等格式。"),
        bodyEN("    Currently HTML-only output. Plan to support export to DOCX, PDF, Markdown, and more."),

        bodyCN("6. 引用与来源追溯"),
        bodyEN("6. Citation & Source Tracking"),
        bodyCN("    增强搜索结果的可追溯性，每条引用附带来源 URL 和检索时间。"),
        bodyEN("    Enhance traceability of search results, each citation with source URL and retrieval time."),

        bodyCN("7. 自定义管线模板"),
        bodyEN("7. Custom Pipeline Templates"),
        bodyCN("    允许用户保存和复用自定义的管线阶段组合，适配不同类型的研究任务。"),
        bodyEN("    Allow users to save and reuse custom pipeline stage combinations for different research types."),

        bodyCN("8. 移动端适配"),
        bodyEN("8. Mobile Adaptation"),
        bodyCN("    优化移动端布局和交互体验，支持在手机上完成研究流程。"),
        bodyEN("    Optimize mobile layout and interactions, support full research workflow on phone."),

        divider(),

        // ============ 8. TECH STACK ============
        heading("八、技术栈  |  8. Tech Stack"),
        featureTable([
          ["前端框架 / Frontend", "React 18 (函数组件 + Hooks)"],
          ["构建工具 / Build Tool", "Vite 6"],
          ["语言 / Language", "JavaScript (JSX)"],
          ["AI 接口 / AI API", "Google Gemini API (gemini-2.5-flash)"],
          ["CSS / 样式", "纯 CSS（无框架），~2000 行自定义样式"],
          ["端口 / Port", "localhost:3007"],
          ["运行环境 / Runtime", "Node.js + 浏览器"],
        ]),

        divider(),

        // ============ 9. FOOTER ============
        new Paragraph({
          alignment: "center",
          spacing: { before: 200 },
          children: [new TextRun({ text: "— 文档结束  ·  End of Document —", color: GRAY, size: 18, italics: true })],
        }),
      ],
    },
  ],
});

const buf = await Packer.toBuffer(doc);
writeFileSync("Bifrost-项目文档-Project-Documentation.docx", buf);
console.log("✅ 文档已生成: Bifrost-项目文档-Project-Documentation.docx");
