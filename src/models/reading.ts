import type { DrawnCard } from './tarot-card';
import type { SpreadType } from './spread';

export interface FollowUpEntry {
  question: string;
  answer: string;
  drawnCard: DrawnCard;
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
}
