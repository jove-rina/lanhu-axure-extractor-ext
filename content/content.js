/**
 * 蓝湖 Axure 需求提取器 — 内容脚本
 * 运行在 lanhuapp.com 的所有 frame 中 (all_frames: true)
 *
 * 支持：
 * - 全页自动扫描：提取表格/文本/组件
 * - 拾取模式：鼠标悬停高亮，点击提取
 * - Axure div 表格识别（基于 getBoundingClientRect 行列推断）
 */

(() => {
  'use strict';

  const FRAME_CTX = getFrameContext();
  console.log(`[蓝湖提取器] 已加载 — frame: ${FRAME_CTX}`);

  // ---- 拾取模式状态 ----
  let pickerActive = false;
  let pickerHighlight = null;
  let pickerOverlay = null;
  let pickerTarget = null;
  let onPickerClickHandler = null;
  let onPickerMoveHandler = null;
  let onPickerKeyHandler = null;

  // ==================== 工具函数 ====================

  function getFrameContext() {
    try {
      if (window.top === window.self) return 'top';
      const parentHost = window.parent.location.hostname;
      return parentHost.includes('lanhuapp') ? 'lanhu-iframe' : 'unknown-iframe';
    } catch { return 'cross-origin-iframe'; }
  }

  function axureText(el) {
    // Axure 文本在 <div class="text"> 或 <div id="uXX_text"> 中
    if (!el) return '';
    const textDiv = el.querySelector('.text, [id$="_text"]');
    if (textDiv) return textDiv.innerText.trim();
    return el.innerText.trim();
  }

  function isVisible(el) {
    if (!el || !el.getBoundingClientRect) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function escapeMd(text) {
    return text.replace(/\|/g, '\\|').replace(/\n/g, ' ');
  }

  // ==================== Axure 表格提取（核心！） ====================

  /**
   * Axure 表格检测：
   * 找含有 table_cell 子元素的容器 → 用 getBoundingClientRect 推断行列
   */
  function findAxureTables(root) {
    const results = [];
    root = root || document;

    // 1. 找直接包含 table_cell 的容器
    const tableContainers = root.querySelectorAll(':scope > .ax_default > .ax_default.table_cell, :scope > .ax_default.table_cell');
    
    // 更好的方式：找所有 table_cell 的父容器
    const allCells = root.querySelectorAll('.ax_default.table_cell');
    const containerMap = new Map();

    allCells.forEach(cell => {
      if (!isVisible(cell)) return;
      let parent = cell.parentElement;
      while (parent && parent !== root && parent !== root.body) {
        if (parent.classList.contains('ax_default') || parent.id === 'base') break;
        parent = parent.parentElement;
      }
      if (!parent) parent = cell.parentElement;

      if (!containerMap.has(parent)) containerMap.set(parent, []);
      containerMap.get(parent).push(cell);
    });

    containerMap.forEach((cells, container) => {
      if (cells.length < 2) return;

      // 用 getBoundingClientRect 获取每个 cell 的位置
      const cellRects = cells.map(cell => {
        const rect = cell.getBoundingClientRect();
        return {
          el: cell,
          text: axureText(cell),
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          w: Math.round(rect.width),
          h: Math.round(rect.height),
        };
      }).filter(c => c.text.length > 0 || c.w > 10);

      if (cellRects.length < 2) return;

      // 按 Y 分组（行），容差 5px
      const rows = [];
      const yTolerance = 5;
      cellRects.sort((a, b) => a.y - b.y);

      cellRects.forEach(c => {
        let found = false;
        for (const row of rows) {
          if (Math.abs(row.y - c.y) <= yTolerance) {
            row.cells.push(c);
            row.y = Math.min(row.y, c.y);
            found = true;
            break;
          }
        }
        if (!found) {
          rows.push({ y: c.y, cells: [c] });
        }
      });

      // 每行内按 X 排序
      rows.forEach(row => row.cells.sort((a, b) => a.x - b.x));

      // 检查是否真的是表格（至少2行2列）
      if (rows.length < 2) return;
      const colCounts = rows.map(r => r.cells.length);
      const maxCols = Math.max(...colCounts);
      if (maxCols < 2) return;

      // 构建 Markdown 表格
      const mdRows = [];
      rows.forEach((row, rowIdx) => {
        const texts = row.cells.map(c => escapeMd(c.text));
        // 补齐缺失的列
        while (texts.length < maxCols) texts.push('');
        mdRows.push(`| ${texts.join(' | ')} |`);
        if (rowIdx === 0) {
          mdRows.push(`| ${texts.map(() => '---').join(' | ')} |`);
        }
      });

      const md = mdRows.join('\n');

      // 获取表格前面的标题/注释
      const prev = container.previousElementSibling;
      const heading = prev ? axureText(prev) : '';
      const title = heading && heading.length < 50
        ? heading
        : `字段表`;

      results.push({
        type: 'axure-table',
        heading: title,
        rows: rows.length,
        cols: maxCols,
        markdown: `### ${title}\n\n${md}`,
        text: rows.map(r => r.cells.map(c => c.text).join(' | ')).join('; ').substring(0, 200),
      });
    });

    return results;
  }

  /** 从任意元素提取 Axure 表格（用于拾取模式） */
  function extractAxureTableFromElement(el) {
    // 如果 el 本身就是表格容器或 table_cell
    if (el.classList.contains('ax_default') && el.querySelector('.ax_default.table_cell')) {
      return findAxureTables(el);
    }
    if (el.classList.contains('table_cell')) {
      // 从父容器提取
      const parent = el.closest('.ax_default') || el.parentElement;
      return findAxureTables(parent);
    }
    // 检查 el 内部是否包含表格
    const innerTables = el.querySelectorAll('.ax_default.table_cell');
    if (innerTables.length >= 4) {
      const parent = innerTables[0].closest('.ax_default') || innerTables[0].parentElement;
      if (parent) return findAxureTables(parent);
    }
    return [];
  }

  // ==================== 通用内容提取 ====================

  /** 从 document 提取所有结构化内容 */
  function extractFromDocument(doc) {
    const sections = [];
    const root = doc.body || doc;
    if (!root) return { sections: [], markdown: '' };

    // 1. Axure 表格
    const axeTables = findAxureTables(root);
    axeTables.forEach(t => sections.push(t));

    // 2. 真正的 HTML <table>（备用）
    const htmlTables = root.querySelectorAll('table');
    htmlTables.forEach((table, idx) => {
      const rows = table.querySelectorAll('tr');
      if (rows.length < 2) return;
      const mdRows = [];
      rows.forEach((row, ri) => {
        const cells = row.querySelectorAll('th, td');
        const texts = Array.from(cells).map(c => escapeMd(c.innerText.trim()));
        mdRows.push(`| ${texts.join(' | ')} |`);
        if (ri === 0) mdRows.push(`| ${texts.map(() => '---').join(' | ')} |`);
      });
      const md = mdRows.join('\n');
      sections.push({
        type: 'html-table',
        heading: `表格 ${idx + 1}`,
        markdown: `### 表格 ${idx + 1}\n\n${md}`,
      });
    });

    // 3. 标题 (heading_11 / h1-h6)
    const headings = root.querySelectorAll('.ax_default.heading_11, h1, h2, h3, h4, h5, h6, [class*="heading"]');
    const seenTexts = new Set();
    headings.forEach(h => {
      const text = axureText(h) || h.innerText.trim();
      if (!text || seenTexts.has(text) || text.length < 2) return;
      seenTexts.add(text);

      const following = [];
      let next = h.nextElementSibling;
      let guard = 0;
      while (next && !/^H[1-6]$/.test(next.tagName) && !next.classList.contains('heading_11') && guard < 5) {
        const t = axureText(next) || next.innerText.trim();
        if (t.length > 10) following.push(t);
        next = next.nextElementSibling;
        guard++;
      }

      sections.push({
        type: 'heading',
        heading: text,
        markdown: following.length > 0 ? `## ${text}\n\n${following.join('\n\n')}` : `## ${text}`,
      });
    });

    // 4. 复选框 (checkbox)
    const checkboxes = root.querySelectorAll('.ax_default.checkbox, [class*="checkbox"]');
    if (checkboxes.length > 0) {
      const items = Array.from(checkboxes)
        .map(cb => axureText(cb))
        .filter(t => t.length > 0);
      if (items.length > 0) {
        sections.push({
          type: 'checkbox',
          heading: '选项',
          markdown: `## 选项\n\n${items.map(t => `- [ ] ${t}`).join('\n')}`,
        });
      }
    }

    // 5. 段落/文本块 (paragraph1 / shape)
    const paras = root.querySelectorAll('.ax_default.paragraph1, .ax_default.shape');
    const paraTexts = Array.from(paras)
      .map(p => axureText(p))
      .filter(t => t.length > 15);

    if (paraTexts.length > 0 && sections.filter(s => s.type !== 'axure-table').length === 0) {
      sections.push({
        type: 'text',
        heading: '说明',
        markdown: paraTexts.join('\n\n'),
      });
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

  // ==================== 拾取模式 ====================

  function createPickerUI() {
    pickerHighlight = document.createElement('div');
    pickerHighlight.id = '__lh_picker_h';
    Object.assign(pickerHighlight.style, {
      position: 'fixed', pointerEvents: 'none', zIndex: '2147483646',
      border: '2px solid #f08c00', background: 'rgba(240, 140, 0, 0.08)',
      borderRadius: '4px', transition: 'all 0.05s ease', display: 'none',
    });
    document.body.appendChild(pickerHighlight);

    pickerOverlay = document.createElement('div');
    pickerOverlay.id = '__lh_picker_o';
    Object.assign(pickerOverlay.style, {
      position: 'fixed', pointerEvents: 'none', zIndex: '2147483647',
      background: '#f08c00', color: '#fff', fontSize: '11px',
      padding: '2px 8px', borderRadius: '3px', fontFamily: 'monospace',
      whiteSpace: 'nowrap', display: 'none',
    });
    document.body.appendChild(pickerOverlay);
  }

  function removePickerUI() {
    if (pickerHighlight) { pickerHighlight.remove(); pickerHighlight = null; }
    if (pickerOverlay) { pickerOverlay.remove(); pickerOverlay = null; }
  }

  function onPickerMove(e) {
    // 用 elementFromPoint + 忽略我们的 UI 元素
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === pickerHighlight || el === pickerOverlay ||
        el.id === '__lh_picker_h' || el.id === '__lh_picker_o') {
      return;
    }

    pickerTarget = el;
    const rect = el.getBoundingClientRect();
    if (!rect || rect.width === 0) return;

    if (pickerHighlight) {
      pickerHighlight.style.display = 'block';
      pickerHighlight.style.left = rect.left + 'px';
      pickerHighlight.style.top = rect.top + 'px';
      pickerHighlight.style.width = rect.width + 'px';
      pickerHighlight.style.height = rect.height + 'px';
    }

    if (pickerOverlay) {
      const tag = el.tagName.toLowerCase();
      const id = el.id ? `#${el.id}` : '';
      const cls = Array.from(el.classList).slice(0, 3).join('.');
      const text = (axureText(el) || el.innerText || '').substring(0, 50).replace(/\n/g, ' ');
      pickerOverlay.textContent = `<${tag}${id ? '#'+id : ''}> ${text}`;

      let top = rect.top - 24;
      if (top < 0) top = rect.bottom + 4;
      pickerOverlay.style.left = rect.left + 'px';
      pickerOverlay.style.top = top + 'px';
      pickerOverlay.style.display = 'block';
    }
  }

  function onPickerClick(e) {
    if (!pickerTarget) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const el = pickerTarget;
    let result = null;

    // 1. 尝试以 Axure 表格提取
    const tables = extractAxureTableFromElement(el);
    if (tables.length > 0) {
      result = tables[0];
    }

    // 2. 如果没提取到表格，用通用方式
    if (!result) {
      const text = axureText(el) || el.innerText.trim();
      const tag = el.tagName.toLowerCase();

      if (el.classList.contains('table_cell')) {
        // 单个单元格没意义，提取整个表格
        const parent = el.closest('.ax_default');
        if (parent) {
          const parentTables = extractAxureTableFromElement(parent);
          if (parentTables.length > 0) result = parentTables[0];
        }
      }

      if (!result) {
        result = {
          type: tag === 'table' ? 'html-table' : 'text',
          heading: text.substring(0, 40),
          markdown: text,
          text: text.substring(0, 200),
        };
      }
    }

    const selector = getElementSelector(el);
    deactivatePicker();

    // 发送结果
    chrome.runtime.sendMessage({
      action: 'picker-result',
      data: {
        markdown: result.markdown,
        type: result.type,
        text: result.text,
        selector: selector,
        tag: el.tagName.toLowerCase(),
        id: el.id || '',
        classes: Array.from(el.classList).join('.'),
      },
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

    // 使用捕获阶段确保优先处理
    onPickerMoveHandler = (e) => onPickerMove(e);
    onPickerClickHandler = (e) => onPickerClick(e);
    onPickerKeyHandler = (e) => onPickerKey(e);

    document.addEventListener('mousemove', onPickerMoveHandler, true);
    document.addEventListener('click', onPickerClickHandler, true);
    document.addEventListener('keydown', onPickerKeyHandler, true);

    document.body.style.cursor = 'crosshair';
    document.body.style.userSelect = 'none';

    console.log('[蓝湖提取器] 拾取模式已激活');
  }

  function deactivatePicker() {
    if (!pickerActive) return;
    pickerActive = false;

    if (onPickerMoveHandler) document.removeEventListener('mousemove', onPickerMoveHandler, true);
    if (onPickerClickHandler) document.removeEventListener('click', onPickerClickHandler, true);
    if (onPickerKeyHandler) document.removeEventListener('keydown', onPickerKeyHandler, true);

    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    removePickerUI();
    pickerTarget = null;
    console.log('[蓝湖提取器] 拾取模式已退出');
  }

  function getElementSelector(el) {
    const parts = [];
    let cur = el;
    while (cur && cur !== document.body && cur !== document.documentElement) {
      const tag = cur.tagName.toLowerCase();
      let sel = tag;
      if (cur.id) { sel = '#' + cur.id; parts.unshift(sel); break; }
      const cls = Array.from(cur.classList).filter(c => !c.startsWith('__lh_')).slice(0, 2);
      if (cls.length) sel += '.' + cls.join('.');
      const parent = cur.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(c => c.tagName === cur.tagName);
        if (siblings.length > 1) {
          const idx = siblings.indexOf(cur) + 1;
          sel += `:nth-child(${idx})`;
        }
      }
      parts.unshift(sel);
      cur = cur.parentElement;
    }
    return parts.join(' > ');
  }

  // ==================== 页面提取 API ====================

  function fullExtract() {
    const main = extractFromDocument(document);
    return {
      frame: FRAME_CTX,
      isAxureContent: isAxureContent(),
      pages: [{ frame: FRAME_CTX, title: document.title, sections: main.sections, markdown: main.markdown }],
      combinedMarkdown: main.markdown,
    };
  }

  function simpleExtract() {
    const result = extractFromDocument(document);
    return {
      frame: FRAME_CTX,
      isAxureContent: isAxureContent(),
      pages: [{ frame: FRAME_CTX, title: document.title, sections: result.sections, markdown: result.markdown }],
      combinedMarkdown: result.markdown,
    };
  }

  function isAxureContent() {
    return !!(
      document.querySelector('frameset') ||
      document.querySelector('[class*="axure" i]') ||
      document.querySelector('[id*="axure" i]') ||
      document.querySelector('[data-gen-guid]') ||
      document.querySelector('.ax_default') ||
      /axure/i.test(document.querySelector('meta[name="generator"]')?.content || '')
    );
  }

  function getDiagnostics() {
    return {
      frame: FRAME_CTX,
      isAxure: isAxureContent(),
      title: document.title,
      bodySize: document.body?.innerText?.length || 0,
      tableCells: document.querySelectorAll('.ax_default.table_cell').length,
      axureWidgets: document.querySelectorAll('.ax_default').length,
    };
  }

  // ==================== 消息处理 ====================

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
      case 'extract-axure':
        if (FRAME_CTX === 'top') sendResponse({ status: 'ok', data: fullExtract() });
        else sendResponse({ status: 'ok', data: simpleExtract() });
        break;
      case 'ping':
        sendResponse({ pong: true, frame: FRAME_CTX });
        break;
      case 'diagnose-me':
        sendResponse({ status: 'ok', data: getDiagnostics() });
        break;
      case 'start-picker':
        activatePicker();
        sendResponse({ status: 'ok' });
        break;
      case 'stop-picker':
        deactivatePicker();
        sendResponse({ status: 'ok' });
        break;
    }
    return true;
  });

})();
