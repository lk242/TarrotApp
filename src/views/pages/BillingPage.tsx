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
          <h1 className="mb-3 text-2xl font-bold text-[var(--color-accent-gold)]">
            點數與訂閱
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            註冊或 Google 登入會自動贈送 100 點；每次全新占卜或追問都消耗 {QUESTION_CREDIT_COST} 點。
          </p>
        </div>

        <section className="mb-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 shadow-[var(--shadow-card)]">
          {user ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs tracking-wider text-[var(--color-text-muted)] uppercase">
                  目前可用點數
                </p>
                <p className="mt-1 text-4xl font-bold text-[var(--color-accent-gold)]">
                  {loading ? '...' : balance}
                </p>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">
                約可再提問 {Math.floor(balance / QUESTION_CREDIT_COST)} 次
              </p>
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
                className={`rounded-xl border bg-[var(--color-bg-card)] p-5 shadow-[var(--shadow-card)] ${
                  item.featured
                    ? 'border-[var(--color-accent-gold)]'
                    : 'border-[var(--color-border)]'
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
                  className="w-full cursor-pointer rounded-lg bg-[var(--color-accent-gold)] px-4 py-2.5 text-sm font-bold text-[var(--color-bg-primary)] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
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
                className={`rounded-xl border bg-[var(--color-bg-card)] p-5 shadow-[var(--shadow-card)] ${
                  item.featured
                    ? 'border-[var(--color-accent-gold)]'
                    : 'border-[var(--color-border)]'
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
                  className="w-full cursor-pointer rounded-lg bg-gradient-to-r from-[var(--color-accent-purple)] to-[var(--color-accent-mystic)] px-4 py-2.5 text-sm font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {pending?.type === 'subscription' && pending.id === item.id ? '建立中...' : '訂閱'}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 text-sm leading-relaxed text-[var(--color-text-secondary)] shadow-[var(--shadow-card)]">
          <h2 className="mb-3 text-lg font-bold text-[var(--color-text-primary)]">定價估算</h2>
          <p>
            目前 AI 使用 OpenAI gpt-4.1-mini，官方價格為輸入每 100 萬 tokens US$0.40、輸出每 100 萬 tokens US$1.60。
            以 1 美元約 NT$32 估算，一次完整占卜或追問的 AI 成本約 NT$0.15 至 NT$0.25。
          </p>
          <p className="mt-3">
            每次提問扣 5 點後，NT$199 / 1200 點等於每次約 NT$0.83；月訂閱 NT$299 / 2500 點等於每次約 NT$0.60。
            這樣能保留足夠毛利用來吸收 Firebase、付款手續費與後續客服成本，星辰方案可作為主要推薦方案。
          </p>
        </section>
      </div>
    </div>
  );
}
