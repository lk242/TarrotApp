import { useMemo, useState, useRef, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { marked } from 'marked';
import type { SpreadType } from '../../models/spread';
import { SPREADS } from '../../models/spread';
import { FOLLOW_UP_CREDIT_COST, QUESTION_CREDIT_COST, YES_NO_CREDIT_COST } from '../../models/credits';
import { useTarotSession } from '../../controllers/useTarotSession';
import { useAuth } from '../../controllers/useAuth';
import { useCredits } from '../../controllers/useCredits';
import { stripFollowUpCardHeading } from '../../utils/follow-up';
import { useQuerentSignals } from '../../controllers/useQuerentSignals';
import { shareReading } from '../../services/share-service';
import { captureElement, shareScreenshot } from '../../services/screenshot-service';
import CardFace from '../components/tarot/CardFace';
import ShuffleAnimation from '../animations/ShuffleAnimation';
import CutAnimation from '../animations/CutAnimation';
import DrawAnimation from '../animations/DrawAnimation';
import CelticCrossLayout from '../components/tarot/CelticCrossLayout';
import InterpretationSections from '../components/tarot/InterpretationSections';
import ReadingShareCard from '../components/tarot/ReadingShareCard';
import PushPrompt from '../components/notification/PushPrompt';
import AutoGrowTextarea from '../components/ui/AutoGrowTextarea';
import { usePushNotification } from '../../controllers/usePushNotification';
import { useI18n } from '../../controllers/useI18n';
import { useTheme } from '../../controllers/useTheme';

/** 主題卡片靜態資料（label 和 prompt 都從 i18n 取） */
type TopicKey = 'love' | 'career' | 'wealth' | 'fortune' | 'spirit' | 'social' | 'study' | 'free';
const TOPIC_KEYS: TopicKey[] = ['love', 'career', 'wealth', 'fortune', 'spirit', 'social', 'study', 'free'];

/** SpreadType → locale key 對照 */
const SPREAD_I18N_KEY: Record<SpreadType, 'single' | 'threeCard' | 'celticCross' | 'yesNo'> = {
  single: 'single',
  'three-card': 'threeCard',
  'celtic-cross': 'celticCross',
  'yes-no': 'yesNo',
};

/**
 * 占卜主頁面。
 *
 * 這裡只負責把 useTarotSession 的 phase 映射成畫面：
 * idle → shuffling → cutting → drawing → interpreting → complete。
 * 真正的抽牌、AI 呼叫、紀錄儲存都在 Controller/Service 層完成。
 */
export default function ReadingPage() {
  const [searchParams] = useSearchParams();
  const spreadType = (searchParams.get('spread') || 'single') as SpreadType;
  const spread = SPREADS[spreadType] || SPREADS.single;
  const { user } = useAuth();
  const { balance, loading: creditLoading } = useCredits();
  const { t } = useI18n();
  const posKey = SPREAD_I18N_KEY[spreadType] ?? 'single';
  const positionNames = (t.positions as Record<string, string[]>)?.[posKey] ?? [];
  const { onTopicChange, onTypingStart, resetSignals, buildContext } = useQuerentSignals(user?.uid);
  const { theme, themeImageBase } = useTheme();
  const iconExt = theme === 'light' ? 'png' : 'webp';
  const push = usePushNotification(user?.uid ?? null);
  /** 記錄使用者選擇的主題標籤（非 prompt 文字） */
  const selectedTopicLabel = useRef('');

  const {
    phase, question, setQuestion,
    startReading, onShuffleComplete, onCutComplete, onDrawComplete,
    reset, drawnCards, interpretation,
    suggestedQuestions, followUps, isFollowingUp, isStreaming, askFollowUp,
    error,
  } = useTarotSession(spreadType);

  const [followUpInput, setFollowUpInput] = useState('');
  const [followUpMode, setFollowUpMode] = useState<'card' | 'chat'>('card');
  const [shareStatus, setShareStatus] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);
  const followUpEndRef = useRef<HTMLDivElement>(null);
  const readingCost = spreadType === 'yes-no' ? YES_NO_CREDIT_COST : QUESTION_CREDIT_COST;
  const canFollowUp = Boolean(user) && balance >= FOLLOW_UP_CREDIT_COST;
  const blockedReason = !user
    ? t.credits.loginRequired
    : balance < readingCost
      ? t.credits.notEnough
      : '';

  // interpretationHtml 已移除，改用 InterpretationSections 元件渲染

  const followUpHtmls = useMemo(
    () =>
      followUps.map((f) => ({
        question: f.question,
        html: marked.parse(stripFollowUpCardHeading(f.answer), { async: false }) as string,
        drawnCard: f.drawnCard,
      })),
    [followUps],
  );

  // 新追問出現時自動滾動到底部
  useEffect(() => {
    if (followUps.length > 0) {
      followUpEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [followUps.length]);

  const isDrawing = phase === 'drawing';

  return (
    <div className={`flex flex-1 flex-col items-center px-6 ${isDrawing ? 'py-4' : 'py-20'}`}>
      {/* 全螢幕遮罩：只在初次解讀 (interpreting) 時使用，追問改用 inline loading */}
      {phase === 'interpreting' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 shadow-[var(--shadow-card)]"
          >
            {/* 載入進度條 */}
            <div className="mb-5 h-1 overflow-hidden rounded-full bg-[var(--color-bg-secondary)]">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent-purple)] via-[var(--color-accent-gold)] to-[var(--color-accent-mystic)]"
                initial={{ x: '-100%' }}
                animate={{ x: ['-100%', '120%'] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>

            {/* 標題 */}
            <div className="mb-4 flex items-center gap-2">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent-gold)]"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.25 }}
                  />
                ))}
              </div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                {t.reading.interpreting}
              </p>
            </div>

            {/* 已抽到的牌 — 關鍵字預覽 */}
            <div className="space-y-3">
              {drawnCards.map((dc, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.15 }}
                  className="flex items-start gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3"
                >
                  <CardFace drawnCard={dc} className="h-[54px] w-[34px] flex-shrink-0 rounded-md overflow-hidden" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">
                      {dc.card.name}
                      {dc.isReversed && (
                        <span className="ml-1.5 text-[10px] text-[var(--color-accent-gold)]">↓ 逆位</span>
                      )}
                    </p>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--color-text-muted)]">
                      {(dc.isReversed ? dc.card.reversedKeywords : dc.card.keywords).slice(0, 3).join(' · ')}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {!isDrawing && (
        <h1 className="mb-2 text-2xl font-bold text-[var(--color-accent-gold)] animate-fade-in">
          {t.spreads[SPREAD_I18N_KEY[spreadType]]?.name ?? spread.name}
        </h1>
      )}
      {!isDrawing && (
        <p className="mb-10 text-sm text-[var(--color-text-muted)]">{t.spreads[SPREAD_I18N_KEY[spreadType]]?.description ?? spread.description}</p>
      )}
      {!isDrawing && (
        <div className="mb-6 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-2 text-xs text-[var(--color-text-secondary)]">
        {user ? (
          <>
            {creditLoading ? t.credits.loadingPoints : t.credits.currentPoints.replace('{points}', String(balance))}
            {', '}
            {t.credits.costSummary
              .replace('{readingCost}', String(readingCost))
              .replace('{followUpCost}', String(FOLLOW_UP_CREDIT_COST))}
          </>
        ) : (
          <>
            {t.credits.loginHint}
            {', '}
            {t.credits.costSummary
              .replace('{readingCost}', String(readingCost))
              .replace('{followUpCost}', String(FOLLOW_UP_CREDIT_COST))}
          </>
        )}
      </div>
      )}

      {(error || (blockedReason && user)) && (
        <div className="mb-6 w-full max-w-xl rounded-lg border border-[var(--color-accent-gold)]/30 bg-[var(--color-accent-gold)]/10 p-4 text-center text-sm text-[var(--color-text-secondary)]">
          <p>{error || blockedReason}</p>
          {error && phase === 'idle' ? (
            <button
              onClick={() => { reset(); }}
              className="mt-2 cursor-pointer rounded-lg border border-[var(--color-accent-gold)]/40 bg-transparent px-4 py-1.5 text-xs font-bold text-[var(--color-accent-gold)] transition-colors hover:bg-[var(--color-accent-gold)]/10"
            >
              {t.retry}
            </button>
          ) : !user || balance < readingCost ? (
            <Link
              to="/billing"
              className="mt-2 inline-block font-bold text-[var(--color-accent-gold)] no-underline"
            >
              {t.credits.viewPlans}
            </Link>
          ) : null}
        </div>
      )}

      {/* === idle：選擇主題 + 輸入問題。此階段尚未抽牌，可自由改問題。 === */}
      {phase === 'idle' && (
        <div key="idle" className="w-full max-w-xl animate-fade-in-up">
          {/* 主題快速選擇 */}
          <p className="mb-3 text-center text-sm text-[var(--color-text-secondary)]">
            {t.reading.topicPrompt}
          </p>
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {TOPIC_KEYS.map((key) => {
              const label = t.topics[key];
              const prompt = (t.topicPrompts as Record<string, string>)[key] ?? '';
              return (
                <button
                  key={key}
                  onClick={() => { setQuestion(prompt); selectedTopicLabel.current = label; onTopicChange(label); }}
                  className={`group flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                    question === prompt
                      ? 'border-[var(--color-accent-gold)] bg-[var(--color-bg-card)] shadow-[var(--shadow-glow)]'
                      : 'border-[var(--color-border)] bg-[var(--color-bg-card)] hover:border-[var(--color-border-hover)]'
                  }`}
                >
                  <img
                    src={`${themeImageBase}/icons/${key}.${iconExt}`}
                    alt={label}
                    className="h-24 w-24 object-contain transition-transform group-hover:scale-110"
                  />
                  <span className="text-xs font-bold tracking-wider text-[var(--color-text-primary)]">
                    {label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 自由輸入 */}
          <AutoGrowTextarea
            value={question}
            onChange={(v) => { setQuestion(v); onTypingStart(); }}
            placeholder={t.reading.inputPlaceholder}
            maxLength={500}
            minRows={2}
            maxRows={6}
            className="mb-5 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none transition-colors focus:border-[var(--color-accent-gold)]"
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              if (user && balance < readingCost) {
                setShowCreditModal(true);
              } else {
                startReading();
              }
            }}
            disabled={creditLoading}
            className="w-full cursor-pointer rounded-lg border border-[var(--color-accent-gold)]/30 bg-gradient-to-r from-[var(--color-accent-gold)]/20 via-[var(--color-accent-gold)]/10 to-[var(--color-accent-purple)]/20 px-6 py-3.5 text-base font-bold tracking-wider text-[var(--color-accent-gold)] shadow-[var(--shadow-glow)] transition-all hover:border-[var(--color-accent-gold)]/50 hover:shadow-[var(--shadow-card-hover)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {user
              ? `☉ ${t.reading.startButton.replace('{cost}', String(readingCost))}`
              : `✦ ${(t.reading as Record<string, string>).freeTrialButton ?? '免費體驗抽牌'}`
            }
          </motion.button>
        </div>
      )}

      {/* === shuffling：洗牌動畫 === */}
      {phase === 'shuffling' && (
        <div key="shuffling" className="animate-fade-in">
          <ShuffleAnimation onComplete={onShuffleComplete} />
        </div>
      )}

      {/* === cutting：切牌動畫 === */}
      {phase === 'cutting' && (
        <div key="cutting" className="animate-fade-in">
          <CutAnimation onComplete={onCutComplete} />
        </div>
      )}

      {/* === drawing：互動抽牌 === */}
      {phase === 'drawing' && (
        <div key="drawing" className="animate-fade-in">
          <DrawAnimation
            spread={spread}
            drawnCards={drawnCards}
            onComplete={async () => {
              const ctx = await buildContext(question, selectedTopicLabel.current);
              onDrawComplete({ topic: selectedTopicLabel.current, querentSummary: ctx.summary });
            }}
          />
        </div>
      )}

      {/* === interpreting：解讀等待 === */}
      {phase === 'interpreting' && (
        <div key="interpreting" className="flex flex-col items-center gap-8 animate-fade-in">
          {spreadType === 'celtic-cross' ? (
            <CelticCrossLayout drawnCards={drawnCards} />
          ) : (
            <div className="flex flex-wrap justify-center gap-4">
              {drawnCards.map((dc) => (
                <CardFace key={dc.card.id} drawnCard={dc} positionLabel={positionNames[drawnCards.indexOf(dc)]} />
              ))}
            </div>
          )}
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="h-2 w-2 rounded-full bg-[var(--color-accent-gold)]"
                  animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
                />
              ))}
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">{t.reading.oracleInterpreting}</p>
          </div>
        </div>
      )}

      {/* === free trial：未登入用戶抽完牌，顯示牌面 + 登入 CTA === */}
      {phase === 'complete' && !interpretation && !user && (
        <div key="trial" className="w-full max-w-2xl animate-fade-in-up">
          {/* 問題回顯 */}
          {question && (
            <div className="mb-6 text-center animate-fade-in">
              <span className="text-xs tracking-wider text-[var(--color-text-muted)] uppercase">{t.reading.yourQuestion}</span>
              <p className="mt-1 text-base text-[var(--color-text-primary)]">「{question}」</p>
            </div>
          )}

          {/* 牌面 */}
          <div className="mb-8 flex flex-wrap justify-center gap-4">
            {drawnCards.map((dc) => (
              <CardFace key={dc.card.id} drawnCard={dc} className="!w-28" positionLabel={
                (t.positions as Record<string, string[]>)?.[SPREAD_I18N_KEY[spreadType]]?.[
                  drawnCards.indexOf(dc)
                ] ?? dc.position
              } />
            ))}
          </div>

          {/* 登入 CTA */}
          <div className="rounded-xl border border-[var(--color-accent-gold)]/30 bg-gradient-to-b from-[var(--color-accent-gold)]/10 to-transparent p-8 text-center">
            <div className="mb-3 text-3xl">✦</div>
            <h3 className="mb-2 text-lg font-bold text-[var(--color-accent-gold)]">
              {(t.reading as Record<string, string>).trialTitle ?? '你的牌已翻開'}
            </h3>
            <p className="mb-5 text-sm text-[var(--color-text-secondary)]">
              {(t.reading as Record<string, string>).trialDesc ?? '登入或註冊即可獲得免費 AI 解讀額度，解鎖完整的塔羅指引'}
            </p>
            <Link
              to="/billing"
              className="inline-block rounded-lg bg-[var(--color-accent-gold)] px-8 py-3 text-sm font-bold text-[var(--color-bg-primary)] no-underline shadow-[var(--shadow-glow)] transition-all hover:brightness-110"
            >
              {(t.reading as Record<string, string>).trialCTA ?? '免費註冊，解鎖解讀'}
            </Link>
            <p className="mt-3 text-xs text-[var(--color-text-muted)]">
              {(t.reading as Record<string, string>).trialHint ?? '新會員自動獲得 200 解讀額度'}
            </p>
          </div>

          {/* 重新抽牌 */}
          <div className="mt-6 text-center">
            <button
              onClick={() => { reset(); resetSignals(); selectedTopicLabel.current = ''; }}
              className="cursor-pointer rounded-lg border border-[var(--color-border)] bg-transparent px-5 py-2 text-sm text-[var(--color-text-secondary)] transition-all hover:border-[var(--color-accent-gold)]/40 hover:text-[var(--color-accent-gold)]"
            >
              ↻ {t.reading.readAgain}
            </button>
          </div>
        </div>
      )}

      {/* === complete：顯示結果、追問、重抽。串流進行中也在此渲染。 === */}
      {phase === 'complete' && interpretation && (
        <div key="complete" className="w-full max-w-2xl animate-fade-in-up">
          {/* 問題回顯 */}
          {question && (
            <div className="mb-6 text-center animate-fade-in">
              <span className="text-xs tracking-wider text-[var(--color-text-muted)] uppercase">{t.reading.yourQuestion}</span>
              <p className="mt-1 text-base text-[var(--color-text-secondary)] italic">
                「{question}」
              </p>
            </div>
          )}

          {/* 牌面區 */}
          {spreadType === 'celtic-cross' ? (
            <div className="mb-8 animate-fade-in">
              <CelticCrossLayout drawnCards={drawnCards} />
            </div>
          ) : (
            <div className="mb-8 flex flex-wrap justify-center gap-5">
              {drawnCards.map((dc, i) => (
                <div
                  key={dc.card.id}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${i * 0.12}s` }}
                >
                  <CardFace drawnCard={dc} positionLabel={positionNames[i]} />
                </div>
              ))}
            </div>
          )}

          {/* 分隔線 */}
          <div className="mx-auto mb-8 flex items-center gap-4 max-w-xs">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[var(--color-accent-gold)]/30" />
            <span className="text-sm text-[var(--color-accent-gold)]">✦ {t.reading.oracleReading} ✦</span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[var(--color-accent-gold)]/30" />
          </div>

          {/* 解讀內容 */}
          {isStreaming ? (
            /* 串流進行中：單卡直接渲染 markdown，不拆段不動畫 */
            <div className="interpretation-panel rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 md:p-8 shadow-[var(--shadow-card)]">
              <div
                className="max-w-none text-[var(--color-text-primary)] leading-relaxed"
                dangerouslySetInnerHTML={{ __html: marked.parse(interpretation, { async: false }) as string }}
              />
              <span className="inline-block w-0.5 h-4 bg-[var(--color-accent-gold)] animate-pulse ml-0.5 align-text-bottom" />
            </div>
          ) : (
            /* 串流完成 / 非串流：使用 InterpretationSections 分段顯示 */
            <div className="animate-fade-in">
              <InterpretationSections markdown={interpretation} animated={false} />
            </div>
          )}

          {/* === 追問對話區 === */}
          {followUpHtmls.length > 0 && (
            <div className="mt-6 space-y-6">
              {/* 追問分隔線 */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-[var(--color-border)]" />
                <span className="text-xs font-medium text-[var(--color-accent-gold)]">{t.reading.followUpSection}</span>
                <div className="h-px flex-1 bg-[var(--color-border)]" />
              </div>

              {followUpHtmls.map((f, i) => (
                <div key={i} className="animate-fade-in-up">
                  {/* 使用者追問 */}
                  <div className="mb-3 flex justify-end">
                    <div className="max-w-[80%] rounded-xl rounded-br-sm bg-[var(--color-accent-purple)]/20 px-4 py-2.5 text-sm text-[var(--color-text-primary)]">
                      {f.question}
                    </div>
                  </div>

                  {/* 追問指引牌 */}
                  {f.drawnCard && (
                    <div className="mb-4 flex justify-center animate-fade-in">
                      <div className="text-center">
                        <p className="mb-2 text-xs text-[var(--color-accent-gold)]">✦ {t.reading.followUpGuideCard} ✦</p>
                        <CardFace drawnCard={f.drawnCard} className="!w-32" positionLabel={t.reading.followUpGuidePosition} />
                        <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                          {f.drawnCard.card.name} — {f.drawnCard.isReversed ? t.reading.reversed : t.reading.upright}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* AI 回覆 */}
                  <div
                    className="interpretation-panel rounded-xl border border-[var(--color-accent-gold)]/20 bg-[var(--color-bg-card)] p-5 md:p-6 shadow-[var(--shadow-card)]"
                  >
                    <div
                      className="max-w-none text-[var(--color-text-primary)] leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: f.html }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 追問載入中 */}
          {isFollowingUp && (
            <div className="mt-4 flex items-center justify-center gap-2 animate-fade-in">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="h-2 w-2 rounded-full bg-[var(--color-accent-gold)]"
                  animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
                />
              ))}
              <span className="ml-2 text-xs text-[var(--color-text-secondary)]">{t.reading.followUpLoading}</span>
            </div>
          )}

          {/* 追問模式切換 + 建議追問 + 輸入 */}
          {!isFollowingUp && !isStreaming && (
            <div className="mt-6 animate-fade-in">
              {/* 模式切換 */}
              <div className="mb-4 flex justify-center">
                <div className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-0.5">
                  <button
                    onClick={() => setFollowUpMode('card')}
                    className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                      followUpMode === 'card'
                        ? 'bg-[var(--color-accent-gold)]/20 text-[var(--color-accent-gold)] shadow-sm'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                    }`}
                  >
                    ✦ {t.reading.modeCard}
                  </button>
                  <button
                    onClick={() => setFollowUpMode('chat')}
                    className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                      followUpMode === 'chat'
                        ? 'bg-[var(--color-accent-purple)]/20 text-[var(--color-accent-purple)] shadow-sm'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                    }`}
                  >
                    💬 {t.reading.modeChat}
                  </button>
                </div>
              </div>
              <p className="mb-3 text-center text-xs text-[var(--color-text-muted)]">
                {followUpMode === 'card' ? t.reading.modeCardHint : t.reading.modeChatHint}
              </p>

              {/* 建議追問按鈕 */}
              {suggestedQuestions.length > 0 && (
                <div className="mb-4">
                  <p className="mb-3 text-center text-xs text-[var(--color-text-muted)]">
                    ✦ {t.reading.suggestedHint} ✦
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {suggestedQuestions.map((sq, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setFollowUpInput('');
                          askFollowUp(sq, followUpMode === 'card');
                        }}
                        disabled={!canFollowUp}
                        className="cursor-pointer rounded-full border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2 text-xs text-[var(--color-text-secondary)] transition-all hover:border-[var(--color-accent-gold)] hover:text-[var(--color-accent-gold)] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {sq}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 自由追問輸入 */}
              <div className="flex w-full items-end gap-2">
                <AutoGrowTextarea
                  value={followUpInput}
                  onChange={setFollowUpInput}
                  onSubmit={() => {
                    if (followUpInput.trim() && canFollowUp) {
                      askFollowUp(followUpInput.trim(), followUpMode === 'card');
                      setFollowUpInput('');
                    }
                  }}
                  placeholder={followUpMode === 'card' ? t.reading.followUpPlaceholder : t.reading.chatPlaceholder}
                  maxLength={300}
                  minRows={1}
                  maxRows={4}
                  className="min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none transition-colors focus:border-[var(--color-accent-gold)]"
                />
                <button
                  onClick={() => {
                    if (followUpInput.trim() && canFollowUp) {
                      askFollowUp(followUpInput.trim(), followUpMode === 'card');
                      setFollowUpInput('');
                    }
                  }}
                  disabled={!followUpInput.trim() || !canFollowUp}
                  className="cursor-pointer rounded-lg bg-[var(--color-accent-gold)] px-4 py-2.5 text-sm font-bold text-[var(--color-bg-primary)] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {followUpMode === 'card' ? t.reading.followUpButton : t.reading.chatButton}
                </button>
              </div>
            </div>
          )}

          <div ref={followUpEndRef} />

          {/* 截圖分享卡片（隱藏在螢幕外，供 html2canvas 截圖用） */}
          <ReadingShareCard
            ref={shareCardRef}
            spreadName={spread.name}
            question={question}
            drawnCards={drawnCards}
            interpretationPreview={
              interpretation
                .replace(/^#{1,3}\s+.*/gm, '') // 去掉 markdown 標題
                .replace(/[*_`]/g, '')          // 去掉格式符號
                .trim()
                .slice(0, 200) + '…'
            }
            brandName={t.appName}
            uprightLabel={t.reading.upright}
            reversedLabel={t.reading.reversed}
          />

          {/* 底部操作（串流進行中隱藏） */}
          {!isStreaming && <div className="mt-8 flex flex-col items-center gap-3">
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => { reset(); resetSignals(); selectedTopicLabel.current = ''; }}
                className="cursor-pointer rounded-lg border border-[var(--color-accent-gold)]/50 bg-[var(--color-accent-gold)]/15 px-6 py-2.5 font-bold text-[var(--color-accent-gold)] transition-all hover:border-[var(--color-accent-gold)]/70 hover:bg-[var(--color-accent-gold)]/25"
              >
                ✦ {t.reading.readAgain}
              </button>
              <button
                onClick={async () => {
                  setShareStatus('');
                  const cardNames = drawnCards.map((dc) => `${dc.card.name}${dc.isReversed ? '(逆)' : ''}`).join('、');
                  const method = await shareReading({
                    title: `${spread.name} — ${cardNames}`,
                    description: question
                      ? `「${question.slice(0, 40)}」的塔羅占卜結果，來看看命運的指引吧！`
                      : '來看看塔羅牌對命運的指引吧！',
                    url: window.location.origin,
                  });
                  if (method === 'clipboard') {
                    setShareStatus(t.share.copied);
                    setTimeout(() => setShareStatus(''), 3000);
                  } else if (method === 'line') {
                    setShareStatus(t.share.sharedToLine);
                    setTimeout(() => setShareStatus(''), 3000);
                  }
                }}
                className="cursor-pointer rounded-lg border border-[var(--color-accent-gold)]/40 bg-[var(--color-accent-gold)]/10 px-5 py-2.5 font-bold text-[var(--color-accent-gold)] transition-all hover:bg-[var(--color-accent-gold)]/20"
              >
                {t.reading.share}
              </button>
              <button
                onClick={async () => {
                  if (!shareCardRef.current || isCapturing) return;
                  setIsCapturing(true);
                  setShareStatus(t.share.generating);
                  try {
                    const blob = await captureElement(shareCardRef.current);
                    if (blob) {
                      const cardNames = drawnCards.map((dc) => `${dc.card.name}${dc.isReversed ? '(逆)' : ''}`).join('、');
                      await shareScreenshot(blob, `${spread.name} — ${cardNames}`);
                      setShareStatus(t.share.screenshotSaved);
                    } else {
                      setShareStatus(t.share.screenshotFailed);
                    }
                  } catch {
                    setShareStatus(t.share.screenshotFailed);
                  } finally {
                    setIsCapturing(false);
                    setTimeout(() => setShareStatus(''), 3000);
                  }
                }}
                disabled={isCapturing}
                className="cursor-pointer rounded-lg border border-[var(--color-accent-purple)]/40 bg-[var(--color-accent-purple)]/10 px-5 py-2.5 font-bold text-[var(--color-accent-purple)] transition-all hover:bg-[var(--color-accent-purple)]/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isCapturing ? t.reading.capturing : t.reading.screenshotShare}
              </button>
            </div>
            {shareStatus && (
              <p className="text-xs text-[var(--color-accent-gold)] animate-fade-in">{shareStatus}</p>
            )}
            {/* 推播通知提示 — 占卜完成後引導開啟 */}
            <PushPrompt
              supported={push.supported}
              granted={push.granted}
              requesting={push.requesting}
              onRequest={push.requestPush}
            />

            <Link
              to="/history"
              className="text-xs text-[var(--color-text-muted)] no-underline transition-colors hover:text-[var(--color-accent-gold)]"
            >
              {t.reading.viewHistory}
            </Link>
          </div>}
        </div>
      )}

      {/* 點數不足引導 Modal */}
      <AnimatePresence>
        {showCreditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-end justify-center sm:items-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
            onClick={() => setShowCreditModal(false)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl border border-[var(--color-border)] p-6"
              style={{ backgroundColor: 'var(--color-bg-primary)' }}
            >
              {/* 圖示 */}
              <div className="mb-4 flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--color-accent-gold)]/30 bg-[var(--color-accent-gold)]/10 text-2xl">
                  ✦
                </div>
              </div>

              <h3 className="mb-1 text-center text-lg font-bold text-[var(--color-accent-gold)]">
                服務額度不足
              </h3>
              <p className="mb-1 text-center text-sm text-[var(--color-text-secondary)]">
                目前餘額 <span className="font-bold text-[var(--color-text-primary)]">{balance}</span> 點，
                本次占卜需要 <span className="font-bold text-[var(--color-accent-gold)]">{readingCost}</span> 點
              </p>
              <p className="mb-6 text-center text-xs text-[var(--color-text-muted)]">
                購買額度後即可繼續占卜，額度不會過期
              </p>

              {/* 方案預覽 */}
              <div className="mb-5 grid grid-cols-3 gap-2">
                {[
                  { label: '入門', points: 100, price: 'NT$99' },
                  { label: '標準', points: 300, price: 'NT$249', recommended: true },
                  { label: '超值', points: 600, price: 'NT$399' },
                ].map((plan) => (
                  <div
                    key={plan.label}
                    className={`rounded-xl border p-3 text-center ${
                      plan.recommended
                        ? 'border-[var(--color-accent-gold)] bg-[var(--color-accent-gold)]/10'
                        : 'border-[var(--color-border)] bg-[var(--color-bg-card)]'
                    }`}
                  >
                    {plan.recommended && (
                      <p className="mb-1 text-[9px] font-bold tracking-wider text-[var(--color-accent-gold)]">推薦</p>
                    )}
                    <p className="text-sm font-bold text-[var(--color-text-primary)]">{plan.points} 點</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{plan.price}</p>
                  </div>
                ))}
              </div>

              {/* 按鈕 */}
              <Link
                to="/billing"
                onClick={() => setShowCreditModal(false)}
                className="block w-full rounded-lg bg-[var(--color-accent-gold)] py-3 text-center text-sm font-bold text-[var(--color-bg-primary)] no-underline transition-opacity hover:opacity-90"
              >
                前往購買額度
              </Link>
              <button
                onClick={() => setShowCreditModal(false)}
                className="mt-3 w-full cursor-pointer rounded-lg border border-[var(--color-border)] bg-transparent py-2.5 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-secondary)]"
              >
                取消
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
