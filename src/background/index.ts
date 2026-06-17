/**
 * 蓝湖 Axure 需求提取器 — 后台服务脚本
 */
import { MSG } from '../shared/messages';

interface CaptureRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface RuntimeMessage {
  action?: string;
  tabId?: number;
  lang?: string;
  moduleId?: string;
  field?: string;
  entryIdx?: number;
  rect?: CaptureRect;
}

const pickerState = new Map<number, boolean>();

chrome.runtime.onMessage.addListener((request: RuntimeMessage, sender, sendResponse) => {
  const tabId = request.tabId ?? sender.tab?.id;

  switch (request.action) {
    case MSG.EXTRACT:
      if (!tabId) {
        sendResponse({ error: 'no tab' });
        return;
      }
      extractAllFrames(tabId).then(sendResponse);
      return true;

    case MSG.DIAGNOSE:
      if (!tabId) {
        sendResponse({ error: 'no tab' });
        return;
      }
      diagnoseAllFrames(tabId).then(sendResponse);
      return true;

    case MSG.PING:
      sendResponse({ pong: true });
      return;

    case MSG.OPEN_BUILDER:
      if (!tabId) {
        sendResponse({ error: 'no tab' });
        return;
      }
      broadcastToFrames(tabId, { action: MSG.OPEN_BUILDER, lang: request.lang }).then((r) => {
        sendResponse({ status: 'ok', success: r.success, total: r.total });
      });
      return true;

    case MSG.SYNC_PICK_STATE:
      if (!tabId) {
        sendResponse({ error: 'no tab' });
        return;
      }
      broadcastToFrames(tabId, {
        action: MSG.SET_PICK_STATE,
        moduleId: request.moduleId,
        field: request.field,
        entryIdx: request.entryIdx,
      }).then((r) => sendResponse(r));
      return true;

    case MSG.CANCEL_PICK_STATE:
      if (!tabId) {
        sendResponse({ error: 'no tab' });
        return;
      }
      broadcastToFrames(tabId, { action: MSG.CLEAR_PICK_STATE }).then((r) => sendResponse(r));
      return true;

    case MSG.START_PICKER:
      if (!tabId) {
        sendResponse({ error: 'no tab' });
        return;
      }
      pickerState.set(tabId, true);
      broadcastToFrames(tabId, { action: MSG.START_PICKER }).then(sendResponse);
      return true;

    case MSG.STOP_PICKER:
      if (!tabId) {
        sendResponse({ error: 'no tab' });
        return;
      }
      pickerState.set(tabId, false);
      broadcastToFrames(tabId, { action: MSG.STOP_PICKER }).then(sendResponse);
      return true;

    case MSG.GET_PICKER_STATE:
      if (!tabId) {
        sendResponse({ active: false });
        return;
      }
      sendResponse({ active: pickerState.get(tabId) === true });
      return;

    case MSG.PICKER_RESULT:
      sendResponse({ status: 'ok' });
      return;

    case MSG.CONTENT_RELOADED:
      const reloadedTabId = sender.tab?.id;
      if (reloadedTabId) pickerState.set(reloadedTabId, false);
      sendResponse({ status: 'ok' });
      return;

    case MSG.PICKER_CANCELLED:
      sendResponse({ status: 'ok' });
      return;

    case MSG.CAPTURE_RECT:
      if (!tabId) {
        sendResponse({ error: 'no tab' });
        return;
      }
      if (!request.rect) {
        sendResponse({ error: 'no rect' });
        return;
      }
      captureRect(tabId, request.rect).then(sendResponse);
      return true;

    default:
      return;
  }
});

async function broadcastToFrames(tabId: number, msg: Record<string, unknown>) {
  const frames = await chrome.webNavigation.getAllFrames({ tabId });
  if (!frames) return { error: 'no frames' };

  let success = 0;
  for (const frame of frames) {
    if (!frame.url) continue;
    const url = frame.url;
    if (!url.includes('lanhuapp.com') && !url.includes('mockplus.cn')) continue;
    try {
      await chrome.tabs.sendMessage(tabId, msg, { frameId: frame.frameId });
      success++;
    } catch {
      /* frame may not have content script */
    }
  }
  return { success, total: frames.length };
}

async function extractAllFrames(tabId: number) {
  const frames = await chrome.webNavigation.getAllFrames({ tabId });
  if (!frames || frames.length === 0) return { error: '无法获取页面 frame 信息' };

  const results: Array<{ pages?: unknown[]; combinedMarkdown?: string }> = [];
  for (const frame of frames) {
    if (!frame.url) continue;
    const url = frame.url;
    if (!url.includes('lanhuapp.com') && !url.includes('mockplus.cn')) continue;
    try {
      const res = await chrome.tabs.sendMessage(
        tabId,
        { action: MSG.EXTRACT_AXURE },
        { frameId: frame.frameId },
      );
      if (res && res.status === 'ok' && res.data) results.push(res.data);
    } catch {
      /* ignore */
    }
  }

  let tableCount = 0;
  let textCount = 0;
  let combinedMd = '';
  results.forEach((data, idx) => {
    const pages = data.pages || [];
    pages.forEach((p) => {
      const page = p as { sections?: Array<{ type?: string }> };
      (page.sections || []).forEach((s) => {
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
    pages: results.flatMap((d) => d.pages || []),
    combinedMarkdown: combinedMd,
  };
}

async function diagnoseAllFrames(tabId: number) {
  const frames = await chrome.webNavigation.getAllFrames({ tabId });
  if (!frames) return { error: 'no frames' };

  const frameInfo: Array<Record<string, unknown>> = [];
  for (const frame of frames) {
    if (frame.url?.startsWith('chrome-extension://')) continue;
    const info: Record<string, unknown> = {
      frameId: frame.frameId,
      url: frame.url?.substring(0, 200) || '',
      parentFrameId: frame.parentFrameId,
      accessible: false,
      hasScript: false,
      isAxure: false,
      title: '',
      tableCount: 0,
      bodySize: 0,
    };
    try {
      const res = await chrome.tabs.sendMessage(tabId, { action: MSG.PING }, { frameId: frame.frameId });
      if (res && res.pong) info.hasScript = true;
      info.accessible = true;
    } catch {
      /* ignore */
    }
    if (info.accessible) {
      try {
        const diag = await chrome.tabs.sendMessage(
          tabId,
          { action: MSG.DIAGNOSE_ME },
          { frameId: frame.frameId },
        );
        if (diag && diag.status === 'ok') {
          info.isAxure = diag.data.isAxure;
          info.title = diag.data.title;
          info.tableCount = diag.data.tableCount;
          info.bodySize = diag.data.bodySize;
        }
      } catch {
        /* ignore */
      }
    }
    frameInfo.push(info);
  }
  return { success: true, frames: frameInfo };
}

async function captureRect(tabId: number, rect: CaptureRect) {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(tabId, { format: 'png' });
    const img = await createImageBitmap(await (await fetch(dataUrl)).blob());
    const canvas = new OffscreenCanvas(rect.w, rect.h);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas context unavailable');
    ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    return { status: 'ok', dataUrl: URL.createObjectURL(blob) };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { status: 'error', error: message };
  }
}
