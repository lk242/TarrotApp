import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import CardBack from '../components/tarot/CardBack';

interface Props {
  onComplete: () => void;
}

type Phase = 'idle' | 'split' | 'swap' | 'merge';

export default function CutAnimation({ onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('split'), 200);
    const t2 = setTimeout(() => setPhase('swap'), 900);
    const t3 = setTimeout(() => setPhase('merge'), 1600);
    const t4 = setTimeout(onComplete, 2400);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, [onComplete]);

  const topY = phase === 'split' || phase === 'swap' ? -52 : 0;
  const botY = phase === 'split' || phase === 'swap' ? 52 : 0;
  const topX = phase === 'swap' ? 50 : 0;
  const botX = phase === 'swap' ? -50 : 0;
  const finalTopY = phase === 'merge' ? 0 : topY;
  const finalBotY = phase === 'merge' ? 0 : botY;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative flex w-48 items-center justify-center overflow-hidden" style={{ height: 300 }}>
        {/* 下半疊 */}
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={`bot-${i}`}
            className="absolute"
            animate={{ y: finalBotY + i * 0.5, x: phase === 'swap' ? botX : 0 }}
            transition={{ type: 'spring', stiffness: 140, damping: 20 }}
            style={{ zIndex: i, bottom: i * 0 }}
          >
            <CardBack width={90} height={142} />
          </motion.div>
        ))}

        {/* 上半疊 */}
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={`top-${i}`}
            className="absolute"
            animate={{ y: finalTopY - i * 0.5, x: phase === 'swap' ? topX : 0 }}
            transition={{ type: 'spring', stiffness: 140, damping: 20 }}
            style={{ zIndex: 10 + i }}
          >
            <CardBack width={90} height={142} glowing={phase === 'merge'} />
          </motion.div>
        ))}
      </div>

      <motion.p
        key={phase}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-sm text-[var(--color-text-secondary)]"
      >
        {phase === 'merge' ? '切牌完成，命運已定...' : '切牌中，分割命運的交叉點...'}
      </motion.p>
    </div>
  );
}
