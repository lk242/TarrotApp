import type { DrawnCard } from './tarot-card';
import type { SpreadType } from './spread';

export interface FollowUpEntry {
  question: string;
  answer: string;
  /** 追問抽到的指引牌；純對話模式 (chat mode) 不抽牌時為 undefined */
  drawnCard?: DrawnCard;
  /** 該次追問後 AI 建議的追問方向 */
  suggestedQuestions?: string[];
}

export interface Reading {
  id: string;
  timestamp: number;
  spreadType: SpreadType;
  question: string;
  drawnCards: DrawnCard[];
  interpretation: string;
  summary: string;
  followUps?: FollowUpEntry[];
  userId?: string;
  /** 占卜時使用的語系，用於跨語系歷史顯示 */
  locale?: 'zh-TW' | 'en' | 'ja';
  /** 占卜當下的問卜者狀態摘要，用於歷史紀錄追問延續記憶 */
  querentSummary?: string;
  /** AI 建議的追問方向（初次解讀後產生） */
  suggestedQuestions?: string[];
  /** 使用者筆記（占卜日記） */
  userNotes?: string;
}
