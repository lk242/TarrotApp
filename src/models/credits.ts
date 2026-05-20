export const WELCOME_CREDITS = 100;
export const QUESTION_CREDIT_COST = 5;

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
  priceTwd: number;
  description: string;
  featured?: boolean;
}

export interface SubscriptionPlan {
  id: Exclude<SubscriptionTier, 'none'>;
  name: string;
  monthlyCredits: number;
  priceTwd: number;
  description: string;
  featured?: boolean;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'starter',
    name: '入門補充包',
    credits: 500,
    priceTwd: 99,
    description: '約 100 次提問，適合偶爾使用。',
  },
  {
    id: 'standard',
    name: '標準靈感包',
    credits: 1200,
    priceTwd: 199,
    description: '約 240 次提問，單次成本更低。',
    featured: true,
  },
  {
    id: 'deep',
    name: '深度探索包',
    credits: 3000,
    priceTwd: 399,
    description: '約 600 次提問，適合大量追問。',
  },
];

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'monthly_light',
    name: '月光方案',
    monthlyCredits: 1000,
    priceTwd: 149,
    description: '每月約 200 次提問，輕鬆維持占卜習慣。',
  },
  {
    id: 'monthly_plus',
    name: '星辰方案',
    monthlyCredits: 2500,
    priceTwd: 299,
    description: '每月約 500 次提問，最受歡迎的超值選擇。',
    featured: true,
  },
  {
    id: 'monthly_pro',
    name: '神諭方案',
    monthlyCredits: 6000,
    priceTwd: 599,
    description: '每月約 1200 次提問，深度探索不設限。',
  },
];
