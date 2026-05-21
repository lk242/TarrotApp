import { forwardRef } from 'react';
import type { DrawnCard } from '../../../models/tarot-card';

interface Props {
  spreadName: string;
  question?: string;
  drawnCards: DrawnCard[];
  /** 解讀文字摘要（取前 200 字） */
  interpretationPreview: string;
}

/**
 * 占卜結果分享卡片。
 *
 * 這個元件用於 html2canvas 截圖，不需要動畫，
 * 使用固定樣式確保截圖效果一致。
 */
const ReadingShareCard = forwardRef<HTMLDivElement, Props>(
  ({ spreadName, question, drawnCards, interpretationPreview }, ref) => (
    <div
      ref={ref}
      style={{
        width: 480,
        padding: 32,
        background: 'linear-gradient(180deg, #0A0A14 0%, #131328 100%)',
        color: '#E8E0D0',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        borderRadius: 16,
        position: 'absolute',
        left: -9999,
        top: -9999,
      }}
    >
      {/* 標題 */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#C9A556' }}>
          {spreadName}
        </div>
        {question && (
          <div style={{ fontSize: 13, color: '#9B95A0', marginTop: 6, fontStyle: 'italic' }}>
            「{question.length > 50 ? question.slice(0, 50) + '…' : question}」
          </div>
        )}
      </div>

      {/* 牌面 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 20,
        }}
      >
        {drawnCards.map((dc) => (
          <div key={dc.card.id} style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 80,
                height: 128,
                borderRadius: 8,
                overflow: 'hidden',
                border: '1px solid rgba(201, 165, 86, 0.3)',
                transform: dc.isReversed ? 'rotate(180deg)' : 'none',
              }}
            >
              <img
                src={dc.card.imageUrl}
                alt={dc.card.name}
                crossOrigin="anonymous"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div style={{ fontSize: 11, color: '#C9A556', marginTop: 6, fontWeight: 600 }}>
              {dc.card.name}
            </div>
            <div style={{ fontSize: 10, color: '#9B95A0' }}>
              {dc.isReversed ? '逆位' : '正位'}
            </div>
          </div>
        ))}
      </div>

      {/* 分隔線 */}
      <div
        style={{
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(201,165,86,0.3), transparent)',
          margin: '16px 0',
        }}
      />

      {/* 解讀預覽 */}
      <div style={{ fontSize: 13, lineHeight: 1.7, color: '#C8C0B4' }}>
        {interpretationPreview}
      </div>

      {/* 品牌 */}
      <div
        style={{
          marginTop: 20,
          paddingTop: 12,
          borderTop: '1px solid rgba(201,165,86,0.15)',
          textAlign: 'center',
          fontSize: 11,
          color: '#6B6575',
        }}
      >
        ✦ 神秘塔羅 — mystic-tarot-2026.web.app ✦
      </div>
    </div>
  ),
);

ReadingShareCard.displayName = 'ReadingShareCard';

export default ReadingShareCard;
