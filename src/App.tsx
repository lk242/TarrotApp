import { BrowserRouter, Routes, Route } from 'react-router';
import Navbar from './views/components/layout/Navbar';
import Footer from './views/components/layout/Footer';
import MysticBackground from './views/components/layout/MysticBackground';
import HomePage from './views/pages/HomePage';
import ReadingPage from './views/pages/ReadingPage';
import HistoryPage from './views/pages/HistoryPage';
import AboutPage from './views/pages/AboutPage';

export default function App() {
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
            <Route path="/about" element={<AboutPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
