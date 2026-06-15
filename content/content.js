/**
 * 蓝湖 Axure 需求提取器 — 内容脚本 v2.2
 *
 * 拾取模式改为框选（拖拽选择区域），支持跨 iframe。
 * 只在顶层 frame 显示浮动面板，iframe 中的选择结果通过 postMessage 传回。
 */

(() => {
  'use strict';

  // ==================== i18n helper ====================
  // Inline translations for user-choosable languages
  const LANG = {
    zh_CN: {
      floaterTitle: '文档构建', addModule: '新增模块', expandCollapse: '展开/收起所有',
      selectAll: '全选', deselectAll: '取消全选', selectedCount: '已选 $1/$2', deleteSelected: '删除', preview: '预览', download: '下载',
      close: '关闭', title: '标题', content: '内容', pick: '拾取', addEntry: '新增',
      moveUp: '上移', moveDown: '下移', delete: '删除',
      noContent: '暂无内容，点击 🎯 拾取页面元素',
      emptyList: '点击「新增模块」开始构建文档',
      pickTitle: '拾取标题', pickContent: '拾取内容', previewModule: '预览此模块',
      deleteModule: '删除此模块',
      pickActive: '🎯 拾取已激活 — 在页面内容上点击提取',
      pickDoneTitle: '✅ 已拾取 — 继续拾取将覆盖当前标题',
      pickDoneContent: '✅ 已拾取 — 继续拾取将覆盖当前条目',
      pageSwitched: '页面已切换', pageSaved: '📄 数据已保存', dismiss: '知道了',
      noMoreTip: '不再提示', gotIt: '我知道了 ($1s)',
      statusLoaded: '已加载 $1 个模块', statusModules: '模块 $1 个',
      statusNoContent: '⚠️ 暂无内容', statusEmpty: '⚠️ 所选区域无内容',
      statusDownloaded: '✅ 已下载', statusPreviewOpen: '✅ 预览已打开',
      statusDeleted: '✅ 已删除，剩余 $1 个',
      statusPickFail: '⚠️ 所选区域无内容',
      statusSelectToDelete: '⚠️ 请先勾选要删除的模块',
      statusNoModuleContent: '⚠️ 该模块无内容',
      statusDragSelect: '拖拽选择区域...',
      statusAreaTooSmall: '框选区域太小，请重新选择',
      statusNoElement: '⚠️ 未选中有效元素',
      statusNoPath: '⚠️ 无法构建元素路径',
      statusResultSent: '✅ 结果已发送到顶层页面',
      statusSendFail: '⚠️ 无法发送到顶层页面',
      statusCapturing: '📷 $1···',
      statusCaptureDone: '✅ $1 截图已就位',
      statusCaptureFail: '⚠️ $1 失败: $2',
      screenshotFull: '🖥 全屏',
      screenshotPage: '📄 整页',
      screenshotContainer: '🎯 容器',
      screenshotMulti: '➕ 多选',
      docName: '文档',
      modulePreview: '模块预览',
      unknownPage: '未知页面',
      extractionTime: '提取时间',
      optionsHeading: '选项',
      dataTable: '数据表',
      dataArea: '数据区域',
      pageSwitchDesc: '当前页面的模块数据已自动保存。如需继续编辑，请点击浏览器右上角扩展图标选择「打开文档构建器」',
      openBuilderLabel: '打开文档构建器',
      dataSavedToast: '📄 数据已保存',
      gotItBtn: '知道了',
    },
    en: {
      floaterTitle: 'Doc Builder', addModule: 'Add Module', expandCollapse: 'Expand / Collapse',
      selectAll: 'Select All', deselectAll: 'Deselect All', selectedCount: 'Selected $1/$2', deleteSelected: 'Delete', preview: 'Preview', download: 'Download',
      close: 'Close', title: 'Title', content: 'Content', pick: 'Pick', addEntry: 'Add',
      moveUp: 'Up', moveDown: 'Down', delete: 'Delete',
      noContent: 'No content yet, click 🎯 to pick page elements',
      emptyList: 'Click Add Module to start building',
      pickTitle: 'Pick Title', pickContent: 'Pick Content', previewModule: 'Preview this module',
      deleteModule: 'Delete this module',
      pickActive: '🎯 Pick active — click on page content to extract',
      pickDoneTitle: '✅ Picked — keeps picking will overwrite title',
      pickDoneContent: '✅ Picked — keeps picking will overwrite entry',
      pageSwitched: 'Page Switched', pageSaved: '📄 Data saved', dismiss: 'Dismiss',
      noMoreTip: "Don't show again", gotIt: 'Got it ($1s)',
      statusLoaded: 'Loaded $1 modules', statusModules: '$1 modules',
      statusNoContent: '⚠ No content', statusEmpty: '⚠ No content yet',
      statusDownloaded: '✅ Downloaded', statusPreviewOpen: '✅ Preview opened',
      statusDeleted: '✅ Deleted, $1 remaining',
      statusPickFail: '⚠ No content in selection',
      statusSelectToDelete: '⚠ Select modules to delete first',
      statusNoModuleContent: '⚠ This module has no content',
      statusDragSelect: 'Drag to select area...',
      statusAreaTooSmall: 'Selection too small, try again',
      statusNoElement: '⚠ No valid element selected',
      statusNoPath: '⚠ Cannot build element path',
      statusResultSent: '✅ Result sent to top page',
      statusSendFail: '⚠ Failed to send to top page',
      statusCapturing: '📷 $1...',
      statusCaptureDone: '✅ $1 captured',
      statusCaptureFail: '⚠ $1 failed: $2',
      screenshotFull: '🖥 Fullscreen',
      screenshotPage: '📄 Full page',
      screenshotContainer: '🎯 Container',
      screenshotMulti: '➕ Multi',
      docName: 'doc',
      modulePreview: 'Module preview',
      unknownPage: 'Unknown page',
      extractionTime: 'Extracted at',
      optionsHeading: 'Options',
      dataTable: 'Data table',
      dataArea: 'Data area',
      pageSwitchDesc: 'Module data auto-saved. Reopen from the extension icon to continue editing.',
      openBuilderLabel: 'Open Doc Builder',
      dataSavedToast: '📄 Data saved',
      gotItBtn: 'Got it',
    },
  };
  let _lang = null; // 'zh_CN' or 'en' or null (browser default)
  chrome.storage.local.get('axure_utils_lang', (d) => {
    if (d && d.axure_utils_lang) _lang = d.axure_utils_lang;
  });
  // Also check localStorage (popup sets this for immediate effect)
  try { _lang = localStorage.getItem('axure_utils_lang') || _lang; } catch {}

  const _t = (key, ...subs) => {
    // If user overrode language, use inline translations
    if (_lang && LANG[_lang] && LANG[_lang][key]) {
      let msg = LANG[_lang][key];
      if (subs.length > 0) {
        subs.forEach((s, i) => { msg = msg.replace(`$${i + 1}`, s); });
      }
      return msg;
    }
    // Fallback to chrome.i18n (browser default)
    const msg = chrome.i18n.getMessage(key, subs);
    return msg || key;
  };

  const FRAME_CTX = getFrameContext();
  console.log(`[蓝湖提取器] 已加载 — ${FRAME_CTX}`);

  // 通知 background：此 tab 的内容脚本已重新加载，重置拾取状态
  if (FRAME_CTX === 'top') {
    chrome.runtime.sendMessage({ action: 'content-reloaded' }).catch(() => {});
  }

  // 每个 frame 的标识，用于日志区分
  const frameTag = FRAME_CTX === 'top' ? '[T ]' : '[IF]';

  // ==================== 工具 ====================

  function getFrameContext() {
    try {
      if (window.top === window.self) return 'top';
      return window.parent.location.hostname.includes('lanhuapp') ? 'lanhu-iframe' : 'unknown-iframe';
    } catch { return 'cross-origin-iframe'; }
  }

  function axureText(el) {
    if (!el) return '';
    const td = el.closest('[id$="_text"]') || el.querySelector('.text, [id$="_text"]');
    if (td && td.innerText.trim()) return td.innerText.trim();
    return el.innerText.trim();
  }

  function escapeMd(t) {
    if (!t) return '';
    return sanitizeMd(t)
      // 表格单元格内：阻止块级 Markdown 解析（列表/标题/引用/分隔线）
      .replace(/^(#{1,6})\s/gm, '\\$1 ')
      .replace(/^(- |> |\* |\+ |\d+\.\s)/gm, '\\$1')
      .replace(/^(-{3,}|\*{3,}|_{3,})\s*$/gm, '\\$&')
      // 管道符实体 + 换行合并
      .replace(/\|/g, '&#124;')
      .replace(/\n/g, ' ');
  }

  // ==================== Markdown 字符清洗 ====================
  /** 防御性清洗，移除会破坏渲染的不可见/控制字符，转义 HTML */
  function sanitizeMd(text) {
    if (!text) return '';
    return text
      // 1. 移除控制字符（保留换行和制表符）
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // 2. 移除零宽/不可见字符
      .replace(/[\u200B-\u200D\uFEFF\u00AD\u2060\u2061\u2062\u2063\u2064]/g, '')
      // 3. 转义 HTML 尖括号（防止 HTML 注入）
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // 4. trim
      .trim();
  }

  // ==================== 表格构建 ====================

  function buildTable(elements) {
    const items = Array.from(elements).map(el => {
      const r = el.getBoundingClientRect();
      return { text: axureText(el), x: Math.round(r.left), y: Math.round(r.top) };
    }).filter(c => !isNaN(c.x) && !isNaN(c.y)); // 只过滤无效坐标，保留空文本

    if (items.length < 4) return null;
    const rows = [];
    [...items].sort((a, b) => a.y - b.y).forEach(c => {
      let row = rows.find(r => Math.abs(r.y - c.y) <= 8);
      if (row) { row.cells.push(c); row.y = Math.min(row.y, c.y); }
      else rows.push({ y: c.y, cells: [c] });
    });
    rows.forEach(r => r.cells.sort((a, b) => a.x - b.x));
    if (rows.length < 2) return null;
    const maxCols = Math.max(...rows.map(r => r.cells.length));
    if (maxCols < 2) return null;
    rows.forEach(r => { while (r.cells.length < maxCols) r.cells.push({ text: '' }); });
    return { rows: rows.length, cols: maxCols, rowData: rows.map(r => r.cells.map(c => c.text)) };
  }

  function mdTable(table) {
    let data = table.rowData.map(row => [...row]); // 深拷贝

    // ---- 1. 移除全部为空的行 ----
    data = data.filter(row => row.some(c => c && c.trim()));
    if (data.length < 2) return '';

    // ---- 2. 列数对齐（补齐缺失列） ----
    const maxCols = Math.max(...data.map(r => r.length));
    if (maxCols < 2) return '';
    data.forEach(r => { while (r.length < maxCols) r.push(''); });

    // ---- 3. 递归修剪尾部空列 ----
    // 注意：用 data[0].length 而非固定 maxCols，因为 pop 后会变
    while (data[0].length > 2 && data.every(r => {
      const last = r[r.length - 1];
      return !last || !last.trim();
    })) {
      data.forEach(r => r.pop());
    }
    // 修剪后若不足 2 列则丢弃
    if (data[0].length < 2) return '';

    // ---- 4. 生成 Markdown ----
    const lines = [];
    data.forEach((cells, idx) => {
      const texts = cells.map(t => escapeMd(t));
      // 空单元格补空格，避免 `||` 渲染问题
      const safeCells = texts.map(t => t || ' ');
      lines.push(`| ${safeCells.join(' | ')} |`);
      if (idx === 0) {
        lines.push(`| ${safeCells.map(() => '---').join(' | ')} |`);
      }
    });
    return lines.join('\n');
  }

  /** 框选区域内的所有元素 → 尝试构建表格 */
  function extractFromRect(x1, y1, x2, y2) {
    const left = Math.min(x1, x2), top = Math.min(y1, y2);
    const right = Math.max(x1, x2), bottom = Math.max(y1, y2);

    // 收集区域内所有可见的 Axure 组件
    const all = document.querySelectorAll('.ax_default.table_cell, .ax_default._形状1, .ax_default.shape, ' +
      '.ax_default.label, .ax_default.label1, .ax_default.box_1, .ax_default.box_2, ' +
      '.ax_default._文本段落1, .ax_default._文本段落, .ax_default.paragraph1');

    const inRect = [];
    all.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.left >= left && r.top >= top && r.right <= right && r.bottom <= bottom) {
        // table_cell/_形状1 保留空单元格，其他组件必须有文本才保留
        if (el.classList.contains('table_cell') || el.classList.contains('_形状1')) {
          inRect.push(el);
        } else {
          const t = axureText(el);
          if (t) inRect.push(el);
        }
      }
    });

    if (inRect.length === 0) {
      // 降级：取区域内第一个非空文本
      const e = document.elementFromPoint((left + right) / 2, (top + bottom) / 2);
      if (e) return { type: 'text', markdown: axureText(e) || e.innerText.trim() };
      return { type: 'empty', markdown: '' };
    }

    // 优先尝试表格
    const table = buildTable(inRect);
    if (table) return { type: 'table', markdown: mdTable(table) };

    // 否则作为文本块
    const texts = inRect.map(el => axureText(el)).filter(t => t);
    return { type: 'text', markdown: texts.join('\n\n') };
  }

  // ==================== 拾取 ====================

  let active = false;
  let floater = null;
  let rubber = null;
  let isFloaterDrag = false; // 浮框拖拽中标记，用于跳过拾取模式的 mousemove

  let selStartX = 0, selStartY = 0, selEndX = 0, selEndY = 0;
  let isDragging = false;
  let selectionLocked = false; // 点击选择后锁定高亮，hover 不覆盖

  // ---- 文档构建器 — 模块管理 ----

  let modules = [];           // { id, title, contents: [] }
  let nextModuleId = 1;
  let activePickField = null; // { moduleId, entryIdx?, field: 'title'|'content' }
  let pickMode = false;
  let collapsedModuleIds = new Set(); // 用户手动收起的模块
  let selectedModuleIds = new Set();
  let currentStorageKey = '';
  let urlPollTimer = null;
  let pickDebounceTimer = null;

  // ---- 浮动面板 ----

  // ==================== SVG 图标库 ====================
  const ICON = {
    plus: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 3v10M3 8h10"/></svg>',
    close: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
    trash: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 4h10M5.5 4V3a1 1 0 011-1h3a1 1 0 011 1v1M4 4v9a1 1 0 001 1h6a1 1 0 001-1V4"/></svg>',
    eye: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2"/></svg>',
    download: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 11v2a1 1 0 001 1h8a1 1 0 001-1v-2M8 3v7M5 7l3 3 3-3"/></svg>',
    target: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="5"/><circle cx="8" cy="8" r="2"/><circle cx="8" cy="8" r=".5" fill="currentColor"/></svg>',
    up: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 10l-4-4-4 4"/></svg>',
    down: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 6l4 4 4-4"/></svg>',
    check: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 8l3 3 7-7"/></svg>',
    grip: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#5c5f66" stroke-width="1.5" stroke-linecap="round"><line x1="7" y1="6" x2="17" y2="6"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="7" y1="18" x2="17" y2="18"/></svg>',
    add: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2.5" y="2.5" width="11" height="11" rx="2"/><path d="M8 5.5v5M5.5 8h5"/></svg>',
  };

  const HTML = `
<div id="__lh_f" style="all:initial;position:fixed;z-index:2147483647;bottom:20px;right:20px;
  width:440px;max-height:70vh;background:#1a1b1e;border:1px solid rgba(255,255,255,0.08);border-radius:10px;
  box-shadow:0 12px 40px rgba(0,0,0,0.45);font:13px -apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;
  color:#c1c2c5;display:none;flex-direction:column;">
 <div id="__lh_f_h" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;
    background:#25262b;border-bottom:1px solid rgba(255,255,255,0.06);border-radius:10px 10px 0 0;cursor:move;user-select:none;">
    <span style="color:#f08c00;font-weight:600;font-size:13px;display:flex;align-items:center;gap:6px;">
      <svg viewBox="0 0 18 18" width="16" height="16" fill="none" stroke="#f08c00" stroke-width="1.5">
        <path d="M9 3v12M3 9h12"/><circle cx="9" cy="9" r="7"/>
      </svg> ${_t('floaterTitle')}</span>
    <button id="__lh_f_x" data-tip="${_t('close')}" style="background:transparent;color:#909296;border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:4px 8px;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;transition:all 0.15s ease;">${ICON.close}</button>
  </div>
  <div id="__lh_f_tb" style="display:flex;align-items:center;gap:6px;padding:8px 14px;border-bottom:1px solid rgba(255,255,255,0.04);">
    <button id="__lh_f_add" data-tip="${_t('addModule')}" style="background:#f08c00;color:#fff;border:none;border-radius:6px;padding:6px 14px;font-size:12px;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:4px;font-weight:500;transition:all 0.15s ease;">${ICON.plus} ${_t('addModule')}</button>
    <button id="__lh_f_expand" data-tip="${_t('expandCollapse')}" style="background:rgba(255,255,255,0.06);color:#909296;border:none;border-radius:6px;padding:6px 10px;font-size:11px;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:3px;transition:all 0.15s ease;">${ICON.up}${ICON.down}</button>
    <span style="flex:1"></span>
    <button id="__lh_f_selall" data-tip="${_t('selectAll')}" style="background:rgba(255,255,255,0.06);color:#909296;border:none;border-radius:6px;padding:6px 12px;font-size:12px;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:4px;transition:all 0.15s ease;">${ICON.check} ${_t('selectAll')}</button>
    <button id="__lh_f_del_sel" data-tip="${_t('deleteSelected')}" style="background:#e03131;color:#fff;border:none;border-radius:6px;padding:6px 12px;font-size:12px;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:4px;transition:all 0.15s ease;">${ICON.trash} ${_t('deleteSelected')}</button>
  </div>
  <div id="__lh_f_list" style="flex:1;overflow-y:auto;padding:8px 12px;min-height:100px;"></div>
  <div id="__lh_f_ft" style="display:flex;gap:8px;padding:10px 14px;border-top:1px solid rgba(255,255,255,0.04);">
    <button id="__lh_f_preview" data-tip="${_t('previewModule')}" style="background:#f08c00;color:#fff;border:none;border-radius:6px;padding:6px 16px;font-size:12px;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:4px;font-weight:500;transition:all 0.15s ease;">${ICON.eye} ${_t('preview')}</button>
    <button id="__lh_f_download" data-tip="${_t('download')}" style="background:#f08c00;color:#fff;border:none;border-radius:6px;padding:6px 16px;font-size:12px;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:4px;font-weight:500;transition:all 0.15s ease;">${ICON.download} ${_t('download')}</button>
    <span id="__lh_f_status" style="flex:1;text-align:right;font-size:11px;color:#5c5f66;line-height:24px;"></span>
  </div>
</div>`;

  let createdByMe = false;

  // ---- 模块管理 ----

  /** 从 URL hash 的查询参数提取 versionId + pageId，作为缓存 key */
  function getStorageKey() {
    try {
      const hash = window.location.hash;
      const qIdx = hash.indexOf('?');
      if (qIdx >= 0) {
        const params = new URLSearchParams(hash.slice(qIdx));
        const vId = params.get('versionId');
        const pId = params.get('pageId');
        if (vId && pId) return `lh_${vId}_${pId}`;
      }
      const safe = hash.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 80);
      return `lh${safe ? '_' + safe : ''}`;
    } catch { return 'lh'; }
  }

  function saveModules() {
    try { chrome.storage.local.set({ [currentStorageKey]: modules }); } catch {}
  }

  function loadModules() {
    try {
      const key = getStorageKey();
      currentStorageKey = key;
      chrome.storage.local.get(key, (data) => {
        if (data && data[key] && data[key].length > 0) {
          modules = data[key];
          nextModuleId = (modules.reduce((max, m) => Math.max(max, m.id), 0) || 0) + 1;
        } else {
          modules = [];
          nextModuleId = 1;
        }
        renderModuleList();
        setStatus(modules.length ? _t('statusLoaded', modules.length) : '');
      });
    } catch {}
  }

  function addModule() {
    const m = { id: nextModuleId++, title: '', contents: [] };
    modules.push(m);
    renderModuleList();
    clampFloaterPosition();
    saveModules();
    setStatus(_t("statusModules", modules.length));
  }

  function removeModule(id) {
    modules = modules.filter(m => m.id !== id);
    selectedModuleIds.delete(id);
    renderModuleList();
    saveModules();
    setStatus(_t("statusModules", modules.length));
  }

  function moveModule(id, dir) {
    const idx = modules.findIndex(m => m.id === id);
    if (idx < 0) return;
    const to = idx + dir;
    if (to < 0 || to >= modules.length) return;
    [modules[idx], modules[to]] = [modules[to], modules[idx]];
    renderModuleList();
    saveModules();
  }

  function setModuleField(id, field, val) {
    const m = modules.find(x => x.id === id);
    if (m) m[field] = val;
    saveModules();
  }

  function addContentEntry(moduleId) {
    const m = modules.find(x => x.id === moduleId);
    if (m) { m.contents.push(''); renderModuleList(); clampFloaterPosition(); saveModules(); }
  }

  function removeContentEntry(moduleId, entryIdx) {
    const m = modules.find(x => x.id === moduleId);
    if (m) { m.contents.splice(entryIdx, 1); renderModuleList(); saveModules(); }
  }

  function moveContentEntry(moduleId, entryIdx, dir) {
    const m = modules.find(x => x.id === moduleId);
    if (!m) return;
    const to = entryIdx + dir;
    if (to < 0 || to >= m.contents.length) return;
    [m.contents[entryIdx], m.contents[to]] = [m.contents[to], m.contents[entryIdx]];
    renderModuleList();
    saveModules();
  }

  function setContentEntry(moduleId, entryIdx, val) {
    const m = modules.find(x => x.id === moduleId);
    if (m && m.contents[entryIdx] !== undefined) m.contents[entryIdx] = val;
    saveModules();
  }

  function getFullMarkdown() {
    // 优先从 Axure 内容的 iframe 取标题
    let pageTitle = getIframeTitle() || document.title || 'Untitled';
    const parts = [`# ${pageTitle}`];
    modules.forEach((m) => {
      if (m.title) parts.push(`## ${m.title}`);
      m.contents.forEach(c => { if (c) parts.push(c); });
    });
    return parts.join('\n\n');
  }

  /** 从包含 Axure 内容的 iframe 中获取页面标题 */
  function getIframeTitle() {
    const iframes = document.querySelectorAll('iframe');
    for (const f of iframes) {
      try {
        const doc = f.contentDocument || f.contentWindow?.document;
        if (doc && doc.title && doc.querySelector('.ax_default')) {
          return doc.title;
        }
      } catch { /* 跨域 iframe 跳过 */ }
    }
    return '';
  }

  // ---- 全选按钮状态更新 (支持中间态) ----
  function updateSelAllButton() {
    const selBtn = document.getElementById('__lh_f_selall');
    const delBtn = document.getElementById('__lh_f_del_sel');
    if (!selBtn) return;
    const total = modules.length;
    const checked = selectedModuleIds.size;
    if (checked === 0) {
      selBtn.innerHTML = `${ICON.check} ${_t('selectAll')}`;
      selBtn.style.opacity = '0.6';
    } else if (checked === total) {
      selBtn.innerHTML = `${ICON.close} ${_t('deselectAll')}`;
      selBtn.style.opacity = '1';
    } else {
      selBtn.innerHTML = `${ICON.check} ${_t('selectedCount', checked, total)}`;
      selBtn.style.opacity = '1';
      selBtn.style.color = '#f08c00';
    }
    if (delBtn) delBtn.style.opacity = checked > 0 ? '1' : '0.4';
  }

  // ---- 语言切换时刷新浮窗静态文字 ----
  function applyLanguageToFloater() {
    const f = document.getElementById('__lh_f');
    if (!f) return;
    // 标题
    const titleSpan = f.querySelector('#__lh_f_h span');
    if (titleSpan) titleSpan.innerHTML = `<svg viewBox="0 0 18 18" width="16" height="16" fill="none" stroke="#f08c00" stroke-width="1.5"><path d="M9 3v12M3 9h12"/><circle cx="9" cy="9" r="7"/></svg> ${_t('floaterTitle')}`;
    // 工具栏按钮
    const btnAdd = document.getElementById('__lh_f_add');
    if (btnAdd) { btnAdd.innerHTML = `${ICON.plus} ${_t('addModule')}`; btnAdd.dataset.tip = _t('addModule'); }
    const btnExpand = document.getElementById('__lh_f_expand');
    if (btnExpand) btnExpand.dataset.tip = _t('expandCollapse');
    const btnSel = document.getElementById('__lh_f_selall');
    if (btnSel) btnSel.dataset.tip = _t('selectAll');
    const btnDel = document.getElementById('__lh_f_del_sel');
    if (btnDel) { btnDel.innerHTML = `${ICON.trash} ${_t('deleteSelected')}`; btnDel.dataset.tip = _t('deleteSelected'); }
    const btnPrev = document.getElementById('__lh_f_preview');
    if (btnPrev) { btnPrev.innerHTML = `${ICON.eye} ${_t('preview')}`; btnPrev.dataset.tip = _t('previewModule'); }
    const btnDl = document.getElementById('__lh_f_download');
    if (btnDl) { btnDl.innerHTML = `${ICON.download} ${_t('download')}`; btnDl.dataset.tip = _t('download'); }
    const btnX = document.getElementById('__lh_f_x');
    if (btnX) btnX.dataset.tip = _t('close');
    updateSelAllButton();
  }

  // ---- 渲染模块列表 ----

  function renderModuleList() {
    const list = document.getElementById('__lh_f_list');
    if (!list) return;
    if (modules.length === 0) {
      list.innerHTML = '<div style="text-align:center;padding:30px 0;color:#5c5f66;font-size:13px;">' + _t('emptyList') + '</div>';
      return;
    }

    list.innerHTML = modules.map((m, mi) => {
          const isExpanded = !collapsedModuleIds.has(m.id);
          const isSelected = selectedModuleIds.has(m.id);
          return `
    <div data-module-id="${m.id}" draggable="true" class="lh-module-card"
      style="background:#25262b;border:1px solid ${isExpanded ? '#f08c00' : '#373a40'};border-radius:8px;margin-bottom:8px;overflow:hidden;${isExpanded ? 'box-shadow:0 0 0 1px rgba(240,140,0,0.2);' : ''}">
      <div class="lh-module-header" style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:#2c2e33;border-bottom:1px solid ${isExpanded ? '#373a40' : '#25262b'};cursor:pointer;user-select:none;">
        <span style="font-size:10px;color:#909296;flex-shrink:0;transition:transform 0.2s;${isExpanded ? 'transform:rotate(90deg);' : ''}">▶</span>
        <input type="checkbox" class="lh-module-cb" data-mid="${m.id}" ${isSelected ? 'checked' : ''}
          style="flex-shrink:0;accent-color:#f08c00;width:14px;height:14px;cursor:pointer;">
        <span style="flex:1;color:#f08c00;font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(m.title) || `${_t('title')} ${mi + 1}`}</span>
        <div style="display:flex;gap:4px;flex-shrink:0;">
          <button data-preview="${m.id}" data-tip="${_t('previewModule')}" style="background:#2b8a3e;color:#fff;border:none;border-radius:5px;padding:3px 8px;font-size:11px;cursor:pointer;display:inline-flex;align-items:center;gap:3px;">${ICON.eye}</button>
          <button data-mv="${m.id}" data-dir="-1" data-tip="${_t('moveUp')}" style="background:#373a40;color:#909296;border:none;border-radius:5px;padding:3px 8px;font-size:11px;cursor:pointer;display:inline-flex;align-items:center;" ${mi === 0 ? 'disabled style="opacity:0.3;cursor:default;"' : ''}>${ICON.up}</button>
          <button data-mv="${m.id}" data-dir="1" data-tip="${_t('moveDown')}" style="background:#373a40;color:#909296;border:none;border-radius:5px;padding:3px 8px;font-size:11px;cursor:pointer;display:inline-flex;align-items:center;" ${mi === modules.length - 1 ? 'disabled style="opacity:0.3;cursor:default;"' : ''}>${ICON.down}</button>
          <button data-rm="${m.id}" data-tip="${_t('deleteModule')}" style="background:transparent;color:#e03131;border:1px solid #e03131;border-radius:5px;padding:3px 8px;font-size:11px;cursor:pointer;display:inline-flex;align-items:center;">${ICON.trash}</button>
        </div>
      </div>
      <div class="lh-module-body" style="${isExpanded ? '' : 'display:none;'}padding:10px 14px 8px;animation:${isExpanded ? 'lhFadeIn 0.2s ease' : 'none'};">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;">
          <span style="font-size:12px;color:#909296;font-weight:500;white-space:nowrap;">${_t('title')}</span>
          <div style="flex:1;display:flex;align-items:center;background:#1a1b1e;border:1px solid #373a40;border-radius:6px;padding:2px 4px 2px 10px;">
            <input id="__lh_mt_${m.id}" draggable="false" value="${escHtml(m.title)}" placeholder="${_t('pick')}" style="flex:1;background:transparent;border:none;padding:6px 0;font-size:13px;color:#e0e0e0;outline:none;">
            <button data-pick="${m.id}:title" data-tip="${_t('pickTitle')}" style="background:#f08c00;color:#fff;border:none;border-radius:5px;padding:5px 10px;font-size:11px;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:3px;">${ICON.target} ${_t('pick')}</button>
          </div>
        </div>
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
            <span style="font-size:12px;color:#909296;font-weight:500;">${_t('content')} <span style="color:#5c5f66;font-weight:400;">(${m.contents.length})</span></span>
            <button data-addc="${m.id}" data-tip="${_t('addEntry')}" style="background:#2b8a3e;color:#fff;border:none;border-radius:5px;padding:3px 12px;font-size:11px;cursor:pointer;display:inline-flex;align-items:center;gap:3px;">${ICON.add} ${_t('addEntry')}</button>
          </div>
          ${m.contents.length === 0 ? `<div style="font-size:12px;color:#5c5f66;padding:12px 0;text-align:center;background:#1a1b1e;border-radius:6px;">${_t('noContent')}</div>` :
            m.contents.map((c, ci) => {
              const preview = c ? renderMarkdown(c).replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim().slice(0, 80) : '';
              return `
        <div style="background:#1a1b1e;border:1px solid #373a40;border-radius:6px;margin-bottom:6px;overflow:hidden;">
          <div style="display:flex;align-items:flex-start;gap:4px;padding:6px 8px;">
        <div style="flex:1;min-width:0;">
          <textarea id="__lh_mc_${m.id}_${ci}" draggable="false" rows="1" placeholder="${_t('content')} ${ci+1}" style="width:100%;background:transparent;border:none;padding:4px 6px;font-size:12px;color:#c1c2c5;outline:none;resize:vertical;font-family:inherit;line-height:1.5;min-height:28px;">${escHtml(c)}</textarea>
        </div>
            <div style="display:flex;gap:2px;flex-shrink:0;">
              <button data-pick="${m.id}:content:${ci}" data-tip="${_t('pickContent')}" style="background:#f08c00;color:#fff;border:none;border-radius:4px;padding:4px 7px;font-size:11px;cursor:pointer;display:inline-flex;align-items:center;">${ICON.target}</button>
              <button data-mvc="${m.id}:${ci}:-1" data-tip="${_t('moveUp')}" style="background:#373a40;color:#909296;border:none;border-radius:4px;padding:4px 6px;font-size:11px;cursor:pointer;display:inline-flex;align-items:center;" ${ci === 0 ? 'disabled style="opacity:0.3;cursor:default;"' : ''}>${ICON.up}</button>
              <button data-mvc="${m.id}:${ci}:1" data-tip="${_t('moveDown')}" style="background:#373a40;color:#909296;border:none;border-radius:4px;padding:4px 6px;font-size:11px;cursor:pointer;display:inline-flex;align-items:center;" ${ci === m.contents.length - 1 ? 'disabled style="opacity:0.3;cursor:default;"' : ''}>${ICON.down}</button>
              <button data-rmc="${m.id}:${ci}" data-tip="${_t('delete')}" style="background:transparent;color:#e03131;border:1px solid #e03131;border-radius:4px;padding:4px 6px;font-size:11px;cursor:pointer;display:inline-flex;align-items:center;">${ICON.trash}</button>
            </div>
          </div>
        </div>`}).join('')}
        </div>
      </div>
      <div class="lh-drop-indicator" style="height:2px;background:#f08c00;display:none;"></div>
    </div>`}).join('');

    // ---- 展开/收起 ----
    list.querySelectorAll('.lh-module-header').forEach(hd => {
      hd.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
        const card = hd.closest('[data-module-id]');
        if (!card) return;
        const mid = parseInt(card.dataset.moduleId);
        // 切换当前模块的展开/收起，不影响其他模块
        if (collapsedModuleIds.has(mid)) {
          collapsedModuleIds.delete(mid); // 展开
        } else {
          collapsedModuleIds.add(mid); // 收起
        }
        renderModuleList();
      });
    });

    // ---- 复选框 ---- (含全选按钮中间态)
    list.querySelectorAll('.lh-module-cb').forEach(cb => {
      cb.addEventListener('change', () => {
        const mid = parseInt(cb.dataset.mid);
        if (cb.checked) selectedModuleIds.add(mid);
        else selectedModuleIds.delete(mid);
        updateSelAllButton();
      });
    });

    updateSelAllButton();

    // ---- 拖拽（已优化：CSS 过渡 + rAF 节流） ----
    let dragRAF = null;
    list.querySelectorAll('[data-module-id]').forEach(card => {
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', card.dataset.moduleId);
        e.dataTransfer.effectAllowed = 'move';
        // 用 CSS class 替代 opacity 修改 + renderModuleList()
        card.classList.add('lh-dragging');
        // 拖拽时收起所有模块
        collapsedModuleIds = new Set(modules.map(m => m.id));
        list.querySelectorAll('.lh-module-body').forEach(b => b.style.display = 'none');
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('lh-dragging');
        list.querySelectorAll('.lh-drop-indicator').forEach(ind => ind.style.display = 'none');
        list.querySelectorAll('.lh-module-card.drag-over').forEach(c => c.classList.remove('drag-over'));
        if (dragRAF) { cancelAnimationFrame(dragRAF); dragRAF = null; }
      });
      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragRAF) return; // 已有待执行的 rAF，跳过
        dragRAF = requestAnimationFrame(() => {
          dragRAF = null;
          const draggedId = parseInt(e.dataTransfer.types.length ? e.dataTransfer.getData('text/plain') : -1);
          if (isNaN(draggedId)) return;
          // 隐藏所有指示器 + drag-over class
          list.querySelectorAll('.lh-drop-indicator').forEach(ind => ind.style.display = 'none');
          list.querySelectorAll('.lh-module-card.drag-over').forEach(c => c.classList.remove('drag-over'));
          // 显示当前卡片的指示器
          const indicator = card.querySelector('.lh-drop-indicator');
          if (indicator && parseInt(card.dataset.moduleId) !== draggedId) {
            indicator.style.display = 'block';
            card.classList.add('drag-over');
          }
        });
      });
      card.addEventListener('dragleave', (e) => {
        if (!card.contains(e.relatedTarget)) {
          const indicator = card.querySelector('.lh-drop-indicator');
          if (indicator) indicator.style.display = 'none';
          card.classList.remove('drag-over');
        }
      });
      card.addEventListener('drop', (e) => {
        e.preventDefault();
        const fromId = parseInt(e.dataTransfer.getData('text/plain'));
        const toId = parseInt(card.dataset.moduleId);
        if (isNaN(fromId) || fromId === toId) return;
        const fromIdx = modules.findIndex(m => m.id === fromId);
        const toIdx = modules.findIndex(m => m.id === toId);
        if (fromIdx < 0 || toIdx < 0) return;
        const [moved] = modules.splice(fromIdx, 1);
        const insertAt = fromIdx < toIdx ? toIdx - 1 : toIdx;
        modules.splice(insertAt < 0 ? 0 : insertAt, 0, moved);
        list.querySelectorAll('.lh-drop-indicator').forEach(ind => ind.style.display = 'none');
        list.querySelectorAll('.lh-module-card.drag-over').forEach(c => c.classList.remove('drag-over'));
        renderModuleList();
        saveModules();
      });
    });

    // ---- 按钮事件 ----
    list.querySelectorAll('[data-pick]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const parts = btn.dataset.pick.split(':');
        const mid = parseInt(parts[0]), field = parts[1];
        const entryIdx = parts[2] !== undefined ? parseInt(parts[2]) : undefined;
        collapsedModuleIds.delete(mid);
        renderModuleList();
        startPick(mid, field, entryIdx);
      });
    });
    list.querySelectorAll('[data-rm]').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); removeModule(parseInt(btn.dataset.rm)); });
    });
    list.querySelectorAll('[data-mv]').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); moveModule(parseInt(btn.dataset.mv), parseInt(btn.dataset.dir)); });
    });
    list.querySelectorAll('[data-addc]').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); addContentEntry(parseInt(btn.dataset.addc)); });
    });
    list.querySelectorAll('[data-rmc]').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); const p = btn.dataset.rmc.split(':'); removeContentEntry(parseInt(p[0]), parseInt(p[1])); });
    });
    list.querySelectorAll('[data-mvc]').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); const p = btn.dataset.mvc.split(':'); moveContentEntry(parseInt(p[0]), parseInt(p[1]), parseInt(p[2])); });
    });
    list.querySelectorAll('[data-preview]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const mid = parseInt(btn.dataset.preview);
        const m = modules.find(x => x.id === mid);
        if (!m) return;
        const parts = [];
        if (m.title) parts.push(`# ${m.title}`);
        m.contents.forEach(c => { if (c) parts.push(c); });
        const md = parts.join('\n\n');
        if (!md) { setStatus(_t('statusNoModuleContent')); return; }
        openPreviewWindow(m.title || _t('modulePreview'), md);
      });
    });

    list.querySelectorAll('input[id^="__lh_mt_"]').forEach(inp => {
      inp.addEventListener('input', () => { setModuleField(parseInt(inp.id.replace('__lh_mt_', '')), 'title', inp.value); });
    });
    list.querySelectorAll('textarea').forEach(ta => {
      ta.addEventListener('input', () => {
        const m = ta.id.match(/__lh_mc_(\d+)_(\d+)/);
        if (m) setContentEntry(parseInt(m[1]), parseInt(m[2]), ta.value);
      });
    });
  }

  function escHtml(s) {
    if (!s) return '';
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ---- 拾取到字段 ----

  function startPick(mId, field, entryIdx) {
    activePickField = { moduleId: mId, field, entryIdx };
    pickMode = true;

    // 注册拾取用的鼠标事件 + 光标
    document.addEventListener('mousedown', onMouseDown, true);
    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('mouseup', onMouseUp, true);
    document.body.style.cursor = 'crosshair';
    document.body.style.userSelect = 'none';

    if (FRAME_CTX === 'top') {
      setStatus(_t('pickActive'));
      document.querySelectorAll('[id^="__lh_mt_"],[id^="__lh_mc_"]').forEach(el => el.style.borderColor = '#373a40');
      const targetId = field === 'title' ? `__lh_mt_${mId}` : `__lh_mc_${mId}_${entryIdx}`;
      const inp = document.getElementById(targetId);
      if (inp) inp.style.borderColor = '#f08c00';
      hideHighlight();
      selectionLocked = false;
      console.log('[蓝湖] 顶层拾取激活, 通知 background 广播到所有 frame');
      chrome.runtime.sendMessage({
        action: 'sync-pick-state',
        moduleId: mId,
        field: field,
        entryIdx: entryIdx
      }).catch(() => {});
      const msg = { type: '__lh_sync_pick', moduleId: mId, field, entryIdx };
      document.querySelectorAll('iframe').forEach(f => {
        try { f.contentWindow.postMessage(msg, '*'); } catch (e) { console.log('[蓝湖] postMessage 到 iframe 失败:', e.message); }
      });
    } else {
      document.body.style.cursor = 'crosshair';
      document.body.style.userSelect = 'none';
      hideHighlight();
      selectionLocked = false;
      console.log('[蓝湖] iframe 直接进入拾取模式');
    }
  }

  function finishPick(md) {
    if (!activePickField) return;
    const { moduleId, field, entryIdx } = activePickField;
    const m = modules.find(x => x.id === moduleId);
    if (!m) return;

    if (field === 'title') {
      // 标题：覆盖
      m.title = md;
      const inp = document.getElementById(`__lh_mt_${moduleId}`);
      if (inp) { inp.value = md; }
    } else {
      // 内容：覆盖指定条目，若不存在则新建
      if (entryIdx !== undefined && m.contents[entryIdx] !== undefined) {
        m.contents[entryIdx] = md;
        const ta = document.getElementById(`__lh_mc_${moduleId}_${entryIdx}`);
        if (ta) ta.value = md;
      } else {
        m.contents.push(md);
        renderModuleList();
      }
    }

    // 持续拾取模式，不退出
    setStatus(_t(field === 'title' ? 'pickDoneTitle' : 'pickDoneContent'));
    saveModules();
    hideHighlight();
    document.body.style.cursor = 'crosshair';
    document.body.style.userSelect = 'none';
    console.log('[蓝湖] finishPick 成功:', field, entryIdx, md.slice(0, 40));
  }

  function cancelPick() {
    if (!activePickField) return;
    const { moduleId, field, entryIdx } = activePickField;

    if (FRAME_CTX === 'top') {
      const targetId = field === 'title' ? `__lh_mt_${moduleId}` : `__lh_mc_${moduleId}_${entryIdx}`;
      const inp = document.getElementById(targetId);
      if (inp) inp.style.borderColor = '#373a40';
      setStatus('');
      chrome.runtime.sendMessage({ action: 'cancel-pick-state' }).catch(() => {});
      document.querySelectorAll('iframe').forEach(f => {
        try { f.contentWindow.postMessage({ type: '__lh_cancel_pick' }, '*'); } catch {}
      });
    }

    // 移除鼠标事件 + 还原光标
    document.removeEventListener('mousedown', onMouseDown, true);
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('mouseup', onMouseUp, true);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    activePickField = null;
    pickMode = false;
    console.log('[蓝湖] 取消拾取');
  }

  /** 双击拾取父级 / 单击拾取元素 */
  function doPickPick(el, pickParent) {
    let target;
    if (pickParent) {
      const container = findContainer(el);
      target = container.el ? (container.el.parentElement || container.el) : (el.parentElement || el);
      console.log('[蓝湖] 双击 → 父容器:', target.tagName, target.className?.slice(0,40));
    } else {
      target = findContainer(el).el || el;
    }
    console.log('[蓝湖] pick target:', target.tagName, 'parentMode:', pickParent);
    const result = extractFromEl(target);
    console.log('[蓝湖] extract result:', result?.type, result?.markdown?.slice(0, 60));
    if (result.markdown) {
      if (FRAME_CTX !== 'top') {
        try {
          window.top.postMessage({ type: '__lh_picker_result', markdown: result.markdown, sourceType: result.type }, '*');
          console.log('[蓝湖] iframe 结果已发送到顶层');
        } catch { console.log('[蓝湖] 无法发送到顶层'); }
      } else {
        finishPick(result.markdown);
      }
      highlightEl(target);
      selectionLocked = true;
      console.log('[蓝湖] pick done, 定位框在:', target.tagName);
    } else {
      setStatus(_t('statusPickFail'));
    }
  }

  // ---- 预览 ----

  let previewWindow = null;

  function openPreviewWindow(title, md) {
    if (previewWindow && !previewWindow.closed) {
      try { previewWindow.close(); } catch {}
    }
    previewWindow = window.open('', '_blank', 'width=900,height=700');
    if (!previewWindow) { setStatus(_t('statusNoContent')); return; }
    const html = renderMarkdown(md);
    previewWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#1a1b1e;color:#c1c2c5;font:15px -apple-system,BlinkMacSystemFont,'PingFang SC','Noto Sans SC',sans-serif;padding:24px;line-height:1.8}
h1,h2,h3,h4{color:#f08c00;font-weight:600;margin:24px 0 12px}
h1{border-bottom:1px solid #373a40;padding-bottom:8px;font-size:24px}
h2{font-size:20px}h3{font-size:17px}
.table-wrap{overflow-x:auto;margin:12px 0}
.table-wrap table{width:auto;table-layout:auto;border-collapse:collapse;margin:0;font-size:14px}
th,td{border:1px solid #373a40;padding:8px 12px;text-align:left;white-space:nowrap}
th{background:#25262b;color:#e0e0e0;font-weight:600}
tr:nth-child(even){background:rgba(255,255,255,0.02)}
code{background:#25262b;padding:2px 6px;border-radius:3px;font-size:13px;color:#f08c00}
pre{background:#25262b;padding:12px 16px;border-radius:6px;overflow-x:auto;font-size:13px;line-height:1.5;margin:12px 0}
pre code{background:none;padding:0;color:#c1c2c5}
blockquote{border-left:3px solid #f08c00;margin:12px 0;padding:4px 16px;color:#909296}
hr{border:none;border-top:1px solid #373a40;margin:24px 0}
a{color:#f08c00;text-decoration:none}
a:hover{text-decoration:underline}
ul,ol{padding-left:24px;margin:8px 0}
li{margin:4px 0}
img{max-width:100%;border-radius:4px}
p{margin:8px 0}
strong{color:#e0e0e0}
</style></head><body>${html}</body></html>`);
    previewWindow.document.close();
    previewWindow.document.querySelectorAll('table').forEach(t => {
      const wrap = previewWindow.document.createElement('div');
      wrap.className = 'table-wrap';
      t.parentNode.insertBefore(wrap, t);
      wrap.appendChild(t);
    });
  }

  function showPreview() {
    const md = getFullMarkdown();
    if (!md) { setStatus(_t('statusNoContent')); return; }
    openPreviewWindow(_t('docName'), md);
    setStatus(_t('statusPreviewOpen'));
  }

  // ---- 浮动面板创建 ----

  function createFloater() {
    if (document.getElementById('__lh_f')) {
      floater = document.getElementById('__lh_f');
      return;
    }
    createdByMe = true;
    // 注入动画 keyframes + 工具提示样式 + 卡片过渡
    const styleId = '__lh_f_anim';
    if (!document.getElementById(styleId)) {
      const st = document.createElement('style');
      st.id = styleId;
      st.textContent = `
@keyframes lhFadeIn { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
[data-tip]{position:relative}
[data-tip]:hover::after{content:attr(data-tip);position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);padding:5px 9px;font-size:11px;color:#c1c2c5;background:#25262b;border:1px solid #373a40;border-radius:5px;white-space:nowrap;pointer-events:none;z-index:2147483647;animation:lhFadeIn .12s ease;box-shadow:0 2px 8px rgba(0,0,0,0.3)}
[data-tip]:hover::before{content:'';position:absolute;bottom:calc(100% + 4px);left:50%;transform:translateX(-50%);border:4px solid transparent;border-top-color:#373a40;pointer-events:none;z-index:2147483647}
.lh-module-card{transition:transform 0.2s ease,opacity 0.2s ease,box-shadow 0.2s ease}
.lh-module-card.lh-dragging{opacity:0.45;transform:scale(0.97)}
.lh-module-card.drag-over{border-color:#f08c00 !important;box-shadow:0 0 0 1px rgba(240,140,0,0.3) !important}
.lh-drop-indicator{transition:opacity 0.15s ease,height 0.15s ease}
.lh-btn-tip{display:inline-flex;align-items:center;gap:4px}
#__lh_f_list::-webkit-scrollbar{width:4px}
#__lh_f_list::-webkit-scrollbar-track{background:transparent}
#__lh_f_list::-webkit-scrollbar-thumb{background:#373a40;border-radius:2px}
#__lh_f_list::-webkit-scrollbar-thumb:hover{background:#5c5f66}
textarea::-webkit-scrollbar{width:3px}
textarea::-webkit-scrollbar-thumb{background:#373a40;border-radius:2px}
`.trim();
      document.head.appendChild(st);
    }
    const d = document.createElement('div');
    d.innerHTML = HTML;
    document.body.appendChild(d.firstElementChild);
    floater = document.getElementById('__lh_f');

    // 关闭
    document.getElementById('__lh_f_x')?.addEventListener('click', (e) => { e.stopPropagation(); deactivate(); });

    // 新增模块
    document.getElementById('__lh_f_add')?.addEventListener('click', (e) => { e.stopPropagation(); addModule(); });

    // 展开/收起所有
    document.getElementById('__lh_f_expand')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (collapsedModuleIds.size === 0) {
        // 全部展开中→全部收起
        collapsedModuleIds = new Set(modules.map(m => m.id));
      } else {
        // 有收起的→全部展开
        collapsedModuleIds.clear();
      }
      renderModuleList();
    });

    // 全选
    document.getElementById('__lh_f_selall')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (selectedModuleIds.size === modules.length) {
        selectedModuleIds.clear();
      } else {
        selectedModuleIds = new Set(modules.map(m => m.id));
      }
      renderModuleList();
    });
    document.getElementById('__lh_f_del_sel')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (selectedModuleIds.size === 0) { setStatus(_t('statusSelectToDelete')); return; }
      modules = modules.filter(m => !selectedModuleIds.has(m.id));
      selectedModuleIds.clear();
      // 清理已删除模块的收起状态
      const remainingIds = new Set(modules.map(m => m.id));
      collapsedModuleIds = new Set([...collapsedModuleIds].filter(id => remainingIds.has(id)));
      renderModuleList();
      clampFloaterPosition();
      saveModules();
      setStatus(_t("statusDeleted", modules.length));
    });

    // 预览
    document.getElementById('__lh_f_preview')?.addEventListener('click', (e) => { e.stopPropagation(); showPreview(); });

    // 下载
    document.getElementById('__lh_f_download')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const md = getFullMarkdown();
      if (!md) { setStatus(_t('statusNoContent')); return; }
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${_t('docName')}_${new Date().toISOString().slice(0, 10)}.md`;
      a.click();
      setStatus(_t('statusDownloaded'));
    });

    // 拖拽 — Pointer Events + setPointerCapture + transform + rAF
    const h = document.getElementById('__lh_f_h');
    if (h) {
      h.addEventListener('pointerdown', (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
        e.preventDefault();
        e.target.setPointerCapture(e.pointerId);
        const r = floater.getBoundingClientRect();
        const dx = e.clientX - r.left, dy = e.clientY - r.top;
        const fw = r.width, fh = r.height;
        // 隐藏真实浮框，创建轻量虚框
        floater.style.opacity = '0';
        const ghost = document.createElement('div');
        ghost.id = '__lh_f_ghost';
        ghost.style.cssText = `all:initial;position:fixed;left:0;top:0;width:${fw}px;height:${fh}px;
          background:rgba(26,27,30,0.55);border:1px solid rgba(240,140,0,0.25);border-radius:10px;
          box-shadow:0 12px 40px rgba(0,0,0,0.35);z-index:2147483646;pointer-events:none;
          transform:translate(${r.left}px,${r.top}px);will-change:transform;`;
        document.body.appendChild(ghost);
        floater.style.left = '0'; floater.style.top = '0';
        floater.style.bottom = 'auto'; floater.style.right = 'auto';
        isFloaterDrag = true;
        document.body.style.userSelect = 'none';
        let rafId = null, pendingX = 0, pendingY = 0;
        const vw = window.innerWidth, vh = window.innerHeight;
        const mv = (ev) => {
          pendingX = ev.clientX - dx;
          pendingY = ev.clientY - dy;
          if (!rafId) {
            rafId = requestAnimationFrame(() => {
              rafId = null;
              let x = pendingX, y = pendingY;
              if (x < 0) x = 0;
              if (x + fw > vw) x = vw - fw;
              if (y < 0) y = 0;
              if (y + fh > vh) y = vh - fh;
              ghost.style.transform = `translate(${x}px, ${y}px)`;
            });
          }
        };
        const up = () => {
          if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
          const gRect = ghost.getBoundingClientRect();
          floater.style.transform = `translate(${gRect.left}px, ${gRect.top}px)`;
          floater.style.opacity = '1';
          floater.style.willChange = '';
          ghost.remove();
          document.removeEventListener('pointermove', mv);
          document.removeEventListener('pointerup', up);
          isFloaterDrag = false;
          document.body.style.userSelect = '';
        };
        document.addEventListener('pointermove', mv);
        document.addEventListener('pointerup', up);
      }, { passive: false });
    }

    renderModuleList();
    loadModules();

    // ---- 页面切换检测：发现切换就关浮窗 + 提示 ----
    urlPollTimer = setInterval(() => {
      if (!document.getElementById('__lh_f')) {
        clearInterval(urlPollTimer);
        urlPollTimer = null;
        return;
      }
      const newKey = getStorageKey();
      if (newKey === currentStorageKey) return;
      saveModules();
      if (pickMode) cancelPick();
      showPageSwitchTip();
      deactivate();
    }, 500);
  }

  /** 页面切换提示 — 全屏遮罩（首次）或底部小 toast（已勾"不再提示"） */
  function showPageSwitchTip() {
    // 检查用户是否勾选了"不再提示"
    chrome.storage.local.get('__lh_no_page_tip', (d) => {
      if (d && d.__lh_no_page_tip) {
        showPageSwitchToast();
      } else {
        showPageSwitchDialog();
      }
    });
  }

  /** 底部小 toast，3秒自动关闭 */
  function showPageSwitchToast() {
    const toast = document.createElement('div');
    toast.id = '__lh_toast';
    Object.assign(toast.style, {
      position: 'fixed',
      zIndex: '2147483647',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: '#25262b',
      border: '1px solid #373a40',
      borderRadius: '8px',
      padding: '10px 18px',
      font: '13px -apple-system,BlinkMacSystemFont,\'PingFang SC\',sans-serif',
      color: '#c1c2c5',
      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      animation: 'lhFadeIn 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      maxWidth: '400px',
    });
    toast.innerHTML = `<span>${_t('dataSavedToast')}</span><button id="__lh_toast_close" style="background:#373a40;color:#909296;border:none;border-radius:4px;padding:3px 10px;font-size:11px;cursor:pointer;">${_t('gotItBtn')}</button>`;
    document.body.appendChild(toast);
    let closed = false;
    const close = () => { if (!closed) { closed = true; toast.remove(); } };
    document.getElementById('__lh_toast_close')?.addEventListener('click', close);
    setTimeout(close, 3000);
  }

  /** 全屏遮罩对话框，含倒计时 + 不再提示选项 */
  function showPageSwitchDialog() {
    const tip = document.createElement('div');
    tip.id = '__lh_tip';
    Object.assign(tip.style, {
      position: 'fixed', zIndex: '2147483647', inset: '0',
      background: 'rgba(26,27,30,0.65)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      font: '14px -apple-system,BlinkMacSystemFont,\'PingFang SC\',sans-serif', color: '#c1c2c5',
      animation: 'lhFadeIn 0.2s ease',
    });
    let countdown = 3;
    let timer = null;
    const closed = { v: false };
    const close = () => { if (!closed.v) { closed.v = true; if (timer) clearTimeout(timer); tip.remove(); } };
    const tick = () => {
      countdown--;
      const btn = document.getElementById('__lh_tip_ok');
      if (btn) btn.textContent = `${_t('gotIt')} (${countdown}s)`;
      if (countdown <= 0) close();
    };
    tip.innerHTML = `<div style="background:#25262b;border:1px solid #373a40;border-radius:12px;padding:32px 40px;text-align:center;max-width:400px;">
      <div style="display:flex;justify-content:flex-end;margin-bottom:4px;">
        <button id="__lh_tip_x" style="background:transparent;color:#5c5f66;border:none;font-size:16px;cursor:pointer;padding:0 4px;">✕</button>
      </div>
      <div style="font-size:36px;margin-bottom:12px;">📄</div>
      <div style="font-size:16px;font-weight:600;color:#fff;margin-bottom:8px;">${_t('pageSwitched')}</div>
      <div style="font-size:13px;color:#909296;line-height:1.6;margin-bottom:20px;">
        ${_t('pageSwitchDesc').replace('「打开文档构建器」', `「<span style="color:#f08c00;font-weight:600;">${_t('openBuilderLabel')}</span>」`)}
      </div>
      <label style="display:flex;align-items:center;justify-content:center;gap:6px;font-size:12px;color:#5c5f66;cursor:pointer;margin-bottom:16px;">
        <input type="checkbox" id="__lh_tip_nomore" style="accent-color:#f08c00;width:14px;height:14px;cursor:pointer;"> ${_t('noMoreTip')}
      </label>
      <button id="__lh_tip_ok" style="background:#373a40;color:#c1c2c5;border:none;border-radius:6px;padding:8px 24px;font-size:13px;cursor:pointer;">${_t('gotIt')} (3s)</button>
    </div>`;
    document.body.appendChild(tip);
    document.getElementById('__lh_tip_x')?.addEventListener('click', close);
    document.getElementById('__lh_tip_ok')?.addEventListener('click', () => {
      const noMore = document.getElementById('__lh_tip_nomore')?.checked;
      if (noMore) {
        chrome.storage.local.set({ __lh_no_page_tip: true }).catch(() => {});
      }
      close();
    });
    timer = setInterval(tick, 1000);
  }

  function showFloater() { if (floater) floater.style.display = 'flex'; }
  function hideFloater() { if (floater) floater.style.display = 'none'; }
  function removeFloater() { if (floater) { floater.remove(); floater = null; } }

  /** 将浮窗位置钳制在可视边界内 */
  function clampFloaterPosition() {
    if (!floater || floater.style.display === 'none') return;
    const r = floater.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    let x = parseFloat(floater.style.left) || r.left;
    let y = parseFloat(floater.style.top) || r.top;
    const fw = r.width, fh = r.height;
    let changed = false;
    if (x + fw > vw) { x = vw - fw; changed = true; }
    if (x < 0) { x = 0; changed = true; }
    if (y + fh > vh) { y = vh - fh; changed = true; }
    if (y < 0) { y = 0; changed = true; }
    if (changed) { floater.style.left = x + 'px'; floater.style.top = y + 'px'; }
  }

  function setStatus(msg) {
    const s = document.getElementById('__lh_f_status');
    if (s) s.textContent = msg || '';
  }

  // ---- 橡皮筋选框 ----

  function createRubber() {
    if (document.getElementById('__lh_r')) return;
    rubber = document.createElement('div');
    rubber.id = '__lh_r';
    Object.assign(rubber.style, {
      position: 'fixed', zIndex: '2147483645', pointerEvents: 'none',
      border: '2px dashed #f08c00', background: 'rgba(240,140,0,0.06)',
      borderRadius: '4px', display: 'none',
    });
    document.body.appendChild(rubber);
  }

  function removeRubber() { if (rubber) { rubber.remove(); rubber = null; } }

  function updateRubber(x1, y1, x2, y2) {
    if (!rubber) return;
    const l = Math.min(x1, x2), t = Math.min(y1, y2);
    rubber.style.display = 'block';
    rubber.style.left = l + 'px';
    rubber.style.top = t + 'px';
    rubber.style.width = Math.abs(x2 - x1) + 'px';
    rubber.style.height = Math.abs(y2 - y1) + 'px';
  }

  // ==================== 智能容器定位 ====================

  function findContainer(el) {
    let current = el;
    for (let i = 0; i < 4 && current; i++) {
      if (current === document.body || current === document.documentElement) break;
      const children = Array.from(current.children || []).filter(c => c.tagName !== 'BR');
      if (children.length >= 2) return { el: current, depth: i };
      current = current.parentElement;
    }
    const fallback = el?.parentElement?.parentElement || el?.parentElement || el;
    return { el: fallback, depth: -1 };
  }

  function getBreadcrumb(el) {
    const parts = [];
    let current = el;
    for (let i = 0; current && i < 5; i++) {
      const tag = (current.tagName || '').toLowerCase();
      parts.unshift(tag);
      if (current === document.body || current === document.documentElement) break;
      current = current.parentElement;
    }
    return parts.join(' › ');
  }

  function extractFromEl(el) {
    for (const sel of ['.ax_default.table_cell', '.ax_default._形状1']) {
      const cells = el.querySelectorAll(sel);
      if (cells.length >= 4) {
        const table = buildTable(cells);
        if (table) return { type: 'table', markdown: mdTable(table) };
      }
    }
    const text = el.innerText ? sanitizeMd(el.innerText) : '';
    if (text) return { type: 'text', markdown: text };
    return { type: 'empty', markdown: '' };
  }

  // ---- 悬停预览 ----
  let hoverHighlight = null;

  function createHoverHighlight() {
    if (document.getElementById('__lh_hh')) return;
    const h = document.createElement('div');
    h.id = '__lh_hh';
    Object.assign(h.style, {
      position: 'fixed', zIndex: '2147483646', pointerEvents: 'none',
      border: '1.5px solid #f08c00', background: 'rgba(240,140,0,0.08)',
      borderRadius: '3px', display: 'none',
    });
    document.body.appendChild(h);
    hoverHighlight = h;
  }

  function removeHoverHighlight() {
    if (hoverHighlight) { hoverHighlight.remove(); hoverHighlight = null; }
  }

  function highlightEl(el) {
    if (!hoverHighlight || !el) return;
    const r = el.getBoundingClientRect();
    hoverHighlight.style.display = 'block';
    hoverHighlight.style.left = r.left + 'px';
    hoverHighlight.style.top = r.top + 'px';
    hoverHighlight.style.width = r.width + 'px';
    hoverHighlight.style.height = r.height + 'px';
  }

  function hideHighlight() {
    if (hoverHighlight) hoverHighlight.style.display = 'none';
  }

  // ==================== Markdown 渲染预览 ====================

  function renderMarkdown(md) {
    if (!md) return '';
    if (typeof marked !== 'undefined' && marked.parse) {
      try {
        return marked.parse(md, { gfm: true, breaks: false });
      } catch (e) {
        console.error('[蓝湖] marked 解析失败:', e);
      }
    }
    // fallback: 纯文本换行
    return escHtml(md).replace(/\n/g, '<br>');
  }

  let showRendered = false;
  let lastRawMd = '';

  // ---- 容器导航路径（替代点击升级） ----
  let navPath = [];       // 从选中元素到 body 的 DOM 路径（根下标 0，最深下标最大）
  let navIndex = -1;      // 当前选中的元素在路径中的下标
  let currentSelectedEl = null; // 当前选中的元素引用（DOM 节点）

  // ---- 追加模式 ----
  let appendMode = false;

  // ---- 截图模式 ----
  let containerRects = []; // 多选容器截图用
  let currentScreenshotMode = null;

  async function captureFullscreen() {
    const vpW = window.innerWidth, vpH = window.innerHeight;
    const response = await chrome.runtime.sendMessage({
      action: 'capture-rect',
      rect: { x: 0, y: 0, w: Math.round(vpW), h: Math.round(vpH) }
    });
    if (response.status !== 'ok') throw new Error(response.error);
    return response.dataUrl;
  }

  async function captureFullpage() {
    const origY = window.scrollY;
    const vpW = window.innerWidth, vpH = window.innerHeight;
    const fullH = Math.max(document.documentElement.scrollHeight, vpH);

    const canvas = document.createElement('canvas');
    canvas.width = vpW;
    canvas.height = fullH;
    const ctx = canvas.getContext('2d');

    for (let y = 0; y < fullH; y += vpH) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 250));
      const resp = await chrome.runtime.sendMessage({
        action: 'capture-rect',
        rect: { x: 0, y: 0, w: Math.round(vpW), h: Math.round(vpH) }
      });
      if (resp.status !== 'ok') { window.scrollTo(0, origY); throw new Error(resp.error); }
      const img = new Image();
      img.src = resp.dataUrl;
      await new Promise((ok, bad) => { img.onload = ok; img.onerror = bad; });
      const dh = Math.min(vpH, fullH - y);
      ctx.drawImage(img, 0, 0, vpW, dh, 0, y, vpW, dh);
    }
    window.scrollTo(0, origY);
    return canvas.toDataURL('image/png');
  }

  async function captureContainer() {
    const target = escalation.current;
    if (!target) throw new Error('请先点击选择要截图的内容');
    const r = target.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) throw new Error('选中区域太小');
    const resp = await chrome.runtime.sendMessage({
      action: 'capture-rect',
      rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }
    });
    if (resp.status !== 'ok') throw new Error(resp.error);
    return resp.dataUrl;
  }

  async function captureMultiContainer() {
    if (containerRects.length < 2) throw new Error('请先用追加模式选择至少 2 个容器');
    const left = Math.min(...containerRects.map(r => r.x));
    const top = Math.min(...containerRects.map(r => r.y));
    const right = Math.max(...containerRects.map(r => r.x + r.w));
    const bottom = Math.max(...containerRects.map(r => r.y + r.h));
    const w = right - left, h = bottom - top;
    if (w < 2 || h < 2) throw new Error('合并区域太小');
    const resp = await chrome.runtime.sendMessage({
      action: 'capture-rect',
      rect: { x: Math.round(left), y: Math.round(top), w: Math.round(w), h: Math.round(h) }
    });
    if (resp.status !== 'ok') throw new Error(resp.error);
    return resp.dataUrl;
  }

  const SC_MODES = {
    fullscreen: { name: _t('screenshotFull'), fn: captureFullscreen },
    fullpage:   { name: _t('screenshotPage'), fn: captureFullpage },
    container:  { name: _t('screenshotContainer'), fn: captureContainer },
    multi:      { name: _t('screenshotMulti'), fn: captureMultiContainer },
  };

  async function takeScreenshot(mode) {
    const action = SC_MODES[mode];
    if (!action) { setStatus(_t('statusPickFail')); return; }
    try {
      setStatus(_t('statusCapturing', action.name));
      const dataUrl = await action.fn();
      const imgDiv = document.getElementById('__lh_f_img');
      const imgEl = document.getElementById('__lh_f_img_src');
      if (imgDiv && imgEl) {
        imgEl.src = dataUrl;
        imgDiv.style.display = 'block';
        imgEl.onclick = () => window.open(dataUrl, '_blank');
      }
      setStatus(_t('statusCaptureDone', action.name));
    } catch (e) {
      setStatus(_t('statusCaptureFail', action.name, e.message));
    }
  }

  function trackContainerRect(el) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    const rect = { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
    if (appendMode) { containerRects.push(rect); }
    else { containerRects = [rect]; }
  }

  // ---- 容器导航路径构建 ----

  /** 从点击的元素向上构建 DOM 路径（至 body），排除 __lh_ 元素 */
  function buildPath(el) {
    const path = [];
    let cur = el;
    for (let i = 0; cur && i < 15; i++) {
      if (cur.id?.startsWith?.('__lh_')) { cur = cur.parentElement; continue; }
      path.unshift(cur);
      if (cur === document.body || cur === document.documentElement) break;
      cur = cur.parentElement;
    }
    return path;
  }

  /** 根据当前 navIndex 应用选择：高亮 + 提取 + 更新按钮状态 */
  function applyNavSelection() {
    const upBtn = document.getElementById('__lh_f_up');
    const dnBtn = document.getElementById('__lh_f_dn');
    const info = document.getElementById('__lh_f_nav_info');

    // 先更新按钮状态（无论 el 是否有效，按钮必须反应当前 navIndex 位置）
    const canUp = navIndex > 0;
    const canDn = navIndex < navPath.length - 1;
    if (upBtn) {
      upBtn.setAttribute('aria-disabled', !canUp);
      upBtn.style.opacity = canUp ? '1' : '0.4';
      upBtn.style.color = canUp ? '#c1c2c5' : '#5c5f66';
      upBtn.style.cursor = canUp ? 'pointer' : 'default';
    }
    if (dnBtn) {
      dnBtn.setAttribute('aria-disabled', !canDn);
      dnBtn.style.opacity = canDn ? '1' : '0.4';
      dnBtn.style.color = canDn ? '#c1c2c5' : '#5c5f66';
      dnBtn.style.cursor = canDn ? 'pointer' : 'default';
    }

    const el = navPath[navIndex];
    if (!el) {
      if (info) info.textContent = navPath.length > 1 ? `⊞ (${navIndex + 1}/${navPath.length})` : '';
      return;
    }
    currentSelectedEl = el;
    console.log('[蓝湖]', frameTag, 'currentSelectedEl 已设置:', el.tagName, 'id:', el.id || '-', 'classes:', (el.className || '').slice(0,40));

    highlightEl(el);
    trackContainerRect(el);

    const bc = getBreadcrumb(el);
    if (info) {
      info.textContent = `⊞ ${bc}  (${navIndex + 1}/${navPath.length})`;
    }

    const result = extractFromEl(el);
    setStatus(`${_t('pick')} ${bc} (${navIndex + 1}/${navPath.length})`);

    if (result.markdown) {
      if (FRAME_CTX !== 'top') {
        const fr = el.getBoundingClientRect();
        try {
          window.top.postMessage({
            type: '__lh_picker_result',
            markdown: result.markdown,
            sourceType: result.type,
            navIndex: navIndex,
            navPathLength: navPath.length,
            breadcrumb: bc,
            selLeft: fr.left,
            selTop: fr.top,
            selW: fr.width,
            selH: fr.height
          }, '*');
        } catch {}
      } else { setContent(result.markdown, result.type); }
    } else {
      setStatus(_t('statusEmpty'));
    }
  }

  /** 更新顶层浮动面板状态（iframe 结果到达时调用） */
  function updateNavButtonsFromData(data) {
    // 导航功能已移除，仅记录来源
    console.log('[蓝湖] 收到 iframe 结果:', data?.breadcrumb || '');
  }

  // ---- 事件 ----
  function onMouseDown(e) {
    console.log('[蓝湖] mousedown target:', e.target.tagName, 'id:', e.target.id, 'closestFltr:', !!e.target?.closest?.('#__lh_f'));
    if (e.button !== 0) return;
    if (e.target.closest && e.target.closest('#__lh_f')) {
      console.log('[蓝湖] mousedown → 浮动面板点击，跳过');
      return;
    }
    if (!pickMode) {
      if (selectionLocked) { hideHighlight(); selectionLocked = false; }
      console.log('[蓝湖] mousedown → pickMode=false, 放行');
      return;
    }
    // 导航/链接元素 → 放弃拾取，让页面正常导航
    if (e.target.closest('a') || e.target.closest('[href]') ||
        e.target.closest('[class*="nav"]') || e.target.closest('[class*="menu"]') ||
        e.target.closest('[class*="sidebar"]') || e.target.closest('[class*="header"]')) {
      console.log('[蓝湖] mousedown → 导航点击，放行');
      if (pickMode) cancelPick();
      return;
    }
    console.log('[蓝湖] mousedown → 拾取模式拦截点击');
    hideHighlight();
    selectionLocked = false;
    e.preventDefault();
    isDragging = true;
    selStartX = selEndX = e.clientX;
    selStartY = selEndY = e.clientY;
    createRubber();
    updateRubber(selStartX, selStartY, selEndX, selEndY);
    setStatus(_t('statusDragSelect'));
  }

  function onMouseMove(e) {
    if (isFloaterDrag) return; // 浮框拖拽中，跳过昂贵的拾取逻辑
    if (isDragging) {
      selEndX = e.clientX;
      selEndY = e.clientY;
      updateRubber(selStartX, selStartY, selEndX, selEndY);
      return;
    }
    if (!active) return;
    // 点击选择后锁定高亮，hover 不覆盖定位框
    if (selectionLocked) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el.id?.startsWith('__lh_')) { hideHighlight(); return; }
    const container = findContainer(el);
    if (container.el && container.el !== document.body) {
      highlightEl(container.el);
    } else {
      hideHighlight();
    }
  }

  function onMouseUp(e) {
    if (!isDragging) return;
    isDragging = false;
    selEndX = e.clientX;
    selEndY = e.clientY;

    const dragDist = Math.abs(selEndX - selStartX) + Math.abs(selEndY - selStartY);
    const area = Math.abs((selEndX - selStartX) * (selEndY - selStartY));
    removeRubber();

    // ---- 点击元素 ----
    if (dragDist < 15) {
      const el = document.elementFromPoint(selEndX, selEndY);
      if (!el || el.id?.startsWith('__lh_')) {
        hideHighlight();
        setStatus(_t('statusNoElement'));
        return;
      }

      // 拾取模式：提取元素填入当前字段
      if (pickMode && activePickField) {
        console.log(frameTag, '[蓝湖] pickMode click, activePickField:', JSON.stringify(activePickField), 'el:', el.tagName, el.id || '-');
        if (pickDebounceTimer) clearTimeout(pickDebounceTimer);
        if (e.detail >= 2) {
          pickDebounceTimer = null;
          doPickPick(el, true);
        } else {
          const capturedEl = el;
          pickDebounceTimer = setTimeout(() => {
            pickDebounceTimer = null;
            doPickPick(capturedEl, false);
          }, 300);
        }
        return;
      }

      // 构建完整 DOM 路径（用于高亮定位）
      navPath = buildPath(el);
      console.log('[蓝湖提取器] navPath:', navPath.map(e => e.tagName+'.'+(e.className||'')).join(' > '), 'length:', navPath.length);
      if (navPath.length < 2) {
        setStatus(_t('statusNoPath'));
        return;
      }

      // 智能定位起始容器：优先从 findContainer 的返回在路径中找到位置
      const { el: container } = findContainer(el);
      let startIdx = navPath.indexOf(container);
      console.log('[蓝湖提取器] container:', container?.tagName, 'startIdx:', startIdx, 'pathLen:', navPath.length);
      if (startIdx < 1) {
        // 如果 container 不在路径中（太靠上），从路径中间偏深处开始
        startIdx = Math.max(1, navPath.length - 3);
      }
      // 从中间位置开始，确保 ↑ 和 ↓ 都有空间
      const midIdx = Math.floor(navPath.length / 2);
      navIndex = Math.max(1, Math.min(startIdx, midIdx, navPath.length - 2));
      console.log('[蓝湖提取器] navIndex:', navIndex, 'up:', navIndex > 0, 'down:', navIndex < navPath.length - 1);

      selectionLocked = true;
      applyNavSelection();
      return;
    }

    // ---- 框选区域（拖动距离 >= 15px） ----
    if (area < 100) {
      setStatus(_t('statusAreaTooSmall'));
      return;
    }

    const result = extractFromRect(selStartX, selStartY, selEndX, selEndY);
    if (!result.markdown) {
      setStatus(_t('statusEmpty'));
      return;
    }

    if (FRAME_CTX !== 'top') {
      try {
        window.top.postMessage({ type: '__lh_picker_result', markdown: result.markdown, sourceType: result.type }, '*');
        setStatus(_t('statusResultSent'));
      } catch { setStatus(_t('statusSendFail')); }
      return;
    }

    // 旧版结果展示已移除，使用文档构建器的 🎯 按钮拾取
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      if (pickMode) {
        cancelPick();
      } else {
        deactivate();
      }
    }
  }

  // ---- 跨 frame 消息中转 ----
  function setupMessageListener() {
    window.addEventListener('message', (e) => {
      const data = e.data;
      if (!data || !data.type) return;

      switch (data.type) {

        // iframe → 顶层：拾取结果回填
        case '__lh_picker_result':
          if (data.markdown && FRAME_CTX === 'top') {
            console.log('[蓝湖] msg 收到拾取结果, pickMode:', pickMode, 'activePickField:', JSON.stringify(activePickField), 'md:', data.markdown.slice(0, 40));
            if (pickMode && activePickField) {
              finishPick(data.markdown);
            } else {
              console.log('[蓝湖] msg 收到结果但拒绝: pickMode=%s activePickField=%s', pickMode, activePickField ? 'set' : 'null');
            }
            updateNavButtonsFromData(data);
          }
          break;

        // 顶层 → iframe：同步拾取指令（备用，主通道走 background）
        case '__lh_sync_pick':
          if (FRAME_CTX !== 'top') {
            activePickField = { moduleId: data.moduleId, field: data.field, entryIdx: data.entryIdx };
            pickMode = true;
            document.addEventListener('mousedown', onMouseDown, true);
            document.addEventListener('mousemove', onMouseMove, true);
            document.addEventListener('mouseup', onMouseUp, true);
            document.body.style.cursor = 'crosshair';
            document.body.style.userSelect = 'none';
            console.log('[蓝湖] iframe 收到拾取指令:', activePickField);
          }
          break;

        // 顶层 → iframe：取消拾取
        case '__lh_cancel_pick':
          if (FRAME_CTX !== 'top') {
            pickMode = false;
            activePickField = null;
            document.removeEventListener('mousedown', onMouseDown, true);
            document.removeEventListener('mousemove', onMouseMove, true);
            document.removeEventListener('mouseup', onMouseUp, true);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
          }
          break;

        // 顶层 → iframe：激活（当 iframe 在顶层之后才加载时）
        case '__lh_activate':
          if (FRAME_CTX !== 'top') {
            console.log('[蓝湖] iframe 收到激活指令');
            if (document.getElementById('__lh_iframe_active')) break;
            createRubber();
            createHoverHighlight();
            document.addEventListener('keydown', onKeyDown, true);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            const m = document.createElement('div');
            m.id = '__lh_iframe_active'; m.style.display = 'none';
            document.body.appendChild(m);
            setupMessageListener();
          }
          break;
      }
    });
  }

  // ---- 激活/停用 ----

  function activate() {
    if (active) return;
    active = true;

    if (FRAME_CTX === 'top') {
      createFloater();
      if (!createdByMe) return;
      showFloater();
      setupMessageListener();
      document.addEventListener('keydown', onKeyDown, true);
    } else {
      if (document.getElementById('__lh_iframe_active')) return;
      createRubber();
      createHoverHighlight();
      document.addEventListener('keydown', onKeyDown, true);
      setupMessageListener();
      const m = document.createElement('div');
      m.id = '__lh_iframe_active'; m.style.display = 'none';
      document.body.appendChild(m);
    }

    console.log('[蓝湖提取器] 已激活 —', FRAME_CTX, 'pickMode:', pickMode, 'active:', true);
  }

  function deactivate() {
    if (!active) {
      console.log('[蓝湖] deactivate → 已是非活跃状态');
      return;
    }
    active = false;
    console.log('[蓝湖] deactivate → 停用拾取模式');

    document.removeEventListener('mousedown', onMouseDown, true);
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('mouseup', onMouseUp, true);
    document.removeEventListener('keydown', onKeyDown, true);

    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    removeRubber();
    removeHoverHighlight();

    if (FRAME_CTX === 'top') {
      chrome.runtime.sendMessage({ action: 'cancel-pick-state' }).catch(() => {});
      document.querySelectorAll('iframe').forEach(f => {
        try { f.contentWindow.postMessage({ type: '__lh_cancel_pick' }, '*'); } catch {}
      });
      removeFloater();
    } else {
      const marker = document.getElementById('__lh_iframe_active');
      if (marker) marker.remove();
    }

    if (pickMode) {
      pickMode = false;
      activePickField = null;
    }
    isDragging = false;

    navPath = [];
    navIndex = -1;
    currentSelectedEl = null;
    selectionLocked = false;

    console.log('[蓝湖提取器] 已退出 —', FRAME_CTX);
  }

  // ==================== 页面全量提取（保持原有逻辑） ====================

  function extractTableCells(root) {
    const results = [];
    const allCells = root.querySelectorAll('.ax_default.table_cell');
    if (allCells.length < 4) return results;
    const groups = new Map();
    allCells.forEach(cell => {
      const r = cell.getBoundingClientRect();
      if (r.width < 3 || r.height < 3) return;
      let p = cell.parentElement;
      while (p && p !== root && p !== root.body) {
        if (p.classList.contains('ax_default') || p.id === 'base') break;
        p = p.parentElement;
      }
      if (!p) p = cell.parentElement;
      if (!groups.has(p)) groups.set(p, []);
      groups.get(p).push(cell);
    });
    groups.forEach((cells, container) => {
      if (cells.length < 4) return;
      const table = buildTable(cells);
      if (table) {
        const prev = container.previousElementSibling;
        const h = prev ? axureText(prev) : '';
        results.push({ type:'table', heading: h && h.length<100 ? h : `${_t('dataTable')} ${results.length+1}`,
          markdown: `### ${h && h.length<100 ? h : `${_t('dataTable')} ${results.length+1}`}\n\n${mdTable(table)}` });
      }
    });
    return results;
  }

  function extractShapeGrids(root) {
    const results = [];
    const shapes = root.querySelectorAll('.ax_default._形状1');
    if (shapes.length < 6) return results;
    const groups = new Map();
    shapes.forEach(s => {
      const r = s.getBoundingClientRect();
      if (r.width < 3 || r.height < 3) return;
      const t = axureText(s); if (!t) return;
      let p = s.parentElement;
      while (p && p !== root && p !== root.body) {
        if (['ax_default','panel_state_content','panel_state'].some(c => p.classList.contains(c)) || p.id === 'base') break;
        p = p.parentElement;
      }
      if (!p) p = s.parentElement;
      if (!groups.has(p)) groups.set(p, []);
      groups.get(p).push(s);
    });
    groups.forEach((shapes, container) => {
      if (shapes.length < 6) return;
      const table = buildTable(shapes);
      if (table && table.rows >= 2 && table.cols >= 2) {
        const prev = container.previousElementSibling;
        const h = prev ? axureText(prev) : '';
        results.push({ type:'shape-grid', heading: h||_t('dataArea'), markdown: `### ${h||_t('dataArea')}\n\n${mdTable(table)}` });
      }
    });
    return results;
  }

  function extractFromDocument(doc) {
    const root = doc.body || doc; if (!root) return { sections: [], markdown: '' };
    const sections = [...extractTableCells(root), ...extractShapeGrids(root)];
    const seen = new Set();
    const sel = '.ax_default.heading_11,.ax_default.heading_21,.ax_default._二级标题1,' +
      '.ax_default._三级标题,.ax_default.label,.ax_default.label1,h1,h2,h3,h4,h5,h6';
    root.querySelectorAll(sel).forEach(el => {
      const t = axureText(el); if (!t || seen.has(t) || t.length < 2) return; seen.add(t);
      let lv = '##';
      if (el.classList.contains('_三级标题')) lv = '####';
      else if (el.classList.contains('_二级标题1')||el.classList.contains('heading_21')) lv = '###';
      sections.push({ type:'heading', markdown: `${lv} ${t}` });
    });
    const cbs = [];
    root.querySelectorAll('.ax_default.checkbox').forEach(cb => {
      const r = cb.getBoundingClientRect();
      if (r.width > 2) { const t = axureText(cb); if (t) cbs.push(t); }
    });
    if (cbs.length > 0) sections.push({ type:'checkbox', markdown: `## ${_t('optionsHeading')}\n\n${cbs.map(t=>`- [ ] ${t}`).join('\n')}` });

    const lines = [`# ${doc.title||_t('unknownPage')}`, '', `**${_t('extractionTime')}**: ${new Date().toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})}`,'','---',''];
    const seenMd = new Set();
    sections.forEach(s => { if (s.markdown && !seenMd.has(s.markdown)) { seenMd.add(s.markdown); lines.push(s.markdown); lines.push(''); } });
    return { sections, markdown: lines.join('\n') };
  }

  // ==================== API ====================

  function fullExtract() {
    const m = extractFromDocument(document);
    return { frame:FRAME_CTX, isAxureContent:!!document.querySelector('.ax_default'),
      pages:[{frame:FRAME_CTX,title:document.title,sections:m.sections,markdown:m.markdown}], combinedMarkdown:m.markdown };
  }
  function simpleExtract() {
    const r = extractFromDocument(document);
    return { frame:FRAME_CTX, isAxureContent:!!document.querySelector('.ax_default'),
      pages:[{frame:FRAME_CTX,title:document.title,sections:r.sections,markdown:r.markdown}], combinedMarkdown:r.markdown };
  }
  function getDiagnostics() {
    return { frame:FRAME_CTX, title:document.title,
      tableCells:document.querySelectorAll('.ax_default.table_cell').length,
      shapes:document.querySelectorAll('.ax_default._形状1').length,
      widgets:document.querySelectorAll('.ax_default').length };
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
      case 'extract-axure': sendResponse({status:'ok', data:FRAME_CTX==='top'?fullExtract():simpleExtract()}); break;
      case 'ping': sendResponse({pong:true, frame:FRAME_CTX}); break;
      case 'diagnose-me': sendResponse({status:'ok', data:getDiagnostics()}); break;
      case 'start-picker': activate(); sendResponse({status:'ok'}); break;
      case 'stop-picker': deactivate(); sendResponse({status:'ok'}); break;
      case 'open-builder': activate(); sendResponse({status:'ok'}); break;
      // 语言切换
      case 'set-language':
        _lang = request.lang || 'zh_CN';
        try { localStorage.setItem('axure_utils_lang', _lang); } catch {}
        console.log('[蓝湖] 语言已切换:', _lang);
        // 刷新浮窗 UI
        applyLanguageToFloater();
        renderModuleList();
        sendResponse({status:'ok'});
        break;
      // 通过 background 广播同步拾取状态（所有 frame 同时收到）
      case 'set-pick-state':
        activePickField = { moduleId: request.moduleId, field: request.field, entryIdx: request.entryIdx };
        pickMode = true;
        // 注册拾取鼠标事件 + 光标（顶层已由 startPick 注册，此处幂等）
        document.addEventListener('mousedown', onMouseDown, true);
        document.addEventListener('mousemove', onMouseMove, true);
        document.addEventListener('mouseup', onMouseUp, true);
        document.body.style.cursor = 'crosshair';
        document.body.style.userSelect = 'none';
        if (FRAME_CTX === 'top') {
          document.querySelectorAll('[id^="__lh_mt_"],[id^="__lh_mc_"]').forEach(el => el.style.borderColor = '#373a40');
          const targetId = request.field === 'title' ? `__lh_mt_${request.moduleId}` : `__lh_mc_${request.moduleId}_${request.entryIdx}`;
          const inp = document.getElementById(targetId);
          if (inp) inp.style.borderColor = '#f08c00';
          hideHighlight();
          selectionLocked = false;
          setStatus(_t('pickActive'));
        }
        console.log(frameTag, '[蓝湖] set-pick-state:', JSON.stringify(activePickField));
        sendResponse({status:'ok'});
        break;
      case 'clear-pick-state':
        activePickField = null;
        pickMode = false;
        document.removeEventListener('mousedown', onMouseDown, true);
        document.removeEventListener('mousemove', onMouseMove, true);
        document.removeEventListener('mouseup', onMouseUp, true);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        if (FRAME_CTX === 'top') {
          setStatus('');
        }
        console.log(frameTag, '[蓝湖] clear-pick-state');
        sendResponse({status:'ok'});
        break;
    }
    return true;
  });

})();
