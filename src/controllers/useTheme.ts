import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  theme: ThemeMode;
  toggle: () => void;
  /** 取得主題對應的圖片路徑前綴：`/images/theme/light` 或 `/images/theme/dark` */
  themeImageBase: string;
}

const STORAGE_KEY = 'mystic-tarot-theme';

function getInitialTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // localStorage 不可用
  }
  return 'light'; // 預設淺色
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggle: () => {},
  themeImageBase: '/images/theme/light',
});

/**
 * useThemeProvider — 在 App 根層級使用，提供主題 state。
 *
 * 負責：
 * 1. 讀寫 localStorage 記住使用者選擇
 * 2. 切換 :root 上的 data-theme 屬性（CSS 用）
 * 3. 提供 themeImageBase 給元件動態載入對應主題圖片
 */
export function useThemeProvider() {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);

  // 同步 data-theme 到 <html>，CSS 靠 [data-theme="dark"] 切換變數
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    // 淺色模式時防止 Chrome Auto Dark Mode
    const metaColorScheme = document.querySelector('meta[name="color-scheme"]');
    if (metaColorScheme) {
      metaColorScheme.setAttribute('content', theme === 'light' ? 'only light' : 'dark');
    }
    // 更新 theme-color meta
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'light' ? '#F1E6D9' : '#0A0A14');
    }
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // 寫入失敗不影響使用
      }
      return next;
    });
  }, []);

  const themeImageBase = `/images/theme/${theme}`;

  // 預載另一個主題的圖片，切換時不需要等載入
  const preloaded = useRef(false);
  useEffect(() => {
    if (preloaded.current) return;
    preloaded.current = true;
    // 延遲 2 秒後背景預載，不影響首次載入速度
    const timer = setTimeout(() => {
      const otherTheme = theme === 'light' ? 'dark' : 'light';
      const otherExt = otherTheme === 'light' ? 'png' : 'webp';
      const images = [
        'hero', 'logo', 'card-back',
        'spread-single', 'spread-three', 'spread-celtic',
        'icons/love', 'icons/career', 'icons/wealth', 'icons/fortune',
        'icons/spirit', 'icons/social', 'icons/study', 'icons/free',
      ];
      for (const name of images) {
        const img = new Image();
        img.src = `/images/theme/${otherTheme}/${name}.${otherExt}`;
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [theme]);

  return { theme, toggle, themeImageBase };
}

/**
 * useTheme — 在任何元件中讀取當前主題。
 */
export function useTheme() {
  return useContext(ThemeContext);
}
