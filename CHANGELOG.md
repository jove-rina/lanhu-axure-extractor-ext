# 更新日志

本项目的所有重要变更均记录在此文件中。格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

## [2.0.0] - 2026-06-16

### 新增

- 扩展图标生成脚本 `pnpm run icons`（`scripts/gen-icons.mjs`，基于 `@resvg/resvg-js` 从 SVG 导出 PNG）
- 扩展图标源文件 `public/icons/icon.svg`：橙色圆形底、放大版 **A** 字母与橙色描边放大镜

### 移除

- 根目录遗留空目录 `background/`、`content/`、`popup/`、`_locales/`（v1 布局残留；v2.0.0 重构后源码已迁至 `src/`，扩展文案迁至 `public/_locales/`）

### 变更

- 版本号升级至 2.0.0
- Popup 版本号从 manifest 自动读取，与扩展版本保持一致
- **工程化重构**：由单文件 `content.js` / `background.js` 迁移为 **Vite + TypeScript + @crxjs/vite-plugin** 模块化工程
- **源码布局**：`src/content/` 拆分为 `state`、`ui`、`picker`、`extract`、`modules`、`markdown`、`i18n`、`bridge` 等子模块；入口为 `onExecute()`
- **构建与安装**：`pnpm install` / `pnpm run build`，开发者模式加载 **`dist/`** 目录（非仓库根目录）
- **包管理**：由 npm 切换为 **pnpm**（`pnpm-lock.yaml`、`packageManager` 字段）
- 静态资源与 `_locales` 迁至 `public/`；`marked` 改为 npm 依赖按需打包
- 扩展图标视觉优化：A 字母更大、更贴近圆形边距；放大镜加粗橙色描边以提升辨识度

### 修复

- 模块化拆分后若干样式常量与函数未正确 import/export，导致运行时 `ReferenceError`（如 `BTN_DISABLED`、`BTN_ACCENT_XS`、`saveModules`、`refreshPageTitleFromIframes`、`getStorageKey` 等）
- 扩展重载后旧 content script 仍调用 `chrome.*`，抛出 `Extension context invalidated`；新增扩展上下文失效检测、定时器停止与 UI 清理

## [1.0.0] - 2026-06-15

### 新增

- 文档构建浮动面板：模块化编辑、按页自动保存
- 框选拾取：支持表格识别与跨 iframe 提取
- 模块级预览、复制、下载；整文档预览、复制、下载
- 模块编辑弹窗：Markdown 分栏编辑器、撤销/重做、拾取填充
- 编辑弹窗：拖拽、最小化、全屏、条目折叠与高度调整
- 中英文界面与 Popup 语言切换
- 从 Axure iframe 提取真实页面标题用于预览与下载文件名
- 打包脚本 `scripts/pack.ps1`

### 改进

- 统一按钮规格、滚动条样式与 hover 反馈
- 模块聚焦高亮与其他模块淡化
- 固定定位 Tooltip，避免 overflow 裁剪与 hover 抖动
- 预览窗口滚动条与扩展内 UI 风格一致
- 模块预览/下载标题统一为 `##` 二级标题

### 修复

- 浮框定位：新增模块时位置抖动、快速点击定位错乱
- 打开文档构建时浮框位置重置
- 页面切换提示 i18n 未解析
- 页面切换时编辑弹窗未关闭
- `EDIT_WIN_BTN is not defined` 运行时错误

## [0.9.0] - 2026-06（开发阶段）

### 新增

- 模块 UI 改版：展开/收起、复选框、拖拽排序
- Markdown 预览与 chrome.storage 持久化
- 共享预览窗口、模块标题自动跟随拾取

### 修复

- 拾取覆盖模式、表格空单元格保留
- 预览 CSP 限制改用预渲染 HTML
- selectionLocked 重置与 UI 细节
