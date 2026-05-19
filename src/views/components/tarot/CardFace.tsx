import type { DrawnCard } from '../../../models/tarot-card';

interface Props {
  drawnCard: DrawnCard;
  className?: string;
}

export default function CardFace({ drawnCard, className = '' }: Props) {
  const { card, isReversed, position } = drawnCard;

  return (
    <div
      className={`relative flex w-44 flex-col items-center rounded-xl border border-[var(--color-accent-gold)] bg-[var(--color-bg-card)] p-3 shadow-[var(--shadow-glow)] ${className}`}
    >
      {isReversed && (
        <span className="absolute top-2.5 right-2.5 z-10 rounded bg-red-950/75 px-2 py-0.5 text-xs font-medium text-red-200">
          逆位
        </span>
      )}
      <div
        className="flex w-full items-center justify-center overflow-hidden rounded-lg bg-black/25"
        style={{ aspectRatio: '5 / 8' }}
      >
        <img
          src={card.imageUrl}
          alt={`${card.name} ${isReversed ? '逆位' : '正位'}`}
          /* 逆位只旋轉牌面圖片，不旋轉牌名與牌位，方便閱讀。 */
          className={`h-full w-full object-contain transition-transform duration-300 ${isReversed ? 'rotate-180' : ''}`}
          loading="lazy"
        />
      </div>
      <div className="mt-2.5 flex w-full flex-col items-center text-center">
        <span className="text-sm font-bold text-[var(--color-accent-gold)]">
          {card.name}
        </span>
        <span className="mt-0.5 text-xs leading-tight text-[var(--color-text-muted)]">
          {card.nameEn}
        </span>
        <span className="mt-1 text-xs leading-tight text-[var(--color-accent-purple-light)]">
          {position}
        </span>
      </div>
    </div>
  );
}
