import { motion } from 'framer-motion';

export default function AboutPage() {
  return (
    <div className="flex flex-1 flex-col items-center px-6 py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg text-center"
      >
        <h1 className="mb-6 text-2xl font-bold text-[var(--color-accent-gold)]">
          關於神秘塔羅
        </h1>
        <p className="mb-4 leading-relaxed text-[var(--color-text-secondary)]">
          神秘塔羅結合了傳統塔羅牌的智慧與現代 AI 技術，
          為你提供深度、個人化的占卜解讀。
        </p>
        <p className="mb-4 leading-relaxed text-[var(--color-text-secondary)]">
          我們使用完整的 78 張韋特塔羅牌組，
          涵蓋 22 張大阿爾克那與 56 張小阿爾克那，
          每張牌都蘊含豐富的象徵意義。
        </p>
        <p className="leading-relaxed text-[var(--color-text-muted)]">
          塔羅牌是自我探索的工具，而非預測未來的絕對答案。
          請以開放的心態接受牌面帶來的啟示。
        </p>
      </motion.div>
    </div>
  );
}
