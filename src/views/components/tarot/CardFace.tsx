import type { DrawnCard } from '../../../models/tarot-card';

interface Props {
  drawnCard: DrawnCard;
  className?: string;
}

export default function CardFace({ drawnCard, className = '' }: Props) {
  const { card, isReversed, position } = drawnCard;

  return (
    <div
      className={`relative flex h-44 w-28 flex-col items-center justify-center rounded-xl border border-[var(--color-accent-gold)] bg-[var(--color-bg-card)] p-3 shadow-[var(--shadow-glow)] ${className}`}
    >
      {isReversed && (
        <span className="absolute top-1.5 right-2 rounded bg-red-900/60 px-1.5 py-0.5 text-[9px] text-red-300">
          逆位
        </span>
      )}
      <span className="mb-2 text-2xl text-[var(--color-accent-gold)]">✦</span>
      <span className="text-center text-xs font-bold text-[var(--color-accent-gold)]">
        {card.name}
      </span>
      <span className="mt-1 text-[10px] text-[var(--color-text-muted)]">
        {card.nameEn}
      </span>
      <span className="mt-2 text-[10px] text-[var(--color-accent-purple-light)]">
        {position}
      </span>
    </div>
  );
}
