/**
 * 蓝湖 Axure 需求提取器 — Popup
 */

(function () {
  'use strict';

  const DOM = {
    statusDot: document.getElementById('statusDot'),
    statusText: document.getElementById('statusText'),
    currentPage: document.getElementById('currentPage'),
    btnExtract: document.getElementById('btnExtract'),
    btnDownload: document.getElementById('btnDownload'),
    btnCopy: document.getElementById('btnCopy'),
    previewBody: document.getElementById('previewBody'),
    previewCount: document.getElementById('previewCount'),
    tabInfo: document.getElementById('tabInfo'),
  };

  let lastMarkdown = '';
  let lastExtractResult = null;

  // ---- Utility ----
  function setStatus(text, type = 'ready') {
    DOM.statusText.textContent = text;
    DOM.statusDot.className = 'status-dot ' + type;
  }

  function showError(msg) {
    setStatus('❌ ' + msg, 'error');
    DOM.previewBody.innerHTML = `<p class="empty-result">${msg}</p>`;
  }

  // ---- Extract ----
  async function extract() {
    DOM.btnExtract.disabled = true;
    DOM.btnExtract.textContent = '⏳ 提取中...';
    setStatus('正在提取所有 frame 中的内容...', 'busy');
    DOM.previewBody.innerHTML = '<p class="hint">正在扫描页面中的表格和需求内容...</p>';

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab || !tab.url || !tab.url.includes('lanhuapp.com')) {
        showError('当前页面不是蓝湖页面，请在 lanhuapp.com 上使用');
        resetButtons();
        return;
      }

      // 先 ping 一下内容脚本
      try {
        await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
      } catch {
        showError('内容脚本未加载，请刷新页面后重试');
        resetButtons();
        return;
      }

      // 提取
      const response = await chrome.runtime.sendMessage({
        action: 'extract',
        tabId: tab.id,
      });

      if (response.error) {
        showError(response.error);
        resetButtons();
        return;
      }

      lastExtractResult = response;

      const pages = response.pages || [];
      const md = response.combinedMarkdown || '';

      if (!md || md.length < 20) {
        setStatus('⚠️ 未检测到内容', 'error');
        DOM.previewBody.innerHTML = `<p class="empty-result">
          未在当前页面的表格或文本区域中检测到可提取的需求内容。<br><br>
          可能的原因：<br>
          • 页面不是 Axure 原型页面<br>
          • Axure 内容在 iframe 中尚未加载<br>
          • 页面需要交互（点击某个页面）后才能提取
        </p>`;
        resetButtons();
        return;
      }

      lastMarkdown = md;

      // 统计
      let tableCount = 0;
      let textCount = 0;
      pages.forEach(p => {
        (p.sections || []).forEach(s => {
          if (s.type === 'table') tableCount++;
          else textCount++;
        });
      });

      DOM.previewCount.textContent = `${pages.length} 个页面 · ${tableCount} 个表格 · ${textCount} 段文本`;
      setStatus(`✅ 提取完成 — ${pages.length} 个 frame · ${tableCount} 个表格`, 'ready');

      // 显示预览（从内容中提取前 500 字符做预览）
      const previewLines = md.split('\n').slice(0, 30).join('\n');
      DOM.previewBody.innerHTML = `<code style="color:#909296;font-size:12px;white-space:pre-wrap;">${escapeHtml(previewLines)}</code>`;

      // 启用下载和复制
      DOM.btnDownload.disabled = false;
      DOM.btnCopy.disabled = false;

    } catch (err) {
      showError('提取失败: ' + err.message);
    } finally {
      resetButtons();
    }
  }

  function resetButtons() {
    DOM.btnExtract.disabled = false;
    DOM.btnExtract.textContent = '🔍 提取需求内容';
  }

  // ---- Download ----
  function download() {
    if (!lastMarkdown) {
      showError('没有内容可下载');
      return;
    }

    chrome.runtime.sendMessage({
      action: 'download',
      content: lastMarkdown,
    }, (res) => {
      if (res && res.success) {
        setStatus(`✅ 已下载: ${res.filename}`, 'ready');
      } else if (res && res.error) {
        showError(res.error);
      }
    });
  }

  // ---- Copy to Clipboard ----
  async function copyToClipboard() {
    if (!lastMarkdown) {
      showError('没有内容可复制');
      return;
    }

    try {
      await navigator.clipboard.writeText(lastMarkdown);
      setStatus('✅ 已复制到剪贴板', 'ready');
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = lastMarkdown;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setStatus('✅ 已复制到剪贴板', 'ready');
    }
  }

  // ---- Get Tab Info ----
  async function updateTabInfo() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url) {
        DOM.currentPage.textContent = tab.title || tab.url;
        if (!tab.url.includes('lanhuapp.com')) {
          setStatus('⚠️ 不在蓝湖页面', 'error');
        }
      }
    } catch {
      DOM.currentPage.textContent = '无法获取';
    }
  }

  // ---- Helper ----
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---- Event Bindings ----
  DOM.btnExtract.addEventListener('click', extract);
  DOM.btnDownload.addEventListener('click', download);
  DOM.btnCopy.addEventListener('click', copyToClipboard);

  // ---- Init ----
  updateTabInfo();
})();
