import { useState, useCallback, useRef } from 'react';
import type { DrawnCard } from '../models/tarot-card';
import type { Reading, FollowUpEntry } from '../models/reading';
import type { SpreadType } from '../models/spread';
import type { AIInterpretationRequest } from '../services/ai/ai-provider';
import { performReading, drawExtraCard } from '../services/tarot-engine';
import { getConfiguredProvider } from '../services/ai/ai-factory';
import { getStorageProvider } from '../services/storage/storage-factory';
import { useAuth } from './useAuth';
import { useCredits } from './useCredits';
import { useI18n } from './useI18n';
import { trackEvent } from '../services/firebase/analytics';

export type ReadingPhase =
  | 'idle'
  | 'shuffling'
  | 'cutting'
  | 'drawing'
  | 'interpreting'
  | 'complete';

// Re-export for backward compatibility
export type { FollowUpEntry } from '../models/reading';

function buildFollowUpContext(originalInterpretation: string, followUps: FollowUpEntry[]): string {
  const previousFollowUps = followUps
    .map((entry, index) => {
      const lines = [`追問 ${index + 1}：${entry.question}`];
      if (entry.drawnCard) {
        const direction = entry.drawnCard.isReversed ? '逆位' : '正位';
        lines.push(`追問指引牌：${entry.drawnCard.card.name}（${entry.drawnCard.card.nameEn}）— ${direction}`);
      }
      lines.push(`回覆：${entry.answer}`);
      return lines.join('\n');
    })
    .join('\n\n');

  return [originalInterpretation, previousFollowUps].filter(Boolean).join('\n\n---\n\n');
}

/**
 * useTarotSession 是占卜流程的 Controller。
 *
 * 它把洗牌/切牌/抽牌動畫階段、AI 解讀、紀錄儲存串成單一狀態機。
 * View 只根據 phase 呈現對應畫面，Service 則各自負責抽牌、AI、Storage。
 */
export function useTarotSession(spreadType: SpreadType) {
  const { user } = useAuth();
  const { refresh: refreshCredits } = useCredits();
  const { lang } = useI18n();
  const [phase, setPhase] = useState<ReadingPhase>('idle');
  const [question, setQuestion] = useState('');
  const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([]);
  const [interpretation, setInterpretation] = useState('');
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpEntry[]>([]);
  const [isFollowingUp, setIsFollowingUp] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');

  const drawnCardsRef = useRef<DrawnCard[]>([]);
  const questionRef = useRef('');
  const interpretationRef = useRef('');
  const originalRequestRef = useRef<AIInterpretationRequest | null>(null);
  /** 追問過程中所有已抽的牌 ID（原始 + 追問），用於排除重複 */
  const allDrawnCardIdsRef = useRef<string[]>([]);
  /** 儲存後的 reading doc ID，追問時用來更新紀錄 */
  const savedReadingIdRef = useRef<string | null>(null);
  const followUpsRef = useRef<FollowUpEntry[]>([]);

  const startReading = useCallback(() => {
    setError('');
    trackEvent('reading_start', { spread_type: spreadType });
    // 抽牌結果在動畫開始前就固定，後續只是逐步揭示，不會因 re-render 改變。
    const cards = performReading(spreadType);
    drawnCardsRef.current = cards;
    allDrawnCardIdsRef.current = cards.map((c) => c.card.id);
    setDrawnCards(cards);
    setPhase('shuffling');
  }, [spreadType]);

  const onShuffleComplete = useCallback(() => setPhase('cutting'), []);
  const onCutComplete = useCallback(() => setPhase('drawing'), []);

  const onDrawComplete = useCallback(async (ctx?: { topic?: string; querentSummary?: string }) => {
    // 未登入用戶：顯示牌面但不呼叫 AI，提示登入
    if (!user) {
      setPhase('complete');
      setInterpretation('');
      return;
    }

    setPhase('interpreting');
    const provider = getConfiguredProvider();

    // 原始 request 會保存起來，追問時才能把同一組牌陣上下文送給 AI。
    const request: AIInterpretationRequest = {
      spreadType,
      drawnCards: drawnCardsRef.current,
      question: questionRef.current || '給我一個整體的生活指引',
      locale: lang,
      topic: ctx?.topic,
      querentSummary: ctx?.querentSummary,
    };
    originalRequestRef.current = request;

    try {
      let result;

      if (provider.interpretStream) {
        // 串流版：第一個 delta 到達就切到 complete + isStreaming
        // 節流：每 80ms 批次更新一次 UI，避免每 token 都 re-render + marked.parse
        let streamStarted = false;
        let throttleTimer: ReturnType<typeof setTimeout> | null = null;
        setIsStreaming(true);
        result = await provider.interpretStream(request, (_delta, accumulated) => {
          interpretationRef.current = accumulated;
          if (!streamStarted) {
            streamStarted = true;
            setInterpretation(accumulated);
            setPhase('complete');
          } else if (!throttleTimer) {
            throttleTimer = setTimeout(() => {
              setInterpretation(interpretationRef.current);
              throttleTimer = null;
            }, 80);
          }
        });
        // 確保最後一次更新
        if (throttleTimer) clearTimeout(throttleTimer);
        setIsStreaming(false);
      } else {
        // 非串流 fallback
        result = await provider.interpret(request);
      }

      // 最終結果更新（含清理後的 interpretation + suggestedQuestions）
      setInterpretation(result.interpretation);
      interpretationRef.current = result.interpretation;
      setSuggestedQuestions(result.suggestedQuestions || []);
      setPhase('complete');

      // 存檔放背景，不阻塞 UI
      const storage = getStorageProvider(user?.uid);
      const reading: Reading = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        spreadType,
        question: questionRef.current || '給我一個整體的生活指引',
        drawnCards: drawnCardsRef.current,
        interpretation: result.interpretation,
        summary: result.summary,
        locale: lang,
        querentSummary: ctx?.querentSummary,
        suggestedQuestions: result.suggestedQuestions,
      };
      storage.saveReading(reading).then((docId) => {
        savedReadingIdRef.current = docId;
      }).catch(console.error);
      refreshCredits().catch(console.error);

      trackEvent('reading_complete', { spread_type: spreadType });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI 解讀失敗，請稍後再試';
      console.error('占卜解讀失敗:', err);
      trackEvent('reading_error', { spread_type: spreadType, error: message });
      setError(message);
      setPhase('idle');
    }
  }, [lang, refreshCredits, spreadType, user]);

  /**
   * 追問 — 可選擇是否額外抽牌。
   * @param withCard true = 傳統追問（抽一張指引牌），false = 純對話模式（不抽牌）
   */
  const askFollowUp = useCallback(
    async (followUpQuestion: string, withCard = true) => {
      if (!originalRequestRef.current || isFollowingUp) return;
      setIsFollowingUp(true);
      setError('');
      trackEvent(withCard ? 'follow_up_start' : 'chat_start', { spread_type: spreadType });

      try {
        const provider = getConfiguredProvider();
        if (!provider.followUp) return;

        // 抽牌模式才抽新牌
        const extraCard = withCard ? drawExtraCard(allDrawnCardIdsRef.current) : undefined;
        if (extraCard) allDrawnCardIdsRef.current.push(extraCard.card.id);

        const followUpRequest = {
          originalRequest: originalRequestRef.current,
          originalInterpretation: buildFollowUpContext(
            interpretationRef.current,
            followUpsRef.current,
          ),
          followUpQuestion,
          ...(extraCard ? {
            followUpCard: {
              card: {
                name: extraCard.card.name,
                nameEn: extraCard.card.nameEn,
                keywords: extraCard.card.keywords,
                reversedKeywords: extraCard.card.reversedKeywords,
              },
              isReversed: extraCard.isReversed,
              position: extraCard.position,
            },
          } : {}),
          locale: lang,
        };

        let result;

        if (provider.followUpStream) {
          // 串流版：即時顯示追問回覆
          const streamingEntry: FollowUpEntry = {
            question: followUpQuestion,
            answer: '',
            drawnCard: extraCard,
          };
          const pendingFollowUps = [...followUpsRef.current, streamingEntry];
          setFollowUps(pendingFollowUps);

          let streamStarted = false;
          let throttleTimer: ReturnType<typeof setTimeout> | null = null;
          setIsStreaming(true);

          result = await provider.followUpStream(followUpRequest, (_delta, accumulated) => {
            streamingEntry.answer = accumulated;
            if (!streamStarted) {
              streamStarted = true;
              setFollowUps([...followUpsRef.current, { ...streamingEntry }]);
            } else if (!throttleTimer) {
              throttleTimer = setTimeout(() => {
                setFollowUps([...followUpsRef.current, { ...streamingEntry }]);
                throttleTimer = null;
              }, 80);
            }
          });

          if (throttleTimer) clearTimeout(throttleTimer);
          setIsStreaming(false);
        } else {
          // 非串流 fallback
          result = await provider.followUp(followUpRequest);
        }

        const newSuggestedQuestions = result.suggestedQuestions || [];
        const newEntry: FollowUpEntry = {
          question: followUpQuestion,
          answer: result.interpretation,
          drawnCard: extraCard,
          suggestedQuestions: newSuggestedQuestions,
        };

        const updatedFollowUps = [...followUpsRef.current, newEntry];
        followUpsRef.current = updatedFollowUps;
        setFollowUps(updatedFollowUps);
        setSuggestedQuestions(newSuggestedQuestions);

        // 將追問紀錄更新到儲存（含建議方向）
        if (savedReadingIdRef.current) {
          const storage = getStorageProvider(user?.uid);
          storage
            .updateReading(savedReadingIdRef.current, {
              followUps: updatedFollowUps,
              suggestedQuestions: newSuggestedQuestions,
            })
            .catch(console.error);
        }

        refreshCredits().catch(console.error);
      } catch (err) {
        console.error('追問失敗:', err);
        setError(err instanceof Error ? err.message : '追問失敗，請稍後再試');
      } finally {
        setIsFollowingUp(false);
        setIsStreaming(false);
      }
    },
    [isFollowingUp, lang, refreshCredits, spreadType, user],
  );

  const reset = useCallback(() => {
    setPhase('idle');
    setQuestion('');
    setDrawnCards([]);
    setInterpretation('');
    setSuggestedQuestions([]);
    setFollowUps([]);
    setIsFollowingUp(false);
    setError('');
    drawnCardsRef.current = [];
    questionRef.current = '';
    interpretationRef.current = '';
    originalRequestRef.current = null;
    allDrawnCardIdsRef.current = [];
    savedReadingIdRef.current = null;
    followUpsRef.current = [];
  }, []);

  const handleSetQuestion = useCallback((q: string) => {
    questionRef.current = q;
    setQuestion(q);
  }, []);

  return {
    phase,
    question,
    setQuestion: handleSetQuestion,
    startReading,
    onShuffleComplete,
    onCutComplete,
    onDrawComplete,
    reset,
    drawnCards,
    interpretation,
    suggestedQuestions,
    followUps,
    isFollowingUp,
    isStreaming,
    askFollowUp,
    error,
    clearError: () => setError(''),
  };
}
