/**
 * 蓝湖 Axure 需求提取器 — 内容脚本
 * 运行在 lanhuapp.com 的所有 frame 中 (all_frames: true)
 *
 * 职责：
 * 1. 检测当前 frame 是否包含 Axure 原型内容
 * 2. 提取表格和需求文本
 * 3. 通过 chrome.runtime.sendMessage 响应 popup 的请求
 */

(() => {
  'use strict';

  /** 判断当前页面是否可能是 Axure 原型内容 */
  function isAxureContent() {
    const hints = [
      document.querySelector('frameset'),
      document.querySelector('[class*="axure"]'),
      document.querySelector('[id*="axure"]'),
      document.querySelector('[class*="prototype"]'),
      document.querySelector('[id*="prototype"]'),
      // Axure 生成的页面通常在 body 上有 data-* 标记
      document.querySelector('[data-page]'),
      document.querySelector('[data-gen-guid]'),
      // Axure 常用 class 前缀
      ...document.querySelectorAll('[class*="ax_"], [id*="ax_"]'),
    ];
    const hintCount = hints.filter(Boolean).length;

    // 或者页面中有表格，也值得提取
    const hasTables = document.querySelectorAll('table').length > 0;
    const hasVisibleText = document.body && document.body.innerText.trim().length > 50;

    return hintCount > 0 || (hasTables && hasVisibleText);
  }

  /** 获取当前 frame 的上下文标识 */
  function getFrameContext() {
    try {
      if (window.top === window.self) return 'top';
      // 尝试判断父页面是否是 lanhu
      const parentHost = window.parent.location.hostname;
      if (parentHost.includes('lanhuapp')) return 'lanhu-iframe';
      return 'unknown-iframe';
    } catch {
      // 跨域 iframe — 拿不到父页面信息
      return 'cross-origin-iframe';
    }
  }

  /**
   * 将 HTML table 转换为 Markdown 表格
   */
  function tableToMarkdown(table) {
    const rows = table.querySelectorAll('tr');
    if (rows.length === 0) return '';

    const mdRows = [];
    let headerRow = null;

    rows.forEach((row, rowIdx) => {
      const cells = row.querySelectorAll('th, td');
      const cellTexts = Array.from(cells).map(cell =>
        cell.innerText.trim().replace(/\n/g, ' ')
      );

      if (rowIdx === 0) {
        // 第一行作为表头（无论 th 还是 td）
        headerRow = cellTexts;
        mdRows.push(`| ${cellTexts.join(' | ')} |`);
        mdRows.push(`| ${cellTexts.map(() => '---').join(' | ')} |`);
      } else {
        mdRows.push(`| ${cellTexts.join(' | ')} |`);
      }
    });

    return mdRows.join('\n');
  }

  /**
   * 尝试提取 div 模拟的表格（Axure 常用手法）
   * 检测具有表格特征的 div 布局：等宽重复子元素 + 网格排列
   */
  function extractDivTables(container) {
    const results = [];

    // 找潜在的表格容器：包含多个直接子元素，且子元素结构相似
    const potentialContainers = container.querySelectorAll(
      'div[class*="grid"], div[class*="table"], div[class*="list"], div[class*="row"]'
    );

    potentialContainers.forEach(div => {
      const children = div.children;
      if (children.length < 2) return;

      // 检查子元素是否结构相似（都有相似数量的内部 div/span）
      const childStructures = Array.from(children).map(child =>
        child.querySelectorAll('div, span, p').length
      );
      const isUniform = childStructures.every(
        (n, i, arr) => Math.abs(n - arr[0]) <= 2
      );

      if (isUniform && childStructures[0] >= 1) {
        // 尝试提取为表格
        const rows = Array.from(children).map(child => {
          const items = child.querySelectorAll('div, span, p');
          return Array.from(items)
            .map(el => el.innerText.trim())
            .filter(t => t.length > 0);
        });

        // 只保留有数据的行
        const validRows = rows.filter(r => r.length > 0);
        if (validRows.length >= 2) {
          // 统一列数 — 用最多的列数
          const maxCols = Math.max(...validRows.map(r => r.length));
          const normalized = validRows.map(r => {
            while (r.length < maxCols) r.push('');
            return r;
          });

          const mdRows = [];
          normalized.forEach((row, idx) => {
            mdRows.push(`| ${row.join(' | ')} |`);
            if (idx === 0) {
              mdRows.push(`| ${row.map(() => '---').join(' | ')} |`);
            }
          });

          results.push(mdRows.join('\n'));
        }
      }
    });

    return results;
  }

  /**
   * 提取页面中所有有意义的内容区域
   * 返回结构化的 Section 数组
   */
  function extractContent() {
    const sections = [];
    const container = document.body;

    if (!container) return sections;

    // ---- 1. 提取所有 HTML 表格 ----
    const tables = container.querySelectorAll('table');
    tables.forEach((table, idx) => {
      // 跳过太小的表格（可能只是布局用途）
      const rows = table.querySelectorAll('tr');
      if (rows.length < 2) return;

      const md = tableToMarkdown(table);
      if (md) {
        // 尝试找表格上方的标题
        const prev = table.previousElementSibling;
        const heading = prev && ['H1','H2','H3','H4','H5','H6','P','DIV'].includes(prev.tagName)
          ? prev.innerText.trim()
          : `表格 ${idx + 1}`;

        sections.push({
          type: 'table',
          heading,
          markdown: `### ${heading}\n\n${md}`,
          rawHtml: table.outerHTML.substring(0, 500),
        });
      }
    });

    // ---- 2. 提取 div 模拟表格 ----
    const divTableMds = extractDivTables(container);
    divTableMds.forEach((md, idx) => {
      sections.push({
        type: 'table',
        heading: `数据表格 ${idx + 1}`,
        markdown: `### 数据表格 ${idx + 1}\n\n${md}`,
      });
    });

    // ---- 3. 提取标题 + 正文段落 ----
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const seenTexts = new Set();

    headings.forEach(h => {
      const text = h.innerText.trim();
      if (!text || seenTexts.has(text) || text.length < 2) return;
      seenTexts.add(text);

      // 找标题后面的段落（到下一个标题为止）
      const followingParagraphs = [];
      let next = h.nextElementSibling;
      while (next && !/^H[1-6]$/.test(next.tagName)) {
        if (next.tagName === 'P' || next.tagName === 'DIV' || next.tagName === 'LI') {
          const pText = next.innerText.trim();
          if (pText.length > 10) {
            followingParagraphs.push(pText);
          }
        }
        next = next.nextElementSibling;
      }

      if (followingParagraphs.length > 0) {
        sections.push({
          type: 'text',
          heading: text,
          markdown: `## ${text}\n\n${followingParagraphs.join('\n\n')}`,
        });
      } else {
        sections.push({
          type: 'heading',
          heading: text,
          markdown: `## ${text}`,
        });
      }
    });

    // ---- 4. 提取页面中其他可见文本区块 ----
    // 找大的文本 block（段落、ul/ol 列表等）
    const paragraphs = container.querySelectorAll('p, li');
    const paraTexts = Array.from(paragraphs)
      .map(p => p.innerText.trim())
      .filter(t => t.length > 20);

    if (paraTexts.length > 0 && sections.length === 0) {
      // 没有结构化的标题和表格，就整体作为文本输出
      sections.push({
        type: 'text',
        heading: '页面内容',
        markdown: paraTexts.join('\n\n'),
      });
    }

    // ---- 5. 提取注释/标注（蓝湖特有的标注功能） ----
    const annotations = container.querySelectorAll(
      '[class*="annotation"], [class*="comment"], [class*="note"], [class*="remark"], [data-type="annotation"]'
    );
    if (annotations.length > 0) {
      const annotationTexts = Array.from(annotations)
        .map(a => a.innerText.trim())
        .filter(t => t.length > 5);
      if (annotationTexts.length > 0) {
        sections.push({
          type: 'annotation',
          heading: '页面标注/注释',
          markdown: `## 页面标注/注释\n\n${annotationTexts.join('\n\n---\n\n')}`,
        });
      }
    }

    return sections;
  }

  /**
   * 汇总所有 sections 为完整 Markdown 文档
   */
  function buildMarkdown(sections, pageInfo) {
    const lines = [];
    const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });

    lines.push(`# 蓝湖 Axure 原型需求提取`);
    lines.push(``);
    lines.push(`**页面标题**: ${pageInfo.title}`);
    lines.push(`**页面地址**: ${pageInfo.url}`);
    lines.push(`**提取时间**: ${now}`);
    lines.push(`**提取位置**: ${pageInfo.frame}`);
    lines.push(``);
    lines.push(`---`);
    lines.push(``);

    if (sections.length === 0) {
      lines.push(`*未检测到表格或结构化需求内容。*`);
      lines.push(``);
      lines.push(`页面可见文本摘要：`);
      lines.push(``);
      lines.push(`> ${document.body?.innerText?.trim()?.substring(0, 1000) || '(空)'}`);
    } else {
      sections.forEach(s => {
        lines.push(s.markdown);
        lines.push(``);
      });
    }

    return lines.join('\n');
  }

  /**
   * 主提取函数 — 被 popup 调用
   */
  function extractAll() {
    const context = getFrameContext();
    const isAxure = isAxureContent();

    const content = extractContent();

    // 如果 content 为空但看起来是 Axure 页面，至少提取可见文本
    if (content.length === 0 && document.body) {
      const text = document.body.innerText.trim();
      if (text.length > 20) {
        content.push({
          type: 'text',
          heading: '页面原文',
          markdown: text.substring(0, 30000),
        });
      }
    }

    return {
      isAxureContent: isAxure,
      frame: context,
      title: document.title || '未知页面',
      url: window.location.href,
      sections: content,
      markdown: buildMarkdown(content, {
        title: document.title || '未知页面',
        url: window.location.href,
        frame: context,
      }),
    };
  }

  // ---- 监听来自 popup / background 的消息 ----
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extract-axure') {
      // 是否只从顶层 frame 收集？（默认收集所有 frame）
      if (request.frameOnly === 'top' && window.top !== window.self) {
        sendResponse({ status: 'skip', frame: getFrameContext() });
        return;
      }

      const result = extractAll();
      // 标记这个 frame 的序号（如果页面有多个 frame）
      result.frameIndex = request.frameIndex || 0;

      if (result.sections.length > 0 || result.isAxureContent) {
        sendResponse({ status: 'ok', data: result });
      } else {
        sendResponse({ status: 'empty', frame: getFrameContext() });
      }
    }

    if (request.action === 'ping') {
      sendResponse({ pong: true, frame: getFrameContext() });
    }

    return true; // 保持消息通道开放
  });

  console.log('[蓝湖提取器] 内容脚本已加载 — frame:', getFrameContext());
})();
