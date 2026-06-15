# 🧩 Axure Utilities — 蓝湖 Axure 文档构建器

> 一款 Chrome / Edge 浏览器扩展，专为 **蓝湖 (lanhuapp.com) Axure 原型页面** 设计。
> 告别手动复制粘贴 —— **框选提取页面内容，组装为结构化 Markdown 文档**。

[![Chrome](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=google-chrome&logoColor=white)](https://chrome.google.com/webstore)
[![Edge](https://img.shields.io/badge/Edge-Extension-0078D7?logo=microsoft-edge&logoColor=white)](https://microsoftedge.microsoft.com/addons)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-2ea44f)](https://developer.chrome.com/docs/extensions/mv3/)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## 📖 产品介绍

产品经理、交互设计师和开发每天都要面对蓝湖上的 Axure 原型 —— 查看需求、对照表格、整理文档。Axure Utilities 让这个过程变得高效：

**你在蓝湖 Axure 页面上框选任意区域 → 自动识别表格或文本 → 填入模块化文档 → 一键导出 Markdown。**

不再需要：截图 → 粘贴到文档 → 手打表格 → 调整格式。只需要：选中 → 确认 → 继续。

---

## ✨ 核心能力

### 🎯 框选拾取 — 所见即所得

无需理解 DOM 结构，无需手动选取元素。在页面上**拖拽框选**任意矩形区域：

- **框选表格区域** → 自动识别 Axure 标准组件（`table_cell`、`_形状1`、`box_1` 等），按行列重组为 Markdown 表格
- **框选文本区域** → 提取区域内所有可见文本，合并为段落
- **智能降级**：区域内元素不足时自动降级为文本提取，确保总有结果

### 🧠 智能表格识别

Axure 的表格渲染方式多样 —— 有原生 `<table>`，也有 div + CSS 模拟表格。扩展统一处理：

- 识别 Axure 默认 CSS class 体系的组件
- 按 **Y 坐标分组为行**（容差 8px 对齐）、按 **X 坐标排序为列**
- 自动**补齐缺失列**、**修剪尾部空列**
- 输出标准管道符 Markdown 表格，可直接用于文档、Wiki、AI 工具

### 📦 模块化文档构建

以 **「模块」** 为单位组织文档结构，每个模块包含：

- **标题**：从页面拾取，作为文档二级标题
- **多条内容条目**：每条独立拾取（表格或文本），支持拖拽排序

模块支持：
- **拖拽排序** — 左上角手柄 `☰` 拖拽调整模块顺序
- **独立展开/收起** — 逐个模块折叠，长文档时聚焦核心
- **全选/批量删除** — 勾选模块快速清理
- **新增模块**时不自动展开 — 不打断当前编辑流

### 🔄 跨 iframe 拾取

蓝湖的 Axure 原型通常嵌套在 iframe 中。扩展通过**广播机制**实现：

- 顶层 frame 显示浮动操作面板
- iframe 内激活拾取能力，用户在 iframe 内框选
- 提取结果通过 `postMessage` 传回顶层，填入对应条目
- 无需手动切换 frame，全程无缝

### 💾 按页自动保存

按蓝湖页面的 `versionId + pageId` 自动缓存模块数据：

- **切换页面不丢失** — 换个页面继续看，回来时数据还在
- **关闭浏览器再开** — 模块数据持久化到 `chrome.storage.local`
- **下次打开自动恢复** — 重新点击扩展图标，断点续编

### 🌙 深色玻璃态 UI

为长时间查看原型优化的视觉体验：

- 全暗色主题（`#1a1b1e` 底色）
- 暖金色（`#f08c00`）强调色
- 可拖拽浮动面板，不遮挡页面内容
- 内联 SVG 图标（无外部资源依赖）
- 细滚动条（4px 暗色圆角）
- CSS tooltip 在按钮上方显示

### 🌐 中英文双语

- 弹出窗口和浮动面板均支持中文 / English 即时切换
- 浏览器语言自动检测，首次打开即适配
- 选择偏好后持久记忆

---

## 🔧 安装说明

### 前置条件

| 项目 | 要求 |
|------|------|
| 浏览器 | Google Chrome 88+ 或 Microsoft Edge 88+ |
| 权限 | 无特殊权限要求，标准扩展安装即可 |
| 账号 | 需要蓝湖 (lanhuapp.com) 账号以访问原型页面 |

### 手动安装（推荐，开发者模式）

这是当前唯一安装方式（商店上架筹备中），全程 2 分钟：

**步骤 1：获取扩展文件**

方式 A — 克隆仓库（推荐）：
```bash
git clone https://github.com/jove-rina/lanhu-axure-extractor-ext.git
```

方式 B — 下载 ZIP：
访问 [GitHub 仓库](https://github.com/jove-rina/lanhu-axure-extractor-ext) → 点击「Code」→「Download ZIP」→ 解压到本地文件夹

**步骤 2：打开扩展管理页面**

| 浏览器 | 地址栏输入 |
|--------|-----------|
| Chrome | `chrome://extensions` |
| Edge | `edge://extensions` |

**步骤 3：开启开发者模式**

页面右上角找到「开发者模式」开关，点击开启。

**步骤 4：加载扩展**

- 点击「**加载已解压的扩展**」（Load unpacked）
- 文件选择器中选择克隆或解压后的 `lanhu-axure-extractor-ext` 文件夹
- 点击「选择文件夹」

**步骤 5：确认安装**

- 扩展卡片出现，图标显示在浏览器工具栏右上角 🧩
- 点击图标 → 弹出窗口显示 **"Axure Utilities"** → 安装成功 ✅

> **提示**：如需固定到工具栏方便使用，点击扩展拼图图标 → 找到 Axure Utilities → 点击 📌 固定。

### 从商店安装（等待上架）

> 已准备好发布包，待 Chrome Web Store / Edge Add-ons 审核通过后可通过商店一键安装。

---

## 🚀 使用指南

### 快速上手

```
1. 登录蓝湖 → 打开一个 Axure 原型页面
2. 点击浏览器工具栏扩展图标 🧩
3. 点击「📄 打开文档构建器」
   └─ 页面右下角出现浮动面板
4. 点击「新增模块」
   └─ 列表中新增一个空白模块
5. 点击模块的 🎯 拾取按钮（标题或内容条目均可）
   └─ 状态提示「拾取已激活」
6. 在页面上拖拽框选目标区域
   └─ 释放鼠标 → 自动识别填入
7. 重复步骤 4~6，构建完整的需求文档
8. 点击「预览」查看 → 点击「下载」保存为 .md 文件
```

### 场景示例

**场景：提取 Axure 的表格需求**

1. 新建模块 → 点击标题旁的 🎯 → 框选 Axure 页面上的表格标题区域 → 标题自动填入
2. 点击内容区域的 🎯 → 精确框选整个表格 → 表格自动识别为 Markdown 格式
3. 如需多个表格：该模块下继续「新增」内容条目 → 再拾取另一个表格
4. 继续新建模块，整理不同功能模块的需求

### 操作技巧

- **框选精确度**：框选表格时尽量贴合表格边缘，行列识别效果最佳
- **模块排序**：左上角 `☰` 手柄拖拽调整顺序
- **折叠长文档**：点击模块头部收起/展开，只关注当前模块
- **语言切换**：浮窗标题栏右侧的语言选择器随时切换
- **切换页面**：换页时自动保存，回来继续编辑

---

## 📂 项目结构

```
lanhu-axure-extractor-ext/
├── manifest.json                 # 扩展配置文件 (Manifest V3)
│
├── popup/                        # 弹出窗口
│   ├── popup.html                # 弹出窗口 UI（扩展图标点击显示）
│   ├── popup.css                 # 深色主题样式
│   └── popup.js                  # 交互逻辑 + 语言选择
│
├── content/                      # 内容脚本（注入蓝湖页面）
│   ├── content.js                # 核心脚本：浮动面板、框选拾取、模块管理、Markdown 构建
│   └── marked.min.js             # Markdown 渲染库 (用于预览)
│
├── background/
│   └── background.js             # 后台 Service Worker：帧广播、消息路由、状态管理
│
├── icons/                        # 扩展图标
│   ├── icon16.png
│   ├── icon48.png
│   ├── icon128.png
│   └── icon.svg                  # SVG 源文件
│
├── _locales/                     # 国际化翻译
│   ├── zh_CN/messages.json       # 中文
│   └── en/messages.json          # English
│
└── README.md
```

---

## ⚙️ 技术栈

| 模块 | 技术选型 |
|------|---------|
| 扩展框架 | Chrome Manifest V3 |
| UI | 原生 HTML + CSS（深色玻璃态，内联 SVG 图标，零外部依赖） |
| 内容提取 | DOM 遍历 + 拖拽框选 + Y 坐标分组表格识别算法 |
| Markdown 构建 | 自建表格/文本 → Markdown 转换引擎 |
| Markdown 渲染 | `marked`（仅预览用） |
| 跨 frame 通信 | `chrome.runtime.sendMessage` + `window.postMessage` 双向 |
| 数据持久化 | `chrome.storage.local`（按 `versionId+pageId` 分页缓存） |
| 后台 | Service Worker（无持久化状态） |
| 国际化 | `chrome.i18n` API + 内联 fallback 翻译表 |

---

## 🔄 工作原理

```
用户点击扩展图标 🧩
    │
    ▼
Popup 弹窗 → 点击「📄 打开文档构建器」
    │
    ▼
Background Service Worker 通过 webNavigation.getAllFrames
获取当前页所有 frame 信息
    │
    ▼
向每个符合条件的 frame 广播 'open-builder' 指令
    │
    ├── 顶层 frame (top)    → 显示浮动面板
    └── 子 frame (iframe)   → 激活拾取能力
                              (监听 mousedown/mousemove/mouseup)
    │
    ▼
用户操作浮动面板：
    新增模块 → 点击 🎯 拾取 → 在页面拖拽框选
    │
    ▼
框选区域 → DOM 遍历收集组件 → 算法识别：
    ├── 表格（4 个以上组件 + 多行多列）→ 标准 Markdown 表格
    └── 文本（组件不足或无表格结构）→ 文本段落
    │
    ▼
结果通过 postMessage 传回顶层 frame → 填入对应模块条目
    │
    ▼
模块数据按当前页 versionId+pageId → chrome.storage.local 缓存
    │
    ▼
点击「预览」→ marked 渲染为 HTML 预览
点击「下载」→ 拼接 # 页面标题 + ## 模块标题 + 内容 → 导出 .md
```

### 核心设计要点

| 设计决策 | 说明 |
|---------|------|
| **浮窗只在顶层 frame** | 通过 `window.top === window.self` 判断，避免多个 iframe 各显示一个面板 |
| **拾取跨 iframe** | Background 广播 'start-picker' / 'stop-picker' 到所有 frame；子 frame 结果通过 `postMessage({action:'picker-result',...})` 回传顶层 |
| **表格识别** | 收集框选区域内 Axure 标准组件 → Y 坐标分组（容差 8px）→ X 坐标排序 → 补齐/修剪空列 → Markdown |
| **数据隔离** | 每页独立缓存 key（`lh_{versionId}_{pageId}`），互不干扰 |

---

## ⚠️ 使用限制

- **域名限制**：仅在 `lanhuapp.com` 及其子域名下工作
- **跨域 iframe**：浏览器安全策略限制扩展直接访问跨域 iframe 的 DOM。当前通过顶层 `postMessage` + iframe 内自运行脚本绕过，部分复杂场景可能需要手动点击 iframe 内部激活
- **提取质量**：表格识别依赖 Axure 默认 CSS class（`ax_default.table_cell` 等）。若原型使用了深度自定义的组件命名，提取效果可能下降
- **内容脚本**：使用 `all_frames: true` 自动注入所有 frame

---

## ❓ 常见问题

**Q: 点击「打开文档构建器」后浮窗没出现？**
A: 刷新页面重试。确认当前在蓝湖 Axure 页面（地址栏包含 `lanhuapp.com`）。

**Q: 框选提取的内容不准确？**
A: 提取质量取决于 Axure 渲染方式。尝试更精确地框选 —— 确保框选区域完整包裹目标表格或文本块。如果原型使用了自定义 CSS class，可以提 Issue 适配。

**Q: 跨域 iframe 中拾取没反应？**
A: 先点击 iframe 内部让页面获得焦点，再操作浮窗拾取。扩展已自动注入所有同源 frame。

**Q: 模块数据会丢失吗？**
A: 按 `versionId+pageId` 缓存到 `chrome.storage.local`，关闭浏览器不丢失。清除浏览器缓存会删除数据。

**Q: 如何迁移或备份数据？**
A: chrome.storage.local 是浏览器本地的，无法直接导出。后续版本会考虑增加数据导入导出功能。

---

## 🤝 贡献

产品的完善离不开社区的参与。欢迎：

- **提交 Issue**：遇到 Bug 或有功能建议 → [新建 Issue](https://github.com/jove-rina/lanhu-axure-extractor-ext/issues)
- **提交 PR**：代码贡献 → 先 fork 仓库，开发完成后提交 Pull Request

```bash
git checkout -b feature/your-feature
git commit -m 'feat: add your feature'
git push origin feature/your-feature
```

---

## 📄 License

[MIT](LICENSE) © 2026 jove-rina
