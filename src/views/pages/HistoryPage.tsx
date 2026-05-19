import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { marked } from 'marked';
import type { Reading } from '../../models/reading';
import { SPREADS } from '../../models/spread';
import { getStorageProvider } from '../../services/storage/storage-factory';
import { useAuth } from '../../controllers/useAuth';
import CardFace from '../components/tarot/CardFace';

export default function HistoryPage() {
  const { user } = useAuth();
  const [readings, setReadings] = useState<Reading[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    // 使用者登入狀態改變時切換 storage 來源：匿名 localStorage，登入 Firestore。
    const storage = getStorageProvider(user?.uid);
    storage.getReadings().then(setReadings);
  }, [user?.uid]);

  if (readings.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="mb-4 text-5xl opacity-50">📜</div>
          <h1 className="mb-3 text-2xl font-bold text-[var(--color-accent-gold)]">
            占卜紀錄
          </h1>
          <p className="mb-6 text-[var(--color-text-secondary)]">
            尚無占卜紀錄，去進行一次占卜吧！
          </p>
          <Link
            to="/"
            className="inline-block rounded-lg bg-gradient-to-r from-[var(--color-accent-purple)] to-[var(--color-accent-mystic)] px-6 py-2.5 font-bold text-white no-underline shadow-[var(--shadow-glow)]"
          >
            ✦ 開始占卜
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-20">
      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-8 text-2xl font-bold text-[var(--color-accent-gold)]"
      >
        占卜紀錄
      </motion.h1>

      <div className="w-full max-w-2xl space-y-4">
        {readings.map((reading, i) => (
          <HistoryCard
            key={reading.id}
            reading={reading}
            index={i}
            isExpanded={expandedId === reading.id}
            onToggle={() =>
              setExpandedId(expandedId === reading.id ? null : reading.id)
            }
            onDelete={() => {
              const storage = getStorageProvider(user?.uid);
              storage.deleteReading(reading.id).then(() => {
                setReadings((prev) => prev.filter((r) => r.id !== reading.id));
              });
            }}
          />
        ))}
      </div>
    </div>
  );
}

function HistoryCard({
  reading,
  index,
  isExpanded,
  onToggle,
  onDelete,
}: {
  reading: Reading;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const spread = SPREADS[reading.spreadType];
  const date = new Date(reading.timestamp);
  const dateStr = date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = date.toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const interpretationHtml = useMemo(
    // 只在展開時轉 Markdown，避免列表初始渲染時解析所有歷史紀錄。
    () =>
      isExpanded && reading.interpretation
        ? (marked.parse(reading.interpretation, { async: false }) as string)
        : '',
    [isExpanded, reading.interpretation],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--shadow-card)]"
    >
      {/* 摘要列 */}
      <div className="flex w-full items-center gap-2 p-5">
        <button
          onClick={onToggle}
          className="flex flex-1 cursor-pointer items-center gap-4 bg-transparent text-left transition-colors"
        >
          <div className="flex-1 min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded bg-[var(--color-accent-purple)]/20 px-2 py-0.5 text-[11px] font-medium text-[var(--color-accent-purple-light)]">
                {spread?.name || reading.spreadType}
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">
                {dateStr} {timeStr}
              </span>
            </div>
            <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
              {reading.question}
            </p>
            {reading.summary && (
              <p className="mt-1 truncate text-xs text-[var(--color-text-secondary)]">
                {reading.summary}
              </p>
            )}
          </div>
          <span
            className="text-[var(--color-text-muted)] transition-transform duration-200"
            style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            ▾
          </span>
        </button>
        {/* 刪除按鈕 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="cursor-pointer rounded-lg border border-transparent p-2 text-[var(--color-text-muted)] opacity-40 transition-all hover:border-red-800/50 hover:bg-red-950/30 hover:text-red-400 hover:opacity-100"
          title="刪除紀錄"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>

      {/* 展開內容 */}
      {isExpanded && (
        <div className="border-t border-[var(--color-border)] px-5 pt-4 pb-5 animate-fade-in">
          {/* 牌面 */}
          <div className="mb-5 flex flex-wrap justify-center gap-3">
            {reading.drawnCards.map((dc) => (
              <CardFace key={dc.card.id} drawnCard={dc} className="!w-28" />
            ))}
          </div>

          {/* 解讀 */}
          <div
            className="interpretation-panel rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5"
            dangerouslySetInnerHTML={{ __html: interpretationHtml }}
          />

        </div>
      )}
    </motion.div>
  );
}
