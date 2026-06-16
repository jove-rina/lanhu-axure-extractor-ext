/**
 * 内容脚本全局可变状态（单一数据源）
 *
 * - all_frames 下每个 frame 各自持有一份 state，互不共享。
 * - 模块 CRUD、拾取、浮窗、编辑弹窗等均读写此对象，避免多文件闭包状态不一致。
 */
import type { ActivePickField, ContainerRect, DocModule, EditDialogState, FrameContext } from './types';

export const state = {
  active: false,
  floater: null as HTMLElement | null,
  floaterAnchorX: null as number | null,
  clampRafId: 0,
  rubber: null as HTMLElement | null,
  isFloaterDrag: false,
  selStartX: 0,
  selStartY: 0,
  selEndX: 0,
  selEndY: 0,
  isDragging: false,
  selectionLocked: false,
  modules: [] as DocModule[],
  nextModuleId: 1,
  activePickField: null as ActivePickField | null,
  pickMode: false,
  collapsedModuleIds: new Set<number>(),
  selectedModuleIds: new Set<number>(),
  currentStorageKey: '',
  urlPollTimer: null as ReturnType<typeof setInterval> | null,
  pickDebounceTimer: null as ReturnType<typeof setTimeout> | null,
  cachedAxurePageTitle: '',
  messageListenerReady: false,
  editDialogState: null as EditDialogState | null,
  focusedModuleId: null as number | null,
  scrollToFloaterEntry: null as { moduleId: number; entryIdx: number } | null,
  scrollToFloaterModule: null as number | null,
  moduleFocusBound: false,
  lhFloatTipEl: null as HTMLElement | null,
  lhFloatTipTarget: null as HTMLElement | null,
  lhTooltipInited: false,
  createdByMe: false,
  previewWindow: null as Window | null,
  hoverHighlight: null as HTMLElement | null,
  showRendered: false,
  lastRawMd: '',
  navPath: [] as Element[],
  navIndex: -1,
  currentSelectedEl: null as Element | null,
  appendMode: false,
  containerRects: [] as ContainerRect[],
  currentScreenshotMode: null as string | null,
  frameCtx: 'top' as FrameContext,
  frameTag: '[T ]',
  lang: null as string | null,
};

