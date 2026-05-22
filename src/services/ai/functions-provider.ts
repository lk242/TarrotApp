import { httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';
import type {
  IAIProvider,
  AIInterpretationRequest,
  AIInterpretationResponse,
  AIFollowUpRequest,
  StreamCallback,
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

/** Cloud Function 串流 endpoint URL（2nd Gen 使用 Cloud Run URL） */
const STREAM_URL =
  (import.meta.env.VITE_STREAM_URL as string | undefined) ||
  'https://streamtarotreading-hoqm6svvza-de.a.run.app';

/**
 * Production AI provider。
 *
 * 前端只呼叫 Firebase Callable Function；OpenAI API key 存在 Secret Manager，
 * 由 functions/src/index.ts 讀取。這是避免 API key 外洩的正式路徑。
 *
 * 串流版使用 SSE (Server-Sent Events) 直接 fetch Cloud Run endpoint。
 */
export class FunctionsProvider implements IAIProvider {
  readonly name = 'Firebase Functions';

  isAvailable(): boolean {
    return true;
  }

  /** 非串流版（保留作為 fallback） */
  async interpret(request: AIInterpretationRequest): Promise<AIInterpretationResponse> {
    const result = await interpretCallable(request);
    return result.data;
  }

  /** 串流版：每收到一段文字就即時回呼 onDelta */
  async interpretStream(
    request: AIInterpretationRequest,
    onDelta: StreamCallback,
  ): Promise<AIInterpretationResponse> {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error('請先登入後再使用 AI 占卜');

    const idToken = await user.getIdToken();

    const response = await fetch(STREAM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errBody = await response.text();
      let errMsg = `AI 解讀失敗 (${response.status})`;
      try {
        const parsed = JSON.parse(errBody);
        if (parsed.error) errMsg = parsed.error;
      } catch { /* ignore */ }
      throw new Error(errMsg);
    }

    if (!response.body) {
      throw new Error('瀏覽器不支援串流回應');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let accumulated = '';
    let finalResponse: AIInterpretationResponse | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const payload = trimmed.slice(6);

        try {
          const data = JSON.parse(payload) as {
            delta?: string;
            done?: boolean;
            error?: string;
            interpretation?: string;
            summary?: string;
            suggestedQuestions?: string[];
          };

          if (data.error) {
            throw new Error(data.error);
          }

          if (data.delta) {
            accumulated += data.delta;
            onDelta(data.delta, accumulated);
          }

          if (data.done && data.interpretation) {
            finalResponse = {
              interpretation: data.interpretation,
              summary: data.summary ?? '',
              suggestedQuestions: data.suggestedQuestions,
            };
          }
        } catch (e) {
          if (e instanceof Error && e.message !== '串流中斷') throw e;
        }
      }
    }

    // 如果最終結果沒收到（異常情況），用累積文字建構
    if (!finalResponse) {
      finalResponse = {
        interpretation: accumulated,
        summary: '',
        suggestedQuestions: [],
      };
    }

    return finalResponse;
  }

  async followUp(request: AIFollowUpRequest): Promise<AIInterpretationResponse> {
    const result = await followUpCallable(request);
    return result.data;
  }
}
