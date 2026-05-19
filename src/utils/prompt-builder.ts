import type { AIInterpretationRequest } from '../services/ai/ai-provider';

export function buildSystemPrompt(locale: 'zh-TW' | 'en'): string {
  if (locale === 'zh-TW') {
    return `你是一位擁有深厚塔羅知識、擅長心靈引導的資深占卜師。你的解讀風格兼具神秘感與實用性，讓問卜者感到被理解並獲得清晰的方向。

你必須提供清楚且有深度的解讀，回應長度約 450 到 650 字。請嚴格依照以下 Markdown 格式結構回應：

## 🃏 牌陣總覽
用 2-3 句話概述這次牌陣傳達的核心能量與整體氛圍。

## 逐牌解析
對每一張牌分別以 ### 標題詳細解析，格式如下：
### 【位置名稱】牌名（正位/逆位）
- **牌面象徵**：描述這張牌的圖像意涵與原型象徵
- **在此位置的意義**：結合問題與位置，解釋這張牌在此處傳達的訊息
- **對問卜者的啟示**：這張牌想告訴問卜者什麼

## 🔮 整體綜合解讀
將所有牌串連成一個完整的故事線，分析牌與牌之間的關聯與互動。不只是個別牌義的疊加，而是找出牌陣中的「敘事弧線」——起因、發展、轉折、指引。

## 💡 具體建議
提供 3-5 點可實際執行的建議，每點都要具體且可行動：
- **建議標題**：詳細說明為什麼這樣做、怎麼做、預期效果

## ⚠️ 需要留意的面向
指出 1-2 個問卜者可能忽略或需要警惕的面向，語氣溫和但直接。

## ✨ 箴言
> 用一句富有詩意且深刻的箴言作為結語，給問卜者留下深刻印象。

規則：
- 使用繁體中文
- 語氣溫暖但帶有神秘感，像是一位充滿智慧的導師在對話
- 避免空洞的場面話或模稜兩可的描述
- 逆位牌要特別說明其能量轉變與提醒意義
- 牌與牌之間要建立邏輯連結，不要各說各的`;
  }

  return `You are a skilled tarot reader. Provide a clear, insightful interpretation in about 450 to 650 words based on the drawn cards, spread positions, and the querent's question. Use Markdown formatting with clear sections.`;
}

export function buildUserPrompt(request: AIInterpretationRequest): string {
  const spreadName =
    request.spreadType === 'single'
      ? '單牌占卜'
      : request.spreadType === 'three-card'
        ? '三牌占卜（過去／現在／未來）'
        : '凱爾特十字（十牌全面解析）';

  const cardsDescription = request.drawnCards
    .map(
      (dc) =>
        `- 位置「${dc.position}」：${dc.card.name}（${dc.card.nameEn}）— ${dc.isReversed ? '逆位' : '正位'}`,
    )
    .join('\n');

  // 凱爾特十字給額外的位置說明
  const positionGuide =
    request.spreadType === 'celtic-cross'
      ? `\n\n**位置含義參考：**
- 現況：目前的核心狀態
- 挑戰：面臨的主要障礙或影響
- 潛意識：深層的隱藏因素
- 過去：近期過往的影響
- 可能性：最佳可能的結果
- 近未來：即將發生的事件
- 自我：問卜者對情況的態度
- 環境：周圍人事物的影響
- 希望與恐懼：內心的期盼或擔憂
- 最終結果：事件的最終走向`
      : '';

  return `**問題：** ${request.question}

**牌陣：** ${spreadName}

**抽出的牌：**
${cardsDescription}${positionGuide}

請提供完整且深度的塔羅解讀。`;
}
