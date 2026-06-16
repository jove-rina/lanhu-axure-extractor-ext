import { state } from '../state';
import { t } from '../i18n';
import { findContainer, extractFromEl } from '../extract/element';
import { highlightEl, hideHighlight } from './highlight';
import { onMouseDown, onMouseMove, onMouseUp } from './mouse-events';
import { setStatus } from '../ui/floater-status';
import {
  highlightEditPickTarget, updateEditWindowButtons, updateEditDialogHeaderTitle,
  showEditToast, restoreEditDialog,
} from '../ui/editor';
import { renderModuleList } from '../ui/floater-list';
import { saveModules } from '../modules/manager';
import { isExtensionContextValid } from '../utils/extension-context';
import { asHtmlEl, qsInput, qsTextArea, topWindow } from '../utils/dom';
import type { PickField } from '../types';

export interface StartPickOptions {
  fromEdit?: boolean;
}

export function startPick(mId: number, field: PickField, entryIdx?: number, _opts: StartPickOptions = {}): void {
  state.activePickField = { moduleId: mId, field, entryIdx };
  state.pickMode = true;

  document.addEventListener('mousedown', onMouseDown, true);
  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('mouseup', onMouseUp, true);
  document.body.style.cursor = 'crosshair';
  document.body.style.userSelect = 'none';

  if (state.frameCtx === 'top') {
    setStatus(t('pickActive'));
    document.querySelectorAll('[id^="__lh_mt_"],[id^="__lh_mc_"]').forEach(el => {
      const htmlEl = asHtmlEl(el);
      if (htmlEl) htmlEl.style.borderColor = '#373a40';
    });
    if (state.editDialogState && state.editDialogState.moduleId === mId) {
      highlightEditPickTarget(field, entryIdx);
    } else {
      const targetId = field === 'title' ? `__lh_mt_${mId}` : `__lh_mc_${mId}_${entryIdx}`;
      const inp = document.getElementById(targetId);
      if (inp) inp.style.borderColor = '#f08c00';
    }
    hideHighlight();
    state.selectionLocked = false;
    console.log('[蓝湖] 顶层拾取激活, 通知 background 广播到所有 frame');
    if (isExtensionContextValid()) {
      chrome.runtime.sendMessage({
        action: 'sync-pick-state',
        moduleId: mId,
        field: field,
        entryIdx: entryIdx
      }).catch(() => {});
    }
    const msg = { type: '__lh_sync_pick', moduleId: mId, field, entryIdx };
    document.querySelectorAll('iframe').forEach(f => {
      try { f.contentWindow?.postMessage(msg, '*'); } catch (e) {
        console.log('[蓝湖] postMessage 到 iframe 失败:', e instanceof Error ? e.message : String(e));
      }
    });
  } else {
    document.body.style.cursor = 'crosshair';
    document.body.style.userSelect = 'none';
    hideHighlight();
    state.selectionLocked = false;
    console.log('[蓝湖] iframe 直接进入拾取模式');
  }
}

export function finishPick(md: string): void {
  if (!state.activePickField) return;
  const { moduleId, field, entryIdx } = state.activePickField;

  if (state.editDialogState && state.editDialogState.moduleId === moduleId) {
    const { draft } = state.editDialogState;
    if (field === 'title') {
      draft.title = md;
    } else if (entryIdx !== undefined && draft.contents[entryIdx] !== undefined) {
      draft.contents[entryIdx] = md;
    } else {
      draft.contents.push(md);
    }
    state.editDialogState.pickMinimized = false;
    updateEditDialogHeaderTitle();
    showEditToast(t(field === 'title' ? 'pickFilledTitle' : 'pickFilledContent'));
    updateEditWindowButtons();
    hideHighlight();
    document.removeEventListener('mousedown', onMouseDown, true);
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('mouseup', onMouseUp, true);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    if (state.frameCtx === 'top') {
      state.editDialogState.shell.querySelectorAll('.lh-edit-pick-target').forEach(el => {
        const htmlEl = asHtmlEl(el);
        if (htmlEl) {
          htmlEl.style.outline = '';
          htmlEl.style.borderColor = '#373a40';
        }
      });
      if (isExtensionContextValid()) {
        chrome.runtime.sendMessage({ action: 'cancel-pick-state' }).catch(() => {});
      }
      document.querySelectorAll('iframe').forEach(f => {
        try { f.contentWindow?.postMessage({ type: '__lh_cancel_pick' }, '*'); } catch {}
      });
    }
    state.activePickField = null;
    state.pickMode = false;
    console.log('[蓝湖] finishPick → 编辑弹窗 draft:', field, entryIdx, md.slice(0, 40));
    return;
  }

  const m = state.modules.find(x => x.id === moduleId);
  if (!m) return;

  if (field === 'title') {
    m.title = md;
    const inp = qsInput(document, `#__lh_mt_${moduleId}`);
    if (inp) inp.value = md;
  } else {
    if (entryIdx !== undefined && m.contents[entryIdx] !== undefined) {
      m.contents[entryIdx] = md;
      const ta = qsTextArea(document, `#__lh_mc_${moduleId}_${entryIdx}`);
      if (ta) ta.value = md;
    } else {
      m.contents.push(md);
      renderModuleList();
    }
  }

  setStatus(t(field === 'title' ? 'pickDoneTitle' : 'pickDoneContent'));
  saveModules();
  hideHighlight();
  document.body.style.cursor = 'crosshair';
  document.body.style.userSelect = 'none';
  console.log('[蓝湖] finishPick 成功:', field, entryIdx, md.slice(0, 40));
}

export function cancelPick(): void {
  if (!state.activePickField) return;
  const { moduleId, field, entryIdx } = state.activePickField;

  if (state.frameCtx === 'top') {
    if (state.editDialogState && state.editDialogState.moduleId === moduleId) {
      state.editDialogState.shell.querySelectorAll('.lh-edit-pick-target').forEach(el => {
        const htmlEl = asHtmlEl(el);
        if (htmlEl) {
          htmlEl.style.outline = '';
          htmlEl.style.borderColor = '#373a40';
        }
      });
    } else {
      const targetId = field === 'title' ? `__lh_mt_${moduleId}` : `__lh_mc_${moduleId}_${entryIdx}`;
      const inp = document.getElementById(targetId);
      if (inp) inp.style.borderColor = '#373a40';
    }
    setStatus('');
    if (isExtensionContextValid()) {
      chrome.runtime.sendMessage({ action: 'cancel-pick-state' }).catch(() => {});
    }
    document.querySelectorAll('iframe').forEach(f => {
      try { f.contentWindow?.postMessage({ type: '__lh_cancel_pick' }, '*'); } catch {}
    });
  }

  document.removeEventListener('mousedown', onMouseDown, true);
  document.removeEventListener('mousemove', onMouseMove, true);
  document.removeEventListener('mouseup', onMouseUp, true);
  document.body.style.cursor = '';
  document.body.style.userSelect = '';

  state.activePickField = null;
  state.pickMode = false;
  console.log('[蓝湖] 取消拾取');
}

/** 双击拾取父级 / 单击拾取元素 */
export function doPickPick(el: Element, pickParent: boolean): void {
  let target: Element;
  if (pickParent) {
    const container = findContainer(el);
    target = container.el ? (container.el.parentElement || container.el) : (el.parentElement || el);
    console.log('[蓝湖] 双击 → 父容器:', target.tagName, (target as HTMLElement).className?.slice(0,40));
  } else {
    target = findContainer(el).el || el;
  }
  console.log('[蓝湖] pick target:', target.tagName, 'parentMode:', pickParent);
  const result = extractFromEl(target);
  console.log('[蓝湖] extract result:', result?.type, result?.markdown?.slice(0, 60));
  if (result.markdown) {
    if (state.frameCtx !== 'top') {
      try {
        topWindow().postMessage({ type: '__lh_picker_result', markdown: result.markdown, sourceType: result.type }, '*');
        console.log('[蓝湖] iframe 结果已发送到顶层');
      } catch { console.log('[蓝湖] 无法发送到顶层'); }
    } else {
      finishPick(result.markdown);
    }
    highlightEl(target);
    state.selectionLocked = true;
    console.log('[蓝湖] pick done, 定位框在:', target.tagName);
  } else {
    setStatus(t('statusPickFail'));
  }
}
