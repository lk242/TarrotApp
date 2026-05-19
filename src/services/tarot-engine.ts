import type { TarotCard, DrawnCard } from '../models/tarot-card';
import type { SpreadType } from '../models/spread';
import { SPREADS } from '../models/spread';
import { ALL_CARDS } from '../config/tarot-data';
import { fisherYatesShuffle } from '../utils/shuffle';

export function shuffleDeck(deck: TarotCard[] = ALL_CARDS): TarotCard[] {
  return fisherYatesShuffle(deck);
}

export function cutDeck(deck: TarotCard[]): TarotCard[] {
  const cutPoint = Math.floor(Math.random() * (deck.length - 10)) + 5;
  return [...deck.slice(cutPoint), ...deck.slice(0, cutPoint)];
}

export function drawCards(
  deck: TarotCard[],
  spreadType: SpreadType,
): DrawnCard[] {
  const spread = SPREADS[spreadType];
  return spread.positions.map((pos, i) => ({
    card: deck[i],
    isReversed: Math.random() < 0.3,
    position: pos.name,
  }));
}

export function performReading(spreadType: SpreadType): DrawnCard[] {
  const shuffled = shuffleDeck();
  const cut = cutDeck(shuffled);
  return drawCards(cut, spreadType);
}

/**
 * 從牌堆中抽一張「追問牌」。
 * 排除已出現的牌，確保不重複；position 標記為「追問指引」。
 */
export function drawExtraCard(excludeCardIds: string[]): DrawnCard {
  const excluded = new Set(excludeCardIds);
  const available = ALL_CARDS.filter((c) => !excluded.has(c.id));
  const deck = fisherYatesShuffle(available);
  return {
    card: deck[0],
    isReversed: Math.random() < 0.3,
    position: '追問指引',
  };
}
