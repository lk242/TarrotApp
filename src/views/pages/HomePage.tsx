import { Link, useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { useRef, useCallback } from 'react';
import { SPREADS } from '../../models/spread';
import type { SpreadType } from '../../models/spread';
import { useI18n } from '../../controllers/useI18n';
import { useTheme } from '../../controllers/useTheme';

const spreadList = Object.values(SPREADS);

/** 牌陣卡片配置：圖片檔名 + 透明度（依主題不同） */
const SPREAD_IMAGE_MAP: Record<string, string> = {
  single:         'spread-single',
  'three-card':   'spread-three',
  'celtic-cross': 'spread-celtic',
  'yes-no':       'spread-single',
};

const SPREAD_OPACITY = {
  light: { opacity: 0.65, hoverOpacity: 0.85 },
  dark:  { opacity: 0.4, hoverOpacity: 0.55 },
};

export default function HomePage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { theme, themeImageBase } = useTheme();
  const ext = theme === 'light' ? 'png' : 'webp';
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
          src={`${themeImageBase}/hero.${ext}`}
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
          src={`${themeImageBase}/logo.${ext}`}
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
          src={`${themeImageBase}/divider.${theme === 'light' ? 'png' : 'webp'}`}
          alt=""
          className="mx-auto my-4 h-6 w-auto opacity-70"
        />
        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-[var(--color-text-secondary)]">
          {t.home.subtitle}
        </p>
      </motion.div>

      {/* ===== 牌陣選擇 ===== */}
      <div className="grid w-full max-w-4xl gap-6 sm:grid-cols-2 md:grid-cols-4">
        {spreadList.map((spread, i) => (
          <SpreadCard key={spread.type} spread={spread} delay={0.5 + i * 0.15} t={t} />
        ))}
      </div>

      <section className="ornate-card mt-12 w-full max-w-3xl rounded-xl p-6 text-sm leading-7 text-[var(--color-text-secondary)]">
        <h2 className="mb-3 text-lg font-bold tracking-wider text-[var(--color-accent-gold)]">
          {(t as Record<string, any>).serviceInfo?.homeTitle}
        </h2>
        <p>{(t as Record<string, any>).serviceInfo?.homeDesc}</p>
        <p className="mt-2">{(t as Record<string, any>).serviceInfo?.homeCreditsNote}</p>
        <p className="mt-2 font-medium text-[var(--color-accent-gold)]">
          {(t as Record<string, any>).serviceInfo?.contactEmail}
        </p>
      </section>
    </div>
  );
}

/** spread.type → i18n key 映射 */
const SPREAD_I18N_KEY: Record<string, 'single' | 'threeCard' | 'celticCross' | 'yesNo'> = {
  single: 'single',
  'three-card': 'threeCard',
  'celtic-cross': 'celticCross',
  'yes-no': 'yesNo',
};

function SpreadCard({ spread, delay, t }: { spread: (typeof SPREADS)[SpreadType]; delay: number; t: import('../../services/i18n').Locale }) {
  const { theme, themeImageBase } = useTheme();
  const ext = theme === 'light' ? 'png' : 'webp';
  const opacityCfg = SPREAD_OPACITY[theme];
  const imageName = SPREAD_IMAGE_MAP[spread.type] || 'spread-single';
  const config = { image: `${themeImageBase}/${imageName}.${ext}`, ...opacityCfg };
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
        {/* 漸層疊加：依主題調整 */}
        <div
          className="absolute inset-0"
          style={{
            background: theme === 'dark'
              ? (spread.cardCount === 10
                ? 'linear-gradient(to bottom, rgba(8,8,16,0.1) 0%, rgba(8,8,16,0.7) 100%)'
                : 'linear-gradient(to bottom, rgba(8,8,16,0.3) 0%, rgba(8,8,16,0.85) 100%)')
              : 'linear-gradient(to bottom, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.82) 100%)',
            backdropFilter: theme === 'light' ? 'blur(2px)' : 'none',
          }}
        />
        {/* 內容 */}
        <div className="relative z-10 p-6 text-center">
          <div className="mb-10" />
          {/* 新手推薦 / 深度解析標籤 */}
          {spread.type === 'single' && (
            <span
              className="mb-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider"
              style={{
                backgroundColor: theme === 'light' ? 'rgba(139,110,192,0.18)' : 'rgba(201,168,76,0.2)',
                color: theme === 'light' ? '#6d4ec0' : 'var(--color-accent-gold)',
              }}
            >
              {t.home.beginner}
            </span>
          )}
          {spread.type === 'celtic-cross' && (
            <span
              className="mb-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider"
              style={{
                backgroundColor: theme === 'light' ? 'rgba(99,102,241,0.15)' : 'rgba(123,94,167,0.2)',
                color: theme === 'light' ? '#4f46e5' : 'var(--color-accent-purple-light)',
              }}
            >
              {t.home.deepAnalysis}
            </span>
          )}
          {spread.type === 'yes-no' && (
            <span
              className="mb-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider"
              style={{
                backgroundColor: theme === 'light' ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.2)',
                color: theme === 'light' ? '#059669' : '#34d399',
              }}
            >
              {t.home.quickAnswer}
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
