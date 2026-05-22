import type { DrawnCard } from '../../models/tarot-card';
import type { SpreadType } from '../../models/spread';

export interface AIInterpretationRequest {
  spreadType: SpreadType;
  drawnCards: DrawnCard[];
  question: string;
  locale: 'zh-TW' | 'en' | 'ja';
  /** 使用者選擇的占卜主題（如「愛情」「事業」等） */
  topic?: string;
  /** 問卜者狀態摘要（由 useQuerentSignals 生成，直接注入 prompt） */
  querentSummary?: string;
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
  followUpCard: {
    card: { name: string; nameEn: string; keywords: string[]; reversedKeywords: string[] };
    isReversed: boolean;
    position: string;
  };
  locale: 'zh-TW' | 'en' | 'ja';
}

/**
 * 串流回呼：每次收到新的文字 delta 時呼叫。
 */
export type StreamCallback = (delta: string, accumulated: string) => void;

/**
 * 所有 AI provider 的共同合約。
 *
 * 前端流程只依賴這個介面，不關心背後是 Mock、前端直呼 OpenAI，
 * 或正式環境使用 Firebase Functions proxy。新增 provider 時只需實作這裡。
 */
export interface IAIProvider {
  readonly name: string;
  interpret(request: AIInterpretationRequest): Promise<AIInterpretationResponse>;
  /** 串流版解讀：每收到一小段文字就透過 onDelta 回呼即時更新 UI */
  interpretStream?(
    request: AIInterpretationRequest,
    onDelta: StreamCallback,
  ): Promise<AIInterpretationResponse>;
  followUp?(request: AIFollowUpRequest): Promise<AIInterpretationResponse>;
  isAvailable(): boolean;
}

export type AIProviderType = 'claude' | 'openai' | 'functions' | 'mock';
