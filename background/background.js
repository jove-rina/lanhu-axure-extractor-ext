/**
 * 蓝湖 Axure 需求提取器 — 后台服务脚本
 *
 * 职责：发现 tab 中所有 frame，向每个 frame 发送提取请求并汇总
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extract') {
    const tabId = request.tabId || sender.tab?.id;
    if (!tabId) {
      sendResponse({ error: '无法获取标签页 ID' });
      return;
    }
    extractAllFrames(tabId).then(sendResponse);
    return true; // async
  }

  if (request.action === 'diagnose') {
    const tabId = request.tabId || sender.tab?.id;
    if (!tabId) {
      sendResponse({ error: 'no tab' });
      return;
    }
    diagnoseAllFrames(tabId).then(sendResponse);
    return true;
  }

  if (request.action === 'ping') {
    sendResponse({ pong: true });
    return;
  }
});

/** 获取 tab 中所有 frame 并汇总提取结果 */
async function extractAllFrames(tabId) {
  const frames = await chrome.webNavigation.getAllFrames({ tabId });
  if (!frames || frames.length === 0) {
    return { error: '无法获取页面 frame 信息' };
  }

  const results = [];

  for (const frame of frames) {
    // 跳过 chrome-extension:// 等非目标 frame
    if (!frame.url || !frame.url.includes('lanhuapp.com')) continue;

    try {
      const res = await chrome.tabs.sendMessage(tabId, { action: 'extract-axure' }, { frameId: frame.frameId });
      if (res && res.status === 'ok' && res.data) {
        results.push(res.data);
      }
    } catch (e) {
      // frame 可能还没加载完内容脚本
    }
  }

  // 合并
  let tableCount = 0;
  let textCount = 0;
  let combinedMd = '';

  results.forEach((data, idx) => {
    const pages = data.pages || [];
    pages.forEach(p => {
      (p.sections || []).forEach(s => {
        if (s.type === 'table') tableCount++;
        else if (s.type === 'text' || s.type === 'heading') textCount++;
      });
    });

    if (idx > 0) combinedMd += '\n\n---\n\n';
    combinedMd += data.combinedMarkdown || '';
  });

  return {
    success: true,
    framesScanned: frames.length,
    framesResponded: results.length,
    tableCount,
    textCount,
    pages: results.flatMap(d => d.pages || []),
    combinedMarkdown: combinedMd,
  };
}

/** 诊断：从每个 frame 收集信息 */
async function diagnoseAllFrames(tabId) {
  const frames = await chrome.webNavigation.getAllFrames({ tabId });
  if (!frames) return { error: '无法获取 frame 信息' };

  const frameInfo = [];

  for (const frame of frames) {
    // 跳过扩展内部页面
    if (frame.url?.startsWith('chrome-extension://')) continue;

    const info = {
      frameId: frame.frameId,
      url: frame.url?.substring(0, 200) || '(空)',
      parentFrameId: frame.parentFrameId,
      accessible: false,
      isAxure: false,
      title: '',
      tableCount: 0,
      bodySize: 0,
      hasScript: false,
    };

    try {
      const res = await chrome.tabs.sendMessage(tabId, { action: 'ping' }, { frameId: frame.frameId });
      if (res && res.pong) {
        info.hasScript = true;
        info.accessible = true;
      }
    } catch {
      info.hasScript = false;
      info.accessible = false;
    }

    // 尝试提取诊断信息
    if (info.accessible) {
      try {
        const diag = await chrome.tabs.sendMessage(tabId, { action: 'diagnose-me' }, { frameId: frame.frameId });
        if (diag && diag.status === 'ok') {
          info.isAxure = diag.data.isAxure;
          info.title = diag.data.title;
          info.tableCount = diag.data.tableCount;
          info.bodySize = diag.data.bodySize;
        }
      } catch {}
    }

    frameInfo.push(info);
  }

  return { success: true, frames: frameInfo };
}
