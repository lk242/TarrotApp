import type { TarotCard } from '../../models/tarot-card';
import type { LangCode, Locale } from '.';

const JA_MAJOR_NAMES = [
  '愚者',
  '魔術師',
  '女教皇',
  '女帝',
  '皇帝',
  '教皇',
  '恋人',
  '戦車',
  '力',
  '隠者',
  '運命の輪',
  '正義',
  '吊るされた男',
  '死神',
  '節制',
  '悪魔',
  '塔',
  '星',
  '月',
  '太陽',
  '審判',
  '世界',
];

const JA_SUIT_NAMES: Record<NonNullable<TarotCard['suit']>, string> = {
  wands: 'ワンド',
  cups: 'カップ',
  swords: 'ソード',
  pentacles: 'ペンタクル',
};

const JA_MINOR_RANKS = [
  'エース',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'ペイジ',
  'ナイト',
  'クイーン',
  'キング',
];

const ZH_POSITION_LABELS: Record<string, { group: keyof Locale['positions']; index: number }> = {
  指引: { group: 'single', index: 0 },
  過去: { group: 'threeCard', index: 0 },
  現在: { group: 'threeCard', index: 1 },
  未來: { group: 'threeCard', index: 2 },
  現況: { group: 'celticCross', index: 0 },
  挑戰: { group: 'celticCross', index: 1 },
  潛意識: { group: 'celticCross', index: 2 },
  可能性: { group: 'celticCross', index: 4 },
  近未來: { group: 'celticCross', index: 5 },
  自我: { group: 'celticCross', index: 6 },
  環境: { group: 'celticCross', index: 7 },
  希望與恐懼: { group: 'celticCross', index: 8 },
  最終結果: { group: 'celticCross', index: 9 },
};

export function getCardDisplayName(card: TarotCard, lang: LangCode): string {
  if (lang === 'en') return card.nameEn;
  if (lang !== 'ja') return card.name;

  if (card.arcana === 'major') return JA_MAJOR_NAMES[card.number] ?? card.name;
  if (!card.suit) return card.name;

  const suit = JA_SUIT_NAMES[card.suit];
  const rank = JA_MINOR_RANKS[card.number - 1];
  return suit && rank ? `${suit}${rank}` : card.name;
}

export function getPositionDisplayName(position: string, t: Locale): string {
  const target = ZH_POSITION_LABELS[position];
  if (!target) return position;
  return t.positions[target.group][target.index] ?? position;
}
