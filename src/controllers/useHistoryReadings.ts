import { useCallback, useEffect, useState } from 'react';
import type { Reading, FollowUpEntry } from '../models/reading';
import { QUESTION_CREDIT_COST } from '../models/credits';
import type { AIInterpretationRequest } from '../services/ai/ai-provider';
import { getConfiguredProvider } from '../services/ai/ai-factory';
import { getStorageProvider } from '../services/storage/storage-factory';
import { drawExtraCard } from '../services/tarot-engine';
import { useAuth } from './useAuth';
import { useCredits } from './useCredits';
import { useI18n } from './useI18n';

function buildFollowUpContext(reading: Reading): string {
  const previousFollowUps = reading.followUps
    ?.map((entry, index) => {
      const direction = entry.drawnCard.isReversed ? '逆位' : '正位';

      return [
        `追問 ${index + 1}：${entry.question}`,
        `追問指引牌：${entry.drawnCard.card.name}（${entry.drawnCard.card.nameEn}）— ${direction}`,
        `回覆：${entry.answer}`,
      ].join('\n');
    })
    .join('\n\n');

  return [reading.interpretation, previousFollowUps].filter(Boolean).join('\n\n---\n\n');
}

function collectUsedCardIds(reading: Reading): string[] {
  const baseIds = reading.drawnCards.map((drawnCard) => drawnCard.card.id);
  const followUpIds = reading.followUps?.map((entry) => entry.drawnCard.card.id) ?? [];
  return [...baseIds, ...followUpIds];
}

export function useHistoryReadings() {
  const { user } = useAuth();
  const { balance, refresh: refreshCredits } = useCredits();
  const { lang } = useI18n();
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingUpId, setFollowingUpId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadReadings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const storage = getStorageProvider(user?.uid);
      setReadings(await storage.getReadings());
    } catch (err) {
      setError(err instanceof Error ? err.message : '讀取占卜紀錄失敗');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    queueMicrotask(() => {
      loadReadings();
    });
  }, [loadReadings]);

  const deleteReading = useCallback(
    async (readingId: string) => {
      const storage = getStorageProvider(user?.uid);
      await storage.deleteReading(readingId);
      setReadings((prev) => prev.filter((reading) => reading.id !== readingId));
    },
    [user?.uid],
  );

  const askFollowUp = useCallback(
    async (reading: Reading, followUpQuestion: string) => {
      if (!user) {
        setError('請先登入後再追問紀錄。');
        return;
      }

      if (balance < QUESTION_CREDIT_COST) {
        setError('點數不足，請先購買點數或訂閱方案。');
        return;
      }

      const provider = getConfiguredProvider();
      if (!provider.followUp) {
        setError('目前 AI provider 不支援追問。');
        return;
      }

      setFollowingUpId(reading.id);
      setError('');

      try {
        const extraCard = drawExtraCard(collectUsedCardIds(reading));
        const originalRequest: AIInterpretationRequest = {
          spreadType: reading.spreadType,
          drawnCards: reading.drawnCards,
          question: reading.question,
          locale: lang,
        };
        const result = await provider.followUp({
          originalRequest,
          originalInterpretation: buildFollowUpContext(reading),
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
          locale: lang,
        });
        const newEntry: FollowUpEntry = {
          question: followUpQuestion,
          answer: result.interpretation,
          drawnCard: extraCard,
        };
        const updatedFollowUps = [...(reading.followUps ?? []), newEntry];
        const storage = getStorageProvider(user.uid);
        await storage.updateReading(reading.id, { followUps: updatedFollowUps });

        setReadings((prev) =>
          prev.map((item) =>
            item.id === reading.id ? { ...item, followUps: updatedFollowUps } : item,
          ),
        );
        refreshCredits().catch(console.error);
      } catch (err) {
        setError(err instanceof Error ? err.message : '追問失敗，請稍後再試');
      } finally {
        setFollowingUpId(null);
      }
    },
    [balance, lang, refreshCredits, user],
  );

  return {
    readings,
    loading,
    followingUpId,
    error,
    reload: loadReadings,
    deleteReading,
    askFollowUp,
  };
}
