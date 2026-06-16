export type AppLang = 'zh_CN' | 'en';

export function resolveLang(saved: string | null | undefined): AppLang {
  if (saved === 'en' || saved === 'zh_CN') return saved;
  const browserLang = navigator.language || '';
  if (browserLang.startsWith('zh')) return 'zh_CN';
  return 'en';
}

export function persistLang(lang: AppLang): void {
  localStorage.setItem('axure_utils_lang', lang);
  chrome.storage.local.set({ axure_utils_lang: lang }).catch(() => {});
}
