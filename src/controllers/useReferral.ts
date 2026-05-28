import { useCallback, useEffect, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
import { useAuth } from './useAuth';
import { useCredits } from './useCredits';

const REGION = 'asia-east1';

/**
 * useReferral — 邀請碼功能的 Controller hook。
 *
 * 提供：
 * - referralCode: 當前使用者的邀請碼
 * - referralLink: 完整分享連結
 * - applyCode: 兌換他人的邀請碼
 * - loading / error / applied 狀態
 */
export function useReferral() {
  const { user } = useAuth();
  const { refresh: refreshCredits } = useCredits();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [applied, setApplied] = useState(false);
  const [reward, setReward] = useState(0);

  // 取得邀請碼
  useEffect(() => {
    if (!user) return;
    const functions = getFunctions(getApp(), REGION);
    const getReferralCodeFn = httpsCallable<void, { code: string }>(functions, 'getReferralCode');

    setLoading(true);
    getReferralCodeFn()
      .then((result) => setReferralCode(result.data.code))
      .catch((err) => console.error('[referral] getReferralCode failed:', err))
      .finally(() => setLoading(false));
  }, [user]);

  const referralLink = referralCode
    ? `${window.location.origin}?ref=${referralCode}`
    : null;

  // 兌換邀請碼
  const applyCode = useCallback(
    async (code: string) => {
      if (!user || !code.trim()) return;
      setApplying(true);
      setError('');
      try {
        const functions = getFunctions(getApp(), REGION);
        const applyReferralCodeFn = httpsCallable<{ code: string }, { reward: number }>(
          functions,
          'applyReferralCode',
        );
        const result = await applyReferralCodeFn({ code: code.trim() });
        setReward(result.data.reward);
        setApplied(true);
        refreshCredits().catch(console.error);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : '兌換失敗';
        setError(message);
      } finally {
        setApplying(false);
      }
    },
    [user, refreshCredits],
  );

  // 複製邀請連結
  const copyLink = useCallback(async () => {
    if (!referralLink) return false;
    try {
      await navigator.clipboard.writeText(referralLink);
      return true;
    } catch {
      return false;
    }
  }, [referralLink]);

  return {
    referralCode,
    referralLink,
    loading,
    applying,
    error,
    applied,
    reward,
    applyCode,
    copyLink,
  };
}
