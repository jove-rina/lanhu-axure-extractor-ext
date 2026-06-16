/**
 * window.postMessage 桥 — iframe ↔ 顶层 frame 通信
 *
 * 消息类型：
 * - __lh_page_title / __lh_request_page_title：Axure 页面标题同步
 * - __lh_picker_result：iframe 框选结果回传顶层
 * - __lh_sync_pick / __lh_cancel_pick：拾取模式同步
 * - __lh_activate：iframe 晚加载时激活拾取能力
 */
import { state } from '../state';
import { publishAxurePageTitle } from '../modules/manager';
import { finishPick } from '../picker/pick-flow';
import { updateNavButtonsFromData } from '../picker/screenshot';
import { onMouseDown, onMouseMove, onMouseUp } from '../picker/mouse-events';
import { createRubber } from '../picker/rubber';
import { createHoverHighlight } from '../picker/highlight';
import { onKeyDown } from '../picker/keyboard';

export function setupMessageListener() {
  if (state.messageListenerReady) return;
  state.messageListenerReady = true;
  window.addEventListener('message', (e) => {
    const data = e.data;
    if (!data || !data.type) return;

    switch (data.type) {

      // iframe → 顶层：同步 Axure 页面标题
      case '__lh_page_title':
        if (state.frameCtx === 'top' && data.title) {
          state.cachedAxurePageTitle = String(data.title).trim();
        }
        break;

      // 顶层 → iframe：请求页面标题
      case '__lh_request_page_title':
        publishAxurePageTitle();
        break;

      // iframe → 顶层：拾取结果回填
      case '__lh_picker_result':
        if (data.markdown && state.frameCtx === 'top') {
          console.log('[蓝湖] msg 收到拾取结果, state.pickMode:', state.pickMode, 'state.activePickField:', JSON.stringify(state.activePickField), 'md:', data.markdown.slice(0, 40));
          if (state.pickMode && state.activePickField) {
            finishPick(data.markdown);
          } else {
            console.log('[蓝湖] msg 收到结果但拒绝: state.pickMode=%s state.activePickField=%s', state.pickMode, state.activePickField ? 'set' : 'null');
          }
          updateNavButtonsFromData(data);
        }
        break;

      // 顶层 → iframe：同步拾取指令（备用，主通道走 background）
      case '__lh_sync_pick':
        if (state.frameCtx !== 'top') {
          state.activePickField = { moduleId: data.moduleId, field: data.field, entryIdx: data.entryIdx };
          state.pickMode = true;
          document.addEventListener('mousedown', onMouseDown, true);
          document.addEventListener('mousemove', onMouseMove, true);
          document.addEventListener('mouseup', onMouseUp, true);
          document.body.style.cursor = 'crosshair';
          document.body.style.userSelect = 'none';
          console.log('[蓝湖] iframe 收到拾取指令:', state.activePickField);
        }
        break;

      // 顶层 → iframe：取消拾取
      case '__lh_cancel_pick':
        if (state.frameCtx !== 'top') {
          state.pickMode = false;
          state.activePickField = null;
          document.removeEventListener('mousedown', onMouseDown, true);
          document.removeEventListener('mousemove', onMouseMove, true);
          document.removeEventListener('mouseup', onMouseUp, true);
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
        }
        break;

      // 顶层 → iframe：激活（当 iframe 在顶层之后才加载时）
      case '__lh_activate':
        if (state.frameCtx !== 'top') {
          console.log('[蓝湖] iframe 收到激活指令');
          if (document.getElementById('__lh_iframe_active')) break;
          createRubber();
          createHoverHighlight();
          document.addEventListener('keydown', onKeyDown, true);
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
          const m = document.createElement('div');
          m.id = '__lh_iframe_active'; m.style.display = 'none';
          document.body.appendChild(m);
          setupMessageListener();
        }
        break;
    }
  });
}
