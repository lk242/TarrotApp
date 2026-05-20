import { useState } from 'react';
import { Link } from 'react-router';
import {
  CREDIT_PACKAGES,
  QUESTION_CREDIT_COST,
  SUBSCRIPTION_PLANS,
  type CreditPackageId,
  type SubscriptionTier,
} from '../../models/credits';
import { useAuth } from '../../controllers/useAuth';
import { useCredits } from '../../controllers/useCredits';
import {
  createCreditPurchaseCallable,
  createSubscriptionCallable,
} from '../../services/credits/credit-service';

type PurchaseTarget =
  | { type: 'package'; id: CreditPackageId }
  | { type: 'subscription'; id: Exclude<SubscriptionTier, 'none'> };

function submitCheckoutForm(action: string, fields: Array<{ name: string; value: string }>) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = action;
  form.style.display = 'none';

  fields.forEach((field) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = field.name;
    input.value = field.value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
}

export default function BillingPage() {
  const { user } = useAuth();
  const { balance, loading, error } = useCredits();
  const [pending, setPending] = useState<PurchaseTarget | null>(null);
  const [message, setMessage] = useState('');

  const handlePackage = async (packageId: CreditPackageId) => {
    setPending({ type: 'package', id: packageId });
    setMessage('');
    try {
      const result = await createCreditPurchaseCallable({ packageId });
      if (result.data.checkout) {
        submitCheckoutForm(result.data.checkout.action, result.data.checkout.fields);
        return;
      }
      if (result.data.checkoutUrl) {
        window.location.assign(result.data.checkoutUrl);
        return;
      }
      setMessage(result.data.message);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '建立購買流程失敗');
    } finally {
      setPending(null);
    }
  };

  const handleSubscription = async (planId: Exclude<SubscriptionTier, 'none'>) => {
    setPending({ type: 'subscription', id: planId });
    setMessage('');
    try {
      const result = await createSubscriptionCallable({ planId });
      if (result.data.checkoutUrl) {
        window.location.assign(result.data.checkoutUrl);
        return;
      }
      setMessage(result.data.message);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '建立訂閱流程失敗');
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-20">
      <div className="w-full max-w-5xl animate-fade-in-up">
        <div className="mb-8 text-center">
          <div className="animate-rune-pulse mb-3 text-3xl text-[var(--color-accent-gold)]">⊛</div>
          <h1 className="mb-3 text-2xl font-bold tracking-[0.15em] text-[var(--color-accent-gold)]" style={{ fontVariant: 'small-caps' }}>
            點數與訂閱
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            註冊或 Google 登入會自動贈送 100 點；每次全新占卜或追問都消耗 {QUESTION_CREDIT_COST} 點。
          </p>
        </div>

        <section className="ornate-card mb-8 rounded-xl p-6">
          {user ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* 左側：裝飾符號 + 歡迎語 */}
              <div className="flex items-center gap-4">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="h-14 w-14 flex-shrink-0 rounded-full border-2 border-[var(--color-accent-gold)]/30 object-cover" />
                ) : (
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border-2 border-[var(--color-accent-gold)]/30 bg-[var(--color-accent-purple)]/20 text-lg font-bold text-[var(--color-accent-gold)]">
                    {(user.displayName || user.email || '?')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">
                    {user.displayName || '探索者'}，歡迎回來
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                    願星辰指引你的每一次占卜
                  </p>
                </div>
              </div>
              {/* 右側：點數資訊 */}
              <div className="text-right">
                <p className="text-xs tracking-wider text-[var(--color-text-muted)] uppercase">
                  目前可用點數
                </p>
                <p className="mt-1 text-4xl font-bold text-[var(--color-accent-gold)]">
                  {loading ? '...' : balance}
                </p>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  約可再提問 {Math.floor(balance / QUESTION_CREDIT_COST)} 次
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p className="mb-3 text-sm text-[var(--color-text-secondary)]">
                請先登入，系統會建立你的點數帳戶並發放新會員 100 點。
              </p>
              <Link
                to="/reading"
                className="text-sm font-bold text-[var(--color-accent-gold)] no-underline"
              >
                前往占卜頁登入
              </Link>
            </div>
          )}
          {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
        </section>

        {message && (
          <div className="mb-8 rounded-lg border border-[var(--color-accent-gold)]/30 bg-[var(--color-accent-gold)]/10 p-4 text-sm text-[var(--color-text-secondary)]">
            {message}
          </div>
        )}

        <section className="mb-10">
          <h2 className="mb-4 text-lg font-bold text-[var(--color-text-primary)]">購買點數</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {CREDIT_PACKAGES.map((item) => (
              <div
                key={item.id}
                className={`ornate-card rounded-xl p-5 ${
                  item.featured
                    ? 'border-[var(--color-accent-gold)] animate-border-glow'
                    : ''
                }`}
              >
                <div className="mb-4">
                  <p className="text-base font-bold text-[var(--color-text-primary)]">{item.name}</p>
                  <p className="mt-1 text-sm text-[var(--color-text-muted)]">{item.description}</p>
                </div>
                <p className="mb-1 text-3xl font-bold text-[var(--color-accent-gold)]">
                  NT${item.priceTwd}
                </p>
                <p className="mb-5 text-sm text-[var(--color-text-secondary)]">
                  {item.credits} 點，約 {Math.floor(item.credits / QUESTION_CREDIT_COST)} 次提問
                </p>
                <button
                  onClick={() => handlePackage(item.id)}
                  disabled={!user || Boolean(pending)}
                  className="w-full cursor-pointer rounded-lg border border-[var(--color-accent-gold)]/40 bg-[var(--color-accent-gold)]/15 px-4 py-2.5 text-sm font-bold tracking-wider text-[var(--color-accent-gold)] transition-all hover:bg-[var(--color-accent-gold)]/25 hover:border-[var(--color-accent-gold)]/60 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {pending?.type === 'package' && pending.id === item.id ? '建立中...' : '購買'}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-lg font-bold text-[var(--color-text-primary)]">訂閱帳戶</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {SUBSCRIPTION_PLANS.map((item) => (
              <div
                key={item.id}
                className={`ornate-card rounded-xl p-5 ${
                  item.featured
                    ? 'border-[var(--color-accent-gold)] animate-border-glow'
                    : ''
                }`}
              >
                <div className="mb-4">
                  <p className="text-base font-bold text-[var(--color-text-primary)]">{item.name}</p>
                  <p className="mt-1 text-sm text-[var(--color-text-muted)]">{item.description}</p>
                </div>
                <p className="mb-1 text-3xl font-bold text-[var(--color-accent-gold)]">
                  NT${item.priceTwd}
                  <span className="text-sm font-normal text-[var(--color-text-muted)]"> / 月</span>
                </p>
                <p className="mb-5 text-sm text-[var(--color-text-secondary)]">
                  每月 {item.monthlyCredits} 點，約 {Math.floor(item.monthlyCredits / QUESTION_CREDIT_COST)} 次提問
                </p>
                <button
                  onClick={() => handleSubscription(item.id)}
                  disabled={!user || Boolean(pending)}
                  className="w-full cursor-pointer rounded-lg border border-[var(--color-accent-purple)]/40 bg-gradient-to-r from-[var(--color-accent-purple)]/20 to-[var(--color-accent-mystic)]/20 px-4 py-2.5 text-sm font-bold tracking-wider text-[var(--color-accent-purple-light)] transition-all hover:border-[var(--color-accent-purple)]/60 hover:from-[var(--color-accent-purple)]/30 hover:to-[var(--color-accent-mystic)]/30 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {pending?.type === 'subscription' && pending.id === item.id ? '建立中...' : '訂閱'}
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
