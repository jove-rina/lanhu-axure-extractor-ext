# AI Bridge — 蓝湖插件 Native Messaging 桥接设计

> 让外部 AI（Hermes Agent 等）通过标准 HTTP 接口调用插件的能力：
> 框选提取、截图、文档构建、页面解析。

---

## 一、整体架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                        外部 AI / 客户端                              │
│  (Hermes Agent / curl / 任何 HTTP 客户端)                            │
└─────────────────┬───────────────────────────────────────────────────┘
                  │ HTTP POST /api/*
                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│                   Python 桥接服务 (bridge_server.py)                  │
│                                                                      │
│  ┌─────────────┐  ┌────────────────────┐  ┌──────────────────────┐  │
│  │  HTTP 监听   │  │ Native Messaging    │  │ 截图文件缓存模块      │  │
│  │ :19876       │  │ 客户端 (Chrome)     │  │  (screenshots/)     │  │
│  └──────┬──────┘  └─────────┬──────────┘  └──────────────────────┘  │
│         │                   │                                        │
│         │  请求队列          │ Chrome Native Messaging 协议            │
│         │  + 请求/响应匹配   │ (stdin/stdout, JSON 定界)              │
│         └───────────────────┘                                        │
└──────────────────────────────┬───────────────────────────────────────┘
                               │ stdin/stdout (JSON delimited)
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                   Chrome 浏览器                                        │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  Native Messaging Host (registry: com.lanhu.bridge)          │    │
│  │  → 启动 bridge_server.py 或 连接到已运行的实例                  │    │
│  └──────────────────────────┬───────────────────────────────────┘    │
│                             │ chrome.runtime.sendNativeMessage()     │
│  ┌──────────────────────────▼───────────────────────────────────┐    │
│  │  Extension Background (Service Worker)                       │    │
│  │                                                              │    │
│  │  nativeMessage 监听器 → 路由到对应 handler:                   │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │    │
│  │  │ extract  │  │ discover │  │ ping     │  │ capture  │    │    │
│  │  │ (提取)   │  │ (发现)   │  │ (心跳)   │  │ (截图)   │    │    │
│  │  └────┬─────┘  └────┬─────┘  └──────────┘  └─────┬────┘    │    │
│  │       │              │                            │         │    │
│  │       ▼              ▼                            ▼         │    │
│  │  ┌────────────────┬──────────────────┐  ┌─────────────────┐ │    │
│  │  │ Content Script │ 模块发现算法      │  │ captureVisible  │ │    │
│  │  │ (on lanhuapp)  │                  │  │ + OffscreenCanvas│ │    │
│  │  │                │ 扫描页面 → 聚类   │  └─────────────────┘ │    │
│  │  │ 框选 / DOM     │ → 识别类型        │                      │    │
│  │  │ 表格识别 / 文本│ → 生成标注截图    │                      │    │
│  │  └────────────────┴──────────────────┘                      │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
```

### 数据流（一次提取请求）

```
1. AI → POST /api/extract { url, area, format='markdown'|'json'|'screenshot' }
2. Python 桥接 → 分配 request_id → 写 stdin: { "type": "extract", ... }
3. Chrome → Background → Content Script → 在指定页面执行提取
4. Content Script → postMessage → Background
5. Background → write stdout: { "type": "response", "request_id": "...", "data": ... }
6. Python 桥接 → 匹配 request_id → HTTP 响应返回给 AI
```

---

## 二、Native Messaging 协议

### Native Messaging Host 注册

**文件 1：`com.lanhu.bridge.json`** → 放到 Chrome Native Messaging 目录

```json
{
  "name": "com.lanhu.bridge",
  "description": "蓝湖插件 AI 桥接",
  "path": "G:\\Workbench\\lanhu-axure-extractor-ext\\bridge\\bridge_host.bat",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://<extension_id>/"]
}
```

**文件 2：`bridge_host.bat`** — Windows 启动脚本

```bat
@echo off
python "G:\Workbench\lanhu-axure-extractor-ext\bridge\bridge_server.py" --native-mode
```

**注册表路径：**
```
HKEY_CURRENT_USER\Software\Google\Chrome\NativeMessagingHosts\com.lanhu.bridge
→ 值 = G:\Workbench\lanhu-axure-extractor-ext\bridge\com.lanhu.bridge.json
```

### Native Messaging 数据格式

Chrome Native Messaging 协议：**4字节小端长度前缀 + JSON UTF-8 数据**。

Python 端用 `struct` 读写，JS 端由 `chrome.runtime.sendNativeMessage` 自动处理。

### 消息结构

**请求（Python → Chrome）：**
```json
{
  "type": "extract",
  "request_id": "req_abc123",
  "data": {
    "url": "https://lanhuapp.com/...",
    "tab_id": null,
    "area": { "x": 100, "y": 200, "width": 500, "height": 300 },
    "format": "markdown",
    "timeout_ms": 30000
  }
}
```

**响应（Chrome → Python）：**
```json
{
  "type": "response",
  "request_id": "req_abc123",
  "success": true,
  "data": {
    "content": "| 字段 | 值 |\n|------|-----|\n|...",
    "screenshot_path": null
  }
}
```

---

## 三、Python 桥接服务 (`bridge_server.py`)

### 职责

1. **HTTP 服务** — 在 `localhost:19876` 监听 AI 的 API 请求
2. **Native Messaging 客户端** — 通过 stdin/stdout 与 Chrome 通信
3. **请求路由** — 把 HTTP 请求转为 Native Message，匹配响应返回

### API 端点

#### `GET /ping` — 健康检查
```
→ { "status": "ok", "chrome_connected": true }
```

#### `GET /status` — 插件状态
```
→ {
  "chrome": true,
  "lanhu_tabs": ["页面A", "页面B"],
  "plugin_version": "1.0.0",
  "active_tab_id": 123
}
```

#### `POST /api/discover` — 发现页面模块（核心接口）

**请求：**
```json
{
  "url": "https://lanhuapp.com/web/project/xxx",
  "annotate": true
}
```

**响应：**
```json
{
  "request_id": "req_xxx",
  "success": true,
  "data": {
    "modules": [
      {
        "id": "mod_1",
        "type": "table",
        "label": "用户信息表格",
        "bounding_box": { "x": 120, "y": 340, "w": 600, "h": 200 },
        "sample": "| 姓名 | 年龄 | 角色 |\n| 张三 | 28 | 管理员 |",
        "rows": 5,
        "cols": 4
      },
      {
        "id": "mod_2",
        "type": "text",
        "label": "搜索栏区域",
        "bounding_box": { "x": 100, "y": 80, "w": 400, "h": 60 },
        "sample": "搜索框 + 筛选按钮"
      },
      {
        "id": "mod_3",
        "type": "card_list",
        "label": "卡片列表",
        "bounding_box": { "x": 50, "y": 600, "w": 800, "h": 400 },
        "items": 6
      }
    ],
    "annotated_screenshot": "screenshots/discover_annotated.png",
    "metadata": {
      "url": "https://...",
      "tab_id": 123,
      "module_count": 3,
      "timestamp": "2026-06-16T14:30:00Z"
    }
  }
}
```

> 当 `annotate: true` 时，返回的截图中每个模块左上角标注了 `mod_1`, `mod_2`... 编号。
> AI 用视觉模型看截图 -> 选定 module_id -> 再调用 extract 精确提取。

#### `POST /api/extract` — 提取内容

**请求：**
```json
{
  "url": "https://lanhuapp.com/web/project/...",
  "module_id": "mod_3",
  "format": "markdown",
  "timeout": 30
}
```

| 参数 | 说明 |
|------|------|
| `url` | 目标页面的完整 URL |
| `module_id` | 从 discover 返回的模块 ID，插件直接定位到对应 DOM 区域 |
| `format` | `markdown` / `json` / `screenshot` / `text` |
| `timeout` | 超时秒数 |

**响应：**
```json
{
  "request_id": "req_abc123",
  "success": true,
  "data": {
    "format": "markdown",
    "content": "| 模块名 | 说明 |\n|--------|------|\n|...",
    "tables": [{"headers": [...], "rows": [...]}, ...],
    "screenshots": ["screenshots/req_abc123_module.png"],
    "metadata": {
      "url": "https://...",
      "module_id": "mod_3",
      "timestamp": "2026-06-16T14:30:00Z",
      "duration_ms": 1234
    }
  }
}
```

> **为什么是两阶段（discover → extract）？**
> AI 看不见页面，无法直接指定坐标。通过 discover 把页面结构 + 标注截图返回，
> AI 用视觉模型看截图选定模块，再用 module_id 精确提取。

#### `POST /api/capture` — 截图
```json
{
  "url": "https://lanhuapp.com/...",
  "area": null,
  "mode": "visible"
}
```

#### `POST /api/navigate` — 导航
```json
{
  "url": "https://lanhuapp.com/...",
  "wait_selector": ".ax_default"
}
```

#### `POST /api/evaluate` — 执行 JS
```json
{
  "url": "https://lanhuapp.com/...",
  "code": "document.querySelectorAll('.ax_default.table_cell').length",
  "timeout": 10
}
```

### 核心代码骨架

```python
import struct, json, threading, queue
from http.server import HTTPServer, BaseHTTPRequestHandler
import sys, os

class NativeMessagingClient:
    """与 Chrome 通过 stdin/stdout 通信"""

    def __init__(self):
        self.stdin = sys.stdin.buffer
        self.stdout = sys.stdout.buffer
        self.pending = {}  # request_id → Queue
        self.running = True
        self._reader = threading.Thread(target=self._read_loop, daemon=True)
        self._reader.start()

    def _read_loop(self):
        while self.running:
            raw_len = self.stdin.read(4)
            if not raw_len or len(raw_len) < 4:
                break
            msg_len = struct.unpack('I', raw_len)[0]
            raw_msg = self.stdin.read(msg_len)
            msg = json.loads(raw_msg.decode('utf-8'))
            self._handle_message(msg)

    def _handle_message(self, msg):
        req_id = msg.get("request_id")
        if req_id and req_id in self.pending:
            self.pending[req_id].put(msg)

    def send(self, msg):
        data = json.dumps(msg).encode('utf-8')
        self.stdout.write(struct.pack('I', len(data)))
        self.stdout.write(data)
        self.stdout.flush()

    def request(self, msg, timeout=30):
        """发送请求并等待响应"""
        req_id = msg["request_id"]
        q = queue.Queue()
        self.pending[req_id] = q
        self.send(msg)
        try:
            result = q.get(timeout=timeout)
            return result
        except queue.Empty:
            raise TimeoutError(f"Request {req_id} timed out")
        finally:
            self.pending.pop(req_id, None)


class BridgeHTTPServer(BaseHTTPRequestHandler):
    """HTTP API 服务"""

    native = None  # class-level reference

    def do_POST(self):
        if self.path == "/api/extract":
            self.handle_extract()
        elif self.path == "/api/discover":
            self.handle_discover()
        elif self.path == "/api/capture":
            self.handle_capture()
        # ...

    def handle_extract(self):
        body = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        native_msg = {
            "type": "extract",
            "request_id": f"req_{os.urandom(4).hex()}",
            "data": body
        }
        try:
            result = self.native.request(native_msg, timeout=body.get("timeout", 30))
            self.send_json(result)
        except TimeoutError:
            self.send_error(408, "Timeout")

    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())


def main():
    native = NativeMessagingClient()
    BridgeHTTPServer.native = native

    httpd = HTTPServer(('127.0.0.1', 19876), BridgeHTTPServer)
    print("Bridge server running on http://127.0.0.1:19876", flush=True)
    httpd.serve_forever()

if __name__ == "__main__":
    main()
```

---

## 四、扩展改造（Extension 端）

### 4.1 Background (Service Worker) — 新增 native message 监听

```javascript
// background.js — 新增

// 监听来自 Native Messaging Host 的消息
chrome.runtime.onConnectNative.addListener((port) => {
  port.onMessage.addListener(async (msg) => {
    const response = await handleNativeMessage(msg);
    port.postMessage(response);
  });
});

async function handleNativeMessage(msg) {
  switch (msg.type) {
    case 'ping':
      return { type: 'response', request_id: msg.request_id, success: true, data: { alive: true } };

    case 'status':
      return handleStatus(msg);

    case 'discover':
      return handleDiscover(msg);

    case 'extract':
      return handleExtract(msg);

    case 'capture':
      return handleCapture(msg);

    case 'navigate':
      return handleNavigate(msg);

    case 'evaluate':
      return handleEvaluate(msg);

    default:
      return { type: 'response', request_id: msg.request_id, success: false, error: `未知命令: ${msg.type}` };
  }
}

// ... (handleExtract, handleDiscover, findOrCreateTab, ensureTabLoaded 等实现)
```

### 4.2 Content Script — 新增模块发现 + 提取处理器

```javascript
// content.js — 新增

// 监听来自 Background 的 AI 指令
chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  switch (msg.command) {
    case 'ai_bridge_discover':
      const result = await discoverModules();
      sendResponse(result);
      return true;

    case 'ai_bridge_extract':
      const extracted = await performAIBridgeExtract(msg.data);
      sendResponse(extracted);
      return true;
  }
});

/**
 * 自动发现页面上所有模块（复用现有框选识别算法）
 */
function discoverModules() {
  // 1. 截图（用于标注返回给 AI）
  const screenshot = captureVisibleArea();

  // 2. 找到所有 Axure 组件容器
  const containers = document.querySelectorAll(
    '.ax_default [class*="ax_"], [data-basetag]'
  );

  // 3. 按位置聚类（同列的归为同一模块）
  const clusters = clusterByPosition(containers);

  // 4. 每个聚类分析类型
  const modules = clusters.map((c, i) => ({
    id: `mod_${i + 1}`,
    type: detectType(c),           // table | text | card | form | nav
    label: generateLabel(c),       // "用户信息表格" / "搜索栏"
    bounding_box: getBBox(c),
    sample: getSample(c),          // 前几行内容预览
    items: c.length
  }));

  // 5. 在截图上标注模块编号
  const annotated = annotateScreenshot(screenshot, modules);

  return { modules, annotated_screenshot: annotated };
}

/**
 * 根据 module_id 精确提取内容
 */
function performAIBridgeExtract({ module_id, format }) {
  // 重新扫描模块获取 DOM 引用
  const modules = discoverModules().modules;
  const target = modules.find(m => m.id === module_id);
  if (!target) {
    return { error: `模块 ${module_id} 未找到` };
  }

  // 用已有框选逻辑处理指定区域
  const elements = getElementsInRect(
    target.bounding_box.x,
    target.bounding_box.y,
    target.bounding_box.w,
    target.bounding_box.h
  );

  const tables = detectTables(elements);
  const text = extractText(elements);

  if (format === 'json') {
    return { tables, text, module: target };
  }

  return {
    content: buildMarkdown(tables, text),
    tables,
    text
  };
}
```

---

## 五、视觉 AI 模型选型

### 问题背景

插件需要视觉模型来**识别标注截图上的模块编号**，从而将 AI 的"选这个"映射回 DOM 坐标。
由于国内网络环境限制，不能依赖 OpenAI GPT-4V。

### 方案对比

| 方案 | 模型 | 公司 | 视觉能力 | API 价格 | 费用估算 | 特点 |
|------|------|------|---------|---------|---------|------|
| **API 首选** | Qwen2.5-VL-72B | 阿里 | ⭐⭐⭐ | ¥3/百万 tokens | 约 ¥0.01/次 | 国内最稳，识别准 |
| **API 备选** | GLM-4V-Plus | 智谱 | ⭐⭐⭐ | ¥5/百万 tokens | 约 ¥0.02/次 | flash 版免费额度 |
| **API 低价** | Doubao-Vision | 字节 | ⭐⭐ | ¥0.8/百万 tokens | 约 ¥0.003/次 | 最便宜 |
| **API 厂商** | ERNIE-4V / 混元 | 百度/腾讯 | ⭐⭐ | ¥4/百万 tokens | 约 ¥0.01/次 | 生态好 |
| **本地 GPU** | Qwen2.5-VL-7B | 阿里 | ⭐⭐ | 免费 (自建) | 8GB 显存 | 隐私好，不联网 |
| **本地精简** | MiniCPM-V-2.6 | 面壁 | ⭐⭐ | 免费 (自建) | 6GB 显存 | 轻量，UI理解不错 |
| **免模型** | Hermes vision_analyze | — | 取决于当前提供商 | 零额外成本 | ¥0 | 无需配置 API Key |

### 推荐架构：双层视觉处理

```
┌──────────────────────────────────────────────────────────────┐
│                   双层视觉处理流水线                            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  第1层（轻量、硬编码 — 插件内完成）                            │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  discoverModules() 算法                                │  │
│  │  → 基于 DOM 位置聚类的模块自动发现                        │  │
│  │  → 不调用任何 AI，纯本地运行                              │  │
│  │  → 输出：模块坐标 + 类型 + 样本 + 标注截图                  │  │
│  └────────────────────────────────────────────────────────┘  │
│                          ↓                                   │
│  第2层（视觉理解 — 可选 AI）                                 │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  AI 看标注截图 → 选择要提取的模块                        │  │
│  │  方式 A：我在 Hermes 用 vision_analyze 看（零成本）      │  │
│  │  方式 B：Qwen2.5-VL API 自动分析（¥0.01/次）            │  │
│  │  方式 C：用户自己说"提取第三个表格"                       │  │
│  └────────────────────────────────────────────────────────┘  │
│                          ↓                                   │
│  POST /api/extract { module_id: "mod_3" }                    │
│  → → → 插件精确提取该坐标区域                                 │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Hermes vision_analyze 集成（推荐起始方案）

最省事的做法：**插件负责截图和提取原始数据 → 截图发给我 → 我用 vision_analyze 看。**

```
我：帮我把这个蓝湖页面提取一下

↓ 调桥接

POST /api/discover { url: "..." }
→ 返回标注截图 + 模块列表

↓ 截图发给我视觉识别

vision_analyze(标注截图)
→ 我看到 mod_1 是表格, mod_2 是搜索栏, mod_3 是卡片

↓ 我想提取 mod_1

POST /api/extract { module_id: "mod_1" }
→ 返回表格 Markdown
```

**优势：** 零额外 API 费用，零配置，直接用我当前运行模型（DeepSeek）的视觉能力。

---

## 六、完整交互流程示例

### 典型场景：提取项目所有页面的表格

```
Step 1: 用户说"帮我把这个页面提取一下"

Step 2: 我 → POST /api/discover { url: "项目A/首页" }
         → 返回 { modules: [...], annotated_screenshot: "..." }

Step 3: 我用 vision_analyze 看截图
         → "页面有三个模块：mod_1=表格, mod_2=搜索栏, mod_3=卡片列表"
         → "用户要表格，选 mod_1"

Step 4: 我 → POST /api/extract { module_id: "mod_1", format: "markdown" }
         → 返回 Markdown 表格内容

Step 5: 我 → POST /api/navigate { url: "项目A/详情页" }

Step 6: 重复 Step 2-5

Step 7: 汇总所有页面的提取结果 → 输出文档
```

---

## 七、通信模式图

```
一次提取请求的全链路时间线：

AI           桥接服务          Chrome NM          Service Worker     Content Script
 │               │                  │                    │                │
 │── POST ──────→│                  │                    │                │
 │               │── stdin: ───────→│                    │                │
 │               │  {"type":        │── dispatch ───────→│                │
 │               │   "extract",     │                    │── sendMsg ────→│
 │               │   "request_id":  │                    │                │── 提取
 │               │   "req_xxx"}     │                    │                │── 表格识别
 │               │                  │                    │                │── 文本归类
 │               │                  │                    │←── result ────│
 │               │                  │←── response ──────│                │
 │               │←── stdout: ─────│                    │                │
 │               │  {"type":        │                    │                │
 │               │   "response",    │                    │                │
 │               │   "request_id":  │                    │                │
 │               │   "req_xxx",     │                    │                │
 │               │   "data": {...}} │                    │                │
 │←── 200 JSON ──│                  │                    │                │
 │ (content)     │                  │                    │                │
```

---

## 八、实现步骤

| 步骤 | 内容 | 预计 |
|------|------|------|
| **1** | `bridge/` 目录搭建，`bridge_server.py` HTTP 服务 | 2h |
| **2** | Extension 改造：Background 新增 nativeMessage 监听 + 路由 | 2h |
| **3** | Content Script 新增 `ai_bridge_discover` + `ai_bridge_extract` 命令处理 | 3h |
| **4** | `discoverModules()` 自动扫描算法（复用现有框选识别逻辑） | 2h |
| **5** | 截图标注功能：在截图 canvas 上绘制模块编号 | 1h |
| **6** | Native Messaging Host 注册（JSON + 注册表） | 1h |
| **7** | Python ↔ Chrome 联调：验证请求/响应匹配 | 2h |
| **8** | 完整链路 + 视觉模型联调（先走 Hermes vision_analyze） | 1h |
| **9** | 错误处理：超时、断线重连、页面未加载、多请求排队 | 2h |
| **10** | Hermes Skill `lanhu-axure-bridge` 编写 | 0.5h |

**总计约 16 小时工作量。**

---

## 九、注意事项 / 风险

| 风险 | 说明 | 对策 |
|------|------|------|
| **NM 调试困难** | Chrome 原生消息没有 DevTools 面板，出问题很难查 | 日志落文件 `bridge/logs/` |
| **Service Worker 生命周期** | SW 可能休眠，native message 可能唤不醒 | 先发 ping 确保唤醒 |
| **标签页管理** | 多个请求同时操作一个标签页会冲突 | 请求队列 + 锁 |
| **URL 变化** | 蓝湖是 SPA，URL 变但页面不刷新 | 用 `webNavigation` 确保新内容加载 |
| **截图权限** | `captureVisibleTab` 只在 active tab 生效 | 激活标签页前先切换到该 tab |
| **Windows 路径** | `bridge_host.bat` 路径含空格？ | 确保路径加引号 |
| **标注重叠** | 模块过多时标注编号可能遮挡内容 | 自适应标注位置，支持缩放 |
| **视觉模型识别偏差** | 国内视觉模型偶尔认错截图内容 | 分层结构保底：AI 选错时用户可手动指定 |

---

## 十、未来扩展

### 双向通信
现在只是 AI → 插件。反过来也可以：

```
插件里的 AI 按钮 → Background → Native Messaging → Python → Hermes
→ Hermes 处理完 → 原路返回 → 插件浮窗显示 AI 结果
```

### 批量操作
```
POST /api/extract/batch
{
  "pages": [
    { "url": "https://.../page1", "module_id": null },
    { "url": "https://.../page2", "module_id": "mod_1" }
  ],
  "format": "json"
}
```

### 定时巡检 & 变更检测
```
cronjob 配置：
每天凌晨 2:00 → POST /api/discover → 截图存档
检测到页面结构和上次不同 → 告警通知变更
```

### Design-to-Code 延伸
```
POST /api/design-to-code
{
  "url": "https://...",
  "module_id": "mod_1",
  "framework": "react",
  "language": "typescript"
}
→ 截图 + 提取 → 发给视觉模型 → 返回组件代码
```

---

## 十一、平台扩展调研

### 背景

当前插件仅兼容蓝湖（lanhuapp.com）。调研主要平台（Axhub、摹客、Axure Cloud）的 Axure 渲染方式，评估跨平台适配难度。

### 调研结果

| 平台 | 渲染方式 | DOM 结构 | iframe | Axure 标准 class | 适配难度 |
|------|---------|---------|--------|-----------------|---------|
| **蓝湖** ✅ | iframe 内嵌 Axure 输出 HTML | ✅ 有原始 Axure DOM | ✅ | `ax_default`, `table_cell` | 已适配 |
| **Axhub** | Axure 导出 HTML 整站托管（页面直接访问） | ✅ 直接访问原始 Axure HTML | ❌ 直接页面 | ✅ 与蓝湖一致 | **低** |
| **摹客** | 通过插件上传后云端渲染 | ✅ 推测保留原始 DOM | 待实测 | ✅ 推测一致 | **中低** |
| **Axure Cloud** | 官方发布，Axure HTML 直接展示 | ✅ 标准 Axure 输出 | ❌ | ✅ 完全一致 | **低** |
| **自建 HTML** | 静态文件托管 | ✅ 原始 HTML | ❌ | ✅ 完全一致 | **低** |

### 关键技术发现

#### 1. Axure 输出 HTML 的结构高度一致

无论从哪个平台访问，Axure 生成的页面 DOM 结构是标准化的：

```html
<div class="ax_default _形状1" data-label="用户头像" data-basetag="..." style="left:100px; top:200px;">
  ...
</div>
<div class="ax_default table_cell" data-label="姓名" style="left:200px; top:300px; width:100px; height:30px;">
  <div class="text">张三</div>
</div>
```

核心 CSS class 与蓝湖完全一致：`ax_default`、`table_cell`、`_形状1`、`data-label`、`data-basetag`。

**结论：核心提取算法可以 100% 复用，不需要改任何识别逻辑。**

#### 2. 主要差异点

| 差异项 | 说明 | 适配方式 |
|--------|------|---------|
| **域名** | `lanhuapp.com` → `axhub.im` / `mockplus.cn` | `manifest.json` 的 `matches` 扩展 |
| **iframe 有无** | 蓝湖用 iframe 包裹，Axhub/Axure Cloud 直接访问 | 适配现有 `all_frames: true` 策略 |
| **页面加载机制** | 蓝湖 SPA 路由变化，Axhub 可能是整页刷新 | 统一用 `webNavigation` 确保加载完成 |
| **平台导航栏** | 各平台有自己的 UI | 不影响内容提取，只影响框越界判断 |

#### 3. 重要发现：Axhub Skills

Axhub 官方有一个 **相同方向的项目**：

- **项目**：[lintendo/Axhub-Skills](https://github.com/lintendo/Axhub-Skills)（GitHub）
- **脚本**：`extract-axure-data` — 从本地导出的 Axure HTML 提取结构化数据
- **输出**：`content.md`（文本结构与字段线索）
- **用途**：为 AI 提供页面上下文，用于数据模型生成和页面还原

Axhub Skills 搭配他们的 `Axhub Make` 产品线，已经在做「Axure→结构化数据→AI 生成」的工作流。

> **Axhub 官方也在走"提取 Axure 页面数据给 AI 用"这条路。**
> 但他们偏向本地导出 HTML 处理，我们在浏览器插件+实时桥接方向。

### 适配实现（最小改动方案）

```javascript
// 平台配置表
const PLATFORMS = [
  { name: 'lanhu',    domain: 'lanhuapp.com',  matches: ['*://lanhuapp.com/*'],      usesIframe: true  },
  { name: 'axhub',    domain: 'axhub.im',      matches: ['*://axhub.im/*'],          usesIframe: false },
  { name: 'mockplus', domain: 'mockplus.cn',   matches: ['*://app.mockplus.cn/*'],   usesIframe: false },
  { name: 'axshare',  domain: 'axshare.com',   matches: ['*://*.axshare.com/*'],     usesIframe: false },
];
```

| 文件 | 改动 |
|------|------|
| `manifest.json` | `matches` 添加新域名 |
| `content.js` | 新增 `PLATFORMS` 配置；加载逻辑按平台差异处理 |
| `background.js` | tab 管理增加域名路由 |

**预计每个新增平台适配时间：2-4 小时（主要是测试验证）。**

### 战略建议

| 阶段 | 动作 |
|------|------|
| **Phase 0** | 先做 Axhub（用户量大，渲染最简单，优先支持） |
| **Phase 1** | 完成后端 AI Bridge，让「插件提取→AI 理解」能力成型 |
| **Phase 2** | 扩展到 Axure Cloud（标准输出，改动最小） |
| **Phase 3** | 扩展到摹客、产品大牛等其他平台 |

---

> **结论：Native Messaging Bridge 架构可行。**
> 核心设计：两阶段协议（discover → extract）解决"AI 看不见"问题。
> 视觉模型优先走 Hermes vision_analyze（零成本），后续切换到 Qwen2.5-VL API。
> AI Bridge 约 16 小时可跑通。跨平台扩展每平台 2-4 小时。
