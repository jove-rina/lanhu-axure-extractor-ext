/**
 * Axure Utilities — Popup
 * 文档构建模式：打开构建器浮动面板 + 语言选择
 */

(function () {
  'use strict';

  // ---- i18n inline translations ----
  const LANG = {
    zh_CN: {
      title: 'Axure Utilities',
      subtitle: '从 Axure 提取内容，组装 Markdown',
      ready: '就绪',
      saving: '正在打开文档构建器...',
      builderReady: '✅ 文档构建器已打开',
      notLanhu: '⚠️ 不在蓝湖页面',
      refreshPage: '⚠️ 请刷新页面后重试',
      openBuilder: '📄 打开文档构建器',
      footerAuthor: 'Author: Jove Rina',
      footerLicense: 'License: GPL-3.0',
    },
    en: {
      title: 'Axure Utilities',
      subtitle: 'Extract Axure content, compose Markdown',
      ready: 'Ready',
      saving: 'Opening...',
      builderReady: '✅ Doc builder opened',
      notLanhu: '⚠️ Not on lanhuapp.com',
      refreshPage: '⚠️ Refresh page and retry',
      openBuilder: '📄 Open Doc Builder',
      footerAuthor: 'Author: Jove Rina',
      footerLicense: 'License: GPL-3.0',
    },
  };

  function getLang() {
    // Try user preference, fallback to browser language, default zh_CN
    const saved = localStorage.getItem('axure_utils_lang');
    if (saved && (saved === 'en' || saved === 'zh_CN')) return saved;
    const browserLang = navigator.language || '';
    if (browserLang.startsWith('zh')) return 'zh_CN';
    return 'en';
  }

  let currentLang = getLang();
  const t = (key) => LANG[currentLang][key] || LANG.zh_CN[key] || key;
  const extVersion = chrome.runtime.getManifest().version;

  function applyVersion() {
    const verEl = document.getElementById('footerVersion');
    if (verEl) verEl.textContent = `v${extVersion}`;
  }

  function persistLang(lang) {
    localStorage.setItem('axure_utils_lang', lang);
    chrome.storage.local.set({ axure_utils_lang: lang }).catch(() => {});
  }

  function applyLanguage() {
    document.title = t('title');
    document.getElementById('popupTitle').textContent = t('title');
    document.getElementById('popupSubtitle').textContent = t('subtitle');
    document.getElementById('statusText').textContent = t('ready');
    const btn = document.getElementById('btnBuilder');
    if (btn) btn.innerHTML = t('openBuilder');
    const authorEl = document.getElementById('footerAuthor');
    if (authorEl) authorEl.textContent = t('footerAuthor');
    const licenseEl = document.getElementById('footerLicense');
    if (licenseEl) {
      licenseEl.innerHTML = `${t('footerLicense').replace('GPL-3.0', '<a href="https://www.gnu.org/licenses/gpl-3.0.html" target="_blank" rel="noopener">GPL-3.0</a>')}`;
    }
    // Update select to match
    const sel = document.getElementById('langSelect');
    if (sel) sel.value = currentLang;
  }

  function setStatus(text, type) {
    document.getElementById('statusText').textContent = text;
    document.getElementById('statusDot').className = 'status-dot ' + (type || 'ready');
  }

  async function openBuilder() {
    setStatus(t('saving'), 'busy');
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url || !tab.url.includes('lanhuapp.com')) {
        setStatus(t('notLanhu'), 'error');
        return;
      }
      persistLang(currentLang);
      await chrome.runtime.sendMessage({ action: 'open-builder', tabId: tab.id, lang: currentLang });
      setStatus(t('builderReady'), 'ready');
      window.close();
    } catch (err) {
      setStatus(t('refreshPage') + ' (' + err.message + ')', 'error');
    }
  }

  // ---- Init ----
  document.addEventListener('DOMContentLoaded', () => {
    applyVersion();
    applyLanguage();

    // Language selector
    const sel = document.getElementById('langSelect');
    if (sel) {
      sel.addEventListener('change', () => {
        currentLang = sel.value === 'auto' ? getLang() : sel.value;
        persistLang(currentLang);
        applyLanguage();
        // Notify content script about language change
        chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
          if (tab?.id) {
            chrome.tabs.sendMessage(tab.id, { action: 'set-language', lang: currentLang }).catch(() => {});
          }
        });
      });
    }

    // Open builder
    document.getElementById('btnBuilder')?.addEventListener('click', openBuilder);
  });
})();
