/**
 * chrome.runtime.onMessage API
 */
import { state } from './state';
import { applyLang, t } from './i18n';
import { activate, deactivate, openDocBuilder } from './lifecycle';
import { fullExtract, simpleExtract, getDiagnostics } from './extract/page';
import { applyLanguageToFloater, applyLanguageToEditDialog } from './ui/floater-toolbar';
import { renderModuleList } from './ui/floater-list';
import { onMouseDown, onMouseMove, onMouseUp } from './picker/mouse-events';
import { setStatus } from './ui/floater-status';
import { hideHighlight } from './picker/highlight';
import { isExtensionContextValid } from './utils/extension-context';

export function registerChromeMessageApi(): void {
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    switch (request.action) {
      case 'extract-axure':
        sendResponse({ status: 'ok', data: state.frameCtx === 'top' ? fullExtract() : simpleExtract() });
        break;
      case 'ping':
        sendResponse({ pong: true, frame: state.frameCtx });
        break;
      case 'diagnose-me':
        sendResponse({ status: 'ok', data: getDiagnostics() });
        break;
      case 'start-picker':
        activate();
        sendResponse({ status: 'ok' });
        break;
      case 'stop-picker':
        deactivate();
        sendResponse({ status: 'ok' });
        break;
      case 'open-builder':
        openDocBuilder(request.lang);
        sendResponse({ status: 'ok' });
        break;
      case 'set-language':
        applyLang(request.lang || 'zh_CN');
        try { localStorage.setItem('axure_utils_lang', state.lang ?? ''); } catch {}
        if (isExtensionContextValid()) {
          chrome.storage.local.set({ axure_utils_lang: state.lang }).catch(() => {});
        }
        applyLanguageToFloater();
        applyLanguageToEditDialog();
        renderModuleList();
        sendResponse({ status: 'ok' });
        break;
      case 'set-pick-state':
        state.activePickField = { moduleId: request.moduleId, field: request.field, entryIdx: request.entryIdx };
        state.pickMode = true;
        document.addEventListener('mousedown', onMouseDown, true);
        document.addEventListener('mousemove', onMouseMove, true);
        document.addEventListener('mouseup', onMouseUp, true);
        document.body.style.cursor = 'crosshair';
        document.body.style.userSelect = 'none';
        if (state.frameCtx === 'top') {
          document.querySelectorAll('[id^="__lh_mt_"],[id^="__lh_mc_"]').forEach((el) => {
            (el as HTMLElement).style.borderColor = '#373a40';
          });
          const targetId = request.field === 'title'
            ? `__lh_mt_${request.moduleId}`
            : `__lh_mc_${request.moduleId}_${request.entryIdx}`;
          const inp = document.getElementById(targetId);
          if (inp) inp.style.borderColor = '#f08c00';
          hideHighlight();
          selectionLockedReset();
          setStatus(t('pickActive'));
        }
        console.log(state.frameTag, '[蓝湖] set-pick-state:', JSON.stringify(state.activePickField));
        sendResponse({ status: 'ok' });
        break;
      case 'clear-pick-state':
        state.activePickField = null;
        state.pickMode = false;
        document.removeEventListener('mousedown', onMouseDown, true);
        document.removeEventListener('mousemove', onMouseMove, true);
        document.removeEventListener('mouseup', onMouseUp, true);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        if (state.frameCtx === 'top') setStatus('');
        console.log(state.frameTag, '[蓝湖] clear-pick-state');
        sendResponse({ status: 'ok' });
        break;
    }
    return true;
  });
}

function selectionLockedReset(): void {
  state.selectionLocked = false;
}

