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
  suggestedQuestions?: string[];
  tokenUsage?: {
    input: number;
    output: number;
  };
}

export interface AIFollowUpRequest {
  originalRequest: AIInterpretationRequest;
  originalInterpretation: string;
  followUpQuestion: string;
  locale: 'zh-TW' | 'en';
}

/**
 * 所有 AI provider 的共同合約。
 *
 * 前端流程只依賴這個介面，不關心背後是 Mock、前端直呼 OpenAI，
 * 或正式環境使用 Firebase Functions proxy。新增 provider 時只需實作這裡。
 */
export interface IAIProvider {
  readonly name: string;
  interpret(request: AIInterpretationRequest): Promise<AIInterpretationResponse>;
  followUp?(request: AIFollowUpRequest): Promise<AIInterpretationResponse>;
  isAvailable(): boolean;
}

export type AIProviderType = 'claude' | 'openai' | 'functions' | 'mock';
