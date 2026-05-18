import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { SPREADS } from '../../models/spread';
import type { SpreadType } from '../../models/spread';

const spreadList = Object.values(SPREADS);

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-20">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="mb-16 text-center"
      >
        <div className="animate-float mb-6 text-6xl">✦</div>
        <h1 className="mb-4 text-4xl font-bold tracking-wider text-[var(--color-accent-gold)]">
          神秘塔羅
        </h1>
        <p className="mx-auto max-w-md text-lg text-[var(--color-text-secondary)]">
          讓古老的塔羅智慧，為你揭示命運的指引
        </p>
      </motion.div>

      <div className="grid w-full max-w-3xl gap-6 md:grid-cols-3">
        {spreadList.map((spread, i) => (
          <SpreadCard key={spread.type} spread={spread} delay={i * 0.15} />
        ))}
      </div>
    </div>
  );
}

function SpreadCard({ spread, delay }: { spread: (typeof SPREADS)[SpreadType]; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <Link
        to={`/reading?spread=${spread.type}`}
        className="group block rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 text-center no-underline shadow-[var(--shadow-card)] transition-all hover:border-[var(--color-border-hover)] hover:shadow-[var(--shadow-card-hover)]"
      >
        <div className="mb-3 text-3xl text-[var(--color-accent-gold)] transition-transform group-hover:scale-110">
          {spread.cardCount === 1 ? '🂡' : spread.cardCount === 3 ? '🂡🂡🂡' : '✦'}
        </div>
        <h2 className="mb-2 text-lg font-bold text-[var(--color-text-primary)]">
          {spread.name}
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {spread.description}
        </p>
        <div className="mt-4 text-xs text-[var(--color-text-muted)]">
          {spread.cardCount} 張牌
        </div>
      </Link>
    </motion.div>
  );
}
