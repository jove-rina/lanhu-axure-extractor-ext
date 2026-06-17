/**
 * Frame 上下文：顶层 vs iframe
 */
import { MSG } from '../shared/messages';
import { state } from './state';
import type { FrameContext } from './types';
import { isExtensionContextValid } from './utils/extension-context';

export function getFrameContext(): FrameContext {
  try {
    if (window.top === window.self) return 'top';
    const host = window.parent.location.hostname;
    if (host.includes('lanhuapp')) return 'lanhu-iframe';
    if (host.includes('mockplus')) return 'mockplus-iframe';
    return 'unknown-iframe';
  } catch {
    return 'cross-origin-iframe';
  }
}

export function initContext(): void {
  state.frameCtx = getFrameContext();
  state.frameTag = state.frameCtx === 'top' ? '[T ]' : '[IF]';
  console.log(`[蓝湖提取器] 已加载 — ${state.frameCtx}`);
  if (state.frameCtx === 'top' && isExtensionContextValid()) {
    chrome.runtime.sendMessage({ action: MSG.CONTENT_RELOADED }).catch(() => {});
  }
}

