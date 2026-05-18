import type { DrawnCard } from './tarot-card';
import type { SpreadType } from './spread';

export interface Reading {
  id: string;
  timestamp: number;
  spreadType: SpreadType;
  question: string;
  drawnCards: DrawnCard[];
  interpretation: string;
  summary: string;
  userId?: string;
}
