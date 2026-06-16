# 🧩 Axure Utilities — Doc Builder for Lanhu Axure Prototypes

> A Chrome / Edge browser extension designed for **Axure prototypes on lanhuapp.com**.
> No more manual copy-pasting — **drag-select page content, build structured Markdown documents**.

[![Chrome](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=google-chrome&logoColor=white)](https://chrome.google.com/webstore)
[![Edge](https://img.shields.io/badge/Edge-Extension-0078D7?logo=microsoft-edge&logoColor=white)](https://microsoftedge.microsoft.com/addons)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-2ea44f)](https://developer.chrome.com/docs/extensions/mv3/)
![License](https://img.shields.io/badge/License-GPL--3.0-blue)

---

## 📖 About

PMs, interaction designers, and developers deal with Axure prototypes on Lanhu every day — reviewing specs, cross-referencing tables, writing docs. Axure Utilities streamlines this workflow:

**Select any area on the Axure page → auto-detect tables or text → build modular documents → one-click Markdown export.**

No more: screenshot → paste into doc → manually type tables → reformat. Just: select → confirm → move on.

---

## ✨ Core Capabilities

### 🎯 Drag-Select Picking — WYSIWYG

No need to understand DOM structure or manually pick elements. Simply **drag-select a rectangular area** on the page:

- **Select a table area** → automatically recognizes Axure standard components (`table_cell`, `_形状1`, `box_1`, etc.), reorganizes into Markdown tables with proper rows and columns
- **Select a text area** → extracts all visible text, merges into paragraphs
- **Smart fallback**: if too few elements are found, gracefully degrades to text extraction — always produces a result

### 🧠 Smart Table Recognition

Axure renders tables in various ways — native `<table>` elements, div + CSS simulated tables. The extension handles them all:

- Detects Axure's default CSS class system components
- **Groups by Y-coordinate** into rows (8px tolerance for alignment), **sorts by X-coordinate** into columns
- Automatically **fills missing columns**, **trims empty trailing columns**
- Outputs standard pipe-delimited Markdown tables, ready for docs, wikis, and AI tools

### 📦 Modular Document Builder

Organize documents as **modules**, each containing:

- **Title**: picked from the page, becomes a level-2 heading in the document
- **Multiple content entries**: each independently pickable (table or text), reorderable by dragging

Module features:
- **Drag to reorder** — drag module cards to change order
- **Independent expand/collapse** — fold modules individually for focus
- **Select all / batch delete** — check modules and remove in bulk
- **Edit dialog** — split Markdown editor with undo/redo, pick-to-fill, fullscreen mode
- **Per-module preview/copy/download** — export a single module; titles use `##` (h2)

### 🔄 Cross-iframe Picking

Lanhu's Axure prototypes are typically nested inside iframes. The extension uses a **broadcast mechanism**:

- Top frame displays the floating operation panel
- Iframe activates pick capability — users drag-select inside the iframe
- Results relayed back to the top frame via `postMessage`
- No manual frame switching needed — seamless experience

### 💾 Per-Page Auto-Save

Module data is automatically cached by `versionId + pageId`:

- **Switch pages without data loss** — browse another page, come back to find everything intact
- **Persistence across sessions** — module data stored in `chrome.storage.local`
- **Auto-restore on reopen** — click the extension icon to continue where you left off

### 🌙 Dark Glassmorphism UI

Built for extended prototype review sessions:

- Full dark theme (`#1a1b1e` background)
- Warm gold (`#f08c00`) accent color
- Draggable floating panel that won't block page content
- Inline SVG icons (zero external dependencies)
- Unified thin scrollbars (6px dark rounded)
- Fixed-position tooltips that are never clipped by overflow

### 🌐 Bilingual i18n

- Instant switching between Chinese / English in both popup and floating panel
- Auto-detects browser language on first launch
- Preference persisted across sessions

---

## 🔧 Installation

### Prerequisites

| Requirement | Details |
|-------------|---------|
| Browser | Google Chrome 88+ or Microsoft Edge 88+ |
| Permissions | Standard extension install, no special privileges |
| Account | A Lanhu (lanhuapp.com) account to access prototype pages |

### Manual Install (Developer Mode)

This is currently the only install method (store publishing in progress). Takes about 2 minutes:

**Step 1: Get the extension files**

Option A — Clone the repo (recommended):
```bash
git clone https://github.com/jove-rina/lanhu-axure-extractor-ext.git
```

Option B — Download ZIP:
Visit [GitHub repo](https://github.com/jove-rina/lanhu-axure-extractor-ext) → Click "Code" → "Download ZIP" → Extract to a local folder

**Step 2: Open extensions page**

| Browser | URL |
|---------|-----|
| Chrome | `chrome://extensions` |
| Edge | `edge://extensions` |

**Step 3: Enable Developer Mode**

Toggle the "Developer mode" switch in the top-right corner.

**Step 4: Load the extension**

- Click "**Load unpacked**"
- In the file picker, select the `lanhu-axure-extractor-ext` folder
- Click "Select Folder"

**Step 5: Verify installation**

- Extension card appears, icon shows in the browser toolbar 🧩
- Click the icon → popup displays **"Axure Utilities"** → installation successful ✅

> **Tip**: To pin it to the toolbar for quick access, click the puzzle piece icon → find Axure Utilities → click the 📌 pin icon.

### Store Installation (Coming Soon)

> The extension package is ready and pending Chrome Web Store / Edge Add-ons review. One-click install from the store will be available once approved.

---

## 🚀 Usage Guide

### Quick Start

```
1. Sign in to Lanhu → open an Axure prototype page
2. Click the extension icon 🧩 in the browser toolbar
3. Click "📄 Open Doc Builder"
   └─ Floating panel appears at the bottom-right corner
4. Click "Add Module"
   └─ A new blank module appears in the list
5. Click the 🎯 Pick button (on either title or a content entry)
   └─ Status shows "Pick active"
6. Drag-select an area on the page
   └─ Release mouse → content auto-detected and inserted
7. Repeat steps 4~6 to build your complete requirement doc
8. Click "Preview" to view → "Download" to save as .md file
```

### Example Scenario

**Scenario: Extract a table from Axure**

1. Add a module → click 🎯 next to the title → drag-select the table title area on the page → title auto-fills
2. Click 🎯 on the content area → precisely drag-select the entire table → table is auto-recognized as Markdown
3. Need multiple tables: click "Add Entry" under the same module → pick another table
4. Add more modules to organize different feature requirements

### Tips

- **Drag precision**: Enclose the table as tightly as possible for best column detection
- **Module ordering**: Use the `☰` drag handle to reorder
- **Collapse for focus**: Click a module header to collapse/expand
- **Language**: Switch anytime via the selector in the floating panel header
- **Page switching**: Auto-saves on page change — come back anytime

---

## 📂 Project Structure

```
lanhu-axure-extractor-ext/
├── manifest.json                 # Extension configuration (Manifest V3)
│
├── popup/                        # Popup window
│   ├── popup.html                # Popup UI (shown when clicking extension icon)
│   ├── popup.css                 # Dark theme styles
│   └── popup.js                  # Interaction logic + language selection
│
├── content/                      # Content scripts (injected into Lanhu pages)
│   ├── content.js                # Core script: floating panel, drag-select picking, module management, Markdown builder
│   └── marked.min.js             # Markdown rendering library (for preview)
│
├── background/
│   └── background.js             # Service Worker: frame broadcasting, message routing, pick state management
│
├── icons/                        # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   ├── icon128.png
│   └── icon.svg                  # SVG source file
│
├── _locales/                     # Internationalization
│   ├── zh_CN/messages.json       # Chinese
│   └── en/messages.json          # English
│
└── README.md
```

---

## ⚙️ Tech Stack

| Module | Technology |
|--------|-----------|
| Extension Framework | Chrome Manifest V3 |
| UI | Vanilla HTML + CSS (dark glassmorphism, inline SVG icons, zero external dependencies) |
| Content Extraction | DOM traversal + drag-select + Y-coordinate grouping table detection algorithm |
| Markdown Generation | Custom table/text → Markdown converter engine |
| Markdown Rendering | `marked` (preview only) |
| Cross-frame Communication | `chrome.runtime.sendMessage` + `window.postMessage` bidirectional |
| Persistence | `chrome.storage.local` (per-page caching by `versionId+pageId`) |
| Background | Service Worker (no persistent state) |
| i18n | `chrome.i18n` API + inline fallback translation tables |

---

## 🔄 How It Works

```
User clicks extension icon 🧩
    │
    ▼
Popup → Click "📄 Open Doc Builder"
    │
    ▼
Background Service Worker calls webNavigation.getAllFrames
to discover all frames on the current page
    │
    ▼
Broadcasts 'open-builder' to every matching frame
    │
    ├── Top frame        → displays the floating panel
    └── Child iframes    → activates pick capability
                           (listens for mousedown/mousemove/mouseup)
    │
    ▼
User interacts with the floating panel:
    Add Module → Click 🎯 Pick → Drag-select on page
    │
    ▼
Selection area → DOM traversal → Algorithm classifies:
    ├── Table (4+ components, multiple rows/cols) → Markdown table
    └── Text (fewer components or no table structure) → text paragraph
    │
    ▼
Result relayed via postMessage to top frame → fills the corresponding module entry
    │
    ▼
Module data cached by versionId+pageId → chrome.storage.local
    │
    ▼
"Preview" → rendered as HTML via marked
"Download" → assembled as # page title + ## module titles + content → exported as .md
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Floater in top frame only** | Checked via `window.top === window.self` — prevents duplicate panels in iframes |
| **Cross-iframe picking** | Background broadcasts 'start-picker' / 'stop-picker' to all frames; child frame results sent back via `postMessage({action:'picker-result',...})` |
| **Table detection** | Collect Axure standard components → group by Y (8px tolerance) → sort by X → fill/trim columns → Markdown |
| **Data isolation** | Each page uses its own cache key (`lh_{versionId}_{pageId}`), no cross-page interference |

---

## ⚠️ Limitations

- **Domain restriction**: Only works on `lanhuapp.com` and its subdomains
- **Cross-origin iframes**: Browser security policies prevent direct DOM access. Current solution uses top-frame `postMessage` + self-running scripts inside iframes; some complex scenarios may require clicking inside the iframe first
- **Extraction quality**: Table detection relies on Axure's default CSS classes (`ax_default.table_cell`, etc.). Deeply customized component naming may reduce accuracy
- **Content scripts**: Uses `all_frames: true` for automatic injection into all frames

---

## ❓ FAQ

**Q: The floating panel doesn't appear after clicking "Open Doc Builder"?**
A: Refresh the page. Make sure you're on a Lanhu Axure page (URL contains `lanhuapp.com`).

**Q: The extracted content is inaccurate?**
A: Quality depends on Axure's rendering. Try a tighter drag selection around the target table or text block. If your prototype uses custom CSS classes, open an issue for compatibility.

**Q: Can't pick content in a cross-origin iframe?**
A: Click inside the iframe first to give it focus, then try picking. Same-origin iframes are auto-injected.

**Q: Will my module data be lost?**
A: Data is cached per-page in `chrome.storage.local` by `versionId+pageId`. It persists across browser restarts. Clearing browser cache will remove it.

**Q: Can I back up or migrate my data?**
A: chrome.storage.local is browser-local and not directly exportable. Data import/export may be added in a future release.

---

## 🤝 Contributing

Community participation makes this project better. Feel free to:

- **Open an Issue**: Bug reports or feature suggestions → [New Issue](https://github.com/jove-rina/lanhu-axure-extractor-ext/issues)
- **Submit a PR**: Code contributions → fork the repo, develop, and submit a Pull Request

```bash
git checkout -b feature/your-feature
git commit -m 'feat: add your feature'
git push origin feature/your-feature
```

---

## 📄 License

This project is licensed under the [GNU General Public License v3.0](LICENSE) (GPL-3.0) © 2026 Jove Rina

## 📋 Changelog

See [CHANGELOG.en.md](CHANGELOG.en.md) ([中文](CHANGELOG.md))
