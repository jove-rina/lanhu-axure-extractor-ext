# 🧩 Axure Utilities — 蓝湖 Axure 文档构建器

> 一款 Chrome / Edge 浏览器扩展，专为 **蓝湖 (lanhuapp.com) Axure 原型页面** 设计。  
> **框选提取页面内容 → 模块化编辑 → 一键导出 Markdown。**

[English](README.en.md) · [更新日志](CHANGELOG.md)

[Chrome](https://chrome.google.com/webstore)
[Edge](https://microsoftedge.microsoft.com/addons)
[Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
License

---

## 目录

- [产品介绍](#产品介绍)
- [功能一览](#功能一览)
- [快速开始](#快速开始)
- [功能详解](#功能详解)
  - [文档构建浮框](#文档构建浮框)
  - [框选拾取](#框选拾取)
  - [模块编辑弹窗](#模块编辑弹窗)
  - [预览与导出](#预览与导出)
  - [按页保存与页面切换](#按页保存与页面切换)
  - [界面与交互](#界面与交互)
- [安装说明](#安装说明)
- [项目结构](#项目结构)
- [技术说明](#技术说明)
- [常见问题](#常见问题)
- [贡献与许可](#贡献与许可)

---

## 产品介绍

产品经理、交互设计师和开发每天都要在蓝湖上查看 Axure 原型、对照表格、整理需求文档。Axure Utilities 将这一过程压缩为：

**在原型页框选区域 → 自动识别表格/文本 → 填入模块化文档 → 预览 / 复制 / 下载 Markdown。**

无需再：截图 → 粘贴 → 手打表格 → 反复调整格式。

---

## 功能一览


| 类别       | 能力                                    |
| -------- | ------------------------------------- |
| **内容提取** | 拖拽框选；Axure 表格智能识别；文本降级提取；跨 iframe 拾取  |
| **文档构建** | 模块化标题 + 多条目；拖拽排序；展开/收起；全选/批量删除        |
| **编辑增强** | 独立编辑弹窗；分栏 Markdown 编辑器；撤销/重做；拾取填充     |
| **导出**   | 整文档 / 单模块：预览、复制、下载；文件名含真实页面标题         |
| **持久化**  | 按 `versionId + pageId` 自动保存；切换页面提示与恢复 |
| **体验**   | 深色 UI；可拖拽浮框；固定 Tooltip；中英文切换          |


---

## 快速开始

```
1. 登录蓝湖 → 打开 Axure 原型页
2. 点击扩展图标 →「📄 打开文档构建器」
3. 点击「新增模块」→ 自动滚动并聚焦新模块
4. 点击 🎯 拾取 → 在页面上框选标题或内容区域
5. 重复添加模块/条目，或使用「编辑」在弹窗中批量修改
6. 底部「预览 / 复制 / 下载」导出整份文档
```

> 若浮框未出现：请**刷新页面**后重试，并确认 URL 包含 `lanhuapp.com`。

---

## 功能详解

### 文档构建浮框

浮框固定在页面右下角（可拖拽），是日常编辑的主界面：

- **工具栏**：新增模块、展开/收起全部、全选、批量删除
- **模块卡片**：标题预览、复选框、操作按钮组
- **模块操作**（每组按钮融合排列，悬停显示提示）：
  - 编辑 / 预览 / 复制 / 下载
  - 上移 / 下移 / 删除
- **模块内容区**：标题输入 + 多条内容条目（拾取、排序、删除）
- **底部栏**：整文档预览、复制、下载
- **聚焦模式**：点击模块后高亮当前模块，其余模块淡化显示
- **新增模块**：默认含空标题与一条空条目，并自动滚动到可见位置

### 框选拾取

- 点击 🎯 后进入拾取模式，在 Axure 页面（含 iframe 内）**拖拽框选**矩形区域
- **表格**：识别 `table_cell`、`_形状1` 等 Axure 组件，按 Y/X 坐标重组为 Markdown 表格
- **文本**：区域内可见文本合并为段落；元素不足时自动降级为文本提取
- **跨 iframe**：顶层显示浮框，子 frame 内框选，结果经 `postMessage` 回填
- **覆盖模式**：同一字段继续拾取会覆盖已有内容

### 模块编辑弹窗

点击模块「编辑」打开独立弹窗，适合长文与 Markdown 精细编辑：


| 能力               | 说明                               |
| ---------------- | -------------------------------- |
| **布局**           | 默认宽度 60%、高度 80vh（最高 750px）；可拖拽移动 |
| **窗口控制**         | 最小化 / 还原、全屏 / 退出全屏、关闭            |
| **标题编辑**         | 输入框 + 拾取按钮；拾取时弹窗可收至左下角           |
| **条目编辑**         | 每条可折叠/展开；内容区默认 400px 高，可拖拽调整     |
| **Markdown 编辑器** | 源码 / 分栏 / 预览三种视图；加粗、斜体、链接等快捷插入   |
| **撤销 / 重做**      | 编辑器内文本操作可撤销                      |
| **拾取填充**         | 拾取完成后 toast 提示填充的是标题还是内容         |
| **保存策略**         | 仅点击「保存」才写入模块数据；切换页面时自动关闭弹窗       |


### 预览与导出

**整文档**

- 结构：`# 页面标题` + `## 模块标题` + 条目内容
- 页面标题取自 Axure iframe 内实际页面名（非蓝湖壳页 title）
- 下载文件名：`页面标题_日期.md`

**单模块**

- 预览 / 复制 / 下载独立 Markdown
- 模块标题统一为 `##` 二级标题（与整文档结构一致）

**预览窗口**

- 深色主题 HTML 预览（基于 `marked`）
- 宽表格支持横向滚动
- 滚动条样式与扩展内 UI 一致

### 按页保存与页面切换

- 缓存 key：`lh_{versionId}_{pageId}`，存入 `chrome.storage.local`
- 切换蓝湖页面时：当前页数据自动保存
- 可选全屏提示说明如何重新打开构建器；支持「不再提示」
- 关闭浏览器后数据仍保留（清除浏览器数据除外）

### 界面与交互

- **语言**：Popup 中选择中文 / English / 跟随浏览器，浮框与编辑弹窗同步更新
- **Tooltip**：固定定位，不被模块 `overflow` 裁剪
- **滚动条**：浮框、编辑弹窗、预览页统一 6px 暗色细滚动条
- **按钮**：统一规格与 hover 反馈；输入框 focus 高亮

---

## 安装说明

### 前置条件


| 项目  | 要求                          |
| --- | --------------------------- |
| 浏览器 | Chrome 或 Edge               |
| 站点  | 蓝湖 Axure 页面（`lanhuapp.com`） |
| 权限  | 标准扩展安装即可                    |


### 开发者模式安装

1. 克隆仓库
  `git clone https://github.com/jove-rina/lanhu-axure-extractor-ext.git`
2. 安装依赖并构建
  ```bash
   pnpm install
   pnpm run build
  ```
3. 打开 `chrome://extensions` 或 `edge://extensions`
4. 开启「开发者模式」→「加载已解压的扩展」
5. 选择项目下的 `**dist**` 目录（不是仓库根目录）
6. 工具栏出现扩展图标即成功

开发时运行 `pnpm run dev`，在扩展管理页点击「重新加载」后刷新蓝湖页面即可调试。

### 打包发布（可选）

```bash
pnpm run pack
# 或分步：pnpm run build && node scripts/pack.mjs
```

输出至 `dist/lanhu-axure-extractor-ext-v{version}.zip`。

### 更新扩展图标

扩展图标源文件为 `public/icons/icon.svg`（橙色圆形底 + 白色 **A** + 放大镜）。修改 SVG 后运行：

```bash
pnpm run icons
# 或：node scripts/gen-icons.mjs
```

会生成 `icon16.png`、`icon48.png`、`icon128.png`。生成后执行 `pnpm run build`，并在扩展管理页重新加载扩展。

### 商店安装

Chrome Web Store / Edge Add-ons 上架筹备中。

---

## 项目结构

> **注意**：`background`、`content`、`popup`、`_locales` 均在 **`src/`** 与 **`public/`** 下，**不在仓库根目录**。根目录若曾存在同名空文件夹，为 v1 遗留，已清理。

```
lanhu-axure-extractor-ext/
├── src/
│   ├── manifest.json             # 扩展清单（CRXJS 构建入口）
│   ├── background/
│   │   └── index.ts              # Service Worker：跨 iframe 消息广播
│   ├── content/                  # 内容脚本（注入蓝湖页面，all_frames）
│   │   ├── index.ts              # 入口 onExecute
│   │   ├── api.ts                # chrome.runtime.onMessage
│   │   ├── state.ts              # 全局可变状态
│   │   ├── i18n/                 # 运行时国际化（配合 public/_locales）
│   │   ├── markdown/             # 清洗、表格、预览
│   │   ├── extract/              # 框选/元素/全页提取
│   │   ├── modules/manager.ts    # 模块 CRUD 与持久化
│   │   ├── ui/                   # 浮窗、编辑弹窗、预览
│   │   ├── picker/               # 框选拾取、截图、鼠标事件
│   │   └── bridge/post-message.ts# iframe 通信
│   ├── popup/                    # 扩展图标弹窗
│   │   ├── index.html
│   │   ├── index.ts
│   │   └── popup.css
│   └── shared/                   # 消息常量、语言工具
├── public/
│   ├── icons/                    # 扩展图标：icon.svg 源文件 + 16/48/128 PNG（manifest 引用）
│   └── _locales/                 # 扩展名称/描述及 chrome.i18n 文案
│       ├── zh_CN/messages.json
│       └── en/messages.json
├── scripts/
│   ├── pack.mjs                  # 将 dist/ 打包为 zip
│   └── gen-icons.mjs             # 从 icon.svg 生成 PNG 图标（pnpm run icons）
├── demo/                         # 本地 Axure 页面夹具（可选，不参与构建）
├── vite.config.ts
├── dist/                         # 构建产物（开发者模式加载此目录）
└── ...
```

---

## 技术说明

### 技术栈


| 模块       | 选型                                                  |
| -------- | --------------------------------------------------- |
| 扩展框架     | Chrome Manifest V3                                  |
| 工程化      | Vite + TypeScript + @crxjs/vite-plugin              |
| 图标生成     | `public/icons/icon.svg` + `@resvg/resvg-js`（`pnpm run icons`） |
| UI       | 原生 HTML + CSS，内联 SVG，零 UI 框架依赖                      |
| 内容提取     | DOM 遍历 + 框选 + Y/X 坐标表格算法                            |
| Markdown | 自建转换 + `marked` 预览渲染                                |
| 通信       | `chrome.runtime.sendMessage` + `window.postMessage` |
| 存储       | `chrome.storage.local`                              |
| 国际化      | `chrome.i18n` + 内联 fallback 表                       |


### 工作流程

```
Popup「打开文档构建器」
    → Background 广播 open-builder 到所有 lanhu frame
    → 顶层 frame：创建并显示浮框
    → 子 iframe：激活拾取监听

用户框选 → 表格/文本识别 → postMessage 回填模块
    → 按 versionId+pageId 写入 storage

预览/下载 → 拼接 Markdown → marked 渲染或 Blob 下载
```

### 设计要点


| 决策          | 说明                                           |
| ----------- | -------------------------------------------- |
| 浮框仅在顶层      | `window.top === window.self`，避免多 iframe 重复面板 |
| 跨 iframe 拾取 | Background 广播 + iframe 内脚本 + postMessage 回传  |
| 真实页面标题      | iframe postMessage 同步 Axure `header.title`   |
| 数据隔离        | 每页独立 storage key，互不影响                        |


### 使用限制

- 仅支持 `lanhuapp.com` 及子域
- 跨域 iframe 需用户先点击 iframe 获取焦点
- 表格识别依赖 Axure 默认 CSS class，深度自定义组件可能降级

---

## 常见问题

**浮框打不开？**  
刷新页面后重试；在 `chrome://extensions` 重新加载扩展；打开 DevTools 查看 Console 是否有报错。

**拾取无反应？**  
先点击 iframe 内部再拾取；确认拾取模式已激活（状态栏有提示）。

**表格识别不准？**  
尽量紧贴表格边缘框选；自定义组件可提 Issue 适配。

**数据会丢吗？**  
按页持久化到 `chrome.storage.local`；清除浏览器数据会丢失。导入/导出功能规划中。

**如何切换语言？**  
在 Popup 右上角语言下拉框选择，浮框文案即时更新。

---

## 贡献与许可

欢迎 [提交 Issue](https://github.com/jove-rina/lanhu-axure-extractor-ext/issues) 或 Pull Request。

**许可**：[GNU GPL v3.0](LICENSE) © 2026 Jove Rina

**更新日志**：[CHANGELOG.md](CHANGELOG.md) · [English](CHANGELOG.en.md)