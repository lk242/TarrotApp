import { Link, useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { useRef, useCallback } from 'react';
import { SPREADS } from '../../models/spread';
import type { SpreadType } from '../../models/spread';
import { useI18n } from '../../controllers/useI18n';

const spreadList = Object.values(SPREADS);

/** 牌陣對應的背景圖與透明度（暗圖需更高透明度） */
const SPREAD_CONFIG: Record<number, { image: string; opacity: number; hoverOpacity: number }> = {
  1:  { image: '/images/theme/spread-single.webp', opacity: 0.4, hoverOpacity: 0.55 },
  3:  { image: '/images/theme/spread-three.webp',  opacity: 0.4, hoverOpacity: 0.55 },
  10: { image: '/images/theme/spread-celtic.webp',  opacity: 0.7, hoverOpacity: 0.85 },
};

export default function HomePage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleLogoTap = useCallback(() => {
    tapCountRef.current += 1;
    clearTimeout(tapTimerRef.current);
    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      navigate('/admin');
      return;
    }
    tapTimerRef.current = setTimeout(() => { tapCountRef.current = 0; }, 1500);
  }, [navigate]);

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-20">
      {/* ===== Hero 區：主視覺大圖 ===== */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        className="relative mb-12 w-full max-w-4xl overflow-hidden rounded-2xl"
      >
        <img
          src="/images/theme/hero.webp"
          alt="神秘塔羅"
          className="block w-full"
          style={{ aspectRatio: '21/9', objectFit: 'cover' }}
        />
        {/* 底部漸層融合 */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, transparent 40%, var(--color-bg-primary) 100%)',
          }}
        />
      </motion.div>

      {/* ===== 標題區 ===== */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="mb-14 text-center"
      >
        <img
          src="/images/theme/logo.webp"
          alt=""
          className="mx-auto mb-5 h-16 w-16 animate-candle cursor-default select-none"
          onClick={handleLogoTap}
          draggable={false}
        />
        <h1 className="mb-3 text-4xl font-bold tracking-[0.15em] text-[var(--color-accent-gold)]" style={{ fontVariant: 'small-caps' }}>
          {t.appName}
        </h1>
        {/* 裝飾分隔線 */}
        <img
          src="/images/theme/divider.webp"
          alt=""
          className="mx-auto my-4 h-6 w-auto opacity-70"
        />
        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-[var(--color-text-secondary)]">
          {t.home.subtitle}
        </p>
      </motion.div>

      {/* ===== 牌陣選擇 ===== */}
      <div className="grid w-full max-w-3xl gap-6 md:grid-cols-3">
        {spreadList.map((spread, i) => (
          <SpreadCard key={spread.type} spread={spread} delay={0.5 + i * 0.15} t={t} />
        ))}
      </div>
    </div>
  );
}

/** spread.type → i18n key 映射 */
const SPREAD_I18N_KEY: Record<string, 'single' | 'threeCard' | 'celticCross'> = {
  single: 'single',
  'three-card': 'threeCard',
  'celtic-cross': 'celticCross',
};

function SpreadCard({ spread, delay, t }: { spread: (typeof SPREADS)[SpreadType]; delay: number; t: import('../../services/i18n').Locale }) {
  const config = SPREAD_CONFIG[spread.cardCount] || { image: '', opacity: 0.4, hoverOpacity: 0.55 };
  const i18nKey = SPREAD_I18N_KEY[spread.type] || 'single';
  const spreadT = t.spreads[i18nKey];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <Link
        to={`/reading?spread=${spread.type}`}
        className="group relative block h-full overflow-hidden rounded-xl border border-[var(--color-border)] no-underline shadow-[var(--shadow-card)] transition-all hover:border-[var(--color-border-hover)] hover:shadow-[var(--shadow-card-hover)]"
      >
        {/* 背景圖 */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-opacity"
          style={{
            backgroundImage: `url(${config.image})`,
            opacity: config.opacity,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = String(config.hoverOpacity); }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = String(config.opacity); }}
        />
        {/* 漸層疊加：凱爾特十字較淡讓法陣更清楚 */}
        <div
          className="absolute inset-0"
          style={{
            background: spread.cardCount === 10
              ? 'linear-gradient(to bottom, rgba(8,8,16,0.1) 0%, rgba(8,8,16,0.7) 100%)'
              : 'linear-gradient(to bottom, rgba(8,8,16,0.3) 0%, rgba(8,8,16,0.85) 100%)',
          }}
        />
        {/* 內容 */}
        <div className="relative z-10 p-6 text-center">
          <div className="mb-10" />
          {/* 新手推薦 / 深度解析標籤 */}
          {spread.type === 'single' && (
            <span className="mb-2 inline-block rounded-full bg-[var(--color-accent-gold)]/20 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-[var(--color-accent-gold)]">
              {t.home.beginner}
            </span>
          )}
          {spread.type === 'celtic-cross' && (
            <span className="mb-2 inline-block rounded-full bg-[var(--color-accent-purple)]/20 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-[var(--color-accent-purple-light)]">
              {t.home.deepAnalysis}
            </span>
          )}
          <h2 className="mb-2 text-lg font-bold tracking-wider text-[var(--color-text-primary)]">
            {spreadT.name}
          </h2>
          <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
            {spreadT.description}
          </p>
          <div className="mt-4 inline-block rounded-full border border-[var(--color-border-ornate)] bg-[var(--color-bg-primary)]/60 px-3 py-1 text-[10px] tracking-wider text-[var(--color-accent-gold)]">
            {spread.cardCount} ✦
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
