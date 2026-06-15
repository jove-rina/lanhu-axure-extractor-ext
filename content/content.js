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

  // 通知 background：此 tab 的内容脚本已重新加载，重置拾取状态
  if (FRAME_CTX === 'top') {
    chrome.runtime.sendMessage({ action: 'content-reloaded' }).catch(() => {});
  }

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
      <button id="__lh_f_ap" style="background:#373a40;color:#909296;border:none;border-radius:4px;padding:4px 8px;font-size:11px;cursor:pointer;transition:all 0.15s;">📎 追加</button>
      <button id="__lh_f_pv" style="background:#373a40;color:#909296;border:none;border-radius:4px;padding:4px 8px;font-size:11px;cursor:pointer;transition:all 0.15s;">👁</button>
      <button id="__lh_f_cp" style="background:#2b8a3e;color:#fff;border:none;border-radius:4px;padding:4px 10px;font-size:12px;cursor:pointer;">📋</button>
      <button id="__lh_f_dl" style="background:#f08c00;color:#fff;border:none;border-radius:4px;padding:4px 10px;font-size:12px;cursor:pointer;">💾</button>
      <button id="__lh_f_x" style="background:transparent;color:#909296;border:1px solid #373a40;border-radius:4px;padding:4px 10px;font-size:12px;cursor:pointer;">✕</button>
    </div>
  </div>
  <div id="__lh_f_b" style="padding:12px;overflow-y:auto;max-height:380px;white-space:pre-wrap;font-size:12px;line-height:1.6;color:#909296;"></div>
  <div id="__lh_f_img" style="display:none;padding:0 12px 12px;text-align:center;">
    <img id="__lh_f_img_src" style="max-width:100%;border-radius:4px;border:1px solid #373a40;cursor:pointer;">
    <div style="font-size:10px;color:#5c5f66;margin-top:4px;">点击图片查看原图</div>
  </div>
  <div id="__lh_f_sc_btns" style="display:flex;gap:4px;padding:4px 12px 8px;border-top:1px solid #25262b;flex-wrap:wrap;">
    <button data-sc="fullscreen" style="background:#373a40;color:#909296;border:none;border-radius:4px;padding:3px 8px;font-size:11px;cursor:pointer;">🖥 全屏</button>
    <button data-sc="fullpage" style="background:#373a40;color:#909296;border:none;border-radius:4px;padding:3px 8px;font-size:11px;cursor:pointer;">📄 整页</button>
    <button data-sc="container" style="background:#373a40;color:#909296;border:none;border-radius:4px;padding:3px 8px;font-size:11px;cursor:pointer;">🎯 容器</button>
    <button data-sc="multi" style="background:#373a40;color:#909296;border:none;border-radius:4px;padding:3px 8px;font-size:11px;cursor:pointer;">➕ 多选</button>
  </div>
  <div id="__lh_f_nav" style="display:flex;align-items:center;gap:6px;padding:3px 12px 5px;border-top:1px solid #25262b;font-size:11px;color:#909296;">
    <button id="__lh_f_up" disabled style="background:#373a40;color:#5c5f66;border:none;border-radius:4px;padding:2px 8px;font-size:11px;cursor:pointer;opacity:0.4;">↑ 上一级</button>
    <button id="__lh_f_dn" disabled style="background:#373a40;color:#5c5f66;border:none;border-radius:4px;padding:2px 8px;font-size:11px;cursor:pointer;opacity:0.4;">↓ 下一级</button>
    <span id="__lh_f_nav_info" style="font-size:10px;color:#5c5f66;flex:1;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"></span>
  </div>
  <div style="padding:6px 14px;background:#25262b;border-top:1px solid #373a40;font-size:11px;color:#5c5f66;
    display:flex;justify-content:space-between;">
    <span id="__lh_f_s">点击选择容器 · 工具栏 ↑↓ 导航 · 拖拽框选提取</span>
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

    // 追加模式切换
    const apBtn = document.getElementById('__lh_f_ap');
    if (apBtn) {
      apBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        appendMode = !appendMode;
        apBtn.style.background = appendMode ? '#f08c00' : '#373a40';
        apBtn.style.color = appendMode ? '#fff' : '#909296';
        apBtn.textContent = appendMode ? '📎 追加中' : '📎 追加';
        setStatus(appendMode ? '📎 追加模式 — 每次点击累加内容' : '追加模式已关闭');
      });
    }

    // 预览切换
    const pvBtn = document.getElementById('__lh_f_pv');
    if (pvBtn) {
      pvBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showRendered = !showRendered;
        pvBtn.style.background = showRendered ? '#f08c00' : '#373a40';
        pvBtn.style.color = showRendered ? '#fff' : '#909296';
        const b = document.getElementById('__lh_f_b');
        const s = document.getElementById('__lh_f_s');
        if (b) refreshDisplay(b, s, '');
      });
    }

    // 截图模式按钮
    document.querySelectorAll('#__lh_f_sc_btns button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const mode = btn.getAttribute('data-sc');
        // 点过的按钮高亮
        document.querySelectorAll('#__lh_f_sc_btns button').forEach(b => {
          b.style.background = b === btn ? '#f08c00' : '#373a40';
          b.style.color = b === btn ? '#fff' : '#909296';
        });
        takeScreenshot(mode);
      });
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

    // 容器导航：上一级 / 下一级
    document.getElementById('__lh_f_up')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (navIndex > 0) {
        navIndex--;
        applyNavSelection();
      }
    });
    document.getElementById('__lh_f_dn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (navIndex < navPath.length - 1) {
        navIndex++;
        applyNavSelection();
      }
    });
  }

  function showFloater() { if (floater) floater.style.display = 'flex'; }
  function hideFloater() { if (floater) floater.style.display = 'none'; }
  function removeFloater() { if (floater) { floater.remove(); floater = null; } }

  function setContent(md, type) {
    const b = document.getElementById('__lh_f_b');
    const s = document.getElementById('__lh_f_s');
    if (!b) return;
    if (appendMode && lastRawMd) {
      lastRawMd = lastRawMd + '\n\n---\n\n' + md;
    } else {
      lastRawMd = md;
    }
    refreshDisplay(b, s, type);
    showFloater();
  }

  function refreshDisplay(b, s, type) {
    if (showRendered) {
      b.innerHTML = renderMarkdown(lastRawMd);
      b.style.whiteSpace = 'normal';
    } else {
      b.textContent = lastRawMd;
      b.style.whiteSpace = 'pre-wrap';
    }
    const mode = appendMode ? ' · 追加' : '';
    const viewTag = showRendered ? '👁 预览' : '📝 源码';
    if (s) s.textContent = (type ? `✅ 已提取 (${type})` : viewTag) + mode + (type ? ` · [${viewTag}]` : '');
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

  // ==================== Markdown 渲染预览 ====================

  function renderMarkdown(md) {
    if (!md) return '';
    const lines = md.split('\n');
    const out = [];
    let inTable = false;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      line = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

      const isTable = /^\|.+\|$/.test(line.trim());
      const isSep = /^\|[\s:-]+\|$/.test(line.trim());

      if (isTable || isSep) {
        if (!inTable) {
          out.push('<table style="border-collapse:collapse;width:100%;font-size:12px;margin:6px 0;border:1px solid #373a40;">');
          inTable = true;
        }
        if (isSep) continue;
        const isHeader = i + 1 < lines.length && /^\|[\s:-]+\|$/.test(lines[i + 1].trim());
        const tag = isHeader ? 'th' : 'td';
        const head = isHeader ? 'background:#25262b;font-weight:600;color:#e0e0e0;' : '';
        const cells = line.split('|').filter(c => c.trim() !== '');
        out.push('<tr>');
        cells.forEach(c => out.push(`<${tag} style="border:1px solid #373a40;padding:4px 8px;text-align:left;${head}">${c.trim()}</${tag}>`));
        out.push('</tr>');
        continue;
      }
      if (inTable) { out.push('</table>'); inTable = false; }

      if (/^#{1,6}\s/.test(line)) {
        const lv = line.match(/^(#+)/)[1].length;
        out.push(`<h${lv} style="margin:8px 0 4px;color:#c1c2c5;font-weight:600;">${line.replace(/^#+\s*/, '')}</h${lv}>`);
      } else if (/^---+$/.test(line.trim())) {
        out.push('<hr style="border:none;border-top:1px solid #373a40;margin:8px 0;">');
      } else {
        line = line.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#e0e0e0;">$1</strong>')
                   .replace(/\*(.+?)\*/g, '<em>$1</em>')
                   .replace(/`(.+?)`/g, '<code style="background:#25262b;padding:1px 4px;border-radius:2px;font-size:11px;">$1</code>')
                   .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color:#f08c00;">$1</a>');
        out.push(`<div style="line-height:1.6;${line ? '' : 'height:0.5em;'}">${line || '&nbsp;'}</div>`);
      }
    }
    if (inTable) out.push('</table>');
    return out.join('\n');
  }

  let showRendered = false;
  let lastRawMd = '';

  // ---- 容器导航路径（替代点击升级） ----
  let navPath = [];       // 从选中元素到 body 的 DOM 路径（根下标 0，最深下标最大）
  let navIndex = -1;      // 当前选中的元素在路径中的下标

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
    fullscreen: { name: '🖥 全屏', fn: captureFullscreen },
    fullpage:   { name: '📄 整页', fn: captureFullpage },
    container:  { name: '🎯 容器', fn: captureContainer },
    multi:      { name: '➕ 多选', fn: captureMultiContainer },
  };

  async function takeScreenshot(mode) {
    const action = SC_MODES[mode];
    if (!action) { setStatus('⚠️ 未知截图模式'); return; }
    try {
      setStatus(`📷 ${action.name}···`);
      const dataUrl = await action.fn();
      const imgDiv = document.getElementById('__lh_f_img');
      const imgEl = document.getElementById('__lh_f_img_src');
      if (imgDiv && imgEl) {
        imgEl.src = dataUrl;
        imgDiv.style.display = 'block';
        imgEl.onclick = () => window.open(dataUrl, '_blank');
      }
      setStatus(`✅ ${action.name} 截图已就位`);
    } catch (e) {
      setStatus(`⚠️ ${action.name} 失败: ${e.message}`);
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
    const el = navPath[navIndex];
    if (!el) return;

    highlightEl(el);
    trackContainerRect(el);

    const bc = getBreadcrumb(el);
    const upBtn = document.getElementById('__lh_f_up');
    const dnBtn = document.getElementById('__lh_f_dn');
    const info = document.getElementById('__lh_f_nav_info');

    // 更新按钮状态
    if (upBtn) {
      upBtn.disabled = navIndex <= 0;
      upBtn.style.opacity = navIndex <= 0 ? '0.4' : '1';
      upBtn.style.color = navIndex <= 0 ? '#5c5f66' : '#c1c2c5';
    }
    if (dnBtn) {
      dnBtn.disabled = navIndex >= navPath.length - 1;
      dnBtn.style.opacity = navIndex >= navPath.length - 1 ? '0.4' : '1';
      dnBtn.style.color = navIndex >= navPath.length - 1 ? '#5c5f66' : '#c1c2c5';
    }
    if (info) {
      info.textContent = `⊞ ${bc}  (${navIndex + 1}/${navPath.length})`;
    }

    const result = extractFromEl(el);
    setStatus(`🎯 ${bc} (${navIndex + 1}/${navPath.length})`);

    if (result.markdown) {
      if (FRAME_CTX !== 'top') {
        try { window.top.postMessage({ type: '__lh_picker_result', markdown: result.markdown, sourceType: result.type }, '*'); } catch {}
      } else { setContent(result.markdown, result.type); }
    } else {
      setStatus('⚠️ 容器无内容');
    }
  }

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

    // ---- 点击元素：构建路径 + 智能定位起始容器 ----
    if (dragDist < 15) {
      const el = document.elementFromPoint(selEndX, selEndY);
      if (!el || el.id?.startsWith('__lh_')) {
        hideHighlight();
        setStatus('⚠️ 未选中有效元素');
        return;
      }

      // 构建完整 DOM 路径
      navPath = buildPath(el);
      if (navPath.length < 2) {
        setStatus('⚠️ 无法构建元素路径');
        return;
      }

      // 智能定位起始容器：优先从 findContainer 的返回在路径中找到位置
      const { el: container } = findContainer(el);
      let startIdx = navPath.indexOf(container);
      if (startIdx < 1) {
        // 如果 container 不在路径中（太靠上），从最深处往上一级
        startIdx = navPath.length - 2;
      }
      navIndex = Math.max(1, Math.min(startIdx, navPath.length - 1));

      applyNavSelection();
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

    // 清理导航状态
    navPath = [];
    navIndex = -1;

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
