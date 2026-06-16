# Changelog

All notable changes to this project are documented in this file. Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [2.0.0] - 2026-06-16

### Added

- Icon generation script `pnpm run icons` (`scripts/gen-icons.mjs`, exports PNG from SVG via `@resvg/resvg-js`)
- Extension icon source `public/icons/icon.svg`: orange circle, enlarged **A**, magnifying glass with orange strokes

### Removed

- Legacy empty root folders `background/`, `content/`, `popup/`, `_locales/` (leftover from v1 layout; since v2.0.0, source lives under `src/` and locale files under `public/_locales/`)

### Changed

- Version bumped to 2.0.0
- Popup version label now reads from manifest automatically
- **Engineering overhaul**: migrated from monolithic `content.js` / `background.js` to a **Vite + TypeScript + @crxjs/vite-plugin** modular project
- **Source layout**: `src/content/` split into `state`, `ui`, `picker`, `extract`, `modules`, `markdown`, `i18n`, `bridge`, etc.; entry point is `onExecute()`
- **Build & install**: `pnpm install` / `pnpm run build`; load the **`dist/`** folder in developer mode (not the repo root)
- **Package manager**: switched from npm to **pnpm** (`pnpm-lock.yaml`, `packageManager` field)
- Static assets and `_locales` moved under `public/`; `marked` bundled as an npm dependency
- Extension icon refresh: larger **A** closer to circle edges; bolder orange magnifying glass for clarity

### Fixed

- Missing imports/exports after the modular split caused runtime `ReferenceError`s (e.g. `BTN_DISABLED`, `BTN_ACCENT_XS`, `saveModules`, `refreshPageTitleFromIframes`, `getStorageKey`)
- Stale content scripts after extension reload still called `chrome.*` and threw `Extension context invalidated`; added context validation, timer teardown, and UI cleanup

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
