import { sanitizeMd } from '../markdown/sanitize';
import { buildTable, mdTable } from '../markdown/table';
import type { ContainerFindResult, ExtractResult } from '../types';

export function findContainer(el: Element): ContainerFindResult {
  let current: Element | null = el;
  for (let i = 0; i < 4 && current; i++) {
    if (current === document.body || current === document.documentElement) break;
    const children = Array.from(current.children).filter((c): c is Element => c.tagName !== 'BR');
    if (children.length >= 2) return { el: current, depth: i };
    current = current.parentElement;
  }
  const fallback = el?.parentElement?.parentElement || el?.parentElement || el;
  return { el: fallback, depth: -1 };
}

export function getBreadcrumb(el: Element): string {
  const parts: string[] = [];
  let current: Element | null = el;
  for (let i = 0; current && i < 5; i++) {
    const tag = (current.tagName || '').toLowerCase();
    parts.unshift(tag);
    if (current === document.body || current === document.documentElement) break;
    current = current.parentElement;
  }
  return parts.join(' › ');
}

export function extractFromEl(el: Element): ExtractResult {
  for (const sel of ['.ax_default.table_cell', '.ax_default._形状1']) {
    const cells = el.querySelectorAll(sel);
    if (cells.length >= 4) {
      const table = buildTable(cells);
      if (table) return { type: 'table', markdown: mdTable(table) };
    }
  }
  const text = el instanceof HTMLElement && el.innerText ? sanitizeMd(el.innerText) : '';
  if (text) return { type: 'text', markdown: text };
  return { type: 'empty', markdown: '' };
}
