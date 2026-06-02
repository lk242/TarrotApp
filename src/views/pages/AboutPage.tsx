import { motion } from 'framer-motion';
import { useI18n } from '../../controllers/useI18n';
import { useTheme } from '../../controllers/useTheme';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay },
});

const SPREAD_IMAGE_NAMES = ['spread-single', 'spread-three', 'spread-celtic'];

export default function AboutPage() {
  const { t } = useI18n();
  const { theme, themeImageBase } = useTheme();
  const ext = theme === 'light' ? 'png' : 'webp';
  const spreadImages = SPREAD_IMAGE_NAMES.map((n) => `${themeImageBase}/${n}.${ext}`);
  return (
    <div className="flex flex-1 flex-col items-center px-6 py-20">
      {/* ===== Hero ===== */}
      <motion.div {...fadeUp()} className="mb-16 max-w-2xl text-center">
        <img src={`${themeImageBase}/logo.${ext}`} alt="" className="mx-auto mb-4 h-14 w-14 animate-candle" style={{ mixBlendMode: theme === 'light' ? 'multiply' : 'screen' }} />
        <h1 className="mb-4 text-3xl font-bold tracking-[0.15em] text-[var(--color-accent-gold)] md:text-4xl" style={{ fontVariant: 'small-caps' }}>
          {t.about.title}
        </h1>
        <img src={`${themeImageBase}/divider.${ext}`} alt="" className="mx-auto my-3 h-5 w-auto opacity-60" />
        <p className="mt-6 text-base leading-relaxed text-[var(--color-text-secondary)]">
          {t.about.intro}
        </p>
      </motion.div>

      {/* ===== 特色功能 ===== */}
      <motion.div {...fadeUp(0.15)} className="mb-16 w-full max-w-4xl">
        <h2 className="section-title mb-8 text-center text-xl font-bold tracking-wider text-[var(--color-accent-gold)]">
          {t.about.coreFeatures}
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {t.about.features.map((f, i) => (
            <motion.div
              key={i}
              {...fadeUp(0.2 + i * 0.08)}
              className="ornate-card rounded-xl p-6 transition-all hover:shadow-[var(--shadow-card-hover)]"
            >
              <div className="mb-3 text-2xl text-[var(--color-accent-gold)] opacity-70">{f.sigil}</div>
              <h3 className="mb-2 text-sm font-bold tracking-wider text-[var(--color-accent-gold-light)]">
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ===== 牌陣介紹 ===== */}
      <motion.div {...fadeUp(0.3)} className="mb-16 w-full max-w-3xl">
        <h2 className="section-title mb-8 text-center text-xl font-bold tracking-wider text-[var(--color-accent-gold)]">
          {t.about.spreadIntro}
        </h2>
        <div className="space-y-4">
          {t.about.spreadDetails.map((s, i) => (
            <div
              key={i}
              className="ornate-card flex items-start gap-5 rounded-xl p-5 transition-all hover:shadow-[var(--shadow-card-hover)]"
            >
              <div
                className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl border border-[var(--color-border-ornate)]"
              >
                <img src={spreadImages[i]} alt={s.name} className="h-full w-full object-cover" />
              </div>
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-3">
                  <h3 className="text-base font-bold text-[var(--color-text-primary)]">{s.name}</h3>
                  <span className="rounded-full border border-[var(--color-accent-purple)]/20 bg-[var(--color-accent-purple)]/10 px-2.5 py-0.5 text-[11px] text-[var(--color-accent-purple-light)]">
                    {s.cards}
                  </span>
                  <span className="text-[11px] text-[var(--color-text-muted)]">{s.time}</span>
                </div>
                <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ===== 塔羅小知識 ===== */}
      <motion.div {...fadeUp(0.4)} className="mb-16 w-full max-w-2xl">
        <h2 className="section-title mb-8 text-center text-xl font-bold tracking-wider text-[var(--color-accent-gold)]">
          {t.about.tips}
        </h2>
        <div className="space-y-3">
          {t.about.tarotTips.map((tip, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4"
            >
              <span className="mt-0.5 text-sm text-[var(--color-accent-gold)] opacity-50">◆</span>
              <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{tip}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ===== 關於韋特塔羅 ===== */}
      <motion.div {...fadeUp(0.5)} className="mb-16 w-full max-w-2xl">
        <h2 className="section-title mb-6 text-center text-xl font-bold tracking-wider text-[var(--color-accent-gold)]">
          {t.about.historyTitle}
        </h2>
        <div className="ornate-card rounded-xl p-6 md:p-8">
          {t.about.historyContent.map((para, i) => (
            <p key={i} className={`${i < t.about.historyContent.length - 1 ? 'mb-4' : ''} text-sm leading-relaxed text-[var(--color-text-secondary)]`}>
              {para}
            </p>
          ))}
        </div>
      </motion.div>

      {/* ===== 免責聲明 ===== */}
      <motion.div {...fadeUp(0.6)} className="w-full max-w-xl text-center">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6">
          <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
            {t.about.disclaimer}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
