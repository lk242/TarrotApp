import { useState, useCallback, useRef } from 'react';
import type { DrawnCard } from '../models/tarot-card';
import type { SpreadType } from '../models/spread';
import { performReading } from '../services/tarot-engine';
import { getConfiguredProvider } from '../services/ai/ai-factory';

export type ReadingPhase =
  | 'idle'
  | 'shuffling'
  | 'cutting'
  | 'drawing'
  | 'interpreting'
  | 'complete';

export function useTarotSession(spreadType: SpreadType) {
  const [phase, setPhase] = useState<ReadingPhase>('idle');
  const [question, setQuestion] = useState('');
  const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([]);
  const [interpretation, setInterpretation] = useState('');

  // ref 避免 onDrawComplete 因 drawnCards stale closure 問題
  const drawnCardsRef = useRef<DrawnCard[]>([]);
  const questionRef = useRef('');

  const startReading = useCallback(() => {
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
    const result = await provider.interpret({
      spreadType,
      drawnCards: drawnCardsRef.current,
      question: questionRef.current || '給我一個整體的生活指引',
      locale: 'zh-TW',
    });
    setInterpretation(result.interpretation);
    setPhase('complete');
  }, [spreadType]);

  const reset = useCallback(() => {
    setPhase('idle');
    setQuestion('');
    setDrawnCards([]);
    setInterpretation('');
    drawnCardsRef.current = [];
    questionRef.current = '';
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
  };
}
