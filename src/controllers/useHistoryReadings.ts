import { useCallback, useEffect, useState } from 'react';
import type { Reading, FollowUpEntry } from '../models/reading';
import { FOLLOW_UP_CREDIT_COST } from '../models/credits';
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
      const lines = [`追問 ${index + 1}：${entry.question}`];
      if (entry.drawnCard) {
        const direction = entry.drawnCard.isReversed ? '逆位' : '正位';
        lines.push(`追問指引牌：${entry.drawnCard.card.name}（${entry.drawnCard.card.nameEn}）— ${direction}`);
      }
      lines.push(`回覆：${entry.answer}`);
      return lines.join('\n');
    })
    .join('\n\n');

  return [reading.interpretation, previousFollowUps].filter(Boolean).join('\n\n---\n\n');
}

function collectUsedCardIds(reading: Reading): string[] {
  const baseIds = reading.drawnCards.map((drawnCard) => drawnCard.card.id);
  const followUpIds = reading.followUps?.flatMap((entry) => entry.drawnCard ? [entry.drawnCard.card.id] : []) ?? [];
  return [...baseIds, ...followUpIds];
}

export function useHistoryReadings() {
  const { user } = useAuth();
  const { balance, refresh: refreshCredits } = useCredits();
  const { lang } = useI18n();
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingUpId, setFollowingUpId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
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

      if (balance < FOLLOW_UP_CREDIT_COST) {
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
      setSuggestedQuestions([]);

      try {
        const extraCard = drawExtraCard(collectUsedCardIds(reading));
        const originalRequest: AIInterpretationRequest = {
          spreadType: reading.spreadType,
          drawnCards: reading.drawnCards,
          question: reading.question,
          locale: lang,
          querentSummary: reading.querentSummary,
        };

        const followUpRequest = {
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
        };

        let result;

        if (provider.followUpStream) {
          // 串流版：即時顯示追問回覆
          const streamingEntry: FollowUpEntry = {
            question: followUpQuestion,
            answer: '',
            drawnCard: extraCard,
          };

          // 先把暫存 entry 加到 UI
          const updateReadingsWithEntry = (entry: FollowUpEntry) => {
            setReadings((prev) =>
              prev.map((item) =>
                item.id === reading.id
                  ? { ...item, followUps: [...(reading.followUps ?? []), entry] }
                  : item,
              ),
            );
          };

          let streamStarted = false;
          let throttleTimer: ReturnType<typeof setTimeout> | null = null;
          setIsStreaming(true);

          result = await provider.followUpStream(followUpRequest, (_delta, accumulated) => {
            streamingEntry.answer = accumulated;
            if (!streamStarted) {
              streamStarted = true;
              updateReadingsWithEntry({ ...streamingEntry });
            } else if (!throttleTimer) {
              throttleTimer = setTimeout(() => {
                updateReadingsWithEntry({ ...streamingEntry });
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

        // 先更新 UI（不等 storage）
        const updatedFollowUps = [...(reading.followUps ?? []), newEntry];
        setReadings((prev) =>
          prev.map((item) =>
            item.id === reading.id
              ? { ...item, followUps: updatedFollowUps, suggestedQuestions: newSuggestedQuestions }
              : item,
          ),
        );

        setSuggestedQuestions(newSuggestedQuestions);

        // 背景寫入 storage
        const storage = getStorageProvider(user.uid);
        storage.updateReading(reading.id, {
          followUps: updatedFollowUps,
          suggestedQuestions: newSuggestedQuestions,
        }).catch(console.error);

        refreshCredits().catch(console.error);
      } catch (err) {
        setError(err instanceof Error ? err.message : '追問失敗，請稍後再試');
      } finally {
        setFollowingUpId(null);
        setIsStreaming(false);
      }
    },
    [balance, lang, refreshCredits, user],
  );

  return {
    readings,
    loading,
    followingUpId,
    isStreaming,
    suggestedQuestions,
    error,
    reload: loadReadings,
    deleteReading,
    askFollowUp,
  };
}
