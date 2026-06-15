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
  let selectionLocked = false; // 点击选择后锁定高亮，hover 不覆盖

  // ---- 文档构建器 — 模块管理 ----

  let modules = [];           // { id, title, contents: [] }
  let nextModuleId = 1;
  let activePickField = null; // { moduleId, entryIdx?, field: 'title'|'content' }
  let pickMode = false;

  // ---- 浮动面板 ----

  const HTML = `
<div id="__lh_f" style="all:initial;position:fixed;z-index:2147483647;bottom:20px;right:20px;
  width:440px;max-height:70vh;background:#1a1b1e;border:1px solid #373a40;border-radius:8px;
  box-shadow:0 8px 32px rgba(0,0,0,0.5);font:13px -apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;
  color:#c1c2c5;display:none;flex-direction:column;overflow:hidden;">
  <div id="__lh_f_h" style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;
    background:#25262b;border-bottom:1px solid #373a40;cursor:move;user-select:none;">
    <span style="color:#f08c00;font-weight:600;font-size:13px;">📄 文档构建</span>
    <button id="__lh_f_x" style="background:transparent;color:#909296;border:1px solid #373a40;border-radius:4px;padding:2px 10px;font-size:12px;cursor:pointer;">✕</button>
  </div>
  <div id="__lh_f_tb" style="display:flex;gap:6px;padding:8px 14px;border-bottom:1px solid #25262b;">
    <button id="__lh_f_add" style="background:#f08c00;color:#fff;border:none;border-radius:4px;padding:4px 12px;font-size:12px;cursor:pointer;">➕ 新增模块</button>
  </div>
  <div id="__lh_f_list" style="flex:1;overflow-y:auto;padding:6px 10px;min-height:100px;"></div>
  <div id="__lh_f_ft" style="display:flex;gap:6px;padding:8px 14px;border-top:1px solid #25262b;">
    <button id="__lh_f_preview" style="background:#2b8a3e;color:#fff;border:none;border-radius:4px;padding:4px 14px;font-size:12px;cursor:pointer;">📖 预览</button>
    <button id="__lh_f_download" style="background:#1971c2;color:#fff;border:none;border-radius:4px;padding:4px 14px;font-size:12px;cursor:pointer;">💾 下载</button>
    <span id="__lh_f_status" style="flex:1;text-align:right;font-size:11px;color:#5c5f66;line-height:24px;"></span>
  </div>
</div>`;

  let createdByMe = false;

  // ---- 模块管理 ----

  function addModule() {
    const m = { id: nextModuleId++, title: '', contents: [] };
    modules.push(m);
    renderModuleList();
    setStatus(`模块 ${modules.length} 个`);
  }

  function removeModule(id) {
    modules = modules.filter(m => m.id !== id);
    renderModuleList();
    setStatus(`模块 ${modules.length} 个`);
  }

  function moveModule(id, dir) {
    const idx = modules.findIndex(m => m.id === id);
    if (idx < 0) return;
    const to = idx + dir;
    if (to < 0 || to >= modules.length) return;
    [modules[idx], modules[to]] = [modules[to], modules[idx]];
    renderModuleList();
  }

  function setModuleField(id, field, val) {
    const m = modules.find(x => x.id === id);
    if (m) m[field] = val;
  }

  // ---- 内容条目管理 ----
  function addContentEntry(moduleId) {
    const m = modules.find(x => x.id === moduleId);
    if (m) { m.contents.push(''); renderModuleList(); }
  }

  function removeContentEntry(moduleId, entryIdx) {
    const m = modules.find(x => x.id === moduleId);
    if (m) { m.contents.splice(entryIdx, 1); renderModuleList(); }
  }

  function moveContentEntry(moduleId, entryIdx, dir) {
    const m = modules.find(x => x.id === moduleId);
    if (!m) return;
    const to = entryIdx + dir;
    if (to < 0 || to >= m.contents.length) return;
    [m.contents[entryIdx], m.contents[to]] = [m.contents[to], m.contents[entryIdx]];
    renderModuleList();
  }

  function setContentEntry(moduleId, entryIdx, val) {
    const m = modules.find(x => x.id === moduleId);
    if (m && m.contents[entryIdx] !== undefined) m.contents[entryIdx] = val;
  }

  function getFullMarkdown() {
    return modules.map((m) => {
      const parts = [];
      if (m.title) parts.push(`# ${m.title}`);
      m.contents.forEach(c => { if (c) parts.push(c); });
      return parts.join('\n\n');
    }).filter(Boolean).join('\n\n---\n\n');
  }

  // ---- 渲染模块列表 ----

  function renderModuleList() {
    const list = document.getElementById('__lh_f_list');
    if (!list) return;
    if (modules.length === 0) {
      list.innerHTML = '<div style="text-align:center;padding:30px 0;color:#5c5f66;font-size:13px;">点击「➕ 新增模块」开始构建文档</div>';
      return;
    }
    list.innerHTML = modules.map((m, mi) => `
<div style="background:#25262b;border:1px solid #373a40;border-radius:8px;margin-bottom:10px;overflow:hidden;">
  <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#2c2e33;border-bottom:1px solid #373a40;">
    <span style="color:#f08c00;font-size:13px;font-weight:600;">📄 ${escHtml(m.title) || `模块 ${mi + 1}`}</span>
    <div style="display:flex;gap:4px;">
      <button data-preview="${m.id}" title="预览本模块" style="background:#2b8a3e;color:#fff;border:none;border-radius:4px;padding:2px 10px;font-size:11px;cursor:pointer;">📖 预览</button>
      <button data-mv="${m.id}" data-dir="-1" title="上移模块" style="background:#373a40;color:#909296;border:none;border-radius:4px;padding:2px 8px;font-size:11px;cursor:pointer;" ${mi === 0 ? 'disabled style="opacity:0.3;cursor:default;"' : ''}>↑</button>
      <button data-mv="${m.id}" data-dir="1" title="下移模块" style="background:#373a40;color:#909296;border:none;border-radius:4px;padding:2px 8px;font-size:11px;cursor:pointer;" ${mi === modules.length - 1 ? 'disabled style="opacity:0.3;cursor:default;"' : ''}>↓</button>
      <button data-rm="${m.id}" title="删除模块" style="background:transparent;color:#e03131;border:1px solid #e03131;border-radius:4px;padding:2px 8px;font-size:11px;cursor:pointer;">✕</button>
    </div>
  </div>
  <div style="padding:10px 14px 8px;">
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;">
      <span style="font-size:12px;color:#909296;font-weight:500;white-space:nowrap;">📝 标题</span>
      <div style="flex:1;display:flex;align-items:center;background:#1a1b1e;border:1px solid #373a40;border-radius:6px;padding:2px 4px 2px 10px;">
        <input id="__lh_mt_${m.id}" value="${escHtml(m.title)}" placeholder="点击 🎯 从页面拾取" style="flex:1;background:transparent;border:none;padding:6px 0;font-size:13px;color:#e0e0e0;outline:none;">
        <button data-pick="${m.id}:title" title="从页面拾取标题" style="background:#f08c00;color:#fff;border:none;border-radius:4px;padding:5px 10px;font-size:11px;cursor:pointer;white-space:nowrap;">🎯 拾取</button>
      </div>
    </div>
    <div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
        <span style="font-size:12px;color:#909296;font-weight:500;">📋 内容条目 <span style="color:#5c5f66;font-weight:400;">(${m.contents.length})</span></span>
        <button data-addc="${m.id}" title="新增空白条目" style="background:#2b8a3e;color:#fff;border:none;border-radius:4px;padding:3px 12px;font-size:11px;cursor:pointer;">➕ 新增条目</button>
      </div>
      ${m.contents.length === 0 ? '<div style="font-size:12px;color:#5c5f66;padding:12px 0;text-align:center;background:#1a1b1e;border-radius:6px;">暂无内容，点击 🎯 拾取页面元素</div>' :
        m.contents.map((c, ci) => {
          const preview = c ? renderMarkdown(c).replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim().slice(0, 80) : '';
          return `
    <div style="background:#1a1b1e;border:1px solid #373a40;border-radius:6px;margin-bottom:6px;overflow:hidden;">
      <div style="display:flex;align-items:flex-start;gap:4px;padding:6px 8px;">
        <div style="flex:1;min-width:0;">
          ${preview ? `<div style="font-size:11px;color:#909296;padding:4px 6px;background:#25262b;border-radius:4px;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escHtml(c.slice(0,200))}">${escHtml(preview)}</div>` : ''}
          <textarea id="__lh_mc_${m.id}_${ci}" rows="1" placeholder="内容 ${ci+1}" style="width:100%;background:transparent;border:none;padding:4px 6px;font-size:12px;color:#c1c2c5;outline:none;resize:vertical;font-family:inherit;line-height:1.5;min-height:28px;">${escHtml(c)}</textarea>
        </div>
        <div style="display:flex;gap:2px;flex-shrink:0;">
          <button data-pick="${m.id}:content:${ci}" title="拾取覆盖本条" style="background:#f08c00;color:#fff;border:none;border-radius:4px;padding:4px 7px;font-size:11px;cursor:pointer;">🎯</button>
          <button data-mvc="${m.id}:${ci}:-1" title="上移" style="background:#373a40;color:#909296;border:none;border-radius:4px;padding:4px 6px;font-size:11px;cursor:pointer;" ${ci === 0 ? 'disabled style="opacity:0.3;cursor:default;"' : ''}>↑</button>
          <button data-mvc="${m.id}:${ci}:1" title="下移" style="background:#373a40;color:#909296;border:none;border-radius:4px;padding:4px 6px;font-size:11px;cursor:pointer;" ${ci === m.contents.length - 1 ? 'disabled style="opacity:0.3;cursor:default;"' : ''}>↓</button>
          <button data-rmc="${m.id}:${ci}" title="删除" style="background:transparent;color:#e03131;border:1px solid #e03131;border-radius:4px;padding:4px 6px;font-size:11px;cursor:pointer;">✕</button>
        </div>
      </div>
    </div>`}).join('')}
    </div>
  </div>
</div>`).join('');

    // 绑定事件
    list.querySelectorAll('[data-pick]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const parts = btn.dataset.pick.split(':');
        const mid = parseInt(parts[0]), field = parts[1];
        const entryIdx = parts[2] !== undefined ? parseInt(parts[2]) : undefined;
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
        if (!md) { setStatus('⚠️ 该模块无内容'); return; }
        openPreviewWindow(m.title || `模块预览`, md);
      });
    });

    // 输入框实时同步
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
    setStatus(`🎯 持续拾取中 — 点击页面元素，${field === 'title' ? '替换标题' : '追加内容'}`);
    document.body.style.cursor = 'crosshair';
    document.body.style.userSelect = 'none';

    // 清除所有高亮，点亮当前拾取目标
    document.querySelectorAll('[id^="__lh_mt_"],[id^="__lh_mc_"]').forEach(el => el.style.borderColor = '#373a40');
    const targetId = field === 'title' ? `__lh_mt_${mId}` : `__lh_mc_${mId}_${entryIdx}`;
    const inp = document.getElementById(targetId);
    if (inp) inp.style.borderColor = '#f08c00';

    hideHighlight();
    selectionLocked = false;
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
    setStatus(`✅ 已拾取 — 继续拾取将覆盖当前${field === 'title' ? '标题' : '条目'}`);
    hideHighlight();
    document.body.style.cursor = 'crosshair';
    document.body.style.userSelect = 'none';
  }

  function cancelPick() {
    if (!activePickField) return;
    const { moduleId, field } = activePickField;
    const inp = document.getElementById(field === 'title' ? `__lh_mt_${moduleId}` : `__lh_mc_${moduleId}`);
    if (inp) inp.style.borderColor = '#373a40';
    activePickField = null;
    pickMode = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    setStatus('');
  }

  // ---- 预览 ----

  let previewWindow = null;

  function openPreviewWindow(title, md) {
    if (previewWindow && !previewWindow.closed) {
      try { previewWindow.close(); } catch {}
    }
    previewWindow = window.open('', '_blank', 'width=900,height=700');
    if (!previewWindow) { setStatus('⚠️ 请允许弹出窗口'); return; }
    const html = renderMarkdown(md);
    previewWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#1a1b1e;color:#c1c2c5;font:15px -apple-system,BlinkMacSystemFont,'PingFang SC','Noto Sans SC',sans-serif;padding:40px;max-width:800px;margin:auto;line-height:1.8}
h1,h2,h3,h4{color:#f08c00;font-weight:600;margin:24px 0 12px}
h1{border-bottom:1px solid #373a40;padding-bottom:8px;font-size:24px}
h2{font-size:20px}h3{font-size:17px}
table{border-collapse:collapse;width:100%;margin:12px 0;font-size:14px}
th,td{border:1px solid #373a40;padding:8px 12px;text-align:left}
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
  }

  function showPreview() {
    const md = getFullMarkdown();
    if (!md) { setStatus('⚠️ 暂无内容'); return; }
    openPreviewWindow('文档预览', md);
    setStatus('✅ 预览已打开');
  }

  // ---- 浮动面板创建 ----

  function createFloater() {
    if (document.getElementById('__lh_f')) {
      floater = document.getElementById('__lh_f');
      return;
    }
    createdByMe = true;
    const d = document.createElement('div');
    d.innerHTML = HTML;
    document.body.appendChild(d.firstElementChild);
    floater = document.getElementById('__lh_f');

    // 关闭
    document.getElementById('__lh_f_x')?.addEventListener('click', (e) => { e.stopPropagation(); deactivate(); });

    // 新增模块
    document.getElementById('__lh_f_add')?.addEventListener('click', (e) => { e.stopPropagation(); addModule(); });

    // 预览
    document.getElementById('__lh_f_preview')?.addEventListener('click', (e) => { e.stopPropagation(); showPreview(); });

    // 下载
    document.getElementById('__lh_f_download')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const md = getFullMarkdown();
      if (!md) { setStatus('⚠️ 暂无内容'); return; }
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `文档_${new Date().toISOString().slice(0, 10)}.md`;
      a.click();
      setStatus('✅ 已下载');
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

    renderModuleList();
  }

  function showFloater() { if (floater) floater.style.display = 'flex'; }
  function hideFloater() { if (floater) floater.style.display = 'none'; }
  function removeFloater() { if (floater) { floater.remove(); floater = null; } }

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
        const cells = line.split('|').slice(1, -1).map(c => c.trim());
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
    setStatus(`🎯 ${bc} (${navIndex + 1}/${navPath.length})`);

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
      setStatus('⚠️ 容器无内容');
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
    console.log('[蓝湖] mousedown → 页面点击，清除选择');
    hideHighlight();
    selectionLocked = false;
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
        setStatus('⚠️ 未选中有效元素');
        return;
      }

      // 拾取模式：提取元素填入当前字段
      if (pickMode && activePickField) {
        console.log('[蓝湖] pickMode click, activePickField:', activePickField, 'el:', el.tagName);
        const container = findContainer(el);
        const target = container.el || el;
        console.log('[蓝湖] pick target:', target.tagName);
        const result = extractFromEl(target);
        console.log('[蓝湖] extract result:', result?.type, result?.markdown?.slice(0, 60));
        if (result.markdown) {
          finishPick(result.markdown);
          hideHighlight();
          console.log('[蓝湖] finishPick done');
        } else {
          setStatus('⚠️ 所选区域无内容');
        }
        return;
      }

      // 构建完整 DOM 路径（用于高亮定位）
      navPath = buildPath(el);
      console.log('[蓝湖提取器] navPath:', navPath.map(e => e.tagName+'.'+(e.className||'')).join(' > '), 'length:', navPath.length);
      if (navPath.length < 2) {
        setStatus('⚠️ 无法构建元素路径');
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

  // ---- 接收 iframe 消息 ----
  function setupMessageListener() {
    window.addEventListener('message', (e) => {
      if (e.data && e.data.type === '__lh_picker_result' && e.data.markdown) {
        console.log('[蓝湖] msg 收到, pickMode:', pickMode, 'activePickField:', activePickField?.field);
        if (pickMode && activePickField) {
          finishPick(e.data.markdown);
        }
        updateNavButtonsFromData(e.data);
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
    removeFloater();
    isDragging = false;

    // 清理导航状态
    navPath = [];
    navIndex = -1;
    currentSelectedEl = null;
    selectionLocked = false;

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
      case 'open-builder': activate(); sendResponse({status:'ok'}); break;
    }
    return true;
  });

})();
