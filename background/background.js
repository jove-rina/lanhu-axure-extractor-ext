/**
 * 蓝湖 Axure 需求提取器 — 后台服务脚本
 */

// ---- 拾取状态跟踪（跨 popup 生命周期） ----
const pickerState = new Map(); // tabId → boolean

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 提取：逐帧发送
  if (request.action === 'extract') {
    const tabId = request.tabId || sender.tab?.id;
    if (!tabId) { sendResponse({ error: 'no tab' }); return; }
    extractAllFrames(tabId).then(sendResponse);
    return true;
  }

  // 诊断
  if (request.action === 'diagnose') {
    const tabId = request.tabId || sender.tab?.id;
    if (!tabId) { sendResponse({ error: 'no tab' }); return; }
    diagnoseAllFrames(tabId).then(sendResponse);
    return true;
  }

  // ping
  if (request.action === 'ping') {
    sendResponse({ pong: true });
    return;
  }

  // 文档构建器：向所有 frame 广播（顶层显示浮窗，iframe 激活拾取能力）
  if (request.action === 'open-builder') {
    const tabId = request.tabId || sender.tab?.id;
    if (!tabId) { sendResponse({ error: 'no tab' }); return; }
    broadcastToFrames(tabId, { action: 'open-builder', lang: request.lang }).then((r) => {
      sendResponse({ status: 'ok', success: r.success, total: r.total });
    });
    return true;
  }

  // 同步拾取状态到所有 frame（🎯 按钮触发）
  if (request.action === 'sync-pick-state') {
    const tabId = request.tabId || sender.tab?.id;
    if (!tabId) { sendResponse({ error: 'no tab' }); return; }
    broadcastToFrames(tabId, {
      action: 'set-pick-state',
      moduleId: request.moduleId,
      field: request.field,
      entryIdx: request.entryIdx
    }).then((r) => sendResponse(r));
    return true;
  }

  // 取消拾取状态
  if (request.action === 'cancel-pick-state') {
    const tabId = request.tabId || sender.tab?.id;
    if (!tabId) { sendResponse({ error: 'no tab' }); return; }
    broadcastToFrames(tabId, { action: 'clear-pick-state' }).then((r) => sendResponse(r));
    return true;
  }

  // 启动捡取：向所有 frame 广播 + 记录状态
  if (request.action === 'start-picker') {
    const tabId = request.tabId;
    if (!tabId) { sendResponse({ error: 'no tab' }); return; }
    pickerState.set(tabId, true);
    broadcastToFrames(tabId, { action: 'start-picker' }).then(sendResponse);
    return true;
  }

  // 停止捡取
  if (request.action === 'stop-picker') {
    const tabId = request.tabId;
    if (!tabId) { sendResponse({ error: 'no tab' }); return; }
    pickerState.set(tabId, false);
    broadcastToFrames(tabId, { action: 'stop-picker' }).then(sendResponse);
    return true;
  }

  // 查询拾取状态（popup 打开时调用）
  if (request.action === 'get-picker-state') {
    const tabId = request.tabId;
    if (!tabId) { sendResponse({ active: false }); return; }
    sendResponse({ active: pickerState.get(tabId) === true });
    return;
  }

  // 捡取结果转发到 popup
  if (request.action === 'picker-result') {
    sendResponse({ status: 'ok' });
    return;
  }

  // 内容脚本重载：重置该 tab 的拾取状态
  if (request.action === 'content-reloaded') {
    const tabId = sender.tab?.id;
    if (tabId) pickerState.set(tabId, false);
    sendResponse({ status: 'ok' });
    return;
  }

  if (request.action === 'picker-cancelled') {
    sendResponse({ status: 'ok' });
    return;
  }

  // 截图：捕获可视区域并裁剪
  if (request.action === 'capture-rect') {
    const tabId = request.tabId || sender.tab?.id;
    if (!tabId) { sendResponse({ error: 'no tab' }); return; }
    captureRect(tabId, request.rect).then(sendResponse);
    return true;
  }
});

async function broadcastToFrames(tabId, msg) {
  const frames = await chrome.webNavigation.getAllFrames({ tabId });
  if (!frames) return { error: 'no frames' };

  let success = 0;
  for (const frame of frames) {
    if (!frame.url || !frame.url.includes('lanhuapp.com')) continue;
    try {
      await chrome.tabs.sendMessage(tabId, msg, { frameId: frame.frameId });
      success++;
    } catch {}
  }
  return { success, total: frames.length };
}

async function extractAllFrames(tabId) {
  const frames = await chrome.webNavigation.getAllFrames({ tabId });
  if (!frames || frames.length === 0) return { error: '无法获取页面 frame 信息' };

  const results = [];
  for (const frame of frames) {
    if (!frame.url || !frame.url.includes('lanhuapp.com')) continue;
    try {
      const res = await chrome.tabs.sendMessage(tabId, { action: 'extract-axure' }, { frameId: frame.frameId });
      if (res && res.status === 'ok' && res.data) results.push(res.data);
    } catch {}
  }

  let tableCount = 0, textCount = 0;
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

  return { success: true, framesScanned: frames.length, framesResponded: results.length, tableCount, textCount, pages: results.flatMap(d => d.pages || []), combinedMarkdown: combinedMd };
}

async function diagnoseAllFrames(tabId) {
  const frames = await chrome.webNavigation.getAllFrames({ tabId });
  if (!frames) return { error: 'no frames' };

  const frameInfo = [];
  for (const frame of frames) {
    if (frame.url?.startsWith('chrome-extension://')) continue;
    const info = { frameId: frame.frameId, url: frame.url?.substring(0, 200) || '', parentFrameId: frame.parentFrameId, accessible: false, hasScript: false, isAxure: false, title: '', tableCount: 0, bodySize: 0 };
    try {
      const res = await chrome.tabs.sendMessage(tabId, { action: 'ping' }, { frameId: frame.frameId });
      if (res && res.pong) info.hasScript = true;
      info.accessible = true;
    } catch {}
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

async function captureRect(tabId, rect) {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(tabId, { format: 'png' });
    // 裁剪：用 canvas
    const img = await createImageBitmap(await (await fetch(dataUrl)).blob());
    const canvas = new OffscreenCanvas(rect.w, rect.h);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    return { status: 'ok', dataUrl: URL.createObjectURL(blob) };
  } catch (e) {
    return { status: 'error', error: e.message };
  }
}
