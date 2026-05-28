import { forwardRef } from 'react';
import type { DrawnCard } from '../../../models/tarot-card';

interface Props {
  spreadName: string;
  question?: string;
  drawnCards: DrawnCard[];
  /** 解讀文字摘要（取前 120 字） */
  interpretationPreview: string;
  /** 品牌名（i18n） */
  brandName?: string;
  /** 正位文字 */
  uprightLabel?: string;
  /** 逆位文字 */
  reversedLabel?: string;
}

/**
 * 占卜結果分享卡片。
 *
 * 設計為 480px 寬的精緻卡片，供 html2canvas 截圖。
 * 使用 inline style 確保截圖一致（Tailwind class 可能被 purge）。
 */
const ReadingShareCard = forwardRef<HTMLDivElement, Props>(
  ({
    spreadName,
    question,
    drawnCards,
    interpretationPreview,
    brandName = '神秘塔羅',
    uprightLabel = '正位',
    reversedLabel = '逆位',
  }, ref) => (
    <div
      ref={ref}
      style={{
        width: 480,
        padding: '36px 32px 28px',
        background: 'linear-gradient(170deg, #0C0C1A 0%, #14122A 40%, #0D0B1E 100%)',
        color: '#E8E0D0',
        fontFamily: '"Noto Serif TC", Georgia, Palatino, serif',
        borderRadius: 20,
        position: 'absolute',
        left: -9999,
        top: -9999,
        border: '1px solid rgba(201, 165, 86, 0.15)',
        overflow: 'hidden',
      }}
    >
      {/* 背景裝飾：星塵粒子（靜態點陣） */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.08, pointerEvents: 'none' }}>
        {[
          { x: 12, y: 8 }, { x: 85, y: 15 }, { x: 45, y: 35 }, { x: 72, y: 55 },
          { x: 20, y: 70 }, { x: 90, y: 45 }, { x: 35, y: 85 }, { x: 60, y: 20 },
          { x: 8, y: 50 }, { x: 78, y: 80 }, { x: 50, y: 65 }, { x: 15, y: 30 },
        ].map((p, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: i % 3 === 0 ? 3 : 2,
              height: i % 3 === 0 ? 3 : 2,
              borderRadius: '50%',
              background: i % 2 === 0 ? '#C9A556' : '#B8A0E0',
            }}
          />
        ))}
      </div>

      {/* Logo + 品牌 */}
      <div style={{ textAlign: 'center', marginBottom: 6, position: 'relative' }}>
        <img
          src="/images/theme/logo.webp"
          alt="logo"
          crossOrigin="anonymous"
          style={{ width: 40, height: 40, margin: '0 auto 8px', display: 'block' }}
        />
        <div style={{ fontSize: 11, letterSpacing: 4, color: '#6B6575', textTransform: 'uppercase' }}>
          {brandName}
        </div>
      </div>

      {/* 上分隔線 */}
      <div style={{
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(201,165,86,0.25), transparent)',
        margin: '14px 0 18px',
      }} />

      {/* 牌陣名稱 */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#C9A556', letterSpacing: 2 }}>
          ✦ {spreadName} ✦
        </div>
        {question && (
          <div style={{
            fontSize: 13,
            color: '#9B95A0',
            marginTop: 8,
            fontStyle: 'italic',
            lineHeight: 1.5,
          }}>
            「{question.length > 40 ? question.slice(0, 40) + '…' : question}」
          </div>
        )}
      </div>

      {/* 牌面區 */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 16,
        flexWrap: 'wrap',
        marginBottom: 20,
        padding: '4px 0',
      }}>
        {drawnCards.map((dc) => (
          <div key={dc.card.id} style={{ textAlign: 'center' }}>
            <div style={{
              width: drawnCards.length > 3 ? 64 : 88,
              height: drawnCards.length > 3 ? 102 : 140,
              borderRadius: 10,
              overflow: 'hidden',
              border: '1.5px solid rgba(201, 165, 86, 0.35)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.4), 0 0 8px rgba(201,165,86,0.1)',
              transform: dc.isReversed ? 'rotate(180deg)' : 'none',
              background: '#0A0A14',
            }}>
              <img
                src={dc.card.imageUrl}
                alt={dc.card.name}
                crossOrigin="anonymous"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div style={{
              fontSize: 12,
              color: '#C9A556',
              marginTop: 8,
              fontWeight: 700,
              letterSpacing: 1,
            }}>
              {dc.card.name}
            </div>
            <div style={{ fontSize: 10, color: dc.isReversed ? '#E88B8B' : '#9B95A0', marginTop: 2 }}>
              {dc.isReversed ? reversedLabel : uprightLabel}
            </div>
          </div>
        ))}
      </div>

      {/* 分隔線 */}
      <div style={{
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(201,165,86,0.2), transparent)',
        margin: '8px 0 16px',
      }} />

      {/* 解讀預覽 */}
      <div style={{
        fontSize: 13,
        lineHeight: 1.8,
        color: '#C8C0B4',
        textAlign: 'center',
        padding: '0 8px',
      }}>
        {interpretationPreview}
      </div>

      {/* 底部品牌 + CTA */}
      <div style={{
        marginTop: 22,
        paddingTop: 14,
        borderTop: '1px solid rgba(201,165,86,0.12)',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: 12,
          color: '#C9A556',
          fontWeight: 600,
          letterSpacing: 2,
        }}>
          ✦ mystic-tarot-2026.web.app ✦
        </div>
        <div style={{ fontSize: 10, color: '#6B6575', marginTop: 4 }}>
          AI 塔羅解讀 — 探索命運的指引
        </div>
      </div>
    </div>
  ),
);

ReadingShareCard.displayName = 'ReadingShareCard';

export default ReadingShareCard;
