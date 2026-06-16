# Changelog

All notable changes to this project are documented in this file. Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.0.0] - 2026-06-15

### Added

- Doc Builder floating panel with modular editing and per-page auto-save
- Box-select picking with table recognition and cross-iframe extraction
- Per-module preview, copy, and download; full-document preview, copy, and download
- Module edit dialog: split Markdown editor, undo/redo, pick-to-fill
- Edit dialog: drag, minimize, fullscreen, collapsible/resizable entries
- Chinese/English UI and language switch in popup
- Real Axure iframe page title for preview and download filenames
- Packaging script `scripts/pack.ps1`

### Changed

- Unified button sizing, scrollbar styling, and hover feedback
- Module focus highlight with dimmed siblings
- Fixed-position tooltips to avoid overflow clipping and hover jitter
- Preview window scrollbars match in-extension UI
- Module preview/download titles use `##` (h2) for consistency

### Fixed

- Floater position jitter when adding modules or rapid clicks
- Floater position reset when opening Doc Builder from popup
- Page-switch dialog i18n keys not resolved
- Edit dialog not closing on page switch
- `EDIT_WIN_BTN is not defined` runtime error

## [0.9.0] - 2026-06 (development)

### Added

- Module UI overhaul: expand/collapse, checkboxes, drag reorder
- Markdown preview and chrome.storage persistence
- Shared preview window; module title follows picked title

### Fixed

- Pick overwrite mode; preserve empty table cells
- Preview CSP workaround via pre-rendered HTML
- selectionLocked reset and UI polish
