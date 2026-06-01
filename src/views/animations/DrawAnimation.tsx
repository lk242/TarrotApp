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

const CARD_TOTAL = 78; // 完整 78 張塔羅牌
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
// 桌面端：弧形扇選牌（78 張 + 確認/重選）
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
  /** 當前待確認（lifted）的牌 index */
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [particlePos, setParticlePos] = useState<{ x: number; y: number } | null>(null);
  const [entered, setEntered] = useState(false);
  const [containerWidth, setContainerWidth] = useState(1200);
  /** 牌堆旋轉角度（左右拖動）*/
  const [rotation, setRotation] = useState(0);
  /** 是否顯示滑動引導提示 */
  const [showHint, setShowHint] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragMoved = useRef(false);
  const lastX = useRef(0);
  const velocity = useRef(0);
  const animFrame = useRef<number>(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setContainerWidth(el.clientWidth);
    const ro = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 入場動畫延遲結束後標記
  useEffect(() => {
    const timer = setTimeout(() => setEntered(true), 600);
    return () => clearTimeout(timer);
  }, []);

  // 教學引導：入場後自動輕微搖動牌堆 + 顯示提示
  useEffect(() => {
    if (!entered) return;
    let cancelled = false;
    let startTime = 0;
    let raf = 0;
    const animate = (t: number) => {
      if (cancelled || !showHint) return;
      if (!startTime) startTime = t;
      const elapsed = t - startTime;
      // 1.6s 內做兩次完整左右搖擺（左→右→左→0）
      if (elapsed < 1800) {
        const progress = elapsed / 1800;
        // sin 波形，振幅 12 度，逐漸衰減
        const amp = 12 * (1 - progress);
        const r = Math.sin(progress * Math.PI * 4) * amp;
        setRotation(r);
        raf = requestAnimationFrame(animate);
      } else {
        setRotation(0);
      }
    };
    const startTimer = setTimeout(() => { raf = requestAnimationFrame(animate); }, 400);
    return () => {
      cancelled = true;
      clearTimeout(startTimer);
      cancelAnimationFrame(raf);
    };
  }, [entered, showHint]);

  // 自動隱藏提示
  useEffect(() => {
    if (!showHint) return;
    const timer = setTimeout(() => setShowHint(false), 4000);
    return () => clearTimeout(timer);
  }, [showHint]);

  // 桌面版：完整 78 張圓形，圓心在畫面底部下方
  const stageWidth = containerWidth;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const availH = vh - 100;
  const cardW = Math.max(110, Math.min(150, stageWidth * 0.085));
  const cardH = Math.round(cardW * 1.58);
  // 半徑：讓弧形剛好撐滿畫面寬度（兩端落在螢幕左右邊緣）
  // sin(70°)=0.94，所以 radius = stageWidth/2 / 0.94
  const halfVisibleAngle = 70; // 可視半角
  const halfRad = (halfVisibleAngle * Math.PI) / 180;
  const radius = (stageWidth / 2) / Math.sin(halfRad);
  const areaHeight = availH;
  const centerX = stageWidth / 2;
  // 圓心在容器正下方，讓頂端牌（normAngle=0）出現在畫面頂部 cardH+10 處
  const cy = cardH + 10 + radius;

  // 慣性滾動
  useEffect(() => {
    let running = true;
    const tick = () => {
      if (!running) return;
      if (!isDragging.current && Math.abs(velocity.current) > 0.05) {
        setRotation((r) => r + velocity.current);
        velocity.current *= 0.94;
      }
      animFrame.current = requestAnimationFrame(tick);
    };
    animFrame.current = requestAnimationFrame(tick);
    return () => { running = false; cancelAnimationFrame(animFrame.current); };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    dragMoved.current = false;
    lastX.current = e.clientX;
    velocity.current = 0;
    setPendingIndex(null);
    setShowHint(false);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastX.current;
    if (Math.abs(dx) > 3) dragMoved.current = true;
    // x 軸拖動轉旋轉角度
    const angleDelta = (dx / radius) * (180 / Math.PI);
    velocity.current = angleDelta;
    setRotation((r) => r + angleDelta);
    lastX.current = e.clientX;
  }, [radius]);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleCardClick = useCallback(
    (fanIndex: number) => {
      if (dragMoved.current) return; // 拖動中不觸發
      if (picked.has(fanIndex) || flying.has(fanIndex) || revealCount >= totalNeeded) return;
      setPendingIndex(fanIndex);
    },
    [picked, flying, revealCount, totalNeeded],
  );

  const handleConfirm = useCallback(
    (fanIndex: number, e: React.MouseEvent) => {
      e.stopPropagation();
      if (picked.has(fanIndex) || flying.has(fanIndex) || revealCount >= totalNeeded) return;
      setPendingIndex(null);

      const rect = (e.currentTarget as HTMLElement).closest('[data-fan-card]')?.getBoundingClientRect();
      if (rect) {
        setParticlePos({ x: rect.left + rect.width / 2, y: rect.top });
        setTimeout(() => setParticlePos(null), 800);
      }

      // 階段 1：牌先往上飛起（rising）
      setFlying((prev) => new Map(prev).set(fanIndex, 'rising'));

      // 階段 2：飛到頂部後縮小消失（exiting）+ 附近牌留出空隙
      setTimeout(() => {
        setFlying((prev) => new Map(prev).set(fanIndex, 'exiting'));

        const newPicked = new Set(picked);
        for (let d = -1; d <= 1; d++) {
          const n = fanIndex + d;
          if (n >= 0 && n < CARD_TOTAL) newPicked.add(n);
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

  const handleCancel = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setPendingIndex(null);
  }, []);

  return (
    <div ref={containerRef} className="flex w-full flex-col items-center gap-0 select-none">
      <div className="mb-1 text-center animate-fade-in">
        <p className="text-base text-[var(--color-text-secondary)]">
          {t.reading.drawDesktopHint.replace('{count}', String(totalNeeded))}
        </p>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {t.reading.drawDesktopProgress.replace('{current}', String(revealCount)).replace('{total}', String(totalNeeded))}
        </p>
      </div>

      <div
        className="relative w-full overflow-visible touch-none"
        style={{ width: stageWidth, height: areaHeight, cursor: isDragging.current ? 'grabbing' : 'grab' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* 教學引導：手指 + 雙向箭頭 */}
        <AnimatePresence>
          {showHint && entered && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="pointer-events-none absolute left-1/2 z-[250] flex -translate-x-1/2 flex-col items-center gap-3"
              style={{ top: cardH + 40 }}
            >
              {/* 雙向箭頭 */}
              <svg width="80" height="14" viewBox="0 0 80 14" fill="none" className="text-[var(--color-accent-gold)]">
                <path d="M6 7 L14 1 M6 7 L14 13 M6 7 L74 7 M74 7 L66 1 M74 7 L66 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {/* 手指（左右滑動） */}
              <motion.svg
                width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
                className="text-[var(--color-accent-gold)]"
                style={{ filter: 'drop-shadow(0 0 8px rgba(139,110,192,0.5))' }}
                animate={{ x: [-22, 22, -22] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              >
                {/* 手指：食指向上、其他手指收起 */}
                <path d="M9 11V6a2 2 0 0 1 4 0v5" />
                <path d="M13 11V4a2 2 0 0 1 4 0v7" />
                <path d="M17 11V6a2 2 0 0 1 4 0v8a7 7 0 0 1-7 7h-2a8 8 0 0 1-8-8 2 2 0 0 1 4 0" />
              </motion.svg>
              <div className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-card)]/80 px-3 py-1.5 backdrop-blur-md shadow-[var(--shadow-card)]">
                <span className="text-[11px] font-medium text-[var(--color-text-secondary)] whitespace-nowrap">
                  {t.reading.drawSwipeHint ?? '左右拖動瀏覽 78 張牌'}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {Array.from({ length: CARD_TOTAL }, (_, i) => {
          const isPicked = picked.has(i);
          const isHovered = hoveredIndex === i;
          const isPending = pendingIndex === i;
          // 完整圓：每張牌均分 360° + 拖動旋轉，0° = 圓周頂端（畫面上方）
          const baseAngle = (i / CARD_TOTAL) * 360 - 180;
          const angle = baseAngle + rotation;
          // 把角度標準化到 -180~180
          let normAngle = angle % 360;
          if (normAngle > 180) normAngle -= 360;
          if (normAngle < -180) normAngle += 360;
          // 只渲染可見範圍的牌
          const visible = Math.abs(normAngle) < halfVisibleAngle + 5;
          if (!visible && !isPending && !flying.has(i)) return null;
          const rad = (normAngle * Math.PI) / 180;
          // 牌底落在圓周上（圓心在下方 cy），牌往上延伸
          const bottomX = centerX + Math.sin(rad) * radius;
          const bottomY = cy - Math.cos(rad) * radius;
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
            cardTransform = `rotate(0deg) translateY(-${areaHeight + 40}px) scale(1.15)`;
            cardOpacity = 1;
            cardFilter = 'drop-shadow(0 0 30px rgba(139,110,192,0.8)) drop-shadow(0 8px 24px rgba(0,0,0,0.3)) brightness(1.15)';
            cardZIndex = 500;
            cardTransition = 'transform 0.45s cubic-bezier(0.2, 0.8, 0.3, 1), opacity 0.3s, filter 0.3s';
          } else if (flyState === 'exiting') {
            cardTransform = `rotate(0deg) translateY(-${areaHeight + 80}px) scale(0.6)`;
            cardOpacity = 0;
            cardFilter = 'drop-shadow(0 0 40px rgba(167,139,250,0.6)) brightness(1.3)';
            cardZIndex = 500;
            cardTransition = 'transform 0.35s ease-in, opacity 0.3s ease-in, filter 0.3s';
          } else if (isPicked) {
            cardTransform = `rotate(${normAngle}deg) translateY(-10px) scale(0.85)`;
            cardOpacity = 0;
            cardFilter = 'none';
            cardZIndex = i + 1;
            cardTransition = 'transform 0.4s ease-out, opacity 0.5s ease-out';
          } else if (isPending) {
            // 待確認：原位變暗（modal 中央會顯示放大版）
            cardTransform = `rotate(${normAngle}deg) translateY(0) scale(1)`;
            cardOpacity = 0.25;
            cardFilter = 'none';
            cardZIndex = i + 1;
            cardTransition = 'opacity 0.3s';
          } else {
            // 普通牌
            cardTransform = `rotate(${normAngle}deg) translateY(${isHovered ? '-18px' : '0'}) scale(${isHovered ? 1.08 : 1})`;
            cardOpacity = entered ? 1 : 0;
            cardFilter = isHovered
              ? 'drop-shadow(0 0 18px rgba(139,110,192,0.7)) brightness(1.1)'
              : 'none';
            // 越靠近頂端 z-index 越高
            const distanceFromTop = Math.abs(normAngle);
            cardZIndex = isHovered ? 200 : Math.round(200 - distanceFromTop);
            cardTransition = entered
              ? 'transform 0.2s ease-out, opacity 0.3s, filter 0.15s'
              : 'opacity 0.4s, transform 0.4s ease-out';
          }

          return (
            <div
              key={i}
              data-fan-card
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
              onMouseEnter={() => !isPicked && !isFlying && !isPending && setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => !isPicked && !isFlying && handleCardClick(i)}
            >
              <CardBack width={cardW} height={cardH} glowing={(isHovered && !isPicked) || isFlying || isPending} />
              {/* 牌號碼：每張都顯示 */}
              {!isPicked && !isFlying && (
                <span
                  className="pointer-events-none absolute left-1/2"
                  style={{
                    bottom: -22,
                    fontSize: (isHovered || isPending) ? 13 : 10,
                    fontWeight: 700,
                    color: (isHovered || isPending) ? 'var(--color-accent-gold)' : 'var(--color-text-muted)',
                    opacity: (isHovered || isPending) ? 1 : 0.55,
                    transition: 'color 0.15s, opacity 0.15s',
                    transform: `translateX(-50%) rotate(${-normAngle}deg)`,
                  }}
                >
                  {i + 1}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal overlay：選中的牌放大居中顯示 */}
      <AnimatePresence>
        {pendingIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[400] flex flex-col items-center justify-center"
            style={{ background: 'rgba(8, 8, 16, 0.75)', backdropFilter: 'blur(8px)' }}
            onClick={(e) => { e.stopPropagation(); setPendingIndex(null); }}
          >
            <motion.div
              initial={{ scale: 0.6, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.2, 0.8, 0.3, 1] }}
              className="relative"
              onClick={(e) => e.stopPropagation()}
              style={{
                filter: 'drop-shadow(0 0 40px rgba(139,110,192,0.8)) drop-shadow(0 12px 32px rgba(0,0,0,0.5))',
              }}
            >
              <CardBack width={cardW * 2.2} height={cardH * 2.2} glowing />
              <span
                className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-base font-bold text-[var(--color-accent-gold)]"
                style={{ bottom: -32 }}
              >
                #{pendingIndex + 1}
              </span>
            </motion.div>
            {/* 確認 / 取消按鈕 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-16 flex gap-5"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => handleConfirm(pendingIndex, e)}
                className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-[var(--color-accent-gold)] shadow-xl transition-transform hover:scale-110"
                title={t.confirm}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
              <button
                onClick={handleCancel}
                className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border border-[var(--color-border)] bg-white/10 shadow-xl backdrop-blur transition-transform hover:scale-110 hover:bg-white/20"
                title={t.cancel}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {particlePos && <Particles x={particlePos.x} y={particlePos.y} />}
      </AnimatePresence>
    </div>
  );
}

// ========================================================
// 手機端：全螢幕圓形轉盤選牌
// ========================================================
function MobileWheelDraw({
  totalNeeded,
  onAllPicked,
  t,
}: {
  totalNeeded: number;
  onAllPicked: () => void;
  t: Locale;
}) {
  const [revealCount, setRevealCount] = useState(0);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const [vw, setVw] = useState(375);
  const [vh, setVh] = useState(700);
  const [zoomed, setZoomed] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const isDragging = useRef(false);
  const dragMoved = useRef(false);
  const lastY = useRef(0);
  const velocity = useRef(0);
  const animFrame = useRef<number>(0);

  useEffect(() => {
    const update = () => { setVw(window.innerWidth); setVh(window.innerHeight); };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // 鎖定 body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // 慣性滾動
  useEffect(() => {
    let running = true;
    const tick = () => {
      if (!running) return;
      if (!isDragging.current && Math.abs(velocity.current) > 0.12) {
        setRotation((r) => r + velocity.current);
        velocity.current *= 0.95;
      }
      animFrame.current = requestAnimationFrame(tick);
    };
    animFrame.current = requestAnimationFrame(tick);
    return () => { running = false; cancelAnimationFrame(animFrame.current); };
  }, []);

  // 教學引導：入場後自動上下搖動
  useEffect(() => {
    if (!showHint) return;
    let cancelled = false;
    let startTime = 0;
    let raf = 0;
    const animate = (t: number) => {
      if (cancelled || !showHint) return;
      if (!startTime) startTime = t;
      const elapsed = t - startTime;
      if (elapsed < 1800) {
        const progress = elapsed / 1800;
        const amp = 14 * (1 - progress);
        const r = Math.sin(progress * Math.PI * 4) * amp;
        setRotation(r);
        raf = requestAnimationFrame(animate);
      } else {
        setRotation(0);
      }
    };
    const startTimer = setTimeout(() => { raf = requestAnimationFrame(animate); }, 600);
    const hideTimer = setTimeout(() => setShowHint(false), 4000);
    return () => {
      cancelled = true;
      clearTimeout(startTimer);
      clearTimeout(hideTimer);
      cancelAnimationFrame(raf);
    };
  }, [showHint]);

  const cardW = 52;
  const cardH = Math.round(cardW * 1.58);
  // 半徑：讓弧形佔螢幕大部分寬度，曲線適中
  const R = Math.max(vw * 0.95, 360);
  // 輪心在螢幕右邊外約 40px，弧形最左端約在 x=50
  const cx = vw + 40;
  const cy = vh / 2;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    dragMoved.current = false;
    lastY.current = e.clientY;
    velocity.current = 0;
    setZoomed(true);
    setShowHint(false);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dy = e.clientY - lastY.current;
    if (Math.abs(dy) > 3) dragMoved.current = true;
    // 將 y 軸拖動轉換為旋轉角度
    const angleDelta = (dy / R) * (180 / Math.PI);
    velocity.current = angleDelta;
    setRotation((r) => r + angleDelta);
    lastY.current = e.clientY;
  }, [R]);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
    // 慣性結束後再縮回（如果速度很小就直接縮）
    if (Math.abs(velocity.current) < 1) {
      setZoomed(false);
    } else {
      setTimeout(() => setZoomed(false), 800);
    }
  }, []);

  const handleCardTap = useCallback((index: number) => {
    if (dragMoved.current) return;
    if (picked.has(index) || revealCount >= totalNeeded) return;
    setPendingIndex(index);
  }, [picked, revealCount, totalNeeded]);

  const handleConfirm = useCallback((index: number) => {
    if (picked.has(index) || revealCount >= totalNeeded) return;
    setPendingIndex(null);

    const newPicked = new Set(picked);
    newPicked.add(index);
    setPicked(newPicked);

    const newCount = revealCount + 1;
    setRevealCount(newCount);

    if (newCount >= totalNeeded) {
      setTimeout(onAllPicked, 600);
    }
  }, [picked, revealCount, totalNeeded, onAllPicked]);

  const handleCancel = useCallback(() => {
    setPendingIndex(null);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[60] touch-none select-none"
      style={{ background: 'var(--color-bg-primary)' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* 頂部資訊列 */}
      <div className="absolute top-0 left-0 right-0 z-10 pt-[env(safe-area-inset-top)] px-5 pb-2"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}>
        <p className="text-center text-sm font-medium text-[var(--color-text-primary)]">
          {t.reading.drawMobileHint.replace('{count}', String(totalNeeded))}
        </p>
        <p className="text-center text-xs text-[var(--color-text-muted)] mt-1">
          {t.reading.drawMobileProgress.replace('{current}', String(revealCount)).replace('{total}', String(totalNeeded))}
        </p>
      </div>

      {/* 教學引導：手指 + 雙向箭頭（上下） */}
      <AnimatePresence>
        {showHint && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="pointer-events-none absolute z-[150] flex flex-row items-center gap-3"
            style={{ left: 20, top: '50%', transform: 'translateY(-50%)' }}
          >
            {/* 雙向上下箭頭 */}
            <svg width="14" height="80" viewBox="0 0 14 80" fill="none" className="text-[var(--color-accent-gold)]">
              <path d="M7 6 L1 14 M7 6 L13 14 M7 6 L7 74 M7 74 L1 66 M7 74 L13 66" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="flex flex-col items-center gap-2">
              {/* 手指（上下滑動） */}
              <motion.svg
                width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
                className="text-[var(--color-accent-gold)]"
                style={{ filter: 'drop-shadow(0 0 8px rgba(139,110,192,0.5))' }}
                animate={{ y: [-22, 22, -22] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              >
                <path d="M9 11V6a2 2 0 0 1 4 0v5" />
                <path d="M13 11V4a2 2 0 0 1 4 0v7" />
                <path d="M17 11V6a2 2 0 0 1 4 0v8a7 7 0 0 1-7 7h-2a8 8 0 0 1-8-8 2 2 0 0 1 4 0" />
              </motion.svg>
              <div className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-card)]/85 px-3 py-1.5 backdrop-blur-md shadow-lg">
                <span className="text-[11px] font-medium text-[var(--color-text-secondary)] whitespace-nowrap">
                  {t.reading.drawSwipeHint ?? '滑動瀏覽 78 張牌'}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 牌輪容器 — 拖動時放大（以弧形左緣為原點，牌往內側展開） */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: zoomed ? 'scale(1.3)' : 'scale(1)',
          transformOrigin: `${Math.round(cx - R)}px ${cy}px`,
          transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {Array.from({ length: CARD_TOTAL }, (_, i) => {
          const isPicked = picked.has(i);
          const isPending = pendingIndex === i;
          const baseAngle = (i / CARD_TOTAL) * 360;
          const angle = baseAngle + rotation;
          const rad = (angle * Math.PI) / 180;
          const px = cx + Math.cos(rad) * R;
          const py = cy + Math.sin(rad) * R;

          // 只渲染螢幕內的牌（含邊緣 buffer，放大時多留空間）
          const buf = zoomed ? cardW * 3 : cardW;
          if (px < -buf || px > vw + buf * 2 || py < -cardH * 2 || py > vh + cardH * 2) {
            if (!isPending) return null;
          }

          return (
            <div
              key={i}
              data-wheel-card
              className="absolute"
              style={{
                left: px - cardW / 2,
                top: py - cardH / 2,
                width: cardW,
                height: cardH,
                transform: `rotate(${angle + 90}deg)`,
                opacity: isPicked ? 0 : (isPending ? 0.25 : 1),
                transition: 'opacity 0.3s',
                pointerEvents: isPicked ? 'none' : 'auto',
                zIndex: 1,
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleCardTap(i);
              }}
            >
              <CardBack width={cardW} height={cardH} />
            </div>
          );
        })}
      </div>

      {/* 牌號碼 — 獨立圖層，自己做縮放（以畫面左側為原點，數字不會飛出去） */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          transform: zoomed ? 'scale(1.3)' : 'scale(1)',
          transformOrigin: `0px ${cy}px`,
          transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {Array.from({ length: CARD_TOTAL }, (_, i) => {
          const isPicked = picked.has(i);
          if (isPicked) return null;
          const baseAngle = (i / CARD_TOTAL) * 360;
          const angle = baseAngle + rotation;
          const rad = (angle * Math.PI) / 180;
          const cardPx = cx + Math.cos(rad) * R;
          const cardPy = cy + Math.sin(rad) * R;

          // 數字在牌的內側（朝圓心方向）
          const inwardOffset = cardW * 0.9 + 16;
          const numPx = cardPx - Math.cos(rad) * inwardOffset;
          const numPy = cardPy - Math.sin(rad) * inwardOffset;

          // 螢幕外不渲染
          if (numPx < -40 || numPx > vw + 40 || numPy < -40 || numPy > vh + 40) return null;

          return (
            <span
              key={`num-${i}`}
              style={{
                position: 'absolute',
                left: numPx,
                top: numPy,
                transform: 'translate(-50%, -50%)',
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--color-text-muted)',
                opacity: 0.7,
              }}
            >
              {i + 1}
            </span>
          );
        })}
      </div>

      {/* Modal overlay：選中的牌放大居中 */}
      <AnimatePresence>
        {pendingIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 z-[200] flex flex-col items-center justify-center"
            style={{ background: 'rgba(8, 8, 16, 0.78)', backdropFilter: 'blur(8px)' }}
            onClick={(e) => { e.stopPropagation(); handleCancel(); }}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.32, ease: [0.2, 0.8, 0.3, 1] }}
              className="relative"
              onClick={(e) => e.stopPropagation()}
              style={{
                filter: 'drop-shadow(0 0 40px rgba(139,110,192,0.8)) drop-shadow(0 12px 32px rgba(0,0,0,0.5))',
              }}
            >
              <CardBack width={Math.min(vw * 0.6, 220)} height={Math.min(vw * 0.6, 220) * 1.58} glowing />
              <span
                className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-base font-bold text-[var(--color-accent-gold)]"
                style={{ bottom: -32 }}
              >
                #{pendingIndex + 1}
              </span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.12 }}
              className="mt-16 flex gap-5"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => { e.stopPropagation(); handleConfirm(pendingIndex); }}
                className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-[var(--color-accent-gold)] shadow-xl"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleCancel(); }}
                className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border border-[var(--color-border)] bg-white/10 shadow-xl backdrop-blur"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
              </button>
            </motion.div>
          </motion.div>
        )}
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
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleAllPicked = useCallback(() => {
    setPhase('reveal');
    for (let i = 0; i < totalNeeded; i++) {
      setTimeout(() => {
        setFlipped((prev) => { const n = [...prev]; n[i] = true; return n; });
        if (i === totalNeeded - 1) setTimeout(onComplete, 1000);
      }, 500 + i * 500);
    }
  }, [totalNeeded, onComplete]);

  if (phase === 'pick') {
    return isMobile
      ? <MobileWheelDraw totalNeeded={totalNeeded} onAllPicked={handleAllPicked} t={t} />
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
