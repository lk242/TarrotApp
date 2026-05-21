import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import CardBack from '../components/tarot/CardBack';
import { useI18n } from '../../controllers/useI18n';

interface Props {
  onComplete: () => void;
}

type Phase = 'idle' | 'split' | 'swap' | 'merge';

export default function CutAnimation({ onComplete }: Props) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>('idle');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('split'), 200);
    const t2 = setTimeout(() => setPhase('swap'), 900);
    const t3 = setTimeout(() => setPhase('merge'), 1600);
    const t4 = setTimeout(onComplete, 2400);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, [onComplete]);

  const topY = phase === 'split' || phase === 'swap' ? -109 : 0;
  const botY = phase === 'split' || phase === 'swap' ? 109 : 0;
  const topX = phase === 'swap' ? 98 : 0;
  const botX = phase === 'swap' ? -98 : 0;
  const finalTopY = phase === 'merge' ? 0 : topY;
  const finalBotY = phase === 'merge' ? 0 : botY;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative flex items-center justify-center overflow-hidden" style={{ width: 532, height: 616 }}>
        {/* 下半疊 */}
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={`bot-${i}`}
            className="absolute"
            animate={{ y: finalBotY + i * 0.5, x: phase === 'swap' ? botX : 0 }}
            transition={{ type: 'spring', stiffness: 140, damping: 20 }}
            style={{ zIndex: i, bottom: i * 0 }}
          >
            <CardBack width={196} height={308} />
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
            <CardBack width={196} height={308} glowing={phase === 'merge'} />
          </motion.div>
        ))}
      </div>

      <motion.p
        key={phase}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-sm text-[var(--color-text-secondary)]"
      >
        {phase === 'merge' ? t.reading.cutComplete : t.reading.cutInProgress}
      </motion.p>
    </div>
  );
}
