/** chrome.runtime / tabs 消息 action 常量 */
export const MSG = {
  EXTRACT: 'extract',
  DIAGNOSE: 'diagnose',
  PING: 'ping',
  OPEN_BUILDER: 'open-builder',
  SYNC_PICK_STATE: 'sync-pick-state',
  CANCEL_PICK_STATE: 'cancel-pick-state',
  START_PICKER: 'start-picker',
  STOP_PICKER: 'stop-picker',
  GET_PICKER_STATE: 'get-picker-state',
  PICKER_RESULT: 'picker-result',
  CONTENT_RELOADED: 'content-reloaded',
  PICKER_CANCELLED: 'picker-cancelled',
  CAPTURE_RECT: 'capture-rect',
  EXTRACT_AXURE: 'extract-axure',
  DIAGNOSE_ME: 'diagnose-me',
  SET_LANGUAGE: 'set-language',
  SET_PICK_STATE: 'set-pick-state',
  CLEAR_PICK_STATE: 'clear-pick-state',
} as const;

export type MessageAction = typeof MSG[keyof typeof MSG];
