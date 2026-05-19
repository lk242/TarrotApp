import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '../../../controllers/useAuth';
import { useCredits } from '../../../controllers/useCredits';
import AuthModal from '../auth/AuthModal';

const NAV_ITEMS = [
  { path: '/', label: '開始占卜' },
  { path: '/history', label: '占卜紀錄' },
  { path: '/billing', label: '點數方案' },
  { path: '/about', label: '關於' },
];

export default function Navbar() {
  const location = useLocation();
  const { user, loading, logout } = useAuth();
  const { balance } = useCredits();
  const [open, setOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  // AuthModal 內也會監聽 user，自動關閉；這裡保留單純的外部關閉 callback。
  const handleAuthClose = () => setAuthOpen(false);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg-primary)]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2 text-[var(--color-accent-gold)] no-underline">
            <span className="text-2xl">✦</span>
            <span className="text-lg font-bold tracking-wider">神秘塔羅</span>
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

            {/* 登入/使用者：桌面端直接顯示頭像與登出；手機端在下方抽屜顯示。 */}
            <div className="ml-3 border-l border-[var(--color-border)] pl-3">
              {loading ? (
                <span className="text-xs text-[var(--color-text-muted)]">...</span>
              ) : user ? (
                <div className="flex items-center gap-2">
                  <Link
                    to="/billing"
                    className="rounded border border-[var(--color-accent-gold)]/30 px-2 py-1 text-[10px] font-bold text-[var(--color-accent-gold)] no-underline"
                  >
                    點數 {balance}
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
                    登出
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAuthOpen(true)}
                  className="cursor-pointer rounded-lg border border-[var(--color-accent-gold)]/40 bg-transparent px-4 py-1.5 text-xs font-medium text-[var(--color-accent-gold)] transition-colors hover:bg-[var(--color-accent-gold)]/10"
                >
                  登入 / 註冊
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 手機端選單：與桌面導覽共用 NAV_ITEMS，避免路由標籤分岔。 */}
        {open && (
          <div className="border-t border-[var(--color-border)] bg-[var(--color-bg-primary)] px-6 py-3 md:hidden">
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
                      點數 {balance}
                    </Link>
                  </div>
                  <button
                    onClick={() => { logout(); setOpen(false); }}
                    className="w-full cursor-pointer rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-xs text-[var(--color-text-muted)] hover:text-red-400"
                  >
                    登出
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setAuthOpen(true); setOpen(false); }}
                  className="w-full cursor-pointer rounded-lg border border-[var(--color-accent-gold)]/40 bg-transparent px-4 py-2.5 text-sm font-medium text-[var(--color-accent-gold)]"
                >
                  登入 / 註冊
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
