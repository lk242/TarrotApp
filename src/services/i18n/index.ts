import zhTW from './locales/zh-TW';
import type { Locale } from './locales/zh-TW';

export type LangCode = 'zh-TW' | 'en' | 'ja';

const STORAGE_KEY = 'mystic-tarot-lang';

/** zhTW cast 成 Locale（去除 as const 的 readonly + literal） */
const zhTWLocale = zhTW as unknown as Locale;

/** 各語系的 lazy loader（除了預設 zh-TW 直接內嵌） */
const loaders: Record<LangCode, () => Promise<{ default: Locale }>> = {
  'zh-TW': () => Promise.resolve({ default: zhTWLocale }),
  en: () => import('./locales/en') as Promise<{ default: Locale }>,
  ja: () => import('./locales/ja') as Promise<{ default: Locale }>,
};

const cache = new Map<LangCode, Locale>();
cache.set('zh-TW', zhTWLocale);

/** 取得偵測到的語系（localStorage > 瀏覽器語系 > 預設） */
export function detectLang(): LangCode {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && stored in loaders) return stored as LangCode;

  const browserLang = navigator.language;
  if (browserLang.startsWith('ja')) return 'ja';
  if (browserLang.startsWith('en')) return 'en';
  return 'zh-TW';
}

/** 載入語系包（有快取） */
export async function loadLocale(lang: LangCode): Promise<Locale> {
  const cached = cache.get(lang);
  if (cached) return cached;

  const mod = await loaders[lang]();
  cache.set(lang, mod.default);
  return mod.default;
}

/** 儲存語系偏好 */
export function saveLang(lang: LangCode) {
  localStorage.setItem(STORAGE_KEY, lang);
}

/** 同步取得已載入的語系（fallback 到 zh-TW） */
export function getLocaleSync(lang: LangCode): Locale {
  return cache.get(lang) ?? zhTWLocale;
}

export type { Locale };
export { zhTW };

/** 語系標籤 */
export const LANG_LABELS: Record<LangCode, string> = {
  'zh-TW': '繁體中文',
  en: 'English',
  ja: '日本語',
};
