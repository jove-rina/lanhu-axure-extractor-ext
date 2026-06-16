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
      selectAll: '全选', deselectAll: '取消全选', selectedCount: '已选 $1/$2', deleteSelected: '删除', preview: '预览', copy: '复制', download: '下载',
      close: '关闭', title: '标题', content: '内容', pick: '拾取', addEntry: '新增条目',
      moveUp: '上移', moveDown: '下移', delete: '删除',
      noContent: '暂无内容，点击 🎯 拾取页面元素',
      emptyList: '点击「新增模块」开始构建文档',
      pickTitle: '拾取标题', pickContent: '拾取内容', previewModule: '预览此模块', copyModule: '复制此模块', downloadModule: '下载此模块',
      editModule: '编辑此模块', edit: '编辑', save: '保存', cancel: '取消', entryLabel: '条目 $1', writeMode: '源码', previewMode: '预览', splitMode: '分栏',
      editMinimized: '拾取中…', restoreEdit: '恢复编辑', minimizeEdit: '缩小', fullscreenEdit: '全屏', exitFullscreen: '退出全屏',
      pickFilledTitle: '✅ 已填充标题', pickFilledContent: '✅ 已填充内容',
      undo: '撤销', redo: '重做',
      mdBold: '加粗', mdItalic: '斜体', mdLink: '链接', mdHeading: '标题', mdList: '列表', mdCode: '代码',
      deleteModule: '删除此模块', statusSaved: '✅ 已保存',
      pickActive: '🎯 拾取已激活 — 在页面内容上点击提取',
      pickDoneTitle: '✅ 已拾取 — 继续拾取将覆盖当前标题',
      pickDoneContent: '✅ 已拾取 — 继续拾取将覆盖当前条目',
      pageSwitched: '页面已切换', pageSaved: '📄 数据已保存', dismiss: '知道了',
      noMoreTip: '不再提示', gotIt: '我知道了 ($1s)',
      statusLoaded: '已加载 $1 个模块', statusModules: '模块 $1 个',
      statusNoContent: '⚠️ 暂无内容', statusEmpty: '⚠️ 所选区域无内容',
      statusDownloaded: '✅ 已下载', statusCopied: '✅ 已复制到剪贴板', statusCopyFail: '⚠️ 复制失败', statusPreviewOpen: '✅ 预览已打开',
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
      pageSwitchDesc: '当前页面的模块数据已自动保存。如需继续编辑，请点击浏览器右上角扩展图标选择「$1」',
      openBuilderLabel: '打开文档构建器',
      dataSavedToast: '📄 数据已保存',
      gotItBtn: '知道了',
    },
    en: {
      floaterTitle: 'Doc Builder', addModule: 'Add Module', expandCollapse: 'Expand / Collapse',
      selectAll: 'Select All', deselectAll: 'Deselect All', selectedCount: 'Selected $1/$2', deleteSelected: 'Delete', preview: 'Preview', copy: 'Copy', download: 'Download',
      close: 'Close', title: 'Title', content: 'Content', pick: 'Pick', addEntry: 'Add Entry',
      moveUp: 'Up', moveDown: 'Down', delete: 'Delete',
      noContent: 'No content yet, click 🎯 to pick page elements',
      emptyList: 'Click Add Module to start building',
      pickTitle: 'Pick Title', pickContent: 'Pick Content', previewModule: 'Preview this module', copyModule: 'Copy this module', downloadModule: 'Download this module',
      editModule: 'Edit this module', edit: 'Edit', save: 'Save', cancel: 'Cancel', entryLabel: 'Entry $1', writeMode: 'Source', previewMode: 'Preview', splitMode: 'Split',
      editMinimized: 'Picking…', restoreEdit: 'Restore', minimizeEdit: 'Minimize', fullscreenEdit: 'Fullscreen', exitFullscreen: 'Exit fullscreen',
      pickFilledTitle: '✅ Title filled', pickFilledContent: '✅ Content filled',
      undo: 'Undo', redo: 'Redo',
      mdBold: 'Bold', mdItalic: 'Italic', mdLink: 'Link', mdHeading: 'Heading', mdList: 'List', mdCode: 'Code',
      deleteModule: 'Delete this module', statusSaved: '✅ Saved',
      pickActive: '🎯 Pick active — click on page content to extract',
      pickDoneTitle: '✅ Picked — keeps picking will overwrite title',
      pickDoneContent: '✅ Picked — keeps picking will overwrite entry',
      pageSwitched: 'Page Switched', pageSaved: '📄 Data saved', dismiss: 'Dismiss',
      noMoreTip: "Don't show again", gotIt: 'Got it ($1s)',
      statusLoaded: 'Loaded $1 modules', statusModules: '$1 modules',
      statusNoContent: '⚠ No content', statusEmpty: '⚠ No content yet',
      statusDownloaded: '✅ Downloaded', statusCopied: '✅ Copied to clipboard', statusCopyFail: '⚠ Copy failed', statusPreviewOpen: '✅ Preview opened',
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
      pageSwitchDesc: 'Module data auto-saved. Reopen from the extension icon and select "$1".',
      openBuilderLabel: 'Open Doc Builder',
      dataSavedToast: '📄 Data saved',
      gotItBtn: 'Got it',
    },
  };
  let _lang = null; // 'zh_CN' or 'en' or null (browser default)
  chrome.storage.local.get('axure_utils_lang', (d) => {
    if (d?.axure_utils_lang) applyLang(d.axure_utils_lang);
  });
  try {
    const stored = localStorage.getItem('axure_utils_lang');
    if (stored) applyLang(stored);
  } catch {}

  function normalizeLang(lang) {
    if (!lang || lang === 'auto') return null;
    if (lang === 'en') return 'en';
    if (lang === 'zh_CN' || lang.startsWith('zh')) return 'zh_CN';
    return LANG[lang] ? lang : null;
  }

  function applyLang(lang) {
    const normalized = normalizeLang(lang);
    if (normalized) _lang = normalized;
  }

  function getEffectiveLang() {
    if (_lang && LANG[_lang]) return _lang;
    const browserLang = navigator.language || '';
    return browserLang.startsWith('zh') ? 'zh_CN' : 'en';
  }

  const _t = (key, ...subs) => {
    const lang = getEffectiveLang();
    let msg = LANG[lang]?.[key] ?? LANG.zh_CN?.[key] ?? LANG.en?.[key];
    if (!msg) {
      const chromeMsg = chrome.i18n.getMessage(key, subs.length ? subs.map(String) : undefined);
      return chromeMsg || key;
    }
    subs.forEach((s, i) => { msg = msg.replace(new RegExp(`\\$${i + 1}`, 'g'), s); });
    return msg;
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
  let floaterAnchorX = null;
  let clampRafId = 0;
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
  let _cachedAxurePageTitle = '';
  let messageListenerReady = false;
  let editDialogState = null; // { moduleId, draft, shell, expandedStyle, minimized, pickMinimized, fullscreen, entryHeights, collapsedEditEntries, scrollToEntryIdx }
  let focusedModuleId = null;
  let scrollToFloaterEntry = null;
  let scrollToFloaterModule = null;
  let moduleFocusBound = false;

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
    copy: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="5" width="8" height="8" rx="1"/><path d="M3 11V3a1 1 0 011-1h8"/></svg>',
    edit: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z"/></svg>',
    winMin: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 12h10"/></svg>',
    winRestore: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4.5" y="6.5" width="7" height="7" rx="1"/><path d="M6 6.5V5a1 1 0 011-1h3.5a1 1 0 011 1v1.5"/></svg>',
    winMax: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="10" height="10" rx="1"/></svg>',
    winExitMax: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5.5 3.5h7v7M3.5 5.5v7h7"/></svg>',
    undo: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 7.5H10a3.5 3.5 0 110 7H8"/><path d="M5.5 4.5L3 7.5l2.5 3"/></svg>',
    redo: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12.5 7.5H6a3.5 3.5 0 100 7h2"/><path d="M10.5 4.5L13 7.5l-2.5 3"/></svg>',
  };

  const Z_FLOATER = 2147483647;
  const Z_EDIT = 2147483648;
  const Z_EDIT_TOAST = 2147483649;

  const LH_UI_CSS = `
@keyframes lhFadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
.lh-scrollbar::-webkit-scrollbar{width:6px;height:6px}
.lh-scrollbar::-webkit-scrollbar-track{background:transparent}
.lh-scrollbar::-webkit-scrollbar-thumb{background:#373a40;border-radius:3px}
.lh-scrollbar::-webkit-scrollbar-thumb:hover{background:#5c5f66}
.lh-scrollbar{scrollbar-width:thin;scrollbar-color:#373a40 transparent}
#__lh_f .lh-scrollbar::-webkit-scrollbar,#__lh_edit .lh-scrollbar::-webkit-scrollbar,#__lh_f textarea.lh-scrollbar::-webkit-scrollbar,#__lh_edit textarea.lh-scrollbar::-webkit-scrollbar{width:6px;height:6px}
#__lh_f .lh-scrollbar::-webkit-scrollbar-track,#__lh_edit .lh-scrollbar::-webkit-scrollbar-track,#__lh_f textarea.lh-scrollbar::-webkit-scrollbar-track,#__lh_edit textarea.lh-scrollbar::-webkit-scrollbar-track{background:transparent}
#__lh_f .lh-scrollbar::-webkit-scrollbar-thumb,#__lh_edit .lh-scrollbar::-webkit-scrollbar-thumb,#__lh_f textarea.lh-scrollbar::-webkit-scrollbar-thumb,#__lh_edit textarea.lh-scrollbar::-webkit-scrollbar-thumb{background:#373a40;border-radius:3px}
#__lh_f .lh-scrollbar::-webkit-scrollbar-thumb:hover,#__lh_edit .lh-scrollbar::-webkit-scrollbar-thumb:hover,#__lh_f textarea.lh-scrollbar::-webkit-scrollbar-thumb:hover,#__lh_edit textarea.lh-scrollbar::-webkit-scrollbar-thumb:hover{background:#5c5f66}
#__lh_f .lh-scrollbar,#__lh_edit .lh-scrollbar,#__lh_f textarea.lh-scrollbar,#__lh_edit textarea.lh-scrollbar{scrollbar-width:thin;scrollbar-color:#373a40 transparent}
#__lh_f button,#__lh_edit button{transition:filter .15s ease,transform .15s ease,box-shadow .15s ease,background .15s ease,border-color .15s ease}
#__lh_f button:not(:disabled):hover,#__lh_edit button:not(:disabled):hover{filter:brightness(1.12);box-shadow:0 2px 8px rgba(0,0,0,.22)}
#__lh_f button:not(:disabled):active,#__lh_edit button:not(:disabled):active{filter:brightness(.94);transform:scale(.98);box-shadow:none}
#__lh_f button[style*="transparent"]:not(:disabled):hover,#__lh_edit button[style*="transparent"]:not(:disabled):hover{filter:none;background:rgba(255,255,255,.1)!important}
#__lh_f button[style*="rgba(255,255,255,0.06)"]:not(:disabled):hover,#__lh_edit button[style*="rgba(255,255,255,0.06)"]:not(:disabled):hover{filter:none;background:rgba(255,255,255,.12)!important}
#__lh_f button[style*="#e03131"][style*="transparent"]:not(:disabled):hover,#__lh_edit button[style*="#e03131"][style*="transparent"]:not(:disabled):hover{filter:none;background:rgba(224,49,49,.18)!important}
.lh-btn-group{display:inline-flex;align-items:center;gap:4px;flex-shrink:0}
.lh-btn-fuse{display:inline-flex;align-items:stretch;flex-shrink:0;border-radius:6px;overflow:hidden}
.lh-btn-fuse>button{border-radius:0!important;margin:0!important}
.lh-vsep{width:1px;height:16px;background:#373a40;flex-shrink:0;margin:0 4px;align-self:center}
.lh-label,.lh-field-label{font-size:13px;color:#909296;font-weight:500;white-space:nowrap;text-align:left}
.lh-field-block{display:flex;flex-direction:column;align-items:stretch;text-align:left;margin-bottom:12px;flex-shrink:0}
.lh-field-label{margin-bottom:6px}
.lh-section-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-shrink:0}
.lh-plain-row{display:flex;align-items:center;gap:8px;margin-bottom:0;flex-shrink:0;min-width:0;justify-content:flex-start}
.lh-plain-input,.lh-plain-textarea,.lh-edit-ta{background:#141517;border:1px solid #373a40;border-radius:6px;padding:8px 10px;font-size:13px;color:#e0e0e0;outline:none;transition:border-color .15s ease,box-shadow .15s ease;box-sizing:border-box;text-align:left}
.lh-plain-textarea,.lh-edit-ta{color:#c1c2c5}
.lh-plain-input::placeholder,.lh-plain-textarea::placeholder,.lh-edit-ta::placeholder{color:rgba(255,255,255,.88);opacity:1}
.lh-plain-input:focus,.lh-plain-textarea:focus,.lh-edit-ta:focus{border-color:#f08c00;box-shadow:0 0 0 1px rgba(240,140,0,.28);color:#fff}
.lh-hint-text{color:rgba(255,255,255,.88)}
.lh-plain-input{flex:1;min-width:0}
.lh-plain-textarea{width:100%;resize:vertical;font-family:inherit;line-height:1.5;min-height:48px}
.lh-edit-ta{border-radius:0;border-right:1px solid #373a40;resize:none;font-family:Consolas,Monaco,'Courier New',monospace;line-height:1.6}
.lh-edit-split .lh-edit-ta{border:none;border-right:1px solid #373a40;box-shadow:none!important}
.lh-edit-split .lh-edit-ta:focus{border:none;border-right:1px solid #373a40;box-shadow:none!important;color:#fff}
.lh-content-entry{margin-bottom:12px;text-align:left}
.lh-entry-hdr{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px}
.lh-entries-list{display:flex;flex-direction:column;align-items:stretch;text-align:left}
.lh-module-scroll{flex:1;min-height:0;overflow-y:auto}
.lh-add-entry-bar{padding:8px 0 0;flex-shrink:0;border-top:1px solid rgba(255,255,255,.06);margin-top:8px}
.lh-add-entry-btn{width:100%;justify-content:center;border-radius:6px;flex-shrink:0;box-sizing:border-box;margin-top:0}
.lh-add-entry-btn:hover{filter:none!important;background:rgba(43,138,62,.28)!important;border-color:rgba(43,138,62,.55)!important}
.lh-module-card{background:#25262b;border:1px solid #373a40;border-radius:8px;margin-bottom:8px;overflow:hidden;transition:opacity .25s ease,filter .25s ease,border-color .2s ease,box-shadow .2s ease,transform .2s ease}
.lh-module-card.lh-module-focused{border-color:#f08c00;box-shadow:0 0 0 1px rgba(240,140,0,.2);opacity:1;filter:none}
.lh-module-card.lh-module-dimmed{opacity:.38;filter:saturate(.6)}
.lh-module-card.lh-dragging{opacity:.45;transform:scale(.97);filter:none}
.lh-module-card.drag-over{border-color:#f08c00!important;box-shadow:0 0 0 1px rgba(240,140,0,.3)!important;opacity:1;filter:none}
.lh-edit-title-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px}
.lh-edit-entry{margin-bottom:12px;display:flex;flex-direction:column}
.lh-edit-entry-hdr{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 0 6px;flex-shrink:0;cursor:pointer;user-select:none}
.lh-edit-entry-chevron{font-size:10px;color:#909296;flex-shrink:0;transition:transform .2s;width:12px}
.lh-edit-entry-hdr.is-open .lh-edit-entry-chevron{transform:rotate(90deg)}
.lh-edit-md-toolbar{display:flex;flex-wrap:wrap;align-items:center;padding:4px 0 6px;flex-shrink:0;gap:0}
.lh-edit-entry-body{display:flex;flex-direction:column;flex-shrink:0;overflow:hidden}
.lh-edit-split{flex:1;min-height:0;display:flex;overflow:hidden;border:1px solid #373a40;border-radius:6px;overflow:hidden}
.lh-edit-split:focus-within{border-color:#f08c00;box-shadow:0 0 0 1px rgba(240,140,0,.28)}
.lh-edit-resize{height:6px;cursor:ns-resize;background:transparent;flex-shrink:0;position:relative;margin-top:4px}
.lh-edit-resize::after{content:'';position:absolute;left:20%;right:20%;top:2px;height:2px;background:#373a40;border-radius:1px;transition:background .15s}
.lh-edit-resize:hover::after{background:#5c5f66}
#__lh_f .lh-module-body button:not(:disabled):hover,#__lh_edit .lh-edit-entry-hdr button:not(:disabled):hover,#__lh_edit .lh-edit-md-toolbar button:not(:disabled):hover{box-shadow:none!important;transform:none!important}
`.trim();

  let lhFloatTipEl = null;
  let lhFloatTipTarget = null;

  function ensureLhFloatTip() {
    if (lhFloatTipEl) return lhFloatTipEl;
    lhFloatTipEl = document.createElement('div');
    lhFloatTipEl.id = '__lh_tip_float';
    Object.assign(lhFloatTipEl.style, {
      position: 'fixed', zIndex: '2147483647', pointerEvents: 'none', display: 'none',
      padding: '5px 9px', fontSize: '11px', color: '#c1c2c5', background: '#25262b',
      border: '1px solid #373a40', borderRadius: '5px', whiteSpace: 'nowrap',
      boxShadow: '0 2px 8px rgba(0,0,0,.3)', maxWidth: '320px', lineHeight: '1.4',
      fontFamily: '-apple-system,BlinkMacSystemFont,\'PingFang SC\',sans-serif',
    });
    document.body.appendChild(lhFloatTipEl);
    return lhFloatTipEl;
  }

  function positionLhFloatTip(btn) {
    const tip = ensureLhFloatTip();
    tip.style.display = 'block';
    const rect = btn.getBoundingClientRect();
    const tipW = tip.offsetWidth;
    const tipH = tip.offsetHeight;
    let top = rect.top - tipH - 8;
    let left = rect.left + rect.width / 2 - tipW / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tipW - 8));
    if (top < 8) top = rect.bottom + 8;
    tip.style.top = `${top}px`;
    tip.style.left = `${left}px`;
  }

  function showLhFloatTip(btn) {
    if (!btn || btn.disabled) return;
    const text = btn.getAttribute('data-tip');
    if (!text) return;
    lhFloatTipTarget = btn;
    const tip = ensureLhFloatTip();
    tip.textContent = text;
    positionLhFloatTip(btn);
  }

  function hideLhFloatTip() {
    lhFloatTipTarget = null;
    if (lhFloatTipEl) lhFloatTipEl.style.display = 'none';
  }

  let lhTooltipInited = false;

  function initLhTooltipSystem() {
    if (lhTooltipInited || FRAME_CTX !== 'top') return;
    lhTooltipInited = true;
    document.addEventListener('pointerover', (e) => {
      const root = e.target.closest('#__lh_f, #__lh_edit, #__lh_toast, #__lh_tip');
      if (!root) { hideLhFloatTip(); return; }
      const btn = e.target.closest('[data-tip]');
      if (btn && root.contains(btn) && !btn.disabled) showLhFloatTip(btn);
      else hideLhFloatTip();
    }, true);
    document.addEventListener('pointerout', (e) => {
      const btn = e.target.closest('[data-tip]');
      if (!btn) return;
      const rel = e.relatedTarget;
      if (rel && btn.contains(rel)) return;
      if (rel?.closest?.('[data-tip]') === btn) return;
      hideLhFloatTip();
    }, true);
    document.addEventListener('scroll', () => {
      if (lhFloatTipTarget) positionLhFloatTip(lhFloatTipTarget);
    }, true);
  }

  function ensureLhUiStyles() {
    let st = document.getElementById('__lh_ui_styles');
    if (!st) {
      st = document.createElement('style');
      st.id = '__lh_ui_styles';
      document.head.appendChild(st);
    }
    st.textContent = LH_UI_CSS;
  }

  const BTN = 'border:none;border-radius:6px;font-size:12px;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;justify-content:center;gap:4px;font-weight:500;transition:opacity 0.15s ease,background 0.15s ease;line-height:1;box-sizing:border-box;';
  const BTN_ICON = `${BTN}padding:0;width:28px;height:28px;min-width:28px;font-size:11px;`;
  const BTN_ICON_XS = `${BTN}padding:0;width:24px;height:24px;min-width:24px;font-size:10px;`;
  const BTN_SM = `${BTN}padding:0 10px;height:28px;font-size:11px;`;
  const BTN_XS = `${BTN}padding:0 8px;height:24px;font-size:10px;`;
  const BTN_MD = `${BTN}padding:0 16px;height:32px;`;
  const BTN_DISABLED = 'opacity:0.35;cursor:default;pointer-events:none;';
  const BTN_ACCENT = `background:#f08c00;color:#fff;${BTN_SM}`;
  const BTN_ACCENT_XS = `background:#f08c00;color:#fff;${BTN_XS}`;
  const BTN_ACCENT_ICON = `background:#f08c00;color:#fff;${BTN_ICON}`;
  const BTN_ACCENT_ICON_XS = `background:#f08c00;color:#fff;${BTN_ICON_XS}`;
  const BTN_SUCCESS = `background:#2b8a3e;color:#fff;${BTN_SM}`;
  const BTN_ADD_ENTRY = `background:rgba(43,138,62,0.18);color:#8ce99a;border:1px solid rgba(43,138,62,0.35);${BTN_SM}width:100%;justify-content:center;border-radius:6px;box-sizing:border-box;`;
  const BTN_TB = `${BTN}padding:0 12px;height:28px;min-height:28px;font-size:11px;`;
  const BTN_TB_MUTED = `background:rgba(255,255,255,0.06);color:#909296;${BTN_TB}`;
  const BTN_TB_DANGER = `background:#e03131;color:#fff;${BTN_TB}`;
  const BTN_MUTED = `background:rgba(255,255,255,0.06);color:#909296;${BTN_SM}`;
  const BTN_NEUTRAL = `background:#373a40;color:#909296;${BTN_ICON}`;
  const BTN_NEUTRAL_XS = `background:#373a40;color:#909296;${BTN_ICON_XS}`;
  const BTN_GHOST = `background:transparent;color:#909296;border:1px solid rgba(255,255,255,0.1);${BTN_ICON}`;
  const EDIT_WIN_BTN = BTN_GHOST;
  const BTN_DANGER = `background:transparent;color:#e03131;border:1px solid #e03131;${BTN_ICON}`;
  const BTN_DANGER_XS = `background:transparent;color:#e03131;border:1px solid #e03131;${BTN_ICON_XS}`;
  const BTN_DANGER_SM = `background:#e03131;color:#fff;${BTN_SM}`;
  const BTN_MOD_EDIT = `background:#1098ad;color:#fff;${BTN_ICON_XS}`;
  const BTN_MOD_PREVIEW = `background:#228be6;color:#fff;${BTN_ICON_XS}`;
  const BTN_MOD_COPY = `background:#7950f2;color:#fff;${BTN_ICON_XS}`;
  const BTN_MOD_DOWNLOAD = `background:#2b8a3e;color:#fff;${BTN_ICON_XS}`;
  const BTN_PREVIEW = `background:#228be6;color:#fff;${BTN_SM}`;
  const BTN_COPY = `background:#7950f2;color:#fff;${BTN_SM}`;
  const BTN_DOWNLOAD = `background:#2b8a3e;color:#fff;${BTN_SM}`;
  const BTN_EDIT = `background:#1098ad;color:#fff;${BTN_SM}`;
  const BTN_PREVIEW_LG = `background:#228be6;color:#fff;${BTN_MD}`;
  const BTN_COPY_LG = `background:#7950f2;color:#fff;${BTN_MD}`;
  const BTN_DOWNLOAD_LG = `background:#2b8a3e;color:#fff;${BTN_MD}`;
  const BTN_SAVE = `background:#1098ad;color:#fff;${BTN_MD}`;
  const BTN_CANCEL = `background:#373a40;color:#c1c2c5;${BTN_MD}`;
  const BTN_TOOL = `background:#373a40;color:#c1c2c5;${BTN_SM}`;
  const BTN_TOOL_XS = `background:#373a40;color:#c1c2c5;${BTN_XS}`;
  const BTN_TOOL_ICON = `background:#373a40;color:#c1c2c5;${BTN_ICON}`;
  const BTN_TOOL_ICON_XS = `background:#373a40;color:#c1c2c5;${BTN_ICON_XS}`;
  const BTN_TOOL_ACTIVE = `background:#1098ad;color:#fff;${BTN_SM}`;
  const BTN_TOOL_ACTIVE_XS = `background:#1098ad;color:#fff;${BTN_XS}`;

  const EDIT_ENTRY_DEFAULT_H = 400;
  const EDIT_ENTRY_MIN_H = 120;

  const HTML = `
<div id="__lh_f" style="all:initial;position:fixed;z-index:2147483647;bottom:20px;right:20px;
  width:440px;max-height:70vh;background:#1a1b1e;border:1px solid rgba(255,255,255,0.08);border-radius:10px;
  box-shadow:0 12px 40px rgba(0,0,0,0.45);font:13px -apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;
  color:#c1c2c5;display:none;flex-direction:column;">
 <div id="__lh_f_h" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;
    background:#25262b;border-bottom:1px solid rgba(255,255,255,0.06);border-radius:10px 10px 0 0;cursor:move;user-select:none;">
    <span style="color:#f08c00;font-weight:600;font-size:13px;display:flex;align-items:center;gap:6px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
      <svg viewBox="0 0 18 18" width="16" height="16" fill="none" stroke="#f08c00" stroke-width="1.5" style="flex-shrink:0;">
        <path d="M9 3v12M3 9h12"/><circle cx="9" cy="9" r="7"/>
      </svg> ${_t('floaterTitle')}</span>
    <button id="__lh_f_x" data-tip="${_t('close')}" style="${BTN_GHOST}">${ICON.close}</button>
  </div>
  <div id="__lh_f_tb" style="display:flex;align-items:center;gap:6px;padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.04);flex-wrap:wrap;">
    <div class="lh-btn-group">
      <button id="__lh_f_add" data-tip="${_t('addModule')}" style="${BTN_ACCENT}">${ICON.plus} ${_t('addModule')}</button>
      <button id="__lh_f_expand" data-tip="${_t('expandCollapse')}" style="${BTN_MUTED}">${ICON.up}${ICON.down}</button>
    </div>
    <span style="flex:1;min-width:8px;"></span>
    <div class="lh-btn-group">
      <button id="__lh_f_selall" data-tip="${_t('selectAll')}" style="${BTN_TB_MUTED}">${ICON.check} ${_t('selectAll')}</button>
      <button id="__lh_f_del_sel" data-tip="${_t('deleteSelected')}" style="${BTN_TB_DANGER}">${ICON.trash} ${_t('deleteSelected')}</button>
    </div>
  </div>
  <div id="__lh_f_list" class="lh-scrollbar" style="flex:1;overflow-y:auto;padding:10px 14px;min-height:100px;"></div>
  <div id="__lh_f_ft" style="display:flex;align-items:center;gap:6px;padding:10px 14px;border-top:1px solid rgba(255,255,255,0.04);">
    <button id="__lh_f_preview" data-tip="${_t('previewModule')}" style="${BTN_PREVIEW_LG}">${ICON.eye} ${_t('preview')}</button>
    <button id="__lh_f_copy" data-tip="${_t('copy')}" style="${BTN_COPY_LG}">${ICON.copy} ${_t('copy')}</button>
    <button id="__lh_f_download" data-tip="${_t('download')}" style="${BTN_DOWNLOAD_LG}">${ICON.download} ${_t('download')}</button>
    <span id="__lh_f_status" class="lh-hint-text" style="flex:1;text-align:right;font-size:11px;line-height:32px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"></span>
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
    const m = { id: nextModuleId++, title: '', contents: [''] };
    modules.push(m);
    scrollToFloaterModule = m.id;
    focusedModuleId = m.id;
    collapsedModuleIds.delete(m.id);
    renderModuleList();
    scheduleClampFloaterPosition();
    saveModules();
    setStatus(_t("statusModules", modules.length));
  }

  function removeModule(id) {
    modules = modules.filter(m => m.id !== id);
    selectedModuleIds.delete(id);
    if (focusedModuleId === id) focusedModuleId = null;
    renderModuleList();
    scheduleClampFloaterPosition();
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
    if (!m) return;
    m.contents.push('');
    scrollToFloaterEntry = { moduleId, entryIdx: m.contents.length - 1 };
    focusedModuleId = moduleId;
    collapsedModuleIds.delete(moduleId);
    renderModuleList();
    scheduleClampFloaterPosition();
    saveModules();
  }

  function scrollToNewEntry(container, target, force = false) {
    if (!container || !target) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = typeof target === 'string' ? container.querySelector(target) : target;
        if (!el) return;
        const cRect = container.getBoundingClientRect();
        const eRect = el.getBoundingClientRect();
        if (force || eRect.top < cRect.top || eRect.bottom > cRect.bottom) {
          el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      });
    });
  }

  function updateModuleFocusClasses() {
    const list = document.getElementById('__lh_f_list');
    if (!list) return;
    list.querySelectorAll('[data-module-id]').forEach(card => {
      const mid = parseInt(card.dataset.moduleId, 10);
      card.classList.toggle('lh-module-focused', focusedModuleId === mid);
      card.classList.toggle('lh-module-dimmed', focusedModuleId != null && focusedModuleId !== mid);
    });
  }

  function ensureModuleFocusHandlers() {
    if (moduleFocusBound) return;
    const list = document.getElementById('__lh_f_list');
    if (!list) return;
    moduleFocusBound = true;
    list.addEventListener('mousedown', (e) => {
      if (e.target.closest('.lh-module-cb')) return;
      const card = e.target.closest('[data-module-id]');
      if (!card) return;
      const mid = parseInt(card.dataset.moduleId, 10);
      if (focusedModuleId !== mid) {
        focusedModuleId = mid;
        updateModuleFocusClasses();
      }
    });
    document.addEventListener('mousedown', (e) => {
      if (!document.getElementById('__lh_f')) return;
      if (e.target.closest('[data-module-id]')) return;
      if (!e.target.closest('#__lh_f')) return;
      if (focusedModuleId != null) {
        focusedModuleId = null;
        updateModuleFocusClasses();
      }
    }, true);
  }

  function toggleEditEntriesExpand() {
    if (!editDialogState) return;
    const n = editDialogState.draft.contents.length;
    if (editDialogState.collapsedEditEntries.size === 0) {
      editDialogState.collapsedEditEntries = new Set([...Array(n).keys()]);
    } else {
      editDialogState.collapsedEditEntries.clear();
    }
    editDialogState.renderContents?.();
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
    const pageTitle = getPageTitle();
    const parts = [`# ${pageTitle}`];
    modules.forEach((m) => {
      if (m.title) parts.push(`## ${m.title}`);
      m.contents.forEach(c => { if (c) parts.push(c); });
    });
    return parts.join('\n\n');
  }

  /** 单个模块 Markdown（独立预览/复制/下载） */
  function getModuleMarkdown(m) {
    const parts = [];
    if (m.title) parts.push(`## ${m.title}`);
    m.contents.forEach(c => { if (c) parts.push(c); });
    return parts.join('\n\n');
  }

  function downloadMarkdown(md, filename) {
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function copyMarkdown(md) {
    navigator.clipboard.writeText(md).then(() => {
      setStatus(_t('statusCopied'));
    }).catch(() => {
      setStatus(_t('statusCopyFail'));
    });
  }

  function getModuleDownloadFilename(m) {
    const title = sanitizeFilename(m.title || _t('modulePreview'));
    const time = new Date().toISOString().slice(0, 10);
    return `${title}_${time}.md`;
  }

  /** 从 Axure 文档提取页面标题（header .title 或 head title） */
  function extractAxurePageTitle(doc = document) {
    for (const sel of ['#header .title', 'header .title', '.header .title']) {
      const el = doc.querySelector(sel);
      const text = el?.textContent?.trim();
      if (text) return text;
    }
    const headTitle = doc.querySelector('head title')?.textContent?.trim() || doc.title?.trim();
    return headTitle || '';
  }

  /** 顶层蓝湖壳页面 title（如「项目名-蓝湖」）应排除 */
  function isLanhuShellTitle(title) {
    if (!title) return true;
    return /[-–—]\s*蓝湖\s*$/.test(title) || /\blanhu\b/i.test(title);
  }

  /** iframe 内 Axure 页面向顶层同步标题（跨域 iframe 无法被顶层直接读 DOM） */
  function publishAxurePageTitle() {
    if (FRAME_CTX === 'top') return;
    if (!document.querySelector('.ax_default') && !document.getElementById('base')) return;
    const title = extractAxurePageTitle(document);
    if (!title) return;
    try {
      window.top.postMessage({ type: '__lh_page_title', title }, '*');
    } catch {}
  }

  /** 顶层向 Axure iframe 请求标题 */
  function refreshPageTitleFromIframes() {
    if (FRAME_CTX !== 'top') return;
    document.querySelectorAll('iframe').forEach((f) => {
      try { f.contentWindow?.postMessage({ type: '__lh_request_page_title' }, '*'); } catch {}
    });
  }

  /** 蓝湖左侧页面树当前选中项 */
  function getLanhuSidebarPageTitle() {
    const el = document.querySelector('.prototype-sidebar .tree-item-wrapper.active .tree-name');
    return el?.textContent?.trim() || '';
  }

  /** 获取面积最大的同源 Axure iframe 文档（本地/demo 可用） */
  function getAxureIframeDoc() {
    let best = null, bestArea = 0;
    for (const f of document.querySelectorAll('iframe')) {
      try {
        const doc = f.contentDocument || f.contentWindow?.document;
        if (!doc) continue;
        if (!doc.querySelector('.ax_default') && !doc.getElementById('base')) continue;
        const rect = f.getBoundingClientRect();
        const area = rect.width * rect.height;
        if (area > bestArea) { bestArea = area; best = doc; }
      } catch { /* 跨域 iframe 跳过 */ }
    }
    return best;
  }

  /** 获取当前 Axure 实际页面标题 */
  function getPageTitle() {
    if (_cachedAxurePageTitle) return _cachedAxurePageTitle;

    const doc = getAxureIframeDoc();
    if (doc) {
      const t = extractAxurePageTitle(doc);
      if (t) return t;
    }

    const sidebar = getLanhuSidebarPageTitle();
    if (sidebar) return sidebar;

    refreshPageTitleFromIframes();

    const topTitle = document.title?.trim();
    if (topTitle && !isLanhuShellTitle(topTitle)) return topTitle;

    return _t('unknownPage');
  }

  /** 监听 Axure iframe 加载并初始化标题同步 */
  function initPageTitleBridge() {
    if (FRAME_CTX === 'top') {
      refreshPageTitleFromIframes();
      document.querySelectorAll('#lan-mapping-iframe, .lan-mapping-iframe, iframe').forEach((iframe) => {
        iframe.addEventListener('load', () => {
          _cachedAxurePageTitle = '';
          refreshPageTitleFromIframes();
        });
      });
      return;
    }
    publishAxurePageTitle();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', publishAxurePageTitle, { once: true });
    }
    const titleEl = document.querySelector('head title');
    if (titleEl) {
      new MutationObserver(() => publishAxurePageTitle()).observe(titleEl, {
        childList: true, characterData: true, subtree: true,
      });
    }
  }

  function sanitizeFilename(name) {
    return (name || _t('unknownPage')).replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim() || _t('unknownPage');
  }

  function getDownloadFilename() {
    const title = sanitizeFilename(getPageTitle());
    const time = new Date().toISOString().slice(0, 10);
    return `${title}_${time}.md`;
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
    const btnCopy = document.getElementById('__lh_f_copy');
    if (btnCopy) { btnCopy.innerHTML = `${ICON.copy} ${_t('copy')}`; btnCopy.dataset.tip = _t('copy'); }
    const btnDl = document.getElementById('__lh_f_download');
    if (btnDl) { btnDl.innerHTML = `${ICON.download} ${_t('download')}`; btnDl.dataset.tip = _t('download'); }
    const btnX = document.getElementById('__lh_f_x');
    if (btnX) btnX.dataset.tip = _t('close');
    updateSelAllButton();
  }

  function applyLanguageToEditDialog() {
    if (!editDialogState) return;
    syncEditDraftFromDom();
    const shell = editDialogState.shell;
    updateEditWindowButtons();
    shell.querySelector('#__lh_edit_x')?.setAttribute('data-tip', _t('close'));
    const titleLabel = shell.querySelector('#__lh_edit_title_label');
    if (titleLabel) titleLabel.textContent = _t('title');
    const titleInp = shell.querySelector('#__lh_edit_title');
    if (titleInp) titleInp.placeholder = _t('title');
    const pickTitleBtn = shell.querySelector('#__lh_edit_pick_title');
    if (pickTitleBtn) {
      pickTitleBtn.dataset.tip = _t('pickTitle');
      pickTitleBtn.innerHTML = `${ICON.target} ${_t('pick')}`;
    }
    const contentLabel = shell.querySelector('#__lh_edit_content_label');
    if (contentLabel) contentLabel.remove();
    const addBtn = shell.querySelector('#__lh_edit_add');
    if (addBtn) {
      addBtn.innerHTML = `${ICON.add} ${_t('addEntry')}`;
      addBtn.dataset.tip = _t('addEntry');
    }
    shell.querySelector('#__lh_edit_cancel')?.setAttribute('data-tip', _t('cancel'));
    shell.querySelector('#__lh_edit_save')?.setAttribute('data-tip', _t('save'));
    const expandBtn = shell.querySelector('#__lh_edit_expand');
    if (expandBtn) {
      expandBtn.innerHTML = `${ICON.up}${ICON.down} ${_t('expandCollapse')}`;
      expandBtn.dataset.tip = _t('expandCollapse');
    }
    shell.querySelector('#__lh_edit_cancel') && (shell.querySelector('#__lh_edit_cancel').textContent = _t('cancel'));
    shell.querySelector('#__lh_edit_save') && (shell.querySelector('#__lh_edit_save').textContent = _t('save'));
    editDialogState.renderContents?.();
    if (titleInp) titleInp.value = editDialogState.draft.title;
    updateEditDialogHeaderTitle();
  }

  // ---- 渲染模块列表 ----

  function renderModuleList() {
    const list = document.getElementById('__lh_f_list');
    if (!list) return;
    if (modules.length === 0) {
      focusedModuleId = null;
      list.innerHTML = '<div class="lh-hint-text" style="text-align:center;padding:30px 0;font-size:13px;">' + _t('emptyList') + '</div>';
      return;
    }

    list.innerHTML = modules.map((m, mi) => {
          const isExpanded = !collapsedModuleIds.has(m.id);
          const isSelected = selectedModuleIds.has(m.id);
          return `
    <div data-module-id="${m.id}" draggable="true" class="lh-module-card">
      <div class="lh-module-header" style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:#2c2e33;border-bottom:1px solid ${isExpanded ? '#373a40' : 'transparent'};cursor:pointer;user-select:none;">
        <span style="font-size:10px;color:#909296;flex-shrink:0;transition:transform 0.2s;${isExpanded ? 'transform:rotate(90deg);' : ''}">▶</span>
        <input type="checkbox" class="lh-module-cb" data-mid="${m.id}" ${isSelected ? 'checked' : ''}
          style="flex-shrink:0;accent-color:#f08c00;width:14px;height:14px;cursor:pointer;">
        <span style="flex:1;color:#f08c00;font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;">${escHtml(m.title) || `${_t('title')} ${mi + 1}`}</span>
        <div class="lh-btn-group">
          <div class="lh-btn-fuse">
            <button data-edit="${m.id}" data-tip="${_t('editModule')}" style="${BTN_MOD_EDIT}">${ICON.edit}</button>
            <button data-preview="${m.id}" data-tip="${_t('previewModule')}" style="${BTN_MOD_PREVIEW}">${ICON.eye}</button>
            <button data-copy="${m.id}" data-tip="${_t('copyModule')}" style="${BTN_MOD_COPY}">${ICON.copy}</button>
            <button data-dlmod="${m.id}" data-tip="${_t('downloadModule')}" style="${BTN_MOD_DOWNLOAD}">${ICON.download}</button>
          </div>
          <span class="lh-vsep"></span>
          <div class="lh-btn-fuse">
            <button data-mv="${m.id}" data-dir="-1" data-tip="${_t('moveUp')}" style="${BTN_NEUTRAL_XS}${mi === 0 ? BTN_DISABLED : ''}" ${mi === 0 ? 'disabled' : ''}>${ICON.up}</button>
            <button data-mv="${m.id}" data-dir="1" data-tip="${_t('moveDown')}" style="${BTN_NEUTRAL_XS}${mi === modules.length - 1 ? BTN_DISABLED : ''}" ${mi === modules.length - 1 ? 'disabled' : ''}>${ICON.down}</button>
            <button data-rm="${m.id}" data-tip="${_t('deleteModule')}" style="${BTN_DANGER_XS}">${ICON.trash}</button>
          </div>
        </div>
      </div>
      <div class="lh-module-body" style="${isExpanded ? 'display:flex;flex-direction:column;' : 'display:none;'}max-height:360px;animation:${isExpanded ? 'lhFadeIn 0.2s ease' : 'none'};">
        <div class="lh-module-scroll lh-scrollbar" style="flex:1;min-height:0;overflow-y:auto;padding:10px 14px 0;">
          <div class="lh-field-block" style="margin-bottom:10px;">
            <span class="lh-field-label">${_t('title')}</span>
            <div class="lh-plain-row">
              <input id="__lh_mt_${m.id}" draggable="false" value="${escHtml(m.title)}" placeholder="${_t('pick')}" class="lh-plain-input">
              <button data-pick="${m.id}:title" data-tip="${_t('pickTitle')}" style="${BTN_ACCENT_XS}">${ICON.target} ${_t('pick')}</button>
            </div>
          </div>
          <div class="lh-entries-list">
            ${m.contents.map((c, ci) => `
        <div class="lh-content-entry">
          <div class="lh-entry-hdr">
            <span class="lh-field-label" style="margin:0;">${_t('entryLabel', ci + 1)}</span>
            <div class="lh-btn-fuse">
              <button data-pick="${m.id}:content:${ci}" data-tip="${_t('pickContent')}" style="${BTN_ACCENT_ICON_XS}">${ICON.target}</button>
              <button data-mvc="${m.id}:${ci}:-1" data-tip="${_t('moveUp')}" style="${BTN_NEUTRAL_XS}${ci === 0 ? BTN_DISABLED : ''}" ${ci === 0 ? 'disabled' : ''}>${ICON.up}</button>
              <button data-mvc="${m.id}:${ci}:1" data-tip="${_t('moveDown')}" style="${BTN_NEUTRAL_XS}${ci === m.contents.length - 1 ? BTN_DISABLED : ''}" ${ci === m.contents.length - 1 ? 'disabled' : ''}>${ICON.down}</button>
              <button data-rmc="${m.id}:${ci}" data-tip="${_t('delete')}" style="${BTN_DANGER_XS}">${ICON.trash}</button>
            </div>
          </div>
          <textarea id="__lh_mc_${m.id}_${ci}" draggable="false" rows="2" placeholder="${_t('content')} ${ci+1}" class="lh-scrollbar lh-plain-textarea">${escHtml(c)}</textarea>
        </div>`).join('')}
          </div>
        </div>
        <div class="lh-add-entry-bar" style="padding:8px 14px 10px;">
          <button data-addc="${m.id}" data-tip="${_t('addEntry')}" class="lh-add-entry-btn" style="${BTN_ADD_ENTRY}">${ICON.add} ${_t('addEntry')}</button>
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
        focusedModuleId = mid;
        // 切换当前模块的展开/收起，不影响其他模块
        if (collapsedModuleIds.has(mid)) {
          collapsedModuleIds.delete(mid); // 展开
        } else {
          collapsedModuleIds.add(mid); // 收起
        }
        renderModuleList();
        scheduleClampFloaterPosition();
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
    list.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        focusedModuleId = parseInt(btn.dataset.edit);
        showModuleEditDialog(parseInt(btn.dataset.edit));
      });
    });
    list.querySelectorAll('[data-preview]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const mid = parseInt(btn.dataset.preview);
        const m = modules.find(x => x.id === mid);
        if (!m) return;
        const md = getModuleMarkdown(m);
        if (!md) { setStatus(_t('statusNoModuleContent')); return; }
        openPreviewWindow(m.title || _t('modulePreview'), md);
      });
    });
    list.querySelectorAll('[data-copy]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const mid = parseInt(btn.dataset.copy);
        const m = modules.find(x => x.id === mid);
        if (!m) return;
        const md = getModuleMarkdown(m);
        if (!md) { setStatus(_t('statusNoModuleContent')); return; }
        copyMarkdown(md);
      });
    });
    list.querySelectorAll('[data-dlmod]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const mid = parseInt(btn.dataset.dlmod);
        const m = modules.find(x => x.id === mid);
        if (!m) return;
        const md = getModuleMarkdown(m);
        if (!md) { setStatus(_t('statusNoModuleContent')); return; }
        downloadMarkdown(md, getModuleDownloadFilename(m));
        setStatus(_t('statusDownloaded'));
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

    ensureModuleFocusHandlers();
    updateModuleFocusClasses();
    if (scrollToFloaterEntry) {
      const { moduleId, entryIdx } = scrollToFloaterEntry;
      scrollToFloaterEntry = null;
      const card = list.querySelector(`[data-module-id="${moduleId}"]`);
      const scrollEl = card?.querySelector('.lh-module-scroll');
      const entry = card?.querySelector(`#__lh_mc_${moduleId}_${entryIdx}`)?.closest('.lh-content-entry');
      scrollToNewEntry(scrollEl, entry, true);
    }
    if (scrollToFloaterModule) {
      const mid = scrollToFloaterModule;
      scrollToFloaterModule = null;
      const card = list.querySelector(`[data-module-id="${mid}"]`);
      scrollToNewEntry(list, card, true);
    }
  }

  function escHtml(s) {
    if (!s) return '';
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  const MD_PREVIEW_CSS = `
.lh-md-preview{color:#c1c2c5;font-size:13px;line-height:1.7;word-break:break-word}
.lh-md-preview h1,.lh-md-preview h2,.lh-md-preview h3,.lh-md-preview h4{color:#f08c00;font-weight:600;margin:12px 0 8px}
.lh-md-preview h1{font-size:18px} .lh-md-preview h2{font-size:16px} .lh-md-preview h3{font-size:14px}
.lh-md-preview p{margin:6px 0} .lh-md-preview ul,.lh-md-preview ol{padding-left:20px;margin:6px 0}
.lh-md-preview li{margin:2px 0} .lh-md-preview code{background:#25262b;padding:1px 5px;border-radius:3px;font-size:12px;color:#f08c00}
.lh-md-preview pre{background:#25262b;padding:10px;border-radius:6px;overflow-x:auto;font-size:12px;margin:8px 0}
.lh-md-preview pre code{background:none;padding:0;color:#c1c2c5}
.lh-md-preview blockquote{border-left:3px solid #f08c00;margin:8px 0;padding:2px 12px;color:#909296}
.lh-md-preview .table-wrap{overflow-x:auto;margin:8px 0;max-width:100%}
.lh-md-preview .table-wrap table{width:auto;table-layout:auto;border-collapse:collapse;margin:0;font-size:12px}
.lh-md-preview th,.lh-md-preview td{border:1px solid #373a40;padding:4px 8px;text-align:left;white-space:nowrap}
.lh-md-preview th{background:#25262b;color:#e0e0e0;font-weight:600}
.lh-md-preview a{color:#f08c00}
.lh-md-preview img{max-width:100%;border-radius:4px} .lh-md-preview hr{border:none;border-top:1px solid #373a40;margin:12px 0}
.lh-md-preview-empty{color:rgba(255,255,255,.88);font-size:12px;text-align:center;padding:24px 12px;height:100%;display:flex;align-items:center;justify-content:center;box-sizing:border-box}
.lh-edit-split{flex:1;min-height:0;display:flex;height:100%}
.lh-edit-preview-wrap{flex:1;display:flex;flex-direction:column;min-height:0;height:100%}
.lh-md-preview{height:100%;flex:1;min-height:0;box-sizing:border-box}
`;

  function applyMdPreview(previewEl, md) {
    if (!md || !md.trim()) {
      previewEl.innerHTML = `<div class="lh-md-preview-empty">${_t('noContent')}</div>`;
      return;
    }
    previewEl.innerHTML = renderMarkdown(md);
    previewEl.querySelectorAll('table').forEach(t => {
      const wrap = document.createElement('div');
      wrap.className = 'table-wrap';
      t.parentNode.insertBefore(wrap, t);
      wrap.appendChild(t);
    });
  }

  function syncEditDraftFromDom() {
    if (!editDialogState) return;
    const { shell, draft } = editDialogState;
    const titleInp = shell.querySelector('#__lh_edit_title');
    if (titleInp) draft.title = titleInp.value;
    shell.querySelectorAll('.lh-edit-entry').forEach((block, ci) => {
      const ta = block.querySelector('.lh-edit-ta');
      if (ta && draft.contents[ci] !== undefined) draft.contents[ci] = ta.value;
    });
    updateEditDialogHeaderTitle();
  }

  function insertAtCursor(ta, before, after = '', placeholder = '') {
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = ta.value.substring(start, end) || placeholder;
    ta.value = ta.value.substring(0, start) + before + selected + after + ta.value.substring(end);
    const pos = start + before.length + selected.length;
    ta.setSelectionRange(pos, pos);
    ta.focus();
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function highlightEditPickTarget(field, entryIdx) {
    if (!editDialogState) return;
    editDialogState.shell.querySelectorAll('.lh-edit-pick-target').forEach(el => {
      el.style.outline = '';
      el.style.borderColor = '#373a40';
    });
    let target = null;
    if (field === 'title') {
      target = editDialogState.shell.querySelector('#__lh_edit_title');
    } else if (entryIdx !== undefined) {
      target = editDialogState.shell.querySelector(`.lh-edit-entry[data-entry-idx="${entryIdx}"] .lh-edit-ta`);
    }
    if (target) {
      target.classList.add('lh-edit-pick-target');
      target.style.outline = '1px solid #f08c00';
      target.style.borderColor = '#f08c00';
    }
  }

  const EDIT_DEFAULT_STYLE = { left: '20%', top: '6vh', width: '60%', height: '80vh', maxHeight: '750px', right: 'auto', bottom: 'auto', borderRadius: '12px' };

  function captureEditShellStyle() {
    const s = editDialogState?.shell;
    if (!s) return { ...EDIT_DEFAULT_STYLE };
    return {
      left: s.style.left, top: s.style.top, right: s.style.right, bottom: s.style.bottom,
      width: s.style.width, height: s.style.height, maxHeight: s.style.maxHeight,
      borderRadius: s.style.borderRadius,
    };
  }

  function applyEditExpandedStyle(style) {
    const s = editDialogState?.shell;
    if (!s || !style) return;
    applyEditShellStyle(style);
    s.style.minWidth = '';
    s.style.maxWidth = '';
    s.style.height = style.height || EDIT_DEFAULT_STYLE.height;
    s.style.maxHeight = style.maxHeight || EDIT_DEFAULT_STYLE.maxHeight;
    s.style.boxSizing = 'border-box';
  }

  function applyEditFullscreenStyle() {
    const s = editDialogState?.shell;
    if (!s) return;
    Object.assign(s.style, {
      left: '0', top: '0', right: '0', bottom: '0',
      width: '100vw', height: '100vh',
      maxWidth: 'none', maxHeight: 'none', minWidth: '0',
      borderRadius: '0', boxSizing: 'border-box',
    });
  }

  function updateEditDialogHeaderTitle() {
    if (!editDialogState) return;
    const { shell, draft, moduleId } = editDialogState;
    const titleEl = shell.querySelector('#__lh_edit_h_title');
    if (!titleEl) return;
    const mi = modules.findIndex(x => x.id === moduleId);
    const label = (draft.title || '').trim() || (mi >= 0 ? `${_t('title')} ${mi + 1}` : _t('editModule'));
    titleEl.textContent = label;
  }

  function applyEditShellStyle(style) {
    const s = editDialogState?.shell;
    if (!s || !style) return;
    s.style.left = style.left || '';
    s.style.top = style.top || '';
    s.style.right = style.right || 'auto';
    s.style.bottom = style.bottom || 'auto';
    s.style.width = style.width || '';
    s.style.height = style.height || '';
    s.style.maxHeight = style.maxHeight || '';
    s.style.borderRadius = style.borderRadius || '12px';
  }

  function updateEditWindowButtons() {
    if (!editDialogState) return;
    const { shell, minimized, fullscreen } = editDialogState;
    const minBtn = shell.querySelector('#__lh_edit_min');
    const fsBtn = shell.querySelector('#__lh_edit_fs');
    const tools = shell.querySelector('#__lh_edit_tools');
    if (tools) tools.style.display = 'flex';
    if (minBtn) {
      minBtn.innerHTML = minimized ? ICON.winRestore : ICON.winMin;
      minBtn.dataset.tip = minimized ? _t('restoreEdit') : _t('minimizeEdit');
    }
    if (fsBtn) {
      fsBtn.innerHTML = fullscreen ? ICON.winExitMax : ICON.winMax;
      fsBtn.dataset.tip = fullscreen ? _t('exitFullscreen') : _t('fullscreenEdit');
      fsBtn.style.display = 'inline-flex';
    }
  }

  function showEditToast(message) {
    document.getElementById('__lh_edit_toast')?.remove();
    const toast = document.createElement('div');
    toast.id = '__lh_edit_toast';
    Object.assign(toast.style, {
      position: 'fixed', zIndex: String(Z_EDIT_TOAST), top: '24px', left: '50%', transform: 'translateX(-50%)',
      background: '#25262b', border: '1px solid #373a40', borderRadius: '8px',
      padding: '10px 18px', font: '13px -apple-system,BlinkMacSystemFont,\'PingFang SC\',sans-serif',
      color: '#c1c2c5', boxShadow: '0 4px 16px rgba(0,0,0,0.4)', animation: 'lhFadeIn 0.2s ease',
      whiteSpace: 'nowrap',
    });
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }

  function setEditDialogCompact(compact) {
    if (!editDialogState) return;
    const { shell } = editDialogState;
    const header = shell.querySelector('#__lh_edit_h');
    shell.querySelector('#__lh_edit_body').style.display = compact ? 'none' : 'flex';
    shell.querySelector('#__lh_edit_footer').style.display = compact ? 'none' : 'flex';
    if (compact) {
      shell.style.width = 'auto';
      shell.style.minWidth = '280px';
      shell.style.maxWidth = '480px';
      shell.style.height = 'auto';
      shell.style.maxHeight = 'none';
      shell.style.left = '20px';
      shell.style.bottom = '20px';
      shell.style.top = 'auto';
      shell.style.right = 'auto';
      shell.style.borderRadius = '8px';
      if (header) {
        header.style.borderBottom = 'none';
        header.style.borderRadius = '8px';
        header.style.padding = '10px 14px';
      }
    } else if (header) {
      header.style.borderBottom = '1px solid #373a40';
      header.style.borderRadius = editDialogState.fullscreen ? '0' : '12px 12px 0 0';
      header.style.padding = '12px 16px';
      applyEditExpandedStyle(editDialogState.expandedStyle || EDIT_DEFAULT_STYLE);
    }
    updateEditWindowButtons();
    updateEditDialogHeaderTitle();
  }

  function toggleEditFullscreen() {
    if (!editDialogState) return;
    syncEditDraftFromDom();
    const { shell } = editDialogState;
    if (editDialogState.fullscreen) {
      applyEditExpandedStyle(editDialogState.expandedStyle || EDIT_DEFAULT_STYLE);
      editDialogState.fullscreen = false;
      editDialogState.minimized = false;
      editDialogState.pickMinimized = false;
      setEditDialogCompact(false);
      shell.querySelector('#__lh_edit_body').style.display = 'flex';
      shell.querySelector('#__lh_edit_footer').style.display = 'flex';
    } else {
      if (!editDialogState.minimized) {
        editDialogState.expandedStyle = captureEditShellStyle();
      }
      editDialogState.fullscreen = true;
      editDialogState.minimized = false;
      editDialogState.pickMinimized = false;
      applyEditFullscreenStyle();
      const header = shell.querySelector('#__lh_edit_h');
      if (header) {
        header.style.borderBottom = '1px solid #373a40';
        header.style.borderRadius = '0';
        header.style.padding = '12px 16px';
      }
      shell.querySelector('#__lh_edit_body').style.display = 'flex';
      shell.querySelector('#__lh_edit_footer').style.display = 'flex';
    }
    updateEditWindowButtons();
  }

  function toggleEditMinimize() {
    if (!editDialogState) return;
    if (editDialogState.minimized) {
      editDialogState.pickMinimized = false;
      restoreEditDialog(true);
      return;
    }
    syncEditDraftFromDom();
    if (editDialogState.fullscreen) toggleEditFullscreen();
    editDialogState.expandedStyle = captureEditShellStyle();
    editDialogState.minimized = true;
    setEditDialogCompact(true);
  }

  function minimizeEditDialogForPick() {
    if (!editDialogState || editDialogState.pickMinimized) return;
    syncEditDraftFromDom();
    if (editDialogState.fullscreen) {
      editDialogState.fullscreen = false;
      applyEditExpandedStyle(editDialogState.expandedStyle || EDIT_DEFAULT_STYLE);
    }
    if (!editDialogState.minimized) {
      editDialogState.expandedStyle = captureEditShellStyle();
    }
    editDialogState.minimized = true;
    editDialogState.pickMinimized = true;
    setEditDialogCompact(true);
  }

  function restoreEditDialog(refresh = true) {
    if (!editDialogState) return;
    const { shell, draft } = editDialogState;
    editDialogState.minimized = false;
    editDialogState.pickMinimized = false;
    editDialogState.fullscreen = false;
    applyEditExpandedStyle(editDialogState.expandedStyle || EDIT_DEFAULT_STYLE);
    setEditDialogCompact(false);
    shell.querySelector('#__lh_edit_body').style.display = 'flex';
    shell.querySelector('#__lh_edit_footer').style.display = 'flex';
    updateEditWindowButtons();
    updateEditDialogHeaderTitle();
    if (refresh) {
      const titleInp = shell.querySelector('#__lh_edit_title');
      if (titleInp) titleInp.value = draft.title;
      editDialogState.renderContents?.();
    }
  }

  function closeEditDialog() {
    if (!editDialogState) return;
    if (pickMode && activePickField?.moduleId === editDialogState.moduleId) cancelPick();
    editDialogState.shell.remove();
    editDialogState = null;
  }

  function startPickFromEdit(field, entryIdx) {
    if (!editDialogState) return;
    minimizeEditDialogForPick();
    startPick(editDialogState.moduleId, field, entryIdx, { fromEdit: true });
  }

  function attachUndoRedo(ta, onUpdate) {
    const hist = { stack: [ta.value], idx: 0, locking: false };
    const sync = () => {
      if (hist.locking) return;
      const v = ta.value;
      if (v === hist.stack[hist.idx]) return;
      hist.stack = hist.stack.slice(0, hist.idx + 1);
      hist.stack.push(v);
      if (hist.stack.length > 150) hist.stack.shift();
      hist.idx = hist.stack.length - 1;
      onUpdate?.();
    };
    ta.addEventListener('input', sync);
    const apply = (idx) => {
      hist.locking = true;
      ta.value = hist.stack[idx];
      hist.idx = idx;
      hist.locking = false;
      onUpdate?.();
    };
    return {
      undo: () => { if (hist.idx > 0) apply(hist.idx - 1); },
      redo: () => { if (hist.idx < hist.stack.length - 1) apply(hist.idx + 1); },
      reset: (v) => {
        hist.locking = true;
        ta.value = v;
        hist.stack = [v];
        hist.idx = 0;
        hist.locking = false;
      },
    };
  }

  function syncEditEntryUiState() {
    if (!editDialogState) return;
    editDialogState.shell.querySelectorAll('.lh-edit-entry').forEach((block) => {
      const ci = parseInt(block.dataset.entryIdx, 10);
      if (Number.isNaN(ci)) return;
      const body = block.querySelector('.lh-edit-entry-body');
      if (body && body.offsetParent !== null) {
        editDialogState.entryHeights[ci] = body.offsetHeight;
      }
    });
  }

  function swapEditEntryMeta(a, b) {
    if (!editDialogState) return;
    const hs = editDialogState.entryHeights;
    [hs[a], hs[b]] = [hs[b], hs[a]];
    const collapsed = editDialogState.collapsedEditEntries;
    const aCol = collapsed.has(a);
    const bCol = collapsed.has(b);
    collapsed.delete(a);
    collapsed.delete(b);
    if (aCol) collapsed.add(b);
    if (bCol) collapsed.add(a);
  }

  function attachEntryResize(block, ci) {
    const handle = block.querySelector('.lh-edit-resize');
    const body = block.querySelector('.lh-edit-entry-body');
    if (!handle || !body) return;
    handle.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const startY = e.clientY;
      const startH = body.offsetHeight;
      document.body.style.userSelect = 'none';
      handle.style.background = 'rgba(240,140,0,0.08)';
      const move = (ev) => {
        const h = Math.max(EDIT_ENTRY_MIN_H, startH + (ev.clientY - startY));
        body.style.height = `${h}px`;
        editDialogState.entryHeights[ci] = h;
      };
      const up = () => {
        handle.style.background = '';
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        document.body.style.userSelect = '';
      };
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', up);
    });
  }

  /** 模块编辑弹窗 — 分栏 Markdown 编辑器（无遮罩、可拖拽、拾取时收起） */
  function showModuleEditDialog(moduleId) {
    const m = modules.find(x => x.id === moduleId);
    if (!m) return;

    closeEditDialog();
    ensureLhUiStyles();
    initLhTooltipSystem();

    const draft = { title: m.title, contents: m.contents.length ? [...m.contents] : [''] };
    const shell = document.createElement('div');
    shell.id = '__lh_edit';
    Object.assign(shell.style, {
      position: 'fixed', zIndex: String(Z_EDIT),
      left: EDIT_DEFAULT_STYLE.left, top: EDIT_DEFAULT_STYLE.top,
      width: EDIT_DEFAULT_STYLE.width, height: EDIT_DEFAULT_STYLE.height,
      maxHeight: EDIT_DEFAULT_STYLE.maxHeight,
      background: '#1a1b1e', border: '1px solid #373a40', borderRadius: EDIT_DEFAULT_STYLE.borderRadius,
      display: 'flex', flexDirection: 'column',
      boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
      boxSizing: 'border-box',
      font: '13px -apple-system,BlinkMacSystemFont,\'PingFang SC\',sans-serif', color: '#c1c2c5',
      animation: 'lhFadeIn 0.2s ease',
    });

    const mdTaStyle = 'width:100%;height:100%;flex:1;min-height:0;padding:10px 12px;';

    editDialogState = {
      moduleId,
      draft,
      shell,
      minimized: false,
      pickMinimized: false,
      fullscreen: false,
      expandedStyle: { ...EDIT_DEFAULT_STYLE },
      entryHeights: {},
      collapsedEditEntries: new Set(),
      renderContents: null,
    };

    function wireEntryBlock(block, ci) {
      const ta = block.querySelector('.lh-edit-ta');
      const previewEl = block.querySelector('.lh-md-preview');
      const modeBtns = block.querySelectorAll('[data-view-mode]');
      const splitPane = block.querySelector('.lh-edit-split');

      const applyViewMode = (mode) => {
        const editor = splitPane.querySelector('.lh-edit-editor');
        const preview = splitPane.querySelector('.lh-edit-preview-wrap');
        modeBtns.forEach(b => {
          b.style.cssText = b.dataset.viewMode === mode ? BTN_TOOL_ACTIVE_XS : BTN_TOOL_XS;
        });
        if (mode === 'write') {
          editor.style.flex = '1'; editor.style.display = 'flex';
          editor.style.flexDirection = 'column';
          editor.style.height = '100%';
          preview.style.display = 'none';
        } else if (mode === 'preview') {
          editor.style.display = 'none';
          preview.style.flex = '1';
          preview.style.display = 'flex';
          preview.style.flexDirection = 'column';
          preview.style.height = '100%';
        } else {
          editor.style.flex = '1'; editor.style.display = 'flex';
          editor.style.flexDirection = 'column';
          editor.style.height = '100%';
          preview.style.flex = '1';
          preview.style.display = 'flex';
          preview.style.flexDirection = 'column';
          preview.style.height = '100%';
        }
        splitPane.style.flex = '1';
        splitPane.style.minHeight = '0';
        splitPane.style.height = '100%';
        previewEl.style.height = '100%';
        applyMdPreview(previewEl, ta.value);
      };

      const onTaUpdate = () => {
        draft.contents[ci] = ta.value;
        applyMdPreview(previewEl, ta.value);
      };
      const undoRedo = attachUndoRedo(ta, onTaUpdate);

      modeBtns.forEach(b => b.addEventListener('click', () => applyViewMode(b.dataset.viewMode)));
      applyViewMode('split');

      block.querySelector('[data-md-undo]')?.addEventListener('click', () => undoRedo.undo());
      block.querySelector('[data-md-redo]')?.addEventListener('click', () => undoRedo.redo());
      ta.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undoRedo.undo(); }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); undoRedo.redo(); }
      });

      block.querySelectorAll('[data-md-cmd]').forEach(btn => {
        btn.addEventListener('click', () => {
          const cmd = btn.dataset.mdCmd;
          const map = {
            bold: ['**', '**', 'text'],
            italic: ['*', '*', 'text'],
            link: ['[', '](url)', 'text'],
            heading: ['## ', '', 'heading'],
            list: ['- ', '', 'item'],
            code: ['`', '`', 'code'],
          };
          const [before, after, ph] = map[cmd] || ['', '', ''];
          insertAtCursor(ta, before, after, ph);
          draft.contents[ci] = ta.value;
          applyMdPreview(previewEl, ta.value);
        });
      });

      block.querySelector('[data-edit-pick]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        startPickFromEdit('content', ci);
      });

      block.querySelectorAll('.lh-edit-entry-hdr button, .lh-edit-md-toolbar button').forEach(btn => {
        btn.addEventListener('click', (e) => e.stopPropagation());
      });

      block.querySelector('[data-entry-up]')?.addEventListener('click', () => {
        if (ci <= 0) return;
        syncEditDraftFromDom();
        syncEditEntryUiState();
        [draft.contents[ci - 1], draft.contents[ci]] = [draft.contents[ci], draft.contents[ci - 1]];
        swapEditEntryMeta(ci - 1, ci);
        renderEditContents();
      });
      block.querySelector('[data-entry-down]')?.addEventListener('click', () => {
        if (ci >= draft.contents.length - 1) return;
        syncEditDraftFromDom();
        syncEditEntryUiState();
        [draft.contents[ci], draft.contents[ci + 1]] = [draft.contents[ci + 1], draft.contents[ci]];
        swapEditEntryMeta(ci, ci + 1);
        renderEditContents();
      });
      block.querySelector('[data-entry-rm]')?.addEventListener('click', () => {
        syncEditDraftFromDom();
        syncEditEntryUiState();
        if (draft.contents.length <= 1) { draft.contents[0] = ''; renderEditContents(); return; }
        draft.contents.splice(ci, 1);
        editDialogState.collapsedEditEntries.delete(ci);
        const nextCollapsed = new Set();
        editDialogState.collapsedEditEntries.forEach(i => {
          if (i < ci) nextCollapsed.add(i);
          else if (i > ci) nextCollapsed.add(i - 1);
        });
        editDialogState.collapsedEditEntries = nextCollapsed;
        const nextHeights = {};
        Object.entries(editDialogState.entryHeights).forEach(([k, v]) => {
          const i = parseInt(k, 10);
          if (i < ci) nextHeights[i] = v;
          else if (i > ci) nextHeights[i - 1] = v;
        });
        editDialogState.entryHeights = nextHeights;
        renderEditContents();
      });

      block.querySelector('.lh-edit-entry-hdr')?.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        if (editDialogState.collapsedEditEntries.has(ci)) {
          editDialogState.collapsedEditEntries.delete(ci);
        } else {
          syncEditEntryUiState();
          editDialogState.collapsedEditEntries.add(ci);
        }
        renderEditContents();
      });

      attachEntryResize(block, ci);
    }

    function renderEditContents() {
      syncEditDraftFromDom();
      syncEditEntryUiState();
      const container = shell.querySelector('#__lh_edit_contents');
      if (!container) return;
      container.innerHTML = draft.contents.map((c, ci) => {
        const collapsed = editDialogState.collapsedEditEntries.has(ci);
        const entryH = editDialogState.entryHeights[ci] || EDIT_ENTRY_DEFAULT_H;
        return `
        <div class="lh-edit-entry" data-entry-idx="${ci}">
          <div class="lh-edit-entry-hdr${collapsed ? '' : ' is-open'}">
            <span class="lh-edit-entry-chevron">▶</span>
            <span class="lh-field-label" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;margin:0;">${_t('entryLabel', ci + 1)}</span>
            <div class="lh-btn-group" style="flex-wrap:wrap;justify-content:flex-end;">
              <div class="lh-btn-fuse">
                <button data-edit-pick data-tip="${_t('pickContent')}" style="${BTN_ACCENT_XS}">${ICON.target} ${_t('pick')}</button>
              </div>
              <span class="lh-vsep"></span>
              <div class="lh-btn-fuse">
                <button data-view-mode="write" data-tip="${_t('writeMode')}" style="${BTN_TOOL_XS}">${_t('writeMode')}</button>
                <button data-view-mode="split" data-tip="${_t('splitMode')}" style="${BTN_TOOL_ACTIVE_XS}">${_t('splitMode')}</button>
                <button data-view-mode="preview" data-tip="${_t('previewMode')}" style="${BTN_TOOL_XS}">${_t('previewMode')}</button>
              </div>
              <span class="lh-vsep"></span>
              <div class="lh-btn-fuse">
                <button data-entry-up ${ci === 0 ? 'disabled' : ''} data-tip="${_t('moveUp')}" style="${BTN_NEUTRAL_XS}${ci === 0 ? BTN_DISABLED : ''}">${ICON.up}</button>
                <button data-entry-down ${ci === draft.contents.length - 1 ? 'disabled' : ''} data-tip="${_t('moveDown')}" style="${BTN_NEUTRAL_XS}${ci === draft.contents.length - 1 ? BTN_DISABLED : ''}">${ICON.down}</button>
                <button data-entry-rm data-tip="${_t('delete')}" style="${BTN_DANGER_XS}">${ICON.trash}</button>
              </div>
            </div>
          </div>
          <div class="lh-edit-md-toolbar" style="${collapsed ? 'display:none;' : ''}">
            <div class="lh-btn-fuse">
              <button data-md-undo data-tip="${_t('undo')}" style="${BTN_TOOL_ICON_XS}">${ICON.undo}</button>
              <button data-md-redo data-tip="${_t('redo')}" style="${BTN_TOOL_ICON_XS}">${ICON.redo}</button>
            </div>
            <span class="lh-vsep"></span>
            <div class="lh-btn-fuse">
              <button data-md-cmd="bold" data-tip="${_t('mdBold')}" style="${BTN_TOOL_ICON_XS}"><b>B</b></button>
              <button data-md-cmd="italic" data-tip="${_t('mdItalic')}" style="${BTN_TOOL_ICON_XS}"><i>I</i></button>
              <button data-md-cmd="link" data-tip="${_t('mdLink')}" style="${BTN_TOOL_ICON_XS}">L</button>
              <button data-md-cmd="heading" data-tip="${_t('mdHeading')}" style="${BTN_TOOL_ICON_XS}">H</button>
              <button data-md-cmd="list" data-tip="${_t('mdList')}" style="${BTN_TOOL_ICON_XS}">•</button>
              <button data-md-cmd="code" data-tip="${_t('mdCode')}" style="${BTN_TOOL_ICON_XS}">&lt;/&gt;</button>
            </div>
          </div>
          <div class="lh-edit-entry-body" style="${collapsed ? 'display:none;' : `height:${entryH}px;`}">
            <div class="lh-edit-split">
              <div class="lh-edit-editor" style="flex:1;display:flex;flex-direction:column;min-width:0;min-height:0;height:100%;">
                <textarea class="lh-edit-ta lh-scrollbar" style="${mdTaStyle}">${escHtml(c)}</textarea>
              </div>
              <div class="lh-edit-preview-wrap" style="flex:1;display:flex;flex-direction:column;background:#141517;overflow:hidden;min-width:0;min-height:0;height:100%;">
                <div class="lh-md-preview lh-scrollbar" style="flex:1;height:100%;overflow:auto;padding:10px 12px;min-height:0;box-sizing:border-box;"></div>
              </div>
            </div>
            <div class="lh-edit-resize"></div>
          </div>
        </div>`;
      }).join('');

      container.querySelectorAll('.lh-edit-entry').forEach((block, ci) => wireEntryBlock(block, ci));

      if (editDialogState.scrollToEntryIdx != null) {
        const idx = editDialogState.scrollToEntryIdx;
        editDialogState.scrollToEntryIdx = null;
        scrollToNewEntry(container, `.lh-edit-entry[data-entry-idx="${idx}"]`, true);
      }
    }
    editDialogState.renderContents = renderEditContents;

    shell.innerHTML = `
      <style>${MD_PREVIEW_CSS}</style>
      <div id="__lh_edit_h" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#25262b;border-bottom:1px solid #373a40;border-radius:12px 12px 0 0;cursor:move;user-select:none;gap:12px;">
        <span id="__lh_edit_h_title" style="flex:1;color:#f08c00;font-weight:600;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;"></span>
        <div id="__lh_edit_tools" class="lh-btn-group">
          <button id="__lh_edit_min" data-tip="${_t('minimizeEdit')}" style="${BTN_GHOST}">${ICON.winMin}</button>
          <button id="__lh_edit_fs" data-tip="${_t('fullscreenEdit')}" style="${BTN_GHOST}">${ICON.winMax}</button>
          <button id="__lh_edit_x" data-tip="${_t('close')}" style="${BTN_GHOST}">${ICON.close}</button>
        </div>
      </div>
      <div id="__lh_edit_body" style="flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden;padding:14px 16px;">
        <div class="lh-field-block" style="margin-bottom:14px;">
          <div class="lh-edit-title-row">
            <span id="__lh_edit_title_label" class="lh-field-label" style="margin:0;">${_t('title')}</span>
            <button id="__lh_edit_expand" data-tip="${_t('expandCollapse')}" style="${BTN_MUTED}">${ICON.up}${ICON.down} ${_t('expandCollapse')}</button>
          </div>
          <div class="lh-plain-row">
            <input id="__lh_edit_title" type="text" value="${escHtml(draft.title)}" placeholder="${_t('title')}" class="lh-plain-input">
            <button id="__lh_edit_pick_title" data-tip="${_t('pickTitle')}" style="${BTN_ACCENT_XS}">${ICON.target} ${_t('pick')}</button>
          </div>
        </div>
        <div id="__lh_edit_contents" class="lh-scrollbar lh-entries-list" style="flex:1;min-height:0;overflow-y:auto;"></div>
        <div class="lh-add-entry-bar" style="padding-top:10px;">
          <button id="__lh_edit_add" data-tip="${_t('addEntry')}" class="lh-add-entry-btn" style="${BTN_ADD_ENTRY}">${ICON.add} ${_t('addEntry')}</button>
        </div>
      </div>
      <div id="__lh_edit_footer" style="display:flex;gap:8px;justify-content:flex-end;padding:10px 16px;border-top:1px solid #373a40;background:#25262b;border-radius:0 0 12px 12px;">
        <button id="__lh_edit_cancel" data-tip="${_t('cancel')}" style="${BTN_CANCEL}">${_t('cancel')}</button>
        <button id="__lh_edit_save" data-tip="${_t('save')}" style="${BTN_SAVE}">${_t('save')}</button>
      </div>`;

    document.body.appendChild(shell);
    renderEditContents();
    updateEditDialogHeaderTitle();

    const titleInp = shell.querySelector('#__lh_edit_title');
    titleInp?.addEventListener('input', () => {
      draft.title = titleInp.value;
      updateEditDialogHeaderTitle();
    });

    shell.querySelector('#__lh_edit_pick_title')?.addEventListener('click', (e) => {
      e.stopPropagation();
      startPickFromEdit('title');
    });
    shell.querySelector('#__lh_edit_add')?.addEventListener('click', () => {
      syncEditDraftFromDom();
      syncEditEntryUiState();
      const newIdx = editDialogState.draft.contents.length;
      editDialogState.draft.contents.push('');
      editDialogState.collapsedEditEntries.delete(newIdx);
      editDialogState.scrollToEntryIdx = newIdx;
      renderEditContents();
    });
    shell.querySelector('#__lh_edit_expand')?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleEditEntriesExpand();
    });
    shell.querySelector('#__lh_edit_min')?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleEditMinimize();
    });
    shell.querySelector('#__lh_edit_fs')?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleEditFullscreen();
    });
    shell.querySelector('#__lh_edit_x')?.addEventListener('click', (e) => { e.stopPropagation(); closeEditDialog(); });
    shell.querySelector('#__lh_edit_cancel')?.addEventListener('click', () => closeEditDialog());
    shell.querySelector('#__lh_edit_save')?.addEventListener('click', () => {
      syncEditDraftFromDom();
      m.title = draft.title;
      m.contents = draft.contents.length ? [...draft.contents] : [''];
      saveModules();
      collapsedModuleIds.delete(moduleId);
      renderModuleList();
      scheduleClampFloaterPosition();
      closeEditDialog();
      setStatus(_t('statusSaved'));
    });

    // 拖拽
    const header = shell.querySelector('#__lh_edit_h');
    header?.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      if (editDialogState.fullscreen) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = shell.getBoundingClientRect();
      const ox = e.clientX - rect.left;
      const oy = e.clientY - rect.top;
      shell.style.right = 'auto';
      shell.style.bottom = 'auto';
      shell.style.width = rect.width + 'px';
      if (!editDialogState.minimized && !editDialogState.fullscreen) {
        editDialogState.expandedStyle = captureEditShellStyle();
      }
      document.body.style.userSelect = 'none';
      const move = (ev) => {
        let x = ev.clientX - ox;
        let y = ev.clientY - oy;
        const fw = shell.offsetWidth;
        const fh = shell.offsetHeight;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        if (x < 0) x = 0;
        if (y < 0) y = 0;
        if (x + fw > vw) x = vw - fw;
        if (y + fh > vh) y = vh - fh;
        shell.style.left = x + 'px';
        shell.style.top = y + 'px';
        if (!editDialogState.minimized && !editDialogState.fullscreen) {
          editDialogState.expandedStyle = captureEditShellStyle();
        }
      };
      const up = () => {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        document.body.style.userSelect = '';
      };
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', up);
    }, { passive: false });

    titleInp?.focus();
  }

  // ---- 拾取到字段 ----

  function startPick(mId, field, entryIdx, opts = {}) {
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
      if (editDialogState && editDialogState.moduleId === mId) {
        highlightEditPickTarget(field, entryIdx);
      } else {
        const targetId = field === 'title' ? `__lh_mt_${mId}` : `__lh_mc_${mId}_${entryIdx}`;
        const inp = document.getElementById(targetId);
        if (inp) inp.style.borderColor = '#f08c00';
      }
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

    if (editDialogState && editDialogState.moduleId === moduleId) {
      const { draft } = editDialogState;
      if (field === 'title') {
        draft.title = md;
      } else if (entryIdx !== undefined && draft.contents[entryIdx] !== undefined) {
        draft.contents[entryIdx] = md;
      } else {
        draft.contents.push(md);
      }
      editDialogState.pickMinimized = false;
      updateEditDialogHeaderTitle();
      showEditToast(_t(field === 'title' ? 'pickFilledTitle' : 'pickFilledContent'));
      updateEditWindowButtons();
      hideHighlight();
      document.removeEventListener('mousedown', onMouseDown, true);
      document.removeEventListener('mousemove', onMouseMove, true);
      document.removeEventListener('mouseup', onMouseUp, true);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (FRAME_CTX === 'top') {
        editDialogState.shell.querySelectorAll('.lh-edit-pick-target').forEach(el => {
          el.style.outline = '';
          el.style.borderColor = '#373a40';
        });
        chrome.runtime.sendMessage({ action: 'cancel-pick-state' }).catch(() => {});
        document.querySelectorAll('iframe').forEach(f => {
          try { f.contentWindow.postMessage({ type: '__lh_cancel_pick' }, '*'); } catch {}
        });
      }
      activePickField = null;
      pickMode = false;
      console.log('[蓝湖] finishPick → 编辑弹窗 draft:', field, entryIdx, md.slice(0, 40));
      return;
    }

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
      if (editDialogState && editDialogState.moduleId === moduleId) {
        editDialogState.shell.querySelectorAll('.lh-edit-pick-target').forEach(el => {
          el.style.outline = '';
          el.style.borderColor = '#373a40';
        });
      } else {
        const targetId = field === 'title' ? `__lh_mt_${moduleId}` : `__lh_mc_${moduleId}_${entryIdx}`;
        const inp = document.getElementById(targetId);
        if (inp) inp.style.borderColor = '#373a40';
      }
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
    const previewScrollbarCss = `
html{scrollbar-width:thin;scrollbar-color:#373a40 transparent}
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:#373a40;border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:#5c5f66}`;
    previewWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escHtml(title)}</title>
<style>
${previewScrollbarCss}
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
    refreshPageTitleFromIframes();
    const md = getFullMarkdown();
    if (!md) { setStatus(_t('statusNoContent')); return; }
    openPreviewWindow(getPageTitle(), md);
    setStatus(_t('statusPreviewOpen'));
  }

  // ---- 浮动面板创建 ----

  function createFloater() {
    if (document.getElementById('__lh_f')) {
      floater = document.getElementById('__lh_f');
      createdByMe = true;
      initLhTooltipSystem();
      return;
    }
    createdByMe = true;
    ensureLhUiStyles();
    initLhTooltipSystem();
    // 注入动画 keyframes + 工具提示样式 + 卡片过渡
    const styleId = '__lh_f_anim';
    if (!document.getElementById(styleId)) {
      const st = document.createElement('style');
      st.id = styleId;
      st.textContent = `
@keyframes lhFadeIn { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
.lh-module-card.lh-dragging{opacity:.45;transform:scale(.97);filter:none!important}
.lh-module-card.drag-over{border-color:#f08c00!important;box-shadow:0 0 0 1px rgba(240,140,0,.3)!important;opacity:1!important;filter:none!important}
.lh-drop-indicator{transition:opacity 0.15s ease,height 0.15s ease}
.lh-btn-tip{display:inline-flex;align-items:center;gap:4px}
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
      scheduleClampFloaterPosition();
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
      scheduleClampFloaterPosition();
      saveModules();
      setStatus(_t("statusDeleted", modules.length));
    });

    // 预览
    document.getElementById('__lh_f_preview')?.addEventListener('click', (e) => { e.stopPropagation(); showPreview(); });

    // 复制
    document.getElementById('__lh_f_copy')?.addEventListener('click', (e) => {
      e.stopPropagation();
      refreshPageTitleFromIframes();
      const md = getFullMarkdown();
      if (!md) { setStatus(_t('statusNoContent')); return; }
      copyMarkdown(md);
    });

    // 下载
    document.getElementById('__lh_f_download')?.addEventListener('click', (e) => {
      e.stopPropagation();
      refreshPageTitleFromIframes();
      const md = getFullMarkdown();
      if (!md) { setStatus(_t('statusNoContent')); return; }
      downloadMarkdown(md, getDownloadFilename());
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
          setFloaterPosition(gRect.left, gRect.top);
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
      _cachedAxurePageTitle = '';
      if (pickMode) cancelPick();
      closeEditDialog();
      showPageSwitchTip();
      deactivate();
    }, 500);
  }

  /** 页面切换提示 — 全屏遮罩（首次）或底部小 toast（已勾"不再提示"） */
  function showPageSwitchTip() {
    const show = () => {
      chrome.storage.local.get('__lh_no_page_tip', (d) => {
        if (d && d.__lh_no_page_tip) {
          showPageSwitchToast();
        } else {
          showPageSwitchDialog();
        }
      });
    };
    try {
      const ls = localStorage.getItem('axure_utils_lang');
      if (ls) applyLang(ls);
    } catch {}
    if (_lang) {
      show();
      return;
    }
    chrome.storage.local.get('axure_utils_lang', (d) => {
      if (d?.axure_utils_lang) applyLang(d.axure_utils_lang);
      show();
    });
  }

  /** 底部小 toast，3秒自动关闭 */
  function showPageSwitchToast() {
    ensureLhUiStyles();
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
    toast.innerHTML = `<span>${_t('dataSavedToast')}</span><button id="__lh_toast_close" data-tip="${_t('gotItBtn')}" style="background:#373a40;color:#909296;border:none;border-radius:4px;padding:3px 10px;font-size:11px;cursor:pointer;">${_t('gotItBtn')}</button>`;
    document.body.appendChild(toast);
    let closed = false;
    const close = () => { if (!closed) { closed = true; toast.remove(); } };
    document.getElementById('__lh_toast_close')?.addEventListener('click', close);
    setTimeout(close, 3000);
  }

  /** 全屏遮罩对话框，含倒计时 + 不再提示选项 */
  function showPageSwitchDialog() {
    ensureLhUiStyles();
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
      if (btn) btn.textContent = _t('gotIt', countdown);
      if (countdown <= 0) close();
    };
    const builderLabel = _t('openBuilderLabel');
    const descHtml = escHtml(_t('pageSwitchDesc', builderLabel))
      .replace(escHtml(builderLabel), `<span style="color:#f08c00;font-weight:600;">${escHtml(builderLabel)}</span>`);
    tip.innerHTML = `<div style="background:#25262b;border:1px solid #373a40;border-radius:12px;padding:32px 40px;text-align:center;max-width:400px;">
      <div style="display:flex;justify-content:flex-end;margin-bottom:4px;">
        <button id="__lh_tip_x" data-tip="${_t('close')}" style="background:transparent;color:rgba(255,255,255,.88);border:none;font-size:16px;cursor:pointer;padding:0 4px;">✕</button>
      </div>
      <div style="font-size:36px;margin-bottom:12px;">📄</div>
      <div style="font-size:16px;font-weight:600;color:#fff;margin-bottom:8px;">${_t('pageSwitched')}</div>
      <div class="lh-hint-text" style="font-size:13px;line-height:1.6;margin-bottom:20px;">${descHtml}</div>
      <label class="lh-hint-text" style="display:flex;align-items:center;justify-content:center;gap:6px;font-size:12px;cursor:pointer;margin-bottom:16px;">
        <input type="checkbox" id="__lh_tip_nomore" style="accent-color:#f08c00;width:14px;height:14px;cursor:pointer;"> ${_t('noMoreTip')}
      </label>
      <button id="__lh_tip_ok" data-tip="${_t('dismiss')}" style="background:#373a40;color:#c1c2c5;border:none;border-radius:6px;padding:8px 24px;font-size:13px;cursor:pointer;">${_t('gotIt', countdown)}</button>
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

  const FLOATER_MARGIN = 20;

  /** 读取浮窗当前可视位置（不受 bottom/right/transform 混用影响） */
  function getFloaterPosition() {
    const r = floater.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  }

  /** 统一定位：仅用 transform，避免与 bottom/right/left/top 冲突 */
  function setFloaterPosition(x, y, animate = false) {
    floater.style.left = '0';
    floater.style.top = '0';
    floater.style.bottom = 'auto';
    floater.style.right = 'auto';
    floaterAnchorX = x;
    if (!animate) {
      floater.style.transition = 'none';
      floater.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
      return;
    }
    floater.style.transition = 'transform 0.25s ease';
    floater.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    const onEnd = () => {
      floater.style.transition = '';
      floater.removeEventListener('transitionend', onEnd);
    };
    floater.addEventListener('transitionend', onEnd);
  }

  /** 将 bottom/right 锚定转为 transform，便于高度变化时只调整 Y */
  function normalizeFloaterPosition() {
    if (!floater) return;
    const r = floater.getBoundingClientRect();
    const computed = getComputedStyle(floater);
    const hasTransform = floater.style.transform && floater.style.transform !== 'none';
    const usesBottomRight = computed.bottom !== 'auto' && computed.right !== 'auto' && !hasTransform;
    if (floaterAnchorX === null) floaterAnchorX = r.left;
    if (usesBottomRight) setFloaterPosition(floaterAnchorX, r.top, false);
  }

  /** 高度变化后：X 不变，仅 Y 超出视口时才调整 */
  function clampFloaterPosition() {
    if (!floater || floater.style.display === 'none') return;
    normalizeFloaterPosition();
    const vh = window.innerHeight;
    const { y, h } = getFloaterPosition();
    const x = floaterAnchorX ?? getFloaterPosition().x;
    let ny = y;
    let changed = false;
    if (y + h > vh) { ny = vh - h; changed = true; }
    if (ny < 0) { ny = 0; changed = true; }
    if (changed) setFloaterPosition(x, ny, true);
  }

  /** 等 DOM 布局完成后再钳制（合并快速连续触发） */
  function scheduleClampFloaterPosition() {
    if (clampRafId) cancelAnimationFrame(clampRafId);
    clampRafId = requestAnimationFrame(() => {
      clampRafId = requestAnimationFrame(() => {
        clampRafId = 0;
        clampFloaterPosition();
      });
    });
  }

  /** 重置浮窗到初始右下角位置 */
  function resetFloaterPosition() {
    if (!floater) return;
    floaterAnchorX = null;
    if (clampRafId) { cancelAnimationFrame(clampRafId); clampRafId = 0; }
    floater.style.transition = 'none';
    floater.style.left = '';
    floater.style.top = '';
    floater.style.transform = '';
    floater.style.bottom = `${FLOATER_MARGIN}px`;
    floater.style.right = `${FLOATER_MARGIN}px`;
    void floater.offsetHeight;
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
    if (e.target.closest && (e.target.closest('#__lh_f') || e.target.closest('#__lh_edit'))) {
      console.log('[蓝湖] mousedown → 扩展面板点击，跳过');
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
    if (messageListenerReady) return;
    messageListenerReady = true;
    window.addEventListener('message', (e) => {
      const data = e.data;
      if (!data || !data.type) return;

      switch (data.type) {

        // iframe → 顶层：同步 Axure 页面标题
        case '__lh_page_title':
          if (FRAME_CTX === 'top' && data.title) {
            _cachedAxurePageTitle = String(data.title).trim();
          }
          break;

        // 顶层 → iframe：请求页面标题
        case '__lh_request_page_title':
          publishAxurePageTitle();
          break;

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

  function openDocBuilder(lang) {
    applyLang(lang);
    if (FRAME_CTX !== 'top') {
      if (!active) activate();
      return;
    }
    if (!active) activate();
    createFloater();
    showFloater();
    resetFloaterPosition();
    refreshPageTitleFromIframes();
  }

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
      closeEditDialog();
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
      case 'open-builder': openDocBuilder(request.lang); sendResponse({status:'ok'}); break;
      // 语言切换
      case 'set-language':
        applyLang(request.lang || 'zh_CN');
        try { localStorage.setItem('axure_utils_lang', _lang); } catch {}
        chrome.storage.local.set({ axure_utils_lang: _lang }).catch(() => {});
        console.log('[蓝湖] 语言已切换:', _lang);
        // 刷新浮窗 UI
        applyLanguageToFloater();
        applyLanguageToEditDialog();
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

  setupMessageListener();
  initPageTitleBridge();

})();
