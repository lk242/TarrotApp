import { useState, useMemo } from 'react';
import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { marked } from 'marked';
import type { Reading } from '../../models/reading';
import { QUESTION_CREDIT_COST } from '../../models/credits';
import { SPREADS } from '../../models/spread';
import { useHistoryReadings } from '../../controllers/useHistoryReadings';
import { useCredits } from '../../controllers/useCredits';
import CardFace from '../components/tarot/CardFace';

export default function HistoryPage() {
  const { readings, loading, followingUpId, error, deleteReading, askFollowUp } = useHistoryReadings();
  const { balance } = useCredits();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-20">
        <MysticProgress title="正在讀取占卜紀錄" />
      </div>
    );
  }

  if (readings.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="mb-4 text-4xl text-[var(--color-accent-gold)] opacity-50">☽</div>
          <h1 className="mb-3 text-2xl font-bold tracking-wider text-[var(--color-accent-gold)]">
            占卜紀錄
          </h1>
          <p className="mb-6 text-[var(--color-text-secondary)]">
            尚無占卜紀錄，去進行一次占卜吧！
          </p>
          <Link
            to="/"
            className="inline-block rounded-lg border border-[var(--color-accent-gold)]/30 bg-[var(--color-accent-gold)]/15 px-6 py-2.5 font-bold tracking-wider text-[var(--color-accent-gold)] no-underline shadow-[var(--shadow-glow)] transition-all hover:bg-[var(--color-accent-gold)]/25"
          >
            ☉ 開始占卜
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
        className="mb-8 text-2xl font-bold tracking-wider text-[var(--color-accent-gold)]"
      >
        占卜紀錄
      </motion.h1>
      {error && (
        <div className="mb-6 w-full max-w-2xl rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

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
            onDelete={() => deleteReading(reading.id)}
            onFollowUp={(question) => askFollowUp(reading, question)}
            isFollowingUp={followingUpId === reading.id}
            canFollowUp={balance >= QUESTION_CREDIT_COST}
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
  onFollowUp,
  isFollowingUp,
  canFollowUp,
}: {
  reading: Reading;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onFollowUp: (question: string) => void;
  isFollowingUp: boolean;
  canFollowUp: boolean;
}) {
  const [followUpInput, setFollowUpInput] = useState('');
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
    () =>
      isExpanded && reading.interpretation
        ? (marked.parse(reading.interpretation, { async: false }) as string)
        : '',
    [isExpanded, reading.interpretation],
  );

  const followUpHtmls = useMemo(
    () =>
      isExpanded && reading.followUps?.length
        ? reading.followUps.map((fu) =>
            marked.parse(fu.answer, { async: false }) as string,
          )
        : [],
    [isExpanded, reading.followUps],
  );

  const followUpCount = reading.followUps?.length || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--shadow-card)]"
    >
      {/* 摘要列 */}
      <div className="flex w-full items-start gap-3 p-4 sm:items-center sm:p-5">
        <button
          onClick={onToggle}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 bg-transparent text-left transition-colors sm:gap-4"
        >
          <div className="flex-1 min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="rounded bg-[var(--color-accent-purple)]/20 px-2 py-0.5 text-[11px] font-medium text-[var(--color-accent-purple-light)]">
                {spread?.name || reading.spreadType}
              </span>
              {followUpCount > 0 && (
                <span className="rounded bg-[var(--color-accent-gold)]/20 px-2 py-0.5 text-[11px] font-medium text-[var(--color-accent-gold)]">
                  +{followUpCount} 追問
                </span>
              )}
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
          className="flex h-10 w-10 flex-none cursor-pointer items-center justify-center rounded-lg border border-red-900/30 bg-red-950/20 text-red-300 opacity-90 transition-all hover:border-red-700/60 hover:bg-red-950/40 hover:text-red-200"
          title="刪除紀錄"
          aria-label="刪除紀錄"
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
          {/* 原始牌面 */}
          <div className="mb-5 flex flex-wrap justify-center gap-3">
            {reading.drawnCards.map((dc) => (
              <CardFace key={dc.card.id} drawnCard={dc} className="!w-28" />
            ))}
          </div>

          {/* 原始解讀 */}
          <div
            className="interpretation-panel rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5"
            dangerouslySetInnerHTML={{ __html: interpretationHtml }}
          />

          {/* 追問紀錄 */}
          {reading.followUps && reading.followUps.length > 0 && (
            <div className="mt-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-[var(--color-border)]" />
                <span className="text-xs font-medium text-[var(--color-accent-gold)]">
                  追問紀錄
                </span>
                <div className="h-px flex-1 bg-[var(--color-border)]" />
              </div>

              {reading.followUps.map((fu, fuIdx) => (
                <div key={fuIdx} className="space-y-3">
                  {/* 追問問題 */}
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-xs text-[var(--color-accent-gold)]">Q{fuIdx + 1}</span>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">
                      {fu.question}
                    </p>
                  </div>

                  {/* 追問指引牌 */}
                  {fu.drawnCard && (
                    <div className="flex justify-center">
                      <div className="text-center">
                        <p className="mb-2 text-xs text-[var(--color-text-muted)]">追問指引牌</p>
                        <CardFace drawnCard={fu.drawnCard} className="!w-24" />
                      </div>
                    </div>
                  )}

                  {/* 追問解讀 */}
                  {followUpHtmls[fuIdx] && (
                    <div
                      className="interpretation-panel rounded-lg border border-[var(--color-accent-gold)]/20 bg-[var(--color-bg-secondary)] p-5"
                      dangerouslySetInnerHTML={{ __html: followUpHtmls[fuIdx] }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 border-t border-[var(--color-border)] pt-5">
            <p className="mb-3 text-center text-xs text-[var(--color-text-muted)]">
              針對這輪占卜繼續追問，每次消耗 {QUESTION_CREDIT_COST} 點
            </p>
            {isFollowingUp ? (
              <MysticProgress title="正在解析這輪追問" />
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={followUpInput}
                  onChange={(event) => setFollowUpInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && followUpInput.trim() && canFollowUp) {
                      onFollowUp(followUpInput.trim());
                      setFollowUpInput('');
                    }
                  }}
                  placeholder="針對這次紀錄追問..."
                  className="min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none transition-colors focus:border-[var(--color-accent-gold)]"
                />
                <button
                  onClick={() => {
                    if (followUpInput.trim() && canFollowUp) {
                      onFollowUp(followUpInput.trim());
                      setFollowUpInput('');
                    }
                  }}
                  disabled={!followUpInput.trim() || !canFollowUp}
                  className="cursor-pointer rounded-lg bg-[var(--color-accent-gold)] px-4 py-2.5 text-sm font-bold text-[var(--color-bg-primary)] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                >
                  追問
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function MysticProgress({ title }: { title: string }) {
  return (
    <div className="mx-auto w-full max-w-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 text-center shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-center justify-center gap-2">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-2.5 w-2.5 rounded-full bg-[var(--color-accent-gold)]"
            animate={{ opacity: [0.25, 1, 0.25], scale: [0.85, 1.25, 0.85] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.25 }}
          />
        ))}
      </div>
      <p className="text-sm font-bold text-[var(--color-text-primary)]">{title}</p>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--color-bg-secondary)]">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent-purple)] via-[var(--color-accent-gold)] to-[var(--color-accent-mystic)]"
          initial={{ x: '-100%' }}
          animate={{ x: ['-100%', '120%'] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </div>
  );
}
