import { state } from '../state';
import { t } from '../i18n';
import { highlightEl, hideHighlight } from './highlight';
import { createRubber, updateRubber, removeRubber } from './rubber';
import { cancelPick } from './pick-flow';
import { setStatus } from '../ui/floater-status';
import { extractFromRect } from '../extract/rect';
import { findContainer } from '../extract/element';
import { doPickPick } from './pick-flow';
import { buildPath, applyNavSelection } from './screenshot';
import { eventTargetEl, topWindow } from '../utils/dom';

export function onMouseDown(e: MouseEvent): void {
  const target = eventTargetEl(e);
  console.log('[蓝湖] mousedown target:', target?.tagName, 'id:', target?.id, 'closestFltr:', !!target?.closest?.('#__lh_f'));
  if (e.button !== 0) return;
  if (target?.closest('#__lh_f') || target?.closest('#__lh_edit')) {
    console.log('[蓝湖] mousedown → 扩展面板点击，跳过');
    return;
  }
  if (!state.pickMode) {
    if (state.selectionLocked) { hideHighlight(); state.selectionLocked = false; }
    console.log('[蓝湖] mousedown → state.pickMode=false, 放行');
    return;
  }
  if (target?.closest('a') || target?.closest('[href]') ||
      target?.closest('[class*="nav"]') || target?.closest('[class*="menu"]') ||
      target?.closest('[class*="sidebar"]') || target?.closest('[class*="header"]')) {
    console.log('[蓝湖] mousedown → 导航点击，放行');
    if (state.pickMode) cancelPick();
    return;
  }
  console.log('[蓝湖] mousedown → 拾取模式拦截点击');
  hideHighlight();
  state.selectionLocked = false;
  e.preventDefault();
  state.isDragging = true;
  state.selStartX = state.selEndX = e.clientX;
  state.selStartY = state.selEndY = e.clientY;
  createRubber();
  updateRubber(state.selStartX, state.selStartY, state.selEndX, state.selEndY);
  setStatus(t('statusDragSelect'));
}

export function onMouseMove(e: MouseEvent): void {
  if (state.isFloaterDrag) return;
  if (state.isDragging) {
    state.selEndX = e.clientX;
    state.selEndY = e.clientY;
    updateRubber(state.selStartX, state.selStartY, state.selEndX, state.selEndY);
    return;
  }
  if (!state.active) return;
  if (state.selectionLocked) return;
  const el = document.elementFromPoint(e.clientX, e.clientY);
  if (!el || el.id?.startsWith('__lh_')) { hideHighlight(); return; }
  const container = findContainer(el);
  if (container.el && container.el !== document.body) {
    highlightEl(container.el);
  } else {
    hideHighlight();
  }
}

export function onMouseUp(e: MouseEvent): void {
  if (!state.isDragging) return;
  state.isDragging = false;
  state.selEndX = e.clientX;
  state.selEndY = e.clientY;

  const dragDist = Math.abs(state.selEndX - state.selStartX) + Math.abs(state.selEndY - state.selStartY);
  const area = Math.abs((state.selEndX - state.selStartX) * (state.selEndY - state.selStartY));
  removeRubber();

  if (dragDist < 15) {
    const el = document.elementFromPoint(state.selEndX, state.selEndY);
    if (!el || el.id?.startsWith('__lh_')) {
      hideHighlight();
      setStatus(t('statusNoElement'));
      return;
    }

    if (state.pickMode && state.activePickField) {
      console.log(state.frameTag, '[蓝湖] state.pickMode click, state.activePickField:', JSON.stringify(state.activePickField), 'el:', el.tagName, el.id || '-');
      if (state.pickDebounceTimer) clearTimeout(state.pickDebounceTimer);
      if (e.detail >= 2) {
        state.pickDebounceTimer = null;
        doPickPick(el, true);
      } else {
        const capturedEl = el;
        state.pickDebounceTimer = setTimeout(() => {
          state.pickDebounceTimer = null;
          doPickPick(capturedEl, false);
        }, 300);
      }
      return;
    }

    state.navPath = buildPath(el);
    console.log('[蓝湖提取器] state.navPath:', state.navPath.map(node => node.tagName+'.'+(node.className||'')).join(' > '), 'length:', state.navPath.length);
    if (state.navPath.length < 2) {
      setStatus(t('statusNoPath'));
      return;
    }

    const { el: container } = findContainer(el);
    let startIdx = state.navPath.indexOf(container!);
    console.log('[蓝湖提取器] container:', container?.tagName, 'startIdx:', startIdx, 'pathLen:', state.navPath.length);
    if (startIdx < 1) {
      startIdx = Math.max(1, state.navPath.length - 3);
    }
    const midIdx = Math.floor(state.navPath.length / 2);
    state.navIndex = Math.max(1, Math.min(startIdx, midIdx, state.navPath.length - 2));
    console.log('[蓝湖提取器] state.navIndex:', state.navIndex, 'up:', state.navIndex > 0, 'down:', state.navIndex < state.navPath.length - 1);

    state.selectionLocked = true;
    applyNavSelection();
    return;
  }

  if (area < 100) {
    setStatus(t('statusAreaTooSmall'));
    return;
  }

  const result = extractFromRect(state.selStartX, state.selStartY, state.selEndX, state.selEndY);
  if (!result.markdown) {
    setStatus(t('statusEmpty'));
    return;
  }

  if (state.frameCtx !== 'top') {
    try {
      topWindow().postMessage({ type: '__lh_picker_result', markdown: result.markdown, sourceType: result.type }, '*');
      setStatus(t('statusResultSent'));
    } catch { setStatus(t('statusSendFail')); }
    return;
  }
}
