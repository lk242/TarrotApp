export type SpreadType = 'single' | 'three-card' | 'celtic-cross' | 'yes-no';

export interface SpreadPosition {
  index: number;
  name: string;
  description: string;
}

export interface Spread {
  type: SpreadType;
  name: string;
  description: string;
  cardCount: number;
  positions: SpreadPosition[];
}

export const SPREADS: Record<SpreadType, Spread> = {
  single: {
    type: 'single',
    name: '單牌占卜',
    description: '抽取一張牌，獲得簡潔有力的指引',
    cardCount: 1,
    positions: [
      { index: 0, name: '指引', description: '當前情況的核心訊息' },
    ],
  },
  'three-card': {
    type: 'three-card',
    name: '三牌占卜',
    description: '過去、現在、未來的完整脈絡',
    cardCount: 3,
    positions: [
      { index: 0, name: '過去', description: '影響現況的過往因素' },
      { index: 1, name: '現在', description: '當前面臨的核心狀態' },
      { index: 2, name: '未來', description: '可能的發展方向' },
    ],
  },
  'celtic-cross': {
    type: 'celtic-cross',
    name: '凱爾特十字',
    description: '最經典的全面深度解析牌陣',
    cardCount: 10,
    positions: [
      { index: 0, name: '現況', description: '目前的核心狀態' },
      { index: 1, name: '挑戰', description: '面臨的主要障礙' },
      { index: 2, name: '潛意識', description: '深層的影響因素' },
      { index: 3, name: '過去', description: '近期過往的影響' },
      { index: 4, name: '可能性', description: '最佳可能的結果' },
      { index: 5, name: '近未來', description: '即將發生的事件' },
      { index: 6, name: '自我', description: '你對情況的態度' },
      { index: 7, name: '環境', description: '周圍人事物的影響' },
      { index: 8, name: '希望與恐懼', description: '內心的期盼或擔憂' },
      { index: 9, name: '最終結果', description: '事件的最終走向' },
    ],
  },
  'yes-no': {
    type: 'yes-no',
    name: '是非占卜',
    description: '一張牌快速回答 Yes 或 No',
    cardCount: 1,
    positions: [
      { index: 0, name: '神諭', description: '宇宙對你問題的直接回應' },
    ],
  },
};
