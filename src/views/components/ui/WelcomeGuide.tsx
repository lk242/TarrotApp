import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'mystic-tarot-welcome-seen';

export default function WelcomeGuide() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) setShow(true);
    } catch {
      // localStorage 不可用時不顯示
    }
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
    setShow(false);
  };

  const steps = [
    { icon: '☽', title: '選擇牌陣', desc: '單牌、三牌、凱爾特十字，依你的問題選擇合適的牌陣' },
    { icon: '✦', title: '抽出塔羅牌', desc: '滑動牌輪，點擊你直覺感應到的牌' },
    { icon: '◎', title: 'AI 深度解讀', desc: 'AI 結合你的問題與牌義，給出個人化的解讀' },
  ];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[500] flex items-end justify-center sm:items-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
        >
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280, delay: 0.1 }}
            className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl border border-[var(--color-border)] px-6 pb-8 pt-6"
            style={{ backgroundColor: 'var(--color-bg-primary)' }}
          >
            {/* 頂部把手 */}
            <div className="mb-5 flex justify-center sm:hidden">
              <div className="h-1 w-10 rounded-full bg-[var(--color-border)]" />
            </div>

            {/* 標題 */}
            <div className="mb-5 text-center">
              <p className="mb-1 text-2xl">✦</p>
              <h2 className="text-xl font-bold tracking-wider text-[var(--color-accent-gold)]">歡迎來到神秘塔羅</h2>
              <p className="mt-1.5 text-sm text-[var(--color-text-secondary)]">讓古老智慧為你解答</p>
            </div>

            {/* 步驟說明 */}
            <div className="mb-5 space-y-3">
              {steps.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="flex items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3"
                >
                  <span className="mt-0.5 text-lg text-[var(--color-accent-gold)]">{step.icon}</span>
                  <div>
                    <p className="text-sm font-bold text-[var(--color-text-primary)]">{step.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-text-secondary)]">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* 免費說明 */}
            <div className="mb-5 rounded-xl border border-[var(--color-accent-gold)]/25 bg-[var(--color-accent-gold)]/8 px-4 py-3 text-center">
              <p className="text-xs text-[var(--color-text-secondary)]">
                未登入可<span className="font-bold text-[var(--color-accent-gold)]">免費體驗抽牌</span>，登入後購買額度即可獲得 AI 解讀
              </p>
            </div>

            {/* 按鈕 */}
            <button
              onClick={dismiss}
              className="w-full cursor-pointer rounded-xl bg-[var(--color-accent-gold)] py-3.5 text-sm font-bold tracking-wider text-[var(--color-bg-primary)] transition-opacity hover:opacity-90"
            >
              開始占卜
            </button>
            <Link
              to="/about"
              onClick={dismiss}
              className="mt-3 block text-center text-xs text-[var(--color-text-muted)] no-underline transition-colors hover:text-[var(--color-text-secondary)]"
            >
              了解更多關於塔羅 →
            </Link>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
