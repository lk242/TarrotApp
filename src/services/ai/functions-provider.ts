import { httpsCallable } from 'firebase/functions';
import type {
  IAIProvider,
  AIInterpretationRequest,
  AIInterpretationResponse,
  AIFollowUpRequest,
} from './ai-provider';
import { functions } from '../firebase/config';

const interpretCallable = httpsCallable<AIInterpretationRequest, AIInterpretationResponse>(
  functions,
  'generateTarotReading',
);

const followUpCallable = httpsCallable<AIFollowUpRequest, AIInterpretationResponse>(
  functions,
  'followUpReading',
);

/**
 * Production AI provider。
 *
 * 前端只呼叫 Firebase Callable Function；OpenAI API key 存在 Secret Manager，
 * 由 functions/src/index.ts 讀取。這是避免 API key 外洩的正式路徑。
 */
export class FunctionsProvider implements IAIProvider {
  readonly name = 'Firebase Functions';

  isAvailable(): boolean {
    return true;
  }

  async interpret(request: AIInterpretationRequest): Promise<AIInterpretationResponse> {
    const result = await interpretCallable(request);
    return result.data;
  }

  async followUp(request: AIFollowUpRequest): Promise<AIInterpretationResponse> {
    const result = await followUpCallable(request);
    return result.data;
  }
}
