/**
 * 蓝湖 Axure 需求提取器 — Popup
 * 直接与 content script 通信，不依赖 background
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
    btnDiagnose: document.getElementById('btnDiagnose'),
    previewBody: document.getElementById('previewBody'),
    previewCount: document.getElementById('previewCount'),
    previewMeta: document.getElementById('previewMeta'),
  };

  let lastMarkdown = '';
  let tabId = null;

  // ---- Utility ----
  function setStatus(text, type = 'ready') {
    DOM.statusText.textContent = text;
    DOM.statusDot.className = 'status-dot ' + type;
  }

  function showError(msg) {
    setStatus('❌ ' + msg, 'error');
    DOM.previewBody.innerHTML = `<p class="empty-result">${msg}</p>`;
    DOM.previewCount.textContent = '错误';
  }

  function resetButtons() {
    DOM.btnExtract.disabled = false;
    DOM.btnExtract.textContent = '🔍 提取需求内容';
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---- 获取当前 tab ----
  async function getCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }

  // ---- 向内容脚本发消息（带重试） ----
  async function sendToContent(action, payload = {}, retries = 2) {
    if (!tabId) {
      const tab = await getCurrentTab();
      tabId = tab.id;
    }

    for (let i = 0; i <= retries; i++) {
      try {
        return await chrome.tabs.sendMessage(tabId, { action, ...payload });
      } catch (e) {
        if (i < retries) {
          // 等待一下再重试
          await new Promise(r => setTimeout(r, 500));
        } else {
          throw new Error('内容脚本未响应，请刷新页面后重试 (' + e.message + ')');
        }
      }
    }
  }

  // ---- 提取 ----
  async function extract() {
    DOM.btnExtract.disabled = true;
    DOM.btnExtract.textContent = '⏳ 提取中...';
    setStatus('正在提取所有 frame 中的内容...', 'busy');
    DOM.previewBody.innerHTML = '<p class="hint">正在扫描页面中的表格和需求内容...</p>';
    DOM.previewCount.textContent = '扫描中...';
    DOM.previewMeta.textContent = '';

    try {
      const tab = await getCurrentTab();
      tabId = tab.id;

      if (!tab.url || !tab.url.includes('lanhuapp.com')) {
        showError('当前页面不是蓝湖页面，请在 lanhuapp.com 上使用');
        resetButtons();
        return;
      }
      DOM.currentPage.textContent = tab.title || tab.url;

      // 先 ping 内容脚本
      try {
        await sendToContent('ping');
      } catch (e) {
        showError('内容脚本未加载，请刷新页面后重试');
        resetButtons();
        return;
      }

      // 走 background 协调所有 frame 的提取
      const response = await chrome.runtime.sendMessage({
        action: 'extract',
        tabId: tab.id,
      });

      if (!response || response.error) {
        showError('提取失败: ' + (response?.error || '无响应'));
        resetButtons();
        return;
      }

      const md = response.combinedMarkdown || '';

      if (!md || md.length < 20) {
        setStatus('⚠️ 未检测到内容', 'error');
        let msg = '未在当前页面检测到表格或需求内容。';
        msg += `<br><br>扫描了 ${response.framesScanned || '?'} 个 frame，${response.framesResponded || 0} 个有响应。`;
        msg += `<br>试试点击「🔬 诊断」查看详情。`;
        DOM.previewBody.innerHTML = `<p class="empty-result">${msg}</p>`;
        DOM.btnDiagnose.disabled = false;
        resetButtons();
        return;
      }

      lastMarkdown = md;

      // 统计
      const tableCount = response.tableCount || 0;
      const textCount = response.textCount || 0;

      DOM.previewCount.textContent =
        `${response.framesResponded}/${response.framesScanned} 个 frame · ${tableCount} 个表格 · ${textCount} 段文本`;

      DOM.previewMeta.textContent = `扫描 ${response.framesScanned} 个 frame，${response.framesResponded} 个有响应`;

      // 预览前 30 行
      const previewLines = md.split('\n').slice(0, 30).join('\n');
      DOM.previewBody.innerHTML = `<code style="color:#909296;font-size:12px;white-space:pre-wrap;">${escapeHtml(previewLines)}</code>`;

      setStatus(`✅ 提取完成 — ${tableCount} 个表格`, 'ready');
      DOM.btnDownload.disabled = false;
      DOM.btnCopy.disabled = false;
      DOM.btnDiagnose.disabled = false;

    } catch (err) {
      showError('提取失败: ' + err.message);
    } finally {
      resetButtons();
    }
  }

  // ---- 下载 ----
  function download() {
    if (!lastMarkdown) {
      showError('没有内容可下载');
      return;
    }

    const filename = `蓝湖需求_${new Date().toISOString().slice(0, 10)}.md`;
    const blob = new Blob([lastMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus(`✅ 已下载: ${filename}`, 'ready');
  }

  // ---- 复制 ----
  async function copyToClipboard() {
    if (!lastMarkdown) {
      showError('没有内容可复制');
      return;
    }

    try {
      await navigator.clipboard.writeText(lastMarkdown);
      setStatus('✅ 已复制到剪贴板', 'ready');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = lastMarkdown;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setStatus('✅ 已复制到剪贴板', 'ready');
    }
  }

  // ---- 诊断 ----
  async function diagnose() {
    setStatus('🔍 诊断中...', 'busy');
    DOM.previewBody.innerHTML = '<p class="hint">正在收集页面诊断信息...</p>';

    try {
      const tab = await getCurrentTab();

      const response = await chrome.runtime.sendMessage({
        action: 'diagnose',
        tabId: tab.id,
      });

      if (!response || !response.success) {
        showError('诊断失败: ' + (response?.error || '无响应'));
        return;
      }

      const frames = response.frames || [];

      let html = `<div style="font-size:12px;line-height:1.8;">`;
      html += `<b>🔬 页面诊断信息</b><br><br>`;
      html += `共 ${frames.length} 个 frame<br><br>`;

      frames.forEach((f, i) => {
        const icon = f.accessible ? '✅' : '❌';
        const scriptStatus = f.hasScript ? '有内容脚本' : '无内容脚本';
        const axureStatus = f.isAxure ? '✅ Axure内容' : '❌ 非Axure';
        html += `<b>${icon} Frame #${f.frameId}</b> (父 frame: ${f.parentFrameId})<br>`;
        html += `&nbsp;&nbsp;URL: <code style="word-break:break-all;">${escapeHtml(f.url || '-')}</code><br>`;
        html += `&nbsp;&nbsp;状态: ${f.accessible ? '可访问' : '无法访问'} · ${scriptStatus} · ${f.hasScript ? axureStatus : ''}<br>`;
        if (f.hasScript) {
          html += `&nbsp;&nbsp;页面: ${escapeHtml(f.title || '-')} · 文字 ${(f.bodySize/1000).toFixed(1)}KB · 表格 ${f.tableCount} 个<br>`;
        }
        html += `<br>`;
      });

      // 解释说明
      const accessibleCount = frames.filter(f => f.accessible).length;
      const inaccessibleCount = frames.filter(f => !f.accessible).length;
      const axureFrames = frames.filter(f => f.isAxure);

      if (axureFrames.length === 0 && accessibleCount > 0) {
        html += `<i>💡 ${accessibleCount} 个可访问 frame 均未标记为 Axure 内容。</i><br>`;
      }
      if (inaccessibleCount > 0) {
        html += `<i>💡 ${inaccessibleCount} 个 frame 无法访问（跨域限制）。<br>`;
        html += `内容脚本已通过 all_frames 注入，background 已用 webNavigation 逐帧发送提取指令。</i><br>`;
      }

      html += `</div>`;

      DOM.previewBody.innerHTML = html;
      DOM.previewCount.textContent = `${frames.length} 个 frame`;
      setStatus('✅ 诊断完成', 'ready');

    } catch (err) {
      showError('诊断失败: ' + err.message);
    }
  }

  // ---- 初始化 ----
  async function init() {
    try {
      const tab = await getCurrentTab();
      tabId = tab.id;
      DOM.currentPage.textContent = tab.title || tab.url || '未知';

      if (!tab.url || !tab.url.includes('lanhuapp.com')) {
        setStatus('⚠️ 不在蓝湖页面', 'error');
      }

      // 检测内容脚本是否存活
      try {
        await sendToContent('ping');
      } catch {
        setStatus('⚠️ 内容脚本未加载，请刷新页面', 'error');
        DOM.previewBody.innerHTML = `<p class="empty-result">
          内容脚本尚未加载到页面中。<br><br>
          请刷新蓝湖页面后，再点击插件图标。
        </p>`;
      }
    } catch {
      DOM.currentPage.textContent = '无法获取';
    }
  }

  // ---- 事件绑定 ----
  DOM.btnExtract.addEventListener('click', extract);
  DOM.btnDownload.addEventListener('click', download);
  DOM.btnCopy.addEventListener('click', copyToClipboard);
  DOM.btnDiagnose.addEventListener('click', diagnose);

  init();
})();
