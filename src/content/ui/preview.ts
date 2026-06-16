import { state } from '../state';
import { t } from '../i18n';
import { renderMarkdown } from '../markdown/render';
import { escHtml } from '../utils/dom';
import { setStatus } from './floater-status';
import { getFullMarkdown, getPageTitle, refreshPageTitleFromIframes } from '../modules/manager';

export function openPreviewWindow(title: string, md: string) {
  if (state.previewWindow && !state.previewWindow.closed) {
    try { state.previewWindow.close(); } catch {}
  }
  state.previewWindow = window.open('', '_blank', 'width=900,height=700');
  if (!state.previewWindow) { setStatus(t('statusNoContent')); return; }
  const html = renderMarkdown(md);
  const previewScrollbarCss = `
html{scrollbar-width:thin;scrollbar-color:#373a40 transparent}
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:#373a40;border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:#5c5f66}`;
  state.previewWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escHtml(title)}</title>
<style>
${previewScrollbarCss}
*{margin:0;padding:0;box-sizing:border-box}
body{background:#1a1b1e;color:#c1c2c5;font:15px -apple-system,BlinkMacSystemFont,'PingFang SC','Noto Sans SC',sans-serif;padding:24px;line-height:1.8}
h1,h2,h3,h4{color:#f08c00;font-weight:600;margin:24px 0 12px}
h1{border-bottom:1px solid #373a40;padding-bottom:8px;font-size:24px}
h2{font-size:20px}h3{font-size:17px}
.table-wrap{overflow-x:auto;margin:12px 0}
.table-wrap table{width:auto;table-layout:auto;border-collapse:collapse;margin:0;font-size:14px}
th,td{border:1px solid #373a40;padding:8px 12px;text-align:left;white-space:nowrap}
th{background:#25262b;color:#e0e0e0;font-weight:600}
tr:nth-child(even){background:rgba(255,255,255,0.02)}
code{background:#25262b;padding:2px 6px;border-radius:3px;font-size:13px;color:#f08c00}
pre{background:#25262b;padding:12px 16px;border-radius:6px;overflow-x:auto;font-size:13px;line-height:1.5;margin:12px 0}
pre code{background:none;padding:0;color:#c1c2c5}
blockquote{border-left:3px solid #f08c00;margin:12px 0;padding:4px 16px;color:#909296}
hr{border:none;border-top:1px solid #373a40;margin:24px 0}
a{color:#f08c00;text-decoration:none}
a:hover{text-decoration:underline}
ul,ol{padding-left:24px;margin:8px 0}
li{margin:4px 0}
img{max-width:100%;border-radius:4px}
p{margin:8px 0}
strong{color:#e0e0e0}
</style></head><body>${html}</body></html>`);
  state.previewWindow.document.close();
  state.previewWindow.document.querySelectorAll('table').forEach(tableEl => {
    const wrap = state.previewWindow!.document.createElement('div');
    wrap.className = 'table-wrap';
    const parent = tableEl.parentNode;
    if (parent) {
      parent.insertBefore(wrap, tableEl);
      wrap.appendChild(tableEl);
    }
  });
}

export function showPreview() {
  refreshPageTitleFromIframes();
  const md = getFullMarkdown();
  if (!md) { setStatus(t('statusNoContent')); return; }
  openPreviewWindow(getPageTitle(), md);
  setStatus(t('statusPreviewOpen'));
}

