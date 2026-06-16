/** 模块 CRUD、chrome.storage 持久化、页面标题解析、Markdown 导出 */
import { state } from '../state';
import { t } from '../i18n';
import { renderModuleList } from '../ui/floater-list';
import { setStatus } from '../ui/floater-status';
import { scheduleClampFloaterPosition } from '../ui/floater-panel';
import { ensureExtensionContext } from '../utils/extension-context';
import type { DocModule } from '../types';
import { eventTargetEl, asHtmlEl, topWindow } from '../utils/dom';

export function getStorageKey() {
  try {
    const hash = window.location.hash;
    const qIdx = hash.indexOf('?');
    if (qIdx >= 0) {
      const params = new URLSearchParams(hash.slice(qIdx));
      const vId = params.get('versionId');
      const pId = params.get('pageId');
      if (vId && pId) return `lh_${vId}_${pId}`;
    }
    const safe = hash.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 80);
    return `lh${safe ? '_' + safe : ''}`;
  } catch { return 'lh'; }
}

export function saveModules() {
  if (!ensureExtensionContext()) return;
  try { chrome.storage.local.set({ [state.currentStorageKey]: state.modules }); } catch {}
}

export function loadModules() {
  if (!ensureExtensionContext()) return;
  try {
    const key = getStorageKey();
    state.currentStorageKey = key;
    chrome.storage.local.get(key, (data) => {
      if (!ensureExtensionContext()) return;
      if (data && data[key] && data[key].length > 0) {
        state.modules = data[key];
        state.nextModuleId = (state.modules.reduce((max, m) => Math.max(max, m.id), 0) || 0) + 1;
      } else {
        state.modules = [];
        state.nextModuleId = 1;
      }
      renderModuleList();
      setStatus(state.modules.length ? t('statusLoaded', state.modules.length) : '');
    });
  } catch {}
}

export function addModule() {
  const m = { id: state.nextModuleId++, title: '', contents: [''] };
  state.modules.push(m);
  state.scrollToFloaterModule = m.id;
  state.focusedModuleId = m.id;
  state.collapsedModuleIds.delete(m.id);
  renderModuleList();
  scheduleClampFloaterPosition();
  saveModules();
  setStatus(t("statusModules", state.modules.length));
}

export function removeModule(id: number): void {
  state.modules = state.modules.filter(m => m.id !== id);
  state.selectedModuleIds.delete(id);
  if (state.focusedModuleId === id) state.focusedModuleId = null;
  renderModuleList();
  scheduleClampFloaterPosition();
  saveModules();
  setStatus(t("statusModules", state.modules.length));
}

export function moveModule(id: number, dir: number): void {
  const idx = state.modules.findIndex(m => m.id === id);
  if (idx < 0) return;
  const to = idx + dir;
  if (to < 0 || to >= state.modules.length) return;
  [state.modules[idx], state.modules[to]] = [state.modules[to], state.modules[idx]];
  renderModuleList();
  saveModules();
}

export function setModuleField(id: number, field: 'title', val: string): void {
  const m = state.modules.find(x => x.id === id);
  if (m) m[field] = val;
  saveModules();
}

export function addContentEntry(moduleId: number): void {
  const m = state.modules.find(x => x.id === moduleId);
  if (!m) return;
  m.contents.push('');
  state.scrollToFloaterEntry = { moduleId, entryIdx: m.contents.length - 1 };
  state.focusedModuleId = moduleId;
  state.collapsedModuleIds.delete(moduleId);
  renderModuleList();
  scheduleClampFloaterPosition();
  saveModules();
}

export function scrollToNewEntry(container: Element | null, target: Element | string | null, force = false): void {
  if (!container || !target) return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const el = typeof target === 'string' ? container.querySelector(target) : target;
      if (!el) return;
      const cRect = container.getBoundingClientRect();
      const eRect = el.getBoundingClientRect();
      if (force || eRect.top < cRect.top || eRect.bottom > cRect.bottom) {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });
  });
}

export function updateModuleFocusClasses() {
  const list = document.getElementById('__lh_f_list');
  if (!list) return;
  list.querySelectorAll('[data-module-id]').forEach(card => {
    const htmlCard = asHtmlEl(card);
    if (!htmlCard) return;
    const mid = parseInt(htmlCard.dataset.moduleId ?? '', 10);
    card.classList.toggle('lh-module-focused', state.focusedModuleId === mid);
    card.classList.toggle('lh-module-dimmed', state.focusedModuleId != null && state.focusedModuleId !== mid);
  });
}

export function ensureModuleFocusHandlers() {
  if (state.moduleFocusBound) return;
  const list = document.getElementById('__lh_f_list');
  if (!list) return;
  state.moduleFocusBound = true;
  list.addEventListener('mousedown', (e) => {
    const target = eventTargetEl(e);
    if (!target) return;
    if (target.closest('.lh-module-cb')) return;
    const card = target.closest('[data-module-id]');
    if (!card || !(card instanceof HTMLElement)) return;
    const mid = parseInt(card.dataset.moduleId ?? '', 10);
    if (state.focusedModuleId !== mid) {
      state.focusedModuleId = mid;
      updateModuleFocusClasses();
    }
  });
  document.addEventListener('mousedown', (e) => {
    const target = eventTargetEl(e);
    if (!target) return;
    if (!document.getElementById('__lh_f')) return;
    if (target.closest('[data-module-id]')) return;
    if (!target.closest('#__lh_f')) return;
    if (state.focusedModuleId != null) {
      state.focusedModuleId = null;
      updateModuleFocusClasses();
    }
  }, true);
}

export function toggleEditEntriesExpand() {
  if (!state.editDialogState) return;
  const n = state.editDialogState.draft.contents.length;
  if (state.editDialogState.collapsedEditEntries.size === 0) {
    state.editDialogState.collapsedEditEntries = new Set([...Array(n).keys()]);
  } else {
    state.editDialogState.collapsedEditEntries.clear();
  }
  state.editDialogState.renderContents?.();
}

export function removeContentEntry(moduleId: number, entryIdx: number): void {
  const m = state.modules.find(x => x.id === moduleId);
  if (m) { m.contents.splice(entryIdx, 1); renderModuleList(); saveModules(); }
}

export function moveContentEntry(moduleId: number, entryIdx: number, dir: number): void {
  const m = state.modules.find(x => x.id === moduleId);
  if (!m) return;
  const to = entryIdx + dir;
  if (to < 0 || to >= m.contents.length) return;
  [m.contents[entryIdx], m.contents[to]] = [m.contents[to], m.contents[entryIdx]];
  renderModuleList();
  saveModules();
}

export function setContentEntry(moduleId: number, entryIdx: number, val: string): void {
  const m = state.modules.find(x => x.id === moduleId);
  if (m && m.contents[entryIdx] !== undefined) m.contents[entryIdx] = val;
  saveModules();
}

export function getFullMarkdown() {
  const pageTitle = getPageTitle();
  const parts = [`# ${pageTitle}`];
  state.modules.forEach((m) => {
    if (m.title) parts.push(`## ${m.title}`);
    m.contents.forEach(c => { if (c) parts.push(c); });
  });
  return parts.join('\n\n');
}

/** 单个模块 Markdown（独立预览/复制/下载） */
export function getModuleMarkdown(m: DocModule): string {
  const parts = [];
  if (m.title) parts.push(`## ${m.title}`);
  m.contents.forEach(c => { if (c) parts.push(c); });
  return parts.join('\n\n');
}

export function downloadMarkdown(md: string, filename: string): void {
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function copyMarkdown(md: string): void {
  navigator.clipboard.writeText(md).then(() => {
    setStatus(t('statusCopied'));
  }).catch(() => {
    setStatus(t('statusCopyFail'));
  });
}

export function getModuleDownloadFilename(m: DocModule): string {
  const title = sanitizeFilename(m.title || t('modulePreview'));
  const time = new Date().toISOString().slice(0, 10);
  return `${title}_${time}.md`;
}

/** 从 Axure 文档提取页面标题（header .title 或 head title） */
export function extractAxurePageTitle(doc = document) {
  for (const sel of ['#header .title', 'header .title', '.header .title']) {
    const el = doc.querySelector(sel);
    const text = el?.textContent?.trim();
    if (text) return text;
  }
  const headTitle = doc.querySelector('head title')?.textContent?.trim() || doc.title?.trim();
  return headTitle || '';
}

/** 顶层蓝湖壳页面 title（如「项目名-蓝湖」）应排除 */
export function isLanhuShellTitle(title: string): boolean {
  if (!title) return true;
  return /[-–—]\s*蓝湖\s*$/.test(title) || /\blanhu\b/i.test(title);
}

/** iframe 内 Axure 页面向顶层同步标题（跨域 iframe 无法被顶层直接读 DOM） */
export function publishAxurePageTitle() {
  if (state.frameCtx === 'top') return;
  if (!document.querySelector('.ax_default') && !document.getElementById('base')) return;
  const title = extractAxurePageTitle(document);
  if (!title) return;
  try {
    topWindow().postMessage({ type: '__lh_page_title', title }, '*');
  } catch {}
}

/** 顶层向 Axure iframe 请求标题 */
export function refreshPageTitleFromIframes() {
  if (state.frameCtx !== 'top') return;
  document.querySelectorAll('iframe').forEach((f) => {
    try { f.contentWindow?.postMessage({ type: '__lh_request_page_title' }, '*'); } catch {}
  });
}

/** 蓝湖左侧页面树当前选中项 */
export function getLanhuSidebarPageTitle() {
  const el = document.querySelector('.prototype-sidebar .tree-item-wrapper.state.active .tree-name');
  return el?.textContent?.trim() || '';
}

/** 获取面积最大的同源 Axure iframe 文档（本地/demo 可用） */
export function getAxureIframeDoc() {
  let best = null, bestArea = 0;
  for (const f of document.querySelectorAll('iframe')) {
    try {
      const doc = f.contentDocument || f.contentWindow?.document;
      if (!doc) continue;
      if (!doc.querySelector('.ax_default') && !doc.getElementById('base')) continue;
      const rect = f.getBoundingClientRect();
      const area = rect.width * rect.height;
      if (area > bestArea) { bestArea = area; best = doc; }
    } catch { /* 跨域 iframe 跳过 */ }
  }
  return best;
}

/** 获取当前 Axure 实际页面标题 */
export function getPageTitle() {
  if (state.cachedAxurePageTitle) return state.cachedAxurePageTitle;

  const doc = getAxureIframeDoc();
  if (doc) {
    const t = extractAxurePageTitle(doc);
    if (t) return t;
  }

  const sidebar = getLanhuSidebarPageTitle();
  if (sidebar) return sidebar;

  refreshPageTitleFromIframes();

  const topTitle = document.title?.trim();
  if (topTitle && !isLanhuShellTitle(topTitle)) return topTitle;

  return t('unknownPage');
}

/** 监听 Axure iframe 加载并初始化标题同步 */
export function initPageTitleBridge() {
  if (state.frameCtx === 'top') {
    refreshPageTitleFromIframes();
    document.querySelectorAll('#lan-mapping-iframe, .lan-mapping-iframe, iframe').forEach((iframe) => {
      iframe.addEventListener('load', () => {
        state.cachedAxurePageTitle = '';
        refreshPageTitleFromIframes();
      });
    });
    return;
  }
  publishAxurePageTitle();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', publishAxurePageTitle, { once: true });
  }
  const titleEl = document.querySelector('head title');
  if (titleEl) {
    new MutationObserver(() => publishAxurePageTitle()).observe(titleEl, {
      childList: true, characterData: true, subtree: true,
    });
  }
}

export function sanitizeFilename(name: string): string {
  return (name || t('unknownPage')).replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim() || t('unknownPage');
}

export function getDownloadFilename() {
  const title = sanitizeFilename(getPageTitle());
  const time = new Date().toISOString().slice(0, 10);
  return `${title}_${time}.md`;
}
