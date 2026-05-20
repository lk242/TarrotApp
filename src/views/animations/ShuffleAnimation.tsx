import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import CardBack from '../components/tarot/CardBack';

interface Props {
  onComplete: () => void;
}

type Phase = 'entering' | 'splitting' | 'riffling' | 'gathering' | 'withdrawing';

const RIFFLE_CARDS = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  fromLeft: i % 2 === 0,
  delay: i * 0.09,
  settleX: [-8, 6, -3, 9, -6, 4, -10, 7, -2, 5, -7, 10, -4, 3, -9, 8, -5, 2][i],
  settleRotate: [-7, 5, -2, 8, -5, 3, -9, 6, -1, 4, -6, 9, -3, 2, -8, 7, -4, 1][i],
}));

const PHASE_TEXT: Record<Phase, string> = {
  entering:    '牌陣正在聚集能量...',
  splitting:   '將牌分為陰陽兩半...',
  riffling:    '命運的絲線交織重組...',
  gathering:   '命運之序已重新編排',
  withdrawing: '牌充滿了你的能量',
};

function CardStack({ count = 6, width = 100, height = 156, glowTop = true }: {
  count?: number; width?: number; height?: number; glowTop?: boolean;
}) {
  return (
    <div className="relative" style={{ width, height }}>
      {Array.from({ length: count }, (_, i) => count - 1 - i).map(i => (
        <div key={i} className="absolute"
          style={{ top: -i * 1.5, left: i * 0.5, zIndex: i }}>
          <CardBack width={width} height={height} glowing={glowTop && i === 0} />
        </div>
      ))}
    </div>
  );
}

export default function ShuffleAnimation({ onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>('entering');

  useEffect(() => {
    const T = [
      setTimeout(() => setPhase('splitting'),   950),
      setTimeout(() => setPhase('riffling'),    1900),
      setTimeout(() => setPhase('gathering'),   3800),
      setTimeout(() => setPhase('withdrawing'), 4700),
      setTimeout(onComplete,                    5600),
    ];
    return () => T.forEach(clearTimeout);
  }, [onComplete]);

  const showDeck   = phase === 'entering';
  const showSplit  = phase === 'splitting' || phase === 'riffling';
  const showRiffle = phase === 'riffling';
  const showFinal  = phase === 'gathering' || phase === 'withdrawing';

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative flex items-center justify-center overflow-hidden"
        style={{ width: 420, height: 380 }}>

        {/* 初始牌堆 */}
        {showDeck && (
          <div className="absolute animate-fade-in"
            style={{ left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}>
            <CardStack />
          </div>
        )}

        {/* 分牌 — 左右兩疊 */}
        {showSplit && (
          <>
            <motion.div className="absolute z-10"
              style={{ top: '50%', marginTop: -69 }}
              initial={{ x: 0, left: '50%', marginLeft: -44 }}
              animate={{ x: showRiffle ? -60 : -76, opacity: showRiffle ? 0.5 : 1 }}
              transition={{ type: 'spring', stiffness: 80, damping: 14 }}>
              <CardStack count={4} width={88} height={138} />
            </motion.div>
            <motion.div className="absolute z-10"
              style={{ top: '50%', marginTop: -69 }}
              initial={{ x: 0, left: '50%', marginLeft: -44 }}
              animate={{ x: showRiffle ? 60 : 76, opacity: showRiffle ? 0.5 : 1 }}
              transition={{ type: 'spring', stiffness: 80, damping: 14 }}>
              <CardStack count={4} width={88} height={138} />
            </motion.div>
          </>
        )}

        {/* Riffle — 牌交錯飄落 */}
        {showRiffle && RIFFLE_CARDS.map(card => (
          <motion.div key={`rf-${card.id}`}
            className="absolute z-20"
            style={{ left: '50%', top: '42%', marginLeft: -42 }}
            initial={{
              x: card.fromLeft ? -58 : 58,
              y: -16,
              rotate: card.fromLeft ? 16 : -16,
              opacity: 0,
            }}
            animate={{
              x: card.settleX,
              y: card.id * 2.8,
              rotate: card.settleRotate,
              opacity: 0.9,
            }}
            transition={{ delay: card.delay, duration: 0.25, ease: 'easeOut' }}>
            <CardBack width={84} height={132} />
          </motion.div>
        ))}

        {/* 收攏牌堆 */}
        {showFinal && (
          <div className="absolute animate-fade-in"
            style={{ left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}>
            <CardStack />
          </div>
        )}

        {/* 神秘光環 */}
        <motion.div
          className="pointer-events-none absolute rounded-full"
          style={{
            width: 220, height: 220,
            left: '50%', top: '50%',
            marginLeft: -110, marginTop: -110,
            background: 'radial-gradient(circle, rgba(201,168,76,0.1) 0%, transparent 70%)',
          }}
          animate={{
            scale: showRiffle ? [1, 1.25, 1] : 1,
            opacity: phase === 'withdrawing' ? 0 : 1,
          }}
          transition={{ duration: 2, repeat: showRiffle ? Infinity : 0, ease: 'easeInOut' }}
        />
      </div>

      {/* 說明文字 */}
      <p key={phase} className="text-sm text-[var(--color-text-secondary)] animate-fade-in">
        {PHASE_TEXT[phase]}
      </p>
    </div>
  );
}
