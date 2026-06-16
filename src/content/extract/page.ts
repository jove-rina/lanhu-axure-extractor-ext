import { state } from '../state';
import { t } from '../i18n';
import { axureText } from '../utils/dom';
import { buildTable, mdTable } from '../markdown/table';
import type { ExtractSection } from '../types';

export function extractTableCells(root: ParentNode): ExtractSection[] {
  const results: ExtractSection[] = [];
  const allCells = root.querySelectorAll('.ax_default.table_cell');
  if (allCells.length < 4) return results;
  const groups = new Map<Element, Element[]>();
  allCells.forEach((cell) => {
    const r = cell.getBoundingClientRect();
    if (r.width < 3 || r.height < 3) return;
    let p: Element | null = cell.parentElement;
    while (p && p !== root && p !== (root as Document).body) {
      if (p.classList.contains('ax_default') || p.id === 'base') break;
      p = p.parentElement;
    }
    if (!p) p = cell.parentElement;
    if (!p) return;
    if (!groups.has(p)) groups.set(p, []);
    groups.get(p)!.push(cell);
  });
  groups.forEach((cells, container) => {
    if (cells.length < 4) return;
    const table = buildTable(cells);
    if (table) {
      const prev = container.previousElementSibling;
      const h = prev ? axureText(prev) : '';
      results.push({ type:'table', heading: h && h.length<100 ? h : `${t('dataTable')} ${results.length+1}`,
        markdown: `### ${h && h.length<100 ? h : `${t('dataTable')} ${results.length+1}`}\n\n${mdTable(table)}` });
    }
  });
  return results;
}

export function extractShapeGrids(root: ParentNode): ExtractSection[] {
  const results: ExtractSection[] = [];
  const shapes = root.querySelectorAll('.ax_default._形状1');
  if (shapes.length < 6) return results;
  const groups = new Map<Element, Element[]>();
  shapes.forEach((s) => {
    const r = s.getBoundingClientRect();
    if (r.width < 3 || r.height < 3) return;
    const text = axureText(s); if (!text) return;
    let p: Element | null = s.parentElement;
    while (p && p !== root && p !== (root as Document).body) {
      if (['ax_default','panel_state_content','panel_state'].some(c => p!.classList.contains(c)) || p!.id === 'base') break;
      p = p.parentElement;
    }
    if (!p) p = s.parentElement;
    if (!p) return;
    if (!groups.has(p)) groups.set(p, []);
    groups.get(p)!.push(s);
  });
  groups.forEach((shapeEls, container) => {
    if (shapeEls.length < 6) return;
    const table = buildTable(shapeEls);
    if (table && table.rows >= 2 && table.cols >= 2) {
      const prev = container.previousElementSibling;
      const h = prev ? axureText(prev) : '';
      results.push({ type:'shape-grid', heading: h||t('dataArea'), markdown: `### ${h||t('dataArea')}\n\n${mdTable(table)}` });
    }
  });
  return results;
}

export function extractFromDocument(doc: Document): { sections: ExtractSection[]; markdown: string } {
  const root = doc.body || doc; if (!root) return { sections: [], markdown: '' };
  const sections = [...extractTableCells(root), ...extractShapeGrids(root)];
  const seen = new Set<string>();
  const sel = '.ax_default.heading_11,.ax_default.heading_21,.ax_default._二级标题1,' +
    '.ax_default._三级标题,.ax_default.label,.ax_default.label1,h1,h2,h3,h4,h5,h6';
  root.querySelectorAll(sel).forEach((el) => {
    const text = axureText(el); if (!text || seen.has(text) || text.length < 2) return; seen.add(text);
    let lv = '##';
    if (el.classList.contains('_三级标题')) lv = '####';
    else if (el.classList.contains('_二级标题1')||el.classList.contains('heading_21')) lv = '###';
    sections.push({ type:'heading', markdown: `${lv} ${text}` });
  });
  const cbs: string[] = [];
  root.querySelectorAll('.ax_default.checkbox').forEach((cb) => {
    const r = cb.getBoundingClientRect();
    if (r.width > 2) { const text = axureText(cb); if (text) cbs.push(text); }
  });
  if (cbs.length > 0) sections.push({ type:'checkbox', markdown: `## ${t('optionsHeading')}\n\n${cbs.map(item => `- [ ] ${item}`).join('\n')}` });

  const lines = [`# ${doc.title||t('unknownPage')}`, '', `**${t('extractionTime')}**: ${new Date().toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})}`,'','---',''];
  const seenMd = new Set<string>();
  sections.forEach(s => { if (s.markdown && !seenMd.has(s.markdown)) { seenMd.add(s.markdown); lines.push(s.markdown); lines.push(''); } });
  return { sections, markdown: lines.join('\n') };
}

/** background extract-axure：顶层全量提取 */
export function fullExtract() {
  const m = extractFromDocument(document);
  return {
    frame: state.frameCtx,
    isAxureContent: !!document.querySelector('.ax_default'),
    pages: [{ frame: state.frameCtx, title: document.title, sections: m.sections, markdown: m.markdown }],
    combinedMarkdown: m.markdown,
  };
}

export function simpleExtract() {
  const r = extractFromDocument(document);
  return {
    frame: state.frameCtx,
    isAxureContent: !!document.querySelector('.ax_default'),
    pages: [{ frame: state.frameCtx, title: document.title, sections: r.sections, markdown: r.markdown }],
    combinedMarkdown: r.markdown,
  };
}

export function getDiagnostics() {
  return {
    frame: state.frameCtx,
    title: document.title,
    tableCells: document.querySelectorAll('.ax_default.table_cell').length,
    shapes: document.querySelectorAll('.ax_default._形状1').length,
    widgets: document.querySelectorAll('.ax_default').length,
  };
}
