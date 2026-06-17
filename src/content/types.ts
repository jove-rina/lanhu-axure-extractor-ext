/**
 * 内容脚本领域类型
 */
export interface DocModule {
  id: number;
  title: string;
  contents: string[];
}

/** 编辑弹窗中的模块草稿（不含 id） */
export interface DocModuleDraft {
  title: string;
  contents: string[];
}

export type PickField = 'title' | 'content';

export interface ActivePickField {
  moduleId: number;
  field: PickField;
  entryIdx?: number;
}

export interface EditDialogState {
  moduleId: number;
  draft: DocModuleDraft;
  shell: HTMLElement;
  expandedStyle: Record<string, string>;
  minimized: boolean;
  pickMinimized: boolean;
  fullscreen: boolean;
  entryHeights: Record<number, number>;
  collapsedEditEntries: Set<number>;
  scrollToEntryIdx: number | null;
  renderContents?: () => void;
}

export interface ExtractSection {
  type: string;
  markdown: string;
  heading?: string;
}

export interface ExtractResult {
  type: string;
  markdown: string;
}

export interface ContainerFindResult {
  el: Element | null;
  depth: number;
}

export interface ContainerRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface NavPickerResultData {
  breadcrumb?: string;
  navIndex?: number;
  navPathLength?: number;
}

export type FrameContext = 'top' | 'lanhu-iframe' | 'mockplus-iframe' | 'unknown-iframe' | 'cross-origin-iframe';

export type MdCmd = 'bold' | 'italic' | 'link' | 'heading' | 'list' | 'code';
