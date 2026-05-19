import type { IAIProvider, AIInterpretationRequest, AIInterpretationResponse } from './ai-provider';
import { buildSystemPrompt, buildUserPrompt } from '../../utils/prompt-builder';

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';

export class ClaudeProvider implements IAIProvider {
  readonly name = 'Claude';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async interpret(request: AIInterpretationRequest): Promise<AIInterpretationResponse> {
    const systemPrompt = buildSystemPrompt(request.locale);
    const userPrompt = buildUserPrompt(request);

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1800,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Claude API 錯誤 (${res.status}): ${err}`);
    }

    const data = await res.json();
    const text: string = data.content?.[0]?.text ?? '';
    const lines = text.trim().split('\n').filter(Boolean);
    const summary = lines[lines.length - 1]?.replace(/^[#*>\s]+/, '') || '';

    return {
      interpretation: text,
      summary,
      tokenUsage: data.usage
        ? { input: data.usage.input_tokens, output: data.usage.output_tokens }
        : undefined,
    };
  }
}
