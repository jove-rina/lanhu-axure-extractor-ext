/**
 * Axure 表格识别（Y/X 聚类）与 Markdown 表格输出
 */
import { axureText, escapeMdCell } from '../utils/dom';

export interface TableData {
  rows: number;
  cols: number;
  rowData: string[][];
}

export function buildTable(elements: Element[] | NodeListOf<Element>): TableData | null {
  const items = Array.from(elements).map((el) => {
    const r = el.getBoundingClientRect();
    return { text: axureText(el), x: Math.round(r.left), y: Math.round(r.top) };
  }).filter((c) => !isNaN(c.x) && !isNaN(c.y));
  if (items.length < 4) return null;
  const rows: { y: number; cells: typeof items }[] = [];
  [...items].sort((a, b) => a.y - b.y).forEach((c) => {
    let row = rows.find((r) => Math.abs(r.y - c.y) <= 8);
    if (row) { row.cells.push(c); row.y = Math.min(row.y, c.y); }
    else rows.push({ y: c.y, cells: [c] });
  });
  rows.forEach((r) => r.cells.sort((a, b) => a.x - b.x));
  if (rows.length < 2) return null;
  const maxCols = Math.max(...rows.map((r) => r.cells.length));
  if (maxCols < 2) return null;
  rows.forEach((r) => { while (r.cells.length < maxCols) r.cells.push({ text: '', x: 0, y: 0 }); });
  return { rows: rows.length, cols: maxCols, rowData: rows.map((r) => r.cells.map((c) => c.text)) };
}

export function mdTable(table: TableData): string {
  let data = table.rowData.map((row) => [...row]);
  data = data.filter((row) => row.some((c) => c && c.trim()));
  if (data.length < 2) return '';
  const maxCols = Math.max(...data.map((r) => r.length));
  if (maxCols < 2) return '';
  data.forEach((r) => { while (r.length < maxCols) r.push(''); });
  while (data[0].length > 2 && data.every((r) => !r[r.length - 1]?.trim())) data.forEach((r) => r.pop());
  if (data[0].length < 2) return '';
  const lines: string[] = [];
  data.forEach((cells, idx) => {
    const safeCells = cells.map((t) => escapeMdCell(t) || ' ');
    lines.push(`| ${safeCells.join(' | ')} |`);
    if (idx === 0) lines.push(`| ${safeCells.map(() => '---').join(' | ')} |`);
  });
  return lines.join('\n');
}

