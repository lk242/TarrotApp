import { useState, useCallback, useRef, useEffect } from 'react';
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

const FAN_TOTAL = 40; // 視覺上夠密，效能 OK
const FLIP_W = 168;
const FLIP_H = 269;
const PARTICLE_TOTAL = 16;
const PARTICLE_PATTERN = Array.from({ length: PARTICLE_TOTAL }, (_, i) => {
  const angle = (i / PARTICLE_TOTAL) * 360;
  const dist = 50 + (i % 5) * 12;
  return {
    px: Math.cos((angle * Math.PI) / 180) * dist,
    py: Math.sin((angle * Math.PI) / 180) * dist,
    size: 2 + (i % 4),
  };
});

/** 金色粒子爆發 */
function Particles({ x, y }: { x: number; y: number }) {
  return (
    <div className="pointer-events-none fixed z-[999]" style={{ left: x, top: y }}>
      {PARTICLE_PATTERN.map(({ px, py, size }, i) => {
        return (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: size,
              height: size,
              background: 'radial-gradient(circle, rgba(201,168,76,0.9), rgba(232,212,139,0.5))',
              boxShadow: '0 0 6px rgba(201,168,76,0.6)',
              animation: 'particle-burst 0.7s ease-out forwards',
              animationDelay: `${i * 0.02}s`,
              ['--px' as string]: `${px}px`,
              ['--py' as string]: `${py}px`,
            }}
          />
        );
      })}
    </div>
  );
}

// ========================================================
// 桌面端：弧形扇選牌（CSS transition 驅動 hover，效能好）
// ========================================================
function DesktopFan({
  totalNeeded,
  onAllPicked,
}: {
  totalNeeded: number;
  onAllPicked: () => void;
}) {
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [revealCount, setRevealCount] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [particlePos, setParticlePos] = useState<{ x: number; y: number } | null>(null);
  const [entered, setEntered] = useState(false);
  const [containerWidth, setContainerWidth] = useState(1200);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setContainerWidth(el.clientWidth);
    // 扇形半徑依容器寬度計算，ResizeObserver 可讓桌面縮放時不跑版。
    const ro = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 入場動畫延遲結束後標記
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), FAN_TOTAL * 15 + 400);
    return () => clearTimeout(t);
  }, []);

  // 卡牌 & 弧形參數
  const cardW = 168;
  const cardH = 269;
  const fanAngle = 180; // 半圓
  const radius = containerWidth * 0.45;
  const areaHeight = radius + cardH * 0.6;
  const centerX = containerWidth / 2;

  const handlePick = useCallback(
    (fanIndex: number, e: React.MouseEvent) => {
      if (picked.has(fanIndex) || revealCount >= totalNeeded) return;

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setParticlePos({ x: rect.left + rect.width / 2, y: rect.top });
      setTimeout(() => setParticlePos(null), 800);

      // 讓附近的牌也消失
      // 消失範圍代表使用者已從牌陣中抽出一張牌，視覺上要留下被抽走的空隙。
      const newPicked = new Set(picked);
      for (let d = -2; d <= 2; d++) {
        const n = fanIndex + d;
        if (n >= 0 && n < FAN_TOTAL) newPicked.add(n);
      }
      setPicked(newPicked);

      const newCount = revealCount + 1;
      setRevealCount(newCount);

      if (newCount >= totalNeeded) {
        setTimeout(onAllPicked, 600);
      }
    },
    [picked, revealCount, totalNeeded, onAllPicked],
  );

  return (
    <div ref={containerRef} className="flex w-full flex-col items-center gap-2">
      <div className="text-center animate-fade-in">
        <p className="text-base text-[var(--color-text-secondary)]">
          用直覺從牌陣中選取{' '}
          <span className="font-bold text-[var(--color-accent-gold)]">{totalNeeded}</span> 張牌
        </p>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          已選 {revealCount} / {totalNeeded}
        </p>
      </div>

      <div className="relative w-full" style={{ height: areaHeight }}>
        {Array.from({ length: FAN_TOTAL }, (_, i) => {
          const isPicked = picked.has(i);
          const isHovered = hoveredIndex === i;
          const startAngle = -fanAngle / 2;
          const angle = startAngle + (i / (FAN_TOTAL - 1)) * fanAngle;
          const rad = (angle * Math.PI) / 180;
          const x = centerX + Math.sin(rad) * radius - cardW / 2;
          const y = areaHeight - 20 - Math.cos(rad) * radius;

          return (
            <div
              key={i}
              className="absolute origin-bottom"
              style={{
                left: x,
                top: y,
                zIndex: isHovered ? 200 : i + 1,
                cursor: isPicked ? 'default' : 'pointer',
                // 入場動畫用 CSS transition
                transform: `rotate(${angle}deg) translateY(${
                  isPicked ? '-80px' : isHovered ? '-28px' : '0'
                }) scale(${isPicked ? 0.3 : isHovered ? 1.15 : 1})`,
                opacity: isPicked ? 0 : entered ? 1 : 0,
                filter:
                  !isPicked && isHovered
                    ? 'drop-shadow(0 0 20px rgba(201,168,76,0.8)) brightness(1.2)'
                    : 'none',
                transition: entered
                  ? 'transform 0.2s ease-out, opacity 0.3s, filter 0.15s'
                  : `opacity 0.3s ${i * 15}ms, transform 0.4s ${i * 15}ms ease-out`,
                pointerEvents: isPicked ? 'none' : 'auto',
              }}
              onMouseEnter={() => !isPicked && setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={(e) => !isPicked && handlePick(i, e)}
            >
              <CardBack width={cardW} height={cardH} glowing={isHovered && !isPicked} />
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {particlePos && <Particles x={particlePos.x} y={particlePos.y} />}
      </AnimatePresence>
    </div>
  );
}

// ========================================================
// 手機端：向上滑動抽牌
// ========================================================
function MobileSwipeDraw({
  totalNeeded,
  onAllPicked,
}: {
  totalNeeded: number;
  onAllPicked: () => void;
}) {
  const [revealCount, setRevealCount] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [particlePos, setParticlePos] = useState<{ x: number; y: number } | null>(null);
  const startY = useRef(0);
  const isDrawing = useRef(false);
  const SWIPE_THRESHOLD = 80;
  const remaining = totalNeeded - revealCount;

  const doDrawCard = useCallback(
    (e?: React.PointerEvent) => {
      if (isDrawing.current || revealCount >= totalNeeded) return;
      isDrawing.current = true;

      if (e) {
        setParticlePos({ x: e.clientX, y: e.clientY - 60 });
        setTimeout(() => setParticlePos(null), 800);
      }

      const newCount = revealCount + 1;
      setRevealCount(newCount);

      // 延遲進入下一階段，讓粒子與牌堆回彈動畫有時間播放完。
      setTimeout(() => {
        isDrawing.current = false;
        if (newCount >= totalNeeded) {
          setTimeout(onAllPicked, 400);
        }
      }, 300);
    },
    [revealCount, totalNeeded, onAllPicked],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (remaining <= 0) return;
      startY.current = e.clientY;
      setSwiping(true);
      setSwipeOffset(0);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [remaining],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!swiping) return;
      setSwipeOffset(Math.max(0, startY.current - e.clientY));
    },
    [swiping],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!swiping) return;
      setSwiping(false);
      if (swipeOffset >= SWIPE_THRESHOLD) doDrawCard(e);
      setSwipeOffset(0);
    },
    [swiping, swipeOffset, doDrawCard],
  );

  const swipeProgress = Math.min(swipeOffset / SWIPE_THRESHOLD, 1);

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="text-center animate-fade-in">
        <p className="text-sm text-[var(--color-text-secondary)]">
          向上滑動抽取{' '}
          <span className="font-bold text-[var(--color-accent-gold)]">{totalNeeded}</span> 張牌
        </p>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          已抽 {revealCount} / {totalNeeded}
        </p>
      </div>

      {remaining > 0 ? (
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex items-center justify-center">
            <svg
              className="pointer-events-none absolute"
              width={160}
              height={160}
              style={{ transform: 'rotate(-90deg)', opacity: swipeProgress > 0 ? 1 : 0, transition: 'opacity 0.2s' }}
            >
              <circle cx={80} cy={80} r={70} fill="none" stroke="rgba(201,168,76,0.15)" strokeWidth={2} />
              <circle
                cx={80} cy={80} r={70} fill="none" stroke="rgba(201,168,76,0.8)"
                strokeWidth={2.5}
                strokeDasharray={2 * Math.PI * 70}
                strokeDashoffset={2 * Math.PI * 70 * (1 - swipeProgress)}
                strokeLinecap="round"
              />
            </svg>
            <motion.div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={() => { setSwiping(false); setSwipeOffset(0); }}
              animate={{ y: swiping ? -swipeOffset * 0.5 : 0, scale: swiping ? 1 + swipeProgress * 0.08 : 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative cursor-grab select-none touch-none active:cursor-grabbing"
            >
              {[2, 1, 0].map((offset) => (
                <div key={offset} className="absolute" style={{ top: -offset * 2, left: offset, zIndex: offset }}>
                  <CardBack width={140} height={224} />
                </div>
              ))}
              <div className="relative" style={{ zIndex: 3 }}>
                <CardBack width={140} height={224} glowing />
                <motion.div
                  className="pointer-events-none absolute inset-0 rounded-xl"
                  animate={{ opacity: swipeProgress > 0 ? swipeProgress * 0.6 : 0 }}
                  style={{ background: 'radial-gradient(circle at 50% 30%, rgba(201,168,76,0.3), transparent 70%)' }}
                />
              </div>
            </motion.div>
          </div>
          <motion.div className="flex flex-col items-center gap-1.5" animate={{ opacity: swiping ? 0.4 : 1 }}>
            <motion.div
              className="text-lg text-[var(--color-accent-gold)]"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >↑</motion.div>
            <p className="text-xs text-[var(--color-text-muted)]">向上滑動抽取第 {revealCount + 1} 張牌</p>
            <button onClick={() => doDrawCard()} className="mt-1 cursor-pointer border-none bg-transparent text-[10px] text-[var(--color-text-muted)] underline opacity-60 hover:opacity-100">
              或點此抽牌
            </button>
          </motion.div>
        </div>
      ) : (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-[var(--color-accent-gold-light)]">
          ✦ 牌已抽齊，準備揭示...
        </motion.p>
      )}

      <AnimatePresence>
        {particlePos && <Particles x={particlePos.x} y={particlePos.y} />}
      </AnimatePresence>
    </div>
  );
}

// ========================================================
// 主元件
// ========================================================
export default function DrawAnimation({ spread, drawnCards, onComplete }: Props) {
  const totalNeeded = drawnCards.length;
  const [phase, setPhase] = useState<'pick' | 'reveal'>('pick');
  const [flipped, setFlipped] = useState<boolean[]>(Array(totalNeeded).fill(false));
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Tailwind v4 的 responsive utilities 在部分 WebView 不穩，這裡用 JS 判斷手機模式。
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleAllPicked = useCallback(() => {
    setPhase('reveal');
    // 逐張翻牌，比一次揭示更符合占卜儀式感，也讓使用者知道流程正在前進。
    for (let i = 0; i < totalNeeded; i++) {
      setTimeout(() => {
        setFlipped((prev) => { const n = [...prev]; n[i] = true; return n; });
        if (i === totalNeeded - 1) setTimeout(onComplete, 1000);
      }, 500 + i * 500);
    }
  }, [totalNeeded, onComplete]);

  if (phase === 'pick') {
    return isMobile
      ? <MobileSwipeDraw totalNeeded={totalNeeded} onAllPicked={handleAllPicked} />
      : <DesktopFan totalNeeded={totalNeeded} onAllPicked={handleAllPicked} />;
  }

  // === 翻牌揭示 ===
  return (
    <div className="flex flex-col items-center gap-8 animate-fade-in">
      <div className="flex flex-wrap justify-center gap-5">
        {drawnCards.map((dc, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.15 }}
            className="flex flex-col items-center gap-2"
          >
            <span className="text-xs text-[var(--color-text-muted)]">{spread.positions[i]?.name}</span>
            <div style={{ perspective: '800px' }}>
              <motion.div
                animate={{ rotateY: flipped[i] ? 180 : 0 }}
                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                style={{ transformStyle: 'preserve-3d', position: 'relative', width: FLIP_W, height: FLIP_H }}
              >
                <div style={{ backfaceVisibility: 'hidden', position: 'absolute', inset: 0 }}>
                  <CardBack width={FLIP_W} height={FLIP_H} glowing />
                </div>
                <div style={{ backfaceVisibility: 'hidden', position: 'absolute', inset: 0, transform: 'rotateY(180deg)' }}>
                  <CardFace drawnCard={dc} className="h-[269px] w-[168px]" />
                </div>
              </motion.div>
            </div>
          </motion.div>
        ))}
      </div>

      {!flipped.every(Boolean) ? (
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div key={i} className="h-2 w-2 rounded-full bg-[var(--color-accent-gold)]"
              animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }} />
          ))}
          <span className="ml-2 text-sm text-[var(--color-text-secondary)]">揭示命運之牌...</span>
        </div>
      ) : (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-[var(--color-accent-gold-light)]">
          ✦ 所有牌已翻開，靜候神諭...
        </motion.p>
      )}
    </div>
  );
}
