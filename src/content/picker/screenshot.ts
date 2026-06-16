import { state } from '../state';
import { t } from '../i18n';
import { setStatus } from '../ui/floater-status';
import { highlightEl } from './highlight';
import { getBreadcrumb, extractFromEl } from '../extract/element';
import { finishPick } from './pick-flow';
import { topWindow } from '../utils/dom';
import type { ContainerRect, NavPickerResultData } from '../types';

export function trackContainerRect(el: Element): void {
  if (!el) return;
  const r = el.getBoundingClientRect();
  const rect: ContainerRect = { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
  if (state.appendMode) { state.containerRects.push(rect); }
  else { state.containerRects = [rect]; }
}

/** 从点击的元素向上构建 DOM 路径（至 body），排除 __lh_ 元素 */
export function buildPath(el: Element): Element[] {
  const path: Element[] = [];
  let cur: Element | null = el;
  for (let i = 0; cur && i < 15; i++) {
    if (cur.id?.startsWith?.('__lh_')) { cur = cur.parentElement; continue; }
    path.unshift(cur);
    if (cur === document.body || cur === document.documentElement) break;
    cur = cur.parentElement;
  }
  return path;
}

/** 根据当前 state.navIndex 应用选择：高亮 + 提取 + 更新按钮状态 */
export function applyNavSelection(): void {
  const upBtn = document.getElementById('__lh_f_up');
  const dnBtn = document.getElementById('__lh_f_dn');
  const info = document.getElementById('__lh_f_nav_info');

  const canUp = state.navIndex > 0;
  const canDn = state.navIndex < state.navPath.length - 1;
  if (upBtn) {
    upBtn.setAttribute('aria-disabled', String(!canUp));
    upBtn.style.opacity = canUp ? '1' : '0.4';
    upBtn.style.color = canUp ? '#c1c2c5' : '#5c5f66';
    upBtn.style.cursor = canUp ? 'pointer' : 'default';
  }
  if (dnBtn) {
    dnBtn.setAttribute('aria-disabled', String(!canDn));
    dnBtn.style.opacity = canDn ? '1' : '0.4';
    dnBtn.style.color = canDn ? '#c1c2c5' : '#5c5f66';
    dnBtn.style.cursor = canDn ? 'pointer' : 'default';
  }

  const el = state.navPath[state.navIndex];
  if (!el) {
    if (info) info.textContent = state.navPath.length > 1 ? `⊞ (${state.navIndex + 1}/${state.navPath.length})` : '';
    return;
  }
  state.currentSelectedEl = el;
  console.log('[蓝湖]', state.frameTag, 'state.currentSelectedEl 已设置:', el.tagName, 'id:', el.id || '-', 'classes:', (el.className || '').slice(0,40));

  highlightEl(el);
  trackContainerRect(el);

  const bc = getBreadcrumb(el);
  if (info) {
    info.textContent = `⊞ ${bc}  (${state.navIndex + 1}/${state.navPath.length})`;
  }

  const result = extractFromEl(el);
  setStatus(`${t('pick')} ${bc} (${state.navIndex + 1}/${state.navPath.length})`);

  if (result.markdown) {
    if (state.frameCtx !== 'top') {
      const fr = el.getBoundingClientRect();
      try {
        topWindow().postMessage({
          type: '__lh_picker_result',
          markdown: result.markdown,
          sourceType: result.type,
          navIndex: state.navIndex,
          navPathLength: state.navPath.length,
          breadcrumb: bc,
          selLeft: fr.left,
          selTop: fr.top,
          selW: fr.width,
          selH: fr.height
        }, '*');
      } catch {}
    } else { finishPick(result.markdown); }
  } else {
    setStatus(t('statusEmpty'));
  }
}

/** 更新顶层浮动面板状态（iframe 结果到达时调用） */
export function updateNavButtonsFromData(data: NavPickerResultData): void {
  console.log('[蓝湖] 收到 iframe 结果:', data?.breadcrumb || '');
}
