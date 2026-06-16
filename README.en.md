# 🧩 Axure Utilities — Doc Builder for Lanhu Axure

> A Chrome / Edge extension for **Axure prototypes on lanhuapp.com**.  
> **Drag-select content → edit in modules → export Markdown in one click.**

[中文](README.md) · [Changelog](CHANGELOG.en.md)

[![Chrome](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=google-chrome&logoColor=white)](https://chrome.google.com/webstore)
[![Edge](https://img.shields.io/badge/Edge-Extension-0078D7?logo=microsoft-edge&logoColor=white)](https://microsoftedge.microsoft.com/addons)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-2ea44f)](https://developer.chrome.com/docs/extensions/mv3/)
![License](https://img.shields.io/badge/License-GPL--3.0-blue)

---

## Table of Contents

- [About](#about)
- [Features at a Glance](#features-at-a-glance)
- [Quick Start](#quick-start)
- [Feature Details](#feature-details)
  - [Doc Builder Panel](#doc-builder-panel)
  - [Drag-Select Picking](#drag-select-picking)
  - [Module Edit Dialog](#module-edit-dialog)
  - [Preview & Export](#preview--export)
  - [Per-Page Save & Navigation](#per-page-save--navigation)
  - [UI & Interaction](#ui--interaction)
- [Installation](#installation)
- [Project Structure](#project-structure)
- [Technical Notes](#technical-notes)
- [FAQ](#faq)
- [Contributing & License](#contributing--license)

---

## About

PMs, designers, and developers spend hours on Lanhu reviewing Axure prototypes and writing specs. Axure Utilities shortens that to:

**Select an area on the prototype → auto-detect tables/text → fill modular docs → preview / copy / download Markdown.**

No more screenshot → paste → retype tables → reformat loops.

---

## Features at a Glance

| Category | Capabilities |
|----------|--------------|
| **Extraction** | Drag-select; smart Axure table detection; text fallback; cross-iframe picking |
| **Doc building** | Module titles + entries; drag reorder; expand/collapse; select all / batch delete |
| **Editing** | Dedicated edit dialog; split Markdown editor; undo/redo; pick-to-fill |
| **Export** | Full doc / single module: preview, copy, download; filenames use real page title |
| **Persistence** | Auto-save by `versionId + pageId`; page-switch hints and restore |
| **UX** | Dark UI; draggable panel; fixed tooltips; Chinese / English |

---

## Quick Start

```
1. Sign in to Lanhu → open an Axure prototype page
2. Click the extension icon → "📄 Open Doc Builder"
3. Click "Add Module" → scrolls to and focuses the new module
4. Click 🎯 Pick → drag-select title or content on the page
5. Add more modules/entries, or use "Edit" for bulk Markdown editing
6. Use bottom "Preview / Copy / Download" for the full document
```

> If the panel does not appear: **refresh the page** and confirm the URL contains `lanhuapp.com`.

---

## Feature Details

### Doc Builder Panel

The floating panel (bottom-right, draggable) is the main editing surface:

- **Toolbar**: add module, expand/collapse all, select all, batch delete
- **Module cards**: title preview, checkbox, grouped action buttons
- **Module actions** (fused button groups with hover tooltips):
  - Edit / Preview / Copy / Download
  - Move up / Move down / Delete
- **Module body**: title field + content entries (pick, reorder, delete)
- **Footer**: full-document preview, copy, download
- **Focus mode**: clicked module highlighted; siblings dimmed
- **New module**: defaults to empty title + one empty entry; auto-scrolls into view

### Drag-Select Picking

- Click 🎯 to enter pick mode; **drag a rectangle** on the Axure page (including inside iframes)
- **Tables**: detects `table_cell`, `_形状1`, etc.; rebuilds Markdown tables via Y/X grouping
- **Text**: merges visible text; degrades to text when too few elements
- **Cross-iframe**: panel on top frame; pick in child frames; results via `postMessage`
- **Overwrite**: picking the same field again replaces existing content

### Module Edit Dialog

Click **Edit** on a module for long-form / Markdown work:

| Capability | Description |
|------------|-------------|
| **Layout** | Default 60% width, 80vh height (max 750px); draggable |
| **Window controls** | Minimize / restore, fullscreen / exit, close |
| **Title** | Input + pick button; dialog can shrink to bottom-left while picking |
| **Entries** | Collapsible; default 400px height, vertically resizable |
| **Markdown editor** | Source / split / preview; bold, italic, link, etc. |
| **Undo / redo** | Text history in the editor |
| **Pick fill** | Toast indicates whether title or content was filled |
| **Save policy** | Changes apply only on Save; dialog closes on page switch |

### Preview & Export

**Full document**

- Structure: `# Page title` + `## Module title` + entry content
- Page title from the actual Axure iframe page (not the Lanhu shell title)
- Download filename: `PageTitle_YYYY-MM-DD.md`

**Single module**

- Independent preview / copy / download
- Module title always `##` (h2) for consistency with full docs

**Preview window**

- Dark-themed HTML via `marked`
- Wide tables scroll horizontally
- Scrollbars match in-extension styling

### Per-Page Save & Navigation

- Cache key: `lh_{versionId}_{pageId}` in `chrome.storage.local`
- Switching Lanhu pages auto-saves current modules
- Optional full-screen hint on page switch; "Don't show again" supported
- Data survives browser restarts (unless browser data is cleared)

### UI & Interaction

- **Language**: Popup selector (中文 / English / Auto); panel and edit dialog update live
- **Tooltips**: Fixed-position; not clipped by module overflow
- **Scrollbars**: Unified 6px dark style in panel, edit dialog, and preview
- **Buttons**: Consistent sizing and hover states; inputs highlight on focus

---

## Installation

### Prerequisites

| Item | Requirement |
|------|-------------|
| Browser | Chrome 88+ or Edge 88+ |
| Site | Lanhu Axure pages (`lanhuapp.com`) |
| Permissions | Standard extension install |

### Developer mode

1. Clone or download this repo  
   `git clone https://github.com/jove-rina/lanhu-axure-extractor-ext.git`
2. Open `chrome://extensions` or `edge://extensions`
3. Enable Developer mode → Load unpacked
4. Select the project root → extension icon appears in the toolbar

### Package for release (optional)

```powershell
.\scripts\pack.ps1
```

Output: `dist/lanhu-axure-extractor-ext-v{version}.zip` (excludes `.git`, `demo`, `scripts`, `dist`, etc.).

### Store install

Chrome Web Store / Edge Add-ons listing in progress.

---

## Project Structure

```
lanhu-axure-extractor-ext/
├── manifest.json           # Manifest V3 config
├── LICENSE                 # GPL-3.0
├── CHANGELOG.md            # Chinese changelog
├── CHANGELOG.en.md         # English changelog
├── README.md / README.en.md
│
├── popup/                  # Extension popup (open builder, language)
├── content/                # Content scripts (panel, pick, edit, export)
│   ├── content.js
│   └── marked.min.js
├── background/             # Service Worker (frame broadcast, routing)
├── icons/
├── _locales/               # chrome.i18n messages
└── scripts/
    └── pack.ps1            # Packaging script
```

---

## Technical Notes

### Tech stack

| Module | Choice |
|--------|--------|
| Extension | Chrome Manifest V3 |
| UI | Vanilla HTML + CSS, inline SVG, no UI framework |
| Extraction | DOM traversal + box select + Y/X table algorithm |
| Markdown | Custom converter + `marked` for preview |
| Messaging | `chrome.runtime.sendMessage` + `window.postMessage` |
| Storage | `chrome.storage.local` |
| i18n | `chrome.i18n` + inline fallback tables |

### Flow

```
Popup "Open Doc Builder"
    → Background broadcasts open-builder to all lanhu frames
    → Top frame: create and show floating panel
    → Child iframes: activate pick listeners

User selects → table/text detection → postMessage fills module
    → Persist to storage by versionId+pageId

Preview/download → assemble Markdown → marked HTML or Blob download
```

### Design decisions

| Decision | Rationale |
|----------|-----------|
| Panel in top frame only | `window.top === window.self` — no duplicate panels |
| Cross-iframe pick | Background broadcast + iframe scripts + postMessage |
| Real page title | iframe postMessage syncs Axure `header.title` |
| Data isolation | Per-page storage keys |

### Limitations

- Works only on `lanhuapp.com` and subdomains
- Cross-origin iframes may require clicking inside the iframe first
- Table detection relies on default Axure CSS classes

---

## FAQ

**Panel won't open?**  
Refresh the page; reload the extension at `chrome://extensions`; check DevTools Console for errors.

**Pick does nothing?**  
Click inside the iframe first; confirm pick mode is active (status bar message).

**Inaccurate tables?**  
Tighten the selection around the table; open an issue for custom components.

**Will data be lost?**  
Per-page persistence in `chrome.storage.local`; clearing browser data removes it. Import/export planned.

**How to change language?**  
Use the language dropdown in the Popup; the panel updates immediately.

---

## Contributing & License

Issues and PRs welcome → [GitHub Issues](https://github.com/jove-rina/lanhu-axure-extractor-ext/issues)

**License**: [GNU GPL v3.0](LICENSE) © 2026 Jove Rina

**Changelog**: [CHANGELOG.en.md](CHANGELOG.en.md) · [中文](CHANGELOG.md)
