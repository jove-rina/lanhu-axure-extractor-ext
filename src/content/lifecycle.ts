import { state } from './state';
import { applyLang } from './i18n';
import { refreshPageTitleFromIframes } from './modules/manager';
import { createFloater, showFloater, resetFloaterPosition, removeFloater } from './ui/floater-panel';
import { createRubber, removeRubber } from './picker/rubber';
import { createHoverHighlight, removeHoverHighlight } from './picker/highlight';
import { onKeyDown } from './picker/keyboard';
import { onMouseDown, onMouseMove, onMouseUp } from './picker/mouse-events';
import { setupMessageListener } from './bridge/post-message';
import { closeEditDialog } from './ui/editor';
import { isExtensionContextValid } from './utils/extension-context';

export function openDocBuilder(lang?: string | null): void {
  applyLang(lang);
  if (state.frameCtx !== 'top') {
    if (!state.active) activate();
    return;
  }
  if (!state.active) activate();
  createFloater();
  showFloater();
  resetFloaterPosition();
  refreshPageTitleFromIframes();
}

export function activate() {
  if (state.active) return;
  state.active = true;

  if (state.frameCtx === 'top') {
    createFloater();
    if (!state.createdByMe) return;
    showFloater();
    setupMessageListener();
    document.addEventListener('keydown', onKeyDown, true);
  } else {
    if (document.getElementById('__lh_iframe_active')) return;
    createRubber();
    createHoverHighlight();
    document.addEventListener('keydown', onKeyDown, true);
    setupMessageListener();
    const m = document.createElement('div');
    m.id = '__lh_iframe_active'; m.style.display = 'none';
    document.body.appendChild(m);
  }

  console.log('[蓝湖提取器] 已激活 —', state.frameCtx, 'state.pickMode:', state.pickMode, 'state.active:', true);
}

export function deactivate() {
  if (!state.active) {
    console.log('[蓝湖] deactivate → 已是非活跃状态');
    return;
  }
  state.active = false;
  console.log('[蓝湖] deactivate → 停用拾取模式');

  document.removeEventListener('mousedown', onMouseDown, true);
  document.removeEventListener('mousemove', onMouseMove, true);
  document.removeEventListener('mouseup', onMouseUp, true);
  document.removeEventListener('keydown', onKeyDown, true);

  document.body.style.cursor = '';
  document.body.style.userSelect = '';

  removeRubber();
  removeHoverHighlight();

  if (state.frameCtx === 'top') {
    if (isExtensionContextValid()) {
      chrome.runtime.sendMessage({ action: 'cancel-pick-state' }).catch(() => {});
    }
    document.querySelectorAll('iframe').forEach(f => {
      try { f.contentWindow?.postMessage({ type: '__lh_cancel_pick' }, '*'); } catch {}
    });
    closeEditDialog();
    removeFloater();
  } else {
    const marker = document.getElementById('__lh_iframe_active');
    if (marker) marker.remove();
  }

  if (state.pickMode) {
    state.pickMode = false;
    state.activePickField = null;
  }
  state.isDragging = false;

  state.navPath = [];
  state.navIndex = -1;
  state.currentSelectedEl = null;
  state.selectionLocked = false;

  console.log('[蓝湖提取器] 已退出 —', state.frameCtx);
}
