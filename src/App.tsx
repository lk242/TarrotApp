import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router';
import { AuthContext, useAuthState } from './controllers/useAuth';
import { CreditsContext, useCreditState } from './controllers/useCredits';
import { I18nContext, useI18nProvider } from './controllers/useI18n';
import { ThemeContext, useThemeProvider } from './controllers/useTheme';
import Navbar from './views/components/layout/Navbar';
import Footer from './views/components/layout/Footer';
import MysticBackground from './views/components/layout/MysticBackground';
import HomePage from './views/pages/HomePage';

/* 路由層級 Code Splitting — 首頁保留同步載入，其餘頁面延遲載入 */
const ReadingPage = lazy(() => import('./views/pages/ReadingPage'));
const HistoryPage = lazy(() => import('./views/pages/HistoryPage'));
const BillingPage = lazy(() => import('./views/pages/BillingPage'));
const AdminPage = lazy(() => import('./views/pages/AdminPage'));
const AboutPage = lazy(() => import('./views/pages/AboutPage'));

/** 頁面載入中的佔位元件 */
function PageFallback() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full bg-[var(--color-accent-gold)] animate-pulse"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * AppContent 只負責畫面骨架與路由。
 *
 * AuthContext 放在外層 App，這裡就能讓 Navbar、HistoryPage、ReadingPage
 * 透過 useAuth() 共享同一份登入狀態；View 層不需要知道 Firebase 初始化細節。
 */
function AppContent() {
  return (
    <BrowserRouter>
      <MysticBackground />
      <div className="relative z-10 flex min-h-screen flex-col overflow-x-hidden">
        <Navbar />
        <main className="flex flex-1 flex-col pt-16 overflow-x-hidden max-w-full">
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/reading" element={<ReadingPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/billing" element={<BillingPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/about" element={<AboutPage />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default function App() {
  const authState = useAuthState();
  const creditState = useCreditState(authState.user);
  const i18n = useI18nProvider();
  const themeState = useThemeProvider();

  return (
    /* 全站唯一 Provider 層：Theme → Auth → Credits → I18n */
    <ThemeContext.Provider value={themeState}>
      <AuthContext.Provider value={authState}>
        <CreditsContext.Provider value={creditState}>
          <I18nContext.Provider value={i18n}>
            <AppContent />
          </I18nContext.Provider>
        </CreditsContext.Provider>
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );
}
