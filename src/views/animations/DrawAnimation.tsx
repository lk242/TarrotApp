import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DrawnCard } from '../../models/tarot-card';
import type { Spread } from '../../models/spread';
import CardBack from '../components/tarot/CardBack';
import CardFace from '../components/tarot/CardFace';

interface Props {
  spread: Spread;
  drawnCards: DrawnCard[];
  onComplete: () => void;
}

export default function DrawAnimation({ spread, drawnCards, onComplete }: Props) {
  const [revealedCount, setRevealedCount] = useState(0);
  const [flipped, setFlipped] = useState<boolean[]>(Array(drawnCards.length).fill(false));

  const handleDrawNext = () => {
    if (revealedCount >= drawnCards.length) return;

    const next = revealedCount;
    setRevealedCount(next + 1);

    // 延遲翻牌效果
    setTimeout(() => {
      setFlipped((prev) => {
        const n = [...prev];
        n[next] = true;
        return n;
      });
      if (next + 1 >= drawnCards.length) {
        setTimeout(onComplete, 800);
      }
    }, 600);
  };

  const remaining = drawnCards.length - revealedCount;

  return (
    <div className="flex flex-col items-center gap-8">
      {/* 牌陣顯示區 */}
      <div className="flex flex-wrap justify-center gap-4">
        <AnimatePresence>
          {Array.from({ length: drawnCards.length }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: -60, scale: 0.7 }}
              animate={i < revealedCount ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: -60, scale: 0.7 }}
              transition={{ type: 'spring', stiffness: 180, damping: 22 }}
              className="flex flex-col items-center gap-2"
            >
              <span className="text-xs text-[var(--color-text-muted)]">
                {spread.positions[i]?.name}
              </span>

              {/* 翻牌容器 */}
              <div className="card-flip-container" style={{ perspective: '800px' }}>
                <motion.div
                  animate={{ rotateY: flipped[i] ? 180 : 0 }}
                  transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
                  style={{ transformStyle: 'preserve-3d', position: 'relative', width: 90, height: 142 }}
                >
                  {/* 牌背面 */}
                  <div style={{ backfaceVisibility: 'hidden', position: 'absolute', inset: 0 }}>
                    <CardBack width={90} height={142} glowing />
                  </div>
                  {/* 牌正面 */}
                  <div style={{ backfaceVisibility: 'hidden', position: 'absolute', inset: 0, transform: 'rotateY(180deg)' }}>
                    <CardFace drawnCard={drawnCards[i]} className="h-[142px] w-[90px]" />
                  </div>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 牌堆 + 抽牌按鈕 */}
      {remaining > 0 ? (
        <div className="flex flex-col items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleDrawNext}
            className="group relative cursor-pointer border-none bg-transparent p-0"
          >
            {/* 疊牌效果 */}
            {[2, 1, 0].map((offset) => (
              <div
                key={offset}
                className="absolute"
                style={{ top: -offset * 2, left: offset, zIndex: offset }}
              >
                <CardBack width={90} height={142} />
              </div>
            ))}
            <div className="relative" style={{ zIndex: 3 }}>
              <CardBack width={90} height={142} glowing />
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="text-sm font-bold text-[var(--color-accent-gold)]">抽牌</span>
              </div>
            </div>
          </motion.button>
          <p className="text-xs text-[var(--color-text-muted)]">
            點擊牌堆抽取第 {revealedCount + 1} 張牌
          </p>
        </div>
      ) : (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-[var(--color-accent-gold-light)]"
        >
          ✦ 所有牌已翻開，靜候神諭...
        </motion.p>
      )}
    </div>
  );
}
