/**
 * 内容脚本国际化：用户设置 → chrome.i18n → 内联 LANG
 */
import { LANG, type TranslationKey } from './locales';
import { state } from '../state';
import { ensureExtensionContext, isExtensionContextValid } from '../utils/extension-context';

if (isExtensionContextValid()) {
  chrome.storage.local.get('axure_utils_lang', (d) => {
    if (!isExtensionContextValid()) return;
    if (d?.axure_utils_lang) applyLang(d.axure_utils_lang);
  });
}
try {
  const stored = localStorage.getItem('axure_utils_lang');
  if (stored) applyLang(stored);
} catch { /* ignore */ }

export function normalizeLang(lang: string | null | undefined): string | null {
  if (!lang || lang === 'auto') return null;
  if (lang === 'en') return 'en';
  if (lang === 'zh_CN' || lang.startsWith('zh')) return 'zh_CN';
  return LANG[lang as keyof typeof LANG] ? lang : null;
}

export function applyLang(lang: string | null | undefined): void {
  const normalized = normalizeLang(lang);
  if (normalized) state.lang = normalized;
}

export function getEffectiveLang(): keyof typeof LANG {
  if (state.lang && LANG[state.lang as keyof typeof LANG]) return state.lang as keyof typeof LANG;
  return (navigator.language || '').startsWith('zh') ? 'zh_CN' : 'en';
}

export function t(key: TranslationKey, ...subs: (string | number)[]): string {
  const lang = getEffectiveLang();
  let msg: string | undefined =
    LANG[lang][key] ??
    LANG.zh_CN[key] ??
    LANG.en[key];
  if (!msg) {
    if (isExtensionContextValid()) {
      try {
        return chrome.i18n.getMessage(key, subs.length ? subs.map(String) : undefined) || key;
      } catch { /* extension reloaded */ }
    }
    return key;
  }
  subs.forEach((s, i) => { msg = msg!.replace(new RegExp(`\\$${i + 1}`, 'g'), String(s)); });
  return msg;
}

export type { TranslationKey };
