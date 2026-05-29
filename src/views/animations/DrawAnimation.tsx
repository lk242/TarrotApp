import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DrawnCard } from '../../models/tarot-card';
import type { Spread } from '../../models/spread';
import type { Locale } from '../../services/i18n/locales/zh-TW';
import CardBack from '../components/tarot/CardBack';
import CardFace from '../components/tarot/CardFace';
import { useI18n } from '../../controllers/useI18n';
import type { SpreadType } from '../../models/spread';

/** SpreadType → positions locale key */
const SPREAD_POS_KEY: Record<SpreadType, 'single' | 'threeCard' | 'celticCross' | 'yesNo'> = {
  single: 'single',
  'three-card': 'threeCard',
  'celtic-cross': 'celticCross',
  'yes-no': 'yesNo',
};

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

/** 水晶光芒粒子爆發 */
function Particles({ x, y }: { x: number; y: number }) {
  const colors = [
    'rgba(139,110,192,0.9)',
    'rgba(167,139,250,0.7)',
    'rgba(96,165,250,0.7)',
    'rgba(192,132,252,0.8)',
    'rgba(129,140,248,0.7)',
  ];
  return (
    <div className="pointer-events-none fixed z-[999]" style={{ left: x, top: y }}>
      {PARTICLE_PATTERN.map(({ px, py, size }, i) => {
        const color = colors[i % colors.length];
        return (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: size,
              height: size,
              background: `radial-gradient(circle, ${color}, rgba(255,255,255,0.4))`,
              boxShadow: `0 0 8px ${color}`,
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
  t,
}: {
  totalNeeded: number;
  onAllPicked: () => void;
  t: Locale;
}) {
  const [picked, setPicked] = useState<Set<number>>(new Set());
  /** 正在飛起的牌 index → 動畫階段 */
  const [flying, setFlying] = useState<Map<number, 'rising' | 'exiting'>>(new Map());
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

  // 限制桌機扇形寬度，避免寬螢幕時半徑過大造成牌組被推到畫面下方。
  const stageWidth = Math.min(containerWidth, 1100);
  const cardW = Math.max(105, Math.min(150, stageWidth * 0.14));
  const cardH = Math.round(cardW * 1.6);
  const fanAngle = 115;
  const radius = Math.max(340, Math.min(520, stageWidth * 0.48, containerWidth * 0.45));
  const areaHeight = Math.round(cardH + radius * 0.28 + 120);
  const centerX = stageWidth / 2;
  const fanTop = 24;

  const handlePick = useCallback(
    (fanIndex: number, e: React.MouseEvent) => {
      if (picked.has(fanIndex) || flying.has(fanIndex) || revealCount >= totalNeeded) return;

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setParticlePos({ x: rect.left + rect.width / 2, y: rect.top });
      setTimeout(() => setParticlePos(null), 800);

      // 階段 1：牌先往上飛起（rising）
      setFlying((prev) => new Map(prev).set(fanIndex, 'rising'));

      // 階段 2：飛到頂部後縮小消失（exiting）+ 附近牌留出空隙
      setTimeout(() => {
        setFlying((prev) => new Map(prev).set(fanIndex, 'exiting'));

        // 附近牌留出被抽走的空隙
        const newPicked = new Set(picked);
        for (let d = -2; d <= 2; d++) {
          const n = fanIndex + d;
          if (n >= 0 && n < FAN_TOTAL) newPicked.add(n);
        }
        setPicked(newPicked);

        const newCount = revealCount + 1;
        setRevealCount(newCount);

        // 階段 3：完全消失後清除飛行狀態
        setTimeout(() => {
          setFlying((prev) => { const m = new Map(prev); m.delete(fanIndex); return m; });
          if (newCount >= totalNeeded) {
            setTimeout(onAllPicked, 400);
          }
        }, 350);
      }, 450);
    },
    [picked, flying, revealCount, totalNeeded, onAllPicked],
  );

  return (
    <div ref={containerRef} className="flex w-full flex-col items-center gap-0">
      <div className="mb-1 text-center animate-fade-in">
        <p className="text-base text-[var(--color-text-secondary)]">
          {t.reading.drawDesktopHint.replace('{count}', String(totalNeeded))}
        </p>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {t.reading.drawDesktopProgress.replace('{current}', String(revealCount)).replace('{total}', String(totalNeeded))}
        </p>
      </div>

      <div className="relative w-full overflow-visible" style={{ maxWidth: stageWidth, height: areaHeight }}>
        {Array.from({ length: FAN_TOTAL }, (_, i) => {
          const isPicked = picked.has(i);
          const isHovered = hoveredIndex === i;
          const startAngle = -fanAngle / 2;
          const angle = startAngle + (i / (FAN_TOTAL - 1)) * fanAngle;
          const rad = (angle * Math.PI) / 180;
          const bottomX = centerX + Math.sin(rad) * radius;
          const bottomY = fanTop + cardH + (1 - Math.cos(rad)) * radius * 0.42;
          const x = bottomX - cardW / 2;
          const y = bottomY - cardH;

          const flyState = flying.get(i);
          const isFlying = !!flyState;

          // 飛起動畫的 transform
          let cardTransform: string;
          let cardOpacity: number;
          let cardFilter: string;
          let cardZIndex: number;
          let cardTransition: string;

          if (flyState === 'rising') {
            // 階段 1：牌從扇形中飛起，往上方移動 + 放大 + 旋轉歸零
            cardTransform = `rotate(0deg) translateY(-${areaHeight + 40}px) scale(1.15)`;
            cardOpacity = 1;
            cardFilter = 'drop-shadow(0 0 30px rgba(139,110,192,0.8)) drop-shadow(0 8px 24px rgba(0,0,0,0.3)) brightness(1.15)';
            cardZIndex = 500;
            cardTransition = 'transform 0.45s cubic-bezier(0.2, 0.8, 0.3, 1), opacity 0.3s, filter 0.3s';
          } else if (flyState === 'exiting') {
            // 階段 2：縮小淡出
            cardTransform = `rotate(0deg) translateY(-${areaHeight + 80}px) scale(0.6)`;
            cardOpacity = 0;
            cardFilter = 'drop-shadow(0 0 40px rgba(167,139,250,0.6)) brightness(1.3)';
            cardZIndex = 500;
            cardTransition = 'transform 0.35s ease-in, opacity 0.3s ease-in, filter 0.3s';
          } else if (isPicked) {
            // 已被抽走的空隙牌
            cardTransform = `rotate(${angle}deg) translateY(-10px) scale(0.85)`;
            cardOpacity = 0;
            cardFilter = 'none';
            cardZIndex = i + 1;
            cardTransition = 'transform 0.4s ease-out, opacity 0.5s ease-out';
          } else {
            // 普通牌
            cardTransform = `rotate(${angle}deg) translateY(${isHovered ? '-22px' : '0'}) scale(${isHovered ? 1.08 : 1})`;
            cardOpacity = entered ? 1 : 0;
            cardFilter = isHovered
              ? 'drop-shadow(0 0 20px rgba(139,110,192,0.7)) drop-shadow(0 0 40px rgba(167,139,250,0.3)) brightness(1.1)'
              : 'none';
            cardZIndex = isHovered ? 200 : i + 1;
            cardTransition = entered
              ? 'transform 0.2s ease-out, opacity 0.3s, filter 0.15s'
              : `opacity 0.3s ${i * 15}ms, transform 0.4s ${i * 15}ms ease-out`;
          }

          return (
            <div
              key={i}
              className="absolute origin-bottom"
              style={{
                left: x,
                top: y,
                zIndex: cardZIndex,
                cursor: isPicked || isFlying ? 'default' : 'pointer',
                transform: cardTransform,
                opacity: cardOpacity,
                filter: cardFilter,
                transition: cardTransition,
                pointerEvents: isPicked || isFlying ? 'none' : 'auto',
              }}
              onMouseEnter={() => !isPicked && !isFlying && setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={(e) => !isPicked && !isFlying && handlePick(i, e)}
            >
              <CardBack width={cardW} height={cardH} glowing={(isHovered && !isPicked) || isFlying} />
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
  t,
}: {
  totalNeeded: number;
  onAllPicked: () => void;
  t: Locale;
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
          {t.reading.drawMobileHint.replace('{count}', String(totalNeeded))}
        </p>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          {t.reading.drawMobileProgress.replace('{current}', String(revealCount)).replace('{total}', String(totalNeeded))}
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
              <circle cx={80} cy={80} r={70} fill="none" stroke="rgba(139,110,192,0.15)" strokeWidth={2} />
              <circle
                cx={80} cy={80} r={70} fill="none" stroke="rgba(139,110,192,0.8)"
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
              {/* 牌堆隨抽取視覺減少：底層牌數量 = min(remaining-1, 2) */}
              {Array.from({ length: Math.min(remaining - 1, 2) }, (_, i) => Math.min(remaining - 1, 2) - i).map((offset) => (
                <motion.div
                  key={`stack-${offset}`}
                  className="absolute"
                  style={{ top: -offset * 2, left: offset, zIndex: offset }}
                  initial={false}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <CardBack width={140} height={224} />
                </motion.div>
              ))}
              <div className="relative" style={{ zIndex: 3 }}>
                <CardBack width={140} height={224} glowing />
                <motion.div
                  className="pointer-events-none absolute inset-0 rounded-xl"
                  animate={{ opacity: swipeProgress > 0 ? swipeProgress * 0.6 : 0 }}
                  style={{ background: 'radial-gradient(circle at 50% 30%, rgba(139,110,192,0.3), transparent 70%)' }}
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
            <p className="text-xs text-[var(--color-text-muted)]">
              {t.reading.drawMobileSwipeNth.replace('{nth}', String(revealCount + 1))}
            </p>
            <button onClick={() => doDrawCard()} className="mt-1 cursor-pointer border-none bg-transparent text-[10px] text-[var(--color-text-muted)] underline opacity-60 hover:opacity-100">
              {t.reading.drawMobileTapFallback}
            </button>
          </motion.div>
        </div>
      ) : (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-[var(--color-accent-gold-light)]">
          {t.reading.drawMobileAllDrawn}
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
  const { t } = useI18n();
  const totalNeeded = drawnCards.length;
  const [phase, setPhase] = useState<'pick' | 'reveal'>('pick');
  const [flipped, setFlipped] = useState<boolean[]>(Array(totalNeeded).fill(false));
  const [isMobile, setIsMobile] = useState(false);
  const posKey = SPREAD_POS_KEY[spread.type] ?? 'single';
  const positionNames = (t.positions as Record<string, string[]>)[posKey] ?? [];

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
      ? <MobileSwipeDraw totalNeeded={totalNeeded} onAllPicked={handleAllPicked} t={t} />
      : <DesktopFan totalNeeded={totalNeeded} onAllPicked={handleAllPicked} t={t} />;
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
            <span className="text-xs text-[var(--color-text-muted)]">{positionNames[i] ?? spread.positions[i]?.name}</span>
            <div style={{ perspective: '800px' }} className="relative">
              {/* 光芒綻放效果 — 翻牌瞬間擴散 */}
              <AnimatePresence>
                {flipped[i] && (
                  <motion.div
                    initial={{ opacity: 0.8, scale: 0.5 }}
                    animate={{ opacity: 0, scale: 2.2 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="pointer-events-none absolute inset-0 z-10"
                    style={{
                      background: 'radial-gradient(circle, rgba(167,139,250,0.5), rgba(96,165,250,0.2), transparent 70%)',
                      borderRadius: '50%',
                    }}
                  />
                )}
              </AnimatePresence>
              <motion.div
                animate={{ rotateY: flipped[i] ? 180 : 0 }}
                transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
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
          <span className="ml-2 text-sm text-[var(--color-text-secondary)]">{t.reading.revealingCards}</span>
        </div>
      ) : (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-[var(--color-accent-gold-light)]">
          {t.reading.revealComplete}
        </motion.p>
      )}
    </div>
  );
}
