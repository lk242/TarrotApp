import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';
import type { CreditProfile, CreditTransaction } from '../../models/credits';

export interface AdminCreditUser {
  user: {
    uid: string;
    email: string;
    displayName: string;
    photoURL: string;
    disabled: boolean;
  };
  profile: CreditProfile;
  transactions: CreditTransaction[];
}

export interface AdminUserListItem {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  disabled: boolean;
  providerId: string;
  creationTime: string;
  lastSignInTime: string;
  balance: number;
}

export const adminCheckAccessCallable = httpsCallable<void, { email: string }>(
  functions,
  'adminCheckAccess',
);

export const adminFindCreditUserCallable = httpsCallable<
  { query: string },
  AdminCreditUser
>(functions, 'adminFindCreditUser');

export const adminListUsersCallable = httpsCallable<
  { maxResults?: number },
  { users: AdminUserListItem[]; total: number }
>(functions, 'adminListUsers');

export const adminAdjustCreditsCallable = httpsCallable<
  { userId: string; amount: number; reason: string },
  Pick<AdminCreditUser, 'profile' | 'transactions'>
>(functions, 'adminAdjustCredits');
