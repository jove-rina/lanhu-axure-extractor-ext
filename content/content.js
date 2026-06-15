/**
 * 蓝湖 Axure 需求提取器 — 内容脚本 v2.1
 *
 * 拾取模式改为页面内浮动面板，不依赖 popup 生命周期。
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

  function axureText(el) {
    if (!el) return '';
    const td = el.querySelector('.text, [id$="_text"]');
    if (td && td.innerText.trim()) return td.innerText.trim();
    return el.innerText.trim();
  }

  function isVisible(el) {
    if (!el || el.classList.contains('ax_default_hidden')) return false;
    const r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  }

  function escapeMd(t) { return (t || '').replace(/\|/g, '\\|').replace(/\n/g, ' '); }

  const SKIP_CLASSES = ['image', '_图片_', '_图片_1', 'line', '_线段', 'horizontal_line',
    'vertical_line', 'icon', 'iconfont', '_连接', 'ax_default_hidden'];

  // ==================== 表格构建 ====================

  function buildTable(elements) {
    const items = Array.from(elements).map(el => {
      const r = el.getBoundingClientRect();
      return { text: axureText(el), x: Math.round(r.left), y: Math.round(r.top) };
    }).filter(c => c.text.length > 0);

    if (items.length < 4) return null;

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
    rows.forEach(r => { while (r.cells.length < maxCols) r.cells.push({ text: '' }); });

    return { rows: rows.length, cols: maxCols, rowData: rows.map(r => r.cells.map(c => c.text)) };
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

  // ==================== 拾取模式 + 浮动面板 ====================

  let pickerActive = false;
  let pickerHighlight = null;
  let pickerFloater = null;
  let pickerTarget = null;

  const FLOATER_HTML = `
    <div id="__lh_floater" style="all:initial;position:fixed;z-index:2147483647;bottom:20px;right:20px;
      width:420px;max-height:500px;background:#1a1b1e;border:1px solid #373a40;border-radius:8px;
      box-shadow:0 8px 32px rgba(0,0,0,0.5);font-family:-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;
      font-size:13px;color:#c1c2c5;display:none;flex-direction:column;overflow:hidden;">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;
        background:#25262b;border-bottom:1px solid #373a40;">
        <span style="color:#f08c00;font-weight:600;font-size:13px;">🎯 拾取结果</span>
        <div style="display:flex;gap:6px;">
          <button id="__lh_copy" style="background:#2b8a3e;color:#fff;border:none;border-radius:4px;
            padding:4px 10px;font-size:12px;cursor:pointer;font-family:inherit;">📋 复制</button>
          <button id="__lh_dl" style="background:#f08c00;color:#fff;border:none;border-radius:4px;
            padding:4px 10px;font-size:12px;cursor:pointer;font-family:inherit;">💾 下载</button>
          <button id="__lh_close" style="background:transparent;color:#909296;border:1px solid #373a40;
            border-radius:4px;padding:4px 10px;font-size:12px;cursor:pointer;font-family:inherit;">✕</button>
        </div>
      </div>
      <div id="__lh_body" style="padding:12px;overflow-y:auto;max-height:380px;white-space:pre-wrap;
        font-size:12px;line-height:1.6;color:#909296;"></div>
      <div style="padding:6px 14px;background:#25262b;border-top:1px solid #373a40;font-size:11px;color:#5c5f66;
        display:flex;justify-content:space-between;">
        <span id="__lh_status">悬停元素查看，点击提取</span>
        <span>ESC 退出</span>
      </div>
    </div>`;

  let floaterMounted = false;

  function mountFloater() {
    if (floaterMounted) return;
    const div = document.createElement('div');
    div.innerHTML = FLOATER_HTML;
    document.body.appendChild(div.firstElementChild);
    floaterMounted = true;

    const floater = document.getElementById('__lh_floater');
    if (!floater) return;
    pickerFloater = floater;

    document.getElementById('__lh_close')?.addEventListener('click', () => deactivatePicker());
    document.getElementById('__lh_copy')?.addEventListener('click', () => {
      const body = document.getElementById('__lh_body');
      if (!body || !body.textContent) return;
      navigator.clipboard.writeText(body.textContent).then(() => {
        document.getElementById('__lh_status').textContent = '✅ 已复制';
        setTimeout(() => document.getElementById('__lh_status').textContent = '悬停查看，点击提取', 2000);
      });
    });
    document.getElementById('__lh_dl')?.addEventListener('click', () => {
      const body = document.getElementById('__lh_body');
      if (!body || !body.textContent) return;
      const blob = new Blob([body.textContent], { type: 'text/markdown' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `拾取_${Date.now()}.md`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }

  function showFloater() {
    if (!pickerFloater) return;
    pickerFloater.style.display = 'flex';
  }

  function hideFloater() {
    if (!pickerFloater) return;
    pickerFloater.style.display = 'none';
  }

  function setFloaterContent(md, type) {
    const body = document.getElementById('__lh_body');
    const status = document.getElementById('__lh_status');
    if (body) body.textContent = md;
    if (status) status.textContent = `✅ 已提取 (${type})`;
    showFloater();
  }

  function removeFloater() {
    if (pickerFloater) { pickerFloater.remove(); pickerFloater = null; }
    floaterMounted = false;
  }

  // ---- 高亮框 ----
  function initHighlight() {
    pickerHighlight = document.createElement('div');
    Object.assign(pickerHighlight.style, {
      position: 'fixed', pointerEvents: 'none', zIndex: '2147483646',
      border: '2px solid #f08c00', background: 'rgba(240,140,0,0.08)',
      borderRadius: '4px', transition: 'all 0.05s', display: 'none',
    });
    pickerHighlight.id = '__lh_hl';
    document.body.appendChild(pickerHighlight);
  }

  function removeHighlight() {
    if (pickerHighlight) { pickerHighlight.remove(); pickerHighlight = null; }
  }

  // ---- 事件处理 ----
  function onMove(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el.id?.startsWith('__lh_')) return;
    pickerTarget = el;
    const rect = el.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    if (pickerHighlight) {
      Object.assign(pickerHighlight.style, {
        display: 'block', left: rect.left + 'px', top: rect.top + 'px',
        width: rect.width + 'px', height: rect.height + 'px',
      });
    }
    const status = document.getElementById('__lh_status');
    if (status) {
      const text = (axureText(el) || '').substring(0, 40).replace(/\n/g, ' ');
      status.textContent = `<${el.tagName.toLowerCase()}> ${text}`;
    }
  }

  function onClick(e) {
    if (!pickerTarget) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const el = pickerTarget;
    let md = '', type = 'text';

    // 尝试提取表格
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
    if (!md && el) {
      for (const sel of ['.ax_default.table_cell', '.ax_default._形状1']) {
        const cells = el.querySelectorAll(sel);
        if (cells.length >= 4) {
          const table = buildTable(cells);
          if (table) { md = mdTable(table); type = 'table'; break; }
        }
      }
    }
    if (!md) { md = axureText(el) || el.innerText.trim(); type = 'text'; }

    setFloaterContent(md, type);
  }

  function onKey(e) {
    if (e.key === 'Escape') deactivatePicker();
  }

  // ---- 激活/停用 ----
  function activatePicker() {
    if (pickerActive) return;
    pickerActive = true;

    initHighlight();
    mountFloater();
    showFloater();

    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey, true);

    document.body.style.cursor = 'crosshair';
    document.body.style.userSelect = 'none';

    console.log('[蓝湖提取器] 拾取模式已激活');
  }

  function deactivatePicker() {
    if (!pickerActive) return;
    pickerActive = false;

    document.removeEventListener('mousemove', onMove, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKey, true);

    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    removeHighlight();
    removeFloater();
    pickerTarget = null;

    console.log('[蓝湖提取器] 拾取模式已退出');
  }

  // ==================== 页面提取 ====================

  function extractTableCells(root) {
    const results = [];
    const allCells = root.querySelectorAll('.ax_default.table_cell');
    if (allCells.length < 4) return results;

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
        const prev = container.previousElementSibling;
        const heading = prev ? axureText(prev) : '';
        results.push({
          type: 'table',
          heading: heading && heading.length < 100 ? heading : `数据表 ${results.length + 1}`,
          rows: table.rows, cols: table.cols,
          markdown: `### ${heading && heading.length < 100 ? heading : `数据表 ${results.length + 1}`}\n\n${mdTable(table)}`,
        });
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
      if (!isVisible(s)) return;
      const text = axureText(s);
      if (!text) return;
      let p = s.parentElement;
      while (p && p !== root && p !== root.body) {
        if (['ax_default', 'panel_state_content', 'panel_state'].some(c => p.classList.contains(c)) || p.id === 'base') break;
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
        results.push({ type: 'shape-grid', heading: heading || '数据区域', rows: table.rows, cols: table.cols,
          markdown: `### ${heading || '数据区域'}\n\n${mdTable(table)}` });
      }
    });
    return results;
  }

  function extractFromDocument(doc) {
    const root = doc.body || doc;
    if (!root) return { sections: [], markdown: '' };

    let sections = [];
    sections.push(...extractTableCells(root));
    sections.push(...extractShapeGrids(root));

    // 标题
    const headingSel = '.ax_default.heading_11,.ax_default.heading_21,.ax_default._二级标题1,' +
      '.ax_default._三级标题,.ax_default.label,.ax_default.label1,h1,h2,h3,h4,h5,h6';
    const seen = new Set();
    root.querySelectorAll(headingSel).forEach(el => {
      if (!isVisible(el)) return;
      const t = axureText(el);
      if (!t || seen.has(t) || t.length < 2) return;
      seen.add(t);
      let level = '##';
      if (el.classList.contains('_三级标题')) level = '####';
      else if (el.classList.contains('_二级标题1') || el.classList.contains('heading_21')) level = '###';
      else if (el.classList.contains('heading_11')) level = '##';
      sections.push({ type: 'heading', markdown: `${level} ${t}` });
    });

    // 复选框
    const cbs = [];
    root.querySelectorAll('.ax_default.checkbox').forEach(cb => {
      if (!isVisible(cb)) return;
      const t = axureText(cb);
      if (t) cbs.push(t);
    });
    if (cbs.length > 0) sections.push({ type: 'checkbox', markdown: `## 选项\n\n${cbs.map(t => `- [ ] ${t}`).join('\n')}` });

    // 构建 Markdown
    const title = doc.title || '未知页面';
    const lines = [`# ${title}`, '', `**提取时间**: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`, '', '---', ''];
    const seenMd = new Set();
    sections.forEach(s => {
      if (!s.markdown || seenMd.has(s.markdown)) return;
      seenMd.add(s.markdown);
      lines.push(s.markdown); lines.push('');
    });
    return { sections, markdown: lines.join('\n') };
  }

  function fullExtract() {
    const main = extractFromDocument(document);
    return { frame: FRAME_CTX, isAxureContent: !!document.querySelector('.ax_default'),
      pages: [{ frame: FRAME_CTX, title: document.title, sections: main.sections, markdown: main.markdown }],
      combinedMarkdown: main.markdown };
  }

  function simpleExtract() {
    const result = extractFromDocument(document);
    return { frame: FRAME_CTX, isAxureContent: !!document.querySelector('.ax_default'),
      pages: [{ frame: FRAME_CTX, title: document.title, sections: result.sections, markdown: result.markdown }],
      combinedMarkdown: result.markdown };
  }

  function getDiagnostics() {
    return { frame: FRAME_CTX, title: document.title,
      tableCells: document.querySelectorAll('.ax_default.table_cell').length,
      shapes: document.querySelectorAll('.ax_default._形状1').length,
      widgets: document.querySelectorAll('.ax_default').length };
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
