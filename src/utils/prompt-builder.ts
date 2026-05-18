import type { AIInterpretationRequest } from '../services/ai/ai-provider';

export function buildSystemPrompt(locale: 'zh-TW' | 'en'): string {
  if (locale === 'zh-TW') {
    return `你是一位擁有深厚塔羅知識的占卜師。請根據使用者抽出的牌、牌陣位置與問題，提供深度且富有洞見的解讀。

規則：
- 使用繁體中文回應
- 先逐張解析每張牌在其位置上的含義（正位或逆位）
- 再提供整體綜合解讀
- 語氣保持神秘但具啟發性，避免模稜兩可的空話
- 使用 Markdown 格式，以標題分隔各段
- 最後附上一句精煉的總結箴言`;
  }

  return `You are a skilled tarot reader. Provide an insightful interpretation based on the drawn cards, spread positions, and the querent's question. Use Markdown formatting.`;
}

export function buildUserPrompt(request: AIInterpretationRequest): string {
  const cardsDescription = request.drawnCards
    .map(
      (dc) =>
        `- 位置「${dc.position}」：${dc.card.name}（${dc.card.nameEn}）— ${dc.isReversed ? '逆位' : '正位'}`,
    )
    .join('\n');

  return `**問題：** ${request.question}

**牌陣：** ${request.spreadType === 'single' ? '單牌' : request.spreadType === 'three-card' ? '三牌（過去/現在/未來）' : '凱爾特十字'}

**抽出的牌：**
${cardsDescription}

請提供完整的塔羅解讀。`;
}
