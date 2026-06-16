/** DOM 文本与 HTML 转义、类型收窄辅助 */
import { sanitizeMd } from '../markdown/sanitize';

export function axureText(el: Element | null): string {
  if (!el) return '';
  const td = (el as HTMLElement).closest('[id$="_text"]') || el.querySelector('.text, [id$="_text"]');
  if (td && (td as HTMLElement).innerText.trim()) return (td as HTMLElement).innerText.trim();
  return (el as HTMLElement).innerText.trim();
}

export function escapeMdCell(t: string): string {
  if (!t) return '';
  return sanitizeMd(t)
    .replace(/^(#{1,6})\s/gm, '\\$1 ')
    .replace(/^(- |> |\* |\+ |\d+\.\s)/gm, '\\$1')
    .replace(/^(-{3,}|\*{3,}|_{3,})\s*$/gm, '\\$&')
    .replace(/\|/g, '&#124;')
    .replace(/\n/g, ' ');
}

export function escHtml(s: string): string {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function asHtmlEl(el: Element | EventTarget | Node | null | undefined): HTMLElement | null {
  return el instanceof HTMLElement ? el : null;
}

export function eventTargetEl(e: Event): HTMLElement | null {
  return asHtmlEl(e.target);
}

export function asDragEvent(e: Event): DragEvent | null {
  return e instanceof DragEvent ? e : null;
}

export function asPointerEvent(e: Event): PointerEvent | null {
  return e instanceof PointerEvent ? e : null;
}

export function qsEl(root: ParentNode, sel: string): HTMLElement | null {
  const el = root.querySelector(sel);
  return el instanceof HTMLElement ? el : null;
}

export function qsInput(root: ParentNode, sel: string): HTMLInputElement | null {
  const el = root.querySelector(sel);
  return el instanceof HTMLInputElement ? el : null;
}

export function qsTextArea(root: ParentNode, sel: string): HTMLTextAreaElement | null {
  const el = root.querySelector(sel);
  return el instanceof HTMLTextAreaElement ? el : null;
}

export function topWindow(): Window {
  return window.top ?? window;
}
