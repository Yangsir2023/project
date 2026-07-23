/**
 * userActionLog — Bifrost 用户控制权行为日志（RQ3 量化证据采集）
 *
 * 设计原则（遵循 AI 架构师「最小路径 / 不过度设计」）：
 *  - 纯前端、会话级（localStorage），无后端、无数据库、无新增模型调用。
 *  - 只记录「用户在哪里、以什么方式行使了控制权」，用于论文 RQ3 控制权热点分析。
 *  - 不记录任何 PII；导出为 CSV 供研究者分析。
 *
 * 事件类型（与 职责制定/02-开发组-产品架构分析与改造清单.md 一致）：
 *  PROPOSAL_CONFIRM  用户在提案阶段确认某页
 *  BLOCK_PATCH       用户通过对话框指令触发 AI 对画布的纠偏
 *  PROPOSAL_DRAG     提案画布拖拽
 *  PROPOSAL_RESIZE   提案画布缩放
 *  EDITOR_DRAG_START 编辑画布拖拽开始
 *  EDITOR_RESIZE_START 编辑画布缩放开始
 *  EDITOR_CONTENT    编辑文本/属性落定
 *  EDITOR_ADD        新增元素
 *  EDITOR_REMOVE     删除元素
 *  CHAT_PATCH        编辑阶段 AI Chat 直接改画布
 */

const STORAGE_KEY = 'bifrost_user_actions';

export function logAction(type, meta = {}) {
  try {
    const entry = {
      t: Date.now(),
      phase: meta.phase || '',
      type,
      slideIdx: meta.slideIdx ?? '',
      blockType: meta.blockType ?? '',
      op: meta.op ?? '',
      detail: meta.detail ?? (meta.count != null ? `n=${meta.count}` : (meta.blockTypes || '')),
    };
    const arr = getActions();
    arr.push(entry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch (e) {
    /* 存储不可用时静默降级，不影响主流程 */
  }
}

export function getActions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function clearLog() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
}

function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportActions(filename = 'bifrost_behavior_log.csv') {
  const arr = getActions();
  if (!arr.length) {
    console.warn('[telemetry] 暂无行为日志可导出');
    return;
  }
  const headers = ['timestamp_iso', 'phase', 'type', 'slideIdx', 'blockType', 'op', 'detail'];
  const rows = arr.map(a => [a.t && new Date(a.t).toISOString(), a.phase, a.type, a.slideIdx, a.blockType, a.op, a.detail]
    .map(csvCell).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  try {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log(`[telemetry] 已导出 ${arr.length} 条行为日志 -> ${filename}`);
  } catch (e) {
    console.error('[telemetry] 导出失败:', e);
  }
}
