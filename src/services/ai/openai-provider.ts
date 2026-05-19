import type {
  IAIProvider,
  AIInterpretationRequest,
  AIInterpretationResponse,
  AIFollowUpRequest,
} from './ai-provider';
import { buildSystemPrompt, buildUserPrompt } from '../../utils/prompt-builder';

const API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4.1-mini';

/**
 * 前端直呼 OpenAI 的 provider。
 *
 * 僅供本機開發或臨時測試。正式部署不要使用，否則 VITE_OPENAI_API_KEY
 * 會被打包進公開 JS。Production 請使用 FunctionsProvider。
 */

/** 從回應文字中解析建議追問（如果 AI 回了 <!-- SUGGESTED_QUESTIONS: ... --> 格式） */
function parseSuggestedQuestions(text: string): string[] {
  const match = text.match(/<!-- SUGGESTED_QUESTIONS:([\s\S]*?)-->/);
  if (!match) return [];
  return match[1]
    .split('\n')
    .map((l) => l.replace(/^[\s\-*\d.]+/, '').trim())
    .filter(Boolean)
    .slice(0, 3);
}

function cleanText(text: string): string {
  return text.replace(/<!-- SUGGESTED_QUESTIONS:[\s\S]*?-->/g, '').trim();
}

export class OpenAIProvider implements IAIProvider {
  readonly name = 'OpenAI';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  private async chat(
    messages: { role: string; content: string }[],
    maxTokens = 1800,
  ): Promise<{ text: string; usage?: { prompt_tokens: number; completion_tokens: number } }> {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        messages,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI API 錯誤 (${res.status}): ${err}`);
    }

    const data = await res.json();
    return {
      text: data.choices?.[0]?.message?.content ?? '',
      usage: data.usage,
    };
  }

  async interpret(request: AIInterpretationRequest): Promise<AIInterpretationResponse> {
    const systemPrompt =
      buildSystemPrompt(request.locale) +
      `\n\n在解讀結束後，請額外用以下格式附上 3 個建議追問（供問卜者進一步探索），用 HTML 註解包起來：
<!-- SUGGESTED_QUESTIONS:
- 問題一
- 問題二
- 問題三
-->`;

    const userPrompt = buildUserPrompt(request);

    const { text, usage } = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    const suggestedQuestions = parseSuggestedQuestions(text);
    const cleanedText = cleanText(text);
    const lines = cleanedText.trim().split('\n').filter(Boolean);
    const summary = lines[lines.length - 1]?.replace(/^[#*>\s]+/, '') || '';

    return {
      interpretation: cleanedText,
      summary,
      suggestedQuestions,
      tokenUsage: usage
        ? { input: usage.prompt_tokens, output: usage.completion_tokens }
        : undefined,
    };
  }

  async followUp(request: AIFollowUpRequest): Promise<AIInterpretationResponse> {
    const systemPrompt = `你是一位資深塔羅占卜師，正在為問卜者進行深入的追問解讀。

問卜者剛才做了一次塔羅占卜，你已經給出了初步解讀。現在他們想更深入了解某個面向。

請根據原始牌陣和你之前的解讀，針對追問提供具體的分析與建議。回應長度約 250 到 350 字，使用 Markdown 格式。

結構：
## 🔍 深入解析
針對追問，結合原始牌陣中相關的牌進行更深層的分析。

## 💡 具體行動方案
提供 2-3 個非常具體、可立即執行的建議。

## ✨ 寄語
> 一句鼓勵或提醒的話。

同樣在結尾附上建議追問：
<!-- SUGGESTED_QUESTIONS:
- 問題一
- 問題二
- 問題三
-->`;

    const cardsDescription = request.originalRequest.drawnCards
      .map(
        (dc) =>
          `- 位置「${dc.position}」：${dc.card.name}（${dc.card.nameEn}）— ${dc.isReversed ? '逆位' : '正位'}`,
      )
      .join('\n');

    const userPrompt = `**原始問題：** ${request.originalRequest.question}
**牌陣中的牌：**
${cardsDescription}

**之前的解讀摘要：**
${request.originalInterpretation.slice(0, 1500)}

---

**問卜者的追問：** ${request.followUpQuestion}

請針對這個追問提供深入解讀。`;

    const { text, usage } = await this.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      1000,
    );

    const suggestedQuestions = parseSuggestedQuestions(text);
    const cleanedText = cleanText(text);
    const lines = cleanedText.trim().split('\n').filter(Boolean);
    const summary = lines[lines.length - 1]?.replace(/^[#*>\s]+/, '') || '';

    return {
      interpretation: cleanedText,
      summary,
      suggestedQuestions,
      tokenUsage: usage
        ? { input: usage.prompt_tokens, output: usage.completion_tokens }
        : undefined,
    };
  }
}
