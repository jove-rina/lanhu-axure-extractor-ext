/**
 * 框选区域内容提取
 */
import { axureText } from '../utils/dom';
import { buildTable, mdTable } from '../markdown/table';

export function extractFromRect(x1: number, y1: number, x2: number, y2: number) {
  const left = Math.min(x1, x2), top = Math.min(y1, y2);
  const right = Math.max(x1, x2), bottom = Math.max(y1, y2);
  const all = document.querySelectorAll(
    '.ax_default.table_cell, .ax_default._形状1, .ax_default.shape, ' +
    '.ax_default.label, .ax_default.label1, .ax_default.box_1, .ax_default.box_2, ' +
    '.ax_default._文本段落1, .ax_default._文本段落, .ax_default.paragraph1',
  );
  const inRect: Element[] = [];
  all.forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.left >= left && r.top >= top && r.right <= right && r.bottom <= bottom) {
      if (el.classList.contains('table_cell') || el.classList.contains('_形状1')) inRect.push(el);
      else if (axureText(el)) inRect.push(el);
    }
  });
  if (inRect.length === 0) {
    const e = document.elementFromPoint((left + right) / 2, (top + bottom) / 2);
    if (e) return { type: 'text', markdown: axureText(e) || (e as HTMLElement).innerText.trim() };
    return { type: 'empty', markdown: '' };
  }
  const table = buildTable(inRect);
  if (table) return { type: 'table', markdown: mdTable(table) };
  const texts = inRect.map((el) => axureText(el)).filter(Boolean);
  return { type: 'text', markdown: texts.join('\n\n') };
}

