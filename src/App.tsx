import { BrowserRouter, Routes, Route } from 'react-router';
import { AuthContext, useAuthState } from './controllers/useAuth';
import { CreditsContext, useCreditState } from './controllers/useCredits';
import Navbar from './views/components/layout/Navbar';
import Footer from './views/components/layout/Footer';
import MysticBackground from './views/components/layout/MysticBackground';
import HomePage from './views/pages/HomePage';
import ReadingPage from './views/pages/ReadingPage';
import HistoryPage from './views/pages/HistoryPage';
import AboutPage from './views/pages/AboutPage';
import BillingPage from './views/pages/BillingPage';
import AdminPage from './views/pages/AdminPage';

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
      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar />
        <main className="flex flex-1 flex-col pt-16">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/reading" element={<ReadingPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/about" element={<AboutPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default function App() {
  const authState = useAuthState();
  const creditState = useCreditState(authState.user);

  return (
    /* 全站唯一 Auth provider：避免各頁重複訂閱 Firebase Auth 狀態 */
    <AuthContext.Provider value={authState}>
      <CreditsContext.Provider value={creditState}>
        <AppContent />
      </CreditsContext.Provider>
    </AuthContext.Provider>
  );
}
