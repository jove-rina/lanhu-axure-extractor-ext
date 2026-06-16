import { state } from '../state';
import { t } from '../i18n';
import { ICON } from './icons';
import { escHtml } from '../utils/dom';
import {
  BTN_MOD_EDIT, BTN_MOD_PREVIEW, BTN_MOD_COPY, BTN_MOD_DOWNLOAD,
  BTN_DANGER_XS, BTN_NEUTRAL_XS, BTN_GHOST, BTN_ACCENT_ICON_XS, BTN_ACCENT_XS,
  BTN_DISABLED, BTN_ADD_ENTRY,
} from './styles';
import { setStatus } from './floater-status';
import { updateSelAllButton } from './floater-toolbar';
import { showModuleEditDialog } from './editor';
import { openPreviewWindow } from './preview';
import { startPick } from '../picker/pick-flow';
import {
  saveModules, setModuleField, setContentEntry, removeModule, moveModule,
  addContentEntry, removeContentEntry, moveContentEntry, scrollToNewEntry,
  ensureModuleFocusHandlers, updateModuleFocusClasses, getModuleMarkdown,
  getModuleDownloadFilename, copyMarkdown, downloadMarkdown,
} from '../modules/manager';
import { scheduleClampFloaterPosition } from './floater-panel';
import { asHtmlEl, asDragEvent, eventTargetEl, qsInput, qsTextArea } from '../utils/dom';
import type { PickField } from '../types';

export function renderModuleList() {
  const list = document.getElementById('__lh_f_list');
  if (!list) return;
  if (state.modules.length === 0) {
    state.focusedModuleId = null;
    list.innerHTML = '<div class="lh-hint-text" style="text-align:center;padding:30px 0;font-size:13px;">' + t('emptyList') + '</div>';
    return;
  }

  list.innerHTML = state.modules.map((m, mi) => {
        const isExpanded = !state.collapsedModuleIds.has(m.id);
        const isSelected = state.selectedModuleIds.has(m.id);
        return `
  <div data-module-id="${m.id}" draggable="true" class="lh-module-card">
    <div class="lh-module-header" style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:#2c2e33;border-bottom:1px solid ${isExpanded ? '#373a40' : 'transparent'};cursor:pointer;user-select:none;">
      <span style="font-size:10px;color:#909296;flex-shrink:0;transition:transform 0.2s;${isExpanded ? 'transform:rotate(90deg);' : ''}">▶</span>
      <input type="checkbox" class="lh-module-cb" data-mid="${m.id}" ${isSelected ? 'checked' : ''}
        style="flex-shrink:0;accent-color:#f08c00;width:14px;height:14px;cursor:pointer;">
      <span style="flex:1;color:#f08c00;font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;">${escHtml(m.title) || `${t('title')} ${mi + 1}`}</span>
      <div class="lh-btn-group">
        <div class="lh-btn-fuse">
          <button data-edit="${m.id}" data-tip="${t('editModule')}" style="${BTN_MOD_EDIT}">${ICON.edit}</button>
          <button data-preview="${m.id}" data-tip="${t('previewModule')}" style="${BTN_MOD_PREVIEW}">${ICON.eye}</button>
          <button data-copy="${m.id}" data-tip="${t('copyModule')}" style="${BTN_MOD_COPY}">${ICON.copy}</button>
          <button data-dlmod="${m.id}" data-tip="${t('downloadModule')}" style="${BTN_MOD_DOWNLOAD}">${ICON.download}</button>
        </div>
        <span class="lh-vsep"></span>
        <div class="lh-btn-fuse">
          <button data-mv="${m.id}" data-dir="-1" data-tip="${t('moveUp')}" style="${BTN_NEUTRAL_XS}${mi === 0 ? BTN_DISABLED : ''}" ${mi === 0 ? 'disabled' : ''}>${ICON.up}</button>
          <button data-mv="${m.id}" data-dir="1" data-tip="${t('moveDown')}" style="${BTN_NEUTRAL_XS}${mi === state.modules.length - 1 ? BTN_DISABLED : ''}" ${mi === state.modules.length - 1 ? 'disabled' : ''}>${ICON.down}</button>
          <button data-rm="${m.id}" data-tip="${t('deleteModule')}" style="${BTN_DANGER_XS}">${ICON.trash}</button>
        </div>
      </div>
    </div>
    <div class="lh-module-body" style="${isExpanded ? 'display:flex;flex-direction:column;' : 'display:none;'}max-height:360px;animation:${isExpanded ? 'lhFadeIn 0.2s ease' : 'none'};">
      <div class="lh-module-scroll lh-scrollbar" style="flex:1;min-height:0;overflow-y:auto;padding:10px 14px 0;">
        <div class="lh-field-block" style="margin-bottom:10px;">
          <span class="lh-field-label">${t('title')}</span>
          <div class="lh-plain-row">
            <input id="__lh_mt_${m.id}" draggable="false" value="${escHtml(m.title)}" placeholder="${t('pick')}" class="lh-plain-input">
            <button data-pick="${m.id}:title" data-tip="${t('pickTitle')}" style="${BTN_ACCENT_XS}">${ICON.target} ${t('pick')}</button>
          </div>
        </div>
        <div class="lh-entries-list">
          ${m.contents.map((c, ci) => `
      <div class="lh-content-entry">
        <div class="lh-entry-hdr">
          <span class="lh-field-label" style="margin:0;">${t('entryLabel', ci + 1)}</span>
          <div class="lh-btn-fuse">
            <button data-pick="${m.id}:content:${ci}" data-tip="${t('pickContent')}" style="${BTN_ACCENT_ICON_XS}">${ICON.target}</button>
            <button data-mvc="${m.id}:${ci}:-1" data-tip="${t('moveUp')}" style="${BTN_NEUTRAL_XS}${ci === 0 ? BTN_DISABLED : ''}" ${ci === 0 ? 'disabled' : ''}>${ICON.up}</button>
            <button data-mvc="${m.id}:${ci}:1" data-tip="${t('moveDown')}" style="${BTN_NEUTRAL_XS}${ci === m.contents.length - 1 ? BTN_DISABLED : ''}" ${ci === m.contents.length - 1 ? 'disabled' : ''}>${ICON.down}</button>
            <button data-rmc="${m.id}:${ci}" data-tip="${t('delete')}" style="${BTN_DANGER_XS}">${ICON.trash}</button>
          </div>
        </div>
        <textarea id="__lh_mc_${m.id}_${ci}" draggable="false" rows="2" placeholder="${t('content')} ${ci+1}" class="lh-scrollbar lh-plain-textarea">${escHtml(c)}</textarea>
      </div>`).join('')}
        </div>
      </div>
      <div class="lh-add-entry-bar" style="padding:8px 14px 10px;">
        <button data-addc="${m.id}" data-tip="${t('addEntry')}" class="lh-add-entry-btn" style="${BTN_ADD_ENTRY}">${ICON.add} ${t('addEntry')}</button>
      </div>
    </div>
    <div class="lh-drop-indicator" style="height:2px;background:#f08c00;display:none;"></div>
  </div>`}).join('');

  // ---- 展开/收起 ----
  list.querySelectorAll('.lh-module-header').forEach(hd => {
    hd.addEventListener('click', (e) => {
      const target = eventTargetEl(e);
      if (!target) return;
      if (target.tagName === 'BUTTON' || target.tagName === 'INPUT') return;
      const card = target.closest('[data-module-id]');
      if (!(card instanceof HTMLElement)) return;
      const mid = parseInt(card.dataset.moduleId ?? '', 10);
      state.focusedModuleId = mid;
      // 切换当前模块的展开/收起，不影响其他模块
      if (state.collapsedModuleIds.has(mid)) {
        state.collapsedModuleIds.delete(mid); // 展开
      } else {
        state.collapsedModuleIds.add(mid); // 收起
      }
      renderModuleList();
      scheduleClampFloaterPosition();
    });
  });

  // ---- 复选框 ---- (含全选按钮中间态)
  list.querySelectorAll('.lh-module-cb').forEach(cb => {
    cb.addEventListener('change', () => {
      const htmlCb = cb instanceof HTMLInputElement ? cb : null;
      if (!htmlCb) return;
      const mid = parseInt(htmlCb.dataset.mid ?? '', 10);
      if (htmlCb.checked) state.selectedModuleIds.add(mid);
      else state.selectedModuleIds.delete(mid);
      updateSelAllButton();
    });
  });

  updateSelAllButton();

  // ---- 拖拽（已优化：CSS 过渡 + rAF 节流） ----
  let dragRAF: number | null = null;
  list.querySelectorAll('[data-module-id]').forEach(card => {
    const htmlCard = asHtmlEl(card);
    if (!htmlCard) return;
    card.addEventListener('dragstart', (e) => {
      const dragEvent = asDragEvent(e);
      if (!dragEvent?.dataTransfer) return;
      dragEvent.dataTransfer.setData('text/plain', htmlCard.dataset.moduleId ?? '');
      dragEvent.dataTransfer.effectAllowed = 'move';
      htmlCard.classList.add('lh-dragging');
      state.collapsedModuleIds = new Set(state.modules.map(m => m.id));
      list.querySelectorAll('.lh-module-body').forEach(b => {
        const body = asHtmlEl(b);
        if (body) body.style.display = 'none';
      });
    });
    card.addEventListener('dragend', () => {
      htmlCard.classList.remove('lh-dragging');
      list.querySelectorAll('.lh-drop-indicator').forEach(ind => {
        const el = asHtmlEl(ind);
        if (el) el.style.display = 'none';
      });
      list.querySelectorAll('.lh-module-card.drag-over').forEach(c => c.classList.remove('drag-over'));
      if (dragRAF) { cancelAnimationFrame(dragRAF); dragRAF = null; }
    });
    card.addEventListener('dragover', (e) => {
      const dragEvent = asDragEvent(e);
      if (!dragEvent) return;
      dragEvent.preventDefault();
      if (dragEvent.dataTransfer) dragEvent.dataTransfer.dropEffect = 'move';
      if (dragRAF) return;
      dragRAF = requestAnimationFrame(() => {
        dragRAF = null;
        const draggedId = parseInt(dragEvent.dataTransfer?.getData('text/plain') ?? '-1', 10);
        if (isNaN(draggedId)) return;
        list.querySelectorAll('.lh-drop-indicator').forEach(ind => {
          const el = asHtmlEl(ind);
          if (el) el.style.display = 'none';
        });
        list.querySelectorAll('.lh-module-card.drag-over').forEach(c => c.classList.remove('drag-over'));
        const indicator = htmlCard.querySelector('.lh-drop-indicator');
        const indEl = asHtmlEl(indicator);
        if (indEl && parseInt(htmlCard.dataset.moduleId ?? '', 10) !== draggedId) {
          indEl.style.display = 'block';
          htmlCard.classList.add('drag-over');
        }
      });
    });
    card.addEventListener('dragleave', (e) => {
      const dragEvent = asDragEvent(e);
      if (!dragEvent) return;
      if (!htmlCard.contains(dragEvent.relatedTarget as Node | null)) {
        const indicator = htmlCard.querySelector('.lh-drop-indicator');
        const indEl = asHtmlEl(indicator);
        if (indEl) indEl.style.display = 'none';
        htmlCard.classList.remove('drag-over');
      }
    });
    card.addEventListener('drop', (e) => {
      const dragEvent = asDragEvent(e);
      if (!dragEvent?.dataTransfer) return;
      dragEvent.preventDefault();
      const fromId = parseInt(dragEvent.dataTransfer.getData('text/plain'), 10);
      const toId = parseInt(htmlCard.dataset.moduleId ?? '', 10);
      if (isNaN(fromId) || fromId === toId) return;
      const fromIdx = state.modules.findIndex(m => m.id === fromId);
      const toIdx = state.modules.findIndex(m => m.id === toId);
      if (fromIdx < 0 || toIdx < 0) return;
      const [moved] = state.modules.splice(fromIdx, 1);
      const insertAt = fromIdx < toIdx ? toIdx - 1 : toIdx;
      state.modules.splice(insertAt < 0 ? 0 : insertAt, 0, moved);
      list.querySelectorAll('.lh-drop-indicator').forEach(ind => {
        const el = asHtmlEl(ind);
        if (el) el.style.display = 'none';
      });
      list.querySelectorAll('.lh-module-card.drag-over').forEach(c => c.classList.remove('drag-over'));
      renderModuleList();
      saveModules();
    });
  });

  // ---- 按钮事件 ----
  list.querySelectorAll('[data-pick]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const htmlBtn = asHtmlEl(btn);
      if (!htmlBtn?.dataset.pick) return;
      const parts = htmlBtn.dataset.pick.split(':');
      const mid = parseInt(parts[0], 10);
      const field = parts[1] as PickField;
      const entryIdx = parts[2] !== undefined ? parseInt(parts[2]) : undefined;
      state.collapsedModuleIds.delete(mid);
      renderModuleList();
      startPick(mid, field, entryIdx);
    });
  });
  list.querySelectorAll('[data-rm]').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); removeModule(parseInt(asHtmlEl(btn)?.dataset.rm ?? '', 10)); });
  });
  list.querySelectorAll('[data-mv]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const htmlBtn = asHtmlEl(btn);
      if (!htmlBtn) return;
      moveModule(parseInt(htmlBtn.dataset.mv ?? '', 10), parseInt(htmlBtn.dataset.dir ?? '', 10));
    });
  });
  list.querySelectorAll('[data-addc]').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); addContentEntry(parseInt(asHtmlEl(btn)?.dataset.addc ?? '', 10)); });
  });
  list.querySelectorAll('[data-rmc]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const p = asHtmlEl(btn)?.dataset.rmc?.split(':');
      if (p) removeContentEntry(parseInt(p[0], 10), parseInt(p[1], 10));
    });
  });
  list.querySelectorAll('[data-mvc]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const p = asHtmlEl(btn)?.dataset.mvc?.split(':');
      if (p) moveContentEntry(parseInt(p[0], 10), parseInt(p[1], 10), parseInt(p[2], 10));
    });
  });
  list.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const mid = parseInt(asHtmlEl(btn)?.dataset.edit ?? '', 10);
      state.focusedModuleId = mid;
      showModuleEditDialog(mid);
    });
  });
  list.querySelectorAll('[data-preview]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const mid = parseInt(asHtmlEl(btn)?.dataset.preview ?? '', 10);
      const m = state.modules.find(x => x.id === mid);
      if (!m) return;
      const md = getModuleMarkdown(m);
      if (!md) { setStatus(t('statusNoModuleContent')); return; }
      openPreviewWindow(m.title || t('modulePreview'), md);
    });
  });
  list.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const mid = parseInt(asHtmlEl(btn)?.dataset.copy ?? '', 10);
      const m = state.modules.find(x => x.id === mid);
      if (!m) return;
      const md = getModuleMarkdown(m);
      if (!md) { setStatus(t('statusNoModuleContent')); return; }
      copyMarkdown(md);
    });
  });
  list.querySelectorAll('[data-dlmod]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const mid = parseInt(asHtmlEl(btn)?.dataset.dlmod ?? '', 10);
      const m = state.modules.find(x => x.id === mid);
      if (!m) return;
      const md = getModuleMarkdown(m);
      if (!md) { setStatus(t('statusNoModuleContent')); return; }
      downloadMarkdown(md, getModuleDownloadFilename(m));
      setStatus(t('statusDownloaded'));
    });
  });

  list.querySelectorAll('input[id^="__lh_mt_"]').forEach(inp => {
    inp.addEventListener('input', () => {
      const htmlInp = inp instanceof HTMLInputElement ? inp : null;
      if (htmlInp) setModuleField(parseInt(htmlInp.id.replace('__lh_mt_', ''), 10), 'title', htmlInp.value);
    });
  });
  list.querySelectorAll('textarea').forEach(ta => {
    ta.addEventListener('input', () => {
      const htmlTa = ta instanceof HTMLTextAreaElement ? ta : null;
      if (!htmlTa) return;
      const m = htmlTa.id.match(/__lh_mc_(\d+)_(\d+)/);
      if (m) setContentEntry(parseInt(m[1], 10), parseInt(m[2], 10), htmlTa.value);
    });
  });

  ensureModuleFocusHandlers();
  updateModuleFocusClasses();
  if (state.scrollToFloaterEntry) {
    const { moduleId, entryIdx } = state.scrollToFloaterEntry;
    state.scrollToFloaterEntry = null;
    const card = list.querySelector(`[data-module-id="${moduleId}"]`);
    const scrollEl = card?.querySelector('.lh-module-scroll');
    const entry = card?.querySelector(`#__lh_mc_${moduleId}_${entryIdx}`)?.closest('.lh-content-entry');
    scrollToNewEntry(scrollEl ?? null, entry ?? null, true);
  }
  if (state.scrollToFloaterModule) {
    const mid = state.scrollToFloaterModule;
    state.scrollToFloaterModule = null;
    const card = list.querySelector(`[data-module-id="${mid}"]`);
    scrollToNewEntry(list, card ?? null, true);
  }
}
