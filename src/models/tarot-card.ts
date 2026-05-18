export type Arcana = 'major' | 'minor';
export type Suit = 'wands' | 'cups' | 'swords' | 'pentacles';

export interface TarotCard {
  id: string;
  name: string;
  nameEn: string;
  arcana: Arcana;
  suit?: Suit;
  number: number;
  imageUrl: string;
  keywords: string[];
  reversedKeywords: string[];
}

export interface DrawnCard {
  card: TarotCard;
  isReversed: boolean;
  position: string;
}
