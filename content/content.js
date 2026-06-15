/**
 * 蓝湖 Axure 需求提取器 — 内容脚本
 *
 * Axure 页面结构分析（基于 iframe.html 完整数据）：
 *
 * 组件类型         数量  说明
 * _形状1           456   绝对定位的矩形（标签、表格格⼦）
 * table_cell       240   表格单元格（6 张表）
 * shape             46   基本形状
 * _文本段落1        17   文本段落
 * image             15   图片
 * box_2/box_3       16   容器盒子
 * checkbox           6   复选框
 * _文本段落          6   文本段落
 * heading_11         5   标题
 * paragraph1         2   段落
 * line/icon/_连接    4   线/图标/连接
 *
 * 提取策略：
 * 1. table_cell 表格 → getBoundingClientRect 行列推断
 * 2. _形状1 网格 → 按位置分组（Y坐标行，X坐标列）
 * 3. 普通组件 → 按类型提取文本
 * 4. 动态面板 → 展开提取内部内容
 */

(() => {
  'use strict';

  const FRAME_CTX = getFrameContext();
  console.log(`[蓝湖提取器] 已加载 — ${FRAME_CTX}`);

  // ==================== 工具 ====================

  function getFrameContext() {
    try {
      if (window.top === window.self) return 'top';
      return window.parent.location.hostname.includes('lanhuapp') ? 'lanhu-iframe' : 'unknown-iframe';
    } catch { return 'cross-origin-iframe'; }
  }

  /** 获取 Axure 组件的文本内容 */
  function axureText(el) {
    if (!el) return '';
    // Axure 文本在 #uXX_text .text 或直接 .text 中
    const textDiv = el.querySelector('.text, [id$="_text"]');
    if (textDiv && textDiv.innerText.trim()) return textDiv.innerText.trim();
    // 隐藏文本（display:none）但可能有值
    const hiddenText = el.querySelector('[id$="_text"][style*="display:none"]');
    if (hiddenText && hiddenText.innerText.trim()) return hiddenText.innerText.trim();
    return el.innerText.trim();
  }

  function isVisible(el) {
    if (!el || !el.getBoundingClientRect) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 2 && rect.height > 2;
  }

  function escapeMd(t) { return t.replace(/\|/g, '\\|').replace(/\n/g, ' '); }

  function getBBox(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  }

  // ==================== 表格提取（两种方式） ====================

  /**
   * 方式1：table_cell 标签表格
   * 找所有 .ax_default.table_cell，按容器分组，按位置推断行列
   */
  function extractTableCells(root) {
    const results = [];
    const allCells = root.querySelectorAll('.ax_default.table_cell');
    if (allCells.length < 4) return results; // 至少 2x2

    // 按最近 .ax_default 父容器分组
    const groups = new Map();
    allCells.forEach(cell => {
      if (!isVisible(cell)) return;
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
      const table = buildTableFromCells(cells);
      if (table) {
        table.type = 'table';
        table.heading = extractTableHeading(container);
        table.markdown = `### ${table.heading}\n\n${buildMdTable(table.rowData, table.cols)}`;
        table.text = table.rowData.map(r => r.join(' | ')).join('; ').substring(0, 200);
        results.push(table);
      }
    });

    return results;
  }

  /**
   * 方式2：_形状1 网格表格
   * 找所有 .ax_default._形状1，按容器分组，按位置推断行列
   */
  function extractShapeGrids(root) {
    const results = [];
    const shapes = root.querySelectorAll('.ax_default._形状1');
    if (shapes.length < 4) return results;

    // 按父容器分组（最近的 .ax_default 或 #base）
    const groups = new Map();
    shapes.forEach(s => {
      if (!isVisible(s)) return;
      const text = axureText(s);
      if (!text) return; // 跳过空形状

      let p = s.parentElement;
      while (p && p !== root && p !== root.body) {
        if (p.classList.contains('ax_default') || p.classList.contains('panel_state_content') || p.id === 'base') break;
        p = p.parentElement;
      }
      if (!p) p = s.parentElement;
      if (!groups.has(p)) groups.set(p, []);
      groups.get(p).push(s);
    });

    groups.forEach((shapes, container) => {
      if (shapes.length < 4) return;

      // 尝试构建表格
      const table = buildTableFromCells(shapes);
      if (table) {
        table.type = 'shape-grid';
        table.heading = extractTableHeading(container);
        table.markdown = `### ${table.heading}\n\n${buildMdTable(table.rows, table.cols)}`;
        results.push(table);
      }
    });

    return results;
  }

  /** 从一组元素中构建表格（按位置行列推断） */
  function buildTableFromCells(elements) {
    const bboxes = elements.map(el => {
      const rect = getBBox(el);
      return { el, text: axureText(el), x: Math.round(rect.x), y: Math.round(rect.y) };
    }).filter(c => c.text.length > 0 || true); // 保留空 cell 占位

    if (bboxes.length < 4) return null;

    // 按 Y 分组（行），容差 8px
    const rows = [];
    const yTol = 8;
    const sorted = [...bboxes].sort((a, b) => a.y - b.y);

    sorted.forEach(c => {
      let found = false;
      for (const row of rows) {
        if (Math.abs(row.y - c.y) <= yTol) {
          row.cells.push(c);
          row.y = Math.min(row.y, c.y);
          found = true;
          break;
        }
      }
      if (!found) rows.push({ y: c.y, cells: [c] });
    });

    // 每行按 X 排序
    rows.forEach(r => r.cells.sort((a, b) => a.x - b.x));

    // 过滤：至少 2 行 2 列
    if (rows.length < 2) return null;
    const colCounts = rows.map(r => r.cells.length);
    const maxCols = Math.max(...colCounts);
    if (maxCols < 2) return null;

    // 统一列数
    rows.forEach(r => {
      while (r.cells.length < maxCols) {
        r.cells.push({ text: '' });
      }
    });

    return {
      rows: rows.length,
      cols: maxCols,
      rowData: rows.map(r => r.cells.map(c => c.text)),
    };
  }

  function buildMdTable(rowData, maxCols) {
    const lines = [];
    rowData.forEach((cells, idx) => {
      const texts = cells.map(t => escapeMd(t || ''));
      while (texts.length < maxCols) texts.push('');
      lines.push(`| ${texts.join(' | ')} |`);
      if (idx === 0) lines.push(`| ${texts.map(() => '---').join(' | ')} |`);
    });
    return lines.join('\n');
  }

  function extractTableHeading(container) {
    const prev = container.previousElementSibling;
    if (prev) {
      const t = axureText(prev);
      if (t && t.length < 60) return t;
    }
    // 尝试从容器上的 data-* 属性
    const label = container.getAttribute('data-label');
    if (label) return label;
    return '数据表';
  }

  // ==================== 动态面板提取 ====================

  function extractDynamicPanels(root) {
    const results = [];
    const panels = root.querySelectorAll('.panel_state_content, [class*="panel_state"]');
    panels.forEach(panel => {
      // 提取 panel 内的所有文本
      const texts = [];
      panel.querySelectorAll('[id$="_text"] .text, .text p span').forEach(el => {
        const t = el.innerText.trim();
        if (t && t.length > 1 && !texts.includes(t)) texts.push(t);
      });
      if (texts.length > 0) {
        results.push({
          type: 'dynamic-panel',
          heading: '面板内容',
          markdown: `### 面板内容\n\n${texts.join('\n')}`,
        });
      }
    });
    return results;
  }

  // ==================== 其他组件提取 ====================

  function extractHeadings(root) {
    const results = [];
    const headings = root.querySelectorAll(
      '.ax_default.heading_11, h1, h2, h3, h4, h5, h6, [class*="heading"]'
    );
    const seen = new Set();
    headings.forEach(h => {
      const t = axureText(h) || h.innerText.trim();
      if (!t || seen.has(t) || t.length < 2) return;
      seen.add(t);
      results.push({ type: 'heading', heading: t, markdown: `## ${t}` });
    });
    return results;
  }

  function extractCheckboxes(root) {
    const results = [];
    const cbs = root.querySelectorAll('.ax_default.checkbox, [class*="checkbox"]');
    const items = Array.from(cbs).map(cb => axureText(cb)).filter(t => t.length > 0);
    if (items.length > 0) {
      results.push({
        type: 'checkbox',
        heading: '选项',
        markdown: `## 选项\n\n${items.map(t => `- [ ] ${t}`).join('\n')}`,
      });
    }
    return results;
  }

  function extractParagraphs(root) {
    const results = [];
    const paras = root.querySelectorAll(
      '.ax_default.paragraph1, .ax_default._文本段落1, .ax_default._文本段落, .ax_default.shape'
    );
    const texts = Array.from(paras).map(p => axureText(p)).filter(t => t.length > 10);
    if (texts.length > 0) {
      results.push({
        type: 'text',
        heading: '说明',
        markdown: texts.join('\n\n'),
      });
    }
    return results;
  }

  // ==================== 主提取函数 ====================

  function extractFromDocument(doc) {
    const root = doc.body || doc;
    if (!root) return { sections: [], markdown: '' };

    let sections = [];

    // 1. table_cell 表格
    sections.push(...extractTableCells(root));

    // 2. _形状1 网格表格（关键新增！）
    sections.push(...extractShapeGrids(root));

    // 3. 动态面板
    sections.push(...extractDynamicPanels(root));

    // 4. 标题
    sections.push(...extractHeadings(root));

    // 5. 复选框
    sections.push(...extractCheckboxes(root));

    // 6. 段落（仅在无表格时）
    if (sections.filter(s => s.type === 'table' || s.type === 'shape-grid').length === 0) {
      sections.push(...extractParagraphs(root));
    }

    // 构建 Markdown
    const title = doc.title || '未知页面';
    const lines = [
      `# ${title}`,
      '',
      `**提取时间**: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`,
      '',
      '---',
      '',
    ];
    sections.forEach(s => { lines.push(s.markdown); lines.push(''); });
    return { sections, markdown: lines.join('\n') };
  }

  // ==================== 拾取模式（同上，略作优化） ====================

  let pickerActive = false;
  let pickerHighlight = null;
  let pickerOverlay = null;
  let pickerTarget = null;

  function createPickerUI() {
    pickerHighlight = document.createElement('div');
    pickerHighlight.id = '__lh_h';
    Object.assign(pickerHighlight.style, {
      position: 'fixed', pointerEvents: 'none', zIndex: '2147483646',
      border: '2px solid #f08c00', background: 'rgba(240,140,0,0.08)',
      borderRadius: '4px', transition: 'all 0.05s', display: 'none',
    });
    document.body.appendChild(pickerHighlight);

    pickerOverlay = document.createElement('div');
    pickerOverlay.id = '__lh_o';
    Object.assign(pickerOverlay.style, {
      position: 'fixed', pointerEvents: 'none', zIndex: '2147483647',
      background: '#f08c00', color: '#fff', fontSize: '11px',
      padding: '2px 8px', borderRadius: '3px', fontFamily: 'monospace',
      whiteSpace: 'nowrap', display: 'none',
    });
    document.body.appendChild(pickerOverlay);
  }

  function removePickerUI() {
    [pickerHighlight, pickerOverlay].forEach(el => { if (el) el.remove(); });
    pickerHighlight = pickerOverlay = null;
  }

  function onPickerMove(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el.id?.startsWith('__lh_')) return;
    pickerTarget = el;
    const rect = el.getBoundingClientRect();
    if (!rect || rect.width === 0) return;

    if (pickerHighlight) {
      pickerHighlight.style.cssText += `display:block;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px`;
    }
    if (pickerOverlay) {
      const text = (axureText(el) || '').substring(0, 50).replace(/\n/g, ' ');
      const tag = el.tagName.toLowerCase();
      const id = el.id ? '#' + el.id : '';
      pickerOverlay.textContent = `<${tag}${id}> ${text}`;
      pickerOverlay.style.left = rect.left + 'px';
      pickerOverlay.style.top = (rect.top - 24 < 0 ? rect.bottom + 4 : rect.top - 24) + 'px';
      pickerOverlay.style.display = 'block';
    }
  }

  function onPickerClick(e) {
    if (!pickerTarget) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const el = pickerTarget;
    let md = '', type = 'text', text = '';

    // 尝试以表格提取
    if (el.classList.contains('table_cell') || el.closest('.ax_default')) {
      const parent = el.closest('.ax_default') || el.parentElement;
      // 尝试 table_cell 表格
      const cells = parent.querySelectorAll('.ax_default.table_cell');
      if (cells.length >= 4) {
        const table = buildTableFromCells(cells);
        if (table) { md = buildMdTable(table.rowData, table.cols); type = 'table'; }
      }
      // 尝试 _形状1 表格
      if (!md) {
        const shapes = parent.querySelectorAll('.ax_default._形状1');
        if (shapes.length >= 4) {
          const table = buildTableFromCells(shapes);
          if (table) { md = buildMdTable(table.rowData, table.cols); type = 'shape-grid'; }
        }
      }
    }

    if (!md) {
      md = axureText(el) || el.innerText.trim();
      type = 'text';
    }

    text = md.substring(0, 200);
    const selector = getElementSelector(el);
    deactivatePicker();

    chrome.runtime.sendMessage({
      action: 'picker-result',
      data: { markdown: md, type, text, selector, tag: el.tagName.toLowerCase(), id: el.id || '', classes: Array.from(el.classList).join('.') },
    });
  }

  function onPickerKey(e) {
    if (e.key === 'Escape') {
      deactivatePicker();
      chrome.runtime.sendMessage({ action: 'picker-cancelled' });
    }
  }

  function activatePicker() {
    if (pickerActive) return;
    pickerActive = true;
    createPickerUI();
    document.addEventListener('mousemove', onPickerMove, true);
    document.addEventListener('click', onPickerClick, true);
    document.addEventListener('keydown', onPickerKey, true);
    document.body.style.cursor = 'crosshair';
    document.body.style.userSelect = 'none';
  }

  function deactivatePicker() {
    if (!pickerActive) return;
    pickerActive = false;
    document.removeEventListener('mousemove', onPickerMove, true);
    document.removeEventListener('click', onPickerClick, true);
    document.removeEventListener('keydown', onPickerKey, true);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    removePickerUI();
    pickerTarget = null;
  }

  function getElementSelector(el) {
    const parts = [];
    let cur = el;
    while (cur && cur !== document.body) {
      const tag = cur.tagName.toLowerCase();
      let sel = tag;
      if (cur.id) { parts.unshift('#' + cur.id); break; }
      const cls = Array.from(cur.classList).filter(c => !c.startsWith('__lh_')).slice(0, 2);
      if (cls.length) sel += '.' + cls.join('.');
      parts.unshift(sel);
      cur = cur.parentElement;
    }
    return parts.join(' > ');
  }

  // ==================== 页面 API ====================

  function fullExtract() {
    const main = extractFromDocument(document);
    const isAxure = !!document.querySelector('.ax_default');
    return {
      frame: FRAME_CTX, isAxureContent: isAxure,
      pages: [{ frame: FRAME_CTX, title: document.title, sections: main.sections, markdown: main.markdown }],
      combinedMarkdown: main.markdown,
    };
  }

  function simpleExtract() {
    const result = extractFromDocument(document);
    return {
      frame: FRAME_CTX, isAxureContent: !!document.querySelector('.ax_default'),
      pages: [{ frame: FRAME_CTX, title: document.title, sections: result.sections, markdown: result.markdown }],
      combinedMarkdown: result.markdown,
    };
  }

  function getDiagnostics() {
    return {
      frame: FRAME_CTX, title: document.title,
      tableCells: document.querySelectorAll('.ax_default.table_cell').length,
      shapeGrid: document.querySelectorAll('.ax_default._形状1').length,
      panels: document.querySelectorAll('.panel_state_content').length,
      widgets: document.querySelectorAll('.ax_default').length,
      bodySize: document.body?.innerText?.length || 0,
    };
  }

  // ==================== 消息处理 ====================

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
      case 'extract-axure':
        sendResponse({ status: 'ok', data: FRAME_CTX === 'top' ? fullExtract() : simpleExtract() });
        break;
      case 'ping': sendResponse({ pong: true, frame: FRAME_CTX }); break;
      case 'diagnose-me': sendResponse({ status: 'ok', data: getDiagnostics() }); break;
      case 'start-picker': activatePicker(); sendResponse({ status: 'ok' }); break;
      case 'stop-picker': deactivatePicker(); sendResponse({ status: 'ok' }); break;
    }
    return true;
  });

})();
