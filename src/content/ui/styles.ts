/** 浮层样式、按钮常量、Tooltip */
import { state } from '../state';
import { eventTargetEl, asHtmlEl } from '../utils/dom';
import { t } from '../i18n';
import { ICON } from './icons';

export const Z_FLOATER = 2147483647;
export const Z_EDIT = 2147483648;
export const Z_EDIT_TOAST = 2147483649;

export const LH_UI_CSS = `
@keyframes lhFadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
.lh-scrollbar::-webkit-scrollbar{width:6px;height:6px}
.lh-scrollbar::-webkit-scrollbar-track{background:transparent}
.lh-scrollbar::-webkit-scrollbar-thumb{background:#373a40;border-radius:3px}
.lh-scrollbar::-webkit-scrollbar-thumb:hover{background:#5c5f66}
.lh-scrollbar{scrollbar-width:thin;scrollbar-color:#373a40 transparent}
#__lh_f .lh-scrollbar::-webkit-scrollbar,#__lh_edit .lh-scrollbar::-webkit-scrollbar,#__lh_f textarea.lh-scrollbar::-webkit-scrollbar,#__lh_edit textarea.lh-scrollbar::-webkit-scrollbar{width:6px;height:6px}
#__lh_f .lh-scrollbar::-webkit-scrollbar-track,#__lh_edit .lh-scrollbar::-webkit-scrollbar-track,#__lh_f textarea.lh-scrollbar::-webkit-scrollbar-track,#__lh_edit textarea.lh-scrollbar::-webkit-scrollbar-track{background:transparent}
#__lh_f .lh-scrollbar::-webkit-scrollbar-thumb,#__lh_edit .lh-scrollbar::-webkit-scrollbar-thumb,#__lh_f textarea.lh-scrollbar::-webkit-scrollbar-thumb,#__lh_edit textarea.lh-scrollbar::-webkit-scrollbar-thumb{background:#373a40;border-radius:3px}
#__lh_f .lh-scrollbar::-webkit-scrollbar-thumb:hover,#__lh_edit .lh-scrollbar::-webkit-scrollbar-thumb:hover,#__lh_f textarea.lh-scrollbar::-webkit-scrollbar-thumb:hover,#__lh_edit textarea.lh-scrollbar::-webkit-scrollbar-thumb:hover{background:#5c5f66}
#__lh_f .lh-scrollbar,#__lh_edit .lh-scrollbar,#__lh_f textarea.lh-scrollbar,#__lh_edit textarea.lh-scrollbar{scrollbar-width:thin;scrollbar-color:#373a40 transparent}
#__lh_f button,#__lh_edit button{transition:filter .15s ease,transform .15s ease,box-shadow .15s ease,background .15s ease,border-color .15s ease}
#__lh_f button:not(:disabled):hover,#__lh_edit button:not(:disabled):hover{filter:brightness(1.12);box-shadow:0 2px 8px rgba(0,0,0,.22)}
#__lh_f button:not(:disabled):state.active,#__lh_edit button:not(:disabled):state.active{filter:brightness(.94);transform:scale(.98);box-shadow:none}
#__lh_f button[style*="transparent"]:not(:disabled):hover,#__lh_edit button[style*="transparent"]:not(:disabled):hover{filter:none;background:rgba(255,255,255,.1)!important}
#__lh_f button[style*="rgba(255,255,255,0.06)"]:not(:disabled):hover,#__lh_edit button[style*="rgba(255,255,255,0.06)"]:not(:disabled):hover{filter:none;background:rgba(255,255,255,.12)!important}
#__lh_f button[style*="#e03131"][style*="transparent"]:not(:disabled):hover,#__lh_edit button[style*="#e03131"][style*="transparent"]:not(:disabled):hover{filter:none;background:rgba(224,49,49,.18)!important}
.lh-btn-group{display:inline-flex;align-items:center;gap:4px;flex-shrink:0}
.lh-btn-fuse{display:inline-flex;align-items:stretch;flex-shrink:0;border-radius:6px;overflow:hidden}
.lh-btn-fuse>button{border-radius:0!important;margin:0!important}
.lh-vsep{width:1px;height:16px;background:#373a40;flex-shrink:0;margin:0 4px;align-self:center}
.lh-label,.lh-field-label{font-size:13px;color:#909296;font-weight:500;white-space:nowrap;text-align:left}
.lh-field-block{display:flex;flex-direction:column;align-items:stretch;text-align:left;margin-bottom:12px;flex-shrink:0}
.lh-field-label{margin-bottom:6px}
.lh-section-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-shrink:0}
.lh-plain-row{display:flex;align-items:center;gap:8px;margin-bottom:0;flex-shrink:0;min-width:0;justify-content:flex-start}
.lh-plain-input,.lh-plain-textarea,.lh-edit-ta{background:#141517;border:1px solid #373a40;border-radius:6px;padding:8px 10px;font-size:13px;color:#e0e0e0;outline:none;transition:border-color .15s ease,box-shadow .15s ease;box-sizing:border-box;text-align:left}
.lh-plain-textarea,.lh-edit-ta{color:#c1c2c5}
.lh-plain-input::placeholder,.lh-plain-textarea::placeholder,.lh-edit-ta::placeholder{color:rgba(255,255,255,.88);opacity:1}
.lh-plain-input:focus,.lh-plain-textarea:focus,.lh-edit-ta:focus{border-color:#f08c00;box-shadow:0 0 0 1px rgba(240,140,0,.28);color:#fff}
.lh-hint-text{color:rgba(255,255,255,.88)}
.lh-plain-input{flex:1;min-width:0}
.lh-plain-textarea{width:100%;resize:vertical;font-family:inherit;line-height:1.5;min-height:48px}
.lh-edit-ta{border-radius:0;border-right:1px solid #373a40;resize:none;font-family:Consolas,Monaco,'Courier New',monospace;line-height:1.6}
.lh-edit-split .lh-edit-ta{border:none;border-right:1px solid #373a40;box-shadow:none!important}
.lh-edit-split .lh-edit-ta:focus{border:none;border-right:1px solid #373a40;box-shadow:none!important;color:#fff}
.lh-content-entry{margin-bottom:12px;text-align:left}
.lh-entry-hdr{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px}
.lh-entries-list{display:flex;flex-direction:column;align-items:stretch;text-align:left}
.lh-module-scroll{flex:1;min-height:0;overflow-y:auto}
.lh-add-entry-bar{padding:8px 0 0;flex-shrink:0;border-top:1px solid rgba(255,255,255,.06);margin-top:8px}
.lh-add-entry-btn{width:100%;justify-content:center;border-radius:6px;flex-shrink:0;box-sizing:border-box;margin-top:0}
.lh-add-entry-btn:hover{filter:none!important;background:rgba(43,138,62,.28)!important;border-color:rgba(43,138,62,.55)!important}
.lh-module-card{background:#25262b;border:1px solid #373a40;border-radius:8px;margin-bottom:8px;overflow:hidden;transition:opacity .25s ease,filter .25s ease,border-color .2s ease,box-shadow .2s ease,transform .2s ease}
.lh-module-card.lh-module-focused{border-color:#f08c00;box-shadow:0 0 0 1px rgba(240,140,0,.2);opacity:1;filter:none}
.lh-module-card.lh-module-dimmed{opacity:.38;filter:saturate(.6)}
.lh-module-card.lh-dragging{opacity:.45;transform:scale(.97);filter:none}
.lh-module-card.drag-over{border-color:#f08c00!important;box-shadow:0 0 0 1px rgba(240,140,0,.3)!important;opacity:1;filter:none}
.lh-edit-title-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px}
.lh-edit-entry{margin-bottom:12px;display:flex;flex-direction:column}
.lh-edit-entry-hdr{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 0 6px;flex-shrink:0;cursor:pointer;user-select:none}
.lh-edit-entry-chevron{font-size:10px;color:#909296;flex-shrink:0;transition:transform .2s;width:12px}
.lh-edit-entry-hdr.is-open .lh-edit-entry-chevron{transform:rotate(90deg)}
.lh-edit-md-toolbar{display:flex;flex-wrap:wrap;align-items:center;padding:4px 0 6px;flex-shrink:0;gap:0}
.lh-edit-entry-body{display:flex;flex-direction:column;flex-shrink:0;overflow:hidden}
.lh-edit-split{flex:1;min-height:0;display:flex;overflow:hidden;border:1px solid #373a40;border-radius:6px;overflow:hidden}
.lh-edit-split:focus-within{border-color:#f08c00;box-shadow:0 0 0 1px rgba(240,140,0,.28)}
.lh-edit-resize{height:6px;cursor:ns-resize;background:transparent;flex-shrink:0;position:relative;margin-top:4px}
.lh-edit-resize::after{content:'';position:absolute;left:20%;right:20%;top:2px;height:2px;background:#373a40;border-radius:1px;transition:background .15s}
.lh-edit-resize:hover::after{background:#5c5f66}
#__lh_f .lh-module-body button:not(:disabled):hover,#__lh_edit .lh-edit-entry-hdr button:not(:disabled):hover,#__lh_edit .lh-edit-md-toolbar button:not(:disabled):hover{box-shadow:none!important;transform:none!important}
`.trim();

export function ensureLhFloatTip() {
  if (state.lhFloatTipEl) return state.lhFloatTipEl;
  state.lhFloatTipEl = document.createElement('div');
  state.lhFloatTipEl.id = '__lh_tip_float';
  Object.assign(state.lhFloatTipEl.style, {
    position: 'fixed', zIndex: '2147483647', pointerEvents: 'none', display: 'none',
    padding: '5px 9px', fontSize: '11px', color: '#c1c2c5', background: '#25262b',
    border: '1px solid #373a40', borderRadius: '5px', whiteSpace: 'nowrap',
    boxShadow: '0 2px 8px rgba(0,0,0,.3)', maxWidth: '320px', lineHeight: '1.4',
    fontFamily: '-apple-system,BlinkMacSystemFont,\'PingFang SC\',sans-serif',
  });
  document.body.appendChild(state.lhFloatTipEl);
  return state.lhFloatTipEl;
}

export function positionLhFloatTip(btn: HTMLButtonElement): void {
  const tip = ensureLhFloatTip();
  tip.style.display = 'block';
  const rect = btn.getBoundingClientRect();
  const tipW = tip.offsetWidth;
  const tipH = tip.offsetHeight;
  let top = rect.top - tipH - 8;
  let left = rect.left + rect.width / 2 - tipW / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - tipW - 8));
  if (top < 8) top = rect.bottom + 8;
  tip.style.top = `${top}px`;
  tip.style.left = `${left}px`;
}

export function showLhFloatTip(btn: HTMLButtonElement): void {
  if (!btn || btn.disabled) return;
  const text = btn.getAttribute('data-tip');
  if (!text) return;
  state.lhFloatTipTarget = btn;
  const tip = ensureLhFloatTip();
  tip.textContent = text;
  positionLhFloatTip(btn);
}

export function hideLhFloatTip() {
  state.lhFloatTipTarget = null;
  if (state.lhFloatTipEl) state.lhFloatTipEl.style.display = 'none';
}

export function initLhTooltipSystem() {
  if (state.lhTooltipInited || state.frameCtx !== 'top') return;
  state.lhTooltipInited = true;
  document.addEventListener('pointerover', (e) => {
    const target = eventTargetEl(e);
    if (!target) { hideLhFloatTip(); return; }
    const root = target.closest('#__lh_f, #__lh_edit, #__lh_toast, #__lh_tip');
    if (!root) { hideLhFloatTip(); return; }
    const btn = target.closest('[data-tip]');
    if (btn instanceof HTMLButtonElement && root.contains(btn) && !btn.disabled) showLhFloatTip(btn);
    else hideLhFloatTip();
  }, true);
  document.addEventListener('pointerout', (e) => {
    const target = eventTargetEl(e);
    if (!target) return;
    const btn = target.closest('[data-tip]');
    if (!(btn instanceof HTMLElement)) return;
    const rel = e.relatedTarget;
    if (rel instanceof Node && btn.contains(rel)) return;
    if (asHtmlEl(rel)?.closest?.('[data-tip]') === btn) return;
    hideLhFloatTip();
  }, true);
  document.addEventListener('scroll', () => {
    if (state.lhFloatTipTarget instanceof HTMLButtonElement) positionLhFloatTip(state.lhFloatTipTarget);
  }, true);
}

export function ensureLhUiStyles() {
  let st = document.getElementById('__lh_ui_styles');
  if (!st) {
    st = document.createElement('style');
    st.id = '__lh_ui_styles';
    document.head.appendChild(st);
  }
  st.textContent = LH_UI_CSS;
}

const BTN = 'border:none;border-radius:6px;font-size:12px;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;justify-content:center;gap:4px;font-weight:500;transition:opacity 0.15s ease,background 0.15s ease;line-height:1;box-sizing:border-box;';
const BTN_ICON = `${BTN}padding:0;width:28px;height:28px;min-width:28px;font-size:11px;`;
const BTN_ICON_XS = `${BTN}padding:0;width:24px;height:24px;min-width:24px;font-size:10px;`;
const BTN_SM = `${BTN}padding:0 10px;height:28px;font-size:11px;`;
const BTN_XS = `${BTN}padding:0 8px;height:24px;font-size:10px;`;
const BTN_MD = `${BTN}padding:0 16px;height:32px;`;
export const BTN_DISABLED = 'opacity:0.35;cursor:default;pointer-events:none;';
const BTN_TB = `${BTN}padding:0 12px;height:28px;min-height:28px;font-size:11px;`;
export const BTN_NEUTRAL_XS = `background:#373a40;color:#909296;${BTN_ICON_XS}`;
export const BTN_ACCENT_ICON_XS = `background:#f08c00;color:#fff;${BTN_ICON_XS}`;
export const BTN_GHOST = `background:transparent;color:#909296;border:1px solid rgba(255,255,255,0.1);${BTN_ICON}`;
export const EDIT_WIN_BTN = BTN_GHOST;
export const BTN_DANGER = `background:transparent;color:#e03131;border:1px solid #e03131;${BTN_ICON}`;
export const BTN_DANGER_XS = `background:transparent;color:#e03131;border:1px solid #e03131;${BTN_ICON_XS}`;
export const BTN_DANGER_SM = `background:#e03131;color:#fff;${BTN_SM}`;
export const BTN_MOD_EDIT = `background:#1098ad;color:#fff;${BTN_ICON_XS}`;
export const BTN_MOD_PREVIEW = `background:#228be6;color:#fff;${BTN_ICON_XS}`;
export const BTN_MOD_COPY = `background:#7950f2;color:#fff;${BTN_ICON_XS}`;
export const BTN_MOD_DOWNLOAD = `background:#2b8a3e;color:#fff;${BTN_ICON_XS}`;
export const BTN_PREVIEW = `background:#228be6;color:#fff;${BTN_SM}`;
export const BTN_COPY = `background:#7950f2;color:#fff;${BTN_SM}`;
export const BTN_DOWNLOAD = `background:#2b8a3e;color:#fff;${BTN_SM}`;
export const BTN_EDIT = `background:#1098ad;color:#fff;${BTN_SM}`;
export const BTN_PREVIEW_LG = `background:#228be6;color:#fff;${BTN_MD}`;
export const BTN_COPY_LG = `background:#7950f2;color:#fff;${BTN_MD}`;
export const BTN_DOWNLOAD_LG = `background:#2b8a3e;color:#fff;${BTN_MD}`;
export const BTN_SAVE = `background:#1098ad;color:#fff;${BTN_MD}`;
export const BTN_CANCEL = `background:#373a40;color:#c1c2c5;${BTN_MD}`;
export const BTN_TOOL = `background:#373a40;color:#c1c2c5;${BTN_SM}`;
export const BTN_TOOL_XS = `background:#373a40;color:#c1c2c5;${BTN_XS}`;
export const BTN_TOOL_ICON = `background:#373a40;color:#c1c2c5;${BTN_ICON}`;
export const BTN_TOOL_ICON_XS = `background:#373a40;color:#c1c2c5;${BTN_ICON_XS}`;
export const BTN_TOOL_ACTIVE = `background:#1098ad;color:#fff;${BTN_SM}`;
export const BTN_TOOL_ACTIVE_XS = `background:#1098ad;color:#fff;${BTN_XS}`;
export const BTN_ACCENT = `background:#f08c00;color:#fff;${BTN_SM}`;
export const BTN_ACCENT_XS = `background:#f08c00;color:#fff;${BTN_XS}`;
export const BTN_MUTED = `background:rgba(255,255,255,0.06);color:#909296;${BTN_SM}`;
export const BTN_TB_MUTED = `background:rgba(255,255,255,0.06);color:#909296;${BTN_TB}`;
export const BTN_TB_DANGER = `background:#e03131;color:#fff;${BTN_TB}`;
export const BTN_ADD_ENTRY = `background:rgba(43,138,62,0.18);color:#8ce99a;border:1px solid rgba(43,138,62,0.35);${BTN_SM}width:100%;justify-content:center;border-radius:6px;box-sizing:border-box;`;

export const EDIT_ENTRY_DEFAULT_H = 400;
export const EDIT_ENTRY_MIN_H = 120;

/** 浮动面板初始 HTML（依赖当前语言文案） */
export function getFloaterHTML(): string {
  return `
<div id="__lh_f" style="all:initial;position:fixed;z-index:2147483647;bottom:20px;right:20px;
width:440px;max-height:70vh;background:#1a1b1e;border:1px solid rgba(255,255,255,0.08);border-radius:10px;
box-shadow:0 12px 40px rgba(0,0,0,0.45);font:13px -apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;
color:#c1c2c5;display:none;flex-direction:column;">
 <div id="__lh_f_h" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;
  background:#25262b;border-bottom:1px solid rgba(255,255,255,0.06);border-radius:10px 10px 0 0;cursor:move;user-select:none;">
  <span style="color:#f08c00;font-weight:600;font-size:13px;display:flex;align-items:center;gap:6px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
    <svg viewBox="0 0 18 18" width="16" height="16" fill="none" stroke="#f08c00" stroke-width="1.5" style="flex-shrink:0;">
      <path d="M9 3v12M3 9h12"/><circle cx="9" cy="9" r="7"/>
    </svg> ${t('floaterTitle')}</span>
  <button id="__lh_f_x" data-tip="${t('close')}" style="${BTN_GHOST}">${ICON.close}</button>
</div>
<div id="__lh_f_tb" style="display:flex;align-items:center;gap:6px;padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.04);flex-wrap:wrap;">
  <div class="lh-btn-group">
    <button id="__lh_f_add" data-tip="${t('addModule')}" style="${BTN_ACCENT}">${ICON.plus} ${t('addModule')}</button>
    <button id="__lh_f_expand" data-tip="${t('expandCollapse')}" style="${BTN_MUTED}">${ICON.up}${ICON.down}</button>
  </div>
  <span style="flex:1;min-width:8px;"></span>
  <div class="lh-btn-group">
    <button id="__lh_f_selall" data-tip="${t('selectAll')}" style="${BTN_TB_MUTED}">${ICON.check} ${t('selectAll')}</button>
    <button id="__lh_f_del_sel" data-tip="${t('deleteSelected')}" style="${BTN_TB_DANGER}">${ICON.trash} ${t('deleteSelected')}</button>
  </div>
</div>
<div id="__lh_f_list" class="lh-scrollbar" style="flex:1;overflow-y:auto;padding:10px 14px;min-height:100px;"></div>
<div id="__lh_f_ft" style="display:flex;align-items:center;gap:6px;padding:10px 14px;border-top:1px solid rgba(255,255,255,0.04);">
  <button id="__lh_f_preview" data-tip="${t('previewModule')}" style="${BTN_PREVIEW_LG}">${ICON.eye} ${t('preview')}</button>
  <button id="__lh_f_copy" data-tip="${t('copy')}" style="${BTN_COPY_LG}">${ICON.copy} ${t('copy')}</button>
  <button id="__lh_f_download" data-tip="${t('download')}" style="${BTN_DOWNLOAD_LG}">${ICON.download} ${t('download')}</button>
  <span id="__lh_f_status" class="lh-hint-text" style="flex:1;text-align:right;font-size:11px;line-height:32px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"></span>
</div>
</div>`;
}
