/**
 * 蓝湖 Axure 需求提取器 — 内容脚本 v2
 *
 * 完整覆盖所有 Axure 组件类型（基于 3 个 iframe 实测）：
 *
 * 表格类：     table_cell (2879) | _形状1 网格 (820)
 * 标题类：     heading_11 | heading_21 | _二级标题1 | _三级标题
 * 文本类：     label | label1 | shape | _文本段落1/2 | paragraph1 | box_1/2/3
 * 交互类：     checkbox | 动态面板
 * 装饰类(跳过): line | image | icon | _连接 | horizontal_line | _线段
 */

(() => {
  'use strict';

  const FRAME_CTX = getFrameContext();
  console.log(`[蓝湖提取器 v2] 已加载 — ${FRAME_CTX}`);

  // ==================== 工具 ====================

  function getFrameContext() {
    try {
      if (window.top === window.self) return 'top';
      return window.parent.location.hostname.includes('lanhuapp') ? 'lanhu-iframe' : 'unknown-iframe';
    } catch { return 'cross-origin-iframe'; }
  }

  /** 获取 Axure 组件文本（优先 .text，兼容隐藏文本） */
  function axureText(el) {
    if (!el) return '';
    const td = el.querySelector('.text, [id$="_text"]');
    if (td && td.innerText.trim()) return td.innerText.trim();
    const hd = el.querySelector('[id$="_text"][style*="display:none"]');
    if (hd && hd.innerText.trim()) return hd.innerText.trim();
    return el.innerText.trim();
  }

  function isVisible(el) {
    if (!el || el.classList.contains('ax_default_hidden')) return false;
    if (!el.getBoundingClientRect) return false;
    const r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  }

  function escapeMd(t) { return (t || '').replace(/\|/g, '\\|').replace(/\n/g, ' '); }

  // 跳过装饰性组件
  const SKIP_CLASSES = ['image', '_图片_', '_图片_1', 'line', '_线段', 'horizontal_line',
    'vertical_line', 'icon', 'iconfont', '_连接', 'ax_default_hidden'];

  function isSkippable(el) {
    for (const cls of SKIP_CLASSES) {
      if (el.classList.contains(cls)) return true;
    }
    // 无文本的空元素
    if (el.classList.contains('shape') || el.classList.contains('box_2') || el.classList.contains('box_3')) {
      const text = el.innerText.trim();
      if (!text) return true;
    }
    return false;
  }

  // ==================== 核心：table_cell 表格提取 ====================

  /** 从一组元素中构建表格（getBoundingClientRect 按位置推断行列） */
  function buildTable(elements) {
    const items = Array.from(elements).map(el => {
      const r = el.getBoundingClientRect();
      return { el, text: axureText(el), x: Math.round(r.left), y: Math.round(r.top) };
    }).filter(c => c.text.length > 0 || c.w > 5);

    if (items.length < 4) return null;

    // 按 Y 分组（行），容差 8px
    const rows = [];
    const yTol = 8;
    [...items].sort((a, b) => a.y - b.y).forEach(c => {
      let row = rows.find(r => Math.abs(r.y - c.y) <= yTol);
      if (row) { row.cells.push(c); row.y = Math.min(row.y, c.y); }
      else rows.push({ y: c.y, cells: [c] });
    });

    rows.forEach(r => r.cells.sort((a, b) => a.x - b.x));

    if (rows.length < 2) return null;
    const maxCols = Math.max(...rows.map(r => r.cells.length));
    if (maxCols < 2) return null;

    // 统一列数
    rows.forEach(r => { while (r.cells.length < maxCols) r.cells.push({ text: '' }); });

    return {
      rows: rows.length,
      cols: maxCols,
      rowData: rows.map(r => r.cells.map(c => c.text)),
    };
  }

  function mdTable(table) {
    const lines = [];
    table.rowData.forEach((cells, idx) => {
      const texts = cells.map(t => escapeMd(t));
      lines.push(`| ${texts.join(' | ')} |`);
      if (idx === 0) lines.push(`| ${texts.map(() => '---').join(' | ')} |`);
    });
    return lines.join('\n');
  }

  /** 提取所有 Axure table_cell 表格 */
  function extractTableCells(root) {
    const results = [];
    const allCells = root.querySelectorAll('.ax_default.table_cell');
    if (allCells.length < 4) return results;

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
      const table = buildTable(cells);
      if (table) {
        // 找表格附近标题
        const prev = container.previousElementSibling;
        const heading = prev ? axureText(prev) : '';
        results.push({
          type: 'table',
          heading: heading && heading.length < 100 ? heading : `数据表 ${results.length + 1}`,
          rows: table.rows, cols: table.cols,
          markdown: `### ${heading && heading.length < 100 ? heading : `数据表 ${results.length + 1}`}\n\n${mdTable(table)}`,
          text: table.rowData.map(r => r.join(' | ')).join('; ').substring(0, 200),
        });
      }
    });
    return results;
  }

  // ==================== _形状1 网格检测 ====================

  /** _形状1 网格表格（仅当构成清晰行列结构时） */
  function extractShapeGrids(root) {
    const results = [];
    const shapes = root.querySelectorAll('.ax_default._形状1');
    if (shapes.length < 6) return results;

    // 按父容器分组（最近的 .ax_default 或 .panel_state_content）
    const groups = new Map();
    shapes.forEach(s => {
      if (!isVisible(s) || isSkippable(s)) return;
      const text = axureText(s);
      if (!text) return;
      let p = s.parentElement;
      while (p && p !== root && p !== root.body) {
        if (['ax_default', 'panel_state_content', 'panel_state'].some(c => p.classList.contains(c)) || p.id === 'base')
          break;
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
        const heading = prev ? axureText(prev) : '';
        results.push({
          type: 'shape-grid',
          heading: heading || `数据区域`,
          rows: table.rows, cols: table.cols,
          markdown: `### ${heading || `数据区域`}\n\n${mdTable(table)}`,
          text: table.rowData.map(r => r.join(' | ')).join('; ').substring(0, 200),
        });
      }
    });
    return results;
  }

  // ==================== 文本内容提取 ====================

  const HEADING_SELECTOR = [
    '.ax_default.heading_11',
    '.ax_default.heading_21',
    '.ax_default._二级标题1',
    '.ax_default._三级标题',
    '.ax_default.label',
    '.ax_default.label1',
    'h1, h2, h3, h4, h5, h6',
  ].join(', ');

  const PARA_SELECTOR = [
    '.ax_default._文本段落1',
    '.ax_default._文本段落',
    '.ax_default.paragraph1',
    '.ax_default.shape',
    '.ax_default.box_1',
    '.ax_default.box_2',
    '.ax_default.box_3',
  ].join(', ');

  /** 提取标题和标签 */
  function extractHeadings(root) {
    const results = [];
    const els = root.querySelectorAll(HEADING_SELECTOR);
    const seen = new Set();
    els.forEach(el => {
      if (!isVisible(el) || isSkippable(el)) return;
      const t = axureText(el);
      if (!t || seen.has(t) || t.length < 2) return;
      seen.add(t);

      // 推断标题级别
      let level = '##';
      if (el.classList.contains('_三级标题')) level = '####';
      else if (el.classList.contains('_二级标题1')) level = '###';
      else if (el.classList.contains('heading_21')) level = '###';
      else if (el.classList.contains('label') || el.classList.contains('label1')) level = '**'; // 加粗
      else if (el.classList.contains('heading_11')) level = '##';
      else if (/^H[1-6]$/.test(el.tagName)) level = '#'.repeat(parseInt(el.tagName[1]));

      results.push({ type: 'heading', level, text: t, markdown: `${level} ${t}` });
    });
    return results;
  }

  /** 提取段落文本（跳过纯表格容器内的文本） */
  function extractParagraphs(root) {
    const results = [];
    const els = root.querySelectorAll(PARA_SELECTOR);
    const texts = [];
    const seen = new Set();

    els.forEach(el => {
      if (!isVisible(el) || isSkippable(el)) return;
      const t = axureText(el);
      if (!t || t.length < 8 || seen.has(t)) return;
      seen.add(t);

      // 跳过已经在表格中出现的文本
      const inTable = el.closest('.table_cell') || el.closest('[class*="table_cell"]');
      if (inTable) return;

      texts.push(t);
    });

    if (texts.length > 0) {
      results.push({
        type: 'text',
        heading: '说明',
        markdown: texts.join('\n\n'),
      });
    }
    return results;
  }

  /** 提取复选框 */
  function extractCheckboxes(root) {
    const items = [];
    root.querySelectorAll('.ax_default.checkbox, [class*="checkbox"]').forEach(cb => {
      if (!isVisible(cb)) return;
      const t = axureText(cb);
      if (t) items.push(t);
    });
    if (items.length === 0) return [];
    return [{
      type: 'checkbox',
      heading: '选项',
      markdown: `## 选项\n\n${items.map(t => `- [ ] ${t}`).join('\n')}`,
    }];
  }

  /** 提取动态面板文本 */
  function extractPanels(root) {
    const texts = [];
    root.querySelectorAll('.panel_state_content').forEach(panel => {
      panel.querySelectorAll('[id$="_text"] .text, .text p span').forEach(el => {
        const t = el.innerText.trim();
        if (t && t.length > 1 && !texts.includes(t)) texts.push(t);
      });
    });
    if (texts.length === 0) return [];
    return [{
      type: 'panel',
      heading: '面板内容',
      markdown: `## 面板内容\n\n${texts.join('\n')}`,
    }];
  }

  // ==================== 主提取流程 ====================

  function extractFromDocument(doc) {
    const root = doc.body || doc;
    if (!root) return { sections: [], markdown: '' };

    let sections = [];

    // 1. 表格（最高优先级）
    sections.push(...extractTableCells(root));
    sections.push(...extractShapeGrids(root));

    // 2. 标题和标签
    sections.push(...extractHeadings(root));

    // 3. 复选框
    sections.push(...extractCheckboxes(root));

    // 4. 动态面板
    sections.push(...extractPanels(root));

    // 5. 段落（仅在无明显表格时补充）
    if (sections.filter(s => s.type === 'table' || s.type === 'shape-grid').length === 0) {
      sections.push(...extractParagraphs(root));
    }

    // 按 Y 坐标排序（自上而下）
    sections.sort((a, b) => (a._y || 0) - (b._y || 0));

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

    // 去重：相同内容的 markdown 只保留一次
    const seenMd = new Set();
    sections.forEach(s => {
      if (!s.markdown || seenMd.has(s.markdown)) return;
      seenMd.add(s.markdown);
      lines.push(s.markdown);
      lines.push('');
    });

    return { sections, markdown: lines.join('\n') };
  }

  // ==================== 拾取模式 ====================

  let pickerActive = false;
  let hEl = null, oEl = null, target = null;

  function initPickerUI() {
    hEl = document.createElement('div');
    Object.assign(hEl.style, { position:'fixed', pointerEvents:'none', zIndex:'2147483646',
      border:'2px solid #f08c00', background:'rgba(240,140,0,0.08)', borderRadius:'4px',
      transition:'all 0.05s', display:'none' });
    hEl.id = '__lh_h';
    document.body.appendChild(hEl);

    oEl = document.createElement('div');
    Object.assign(oEl.style, { position:'fixed', pointerEvents:'none', zIndex:'2147483647',
      background:'#f08c00', color:'#fff', fontSize:'11px', padding:'2px 8px',
      borderRadius:'3px', fontFamily:'monospace', whiteSpace:'nowrap', display:'none' });
    oEl.id = '__lh_o';
    document.body.appendChild(oEl);
  }

  function activatePicker() {
    if (pickerActive) return;
    pickerActive = true;
    initPickerUI();
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey, true);
    document.body.style.cursor = 'crosshair';
    document.body.style.userSelect = 'none';
  }

  function deactivatePicker() {
    if (!pickerActive) return;
    pickerActive = false;
    document.removeEventListener('mousemove', onMove, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKey, true);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    [hEl, oEl].forEach(el => { if (el) el.remove(); });
    hEl = oEl = target = null;
  }

  function onMove(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el.id?.startsWith('__lh_')) return;
    target = el;
    const rect = el.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    if (hEl) Object.assign(hEl.style, { display:'block', left:rect.left+'px', top:rect.top+'px',
      width:rect.width+'px', height:rect.height+'px' });
    if (oEl) {
      const text = (axureText(el) || '').substring(0, 50).replace(/\n/g,' ');
      oEl.textContent = `<${el.tagName.toLowerCase()}${el.id?'#'+el.id:''}> ${text}`;
      const t = rect.top-24 < 0 ? rect.bottom+4 : rect.top-24;
      Object.assign(oEl.style, { display:'block', left:rect.left+'px', top:t+'px' });
    }
  }

  function onClick(e) {
    if (!target) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    const el = target;
    let md = '', type = 'text';

    // 尝试从当前元素提取表格
    for (const sel of ['.ax_default.table_cell', '.ax_default._形状1']) {
      const cells = el.querySelectorAll(sel);
      if (cells.length >= 4) {
        const table = buildTable(cells);
        if (table) { md = mdTable(table); type = 'table'; break; }
      }
    }
    // 尝试从父容器提取表格
    if (!md) {
      const parent = el.closest('.ax_default') || el.parentElement;
      if (parent) {
        for (const sel of ['.ax_default.table_cell', '.ax_default._形状1']) {
          const cells = parent.querySelectorAll(sel);
          if (cells.length >= 4) {
            const table = buildTable(cells);
            if (table) { md = mdTable(table); type = 'table'; break; }
          }
        }
      }
    }
    if (!md) { md = axureText(el) || el.innerText.trim(); type = 'text'; }

    deactivatePicker();
    chrome.runtime.sendMessage({
      action: 'picker-result',
      data: { markdown: md, type, text: md.substring(0,200),
        tag: el.tagName.toLowerCase(), id: el.id||'', classes:Array.from(el.classList).join('.') },
    });
  }

  function onKey(e) { if (e.key === 'Escape') { deactivatePicker(); chrome.runtime.sendMessage({action:'picker-cancelled'}); } }

  // ==================== API ====================

  function fullExtract() {
    const main = extractFromDocument(document);
    return {
      frame: FRAME_CTX, isAxureContent: !!document.querySelector('.ax_default'),
      pages: [{ frame:FRAME_CTX, title:document.title, sections:main.sections, markdown:main.markdown }],
      combinedMarkdown: main.markdown,
    };
  }

  function simpleExtract() {
    const result = extractFromDocument(document);
    return {
      frame: FRAME_CTX, isAxureContent: !!document.querySelector('.ax_default'),
      pages: [{ frame:FRAME_CTX, title:document.title, sections:result.sections, markdown:result.markdown }],
      combinedMarkdown: result.markdown,
    };
  }

  function getDiagnostics() {
    return {
      frame: FRAME_CTX, title: document.title,
      tableCells: document.querySelectorAll('.ax_default.table_cell').length,
      shapes: document.querySelectorAll('.ax_default._形状1').length,
      headings: document.querySelectorAll('.ax_default.heading_11, .ax_default.heading_21, .ax_default._二级标题1').length,
      labels: document.querySelectorAll('.ax_default.label, .ax_default.label1').length,
      widgets: document.querySelectorAll('.ax_default').length,
    };
  }

  // ==================== 消息处理 ====================

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
      case 'extract-axure':
        sendResponse({ status:'ok', data: FRAME_CTX === 'top' ? fullExtract() : simpleExtract() });
        break;
      case 'ping': sendResponse({ pong:true, frame:FRAME_CTX }); break;
      case 'diagnose-me': sendResponse({ status:'ok', data:getDiagnostics() }); break;
      case 'start-picker': activatePicker(); sendResponse({ status:'ok' }); break;
      case 'stop-picker': deactivatePicker(); sendResponse({ status:'ok' }); break;
    }
    return true;
  });

})();
