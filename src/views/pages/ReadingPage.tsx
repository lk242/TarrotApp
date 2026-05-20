import { useMemo, useState, useRef, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router';
import { motion } from 'framer-motion';
import { marked } from 'marked';
import type { SpreadType } from '../../models/spread';
import { SPREADS } from '../../models/spread';
import { QUESTION_CREDIT_COST } from '../../models/credits';
import { useTarotSession } from '../../controllers/useTarotSession';
import { useAuth } from '../../controllers/useAuth';
import { useCredits } from '../../controllers/useCredits';
import CardFace from '../components/tarot/CardFace';
import ShuffleAnimation from '../animations/ShuffleAnimation';
import CutAnimation from '../animations/CutAnimation';
import DrawAnimation from '../animations/DrawAnimation';
import CelticCrossLayout from '../components/tarot/CelticCrossLayout';

const TOPIC_CARDS = [
  {
    image: '/images/theme/icons/love.webp',
    label: '愛情',
    hint: '感情運勢與關係',
    prompt: '我想了解我的愛情運勢，目前的感情狀況會如何發展？',
  },
  {
    image: '/images/theme/icons/career.webp',
    label: '事業',
    hint: '工作發展與方向',
    prompt: '我想了解我的事業發展，目前的工作方向是否正確？',
  },
  {
    image: '/images/theme/icons/wealth.webp',
    label: '財運',
    hint: '財務狀況與投資',
    prompt: '我想了解近期的財務運勢，理財上需要注意什麼？',
  },
  {
    image: '/images/theme/icons/fortune.webp',
    label: '整體運勢',
    hint: '生活全方位指引',
    prompt: '請給我一個整體的生活指引，近期需要注意什麼？',
  },
  {
    image: '/images/theme/icons/spirit.webp',
    label: '身心靈',
    hint: '內在成長與健康',
    prompt: '我想了解自己內在的狀態，身心靈方面有什麼需要調整的？',
  },
  {
    image: '/images/theme/icons/social.webp',
    label: '人際關係',
    hint: '社交與人際互動',
    prompt: '我想了解人際關係方面的運勢，如何改善與他人的互動？',
  },
  {
    image: '/images/theme/icons/study.webp',
    label: '學業',
    hint: '學習與考試運',
    prompt: '我想了解學業方面的運勢，目前的學習方向是否正確？',
  },
  {
    image: '/images/theme/icons/free.webp',
    label: '自由提問',
    hint: '自訂你的問題',
    prompt: '',
  },
];

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

  const {
    phase, question, setQuestion,
    startReading, onShuffleComplete, onCutComplete, onDrawComplete,
    reset, drawnCards, interpretation,
    suggestedQuestions, followUps, isFollowingUp, askFollowUp,
    error,
  } = useTarotSession(spreadType);

  const [followUpInput, setFollowUpInput] = useState('');
  const followUpEndRef = useRef<HTMLDivElement>(null);
  const canAsk = Boolean(user) && balance >= QUESTION_CREDIT_COST;
  const blockedReason = !user
    ? '請先登入，註冊或 Google 登入會贈送 100 點。'
    : balance < QUESTION_CREDIT_COST
      ? '點數不足，請先購買點數或訂閱方案。'
      : '';

  const interpretationHtml = useMemo(
    // marked.parse 只在 interpretation 改變時執行，避免每次輸入追問都重算整篇解讀。
    () => (interpretation ? (marked.parse(interpretation, { async: false }) as string) : ''),
    [interpretation],
  );

  const followUpHtmls = useMemo(
    () =>
      followUps.map((f) => ({
        question: f.question,
        html: marked.parse(f.answer, { async: false }) as string,
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

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-20">
      {(phase === 'interpreting' || isFollowingUp) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 text-center shadow-[var(--shadow-card)]">
            <div className="mb-4 flex justify-center gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="h-2.5 w-2.5 rounded-full bg-[var(--color-accent-gold)]"
                  animate={{ opacity: [0.25, 1, 0.25], scale: [0.85, 1.25, 0.85] }}
                  transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.25 }}
                />
              ))}
            </div>
            <p className="text-sm font-bold text-[var(--color-text-primary)]">
              {isFollowingUp ? '正在解析追問' : '正在產生塔羅解讀'}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-secondary)]">
              請稍候，結果完成後會自動顯示。
            </p>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[var(--color-bg-secondary)]">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent-purple)] via-[var(--color-accent-gold)] to-[var(--color-accent-mystic)]"
                initial={{ x: '-100%' }}
                animate={{ x: ['-100%', '120%'] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
          </div>
        </div>
      )}

      <h1 className="mb-2 text-2xl font-bold text-[var(--color-accent-gold)] animate-fade-in">
        {spread.name}
      </h1>
      <p className="mb-10 text-sm text-[var(--color-text-muted)]">{spread.description}</p>
      <div className="mb-6 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-2 text-xs text-[var(--color-text-secondary)]">
        {user ? (
          <>
            目前 {creditLoading ? '讀取點數中...' : `${balance} 點`}，每次占卜或追問消耗 {QUESTION_CREDIT_COST} 點
          </>
        ) : (
          <>登入後可取得 100 點，每次占卜或追問消耗 {QUESTION_CREDIT_COST} 點</>
        )}
      </div>

      {(blockedReason || error) && (
        <div className="mb-6 w-full max-w-xl rounded-lg border border-[var(--color-accent-gold)]/30 bg-[var(--color-accent-gold)]/10 p-4 text-center text-sm text-[var(--color-text-secondary)]">
          <p>{error || blockedReason}</p>
          {!user || balance < QUESTION_CREDIT_COST ? (
            <Link
              to="/billing"
              className="mt-2 inline-block font-bold text-[var(--color-accent-gold)] no-underline"
            >
              查看點數方案
            </Link>
          ) : null}
        </div>
      )}

      {/* === idle：選擇主題 + 輸入問題。此階段尚未抽牌，可自由改問題。 === */}
      {phase === 'idle' && (
        <div key="idle" className="w-full max-w-xl animate-fade-in-up">
          {/* 主題快速選擇 */}
          <p className="mb-3 text-center text-sm text-[var(--color-text-secondary)]">
            選擇一個占卜主題，或自行輸入問題
          </p>
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {TOPIC_CARDS.map((topic) => (
              <button
                key={topic.label}
                onClick={() => setQuestion(topic.prompt)}
                className={`group flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                  question === topic.prompt
                    ? 'border-[var(--color-accent-gold)] bg-[var(--color-bg-card)] shadow-[var(--shadow-glow)]'
                    : 'border-[var(--color-border)] bg-[var(--color-bg-card)] hover:border-[var(--color-border-hover)]'
                }`}
              >
                <img
                  src={topic.image}
                  alt={topic.label}
                  className="h-14 w-14 object-contain transition-transform group-hover:scale-110"
                  style={{ mixBlendMode: 'lighten' }}
                />
                <span className="text-xs font-bold tracking-wider text-[var(--color-text-primary)]">
                  {topic.label}
                </span>
                <span className="text-[10px] leading-tight text-[var(--color-text-muted)]">
                  {topic.hint}
                </span>
              </button>
            ))}
          </div>

          {/* 自由輸入 */}
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="或在此輸入你想問的問題..."
            className="mb-5 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none transition-colors focus:border-[var(--color-accent-gold)]"
            rows={2}
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={startReading}
            disabled={!canAsk || creditLoading}
            className="w-full cursor-pointer rounded-lg border border-[var(--color-accent-gold)]/30 bg-gradient-to-r from-[var(--color-accent-gold)]/20 via-[var(--color-accent-gold)]/10 to-[var(--color-accent-purple)]/20 px-6 py-3.5 text-base font-bold tracking-wider text-[var(--color-accent-gold)] shadow-[var(--shadow-glow)] transition-all hover:border-[var(--color-accent-gold)]/50 hover:shadow-[var(--shadow-card-hover)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            ☉ 消耗 {QUESTION_CREDIT_COST} 點開始洗牌
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
            onComplete={onDrawComplete}
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
                <CardFace key={dc.card.id} drawnCard={dc} />
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
            <p className="text-sm text-[var(--color-text-secondary)]">神諭正在解讀牌義...</p>
          </div>
        </div>
      )}

      {/* === complete：顯示結果、追問、重抽。解讀 HTML 來自 marked，內容源於 AI Markdown。 === */}
      {phase === 'complete' && interpretationHtml && (
        <div key="complete" className="w-full max-w-2xl animate-fade-in-up">
          {/* 問題回顯 */}
          {question && (
            <div className="mb-6 text-center animate-fade-in">
              <span className="text-xs tracking-wider text-[var(--color-text-muted)] uppercase">你的問題</span>
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
                  <CardFace drawnCard={dc} />
                </div>
              ))}
            </div>
          )}

          {/* 分隔線 */}
          <div className="mx-auto mb-8 flex items-center gap-4 max-w-xs">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[var(--color-accent-gold)]/30" />
            <span className="text-sm text-[var(--color-accent-gold)]">✦ 神諭解讀 ✦</span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[var(--color-accent-gold)]/30" />
          </div>

          {/* 解讀內容 */}
          <div
            className="interpretation-panel rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 md:p-8 shadow-[var(--shadow-card)] animate-fade-in"
            style={{ animationDelay: '0.3s' }}
          >
            <div
              className="max-w-none text-[var(--color-text-primary)] leading-relaxed"
              dangerouslySetInnerHTML={{ __html: interpretationHtml }}
            />
          </div>

          {/* === 追問對話區 === */}
          {followUpHtmls.length > 0 && (
            <div className="mt-6 space-y-6">
              {/* 追問分隔線 */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-[var(--color-border)]" />
                <span className="text-xs font-medium text-[var(--color-accent-gold)]">追問延伸</span>
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
                        <p className="mb-2 text-xs text-[var(--color-accent-gold)]">✦ 追問指引牌 ✦</p>
                        <CardFace drawnCard={f.drawnCard} className="!w-32" />
                        <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                          {f.drawnCard.card.name} — {f.drawnCard.isReversed ? '逆位' : '正位'}
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
              <span className="ml-2 text-xs text-[var(--color-text-secondary)]">占卜師正在深入解讀...</span>
            </div>
          )}

          {/* 建議追問按鈕 */}
          {suggestedQuestions.length > 0 && !isFollowingUp && (
            <div className="mt-6 animate-fade-in">
              <p className="mb-3 text-center text-xs text-[var(--color-text-muted)]">
                ✦ 想更深入了解嗎？試試這些方向 ✦
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestedQuestions.map((sq, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setFollowUpInput('');
                      askFollowUp(sq);
                    }}
                    disabled={!canAsk}
                    className="cursor-pointer rounded-full border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2 text-xs text-[var(--color-text-secondary)] transition-all hover:border-[var(--color-accent-gold)] hover:text-[var(--color-accent-gold)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {sq}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 自由追問輸入 */}
          {!isFollowingUp && (
            <div className="mt-5 flex w-full gap-2">
              <input
                type="text"
                value={followUpInput}
                onChange={(e) => setFollowUpInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && followUpInput.trim() && canAsk) {
                    askFollowUp(followUpInput.trim());
                    setFollowUpInput('');
                  }
                }}
                placeholder="針對這次占卜結果追問..."
                className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none transition-colors focus:border-[var(--color-accent-gold)]"
              />
              <button
                onClick={() => {
                  if (followUpInput.trim() && canAsk) {
                    askFollowUp(followUpInput.trim());
                    setFollowUpInput('');
                  }
                }}
                disabled={!followUpInput.trim() || !canAsk}
                className="cursor-pointer rounded-lg bg-[var(--color-accent-gold)] px-4 py-2.5 text-sm font-bold text-[var(--color-bg-primary)] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
              >
                追問
              </button>
            </div>
          )}

          <div ref={followUpEndRef} />

          {/* 底部操作 */}
          <div className="mt-8 flex flex-col items-center gap-3">
            <button
              onClick={reset}
              className="cursor-pointer rounded-lg bg-gradient-to-r from-[var(--color-accent-purple)] to-[var(--color-accent-mystic)] px-8 py-2.5 font-bold text-white shadow-[var(--shadow-glow)] transition-shadow hover:shadow-[var(--shadow-card-hover)]"
            >
              ✦ 再占一次
            </button>
            <Link
              to="/history"
              className="text-xs text-[var(--color-text-muted)] no-underline transition-colors hover:text-[var(--color-accent-gold)]"
            >
              查看占卜紀錄 →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
