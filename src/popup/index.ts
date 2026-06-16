/**
 * Axure Utilities — Popup
 */
import { MSG } from '../shared/messages';
import { type AppLang, persistLang, resolveLang } from '../shared/lang';

const LANG: Record<AppLang, Record<string, string>> = {
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

function getLang(): AppLang {
  const saved = localStorage.getItem('axure_utils_lang');
  return resolveLang(saved);
}

let currentLang = getLang();
const t = (key: string) => LANG[currentLang][key] ?? LANG.zh_CN[key] ?? key;
const extVersion = chrome.runtime.getManifest().version;

function applyVersion(): void {
  const verEl = document.getElementById('footerVersion');
  if (verEl) verEl.textContent = `v${extVersion}`;
}

function applyLanguage(): void {
  document.title = t('title');
  const titleEl = document.getElementById('popupTitle');
  if (titleEl) titleEl.textContent = t('title');
  const subtitleEl = document.getElementById('popupSubtitle');
  if (subtitleEl) subtitleEl.textContent = t('subtitle');
  const statusEl = document.getElementById('statusText');
  if (statusEl) statusEl.textContent = t('ready');
  const btn = document.getElementById('btnBuilder');
  if (btn) btn.innerHTML = t('openBuilder');
  const authorEl = document.getElementById('footerAuthor');
  if (authorEl) authorEl.textContent = t('footerAuthor');
  const licenseEl = document.getElementById('footerLicense');
  if (licenseEl) {
    licenseEl.innerHTML = t('footerLicense').replace(
      'GPL-3.0',
      '<a href="https://www.gnu.org/licenses/gpl-3.0.html" target="_blank" rel="noopener">GPL-3.0</a>',
    );
  }
  const sel = document.getElementById('langSelect') as HTMLSelectElement | null;
  if (sel) sel.value = currentLang;
}

function setStatus(text: string, type?: string): void {
  const statusText = document.getElementById('statusText');
  const statusDot = document.getElementById('statusDot');
  if (statusText) statusText.textContent = text;
  if (statusDot) statusDot.className = 'status-dot ' + (type || 'ready');
}

async function openBuilder(): Promise<void> {
  setStatus(t('saving'), 'busy');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url?.includes('lanhuapp.com')) {
      setStatus(t('notLanhu'), 'error');
      return;
    }
    persistLang(currentLang);
    await chrome.runtime.sendMessage({
      action: MSG.OPEN_BUILDER,
      tabId: tab.id,
      lang: currentLang,
    });
    setStatus(t('builderReady'), 'ready');
    window.close();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    setStatus(`${t('refreshPage')} (${message})`, 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  applyVersion();
  applyLanguage();

  const sel = document.getElementById('langSelect') as HTMLSelectElement | null;
  if (sel) {
    sel.addEventListener('change', () => {
      currentLang = sel.value === 'auto' ? getLang() : (sel.value as AppLang);
      persistLang(currentLang);
      applyLanguage();
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (tab?.id) {
          chrome.tabs
            .sendMessage(tab.id, { action: MSG.SET_LANGUAGE, lang: currentLang })
            .catch(() => {});
        }
      });
    });
  }

  const btnBuilder = document.getElementById('btnBuilder');
  if (btnBuilder) btnBuilder.addEventListener('click', () => openBuilder());
});
