import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import type { CreditProfile } from '../models/credits';
import { getCreditBalanceCallable, subscribeCreditProfile } from '../services/credits/credit-service';

interface CreditsState {
  profile: CreditProfile | null;
  balance: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const CreditsContext = createContext<CreditsState | null>(null);

export function useCredits(): CreditsState {
  const ctx = useContext(CreditsContext);
  if (!ctx) throw new Error('useCredits 必須在 CreditsContext 內使用');
  return ctx;
}

export function useCreditState(user: User | null): CreditsState {
  const [profile, setProfile] = useState<CreditProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await getCreditBalanceCallable();
      setProfile(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '讀取點數失敗');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    queueMicrotask(() => {
      refresh();
    });
    return subscribeCreditProfile(
      user.uid,
      (nextProfile) => {
        setProfile(nextProfile);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
  }, [refresh, user]);

  const activeProfile = user ? profile : null;

  return {
    profile: activeProfile,
    balance: activeProfile?.balance ?? 0,
    loading: user ? loading : false,
    error,
    refresh,
  };
}
