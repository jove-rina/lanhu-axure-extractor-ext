import { state } from '../state';
import { t } from '../i18n';
import { escHtml, asHtmlEl, eventTargetEl, qsEl, qsInput, qsTextArea, asPointerEvent } from '../utils/dom';
import { renderMarkdown } from '../markdown/render';
import { ICON } from './icons';
import {
  Z_EDIT, Z_EDIT_TOAST, BTN_SAVE, BTN_CANCEL, BTN_ADD_ENTRY, BTN_TOOL, BTN_TOOL_XS,
  BTN_TOOL_ACTIVE, BTN_TOOL_ACTIVE_XS, BTN_TOOL_ICON_XS, EDIT_WIN_BTN,
  EDIT_ENTRY_DEFAULT_H, EDIT_ENTRY_MIN_H, BTN_NEUTRAL_XS, BTN_DISABLED,
  BTN_ACCENT_XS, BTN_DANGER_XS, BTN_GHOST, BTN_MUTED,
  ensureLhUiStyles, initLhTooltipSystem,
} from './styles';
import { setStatus } from './floater-status';
import { renderModuleList } from './floater-list';
import { startPick } from '../picker/pick-flow';
import { cancelPick } from '../picker/pick-flow';
import { saveModules, scrollToNewEntry, toggleEditEntriesExpand } from '../modules/manager';
import { scheduleClampFloaterPosition } from './floater-panel';
import type { PickField, MdCmd, DocModuleDraft } from '../types';


const MD_PREVIEW_CSS = `
.lh-md-preview{color:#c1c2c5;font-size:13px;line-height:1.7;word-break:break-word}
.lh-md-preview h1,.lh-md-preview h2,.lh-md-preview h3,.lh-md-preview h4{color:#f08c00;font-weight:600;margin:12px 0 8px}
.lh-md-preview h1{font-size:18px} .lh-md-preview h2{font-size:16px} .lh-md-preview h3{font-size:14px}
.lh-md-preview p{margin:6px 0} .lh-md-preview ul,.lh-md-preview ol{padding-left:20px;margin:6px 0}
.lh-md-preview li{margin:2px 0} .lh-md-preview code{background:#25262b;padding:1px 5px;border-radius:3px;font-size:12px;color:#f08c00}
.lh-md-preview pre{background:#25262b;padding:10px;border-radius:6px;overflow-x:auto;font-size:12px;margin:8px 0}
.lh-md-preview pre code{background:none;padding:0;color:#c1c2c5}
.lh-md-preview blockquote{border-left:3px solid #f08c00;margin:8px 0;padding:2px 12px;color:#909296}
.lh-md-preview .table-wrap{overflow-x:auto;margin:8px 0;max-width:100%}
.lh-md-preview .table-wrap table{width:auto;table-layout:auto;border-collapse:collapse;margin:0;font-size:12px}
.lh-md-preview th,.lh-md-preview td{border:1px solid #373a40;padding:4px 8px;text-align:left;white-space:nowrap}
.lh-md-preview th{background:#25262b;color:#e0e0e0;font-weight:600}
.lh-md-preview a{color:#f08c00}
.lh-md-preview img{max-width:100%;border-radius:4px} .lh-md-preview hr{border:none;border-top:1px solid #373a40;margin:12px 0}
.lh-md-preview-empty{color:rgba(255,255,255,.88);font-size:12px;text-align:center;padding:24px 12px;height:100%;display:flex;align-items:center;justify-content:center;box-sizing:border-box}
.lh-edit-split{flex:1;min-height:0;display:flex;height:100%}
.lh-edit-preview-wrap{flex:1;display:flex;flex-direction:column;min-height:0;height:100%}
.lh-md-preview{height:100%;flex:1;min-height:0;box-sizing:border-box}
`;

export function applyMdPreview(previewEl: HTMLElement, md: string): void {
  if (!md || !md.trim()) {
    previewEl.innerHTML = `<div class="lh-md-preview-empty">${t('noContent')}</div>`;
    return;
  }
  previewEl.innerHTML = renderMarkdown(md);
  previewEl.querySelectorAll('table').forEach(tableEl => {
    const wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    const parent = tableEl.parentNode;
    if (parent) {
      parent.insertBefore(wrap, tableEl);
      wrap.appendChild(tableEl);
    }
  });
}

export function syncEditDraftFromDom(): void {
  if (!state.editDialogState) return;
  const { shell, draft } = state.editDialogState;
  const titleInp = qsInput(shell, '#__lh_edit_title');
  if (titleInp) draft.title = titleInp.value;
  shell.querySelectorAll('.lh-edit-entry').forEach((block, ci) => {
    const ta = qsTextArea(block, '.lh-edit-ta');
    if (ta && draft.contents[ci] !== undefined) draft.contents[ci] = ta.value;
  });
  updateEditDialogHeaderTitle();
}

export function insertAtCursor(ta: HTMLTextAreaElement, before: string, after = '', placeholder = ''): void {
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const selected = ta.value.substring(start, end) || placeholder;
  ta.value = ta.value.substring(0, start) + before + selected + after + ta.value.substring(end);
  const pos = start + before.length + selected.length;
  ta.setSelectionRange(pos, pos);
  ta.focus();
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}

export function highlightEditPickTarget(field: PickField, entryIdx?: number): void {
  if (!state.editDialogState) return;
  state.editDialogState.shell.querySelectorAll('.lh-edit-pick-target').forEach(el => {
    const htmlEl = asHtmlEl(el);
    if (htmlEl) {
      htmlEl.style.outline = '';
      htmlEl.style.borderColor = '#373a40';
    }
  });
  let target: HTMLElement | null = null;
  if (field === 'title') {
    target = qsInput(state.editDialogState.shell, '#__lh_edit_title');
  } else if (entryIdx !== undefined) {
    target = qsTextArea(state.editDialogState.shell, `.lh-edit-entry[data-entry-idx="${entryIdx}"] .lh-edit-ta`);
  }
  if (target) {
    target.classList.add('lh-edit-pick-target');
    target.style.outline = '1px solid #f08c00';
    target.style.borderColor = '#f08c00';
  }
}

const EDIT_DEFAULT_STYLE = { left: '20%', top: '6vh', width: '60%', height: '80vh', maxHeight: '750px', right: 'auto', bottom: 'auto', borderRadius: '12px' };

export function captureEditShellStyle() {
  const s = state.editDialogState?.shell;
  if (!s) return { ...EDIT_DEFAULT_STYLE };
  return {
    left: s.style.left, top: s.style.top, right: s.style.right, bottom: s.style.bottom,
    width: s.style.width, height: s.style.height, maxHeight: s.style.maxHeight,
    borderRadius: s.style.borderRadius,
  };
}

export function applyEditExpandedStyle(style: Record<string, string>): void {
  const s = state.editDialogState?.shell;
  if (!s || !style) return;
  applyEditShellStyle(style);
  s.style.minWidth = '';
  s.style.maxWidth = '';
  s.style.height = style.height || EDIT_DEFAULT_STYLE.height;
  s.style.maxHeight = style.maxHeight || EDIT_DEFAULT_STYLE.maxHeight;
  s.style.boxSizing = 'border-box';
}

export function applyEditFullscreenStyle() {
  const s = state.editDialogState?.shell;
  if (!s) return;
  Object.assign(s.style, {
    left: '0', top: '0', right: '0', bottom: '0',
    width: '100vw', height: '100vh',
    maxWidth: 'none', maxHeight: 'none', minWidth: '0',
    borderRadius: '0', boxSizing: 'border-box',
  });
}

export function updateEditDialogHeaderTitle() {
  if (!state.editDialogState) return;
  const { shell, draft, moduleId } = state.editDialogState;
  const titleEl = shell.querySelector('#__lh_edit_h_title');
  if (!titleEl) return;
  const mi = state.modules.findIndex(x => x.id === moduleId);
  const label = (draft.title || '').trim() || (mi >= 0 ? `${t('title')} ${mi + 1}` : t('editModule'));
  titleEl.textContent = label;
}

export function applyEditShellStyle(style: Record<string, string>): void {
  const s = state.editDialogState?.shell;
  if (!s || !style) return;
  s.style.left = style.left || '';
  s.style.top = style.top || '';
  s.style.right = style.right || 'auto';
  s.style.bottom = style.bottom || 'auto';
  s.style.width = style.width || '';
  s.style.height = style.height || '';
  s.style.maxHeight = style.maxHeight || '';
  s.style.borderRadius = style.borderRadius || '12px';
}

export function updateEditWindowButtons() {
  if (!state.editDialogState) return;
  const { shell, minimized, fullscreen } = state.editDialogState;
  const minBtn = asHtmlEl(shell.querySelector('#__lh_edit_min'));
  const fsBtn = asHtmlEl(shell.querySelector('#__lh_edit_fs'));
  const tools = asHtmlEl(shell.querySelector('#__lh_edit_tools'));
  if (tools) tools.style.display = 'flex';
  if (minBtn) {
    minBtn.innerHTML = minimized ? ICON.winRestore : ICON.winMin;
    minBtn.dataset.tip = minimized ? t('restoreEdit') : t('minimizeEdit');
  }
  if (fsBtn) {
    fsBtn.innerHTML = fullscreen ? ICON.winExitMax : ICON.winMax;
    fsBtn.dataset.tip = fullscreen ? t('exitFullscreen') : t('fullscreenEdit');
    fsBtn.style.display = 'inline-flex';
  }
}

export function showEditToast(message: string): void {
  document.getElementById('__lh_edit_toast')?.remove();
  const toast = document.createElement('div');
  toast.id = '__lh_edit_toast';
  Object.assign(toast.style, {
    position: 'fixed', zIndex: String(Z_EDIT_TOAST), top: '24px', left: '50%', transform: 'translateX(-50%)',
    background: '#25262b', border: '1px solid #373a40', borderRadius: '8px',
    padding: '10px 18px', font: '13px -apple-system,BlinkMacSystemFont,\'PingFang SC\',sans-serif',
    color: '#c1c2c5', boxShadow: '0 4px 16px rgba(0,0,0,0.4)', animation: 'lhFadeIn 0.2s ease',
    whiteSpace: 'nowrap',
  });
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

export function setEditDialogCompact(compact: boolean): void {
  if (!state.editDialogState) return;
  const { shell } = state.editDialogState;
  const header = asHtmlEl(shell.querySelector('#__lh_edit_h'));
  const body = asHtmlEl(shell.querySelector('#__lh_edit_body'));
  const footer = asHtmlEl(shell.querySelector('#__lh_edit_footer'));
  if (body) body.style.display = compact ? 'none' : 'flex';
  if (footer) footer.style.display = compact ? 'none' : 'flex';
  if (compact) {
    shell.style.width = 'auto';
    shell.style.minWidth = '280px';
    shell.style.maxWidth = '480px';
    shell.style.height = 'auto';
    shell.style.maxHeight = 'none';
    shell.style.left = '20px';
    shell.style.bottom = '20px';
    shell.style.top = 'auto';
    shell.style.right = 'auto';
    shell.style.borderRadius = '8px';
    if (header) {
      header.style.borderBottom = 'none';
      header.style.borderRadius = '8px';
      header.style.padding = '10px 14px';
    }
  } else if (header) {
    header.style.borderBottom = '1px solid #373a40';
    header.style.borderRadius = state.editDialogState.fullscreen ? '0' : '12px 12px 0 0';
    header.style.padding = '12px 16px';
    applyEditExpandedStyle(state.editDialogState.expandedStyle || EDIT_DEFAULT_STYLE);
  }
  updateEditWindowButtons();
  updateEditDialogHeaderTitle();
}

export function toggleEditFullscreen(): void {
  if (!state.editDialogState) return;
  syncEditDraftFromDom();
  const { shell } = state.editDialogState;
  const body = asHtmlEl(shell.querySelector('#__lh_edit_body'));
  const footer = asHtmlEl(shell.querySelector('#__lh_edit_footer'));
  if (state.editDialogState.fullscreen) {
    applyEditExpandedStyle(state.editDialogState.expandedStyle || EDIT_DEFAULT_STYLE);
    state.editDialogState.fullscreen = false;
    state.editDialogState.minimized = false;
    state.editDialogState.pickMinimized = false;
    setEditDialogCompact(false);
    if (body) body.style.display = 'flex';
    if (footer) footer.style.display = 'flex';
  } else {
    if (!state.editDialogState.minimized) {
      state.editDialogState.expandedStyle = captureEditShellStyle();
    }
    state.editDialogState.fullscreen = true;
    state.editDialogState.minimized = false;
    state.editDialogState.pickMinimized = false;
    applyEditFullscreenStyle();
    const header = asHtmlEl(shell.querySelector('#__lh_edit_h'));
    if (header) {
      header.style.borderBottom = '1px solid #373a40';
      header.style.borderRadius = '0';
      header.style.padding = '12px 16px';
    }
    if (body) body.style.display = 'flex';
    if (footer) footer.style.display = 'flex';
  }
  updateEditWindowButtons();
}

export function toggleEditMinimize(): void {
  if (!state.editDialogState) return;
  if (state.editDialogState.minimized) {
    state.editDialogState.pickMinimized = false;
    restoreEditDialog(true);
    return;
  }
  syncEditDraftFromDom();
  if (state.editDialogState.fullscreen) toggleEditFullscreen();
  state.editDialogState.expandedStyle = captureEditShellStyle();
  state.editDialogState.minimized = true;
  setEditDialogCompact(true);
}

export function minimizeEditDialogForPick() {
  if (!state.editDialogState || state.editDialogState.pickMinimized) return;
  syncEditDraftFromDom();
  if (state.editDialogState.fullscreen) {
    state.editDialogState.fullscreen = false;
    applyEditExpandedStyle(state.editDialogState.expandedStyle || EDIT_DEFAULT_STYLE);
  }
  if (!state.editDialogState.minimized) {
    state.editDialogState.expandedStyle = captureEditShellStyle();
  }
  state.editDialogState.minimized = true;
  state.editDialogState.pickMinimized = true;
  setEditDialogCompact(true);
}

export function restoreEditDialog(refresh = true) {
  if (!state.editDialogState) return;
  const { shell, draft } = state.editDialogState;
  state.editDialogState.minimized = false;
  state.editDialogState.pickMinimized = false;
  state.editDialogState.fullscreen = false;
  applyEditExpandedStyle(state.editDialogState.expandedStyle || EDIT_DEFAULT_STYLE);
  setEditDialogCompact(false);
  const body = asHtmlEl(shell.querySelector('#__lh_edit_body'));
  const footer = asHtmlEl(shell.querySelector('#__lh_edit_footer'));
  if (body) body.style.display = 'flex';
  if (footer) footer.style.display = 'flex';
  updateEditWindowButtons();
  updateEditDialogHeaderTitle();
  if (refresh) {
    const titleInp = qsInput(shell, '#__lh_edit_title');
    if (titleInp) titleInp.value = draft.title;
    state.editDialogState.renderContents?.();
  }
}

export function closeEditDialog(): void {
  if (!state.editDialogState) return;
  if (state.pickMode && state.activePickField?.moduleId === state.editDialogState.moduleId) cancelPick();
  state.editDialogState.shell.remove();
  state.editDialogState = null;
}

export function startPickFromEdit(field: PickField, entryIdx?: number): void {
  if (!state.editDialogState) return;
  minimizeEditDialogForPick();
  startPick(state.editDialogState.moduleId, field, entryIdx, { fromEdit: true });
}

export function attachUndoRedo(ta: HTMLTextAreaElement, onUpdate?: () => void) {
  const hist = { stack: [ta.value], idx: 0, locking: false };
  const sync = () => {
    if (hist.locking) return;
    const v = ta.value;
    if (v === hist.stack[hist.idx]) return;
    hist.stack = hist.stack.slice(0, hist.idx + 1);
    hist.stack.push(v);
    if (hist.stack.length > 150) hist.stack.shift();
    hist.idx = hist.stack.length - 1;
    onUpdate?.();
  };
  ta.addEventListener('input', sync);
  const apply = (idx: number) => {
    hist.locking = true;
    ta.value = hist.stack[idx];
    hist.idx = idx;
    hist.locking = false;
    onUpdate?.();
  };
  return {
    undo: () => { if (hist.idx > 0) apply(hist.idx - 1); },
    redo: () => { if (hist.idx < hist.stack.length - 1) apply(hist.idx + 1); },
    reset: (v: string) => {
      hist.locking = true;
      ta.value = v;
      hist.stack = [v];
      hist.idx = 0;
      hist.locking = false;
    },
  };
}

export function syncEditEntryUiState(): void {
  if (!state.editDialogState) return;
  const dialog = state.editDialogState;
  dialog.shell.querySelectorAll('.lh-edit-entry').forEach((block) => {
    const htmlBlock = asHtmlEl(block);
    if (!htmlBlock) return;
    const ci = parseInt(htmlBlock.dataset.entryIdx ?? '', 10);
    if (Number.isNaN(ci)) return;
    const body = asHtmlEl(htmlBlock.querySelector('.lh-edit-entry-body'));
    if (body && body.offsetParent !== null) {
      dialog.entryHeights[ci] = body.offsetHeight;
    }
  });
}

export function swapEditEntryMeta(a: number, b: number): void {
  if (!state.editDialogState) return;
  const hs = state.editDialogState.entryHeights;
  [hs[a], hs[b]] = [hs[b], hs[a]];
  const collapsed = state.editDialogState.collapsedEditEntries;
  const aCol = collapsed.has(a);
  const bCol = collapsed.has(b);
  collapsed.delete(a);
  collapsed.delete(b);
  if (aCol) collapsed.add(b);
  if (bCol) collapsed.add(a);
}

export function attachEntryResize(block: Element, ci: number): void {
  const handle = asHtmlEl(block.querySelector('.lh-edit-resize'));
  const body = asHtmlEl(block.querySelector('.lh-edit-entry-body'));
  if (!handle || !body) return;
  handle.addEventListener('pointerdown', (e) => {
    const pe = asPointerEvent(e);
    if (!pe) return;
    pe.preventDefault();
    pe.stopPropagation();
    const startY = pe.clientY;
    const startH = body.offsetHeight;
    document.body.style.userSelect = 'none';
    handle.style.background = 'rgba(240,140,0,0.08)';
    const move = (ev: PointerEvent) => {
      const h = Math.max(EDIT_ENTRY_MIN_H, startH + (ev.clientY - startY));
      body.style.height = `${h}px`;
      if (state.editDialogState) state.editDialogState.entryHeights[ci] = h;
    };
    const up = () => {
      handle.style.background = '';
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.body.style.userSelect = '';
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  });
}

/** 模块编辑弹窗 — 分栏 Markdown 编辑器（无遮罩、可拖拽、拾取时收起） */
export function showModuleEditDialog(moduleId: number): void {
  const m = state.modules.find(x => x.id === moduleId);
  if (!m) return;

  closeEditDialog();
  ensureLhUiStyles();
  initLhTooltipSystem();

  const draft: DocModuleDraft = { title: m.title, contents: m.contents.length ? [...m.contents] : [''] };
  const shell = document.createElement('div');
  shell.id = '__lh_edit';
  Object.assign(shell.style, {
    position: 'fixed', zIndex: String(Z_EDIT),
    left: EDIT_DEFAULT_STYLE.left, top: EDIT_DEFAULT_STYLE.top,
    width: EDIT_DEFAULT_STYLE.width, height: EDIT_DEFAULT_STYLE.height,
    maxHeight: EDIT_DEFAULT_STYLE.maxHeight,
    background: '#1a1b1e', border: '1px solid #373a40', borderRadius: EDIT_DEFAULT_STYLE.borderRadius,
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
    boxSizing: 'border-box',
    font: '13px -apple-system,BlinkMacSystemFont,\'PingFang SC\',sans-serif', color: '#c1c2c5',
    animation: 'lhFadeIn 0.2s ease',
  });

  const mdTaStyle = 'width:100%;height:100%;flex:1;min-height:0;padding:10px 12px;';

  state.editDialogState = {
    moduleId,
    draft,
    shell,
    minimized: false,
    pickMinimized: false,
    fullscreen: false,
    expandedStyle: { ...EDIT_DEFAULT_STYLE },
    entryHeights: {} as Record<number, number>,
    collapsedEditEntries: new Set<number>(),
    scrollToEntryIdx: null,
  };

  function wireEntryBlock(block: Element, ci: number): void {
    const ta = qsTextArea(block, '.lh-edit-ta');
    const previewEl = qsEl(block, '.lh-md-preview');
    const modeBtns = block.querySelectorAll('[data-view-mode]');
    const splitPane = qsEl(block, '.lh-edit-split');
    if (!ta || !previewEl || !splitPane) return;

    const applyViewMode = (mode: string): void => {
      const editor = qsEl(splitPane, '.lh-edit-editor');
      const preview = qsEl(splitPane, '.lh-edit-preview-wrap');
      if (!editor || !preview) return;
      modeBtns.forEach(b => {
        const htmlBtn = asHtmlEl(b);
        if (htmlBtn) htmlBtn.style.cssText = htmlBtn.dataset.viewMode === mode ? BTN_TOOL_ACTIVE_XS : BTN_TOOL_XS;
      });
      if (mode === 'write') {
        editor.style.flex = '1'; editor.style.display = 'flex';
        editor.style.flexDirection = 'column';
        editor.style.height = '100%';
        preview.style.display = 'none';
      } else if (mode === 'preview') {
        editor.style.display = 'none';
        preview.style.flex = '1';
        preview.style.display = 'flex';
        preview.style.flexDirection = 'column';
        preview.style.height = '100%';
      } else {
        editor.style.flex = '1'; editor.style.display = 'flex';
        editor.style.flexDirection = 'column';
        editor.style.height = '100%';
        preview.style.flex = '1';
        preview.style.display = 'flex';
        preview.style.flexDirection = 'column';
        preview.style.height = '100%';
      }
      splitPane.style.flex = '1';
      splitPane.style.minHeight = '0';
      splitPane.style.height = '100%';
      previewEl.style.height = '100%';
      applyMdPreview(previewEl, ta.value);
    };

    const onTaUpdate = () => {
      draft.contents[ci] = ta.value;
      applyMdPreview(previewEl, ta.value);
    };
    const undoRedo = attachUndoRedo(ta, onTaUpdate);

    modeBtns.forEach(b => b.addEventListener('click', () => {
      const htmlBtn = asHtmlEl(b);
      if (htmlBtn?.dataset.viewMode) applyViewMode(htmlBtn.dataset.viewMode);
    }));
    applyViewMode('split');

    block.querySelector('[data-md-undo]')?.addEventListener('click', () => undoRedo.undo());
    block.querySelector('[data-md-redo]')?.addEventListener('click', () => undoRedo.redo());
    ta.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undoRedo.undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); undoRedo.redo(); }
    });

    block.querySelectorAll('[data-md-cmd]').forEach(btn => {
      btn.addEventListener('click', () => {
        const htmlBtn = asHtmlEl(btn);
        const cmd = htmlBtn?.dataset.mdCmd as MdCmd | undefined;
        const map: Record<MdCmd, [string, string, string]> = {
          bold: ['**', '**', 'text'],
          italic: ['*', '*', 'text'],
          link: ['[', '](url)', 'text'],
          heading: ['## ', '', 'heading'],
          list: ['- ', '', 'item'],
          code: ['`', '`', 'code'],
        };
        const [before, after, ph] = cmd ? map[cmd] : ['', '', ''];
        insertAtCursor(ta, before, after, ph);
        draft.contents[ci] = ta.value;
        applyMdPreview(previewEl, ta.value);
      });
    });

    block.querySelector('[data-edit-pick]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      startPickFromEdit('content', ci);
    });

    block.querySelectorAll('.lh-edit-entry-hdr button, .lh-edit-md-toolbar button').forEach(btn => {
      btn.addEventListener('click', (e) => e.stopPropagation());
    });

    block.querySelector('[data-entry-up]')?.addEventListener('click', () => {
      if (ci <= 0) return;
      syncEditDraftFromDom();
      syncEditEntryUiState();
      [draft.contents[ci - 1], draft.contents[ci]] = [draft.contents[ci], draft.contents[ci - 1]];
      swapEditEntryMeta(ci - 1, ci);
      renderEditContents();
    });
    block.querySelector('[data-entry-down]')?.addEventListener('click', () => {
      if (ci >= draft.contents.length - 1) return;
      syncEditDraftFromDom();
      syncEditEntryUiState();
      [draft.contents[ci], draft.contents[ci + 1]] = [draft.contents[ci + 1], draft.contents[ci]];
      swapEditEntryMeta(ci, ci + 1);
      renderEditContents();
    });
    block.querySelector('[data-entry-rm]')?.addEventListener('click', () => {
      const dialog = state.editDialogState;
      if (!dialog) return;
      syncEditDraftFromDom();
      syncEditEntryUiState();
      if (draft.contents.length <= 1) { draft.contents[0] = ''; renderEditContents(); return; }
      draft.contents.splice(ci, 1);
      dialog.collapsedEditEntries.delete(ci);
      const nextCollapsed = new Set<number>();
      dialog.collapsedEditEntries.forEach(i => {
        if (i < ci) nextCollapsed.add(i);
        else if (i > ci) nextCollapsed.add(i - 1);
      });
      dialog.collapsedEditEntries = nextCollapsed;
      const nextHeights: Record<number, number> = {};
      Object.entries(dialog.entryHeights).forEach(([k, v]) => {
        const i = parseInt(k, 10);
        if (i < ci) nextHeights[i] = v;
        else if (i > ci) nextHeights[i - 1] = v;
      });
      dialog.entryHeights = nextHeights;
      renderEditContents();
    });

    block.querySelector('.lh-edit-entry-hdr')?.addEventListener('click', (e) => {
      const dialog = state.editDialogState;
      if (!dialog) return;
      if (eventTargetEl(e)?.closest('button')) return;
      if (dialog.collapsedEditEntries.has(ci)) {
        dialog.collapsedEditEntries.delete(ci);
      } else {
        syncEditEntryUiState();
        dialog.collapsedEditEntries.add(ci);
      }
      renderEditContents();
    });

    attachEntryResize(block, ci);
  }

  function renderEditContents(): void {
    syncEditDraftFromDom();
    syncEditEntryUiState();
    const dialog = state.editDialogState;
    if (!dialog) return;
    const container = shell.querySelector('#__lh_edit_contents');
    if (!container) return;
    container.innerHTML = draft.contents.map((c, ci) => {
      const collapsed = dialog.collapsedEditEntries.has(ci);
      const entryH = dialog.entryHeights[ci] || EDIT_ENTRY_DEFAULT_H;
      return `
      <div class="lh-edit-entry" data-entry-idx="${ci}">
        <div class="lh-edit-entry-hdr${collapsed ? '' : ' is-open'}">
          <span class="lh-edit-entry-chevron">▶</span>
          <span class="lh-field-label" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;margin:0;">${t('entryLabel', ci + 1)}</span>
          <div class="lh-btn-group" style="flex-wrap:wrap;justify-content:flex-end;">
            <div class="lh-btn-fuse">
              <button data-edit-pick data-tip="${t('pickContent')}" style="${BTN_ACCENT_XS}">${ICON.target} ${t('pick')}</button>
            </div>
            <span class="lh-vsep"></span>
            <div class="lh-btn-fuse">
              <button data-view-mode="write" data-tip="${t('writeMode')}" style="${BTN_TOOL_XS}">${t('writeMode')}</button>
              <button data-view-mode="split" data-tip="${t('splitMode')}" style="${BTN_TOOL_ACTIVE_XS}">${t('splitMode')}</button>
              <button data-view-mode="preview" data-tip="${t('previewMode')}" style="${BTN_TOOL_XS}">${t('previewMode')}</button>
            </div>
            <span class="lh-vsep"></span>
            <div class="lh-btn-fuse">
              <button data-entry-up ${ci === 0 ? 'disabled' : ''} data-tip="${t('moveUp')}" style="${BTN_NEUTRAL_XS}${ci === 0 ? BTN_DISABLED : ''}">${ICON.up}</button>
              <button data-entry-down ${ci === draft.contents.length - 1 ? 'disabled' : ''} data-tip="${t('moveDown')}" style="${BTN_NEUTRAL_XS}${ci === draft.contents.length - 1 ? BTN_DISABLED : ''}">${ICON.down}</button>
              <button data-entry-rm data-tip="${t('delete')}" style="${BTN_DANGER_XS}">${ICON.trash}</button>
            </div>
          </div>
        </div>
        <div class="lh-edit-md-toolbar" style="${collapsed ? 'display:none;' : ''}">
          <div class="lh-btn-fuse">
            <button data-md-undo data-tip="${t('undo')}" style="${BTN_TOOL_ICON_XS}">${ICON.undo}</button>
            <button data-md-redo data-tip="${t('redo')}" style="${BTN_TOOL_ICON_XS}">${ICON.redo}</button>
          </div>
          <span class="lh-vsep"></span>
          <div class="lh-btn-fuse">
            <button data-md-cmd="bold" data-tip="${t('mdBold')}" style="${BTN_TOOL_ICON_XS}"><b>B</b></button>
            <button data-md-cmd="italic" data-tip="${t('mdItalic')}" style="${BTN_TOOL_ICON_XS}"><i>I</i></button>
            <button data-md-cmd="link" data-tip="${t('mdLink')}" style="${BTN_TOOL_ICON_XS}">L</button>
            <button data-md-cmd="heading" data-tip="${t('mdHeading')}" style="${BTN_TOOL_ICON_XS}">H</button>
            <button data-md-cmd="list" data-tip="${t('mdList')}" style="${BTN_TOOL_ICON_XS}">•</button>
            <button data-md-cmd="code" data-tip="${t('mdCode')}" style="${BTN_TOOL_ICON_XS}">&lt;/&gt;</button>
          </div>
        </div>
        <div class="lh-edit-entry-body" style="${collapsed ? 'display:none;' : `height:${entryH}px;`}">
          <div class="lh-edit-split">
            <div class="lh-edit-editor" style="flex:1;display:flex;flex-direction:column;min-width:0;min-height:0;height:100%;">
              <textarea class="lh-edit-ta lh-scrollbar" placeholder="${t('contentPlaceholder', ci + 1)}" style="${mdTaStyle}">${escHtml(c)}</textarea>
            </div>
            <div class="lh-edit-preview-wrap" style="flex:1;display:flex;flex-direction:column;background:#141517;overflow:hidden;min-width:0;min-height:0;height:100%;">
              <div class="lh-md-preview lh-scrollbar" style="flex:1;height:100%;overflow:auto;padding:10px 12px;min-height:0;box-sizing:border-box;"></div>
            </div>
          </div>
          <div class="lh-edit-resize"></div>
        </div>
      </div>`;
    }).join('');

    container.querySelectorAll('.lh-edit-entry').forEach((block, ci) => wireEntryBlock(block, ci));

    if (dialog.scrollToEntryIdx != null) {
      const idx = dialog.scrollToEntryIdx;
      dialog.scrollToEntryIdx = null;
      scrollToNewEntry(container, `.lh-edit-entry[data-entry-idx="${idx}"]`, true);
    }
  }
  if (state.editDialogState) state.editDialogState.renderContents = renderEditContents;

  shell.innerHTML = `
    <style>${MD_PREVIEW_CSS}</style>
    <div id="__lh_edit_h" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#25262b;border-bottom:1px solid #373a40;border-radius:12px 12px 0 0;cursor:move;user-select:none;gap:12px;">
      <span id="__lh_edit_h_title" style="flex:1;color:#f08c00;font-weight:600;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;"></span>
      <div id="__lh_edit_tools" class="lh-btn-group">
        <button id="__lh_edit_min" data-tip="${t('minimizeEdit')}" style="${BTN_GHOST}">${ICON.winMin}</button>
        <button id="__lh_edit_fs" data-tip="${t('fullscreenEdit')}" style="${BTN_GHOST}">${ICON.winMax}</button>
        <button id="__lh_edit_x" data-tip="${t('close')}" style="${BTN_GHOST}">${ICON.close}</button>
      </div>
    </div>
    <div id="__lh_edit_body" style="flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden;padding:14px 16px;">
      <div class="lh-field-block" style="margin-bottom:14px;">
        <div class="lh-edit-title-row">
          <span id="__lh_edit_title_label" class="lh-field-label" style="margin:0;">${t('title')}</span>
          <button id="__lh_edit_expand" data-tip="${t('expandCollapse')}" style="${BTN_MUTED}">${ICON.up}${ICON.down} ${t('expandCollapse')}</button>
        </div>
        <div class="lh-plain-row">
          <input id="__lh_edit_title" type="text" value="${escHtml(draft.title)}" placeholder="${t('titlePlaceholder')}" class="lh-plain-input">
          <button id="__lh_edit_pick_title" data-tip="${t('pickTitle')}" style="${BTN_ACCENT_XS}">${ICON.target} ${t('pick')}</button>
        </div>
      </div>
      <div id="__lh_edit_contents" class="lh-scrollbar lh-entries-list" style="flex:1;min-height:0;overflow-y:auto;"></div>
      <div class="lh-add-entry-bar" style="padding-top:10px;">
        <button id="__lh_edit_add" data-tip="${t('addEntry')}" class="lh-add-entry-btn" style="${BTN_ADD_ENTRY}">${ICON.add} ${t('addEntry')}</button>
      </div>
    </div>
    <div id="__lh_edit_footer" style="display:flex;gap:8px;justify-content:flex-end;padding:10px 16px;border-top:1px solid #373a40;background:#25262b;border-radius:0 0 12px 12px;">
      <button id="__lh_edit_cancel" data-tip="${t('cancel')}" style="${BTN_CANCEL}">${t('cancel')}</button>
      <button id="__lh_edit_save" data-tip="${t('save')}" style="${BTN_SAVE}">${t('save')}</button>
    </div>`;

  document.body.appendChild(shell);
  renderEditContents();
  updateEditDialogHeaderTitle();

  const titleInp = qsInput(shell, '#__lh_edit_title');
  titleInp?.addEventListener('input', () => {
    draft.title = titleInp.value;
    updateEditDialogHeaderTitle();
  });

  shell.querySelector('#__lh_edit_pick_title')?.addEventListener('click', (e) => {
    e.stopPropagation();
    startPickFromEdit('title');
  });
  shell.querySelector('#__lh_edit_add')?.addEventListener('click', () => {
    const dialog = state.editDialogState;
    if (!dialog) return;
    syncEditDraftFromDom();
    syncEditEntryUiState();
    const newIdx = dialog.draft.contents.length;
    dialog.draft.contents.push('');
    dialog.collapsedEditEntries.delete(newIdx);
    dialog.scrollToEntryIdx = newIdx;
    renderEditContents();
  });
  shell.querySelector('#__lh_edit_expand')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleEditEntriesExpand();
  });
  shell.querySelector('#__lh_edit_min')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleEditMinimize();
  });
  shell.querySelector('#__lh_edit_fs')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleEditFullscreen();
  });
  shell.querySelector('#__lh_edit_x')?.addEventListener('click', (e) => { e.stopPropagation(); closeEditDialog(); });
  shell.querySelector('#__lh_edit_cancel')?.addEventListener('click', () => closeEditDialog());
  shell.querySelector('#__lh_edit_save')?.addEventListener('click', () => {
    syncEditDraftFromDom();
    m.title = draft.title;
    m.contents = draft.contents.length ? [...draft.contents] : [''];
    saveModules();
    state.collapsedModuleIds.delete(moduleId);
    renderModuleList();
    scheduleClampFloaterPosition();
    closeEditDialog();
    setStatus(t('statusSaved'));
  });

  // 拖拽
  const header = shell.querySelector('#__lh_edit_h');
  header?.addEventListener('pointerdown', (e) => {
    const dialog = state.editDialogState;
    const pe = asPointerEvent(e);
    if (!dialog || !pe) return;
    if (eventTargetEl(e)?.closest('button')) return;
    if (dialog.fullscreen) return;
    pe.preventDefault();
    pe.stopPropagation();
    const rect = shell.getBoundingClientRect();
    const ox = pe.clientX - rect.left;
    const oy = pe.clientY - rect.top;
    shell.style.right = 'auto';
    shell.style.bottom = 'auto';
    shell.style.width = rect.width + 'px';
    if (!dialog.minimized && !dialog.fullscreen) {
      dialog.expandedStyle = captureEditShellStyle();
    }
    document.body.style.userSelect = 'none';
    const move = (ev: PointerEvent) => {
      let x = ev.clientX - ox;
      let y = ev.clientY - oy;
      const fw = shell.offsetWidth;
      const fh = shell.offsetHeight;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (x < 0) x = 0;
      if (y < 0) y = 0;
      if (x + fw > vw) x = vw - fw;
      if (y + fh > vh) y = vh - fh;
      shell.style.left = x + 'px';
      shell.style.top = y + 'px';
      const d = state.editDialogState;
      if (d && !d.minimized && !d.fullscreen) {
        d.expandedStyle = captureEditShellStyle();
      }
    };
    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.body.style.userSelect = '';
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  }, { passive: false });

  titleInp?.focus();
}