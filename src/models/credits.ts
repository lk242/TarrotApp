export const WELCOME_CREDITS = 200;
export const QUESTION_CREDIT_COST = 20;
export const FOLLOW_UP_CREDIT_COST = 5;

export interface CreditProfile {
  userId: string;
  balance: number;
  freeCreditsGranted: boolean;
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: 'none' | 'active' | 'past_due' | 'canceled';
  updatedAt?: number;
}

export interface CreditTransaction {
  id: string;
  amount: number;
  type: 'welcome' | 'usage' | 'purchase' | 'subscription' | 'refund' | 'adjustment';
  reason: string;
  createdAt: number;
}

export type CreditPackageId = 'starter' | 'standard' | 'deep';
export type SubscriptionTier = 'none' | 'monthly_light' | 'monthly_plus' | 'monthly_pro';

export interface CreditPackage {
  id: CreditPackageId;
  name: string;
  credits: number;
  bonusCredits: number;
  priceTwd: number;
  description: string;
  featured?: boolean;
}

export interface SubscriptionPlan {
  id: Exclude<SubscriptionTier, 'none'>;
  name: string;
  monthlyCredits: number;
  bonusCredits: number;
  priceTwd: number;
  description: string;
  featured?: boolean;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'starter',
    name: '入門補充包',
    credits: 400,
    bonusCredits: 0,
    priceTwd: 129,
    description: '約 20 次全新占卜，或 80 次追問。',
  },
  {
    id: 'standard',
    name: '標準靈感包',
    credits: 800,
    bonusCredits: 80,
    priceTwd: 269,
    description: '約 44 次全新占卜，或 176 次追問。',
    featured: true,
  },
  {
    id: 'deep',
    name: '深度探索包',
    credits: 1600,
    bonusCredits: 150,
    priceTwd: 529,
    description: '約 87 次全新占卜，或 350 次追問。',
  },
];

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'monthly_light',
    name: '月光方案',
    monthlyCredits: 600,
    bonusCredits: 0,
    priceTwd: 199,
    description: '每月約 30 次全新占卜，或 120 次追問。',
  },
  {
    id: 'monthly_plus',
    name: '星辰方案',
    monthlyCredits: 1200,
    bonusCredits: 80,
    priceTwd: 399,
    description: '每月約 64 次全新占卜，或 256 次追問。',
    featured: true,
  },
  {
    id: 'monthly_pro',
    name: '神諭方案',
    monthlyCredits: 2400,
    bonusCredits: 150,
    priceTwd: 749,
    description: '每月約 127 次全新占卜，或 510 次追問。',
  },
];
