import { useState, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { marked } from 'marked';
import type { Reading } from '../../models/reading';
import { FOLLOW_UP_CREDIT_COST } from '../../models/credits';
import { SPREADS } from '../../models/spread';
import { useHistoryReadings } from '../../controllers/useHistoryReadings';
import { useCredits } from '../../controllers/useCredits';
import { useI18n } from '../../controllers/useI18n';
import { stripFollowUpCardHeading } from '../../utils/follow-up';
import CardFace from '../components/tarot/CardFace';
import InterpretationSections from '../components/tarot/InterpretationSections';
import AutoGrowTextarea from '../components/ui/AutoGrowTextarea';

export default function HistoryPage() {
  const { readings, loading, followingUpId, isStreaming: isHistoryStreaming, suggestedQuestions, error, deleteReading, askFollowUp, updateNotes } = useHistoryReadings();
  const { balance } = useCredits();
  const { t, lang } = useI18n();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAllLangs, setShowAllLangs] = useState(false);

  // 過濾語系：舊紀錄若無 locale 欄位視為 zh-TW
  const filteredReadings = useMemo(
    () => showAllLangs ? readings : readings.filter((r) => (r.locale ?? 'zh-TW') === lang),
    [readings, showAllLangs, lang],
  );

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-20">
        <MysticProgress title={t.history.loadingReadings} />
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
            {t.history.title}
          </h1>
          <p className="mb-6 text-[var(--color-text-secondary)]">
            {t.history.empty}
          </p>
          <Link
            to="/"
            className="inline-block rounded-lg border border-[var(--color-accent-gold)]/30 bg-[var(--color-accent-gold)]/15 px-6 py-2.5 font-bold tracking-wider text-[var(--color-accent-gold)] no-underline shadow-[var(--shadow-glow)] transition-all hover:bg-[var(--color-accent-gold)]/25"
          >
            ☉ {t.history.emptyAction}
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
        {t.history.title}
      </motion.h1>
      {error && (
        <div className="mb-6 w-full max-w-2xl rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* 語系過濾 toggle */}
      {readings.length > filteredReadings.length || showAllLangs ? (
        <div className="mb-4 w-full max-w-2xl flex justify-end">
          <button
            onClick={() => setShowAllLangs(!showAllLangs)}
            className="cursor-pointer rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent-gold)]/40"
          >
            {showAllLangs ? t.history.showCurrentLang : t.history.showAllLangs}
            {!showAllLangs && ` (${readings.length - filteredReadings.length})`}
          </button>
        </div>
      ) : null}

      {/* 趨勢概覽 */}
      <TrendSummary readings={filteredReadings} t={t} />

      <div className="w-full max-w-2xl space-y-4">
        {filteredReadings.map((reading, i) => (
          <HistoryCard
            key={reading.id}
            reading={reading}
            index={i}
            t={t}
            currentLang={lang}
            isExpanded={expandedId === reading.id}
            onToggle={() =>
              setExpandedId(expandedId === reading.id ? null : reading.id)
            }
            onDelete={() => deleteReading(reading.id)}
            onFollowUp={(question, withCard) => askFollowUp(reading, question, withCard)}
            onUpdateNotes={(notes) => updateNotes(reading.id, notes)}
            isFollowingUp={followingUpId === reading.id}
            isStreaming={isHistoryStreaming && followingUpId === reading.id}
            canFollowUp={balance >= FOLLOW_UP_CREDIT_COST}
            suggestedQuestions={
              // 優先用 controller 最新的（追問剛完成時），否則讀 reading 儲存的
              followingUpId === reading.id || (expandedId === reading.id && suggestedQuestions.length > 0)
                ? suggestedQuestions
                : reading.suggestedQuestions ?? []
            }
          />
        ))}
      </div>
    </div>
  );
}

function HistoryCard({
  reading,
  index,
  t,
  currentLang,
  isExpanded,
  onToggle,
  onDelete,
  onFollowUp,
  onUpdateNotes,
  isFollowingUp,
  isStreaming,
  canFollowUp,
  suggestedQuestions,
}: {
  reading: Reading;
  index: number;
  t: import('../../services/i18n').Locale;
  currentLang: string;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onFollowUp: (question: string, withCard?: boolean) => void;
  onUpdateNotes: (notes: string) => void;
  isFollowingUp: boolean;
  isStreaming: boolean;
  canFollowUp: boolean;
  suggestedQuestions: string[];
}) {
  const [followUpInput, setFollowUpInput] = useState('');
  const [followUpMode, setFollowUpMode] = useState<'card' | 'chat'>('card');
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [notesValue, setNotesValue] = useState(reading.userNotes ?? '');
  const [notesSaved, setNotesSaved] = useState(false);
  const spread = SPREADS[reading.spreadType];
  // SpreadType → locale key 對照
  const spreadLocaleKey: Record<string, string> = { single: 'single', 'three-card': 'threeCard', 'celtic-cross': 'celticCross', 'yes-no': 'yesNo' };
  const spreadI18nName = (t.spreads as Record<string, { name: string }>)[spreadLocaleKey[reading.spreadType] ?? '']?.name;
  const readingLocale = reading.locale ?? 'zh-TW';
  const isForeignLang = readingLocale !== currentLang;
  const langLabels = (t.history as Record<string, unknown>).langLabel as Record<string, string> | undefined;

  // 用紀錄的語系格式化日期
  const dateLocaleMap: Record<string, string> = { 'zh-TW': 'zh-TW', en: 'en-US', ja: 'ja-JP' };
  const dateFmtLocale = dateLocaleMap[currentLang] ?? 'zh-TW';
  const date = new Date(reading.timestamp);
  const dateStr = date.toLocaleDateString(dateFmtLocale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = date.toLocaleTimeString(dateFmtLocale, {
    hour: '2-digit',
    minute: '2-digit',
  });

  // interpretationHtml 已被 InterpretationSections 取代，但追問 HTML 仍需要
  const _interpretationReady = isExpanded && Boolean(reading.interpretation);

  const followUpHtmls = useMemo(
    () =>
      isExpanded && reading.followUps?.length
        ? reading.followUps.map((fu) =>
            marked.parse(stripFollowUpCardHeading(fu.answer), { async: false }) as string,
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
                {spreadI18nName || spread?.name || reading.spreadType}
              </span>
              {followUpCount > 0 && (
                <span className="rounded bg-[var(--color-accent-gold)]/20 px-2 py-0.5 text-[11px] font-medium text-[var(--color-accent-gold)]">
                  {t.history.followUpCount.replace('{count}', String(followUpCount))}
                </span>
              )}
              {isForeignLang && (
                <span className="rounded bg-[var(--color-accent-mystic)]/20 px-2 py-0.5 text-[11px] font-medium text-[var(--color-accent-mystic)]">
                  {langLabels?.[readingLocale] ?? readingLocale}
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
          {_interpretationReady && (
            <InterpretationSections markdown={reading.interpretation} animated={false} />
          )}

          {/* 占卜筆記 */}
          <NotesSection
            notes={notesValue}
            expanded={notesExpanded}
            saved={notesSaved}
            t={t}
            onToggle={() => setNotesExpanded(!notesExpanded)}
            onChange={(val) => {
              setNotesValue(val);
              setNotesSaved(false);
            }}
            onSave={() => {
              onUpdateNotes(notesValue);
              setNotesSaved(true);
            }}
          />

          {/* 追問紀錄 */}
          {reading.followUps && reading.followUps.length > 0 && (
            <div className="mt-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-[var(--color-border)]" />
                <span className="text-xs font-medium text-[var(--color-accent-gold)]">
                  {t.history.followUpRecord}
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
                        <p className="mb-2 text-xs text-[var(--color-text-muted)]">{t.history.followUpGuideCard}</p>
                        <CardFace drawnCard={fu.drawnCard} className="!w-24" />
                        <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                          {fu.drawnCard.card.name} — {fu.drawnCard.isReversed ? t.reading.reversed : t.reading.upright}
                        </p>
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
              {t.history.followUpCost.replace('{cost}', String(FOLLOW_UP_CREDIT_COST))}
            </p>

            {/* 模式切換 */}
            {!isFollowingUp && !isStreaming && (
              <div className="mb-3 flex justify-center">
                <div className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-0.5">
                  <button
                    onClick={() => setFollowUpMode('card')}
                    className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold transition-all ${
                      followUpMode === 'card'
                        ? 'bg-[var(--color-accent-gold)]/20 text-[var(--color-accent-gold)] shadow-sm'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                    }`}
                  >
                    ✦ {t.reading.modeCard}
                  </button>
                  <button
                    onClick={() => setFollowUpMode('chat')}
                    className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold transition-all ${
                      followUpMode === 'chat'
                        ? 'bg-[var(--color-accent-purple)]/20 text-[var(--color-accent-purple)] shadow-sm'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                    }`}
                  >
                    💬 {t.reading.modeChat}
                  </button>
                </div>
              </div>
            )}

            {/* 建議追問方向 */}
            {suggestedQuestions.length > 0 && !isFollowingUp && !isStreaming && (
              <div className="mb-4 animate-fade-in">
                <p className="mb-2 text-center text-xs text-[var(--color-text-muted)]">
                  ✦ {t.reading.suggestedHint} ✦
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestedQuestions.map((sq, i) => (
                    <button
                      key={i}
                      onClick={() => onFollowUp(sq, followUpMode === 'card')}
                      disabled={!canFollowUp}
                      className="cursor-pointer rounded-full border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] transition-all hover:border-[var(--color-accent-gold)] hover:text-[var(--color-accent-gold)] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {sq}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isFollowingUp ? (
              <MysticProgress title={t.history.followUpLoading} />
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <AutoGrowTextarea
                  value={followUpInput}
                  onChange={setFollowUpInput}
                  onSubmit={() => {
                    if (followUpInput.trim() && canFollowUp) {
                      onFollowUp(followUpInput.trim(), followUpMode === 'card');
                      setFollowUpInput('');
                    }
                  }}
                  placeholder={followUpMode === 'card' ? t.history.followUpPlaceholder : (t.reading.chatPlaceholder ?? t.history.followUpPlaceholder)}
                  maxLength={300}
                  minRows={1}
                  maxRows={4}
                  className="min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none transition-colors focus:border-[var(--color-accent-gold)]"
                />
                <button
                  onClick={() => {
                    if (followUpInput.trim() && canFollowUp) {
                      onFollowUp(followUpInput.trim(), followUpMode === 'card');
                      setFollowUpInput('');
                    }
                  }}
                  disabled={!followUpInput.trim() || !canFollowUp}
                  className="cursor-pointer rounded-lg bg-[var(--color-accent-gold)] px-4 py-2.5 text-sm font-bold text-[var(--color-bg-primary)] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {followUpMode === 'card' ? t.history.followUpButton : (t.reading.chatButton ?? t.history.followUpButton)}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

/** 占卜筆記區塊 */
function NotesSection({
  notes,
  expanded,
  saved,
  t,
  onToggle,
  onChange,
  onSave,
}: {
  notes: string;
  expanded: boolean;
  saved: boolean;
  t: import('../../services/i18n').Locale;
  onToggle: () => void;
  onChange: (val: string) => void;
  onSave: () => void;
}) {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const historyT = t.history as Record<string, unknown>;

  const handleChange = useCallback(
    (val: string) => {
      onChange(val);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => onSave(), 1500);
    },
    [onChange, onSave],
  );

  return (
    <div className="mt-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
      <button
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center gap-2 bg-transparent px-4 py-3 text-left text-sm font-medium text-[var(--color-accent-gold)] transition-colors hover:bg-[var(--color-accent-gold)]/5"
      >
        <span>📝</span>
        <span>{historyT.notesLabel as string}</span>
        {notes && !expanded && (
          <span className="ml-auto truncate max-w-[200px] text-xs text-[var(--color-text-muted)]">
            {notes.slice(0, 50)}{notes.length > 50 ? '…' : ''}
          </span>
        )}
        {saved && expanded && (
          <span className="ml-auto text-xs text-emerald-400">{historyT.notesSaved as string}</span>
        )}
        <span
          className="text-xs text-[var(--color-text-muted)] transition-transform duration-200"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', marginLeft: saved || (notes && !expanded) ? 0 : 'auto' }}
        >
          ▾
        </span>
      </button>
      {expanded && (
        <div className="border-t border-[var(--color-border)] px-4 py-3 animate-fade-in">
          <textarea
            value={notes}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={onSave}
            placeholder={historyT.notesPlaceholder as string}
            rows={4}
            className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none transition-colors focus:border-[var(--color-accent-gold)]"
          />
        </div>
      )}
    </div>
  );
}

/** 歷史趨勢概覽 */
function TrendSummary({ readings, t }: { readings: Reading[]; t: import('../../services/i18n').Locale }) {
  const [now] = useState(() => Date.now());
  const stats = useMemo(() => {
    if (readings.length < 2) return null;

    // 統計最常出現的牌
    const cardCounts = new Map<string, number>();
    for (const r of readings) {
      for (const dc of r.drawnCards) {
        const key = dc.card.name;
        cardCounts.set(key, (cardCounts.get(key) ?? 0) + 1);
      }
    }
    const topCards = Array.from(cardCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    // 統計主題趨勢（從問題中提取關鍵字）
    const topicKeywords: Record<string, string[]> = {
      '愛情': ['愛情', '感情', '戀愛', '關係', '對象', '另一半', '伴侶'],
      '事業': ['事業', '工作', '職場', '升遷', '面試', '轉職'],
      '財運': ['財', '錢', '投資', '理財', '收入'],
      '學業': ['學業', '考試', '學習', '升學'],
      '人際': ['人際', '朋友', '社交', '相處'],
    };
    const topicCounts = new Map<string, number>();
    for (const r of readings) {
      for (const [topic, keywords] of Object.entries(topicKeywords)) {
        if (keywords.some((kw) => r.question.includes(kw))) {
          topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
        }
      }
    }
    const topTopic = Array.from(topicCounts.entries()).sort((a, b) => b[1] - a[1])[0];

    // 最近 7 天佔卜次數
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const recentCount = readings.filter((r) => r.timestamp > weekAgo).length;

    return { topCards, topTopic, recentCount, total: readings.length };
  }, [now, readings]);

  if (!stats) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 w-full max-w-2xl rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[var(--shadow-card)]"
    >
      <h2 className="mb-4 text-center text-sm font-bold tracking-wider text-[var(--color-accent-gold)]">
        ✦ {t.history.trendTitle} ✦
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">{stats.total}</p>
          <p className="text-xs text-[var(--color-text-muted)]">{t.history.totalReadings}</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">{stats.recentCount}</p>
          <p className="text-xs text-[var(--color-text-muted)]">{t.history.last7Days}</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-[var(--color-accent-gold)]">
            {stats.topTopic ? stats.topTopic[0] : '—'}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">{t.history.topTopic}</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-[var(--color-accent-purple-light)]">
            {stats.topCards[0]?.[0] ?? '—'}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">{t.history.topCard}</p>
        </div>
      </div>
      {stats.topCards.length > 1 && (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {stats.topCards.map(([name, count]) => (
            <span
              key={name}
              className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-1 text-[11px] text-[var(--color-text-secondary)]"
            >
              {name} ×{count}
            </span>
          ))}
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
