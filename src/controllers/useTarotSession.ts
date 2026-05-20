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
      const direction = entry.drawnCard.isReversed ? '逆位' : '正位';

      return [
        `追問 ${index + 1}：${entry.question}`,
        `追問指引牌：${entry.drawnCard.card.name}（${entry.drawnCard.card.nameEn}）— ${direction}`,
        `回覆：${entry.answer}`,
      ].join('\n');
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
  const [phase, setPhase] = useState<ReadingPhase>('idle');
  const [question, setQuestion] = useState('');
  const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([]);
  const [interpretation, setInterpretation] = useState('');
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpEntry[]>([]);
  const [isFollowingUp, setIsFollowingUp] = useState(false);
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
    // 抽牌結果在動畫開始前就固定，後續只是逐步揭示，不會因 re-render 改變。
    const cards = performReading(spreadType);
    drawnCardsRef.current = cards;
    allDrawnCardIdsRef.current = cards.map((c) => c.card.id);
    setDrawnCards(cards);
    setPhase('shuffling');
  }, [spreadType]);

  const onShuffleComplete = useCallback(() => setPhase('cutting'), []);
  const onCutComplete = useCallback(() => setPhase('drawing'), []);

  const onDrawComplete = useCallback(async () => {
    setPhase('interpreting');
    const provider = getConfiguredProvider();

    // 原始 request 會保存起來，追問時才能把同一組牌陣上下文送給 AI。
    const request: AIInterpretationRequest = {
      spreadType,
      drawnCards: drawnCardsRef.current,
      question: questionRef.current || '給我一個整體的生活指引',
      locale: 'zh-TW',
    };
    originalRequestRef.current = request;

    try {
      const result = await provider.interpret(request);
      setInterpretation(result.interpretation);
      interpretationRef.current = result.interpretation;
      setSuggestedQuestions(result.suggestedQuestions || []);

      // 自動存入占卜紀錄：storage-factory 依登入狀態切換 Firestore/localStorage。
      const storage = getStorageProvider(user?.uid);
      const reading: Reading = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        spreadType,
        question: questionRef.current || '給我一個整體的生活指引',
        drawnCards: drawnCardsRef.current,
        interpretation: result.interpretation,
        summary: result.summary,
      };
      const docId = await storage.saveReading(reading);
      savedReadingIdRef.current = docId;
      refreshCredits().catch(console.error);

      setPhase('complete');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI 解讀失敗，請稍後再試';
      console.error('占卜解讀失敗:', err);
      setError(message);
      setPhase('idle');
    }
  }, [refreshCredits, spreadType, user]);

  /** 追問 — 額外抽一張新牌，基於新牌延伸解讀 */
  const askFollowUp = useCallback(
    async (followUpQuestion: string) => {
      if (!originalRequestRef.current || isFollowingUp) return;
      setIsFollowingUp(true);
      setError('');

      try {
        const provider = getConfiguredProvider();
        if (!provider.followUp) return;

        // 抽一張不重複的新牌
        const extraCard = drawExtraCard(allDrawnCardIdsRef.current);
        allDrawnCardIdsRef.current.push(extraCard.card.id);

        const result = await provider.followUp({
          originalRequest: originalRequestRef.current,
          originalInterpretation: buildFollowUpContext(
            interpretationRef.current,
            followUpsRef.current,
          ),
          followUpQuestion,
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
          locale: 'zh-TW',
        });

        const newEntry: FollowUpEntry = {
          question: followUpQuestion,
          answer: result.interpretation,
          drawnCard: extraCard,
        };

        const updatedFollowUps = [...followUpsRef.current, newEntry];
        followUpsRef.current = updatedFollowUps;
        setFollowUps(updatedFollowUps);
        setSuggestedQuestions(result.suggestedQuestions || []);

        // 將追問紀錄更新到儲存
        if (savedReadingIdRef.current) {
          const storage = getStorageProvider(user?.uid);
          storage
            .updateReading(savedReadingIdRef.current, { followUps: updatedFollowUps })
            .catch(console.error);
        }

        refreshCredits().catch(console.error);
      } catch (err) {
        console.error('追問失敗:', err);
        setError(err instanceof Error ? err.message : '追問失敗，請稍後再試');
      } finally {
        setIsFollowingUp(false);
      }
    },
    [isFollowingUp, refreshCredits, user],
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
    askFollowUp,
    error,
    clearError: () => setError(''),
  };
}
