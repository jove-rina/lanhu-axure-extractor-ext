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
    setStatus('正在提取内容...', 'busy');
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

      // 发送提取请求
      const response = await sendToContent('extract-axure');

      if (!response || response.status !== 'ok' || !response.data) {
        showError('提取失败：内容脚本返回异常');
        resetButtons();
        return;
      }

      const data = response.data;
      const pages = data.pages || [];
      const md = data.combinedMarkdown || '';
      const iframesFound = data.iframesFound || [];

      // 检查是否有实际内容
      let hasContent = false;
      pages.forEach(p => {
        if (p.sections && p.sections.length > 0) hasContent = true;
      });

      if (!hasContent) {
        // 如果有 iframe 但没提取到内容
        const inaccessibleCount = iframesFound.filter(f => !f.accessible).length;

        let msg = '未在当前页面检测到表格或需求内容。';
        if (iframesFound.length > 0) {
          msg += `<br><br>发现 ${iframesFound.length} 个 iframe：<br>`;
          iframesFound.forEach(f => {
            const status = f.accessible ? '✅ 可访问' : '❌ 无法访问（跨域）';
            msg += `• ${f.src ? f.src.substring(0, 80) : '(inline)'} — ${status}<br>`;
          });
          if (inaccessibleCount > 0) {
            msg += `<br>💡 有 ${inaccessibleCount} 个 iframe 无法直接访问，可能是跨域限制。<br>`;
            msg += `试试：点击 iframe 内部区域，让它获得焦点，再重新提取。`;
          }
        } else if (data.isAxureContent) {
          msg = '页面标记为 Axure 内容，但未提取到结构化表格/文本。<br>可以试试点击「诊断」查看详情。';
        }
        setStatus('⚠️ 未检测到内容', 'error');
        DOM.previewBody.innerHTML = `<p class="empty-result">${msg}</p>`;
        DOM.btnDiagnose.disabled = false;
        resetButtons();
        return;
      }

      // 统计
      let tableCount = 0;
      let textCount = 0;
      pages.forEach(p => {
        (p.sections || []).forEach(s => {
          if (s.type === 'table') tableCount++;
          else if (s.type === 'text' || s.type === 'heading') textCount++;
        });
      });

      lastMarkdown = md;

      // 更新 UI
      DOM.previewCount.textContent = `${pages.length} 个页面 · ${tableCount} 个表格 · ${textCount} 段文本`;

      // 显示提取来源
      const sourceInfo = pages.map(p => {
        const label = p.frame === 'top' ? '主页面' : `iframe #${p.frameIndex}`;
        const count = (p.sections || []).length;
        return `${label}: ${count} 项`;
      }).join(' · ');
      DOM.previewMeta.textContent = `来源：${sourceInfo}`;

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
      const response = await sendToContent('diagnose');

      if (!response || response.status !== 'ok') {
        showError('诊断失败');
        return;
      }

      const d = response.data;

      let html = `<div style="font-size:12px;line-height:1.8;">`;
      html += `<b>🔬 页面诊断信息</b><br><br>`;
      html += `• Frame: <code>${d.frame}</code><br>`;
      html += `• 页面: ${escapeHtml(d.title || '-')}<br>`;
      html += `• URL: <code style="word-break:break-all;">${escapeHtml(d.url || '-')}</code><br>`;
      html += `• Axure 标记: ${d.isAxure ? '✅ 是' : '❌ 否'}<br>`;

      if (d.frame === 'top') {
        html += `• 蓝湖 Axure 页: ${d.isLanhuAxurePage ? '✅ 是' : '❌ 否'}<br>`;
      }

      html += `• 页面文字量: ${(d.bodySize / 1000).toFixed(1)} KB<br>`;
      html += `• HTML 表格数: ${d.tableCount}<br>`;
      html += `<br>`;

      // iframe 信息
      if (d.iframes && d.iframes.length > 0) {
        html += `<b>📦 iframe 列表 (${d.iframes.length} 个)</b><br>`;
        d.iframes.forEach((f, i) => {
          const icon = f.accessible ? '✅' : '❌';
          const status = f.accessible ? `可访问 (${f.readyState})` : '无法访问（跨域）';
          const dimensions = f.width && f.height ? `(${f.width}x${f.height})` : '';
          html += `<br>${icon} iframe #${i} ${dimensions}<br>`;
          html += `&nbsp;&nbsp;src: <code style="word-break:break-all;">${escapeHtml(f.src || '(inline)')}</code><br>`;
          html += `&nbsp;&nbsp;状态: ${status}<br>`;
          if (f.title || f.id) {
            html += `&nbsp;&nbsp;title: ${escapeHtml(f.title)} / id: ${escapeHtml(f.id)}<br>`;
          }
        });
      } else {
        html += `<b>📦 iframe</b>: 无<br>`;
      }

      html += `<br>`;
      html += `<i>💡 如果 iframe 标记为 ❌，说明是跨域 iframe，扩展无法直接访问。<br>`;
      html += `可尝试点击 iframe 内部区域后，刷新页面再提取。</i>`;

      html += `</div>`;

      DOM.previewBody.innerHTML = html;
      DOM.previewCount.textContent = '诊断';
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
