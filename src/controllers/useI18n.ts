import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import type { LangCode, Locale } from '../services/i18n';
import { detectLang, loadLocale, saveLang, getLocaleSync } from '../services/i18n';

interface I18nContextValue {
  lang: LangCode;
  t: Locale;
  setLang: (lang: LangCode) => void;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

/**
 * i18n Provider 用的 hook。
 * 在 App 層級呼叫一次，把回傳值丟給 I18nContext.Provider。
 */
export function useI18nProvider() {
  const [lang, setLangState] = useState<LangCode>(detectLang);
  const [t, setT] = useState<Locale>(getLocaleSync(lang));

  useEffect(() => {
    loadLocale(lang).then(setT);
  }, [lang]);

  const setLang = useCallback((newLang: LangCode) => {
    saveLang(newLang);
    setLangState(newLang);
  }, []);

  return { lang, t, setLang };
}

/**
 * 在任何元件中取得 i18n 翻譯。
 *
 * ```tsx
 * const { t, lang, setLang } = useI18n();
 * <h1>{t.appName}</h1>
 * ```
 */
export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nContext.Provider');
  return ctx;
}
