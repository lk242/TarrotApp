import type { IAIProvider, AIInterpretationRequest, AIInterpretationResponse } from './ai-provider';

export class MockProvider implements IAIProvider {
  readonly name = 'Mock';

  async interpret(request: AIInterpretationRequest): Promise<AIInterpretationResponse> {
    await new Promise((r) => setTimeout(r, 1500));

    const cardNames = request.drawnCards
      .map((dc) => `${dc.card.name}（${dc.isReversed ? '逆位' : '正位'}）— ${dc.position}`)
      .join('\n');

    return {
      interpretation: `## 塔羅解讀\n\n**你的問題：** ${request.question}\n\n**抽出的牌：**\n${cardNames}\n\n---\n\n這是一組模擬的解讀結果。在正式環境中，這裡會顯示 AI 根據牌義、位置與問題脈絡所生成的深度解析。\n\n每張牌都蘊含豐富的象徵意義，結合牌陣位置，能為你揭示更深層的洞見。`,
      summary: '這是模擬解讀 — 連接 AI 服務後將提供真實的塔羅牌義分析。',
    };
  }

  isAvailable(): boolean {
    return true;
  }
}
