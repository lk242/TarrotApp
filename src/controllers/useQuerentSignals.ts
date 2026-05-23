import { useRef, useCallback } from 'react';
import type { QuerentSignals, QuerentContext } from '../models/querent-context';
import {
  classifyTimeOfDay,
  classifyDevice,
  buildQuerentSummary,
} from '../models/querent-context';
import { getStorageProvider } from '../services/storage/storage-factory';

/**
 * useQuerentSignals — 收集問卜者行為信號的 Controller hook。
 *
 * 在 ReadingPage idle 階段追蹤使用者行為：
 * - 主題切換次數
 * - 打字開始/結束時間
 * - 最終問題文字
 * - 電池狀態
 * - 歷史占卜資料
 *
 * 呼叫 buildContext() 時將所有信號彙整為 QuerentContext，
 * 傳給 AI Provider 注入 prompt。
 */
export function useQuerentSignals(uid: string | undefined) {
  const topicSwitchCountRef = useRef(0);
  const lastTopicRef = useRef('');
  const typingStartRef = useRef<number | null>(null);
  const selectedTopicRef = useRef('');

  /** 使用者切換主題時呼叫 */
  const onTopicChange = useCallback((topic: string) => {
    if (lastTopicRef.current && lastTopicRef.current !== topic) {
      topicSwitchCountRef.current += 1;
    }
    lastTopicRef.current = topic;
    selectedTopicRef.current = topic;
  }, []);

  /** 使用者開始輸入問題時呼叫（第一個 keydown） */
  const onTypingStart = useCallback(() => {
    if (!typingStartRef.current) {
      typingStartRef.current = Date.now();
    }
  }, []);

  /** 重置（新一輪占卜） */
  const resetSignals = useCallback(() => {
    topicSwitchCountRef.current = 0;
    lastTopicRef.current = '';
    typingStartRef.current = null;
    selectedTopicRef.current = '';
  }, []);

  /** 彙整所有信號並產出 QuerentContext */
  const buildContext = useCallback(
    async (question: string, topic: string): Promise<QuerentContext> => {
      const now = new Date();
      const hour = now.getHours();

      // 電池 API（可能不可用）
      let batteryLevel: number | null = null;
      let batteryCharging: boolean | null = null;
      try {
        if ('getBattery' in navigator) {
          const battery = await (navigator as NavigatorWithBattery).getBattery();
          batteryLevel = battery.level;
          batteryCharging = battery.charging;
        }
      } catch {
        // Battery API 不可用，忽略
      }

      // 歷史占卜資料
      let totalReadings = 0;
      let daysSinceLastReading: number | null = null;
      let readingsInPast7Days = 0;
      let repeatedTopic = false;
      const memoryLines: string[] = [];

      try {
        const storage = getStorageProvider(uid);
        const readings = await storage.getReadings();
        totalReadings = readings.length;

        if (readings.length > 0) {
          // readings 通常按時間倒序
          const sorted = [...readings].sort((a, b) => b.timestamp - a.timestamp);
          const lastReading = sorted[0];
          daysSinceLastReading = Math.floor(
            (Date.now() - lastReading.timestamp) / (1000 * 60 * 60 * 24),
          );

          const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          const recentReadings = sorted.filter((r) => r.timestamp > sevenDaysAgo);
          readingsInPast7Days = recentReadings.length;

          // 檢查近期是否有同主題
          if (topic) {
            repeatedTopic = recentReadings.some(
              (r) => r.question?.includes(topic),
            );
          }

          const recentQuestions = sorted
            .slice(0, 3)
            .map((r) => r.question?.trim())
            .filter(Boolean)
            .map((q) => (q.length > 60 ? `${q.slice(0, 60)}...` : q));
          const followUpCount = sorted.reduce(
            (sum, reading) => sum + (reading.followUps?.length ?? 0),
            0,
          );

          if (recentQuestions.length > 0) {
            memoryLines.push(`- 近期曾問過：${recentQuestions.join('；')}`);
          }
          if (lastReading.summary) {
            const summary = lastReading.summary.length > 90
              ? `${lastReading.summary.slice(0, 90)}...`
              : lastReading.summary;
            memoryLines.push(`- 上次占卜摘要：${summary}`);
          }
          if (followUpCount > 0) {
            memoryLines.push(`- 過去累計追問 ${followUpCount} 次，使用者可能重視連續對話與深入釐清`);
          }
        }
      } catch {
        // Storage 讀取失敗不影響占卜
      }

      // 判斷是否為自訂問題（非預設 prompt）
      const isCustomQuestion =
        topic === '自由提問' || (!!question && !question.startsWith('我想了解') && !question.startsWith('請給我'));

      // 計算打字時長
      const typingDurationSec = typingStartRef.current
        ? Math.round((Date.now() - typingStartRef.current) / 1000)
        : 0;

      const signals: QuerentSignals = {
        timestamp: Date.now(),
        timeOfDay: classifyTimeOfDay(hour),
        hour,
        dayOfWeek: now.getDay(),
        deviceType: classifyDevice(),
        topic: topic || selectedTopicRef.current,
        isCustomQuestion,
        questionLength: question.length,
        typingDurationSec,
        topicSwitchCount: topicSwitchCountRef.current,
        batteryLevel,
        batteryCharging,
        totalReadings,
        daysSinceLastReading,
        readingsInPast7Days,
        repeatedTopic,
      };

      const baseSummary = buildQuerentSummary(signals);
      const summary = [baseSummary, memoryLines.join('\n')].filter(Boolean).join('\n');

      return {
        signals,
        summary,
      };
    },
    [uid],
  );

  return {
    onTopicChange,
    onTypingStart,
    resetSignals,
    buildContext,
  };
}

// Battery API 型別擴充
interface BatteryManager {
  level: number;
  charging: boolean;
}

interface NavigatorWithBattery extends Navigator {
  getBattery(): Promise<BatteryManager>;
}
