import type { DrawnCard } from '../../../models/tarot-card';
import { useI18n } from '../../../controllers/useI18n';
import { getCardDisplayName, getPositionDisplayName } from '../../../services/i18n/card-names';

interface Props {
  drawnCard: DrawnCard;
  /** 覆蓋 drawnCard.position 的顯示文字（i18n 用） */
  positionLabel?: string;
  className?: string;
}

export default function CardFace({ drawnCard, positionLabel, className = '' }: Props) {
  const { card, isReversed, position } = drawnCard;
  const { t, lang } = useI18n();
  const displayName = getCardDisplayName(card, lang);
  const translatedPosition = positionLabel ?? getPositionDisplayName(position, t);

  return (
    <div
      className={`relative flex w-44 flex-col items-center rounded-xl border border-[var(--color-accent-gold)] bg-[var(--color-bg-card)] p-3 shadow-[var(--shadow-glow)] ${className}`}
    >
      <div
        className="flex w-full items-center justify-center overflow-hidden rounded-lg bg-black/25"
        style={{ aspectRatio: '5 / 8' }}
      >
        <img
          src={card.imageUrl}
          alt={`${displayName} ${isReversed ? t.reading.reversed : t.reading.upright}`}
          /* 逆位只旋轉牌面圖片，不旋轉牌名與牌位，方便閱讀。 */
          className="h-full w-full object-contain transition-transform duration-300"
          style={isReversed ? { transform: 'rotate(180deg)' } : undefined}
          loading="lazy"
        />
      </div>
      <div className="mt-2.5 flex w-full flex-col items-center text-center">
        <span className="text-sm font-bold text-[var(--color-accent-gold)]">
          {displayName}
        </span>
        {lang !== 'en' && (
          <span className="mt-0.5 text-xs leading-tight text-[var(--color-text-muted)]">
            {card.nameEn}
          </span>
        )}
        <span className="mt-1 text-xs leading-tight text-[var(--color-accent-purple-light)]">
          {translatedPosition}
        </span>
      </div>
    </div>
  );
}
