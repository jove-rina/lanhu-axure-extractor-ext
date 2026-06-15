/**
 * 蓝湖 Axure 需求提取器 — 后台服务脚本
 *
 * 职责：
 * 1. 管理标签页状态
 * 2. 协调多个 frame 的提取结果
 * 3. 触发 Markdown 文件下载
 */

// 临时存储提取结果（每次提取会替换）
let lastExtractResult = null;

/**
 * 向指定标签页的所有 frame 广播提取请求
 * 并汇总结果
 */
async function extractFromAllFrames(tabId) {
  // 先向主 frame 发请求，获取所有 frame 信息
  const frames = await chrome.webNavigation.getAllFrames({ tabId });

  if (!frames || frames.length === 0) {
    // fallback: 直接向主 frame 发请求
    return extractFromSingleFrame(tabId, 0);
  }

  // 向每个 frame 发送提取请求
  const promises = frames.map(async (frame, idx) => {
    try {
      return await chrome.tabs.sendMessage(tabId, {
        action: 'extract-axure',
        frameIndex: idx,
      }, { frameId: frame.frameId });
    } catch (err) {
      return { status: 'error', error: err.message, frameId: frame.frameId };
    }
  });

  const allResults = await Promise.all(promises);

  // 过滤出有内容的 response
  const validResults = allResults.filter(
    r => r && r.status === 'ok' && r.data && r.data.sections && r.data.sections.length > 0
  );

  // 汇总
  const combined = {
    timestamp: new Date().toISOString(),
    totalFrames: frames.length,
    extractedFrames: validResults.length,
    pages: validResults.map(r => r.data),
    combinedMarkdown: '',
  };

  // 合并 Markdown
  const mdParts = [];
  if (validResults.length === 0) {
    // 没有 frame 返回数据，尝试单 frame 提取
    const fallback = await extractFromSingleFrame(tabId, 0);
    return fallback;
  }

  validResults.forEach((r, idx) => {
    if (idx > 0) {
      mdParts.push('---');
      mdParts.push('');
      mdParts.push(`# ${r.data.title}`);
      mdParts.push('');
    }
    mdParts.push(r.data.markdown);
  });

  combined.combinedMarkdown = mdParts.join('\n');

  // 如果只有一个有意义的结果，就用它
  if (validResults.length === 1) {
    combined.combinedMarkdown = validResults[0].data.markdown;
  }

  lastExtractResult = combined;
  return combined;
}

/**
 * 只从主 frame（或指定 frame）提取
 */
async function extractFromSingleFrame(tabId, frameIndex = 0) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      action: 'extract-axure',
      frameOnly: 'top',
      frameIndex,
    });

    if (response && response.status === 'ok') {
      const result = {
        timestamp: new Date().toISOString(),
        totalFrames: 1,
        extractedFrames: 1,
        pages: [response.data],
        combinedMarkdown: response.data.markdown,
      };
      lastExtractResult = result;
      return result;
    }

    return {
      timestamp: new Date().toISOString(),
      totalFrames: 1,
      extractedFrames: 0,
      pages: [],
      combinedMarkdown: [
        '# 蓝湖 Axure 需求提取',
        '',
        '*当前页面未检测到可提取的表格或需求内容。*',
        '',
        '请确认：',
        '1. 当前页是否为 Axure 原型页面',
        '2. 页面是否已完全加载',
        '3. 如果是 iframe 中的内容可能需要点击进入再提取',
      ].join('\n'),
    };
  } catch (err) {
    // 内容脚本可能还没加载
    return {
      timestamp: new Date().toISOString(),
      error: true,
      message: '内容脚本未响应。请刷新页面后重试。',
      detail: err.message,
      combinedMarkdown: '# 错误\n\n内容脚本未能响应。请刷新页面后再次点击插件图标。',
    };
  }
}

/**
 * 触发 Markdown 文件下载
 */
function downloadMarkdown(content, filename = '') {
  if (!content) {
    return { error: '没有可下载的内容，请先提取' };
  }

  const defaultName = `蓝湖需求_${new Date().toISOString().slice(0, 10)}.md`;
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  chrome.downloads.download({
    url,
    filename: filename || defaultName,
    saveAs: true,
  });

  return { success: true, filename: filename || defaultName };
}

// ---- 消息监听 ----
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const tabId = request.tabId || sender.tab?.id;

  switch (request.action) {
    case 'extract':
      if (!tabId) {
        sendResponse({ error: '无法获取当前标签页' });
        return;
      }
      // 异步，记得保持通道
      extractFromAllFrames(tabId).then(sendResponse);
      return true; // async

    case 'download':
      const result = downloadMarkdown(request.content, request.filename);
      sendResponse(result);
      return;

    case 'get-last-result':
      sendResponse({ data: lastExtractResult });
      return;

    case 'get-tab-info':
      if (!tabId) {
        sendResponse({ error: 'no tab' });
        return;
      }
      chrome.tabs.get(tabId, tab => {
        sendResponse({
          url: tab.url,
          title: tab.title,
          id: tab.id,
        });
      });
      return true; // async
  }
});

console.log('[蓝湖提取器] 后台服务已启动');
