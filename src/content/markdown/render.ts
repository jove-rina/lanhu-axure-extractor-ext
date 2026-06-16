/** Markdown 预览渲染 */
import { marked } from 'marked';
import { escHtml } from '../utils/dom';

export function renderMarkdown(md: string): string {
  if (!md) return '';
  try {
    return marked.parse(md, { gfm: true, breaks: false }) as string;
  } catch (e) {
    console.error('[蓝湖] marked 解析失败:', e);
  }
  return escHtml(md).replace(/\n/g, '<br>');
}

