import { useState } from 'react';
import { Link, useLocation } from 'react-router';

const NAV_ITEMS = [
  { path: '/', label: '首頁' },
  { path: '/reading', label: '開始占卜' },
  { path: '/history', label: '占卜紀錄' },
  { path: '/about', label: '關於' },
];

export default function Navbar() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg-primary)]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 text-[var(--color-accent-gold)] no-underline">
          <span className="text-2xl">✦</span>
          <span className="text-lg font-bold tracking-wider">神秘塔羅</span>
        </Link>

        <button
          onClick={() => setOpen(!open)}
          className="cursor-pointer border-none bg-transparent p-2 text-[var(--color-text-secondary)] md:hidden"
          aria-label="選單"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? (
              <path d="M6 6l12 12M6 18L18 6" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

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
        </div>
      </div>

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
        </div>
      )}
    </nav>
  );
}
