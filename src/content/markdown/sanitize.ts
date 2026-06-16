/** Markdown 防御性清洗 */
export function sanitizeMd(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/[\u200B-\u200D\uFEFF\u00AD\u2060\u2061\u2062\u2063\u2064]/g, '')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim();
}

