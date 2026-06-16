/**
 * 蓝湖 Axure 需求提取器 — 内容脚本入口
 *
 * 职责：初始化 frame 上下文、消息桥、页面标题同步、Chrome API。
 * UI / 拾取 / 编辑等逻辑分布在子模块中，由 import 链按需打包。
 */
import { initContext } from './context';
import { initPageTitleBridge } from './modules/manager';
import { setupMessageListener } from './bridge/post-message';
import { registerChromeMessageApi } from './api';

/** CRXJS 动态注入入口（见 dist/assets/index.ts-loader-*.js） */
export function onExecute(): void {
  initContext();
  setupMessageListener();
  initPageTitleBridge();
  registerChromeMessageApi();
}
