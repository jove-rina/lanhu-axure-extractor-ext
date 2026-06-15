# 🧩 蓝湖 Axure 需求提取器 (Lanhu Axure Extractor)

> 一款 Chrome / Edge 浏览器扩展，从蓝湖 Axure 原型页面中**一键提取产品需求表格和内容**，导出为 Markdown 文件。

![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=google-chrome&logoColor=white)
![Edge](https://img.shields.io/badge/Edge-Extension-0078D7?logo=microsoft-edge&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-2ea44f)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## 📸 预览

| 弹出窗口 | 提取结果 |
|---------|---------|
| ![popup](https://via.placeholder.com/420x520/1a1b1e/f08c00?text=Popup+UI) | ![result](https://via.placeholder.com/420x520/1a1b1e/40c057?text=Markdown+Preview) |

> *截图稍后补充*

---

## ✨ 功能特点

- **📋 表格提取** — 自动识别 Axure 原型中的 HTML 表格和 div 模拟表格，转换为标准 Markdown 表格
- **📝 文本提取** — 提取页面中的标题、段落、列表等结构化文本
- **💬 标注/注释提取** — 提取蓝湖页面上的标注和评论内容
- **🖼️ 多 Frame 支持** — 自动注入蓝湖页面的所有 frame（包括 iframe），全面捕获内容
- **⚡ 一键操作** — 点击插件图标 → 提取 → 预览 → 下载 / 复制，三步搞定
- **📄 标准 Markdown** — 导出带元数据的 Markdown 文件，可直接用于文档、Wiki 或 AI 工具
- **🌙 深色主题** — 适配暗色模式，护眼舒适

---

## 🔧 安装方法

### 手动安装（开发者模式）

1. **下载或克隆本仓库**
   ```bash
   git clone https://github.com/jove-rina/lanhu-axure-extractor-ext.git
   ```

2. **打开浏览器扩展管理页面**
   - Chrome: 地址栏输入 `chrome://extensions`
   - Edge: 地址栏输入 `edge://extensions`

3. **开启「开发者模式」**（右上角开关）

4. **加载扩展**
   - 点击「加载已解压的扩展」
   - 选择项目文件夹 `lanhu-axure-extractor-ext`

5. **安装成功** ✅

### 从 Chrome 应用商店（待上架）

> *将扩展打包并发布到 Chrome Web Store 后可在此处获取。*

---

## 🚀 使用方法

1. **登录蓝湖**，打开一个 **Axure 原型页面**
2. 点击浏览器工具栏中的扩展图标 🧩
3. 在弹出的窗口中点击 **「🔍 提取需求内容」**
4. 等待扫描完成，在预览区查看提取结果
5. 选择：
   - **💾 下载 Markdown** — 保存为 `.md` 文件
   - **📋 复制到剪贴板** — 粘贴到任意文档

### 提示

- 如果 Axure 内容在 **iframe** 中，扩展会自动注入到所有 frame，无需额外操作
- 如果遇到跨域 iframe，先**点击 iframe 内部**让页面激活，再提取
- 建议**刷新页面**后再提取，确保内容脚本完全加载

---

## 📂 项目结构

```
lanhu-axure-extractor-ext/
├── manifest.json           # 扩展配置 (Manifest V3)
├── popup/
│   ├── popup.html          # 弹出窗口 UI
│   ├── popup.css           # 深色主题样式
│   └── popup.js            # 弹出窗口交互逻辑
├── content/
│   └── content.js          # 核心提取脚本（注入蓝湖页面）
├── background/
│   └── background.js       # 后台服务（协调 frame、触发下载）
├── icons/
│   └── icon128.png         # 扩展图标
├── .gitignore
└── README.md
```

---

## ⚙️ 技术栈

| 模块 | 技术 |
|------|------|
| 扩展框架 | Chrome Manifest V3 |
| UI | 原生 HTML + CSS (深色玻璃态) |
| 提取引擎 | DOM 遍历 + 正则 + HTML → Markdown 转换 |
| 通讯 | `chrome.runtime.sendMessage` / `chrome.tabs.sendMessage` |
| 后台 | Service Worker (持久化无) |

---

## 🔄 工作原理

```
用户点击插件图标
    ↓
Popup 发送提取请求 → Background Service Worker
    ↓
Background 查询 tab 的所有 frame (webNavigation.getAllFrames)
    ↓
向每个 frame 发送提取指令 ← Content Script 已注入所有 frame
    ↓
每个 Content Script 扫描 DOM：
  ├─ <table> 元素 → Markdown 表格
  ├─ div 模拟表格  → Markdown 表格
  ├─ H1~H6 + 正文  → Markdown 标题/段落
  └─ 标注/注释 → Markdown 引用块
    ↓
汇总结果 → Preview → Download / Copy
```

---

## ⚠️ 注意事项

- **仅限于 `lanhuapp.com` 域名下使用**
- 内容脚本使用 `all_frames: true`，会自动注入到页面内的所有 frame
- 跨域 iframe 的 DOM 受浏览器安全策略限制，扩展无法直接访问，需手动点击激活
- 提取效果取决于 Axure 原型在蓝湖中的渲染方式，表格越标准提取效果越好
- 需要 `webNavigation` 权限来获取页面内所有 frame 信息

---

## 🤝 贡献

欢迎提交 Issue 和 PR！如果你在使用过程中遇到问题或有改进建议：

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交改动 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 提交 Pull Request

---

## 📄 License

[MIT](LICENSE) © 2025 jove-rina

---

## 🙋 常见问题

**Q: 点击提取后提示「内容脚本未加载」？**
> A: 刷新页面后重试，确保浏览器完全加载了蓝湖页面。

**Q: 表格提取出来格式不对？**
> A: Axure 中的表格可能是通过 div + CSS 模拟的，非标准 HTML `<table>` 元素。扩展会尝试识别 div 表格，但复杂布局可能无法完美还原。

**Q: 跨域 iframe 中的内容提取不到？**
> A: 浏览器安全策略限制扩展访问跨域 iframe 的 DOM。可以先点击 iframe 内部让页面激活焦点，再提取。
