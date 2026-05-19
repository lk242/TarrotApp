import type { DrawnCard } from '../../../models/tarot-card';
import CardFace from './CardFace';

interface Props {
  drawnCards: DrawnCard[];
  className?: string;
}

/**
 * 凱爾特十字正統牌陣佈局
 *
 * 牌位對應：
 *  0 = 現況（中心）
 *  1 = 挑戰（橫跨中心）
 *  2 = 潛意識（正下方）
 *  3 = 過去（左側）
 *  4 = 可能性（正上方）
 *  5 = 近未來（右側）
 *  6 = 自我（右柱底）
 *  7 = 環境（右柱第二）
 *  8 = 希望與恐懼（右柱第三）
 *  9 = 最終結果（右柱頂）
 *
 * 佈局使用 CSS Grid:
 *   左十字 (4 cols x 4 rows) + 右柱 (1 col x 4 rows)
 */
export default function CelticCrossLayout({ drawnCards, className = '' }: Props) {
  if (drawnCards.length < 10) return null;

  return (
    <div className={`celtic-cross-grid ${className}`}>
      {/* 位置 4: 可能性（上方） */}
      <div className="celtic-pos celtic-top">
        <CardFace drawnCard={drawnCards[4]} className="!w-24 md:!w-32" />
      </div>

      {/* 位置 3: 過去（左側） */}
      <div className="celtic-pos celtic-left">
        <CardFace drawnCard={drawnCards[3]} className="!w-24 md:!w-32" />
      </div>

      {/* 位置 0+1: 現況 + 挑戰（中心，交叉疊放） */}
      <div className="celtic-pos celtic-center">
        <div className="relative flex items-center justify-center">
          <CardFace drawnCard={drawnCards[0]} className="!w-24 md:!w-32" />
          <div className="absolute" style={{ transform: 'rotate(90deg)' }}>
            <CardFace drawnCard={drawnCards[1]} className="!w-24 md:!w-32" />
          </div>
        </div>
      </div>

      {/* 位置 5: 近未來（右側） */}
      <div className="celtic-pos celtic-right">
        <CardFace drawnCard={drawnCards[5]} className="!w-24 md:!w-32" />
      </div>

      {/* 位置 2: 潛意識（下方） */}
      <div className="celtic-pos celtic-bottom">
        <CardFace drawnCard={drawnCards[2]} className="!w-24 md:!w-32" />
      </div>

      {/* 右側柱：6 → 7 → 8 → 9（由下到上） */}
      <div className="celtic-pos celtic-staff-4">
        <CardFace drawnCard={drawnCards[9]} className="!w-24 md:!w-32" />
      </div>
      <div className="celtic-pos celtic-staff-3">
        <CardFace drawnCard={drawnCards[8]} className="!w-24 md:!w-32" />
      </div>
      <div className="celtic-pos celtic-staff-2">
        <CardFace drawnCard={drawnCards[7]} className="!w-24 md:!w-32" />
      </div>
      <div className="celtic-pos celtic-staff-1">
        <CardFace drawnCard={drawnCards[6]} className="!w-24 md:!w-32" />
      </div>
    </div>
  );
}
