/**
 * 蓝湖 Axure 需求提取器 — 内容脚本 v2.2
 *
 * 拾取模式改为框选（拖拽选择区域），支持跨 iframe。
 * 只在顶层 frame 显示浮动面板，iframe 中的选择结果通过 postMessage 传回。
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
    const td = el.closest('[id$="_text"]') || el.querySelector('.text, [id$="_text"]');
    if (td && td.innerText.trim()) return td.innerText.trim();
    return el.innerText.trim();
  }

  function escapeMd(t) { return (t || '').replace(/\|/g, '\\|').replace(/\n/g, ' '); }

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
    const lines = [];
    table.rowData.forEach((cells, idx) => {
      const texts = cells.map(t => escapeMd(t));
      lines.push(`| ${texts.join(' | ')} |`);
      if (idx === 0) lines.push(`| ${texts.map(() => '---').join(' | ')} |`);
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

  let selStartX = 0, selStartY = 0, selEndX = 0, selEndY = 0;
  let isDragging = false;

  // ---- 浮动面板 ----

  const HTML = `
<div id="__lh_f" style="all:initial;position:fixed;z-index:2147483647;bottom:20px;right:20px;
  width:420px;max-height:500px;background:#1a1b1e;border:1px solid #373a40;border-radius:8px;
  box-shadow:0 8px 32px rgba(0,0,0,0.5);font:13px -apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;
  color:#c1c2c5;display:none;flex-direction:column;overflow:hidden;">
  <div id="__lh_f_h" style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;
    background:#25262b;border-bottom:1px solid #373a40;cursor:move;user-select:none;">
    <span style="color:#f08c00;font-weight:600;font-size:13px;">🎯 拾取</span>
    <div style="display:flex;gap:4px;">
      <button id="__lh_f_cp" style="background:#2b8a3e;color:#fff;border:none;border-radius:4px;padding:4px 10px;font-size:12px;cursor:pointer;">📋</button>
      <button id="__lh_f_dl" style="background:#f08c00;color:#fff;border:none;border-radius:4px;padding:4px 10px;font-size:12px;cursor:pointer;">💾</button>
      <button id="__lh_f_x" style="background:transparent;color:#909296;border:1px solid #373a40;border-radius:4px;padding:4px 10px;font-size:12px;cursor:pointer;">✕</button>
    </div>
  </div>
  <div id="__lh_f_b" style="padding:12px;overflow-y:auto;max-height:380px;white-space:pre-wrap;font-size:12px;line-height:1.6;color:#909296;"></div>
  <div style="padding:6px 14px;background:#25262b;border-top:1px solid #373a40;font-size:11px;color:#5c5f66;
    display:flex;justify-content:space-between;">
    <span id="__lh_f_s">点击元素精准拾取，或拖拽框选区域提取</span>
    <span>ESC 退出</span>
  </div>
</div>`;

  function createFloater() {
    if (document.getElementById('__lh_f')) return;
    const d = document.createElement('div');
    d.innerHTML = HTML;
    document.body.appendChild(d.firstElementChild);
    floater = document.getElementById('__lh_f');

    // 按钮
    document.getElementById('__lh_f_x')?.addEventListener('click', (e) => { e.stopPropagation(); deactivate(); });
    document.getElementById('__lh_f_cp')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const b = document.getElementById('__lh_f_b');
      if (b && b.textContent) navigator.clipboard.writeText(b.textContent).then(() => setStatus('✅ 已复制'));
    });
    document.getElementById('__lh_f_dl')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const b = document.getElementById('__lh_f_b');
      if (!b || !b.textContent) return;
      const blob = new Blob([b.textContent], { type: 'text/markdown' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `拾取_${Date.now()}.md`;
      a.click();
    });

    // 拖拽
    const h = document.getElementById('__lh_f_h');
    if (h) {
      h.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'BUTTON') return;
        const r = floater.getBoundingClientRect();
        const dx = e.clientX - r.left, dy = e.clientY - r.top;
        floater.style.bottom = 'auto'; floater.style.right = 'auto';
        floater.style.left = r.left + 'px'; floater.style.top = r.top + 'px';
        const mv = (ev) => { floater.style.left = (ev.clientX - dx) + 'px'; floater.style.top = (ev.clientY - dy) + 'px'; };
        const up = () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); };
        document.addEventListener('mousemove', mv);
        document.addEventListener('mouseup', up);
      });
    }
  }

  function showFloater() { if (floater) floater.style.display = 'flex'; }
  function hideFloater() { if (floater) floater.style.display = 'none'; }
  function removeFloater() { if (floater) { floater.remove(); floater = null; } }

  function setContent(md, type) {
    const b = document.getElementById('__lh_f_b');
    const s = document.getElementById('__lh_f_s');
    if (b) b.textContent = md;
    if (s) s.textContent = `✅ 已提取 (${type})`;
    showFloater();
  }

  function setStatus(msg) {
    const s = document.getElementById('__lh_f_s');
    if (s) s.textContent = msg;
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

  function removeRubber() { if (rubber) { rubber.remove(); rubber = null; } }

  // ==================== 智能容器定位 ====================

  function findContainer(el) {
    let current = el;
    for (let depth = 0; current && depth < 20; depth++) {
      if (current === document.body || current === document.documentElement) break;
      if (current.classList?.contains('ax_default')) return { el: current, depth };
      if (current.classList?.contains('panel_state') || current.classList?.contains('panel_state_content')) return { el: current, depth };
      if (/^u\d+/.test(current.id || '') && current.children?.length >= 3) return { el: current, depth };
      const axChildren = current.querySelectorAll(':scope > .ax_default');
      if (axChildren.length >= 3) return { el: current, depth };
      current = current.parentElement;
    }
    return { el: el.parentElement || el, depth: -1 };
  }

  function getBreadcrumb(el) {
    const parts = [];
    let current = el;
    for (let i = 0; current && i < 6; i++) {
      const tag = (current.tagName || '').toLowerCase();
      const id = current.id ? `#${current.id}` : '';
      const cls = current.className && typeof current.className === 'string'
        ? '.' + current.className.split(/\s+/).filter(Boolean).slice(0, 1).join('.')
        : '';
      parts.unshift(`${tag}${id}${cls}`);
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
    const text = el.innerText ? el.innerText.trim() : '';
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

  // ---- 点击升级 (Click Escalation) ----
  let escalation = { target: null, time: 0, current: null };

  // ---- 事件 ----
  function onMouseDown(e) {
    if (e.button !== 0) return;
    if (e.target.closest && e.target.closest('#__lh_f')) return;
    hideHighlight();
    e.preventDefault();
    isDragging = true;
    selStartX = selEndX = e.clientX;
    selStartY = selEndY = e.clientY;
    createRubber();
    updateRubber(selStartX, selStartY, selEndX, selEndY);
    setStatus('拖拽选择区域...');
  }

  function onMouseMove(e) {
    if (isDragging) {
      selEndX = e.clientX;
      selEndY = e.clientY;
      updateRubber(selStartX, selStartY, selEndX, selEndY);
      return;
    }
    if (!active) return;
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

    // ---- 智能定位点击（拖动距离 < 15px） ----
    if (dragDist < 15) {
      const el = document.elementFromPoint(selEndX, selEndY);
      if (!el || el.id?.startsWith('__lh_')) {
        hideHighlight();
        setStatus('⚠️ 未选中有效元素');
        return;
      }

      const now = Date.now();
      const isRecent = (now - escalation.time) < 2500;

      // 点击升级：同一位置附近再点 → 往上移一级
      if (isRecent && escalation.current && escalation.current !== document.body) {
        const parent = escalation.current.parentElement;
        if (parent && parent !== document.body && parent !== document.documentElement) {
          escalation.current = parent;
          escalation.time = now;
          const result = extractFromEl(parent);
          const bc = getBreadcrumb(parent);
          setStatus(`🔼 升级至容器 (${bc})`);
          if (result.markdown) {
            if (FRAME_CTX !== 'top') {
              try { window.top.postMessage({ type: '__lh_picker_result', markdown: result.markdown, sourceType: result.type }, '*'); } catch {}
            } else { setContent(result.markdown, result.type); }
          } else { setStatus('⚠️ 容器无内容'); }
          return;
        }
        setStatus('⚠️ 已到最顶层容器');
        return;
      }

      // 首次点击：智能定位容器
      const { el: container } = findContainer(el);
      escalation.target = el;
      escalation.current = container;
      escalation.time = now;

      const result = extractFromEl(container);
      const bc = getBreadcrumb(container);
      setStatus(`🎯 ${container === el ? '元素' : `容器 (${bc})`} — 再点同位置升级`);

      if (result.markdown) {
        if (FRAME_CTX !== 'top') {
          try { window.top.postMessage({ type: '__lh_picker_result', markdown: result.markdown, sourceType: result.type }, '*'); } catch {}
        } else { setContent(result.markdown, result.type); }
      } else {
        setStatus('⚠️ 所选容器无内容');
      }
      return;
    }

    // ---- 框选区域（拖动距离 >= 15px） ----
    if (area < 100) {
      setStatus('框选区域太小，请重新选择');
      return;
    }

    const result = extractFromRect(selStartX, selStartY, selEndX, selEndY);
    if (!result.markdown) {
      setStatus('⚠️ 框选区域未提取到内容');
      return;
    }

    if (FRAME_CTX !== 'top') {
      try {
        window.top.postMessage({ type: '__lh_picker_result', markdown: result.markdown, sourceType: result.type }, '*');
        setStatus('✅ 结果已发送到顶层页面');
      } catch { setStatus('⚠️ 无法发送到顶层页面'); }
      return;
    }

    setContent(result.markdown, result.type);
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') deactivate();
  }

  // ---- 接收 iframe 消息 ----
  function setupMessageListener() {
    window.addEventListener('message', (e) => {
      if (e.data && e.data.type === '__lh_picker_result' && e.data.markdown) {
        setContent(e.data.markdown, (e.data.sourceType || 'text') + ' (iframe)');
      }
    });
  }

  // ---- 激活/停用 ----

  function activate() {
    if (active) return;
    active = true;

    if (FRAME_CTX === 'top') {
      createFloater();
      showFloater();
      setupMessageListener();
    }

    createRubber();
    createHoverHighlight();
    document.addEventListener('mousedown', onMouseDown, true);
    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('mouseup', onMouseUp, true);
    document.addEventListener('keydown', onKeyDown, true);

    document.body.style.cursor = 'crosshair';
    document.body.style.userSelect = 'none';
    console.log('[蓝湖提取器] 框选模式已激活 —', FRAME_CTX);
  }

  function deactivate() {
    if (!active) return;
    active = false;

    document.removeEventListener('mousedown', onMouseDown, true);
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('mouseup', onMouseUp, true);
    document.removeEventListener('keydown', onKeyDown, true);

    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    removeRubber();
    removeHoverHighlight();
    removeFloater();
    isDragging = false;

    console.log('[蓝湖提取器] 已退出');
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
        results.push({ type:'table', heading: h && h.length<100 ? h : `数据表 ${results.length+1}`,
          markdown: `### ${h && h.length<100 ? h : `数据表 ${results.length+1}`}\n\n${mdTable(table)}` });
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
        results.push({ type:'shape-grid', heading: h||'数据区域', markdown: `### ${h||'数据区域'}\n\n${mdTable(table)}` });
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
    if (cbs.length > 0) sections.push({ type:'checkbox', markdown: `## 选项\n\n${cbs.map(t=>`- [ ] ${t}`).join('\n')}` });

    const lines = [`# ${doc.title||'未知页面'}`, '', `**提取时间**: ${new Date().toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})}`,'','---',''];
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
    }
    return true;
  });

})();
