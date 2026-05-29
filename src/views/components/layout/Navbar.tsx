import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '../../../controllers/useAuth';
import { useCredits } from '../../../controllers/useCredits';
import { useI18n } from '../../../controllers/useI18n';
import { useTheme } from '../../../controllers/useTheme';
import { LANG_LABELS } from '../../../services/i18n';
import type { LangCode } from '../../../services/i18n';
import AuthModal from '../auth/AuthModal';

export default function Navbar() {
  const location = useLocation();
  const { user, loading, logout } = useAuth();
  const { balance } = useCredits();
  const { t, lang, setLang } = useI18n();
  const { theme, toggle: toggleTheme } = useTheme();

  const NAV_ITEMS = [
    { path: '/', label: t.nav.home },
    { path: '/history', label: t.nav.history },
    { path: '/billing', label: t.nav.billing },
    { path: '/about', label: t.nav.about },
  ];
  const [open, setOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  // AuthModal 內也會監聽 user，自動關閉；這裡保留單純的外部關閉 callback。
  const handleAuthClose = () => setAuthOpen(false);

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--color-border)] backdrop-blur-md"
        style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 92%, transparent)', transition: 'background-color 0.25s, border-color 0.25s' }}
      >
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link to="/" className="group flex items-center gap-2 text-[var(--color-accent-gold)] no-underline">
            <img src={`/images/theme/${theme}/logo.${theme === 'light' ? 'png' : 'webp'}`} alt="" className="h-8 w-8 transition-transform group-hover:scale-110" />
            <span className="text-lg font-bold tracking-[0.15em]" style={{ fontVariant: 'small-caps' }}>{t.appName}</span>
          </Link>

          {/* 手機端漢堡 */}
          <button
            onClick={() => setOpen(!open)}
            className="cursor-pointer border-none bg-transparent p-2 text-[var(--color-text-secondary)] md:hidden"
            aria-label="選單"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {open ? <path d="M6 6l12 12M6 18L18 6" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>

          {/* 桌面端導航 */}
          <div className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`rounded-lg px-4 py-2 text-sm transition-colors no-underline ${
                  location.pathname === item.path
                    ? 'bg-[var(--color-bg-glass)] text-[var(--color-accent-gold)]'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                {item.label}
              </Link>
            ))}

            {/* 語系切換 */}
            <div className="relative ml-2">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="cursor-pointer rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-[10px] text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-accent-gold)]/40 hover:text-[var(--color-text-secondary)]"
              >
                {lang === 'zh-TW' ? '中' : lang === 'en' ? 'EN' : 'JP'}
              </button>
              {langOpen && (
                <div className="absolute right-0 top-full mt-1 min-w-[100px] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] py-1 shadow-lg">
                  {(Object.keys(LANG_LABELS) as LangCode[]).map((code) => (
                    <button
                      key={code}
                      onClick={() => { setLang(code); setLangOpen(false); }}
                      className={`block w-full cursor-pointer px-3 py-1.5 text-left text-xs transition-colors ${
                        lang === code
                          ? 'bg-[var(--color-accent-gold)]/10 text-[var(--color-accent-gold)]'
                          : 'bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]'
                      }`}
                    >
                      {LANG_LABELS[code]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 主題切換 — iOS 風格圖示 */}
            <button
              onClick={toggleTheme}
              className="cursor-pointer rounded-lg border border-[var(--color-border)] bg-transparent p-1.5 text-[var(--color-text-muted)] transition-all hover:border-[var(--color-accent-gold)]/40 hover:text-[var(--color-text-secondary)]"
              aria-label="切換深淺主題"
            >
              {theme === 'light' ? (
                /* 月亮：切到深色 */
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
                /* 太陽：切到淺色 */
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              )}
            </button>

            {/* 登入/使用者：桌面端直接顯示頭像與{t.nav.logout}；手機端在下方抽屜顯示。 */}
            <div className="ml-3 border-l border-[var(--color-border)] pl-3">
              {loading ? (
                <span className="text-xs text-[var(--color-text-muted)]">...</span>
              ) : user ? (
                <div className="flex items-center gap-2">
                  <Link
                    to="/billing"
                    className="rounded border border-[var(--color-accent-gold)]/30 px-2 py-1 text-[10px] font-bold text-[var(--color-accent-gold)] no-underline"
                  >
                    {t.nav.billing} {balance}
                  </Link>
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="h-7 w-7 rounded-full" />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-accent-purple)] text-xs font-bold text-white">
                      {(user.displayName || user.email || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="max-w-[100px] truncate text-xs text-[var(--color-text-secondary)]">
                    {user.displayName || user.email}
                  </span>
                  <button
                    onClick={logout}
                    className="cursor-pointer rounded border border-[var(--color-border)] bg-transparent px-2 py-1 text-[10px] text-[var(--color-text-muted)] transition-colors hover:border-red-800/50 hover:text-red-400"
                  >
                    {t.nav.logout}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAuthOpen(true)}
                  className="cursor-pointer rounded-lg border border-[var(--color-accent-gold)]/40 bg-transparent px-4 py-1.5 text-xs font-medium text-[var(--color-accent-gold)] transition-colors hover:bg-[var(--color-accent-gold)]/10"
                >
                  {t.nav.login}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 手機端選單 */}
        {open && (
          <div className="border-t border-[var(--color-border)] px-6 py-3 md:hidden" style={{ backgroundColor: 'var(--color-bg-primary)', transition: 'background-color 0.25s' }}>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setOpen(false)}
                className={`block rounded-lg px-4 py-3 text-sm no-underline transition-colors ${
                  location.pathname === item.path
                    ? 'text-[var(--color-accent-gold)]'
                    : 'text-[var(--color-text-secondary)]'
                }`}
              >
                {item.label}
              </Link>
            ))}
            {/* 手機端語系 + 主題切換 */}
            <div className="mt-2 flex items-center justify-between border-t border-[var(--color-border)] px-4 pt-3 pb-2">
              {/* 語系 */}
              <div className="flex gap-1">
                {(Object.keys(LANG_LABELS) as LangCode[]).map((code) => (
                  <button
                    key={code}
                    onClick={() => setLang(code)}
                    className={`cursor-pointer rounded px-2.5 py-1.5 text-xs transition-colors ${
                      lang === code
                        ? 'bg-[var(--color-accent-gold)]/15 font-bold text-[var(--color-accent-gold)]'
                        : 'bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                    }`}
                  >
                    {code === 'zh-TW' ? '中文' : code === 'en' ? 'EN' : '日本語'}
                  </button>
                ))}
              </div>
              {/* 主題 */}
              <button
                onClick={toggleTheme}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-1.5 text-xs text-[var(--color-text-muted)] transition-all hover:border-[var(--color-accent-gold)]/40"
                aria-label="切換深淺主題"
              >
                {theme === 'light' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                )}
                {theme === 'light' ? '深色' : '淺色'}
              </button>
            </div>

            {/* 手機端登入 */}
            <div className="mt-2 border-t border-[var(--color-border)] pt-3">
              {user ? (
                <div className="px-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs text-[var(--color-text-secondary)]">
                      {user.displayName || user.email}
                    </span>
                    <Link
                      to="/billing"
                      onClick={() => setOpen(false)}
                      className="rounded border border-[var(--color-accent-gold)]/30 px-2 py-1 text-xs font-bold text-[var(--color-accent-gold)] no-underline"
                    >
                      {t.nav.billing} {balance}
                    </Link>
                  </div>
                  <button
                    onClick={() => { logout(); setOpen(false); }}
                    className="w-full cursor-pointer rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-xs text-[var(--color-text-muted)] hover:text-red-400"
                  >
                    {t.nav.logout}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setAuthOpen(true); setOpen(false); }}
                  className="w-full cursor-pointer rounded-lg border border-[var(--color-accent-gold)]/40 bg-transparent px-4 py-2.5 text-sm font-medium text-[var(--color-accent-gold)]"
                >
                  {t.nav.login}
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      <AuthModal open={authOpen} onClose={handleAuthClose} />
    </>
  );
}
