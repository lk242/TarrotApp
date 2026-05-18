import type { DrawnCard } from '../../models/tarot-card';
import type { SpreadType } from '../../models/spread';

export interface AIInterpretationRequest {
  spreadType: SpreadType;
  drawnCards: DrawnCard[];
  question: string;
  locale: 'zh-TW' | 'en';
}

export interface AIInterpretationResponse {
  interpretation: string;
  summary: string;
  tokenUsage?: {
    input: number;
    output: number;
  };
}

export interface IAIProvider {
  readonly name: string;
  interpret(request: AIInterpretationRequest): Promise<AIInterpretationResponse>;
  isAvailable(): boolean;
}

export type AIProviderType = 'claude' | 'openai' | 'mock';
