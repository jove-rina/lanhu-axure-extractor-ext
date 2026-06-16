import { state } from '../state';

/** 扩展是否仍可用（重载/卸载后为 false） */
export function isExtensionContextValid(): boolean {
  try {
    return Boolean(chrome.runtime?.id);
  } catch {
    return false;
  }
}

export function stopExtensionTimers(): void {
  if (state.urlPollTimer) {
    clearInterval(state.urlPollTimer);
    state.urlPollTimer = null;
  }
  if (state.pickDebounceTimer) {
    clearTimeout(state.pickDebounceTimer);
    state.pickDebounceTimer = null;
  }
  if (state.clampRafId) {
    cancelAnimationFrame(state.clampRafId);
    state.clampRafId = 0;
  }
}

let staleHandled = false;

/** 扩展上下文失效时停止定时器并移除 UI，避免继续调用 chrome API */
export function handleStaleExtensionContext(): void {
  if (staleHandled) return;
  staleHandled = true;

  stopExtensionTimers();

  state.active = false;
  state.pickMode = false;
  state.activePickField = null;
  state.isDragging = false;
  state.floater = null;
  state.editDialogState = null;

  document.body.style.cursor = '';
  document.body.style.userSelect = '';

  for (const id of ['__lh_f', '__lh_edit', '__lh_f_ghost', '__lh_tip', '__lh_toast']) {
    document.getElementById(id)?.remove();
  }
}

/** 调用 chrome API 前检查；失效则清理并返回 false */
export function ensureExtensionContext(): boolean {
  if (isExtensionContextValid()) return true;
  handleStaleExtensionContext();
  return false;
}
