/**
 * 浮动面板：创建 DOM、拖拽定位、页面切换提示
 * 仅在 state.frameCtx === 'top' 时显示完整 UI
 */
import { state } from '../state';
import { t, applyLang } from '../i18n';
import { escHtml } from '../utils/dom';
import {
  ensureLhUiStyles, initLhTooltipSystem, getFloaterHTML,
  BTN_PREVIEW_LG, BTN_COPY_LG, BTN_DOWNLOAD_LG,
} from './styles';
import { deactivate } from '../lifecycle';
import {
  addModule, loadModules, getFullMarkdown, getDownloadFilename,
  copyMarkdown, downloadMarkdown, saveModules, refreshPageTitleFromIframes,
  getStorageKey,
} from '../modules/manager';
import { cancelPick } from '../picker/pick-flow';
import { closeEditDialog } from './editor';
import { renderModuleList } from './floater-list';
import { updateSelAllButton } from './floater-toolbar';
import { openPreviewWindow, showPreview } from './preview';
import { setStatus } from './floater-status';
import { ensureExtensionContext, isExtensionContextValid, handleStaleExtensionContext } from '../utils/extension-context';
import { eventTargetEl, asPointerEvent } from '../utils/dom';

export function createFloater() {
  if (document.getElementById('__lh_f')) {
    state.floater = document.getElementById('__lh_f');
    state.createdByMe = true;
    initLhTooltipSystem();
    return;
  }
  state.createdByMe = true;
  ensureLhUiStyles();
  initLhTooltipSystem();
  // 注入动画 keyframes + 工具提示样式 + 卡片过渡
  const styleId = '__lh_f_anim';
  if (!document.getElementById(styleId)) {
    const st = document.createElement('style');
    st.id = styleId;
    st.textContent = `
@keyframes lhFadeIn { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
.lh-module-card.lh-dragging{opacity:.45;transform:scale(.97);filter:none!important}
.lh-module-card.drag-over{border-color:#f08c00!important;box-shadow:0 0 0 1px rgba(240,140,0,.3)!important;opacity:1!important;filter:none!important}
.lh-drop-indicator{transition:opacity 0.15s ease,height 0.15s ease}
.lh-btn-tip{display:inline-flex;align-items:center;gap:4px}
`.trim();
    document.head.appendChild(st);
  }
  const d = document.createElement('div');
  d.innerHTML = getFloaterHTML();
  const floaterEl = d.firstElementChild;
  if (floaterEl) document.body.appendChild(floaterEl);
  state.floater = document.getElementById('__lh_f');

  // 关闭
  document.getElementById('__lh_f_x')?.addEventListener('click', (e) => { e.stopPropagation(); deactivate(); });

  // 新增模块
  document.getElementById('__lh_f_add')?.addEventListener('click', (e) => { e.stopPropagation(); addModule(); });

  // 展开/收起所有
  document.getElementById('__lh_f_expand')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (state.collapsedModuleIds.size === 0) {
      // 全部展开中→全部收起
      state.collapsedModuleIds = new Set(state.modules.map(m => m.id));
    } else {
      // 有收起的→全部展开
      state.collapsedModuleIds.clear();
    }
    renderModuleList();
    scheduleClampFloaterPosition();
  });

  // 全选
  document.getElementById('__lh_f_selall')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (state.selectedModuleIds.size === state.modules.length) {
      state.selectedModuleIds.clear();
    } else {
      state.selectedModuleIds = new Set(state.modules.map(m => m.id));
    }
    renderModuleList();
  });
  document.getElementById('__lh_f_del_sel')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (state.selectedModuleIds.size === 0) { setStatus(t('statusSelectToDelete')); return; }
    state.modules = state.modules.filter(m => !state.selectedModuleIds.has(m.id));
    state.selectedModuleIds.clear();
    // 清理已删除模块的收起状态
    const remainingIds = new Set(state.modules.map(m => m.id));
    state.collapsedModuleIds = new Set([...state.collapsedModuleIds].filter(id => remainingIds.has(id)));
    renderModuleList();
    scheduleClampFloaterPosition();
    saveModules();
    setStatus(t("statusDeleted", state.modules.length));
  });

  // 预览
  document.getElementById('__lh_f_preview')?.addEventListener('click', (e) => { e.stopPropagation(); showPreview(); });

  // 复制
  document.getElementById('__lh_f_copy')?.addEventListener('click', (e) => {
    e.stopPropagation();
    refreshPageTitleFromIframes();
    const md = getFullMarkdown();
    if (!md) { setStatus(t('statusNoContent')); return; }
    copyMarkdown(md);
  });

  // 下载
  document.getElementById('__lh_f_download')?.addEventListener('click', (e) => {
    e.stopPropagation();
    refreshPageTitleFromIframes();
    const md = getFullMarkdown();
    if (!md) { setStatus(t('statusNoContent')); return; }
    downloadMarkdown(md, getDownloadFilename());
    setStatus(t('statusDownloaded'));
  });

  // 拖拽 — Pointer Events + setPointerCapture + transform + rAF
  const h = document.getElementById('__lh_f_h');
  if (h) {
    h.addEventListener('pointerdown', (e) => {
      const pe = asPointerEvent(e);
      const target = eventTargetEl(e);
      if (!pe || !target || !state.floater) return;
      if (target.tagName === 'BUTTON' || target.tagName === 'INPUT') return;
      pe.preventDefault();
      if (target.setPointerCapture) target.setPointerCapture(pe.pointerId);
      const r = state.floater.getBoundingClientRect();
      const dx = e.clientX - r.left, dy = e.clientY - r.top;
      const fw = r.width, fh = r.height;
      // 隐藏真实浮框，创建轻量虚框
      state.floater.style.opacity = '0';
      const ghost = document.createElement('div');
      ghost.id = '__lh_f_ghost';
      ghost.style.cssText = `all:initial;position:fixed;left:0;top:0;width:${fw}px;height:${fh}px;
        background:rgba(26,27,30,0.55);border:1px solid rgba(240,140,0,0.25);border-radius:10px;
        box-shadow:0 12px 40px rgba(0,0,0,0.35);z-index:2147483646;pointer-events:none;
        transform:translate(${r.left}px,${r.top}px);will-change:transform;`;
      document.body.appendChild(ghost);
      state.floater.style.left = '0'; state.floater.style.top = '0';
      state.floater.style.bottom = 'auto'; state.floater.style.right = 'auto';
      state.isFloaterDrag = true;
      document.body.style.userSelect = 'none';
      let rafId: number | null = null, pendingX = 0, pendingY = 0;
      const vw = window.innerWidth, vh = window.innerHeight;
      const floater = state.floater;
      const mv = (ev: PointerEvent) => {
        pendingX = ev.clientX - dx;
        pendingY = ev.clientY - dy;
        if (!rafId) {
          rafId = requestAnimationFrame(() => {
            rafId = null;
            let x = pendingX, y = pendingY;
            if (x < 0) x = 0;
            if (x + fw > vw) x = vw - fw;
            if (y < 0) y = 0;
            if (y + fh > vh) y = vh - fh;
            ghost.style.transform = `translate(${x}px, ${y}px)`;
          });
        }
      };
      const up = () => {
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        const gRect = ghost.getBoundingClientRect();
        setFloaterPosition(gRect.left, gRect.top);
        if (floater) {
          floater.style.opacity = '1';
          floater.style.willChange = '';
        }
        ghost.remove();
        document.removeEventListener('pointermove', mv);
        document.removeEventListener('pointerup', up);
        state.isFloaterDrag = false;
        document.body.style.userSelect = '';
      };
      document.addEventListener('pointermove', mv);
      document.addEventListener('pointerup', up);
    }, { passive: false });
  }

  renderModuleList();
  loadModules();

  // ---- 页面切换检测：发现切换就关浮窗 + 提示 ----
  state.urlPollTimer = setInterval(() => {
    if (!isExtensionContextValid()) {
      handleStaleExtensionContext();
      return;
    }
    if (!document.getElementById('__lh_f')) {
      if (state.urlPollTimer != null) clearInterval(state.urlPollTimer);
      state.urlPollTimer = null;
      return;
    }
    const newKey = getStorageKey();
    if (newKey === state.currentStorageKey) return;
    saveModules();
    state.cachedAxurePageTitle = '';
    if (state.pickMode) cancelPick();
    closeEditDialog();
    showPageSwitchTip();
    deactivate();
  }, 500);
}

/** 页面切换提示 — 全屏遮罩（首次）或底部小 toast（已勾"不再提示"） */
export function showPageSwitchTip() {
  if (!ensureExtensionContext()) return;
  const show = () => {
    if (!ensureExtensionContext()) return;
    chrome.storage.local.get('__lh_no_page_tip', (d) => {
      if (!isExtensionContextValid()) return;
      if (d && d.__lh_no_page_tip) {
        showPageSwitchToast();
      } else {
        showPageSwitchDialog();
      }
    });
  };
  try {
    const ls = localStorage.getItem('axure_utils_lang');
    if (ls) applyLang(ls);
  } catch {}
  if (state.lang) {
    show();
    return;
  }
  chrome.storage.local.get('axure_utils_lang', (d) => {
    if (!isExtensionContextValid()) return;
    if (d?.axure_utils_lang) applyLang(d.axure_utils_lang);
    show();
  });
}

/** 底部小 toast，3秒自动关闭 */
export function showPageSwitchToast() {
  ensureLhUiStyles();
  const toast = document.createElement('div');
  toast.id = '__lh_toast';
  Object.assign(toast.style, {
    position: 'fixed',
    zIndex: '2147483647',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#25262b',
    border: '1px solid #373a40',
    borderRadius: '8px',
    padding: '10px 18px',
    font: '13px -apple-system,BlinkMacSystemFont,\'PingFang SC\',sans-serif',
    color: '#c1c2c5',
    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    animation: 'lhFadeIn 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    maxWidth: '400px',
  });
  toast.innerHTML = `<span>${t('dataSavedToast')}</span><button id="__lh_toast_close" data-tip="${t('gotItBtn')}" style="background:#373a40;color:#909296;border:none;border-radius:4px;padding:3px 10px;font-size:11px;cursor:pointer;">${t('gotItBtn')}</button>`;
  document.body.appendChild(toast);
  let closed = false;
  const close = () => { if (!closed) { closed = true; toast.remove(); } };
  document.getElementById('__lh_toast_close')?.addEventListener('click', close);
  setTimeout(close, 3000);
}

/** 全屏遮罩对话框，含倒计时 + 不再提示选项 */
export function showPageSwitchDialog() {
  ensureLhUiStyles();
  const tip = document.createElement('div');
  tip.id = '__lh_tip';
  Object.assign(tip.style, {
    position: 'fixed', zIndex: '2147483647', inset: '0',
    background: 'rgba(26,27,30,0.65)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    font: '14px -apple-system,BlinkMacSystemFont,\'PingFang SC\',sans-serif', color: '#c1c2c5',
    animation: 'lhFadeIn 0.2s ease',
  });
  let countdown = 3;
  let timer: ReturnType<typeof setInterval> | null = null;
  const closed = { v: false };
  const close = () => { if (!closed.v) { closed.v = true; if (timer) clearTimeout(timer); tip.remove(); } };
  const tick = () => {
    countdown--;
    const btn = document.getElementById('__lh_tip_ok');
    if (btn) btn.textContent = t('gotIt', countdown);
    if (countdown <= 0) close();
  };
  const builderLabel = t('openBuilderLabel');
  const descHtml = escHtml(t('pageSwitchDesc', builderLabel))
    .replace(escHtml(builderLabel), `<span style="color:#f08c00;font-weight:600;">${escHtml(builderLabel)}</span>`);
  tip.innerHTML = `<div style="background:#25262b;border:1px solid #373a40;border-radius:12px;padding:32px 40px;text-align:center;max-width:400px;">
    <div style="display:flex;justify-content:flex-end;margin-bottom:4px;">
      <button id="__lh_tip_x" data-tip="${t('close')}" style="background:transparent;color:rgba(255,255,255,.88);border:none;font-size:16px;cursor:pointer;padding:0 4px;">✕</button>
    </div>
    <div style="font-size:36px;margin-bottom:12px;">📄</div>
    <div style="font-size:16px;font-weight:600;color:#fff;margin-bottom:8px;">${t('pageSwitched')}</div>
    <div class="lh-hint-text" style="font-size:13px;line-height:1.6;margin-bottom:20px;">${descHtml}</div>
    <label class="lh-hint-text" style="display:flex;align-items:center;justify-content:center;gap:6px;font-size:12px;cursor:pointer;margin-bottom:16px;">
      <input type="checkbox" id="__lh_tip_nomore" style="accent-color:#f08c00;width:14px;height:14px;cursor:pointer;"> ${t('noMoreTip')}
    </label>
    <button id="__lh_tip_ok" data-tip="${t('dismiss')}" style="background:#373a40;color:#c1c2c5;border:none;border-radius:6px;padding:8px 24px;font-size:13px;cursor:pointer;">${t('gotIt', countdown)}</button>
  </div>`;
  document.body.appendChild(tip);
  document.getElementById('__lh_tip_x')?.addEventListener('click', close);
  document.getElementById('__lh_tip_ok')?.addEventListener('click', () => {
    const noMoreEl = document.getElementById('__lh_tip_nomore');
    const noMore = noMoreEl instanceof HTMLInputElement ? noMoreEl.checked : false;
    if (noMore && isExtensionContextValid()) {
      chrome.storage.local.set({ __lh_no_page_tip: true }).catch(() => {});
    }
    close();
  });
  timer = setInterval(tick, 1000);
}

export function showFloater() { if (state.floater) state.floater.style.display = 'flex'; }
export function hideFloater() { if (state.floater) state.floater.style.display = 'none'; }
export function removeFloater() {
  if (state.urlPollTimer) {
    clearInterval(state.urlPollTimer);
    state.urlPollTimer = null;
  }
  if (state.floater) { state.floater.remove(); state.floater = null; }
}

const FLOATER_MARGIN = 20;

/** 读取浮窗当前可视位置（不受 bottom/right/transform 混用影响） */
export function getFloaterPosition(): { x: number; y: number; w: number; h: number } {
  if (!state.floater) return { x: 0, y: 0, w: 0, h: 0 };
  const r = state.floater.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}

/** 统一定位：仅用 transform，避免与 bottom/right/left/top 冲突 */
export function setFloaterPosition(x: number, y: number, animate = false): void {
  if (!state.floater) return;
  const floater = state.floater;
  floater.style.left = '0';
  floater.style.top = '0';
  floater.style.bottom = 'auto';
  floater.style.right = 'auto';
  state.floaterAnchorX = x;
  if (!animate) {
    floater.style.transition = 'none';
    floater.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    return;
  }
  floater.style.transition = 'transform 0.25s ease';
  floater.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  const onEnd = () => {
    floater.style.transition = '';
    floater.removeEventListener('transitionend', onEnd);
  };
  floater.addEventListener('transitionend', onEnd);
}

/** 将 bottom/right 锚定转为 transform，便于高度变化时只调整 Y */
export function normalizeFloaterPosition() {
  if (!state.floater) return;
  const r = state.floater.getBoundingClientRect();
  const computed = getComputedStyle(state.floater);
  const hasTransform = state.floater.style.transform && state.floater.style.transform !== 'none';
  const usesBottomRight = computed.bottom !== 'auto' && computed.right !== 'auto' && !hasTransform;
  if (state.floaterAnchorX === null) state.floaterAnchorX = r.left;
  if (usesBottomRight) setFloaterPosition(state.floaterAnchorX, r.top, false);
}

/** 高度变化后：X 不变，仅 Y 超出视口时才调整 */
export function clampFloaterPosition() {
  if (!state.floater || state.floater.style.display === 'none') return;
  normalizeFloaterPosition();
  const vh = window.innerHeight;
  const { y, h } = getFloaterPosition();
  const x = state.floaterAnchorX ?? getFloaterPosition().x;
  let ny = y;
  let changed = false;
  if (y + h > vh) { ny = vh - h; changed = true; }
  if (ny < 0) { ny = 0; changed = true; }
  if (changed) setFloaterPosition(x, ny, true);
}

/** 等 DOM 布局完成后再钳制（合并快速连续触发） */
export function scheduleClampFloaterPosition() {
  if (state.clampRafId) cancelAnimationFrame(state.clampRafId);
  state.clampRafId = requestAnimationFrame(() => {
    state.clampRafId = requestAnimationFrame(() => {
      state.clampRafId = 0;
      clampFloaterPosition();
    });
  });
}

/** 重置浮窗到初始右下角位置 */
export function resetFloaterPosition() {
  if (!state.floater) return;
  state.floaterAnchorX = null;
  if (state.clampRafId) { cancelAnimationFrame(state.clampRafId); state.clampRafId = 0; }
  state.floater.style.transition = 'none';
  state.floater.style.left = '';
  state.floater.style.top = '';
  state.floater.style.transform = '';
  state.floater.style.bottom = `${FLOATER_MARGIN}px`;
  state.floater.style.right = `${FLOATER_MARGIN}px`;
  void state.floater.offsetHeight;
}

