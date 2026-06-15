/**
 * 蓝湖 Axure 需求提取器 — Popup
 * 支持全页提取 + 拾取模式（点击元素提取）
 */

(function () {
  'use strict';

  const DOM = {
    statusDot: document.getElementById('statusDot'),
    statusText: document.getElementById('statusText'),
    currentPage: document.getElementById('currentPage'),
    btnExtract: document.getElementById('btnExtract'),
    btnPicker: document.getElementById('btnPicker'),
    btnDownload: document.getElementById('btnDownload'),
    btnCopy: document.getElementById('btnCopy'),
    btnDiagnose: document.getElementById('btnDiagnose'),
    previewBody: document.getElementById('previewBody'),
    previewCount: document.getElementById('previewCount'),
    previewMeta: document.getElementById('previewMeta'),
  };

  let lastMarkdown = '';
  let tabId = null;
  let pickerActive = false;

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

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  async function getCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }

  async function sendToContent(action, payload = {}, retries = 2) {
    if (!tabId) {
      const tab = await getCurrentTab();
      tabId = tab.id;
    }
    for (let i = 0; i <= retries; i++) {
      try {
        return await chrome.tabs.sendMessage(tabId, { action, ...payload });
      } catch (e) {
        if (i < retries) await new Promise(r => setTimeout(r, 500));
        else throw new Error('内容脚本未响应 (' + e.message + ')');
      }
    }
  }

  // ---- 全页提取 ----
  async function extract() {
    disableButtons();
    DOM.btnExtract.textContent = '⏳ 提取中...';
    setStatus('正在提取所有 frame...', 'busy');
    showPreview('正在扫描页面中的表格和需求内容...');

    try {
      const tab = await getCurrentTab();
      tabId = tab.id;

      if (!tab.url || !tab.url.includes('lanhuapp.com')) {
        showError('请在 lanhuapp.com 上使用');
        resetButtons();
        return;
      }
      DOM.currentPage.textContent = tab.title || tab.url;

      try { await sendToContent('ping'); }
      catch { showError('内容脚本未加载，请刷新页面'); resetButtons(); return; }

      const response = await chrome.runtime.sendMessage({ action: 'extract', tabId: tab.id });
      if (!response || response.error) { showError('提取失败: ' + (response?.error || '无响应')); resetButtons(); return; }

      const md = response.combinedMarkdown || '';
      if (!md || md.length < 20) {
        setStatus('⚠️ 未检测到内容', 'error');
        DOM.previewBody.innerHTML = `<p class="empty-result">未检测到内容。<br>试试「🎯 拾取模式」手动选择元素。</p>`;
        DOM.btnDiagnose.disabled = false;
        resetButtons();
        return;
      }

      lastMarkdown = md;
      DOM.previewCount.textContent = `${response.framesResponded}/${response.framesScanned} frame · ${response.tableCount || 0} 个表格 · ${response.textCount || 0} 段文本`;
      DOM.previewMeta.textContent = `扫描 ${response.framesScanned} 个 frame`;
      showPreview(md.split('\n').slice(0, 30).join('\n'));
      setStatus(`✅ 完成 — ${response.tableCount || 0} 个表格`, 'ready');
      DOM.btnDownload.disabled = false;
      DOM.btnCopy.disabled = false;
      DOM.btnDiagnose.disabled = false;

    } catch (err) {
      showError('提取失败: ' + err.message);
    } finally {
      resetButtons();
    }
  }

  // ---- 拾取模式 ----
  async function togglePicker() {
    try {
      const tab = await getCurrentTab();
      tabId = tab.id;

      if (!tab.url || !tab.url.includes('lanhuapp.com')) {
        showError('请在 lanhuapp.com 上使用');
        return;
      }

      if (!pickerActive) {
        // 先 Ping 内容脚本
        try { await sendToContent('ping'); }
        catch { showError('内容脚本未加载，请刷新页面'); return; }

        // 启动拾取
        await chrome.runtime.sendMessage({ action: 'start-picker', tabId: tab.id });
        pickerActive = true;
        DOM.btnPicker.textContent = '⏹ 退出拾取';
        DOM.btnPicker.classList.add('active');
        setStatus('🎯 拾取模式已激活 — 悬停预览 · 点击定位 · 同处再点升级', 'busy');
        DOM.previewBody.innerHTML = `<p class="hint" style="color:#2b8a3e;font-weight:600;">
          🎯 拾取模式已激活<br><br>
          <b>🖱 悬停预览</b> → 橙色高亮提示即将选中的范围<br>
          <b>👆 点击</b> → 智能定位容器，一步到位<br>
          <b>🔼 同处再点</b> → 升级到上一级容器<br><br>
          结果在右下角浮动面板显示。<br>
          按 <kbd style="background:#373a40;padding:2px 8px;border-radius:3px;">ESC</kbd> 退出。
        </p>`;
        DOM.previewCount.textContent = '拾取模式';

        // 开始监听拾取结果
        startPickerListener();
      } else {
        await deactivatePicker();
      }

    } catch (err) {
      showError('拾取模式启动失败: ' + err.message);
    }
  }

  let pickerListener = null;

  function startPickerListener() {
    if (pickerListener) return;
    pickerListener = (message) => {
      if (message.action === 'picker-result') {
        const d = message.data;
        lastMarkdown = d.markdown;

        DOM.previewCount.textContent = `类型: ${d.type} · 路径: ${escapeHtml(d.selector)}`;
        DOM.previewMeta.textContent = `<${d.tag}>${d.id ? '#' + d.id : ''}${d.classes ? '.' + d.classes : ''}`;
        showPreview(d.markdown);

        setStatus(`✅ 已提取 ${d.type}`, 'ready');
        DOM.btnDownload.disabled = false;
        DOM.btnCopy.disabled = false;
      }
      if (message.action === 'picker-cancelled') {
        deactivatePicker();
      }
    };
    chrome.runtime.onMessage.addListener(pickerListener);
  }

  async function deactivatePicker() {
    try {
      await chrome.runtime.sendMessage({ action: 'stop-picker', tabId });
    } catch {}
    pickerActive = false;
    DOM.btnPicker.textContent = '🎯 拾取模式';
    DOM.btnPicker.classList.remove('active');
    if (pickerListener) {
      chrome.runtime.onMessage.removeListener(pickerListener);
      pickerListener = null;
    }
    setStatus('拾取模式已退出', 'ready');
  }

  // ---- 下载 / 复制 ----
  function download() {
    if (!lastMarkdown) { showError('没有内容'); return; }
    const filename = `蓝湖需求_${new Date().toISOString().slice(0, 10)}.md`;
    const blob = new Blob([lastMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus(`✅ 已下载: ${filename}`, 'ready');
  }

  async function copyToClipboard() {
    if (!lastMarkdown) { showError('没有内容'); return; }
    try {
      await navigator.clipboard.writeText(lastMarkdown);
      setStatus('✅ 已复制', 'ready');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = lastMarkdown;
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setStatus('✅ 已复制', 'ready');
    }
  }

  // ---- 诊断 ----
  async function diagnose() {
    setStatus('🔍 诊断中...', 'busy');
    DOM.previewBody.innerHTML = '<p class="hint">正在收集...</p>';

    try {
      const tab = await getCurrentTab();
      const response = await chrome.runtime.sendMessage({ action: 'diagnose', tabId: tab.id });
      if (!response || !response.success) { showError('诊断失败'); return; }

      const frames = response.frames || [];
      let html = `<div style="font-size:12px;line-height:1.8;"><b>🔬 诊断（${frames.length} 个 frame）</b><br><br>`;
      frames.forEach(f => {
        const icon = f.accessible ? '✅' : '❌';
        const script = f.hasScript ? '有脚本' : '无脚本';
        const axure = f.isAxure ? '✅ Axure' : '';
        html += `<b>${icon} Frame #${f.frameId}</b> (父: ${f.parentFrameId})<br>`;
        html += `&nbsp;<code style="word-break:break-all;">${escapeHtml(f.url || '-')}</code><br>`;
        html += `&nbsp;${f.accessible ? '可访问' : '不可访问'} · ${script} ${axure}<br>`;
        if (f.hasScript) {
          html += `&nbsp;页面: ${escapeHtml(f.title || '-')} · ${(f.bodySize/1000).toFixed(1)}KB · 表格 ${f.tableCount}<br>`;
        }
        html += `<br>`;
      });
      if (frames.filter(f => f.accessible && f.isAxure).length === 0) {
        html += `<i>💡 没有 frame 被标记为 Axure 内容，试试拾取模式手动选择。</i>`;
      }
      html += `</div>`;
      DOM.previewBody.innerHTML = html;
      DOM.previewCount.textContent = `${frames.length} frame`;
      setStatus('✅ 诊断完成', 'ready');
    } catch (err) {
      showError('诊断失败: ' + err.message);
    }
  }

  // ---- 辅助 ----
  function disableButtons() {
    DOM.btnExtract.disabled = true;
    DOM.btnDownload.disabled = true;
    DOM.btnCopy.disabled = true;
    DOM.btnDiagnose.disabled = true;
    DOM.btnPicker.disabled = true;
  }

  function resetButtons() {
    DOM.btnExtract.disabled = false;
    DOM.btnExtract.textContent = '🔍 提取需求内容';
    DOM.btnPicker.disabled = false;
  }

  function showPreview(text) {
    DOM.previewBody.innerHTML = `<code style="color:#909296;font-size:12px;white-space:pre-wrap;">${escapeHtml(text)}</code>`;
  }

  // ---- 初始化 ----
  async function init() {
    try {
      const tab = await getCurrentTab();
      tabId = tab.id;
      DOM.currentPage.textContent = tab.title || tab.url || '未知';
      if (!tab.url || !tab.url.includes('lanhuapp.com')) setStatus('⚠️ 不在蓝湖页面', 'error');

      try { await sendToContent('ping'); }
      catch {
        setStatus('⚠️ 内容脚本未加载，请刷新页面', 'error');
        DOM.previewBody.innerHTML = `<p class="empty-result">请刷新蓝湖页面后使用。</p>`;
      }
    } catch { DOM.currentPage.textContent = '无法获取'; }
  }

  // ---- 事件绑定 ----
  DOM.btnExtract.addEventListener('click', extract);
  DOM.btnPicker.addEventListener('click', togglePicker);
  DOM.btnDownload.addEventListener('click', download);
  DOM.btnCopy.addEventListener('click', copyToClipboard);
  DOM.btnDiagnose.addEventListener('click', diagnose);

  // Popup 关闭时清理拾取模式
  window.addEventListener('unload', () => {
    if (pickerActive && tabId) {
      chrome.runtime.sendMessage({ action: 'stop-picker', tabId }).catch(() => {});
    }
  });

  init();
})();
