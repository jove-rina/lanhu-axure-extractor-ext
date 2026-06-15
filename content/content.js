/**
 * 蓝湖 Axure 需求提取器 — 内容脚本
 * 运行在 lanhuapp.com 的所有 frame 中 (all_frames: true)
 *
 * 职责：
 * 1. 检测当前 frame 是否包含 Axure 原型内容
 * 2. 提取表格和需求文本
 * 3. 顶层 frame 还会扫描所有可访问的子 iframe
 * 4. 通过 chrome.runtime.sendMessage 响应外部请求
 */

(() => {
  'use strict';

  const FRAME_CTX = getFrameContext();

  console.log(`[蓝湖提取器] 内容脚本已加载 — frame: ${FRAME_CTX}`);

  // ---- 工具函数 ----

  /** 获取当前 frame 的上下文标识 */
  function getFrameContext() {
    try {
      if (window.top === window.self) return 'top';
      const parentHost = window.parent.location.hostname;
      return parentHost.includes('lanhuapp') ? 'lanhu-iframe' : 'unknown-iframe';
    } catch {
      return 'cross-origin-iframe';
    }
  }

  /** 判断当前页面是否包含 Axure 原型内容 */
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
      // Axure 生成的页面常有 axure 相关 meta
      () => /axure/i.test(doc.querySelector('meta[name="generator"]')?.content || ''),
      // 蓝湖 Axure 页面常见标记
      () => /axure/i.test(doc.body?.className || '') || /axure/i.test(doc.body?.id || ''),
    ];
    return checks.some(fn => fn());
  }

  /** 判断页面是否在蓝湖 Axure 原型查看页 */
  function isLanhuAxurePage() {
    if (FRAME_CTX !== 'top') return false;
    const hash = location.hash || '';
    const path = location.pathname || '';
    return /axure/i.test(hash) || /axure/i.test(path);
  }

  /** 尝试从指定 document 中提取 frame 列表 */
  function getAccessibleIframes(doc) {
    doc = doc || document;
    const result = [];
    try {
      const iframes = doc.querySelectorAll('iframe');
      iframes.forEach((f, i) => {
        try {
          const iDoc = f.contentDocument || f.contentWindow?.document;
          const status = f.src ? 'loaded' : 'empty';
          result.push({
            index: i,
            src: f.src || '(inline)',
            width: f.width || 'auto',
            height: f.height || 'auto',
            accessible: !!iDoc,
            title: f.title || '',
            id: f.id || '',
            readyState: iDoc ? (iDoc.readyState || 'unknown') : 'blocked',
          });
        } catch {
          result.push({
            index: i,
            src: f.src || '(inline)',
            accessible: false,
            title: f.title || '',
            id: f.id || '',
          });
        }
      });
    } catch (e) {
      console.warn('[蓝湖提取器] 扫描 iframe 失败:', e);
    }
    return result;
  }

  /** 尝试从可访问的 iframe 中提取内容 */
  function extractFromFrames(doc) {
    doc = doc || document;
    const results = [];

    try {
      const iframes = doc.querySelectorAll('iframe');
      iframes.forEach((f, i) => {
        try {
          const iDoc = f.contentDocument || f.contentWindow?.document;
          if (!iDoc) return;

          // 尝试在这个 iframe 中提取 Axure 内容
          if (isAxureContent(iDoc)) {
            const frameResult = extractFromDocument(iDoc);
            if (frameResult && frameResult.sections.length > 0) {
              results.push({
                frameIndex: i,
                title: iDoc.title || f.title || `iframe-${i}`,
                src: f.src || '',
                sections: frameResult.sections,
                markdown: frameResult.markdown,
              });
            }
          }
        } catch {
          // 跨域 iframe 或未加载完成
        }
      });
    } catch (e) {
      console.warn('[蓝湖提取器] iframe 内容提取失败:', e);
    }

    return results;
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
      const isUniform = structures.every(
        (n, i, arr) => Math.abs(n - arr[0]) <= 2
      );

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

  // ---- 核心提取 ----

  /**
   * 从指定 document 中提取表格和文本内容
   */
  function extractFromDocument(doc) {
    const sections = [];
    const container = doc.body;
    if (!container) return { sections: [], markdown: '' };

    // 1. 提取 HTML 表格
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
        sections.push({
          type: 'table',
          heading,
          markdown: `### ${heading}\n\n${md}`,
        });
      }
    });

    // 2. 提取 div 模拟表格
    const divTables = extractDivTables(container);
    divTables.forEach((md, idx) => {
      sections.push({
        type: 'table',
        heading: `数据表格 ${idx + 1}`,
        markdown: `### 数据表格 ${idx + 1}\n\n${md}`,
      });
    });

    // 3. 提取标题 + 正文
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
        sections.push({
          type: 'text',
          heading: text,
          markdown: `## ${text}\n\n${following.join('\n\n')}`,
        });
      } else {
        sections.push({ type: 'heading', heading: text, markdown: `## ${text}` });
      }
    });

    // 4. 提取标注/注释
    const annotations = container.querySelectorAll(
      '[class*="annotation"], [class*="comment"], [class*="note"], [class*="remark"]'
    );
    if (annotations.length > 0) {
      const texts = Array.from(annotations).map(a => a.innerText.trim()).filter(t => t.length > 5);
      if (texts.length > 0) {
        sections.push({
          type: 'annotation',
          heading: '页面标注/注释',
          markdown: `## 页面标注/注释\n\n${texts.join('\n\n---\n\n')}`,
        });
      }
    }

    // 5. 如果没有结构化的内容，把所有可见文本拿出来
    if (sections.length === 0 && container.innerText) {
      const text = container.innerText.trim();
      if (text.length > 50) {
        sections.push({
          type: 'text',
          heading: '页面原文',
          markdown: text.substring(0, 30000),
        });
      }
    }

    // 构建 Markdown
    const title = doc.title || '未知页面';
    const url = doc.URL || location.href;
    const lines = [
      `# ${title}`,
      ``,
      `**页面**: ${url}`,
      `**提取时间**: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`,
      ``,
      `---`,
      ``,
    ];
    sections.forEach(s => {
      lines.push(s.markdown);
      lines.push(``);
    });

    return { sections, markdown: lines.join('\n') };
  }

  /**
   * 顶层 frame 的完整提取流程：
   * 1. 提取主页面内容
   * 2. 扫描所有可访问的 iframe
   * 3. 提取 iframe 中的内容
   * 4. 汇总返回
   */
  function fullExtract() {
    const pages = [];

    // 提取主页面
    const main = extractFromDocument(document);
    const isAxure = isAxureContent(document);
    const iframes = getAccessibleIframes(document);

    const mainPage = {
      frame: FRAME_CTX,
      frameIndex: 0,
      title: document.title || '主页面',
      url: location.href,
      isAxureContent: isAxure,
      sections: main.sections,
      markdown: main.markdown,
    };
    pages.push(mainPage);

    // 提取 iframe 内容
    const frameResults = extractFromFrames(document);
    frameResults.forEach(fr => {
      pages.push({
        frame: 'sub-iframe',
        frameIndex: fr.frameIndex + 1,
        title: fr.title,
        url: fr.src,
        isAxureContent: true,
        sections: fr.sections,
        markdown: fr.markdown,
      });
    });

    // 合并 Markdown
    let combined = '';
    const titleParts = [];
    pages.forEach((p, idx) => {
      if (idx > 0) {
        combined += `\n\n---\n\n`;
      }
      combined += p.markdown;
      titleParts.push(p.title);
    });

    return {
      frame: FRAME_CTX,
      isAxureContent: isAxure || frameResults.length > 0,
      iframesFound: iframes,
      iframesExtracted: frameResults.length,
      pages: pages,
      combinedMarkdown: combined,
      allTitles: titleParts.join(' | '),
    };
  }

  /**
   * 非顶层 frame 的简单提取
   */
  function simpleExtract() {
    const result = extractFromDocument(document);
    return {
      frame: FRAME_CTX,
      isAxureContent: isAxureContent(document),
      iframesFound: [],
      iframesExtracted: 0,
      pages: [{
        frame: FRAME_CTX,
        frameIndex: 0,
        title: document.title || '子页面',
        url: location.href,
        isAxureContent: isAxureContent(document),
        sections: result.sections,
        markdown: result.markdown,
      }],
      combinedMarkdown: result.markdown,
      allTitles: document.title,
    };
  }

  // ---- 诊断信息 ----
  function getDiagnostics() {
    const iframes = getAccessibleIframes(document);
    return {
      frame: FRAME_CTX,
      url: location.href,
      title: document.title,
      bodySize: document.body?.innerText?.length || 0,
      tableCount: document.querySelectorAll('table').length,
      isAxure: isAxureContent(document),
      isLanhuAxurePage: isLanhuAxurePage(),
      iframes: iframes,
      contentScriptLoaded: true,
    };
  }

  // ---- 消息处理 ----

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
      case 'extract-axure': {
        if (FRAME_CTX === 'top') {
          sendResponse({ status: 'ok', data: fullExtract() });
        } else {
          sendResponse({ status: 'ok', data: simpleExtract() });
        }
        break;
      }

      case 'ping':
        sendResponse({ pong: true, frame: FRAME_CTX });
        break;

      case 'diagnose':
        sendResponse({ status: 'ok', data: getDiagnostics() });
        break;
    }

    return true;
  });

})();
