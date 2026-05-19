import { useState, useCallback, useRef } from 'react';
import type { DrawnCard } from '../models/tarot-card';
import type { Reading } from '../models/reading';
import type { SpreadType } from '../models/spread';
import type { AIInterpretationRequest } from '../services/ai/ai-provider';
import { performReading } from '../services/tarot-engine';
import { getConfiguredProvider } from '../services/ai/ai-factory';
import { getStorageProvider } from '../services/storage/storage-factory';
import { useAuth } from './useAuth';

export type ReadingPhase =
  | 'idle'
  | 'shuffling'
  | 'cutting'
  | 'drawing'
  | 'interpreting'
  | 'complete';

export interface FollowUpEntry {
  question: string;
  answer: string;
}

/**
 * useTarotSession 是占卜流程的 Controller。
 *
 * 它把洗牌/切牌/抽牌動畫階段、AI 解讀、紀錄儲存串成單一狀態機。
 * View 只根據 phase 呈現對應畫面，Service 則各自負責抽牌、AI、Storage。
 */
export function useTarotSession(spreadType: SpreadType) {
  const { user } = useAuth();
  const [phase, setPhase] = useState<ReadingPhase>('idle');
  const [question, setQuestion] = useState('');
  const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([]);
  const [interpretation, setInterpretation] = useState('');
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpEntry[]>([]);
  const [isFollowingUp, setIsFollowingUp] = useState(false);

  const drawnCardsRef = useRef<DrawnCard[]>([]);
  const questionRef = useRef('');
  const interpretationRef = useRef('');
  const originalRequestRef = useRef<AIInterpretationRequest | null>(null);

  const startReading = useCallback(() => {
    // 抽牌結果在動畫開始前就固定，後續只是逐步揭示，不會因 re-render 改變。
    const cards = performReading(spreadType);
    drawnCardsRef.current = cards;
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
    storage.saveReading(reading).catch(console.error);

    setPhase('complete');
  }, [spreadType, user?.uid]);

  /** 追問 — 基於當前牌陣繼續深入 */
  const askFollowUp = useCallback(
    async (followUpQuestion: string) => {
      if (!originalRequestRef.current || isFollowingUp) return;
      setIsFollowingUp(true);

      try {
        const provider = getConfiguredProvider();
        if (!provider.followUp) {
          // Mock 或舊 provider 可能不支援追問；直接退出避免 UI 卡住。
          return;
        }

        const result = await provider.followUp({
          originalRequest: originalRequestRef.current,
          originalInterpretation: interpretationRef.current,
          followUpQuestion,
          locale: 'zh-TW',
        });

        setFollowUps((prev) => [
          ...prev,
          { question: followUpQuestion, answer: result.interpretation },
        ]);
        setSuggestedQuestions(result.suggestedQuestions || []);
      } catch (err) {
        console.error('追問失敗:', err);
      } finally {
        setIsFollowingUp(false);
      }
    },
    [isFollowingUp],
  );

  const reset = useCallback(() => {
    setPhase('idle');
    setQuestion('');
    setDrawnCards([]);
    setInterpretation('');
    setSuggestedQuestions([]);
    setFollowUps([]);
    setIsFollowingUp(false);
    drawnCardsRef.current = [];
    questionRef.current = '';
    interpretationRef.current = '';
    originalRequestRef.current = null;
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
  };
}
