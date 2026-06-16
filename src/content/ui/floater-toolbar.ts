import { state } from '../state';
import { t } from '../i18n';
import { ICON } from './icons';
import { qsInput, asHtmlEl } from '../utils/dom';
import { syncEditDraftFromDom, updateEditWindowButtons, updateEditDialogHeaderTitle } from './editor';

export function updateSelAllButton() {
  const selBtn = document.getElementById('__lh_f_selall');
  const delBtn = document.getElementById('__lh_f_del_sel');
  if (!selBtn) return;
  const total = state.modules.length;
  const checked = state.selectedModuleIds.size;
  if (checked === 0) {
    selBtn.innerHTML = `${ICON.check} ${t('selectAll')}`;
    selBtn.style.opacity = '0.6';
  } else if (checked === total) {
    selBtn.innerHTML = `${ICON.close} ${t('deselectAll')}`;
    selBtn.style.opacity = '1';
  } else {
    selBtn.innerHTML = `${ICON.check} ${t('selectedCount', checked, total)}`;
    selBtn.style.opacity = '1';
    selBtn.style.color = '#f08c00';
  }
  if (delBtn) delBtn.style.opacity = checked > 0 ? '1' : '0.4';
}

// ---- 语言切换时刷新浮窗静态文字 ----
export function applyLanguageToFloater() {
  const f = document.getElementById('__lh_f');
  if (!f) return;
  // 标题
  const titleSpan = f.querySelector('#__lh_f_h span');
  if (titleSpan) titleSpan.innerHTML = `<svg viewBox="0 0 18 18" width="16" height="16" fill="none" stroke="#f08c00" stroke-width="1.5"><path d="M9 3v12M3 9h12"/><circle cx="9" cy="9" r="7"/></svg> ${t('floaterTitle')}`;
  // 工具栏按钮
  const btnAdd = document.getElementById('__lh_f_add');
  if (btnAdd) { btnAdd.innerHTML = `${ICON.plus} ${t('addModule')}`; btnAdd.dataset.tip = t('addModule'); }
  const btnExpand = document.getElementById('__lh_f_expand');
  if (btnExpand) btnExpand.dataset.tip = t('expandCollapse');
  const btnSel = document.getElementById('__lh_f_selall');
  if (btnSel) btnSel.dataset.tip = t('selectAll');
  const btnDel = document.getElementById('__lh_f_del_sel');
  if (btnDel) { btnDel.innerHTML = `${ICON.trash} ${t('deleteSelected')}`; btnDel.dataset.tip = t('deleteSelected'); }
  const btnPrev = document.getElementById('__lh_f_preview');
  if (btnPrev) { btnPrev.innerHTML = `${ICON.eye} ${t('preview')}`; btnPrev.dataset.tip = t('previewModule'); }
  const btnCopy = document.getElementById('__lh_f_copy');
  if (btnCopy) { btnCopy.innerHTML = `${ICON.copy} ${t('copy')}`; btnCopy.dataset.tip = t('copy'); }
  const btnDl = document.getElementById('__lh_f_download');
  if (btnDl) { btnDl.innerHTML = `${ICON.download} ${t('download')}`; btnDl.dataset.tip = t('download'); }
  const btnX = document.getElementById('__lh_f_x');
  if (btnX) btnX.dataset.tip = t('close');
  updateSelAllButton();
}

export function applyLanguageToEditDialog() {
  if (!state.editDialogState) return;
  syncEditDraftFromDom();
  const shell = state.editDialogState.shell;
  updateEditWindowButtons();
  shell.querySelector('#__lh_edit_x')?.setAttribute('data-tip', t('close'));
  const titleLabel = shell.querySelector('#__lh_edit_title_label');
  if (titleLabel) titleLabel.textContent = t('title');
  const titleInp = qsInput(shell, '#__lh_edit_title');
  if (titleInp) titleInp.placeholder = t('titlePlaceholder');
  const pickTitleBtn = asHtmlEl(shell.querySelector('#__lh_edit_pick_title'));
  if (pickTitleBtn) {
    pickTitleBtn.dataset.tip = t('pickTitle');
    pickTitleBtn.innerHTML = `${ICON.target} ${t('pick')}`;
  }
  const contentLabel = shell.querySelector('#__lh_edit_content_label');
  if (contentLabel) contentLabel.remove();
  const addBtn = asHtmlEl(shell.querySelector('#__lh_edit_add'));
  if (addBtn) {
    addBtn.innerHTML = `${ICON.add} ${t('addEntry')}`;
    addBtn.dataset.tip = t('addEntry');
  }
  shell.querySelector('#__lh_edit_cancel')?.setAttribute('data-tip', t('cancel'));
  shell.querySelector('#__lh_edit_save')?.setAttribute('data-tip', t('save'));
  const expandBtn = asHtmlEl(shell.querySelector('#__lh_edit_expand'));
  if (expandBtn) {
    expandBtn.innerHTML = `${ICON.up}${ICON.down} ${t('expandCollapse')}`;
    expandBtn.dataset.tip = t('expandCollapse');
  }
  const cancelBtn = shell.querySelector('#__lh_edit_cancel');
  const saveBtn = shell.querySelector('#__lh_edit_save');
  if (cancelBtn) cancelBtn.textContent = t('cancel');
  if (saveBtn) saveBtn.textContent = t('save');
  state.editDialogState.renderContents?.();
  if (titleInp) titleInp.value = state.editDialogState.draft.title;
  updateEditDialogHeaderTitle();
}

