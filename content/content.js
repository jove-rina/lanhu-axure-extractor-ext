/**
 * 蓝湖 Axure 需求提取器 — 内容脚本
 * 运行在 lanhuapp.com 的所有 frame 中 (all_frames: true)
 *
 * 职责：
 * 1. 检测当前 frame 是否包含 Axure 原型内容
 * 2. 提取表格和需求文本
 * 3. 拾取模式：鼠标悬停高亮元素，点击提取为 Markdown
 * 4. 通过 chrome.runtime.sendMessage 响应外部请求
 */

(() => {
  'use strict';

  const FRAME_CTX = getFrameContext();
  console.log(`[蓝湖提取器] 内容脚本已加载 — frame: ${FRAME_CTX}`);

  // ---- 拾取模式状态 ----
  let pickerActive = false;
  let pickerHighlight = null;
  let pickerOverlay = null;

  // ---- 工具函数 ----

  function getFrameContext() {
    try {
      if (window.top === window.self) return 'top';
      const parentHost = window.parent.location.hostname;
      return parentHost.includes('lanhuapp') ? 'lanhu-iframe' : 'unknown-iframe';
    } catch {
      return 'cross-origin-iframe';
    }
  }

  function isAxureContent(doc) {
    doc = doc || document;
    const checks = [
      () => !!doc.querySelector('frameset'),
      () => !!doc.querySelector('[class*="axure" i]'),
      () => !!doc.querySelector('[id*="axure" i]'),
      () => !!doc.querySelector('[class*="prototype" i]'),
      () => !!doc.querySelector('[id*="prototype" i]'),
      () => !!doc.querySelector('[data-gen-guid]'),
      () => !!doc.querySelector('[class*="ax_" i]'),
      () => !!doc.querySelector('[id*="ax_" i]'),
      () => /axure/i.test(doc.querySelector('meta[name="generator"]')?.content || ''),
      () => /axure/i.test(doc.body?.className || '') || /axure/i.test(doc.body?.id || ''),
    ];
    return checks.some(fn => fn());
  }

  function isLanhuAxurePage() {
    if (FRAME_CTX !== 'top') return false;
    const hash = location.hash || '';
    const path = location.pathname || '';
    return /axure/i.test(hash) || /axure/i.test(path);
  }

  // ---- HTML → Markdown 转换 ----

  function tableToMarkdown(table) {
    const rows = table.querySelectorAll('tr');
    if (rows.length === 0) return '';

    const mdRows = [];
    rows.forEach((row, rowIdx) => {
      const cells = row.querySelectorAll('th, td');
      const cellTexts = Array.from(cells).map(cell =>
        cell.innerText.trim().replace(/\s*\n\s*/g, ' ')
      );
      if (rowIdx === 0) {
        mdRows.push(`| ${cellTexts.join(' | ')} |`);
        mdRows.push(`| ${cellTexts.map(() => '---').join(' | ')} |`);
      } else {
        mdRows.push(`| ${cellTexts.join(' | ')} |`);
      }
    });
    return mdRows.join('\n');
  }

  function extractDivTables(container) {
    const results = [];
    const candidates = container.querySelectorAll(
      'div[class*="grid"], div[class*="table"], div[class*="list"], div[class*="row"]'
    );

    candidates.forEach(div => {
      const children = div.children;
      if (children.length < 2) return;

      const structures = Array.from(children).map(child =>
        child.querySelectorAll('div, span, p').length
      );
      const isUniform = structures.every((n, i, arr) => Math.abs(n - arr[0]) <= 2);

      if (isUniform && structures[0] >= 1) {
        const rows = Array.from(children).map(child => {
          const items = child.querySelectorAll('div, span, p');
          return Array.from(items).map(el => el.innerText.trim()).filter(t => t.length > 0);
        });
        const validRows = rows.filter(r => r.length > 0);
        if (validRows.length >= 2) {
          const maxCols = Math.max(...validRows.map(r => r.length));
          const normalized = validRows.map(r => {
            while (r.length < maxCols) r.push('');
            return r;
          });
          const mdRows = [];
          normalized.forEach((row, idx) => {
            mdRows.push(`| ${row.join(' | ')} |`);
            if (idx === 0) mdRows.push(`| ${row.map(() => '---').join(' | ')} |`);
          });
          results.push(mdRows.join('\n'));
        }
      }
    });
    return results;
  }

  /** 将任意 HTML 元素转换为 Markdown */
  function elementToMarkdown(el) {
    if (!el) return { markdown: '', type: 'empty', text: '' };

    const tag = el.tagName.toLowerCase();

    // 1. 表格
    if (tag === 'table') {
      const md = tableToMarkdown(el);
      if (md) {
        return { markdown: md, type: 'table', text: el.innerText.trim().substring(0, 200) };
      }
    }

    // 2. 如果元素直接包含表格（例如 div 包裹 table）
    const innerTable = el.querySelector('table');
    if (innerTable) {
      const md = tableToMarkdown(innerTable);
      if (md) {
        return { markdown: md, type: 'table', text: innerTable.innerText.trim().substring(0, 200) };
      }
    }

    // 3. 检查 div 模拟表格
    const divTableMds = extractDivTables(el);
    if (divTableMds.length > 0) {
      return { markdown: divTableMds[0], type: 'table', text: el.innerText.trim().substring(0, 200) };
    }

    // 4. 列表
    if (['ul', 'ol'].includes(tag)) {
      const items = el.querySelectorAll('li');
      const lines = Array.from(items).map((li, i) => {
        const prefix = tag === 'ol' ? `${i + 1}.` : '-';
        return `${prefix} ${li.innerText.trim()}`;
      });
      if (lines.length > 0) {
        return { markdown: lines.join('\n'), type: 'list', text: el.innerText.trim().substring(0, 200) };
      }
    }

    // 5. 代码块
    if (['code', 'pre'].includes(tag)) {
      return { markdown: '```\n' + el.innerText.trim() + '\n```', type: 'code', text: el.innerText.trim().substring(0, 200) };
    }

    // 6. 图片
    if (tag === 'img') {
      const src = el.src || '';
      const alt = el.alt || '';
      return { markdown: `![${alt}](${src})`, type: 'image', text: alt || src };
    }

    // 7. 链接
    if (tag === 'a' && el.href) {
      return { markdown: `[${el.innerText.trim()}](${el.href})`, type: 'link', text: el.innerText.trim() };
    }

    // 8. 标题
    if (/^h[1-6]$/.test(tag)) {
      const level = tag[1];
      return { markdown: `${'#'.repeat(parseInt(level))} ${el.innerText.trim()}`, type: 'heading', text: el.innerText.trim() };
    }

    // 9. 段落或普通文本块
    if (tag === 'p' || tag === 'div' || tag === 'section' || tag === 'article') {
      const text = el.innerText.trim();
      // 检测内部是否有结构化内容
      const innerHeadings = el.querySelectorAll('h1, h2, h3, h4, h5, h6');
      if (innerHeadings.length > 0) {
        // 递归提取子结构
        return extractStructuredElement(el);
      }
      if (text.length > 0) {
        return { markdown: text, type: 'text', text: text.substring(0, 200) };
      }
    }

    // 10. 默认：提取所有文本
    const text = el.innerText.trim();
    if (text.length > 0) {
      return { markdown: text, type: 'text', text: text.substring(0, 200) };
    }

    return { markdown: '', type: 'empty', text: '' };
  }

  /** 提取结构化元素（含子标题、段落、表格） */
  function extractStructuredElement(container) {
    const parts = [];
    const children = container.children;

    if (children.length === 0) {
      const text = container.innerText.trim();
      if (text) parts.push(text);
    } else {
      Array.from(children).forEach(child => {
        const result = elementToMarkdown(child);
        if (result.markdown) parts.push(result.markdown);
      });
    }

    return {
      markdown: parts.join('\n\n'),
      type: 'structured',
      text: container.innerText.trim().substring(0, 200),
    };
  }

  // ---- 拾取模式 ----

  function createPickerUI() {
    // 高亮框
    pickerHighlight = document.createElement('div');
    pickerHighlight.id = '__lh_picker_highlight__';
    Object.assign(pickerHighlight.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '2147483646',
      border: '2px solid #f08c00',
      background: 'rgba(240, 140, 0, 0.08)',
      borderRadius: '4px',
      transition: 'all 0.1s ease',
      display: 'none',
    });
    document.body.appendChild(pickerHighlight);

    // 信息标签
    pickerOverlay = document.createElement('div');
    pickerOverlay.id = '__lh_picker_overlay__';
    Object.assign(pickerOverlay.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '2147483647',
      background: '#f08c00',
      color: '#fff',
      fontSize: '11px',
      padding: '2px 8px',
      borderRadius: '3px',
      fontFamily: 'monospace',
      display: 'none',
    });
    document.body.appendChild(pickerOverlay);
  }

  function removePickerUI() {
    if (pickerHighlight) { pickerHighlight.remove(); pickerHighlight = null; }
    if (pickerOverlay) { pickerOverlay.remove(); pickerOverlay = null; }
  }

  let pickerTarget = null;

  function onPickerMouseMove(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === pickerHighlight || el === pickerOverlay || el.id?.startsWith('__lh_picker')) return;

    pickerTarget = el;
    const rect = el.getBoundingClientRect();

    if (pickerHighlight) {
      pickerHighlight.style.display = 'block';
      pickerHighlight.style.left = rect.left + 'px';
      pickerHighlight.style.top = rect.top + 'px';
      pickerHighlight.style.width = rect.width + 'px';
      pickerHighlight.style.height = rect.height + 'px';
    }

    if (pickerOverlay) {
      pickerOverlay.style.display = 'block';
      pickerOverlay.style.left = rect.left + 'px';
      pickerOverlay.style.top = (rect.top - 22) + 'px';
      const tag = el.tagName.toLowerCase();
      const id = el.id ? `#${el.id}` : '';
      const cls = Array.from(el.classList).slice(0, 2).map(c => `.${c}`).join('');
      const info = el.innerText.trim().substring(0, 40).replace(/\n/g, ' ');
      pickerOverlay.textContent = `<${tag}${id}${cls}> · ${info}`;
      if (pickerOverlay.style.top < '0') {
        pickerOverlay.style.top = (rect.bottom + 4) + 'px';
      }
    }
  }

  function onPickerClick(e) {
    if (!pickerTarget) return;
    e.preventDefault();
    e.stopPropagation();

    const result = elementToMarkdown(pickerTarget);

    // 获取选择器路径
    const path = getElementSelector(pickerTarget);

    // 关闭拾取模式
    deactivatePicker();

    // 发送结果回 popup
    chrome.runtime.sendMessage({
      action: 'picker-result',
      data: {
        markdown: result.markdown,
        type: result.type,
        text: result.text,
        selector: path,
        tag: pickerTarget.tagName.toLowerCase(),
        id: pickerTarget.id || '',
        classes: Array.from(pickerTarget.classList).join('.'),
      },
    });
  }

  function onPickerKeyDown(e) {
    if (e.key === 'Escape') {
      deactivatePicker();
      chrome.runtime.sendMessage({ action: 'picker-cancelled' });
    }
  }

  function activatePicker() {
    if (pickerActive) return;
    pickerActive = true;

    createPickerUI();

    document.addEventListener('mousemove', onPickerMouseMove, true);
    document.addEventListener('click', onPickerClick, true);
    document.addEventListener('keydown', onPickerKeyDown, true);

    // 防止页面滚动干扰
    document.body.style.cursor = 'crosshair';
    document.body.style.userSelect = 'none';

    console.log('[蓝湖提取器] 拾取模式已激活 — 悬停查看元素，点击提取，ESC 退出');
  }

  function deactivatePicker() {
    if (!pickerActive) return;
    pickerActive = false;

    document.removeEventListener('mousemove', onPickerMouseMove, true);
    document.removeEventListener('click', onPickerClick, true);
    document.removeEventListener('keydown', onPickerKeyDown, true);

    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    removePickerUI();
    pickerTarget = null;

    console.log('[蓝湖提取器] 拾取模式已退出');
  }

  /** 生成 CSS 选择器路径 */
  function getElementSelector(el) {
    if (!el || el === document.body) return 'body';
    const path = [];
    let current = el;
    while (current && current !== document.body && current !== document.documentElement) {
      const tag = current.tagName.toLowerCase();
      let selector = tag;
      if (current.id) {
        selector = `#${current.id}`;
        path.unshift(selector);
        break;
      }
      if (current.className && typeof current.className === 'string') {
        const classes = current.className.trim().split(/\s+/).filter(Boolean).slice(0, 2);
        if (classes.length > 0) selector += '.' + classes.join('.');
      }
      // 添加 nth-child
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(c => c.tagName === current.tagName);
        if (siblings.length > 1) {
          const idx = siblings.indexOf(current) + 1;
          selector += `:nth-child(${idx})`;
        }
      }
      path.unshift(selector);
      current = current.parentElement;
    }
    return path.join(' > ');
  }

  // ---- 页面内容提取 ----

  function elementToMarkdown(el) {
    if (!el) return { markdown: '', type: 'empty', text: '' };

    const tag = el.tagName.toLowerCase();

    // 1. 表格
    if (tag === 'table') {
      const md = tableToMarkdown(el);
      if (md) {
        return { markdown: `### 选中表格\n\n${md}`, type: 'table', text: el.innerText.trim().substring(0, 200) };
      }
    }

    // 2. 包含表格的元素
    const innerTable = el.querySelector('table');
    if (innerTable) {
      const md = tableToMarkdown(innerTable);
      if (md) {
        return { markdown: `### 选中内容（含表格）\n\n${md}`, type: 'table', text: innerTable.innerText.trim().substring(0, 200) };
      }
    }

    // 3. div 模拟表格
    const divTableMds = extractDivTables(el);
    if (divTableMds.length > 0) {
      return { markdown: `### 选中数据区域\n\n${divTableMds[0]}`, type: 'table', text: el.innerText.trim().substring(0, 200) };
    }

    // 4. 检查子元素中的模拟表格
    const subDivs = el.querySelectorAll('div[class*="grid"], div[class*="row"]');
    for (const div of subDivs) {
      const mds = extractDivTables(div);
      if (mds.length > 0) {
        return { markdown: `### 选中区域\n\n${mds[0]}`, type: 'table', text: div.innerText.trim().substring(0, 200) };
      }
    }

    // 5. 列表
    if (['ul', 'ol'].includes(tag)) {
      const items = el.querySelectorAll('li');
      const lines = Array.from(items).map((li, i) => {
        const prefix = tag === 'ol' ? `${i + 1}.` : '-';
        return `${prefix} ${li.innerText.trim()}`;
      });
      if (lines.length > 0) {
        return { markdown: lines.join('\n'), type: 'list', text: el.innerText.trim().substring(0, 200) };
      }
    }

    // 6. 代码
    if (['code', 'pre'].includes(tag)) {
      return { markdown: '```\n' + el.innerText.trim() + '\n```', type: 'code', text: el.innerText.trim().substring(0, 200) };
    }

    // 7. 图片
    if (tag === 'img') {
      return { markdown: `![${el.alt || ''}](${el.src || ''})`, type: 'image', text: el.alt || el.src || '' };
    }

    // 8. 结构化内容（含标题+文本）
    const headings = el.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (headings.length > 0 || el.children.length >= 2) {
      return extractStructuredElement(el);
    }

    // 9. 纯文本
    const text = el.innerText.trim();
    if (text.length > 0) {
      return { markdown: text, type: 'text', text: text.substring(0, 200) };
    }

    return { markdown: '', type: 'empty', text: '' };
  }

  function extractStructuredElement(container) {
    const parts = [];
    const children = container.children;

    if (children.length === 0) {
      const text = container.innerText.trim();
      if (text) parts.push(text);
    } else {
      Array.from(children).forEach(child => {
        const result = elementToMarkdown(child);
        if (result.markdown) parts.push(result.markdown);
      });
    }

    return {
      markdown: `### 选中内容\n\n${parts.join('\n\n')}`,
      type: 'structured',
      text: container.innerText.trim().substring(0, 200),
    };
  }

  // ---- 全页提取 ----

  function extractFromDocument(doc) {
    const sections = [];
    const container = doc.body;
    if (!container) return { sections: [], markdown: '' };

    const tables = container.querySelectorAll('table');
    tables.forEach((table, idx) => {
      const rows = table.querySelectorAll('tr');
      if (rows.length < 2) return;
      const md = tableToMarkdown(table);
      if (md) {
        const prev = table.previousElementSibling;
        const heading = prev && ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P'].includes(prev.tagName)
          ? prev.innerText.trim()
          : `表格 ${idx + 1}`;
        sections.push({ type: 'table', heading, markdown: `### ${heading}\n\n${md}` });
      }
    });

    const divTables = extractDivTables(container);
    divTables.forEach((md, idx) => {
      sections.push({ type: 'table', heading: `数据表格 ${idx + 1}`, markdown: `### 数据表格 ${idx + 1}\n\n${md}` });
    });

    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const seenTexts = new Set();
    headings.forEach(h => {
      const text = h.innerText.trim();
      if (!text || seenTexts.has(text) || text.length < 2) return;
      seenTexts.add(text);
      const following = [];
      let next = h.nextElementSibling;
      while (next && !/^H[1-6]$/.test(next.tagName)) {
        if (['P', 'DIV', 'LI'].includes(next.tagName)) {
          const pt = next.innerText.trim();
          if (pt.length > 10) following.push(pt);
        }
        next = next.nextElementSibling;
      }
      if (following.length > 0) {
        sections.push({ type: 'text', heading: text, markdown: `## ${text}\n\n${following.join('\n\n')}` });
      } else {
        sections.push({ type: 'heading', heading: text, markdown: `## ${text}` });
      }
    });

    const annotations = container.querySelectorAll('[class*="annotation"], [class*="comment"], [class*="note"], [class*="remark"]');
    if (annotations.length > 0) {
      const texts = Array.from(annotations).map(a => a.innerText.trim()).filter(t => t.length > 5);
      if (texts.length > 0) {
        sections.push({ type: 'annotation', heading: '页面标注', markdown: `## 页面标注/注释\n\n${texts.join('\n\n---\n\n')}` });
      }
    }

    if (sections.length === 0 && container.innerText) {
      const text = container.innerText.trim();
      if (text.length > 50) {
        sections.push({ type: 'text', heading: '页面原文', markdown: text.substring(0, 30000) });
      }
    }

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

  function fullExtract() {
    const main = extractFromDocument(document);
    return {
      frame: FRAME_CTX,
      isAxureContent: isAxureContent(document),
      pages: [{ frame: FRAME_CTX, title: document.title, sections: main.sections, markdown: main.markdown }],
      combinedMarkdown: main.markdown,
    };
  }

  function simpleExtract() {
    const result = extractFromDocument(document);
    return {
      frame: FRAME_CTX,
      isAxureContent: isAxureContent(document),
      pages: [{ frame: FRAME_CTX, title: document.title, sections: result.sections, markdown: result.markdown }],
      combinedMarkdown: result.markdown,
    };
  }

  function getDiagnostics() {
    return {
      frame: FRAME_CTX,
      isAxure: isAxureContent(document),
      title: document.title,
      bodySize: document.body?.innerText?.length || 0,
      tableCount: document.querySelectorAll('table').length,
    };
  }

  // ---- 消息处理 ----

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
      case 'extract-axure': {
        if (FRAME_CTX === 'top') sendResponse({ status: 'ok', data: fullExtract() });
        else sendResponse({ status: 'ok', data: simpleExtract() });
        break;
      }

      case 'ping':
        sendResponse({ pong: true, frame: FRAME_CTX });
        break;

      case 'diagnose-me':
        sendResponse({ status: 'ok', data: getDiagnostics() });
        break;

      case 'start-picker':
        activatePicker();
        sendResponse({ status: 'ok', message: '拾取模式已激活' });
        break;

      case 'stop-picker':
        deactivatePicker();
        sendResponse({ status: 'ok', message: '拾取模式已退出' });
        break;
    }
    return true;
  });

})();
