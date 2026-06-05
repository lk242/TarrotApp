import { httpsCallable } from 'firebase/functions';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, functions } from '../firebase/config';
import type { CreditPackageId, CreditProfile, SubscriptionTier } from '../../models/credits';

export const getCreditBalanceCallable = httpsCallable<void, CreditProfile>(
  functions,
  'getCreditBalance',
);

export const createCreditPurchaseCallable = httpsCallable<
  { packageId: CreditPackageId },
  {
    orderId?: string;
    checkout?: {
      action: string;
      fields: Array<{ name: string; value: string }>;
    };
    checkoutUrl?: string;
    message: string;
  }
>(functions, 'createCreditPurchase');

export const createSubscriptionCallable = httpsCallable<
  { planId: Exclude<SubscriptionTier, 'none'> },
  { checkoutUrl?: string; message: string }
>(functions, 'createSubscription');

export const redeemCodeCallable = httpsCallable<
  { code: string },
  { credits: number; productLabel: string }
>(functions, 'redeemCode');

export function subscribeCreditProfile(
  userId: string,
  onChange: (profile: CreditProfile | null) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    doc(db, 'users', userId),
    (snapshot) => {
      onChange(snapshot.exists() ? (snapshot.data() as CreditProfile) : null);
    },
    onError,
  );
}
