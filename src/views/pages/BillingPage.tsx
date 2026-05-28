import { useState } from 'react';
import { Link } from 'react-router';
import {
  CREDIT_PACKAGES,
  FOLLOW_UP_CREDIT_COST,
  QUESTION_CREDIT_COST,
  REFERRAL_REWARD,
  SUBSCRIPTION_PLANS,
  type CreditPackageId,
  type SubscriptionTier,
} from '../../models/credits';
import { useAuth } from '../../controllers/useAuth';
import { useCredits } from '../../controllers/useCredits';
import { useI18n } from '../../controllers/useI18n';
import { useExchangeRate } from '../../controllers/useExchangeRate';
import { useReferral } from '../../controllers/useReferral';
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

type PkgLocale = Record<string, { name: string; description: string }>;

export default function BillingPage() {
  const { user } = useAuth();
  const { balance, loading, error } = useCredits();
  const { t, lang } = useI18n();
  const { convert } = useExchangeRate(lang);
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
            {t.billing.title}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {t.billing.subtitle
              .replace('{readingCost}', String(QUESTION_CREDIT_COST))
              .replace('{followUpCost}', String(FOLLOW_UP_CREDIT_COST))}
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
                    {t.billing.welcome.replace('{name}', user.displayName || '探索者')}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                    {t.billing.welcomeHint}
                  </p>
                </div>
              </div>
              {/* 右側：服務額度資訊 */}
              <div className="text-right">
                <p className="text-xs tracking-wider text-[var(--color-text-muted)] uppercase">
                  {t.billing.availablePoints}
                </p>
                <p className="mt-1 text-4xl font-bold text-[var(--color-accent-gold)]">
                  {loading ? '...' : balance}
                </p>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  {t.billing.canAsk
                    .replace('{readingCount}', String(Math.floor(balance / QUESTION_CREDIT_COST)))
                    .replace('{followUpCount}', String(Math.floor(balance / FOLLOW_UP_CREDIT_COST)))}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p className="mb-3 text-sm text-[var(--color-text-secondary)]">
                {t.billing.loginPrompt}
              </p>
              <Link
                to="/reading"
                className="text-sm font-bold text-[var(--color-accent-gold)] no-underline"
              >
                {t.billing.goLogin}
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

        <section className="ornate-card mb-8 rounded-xl p-5 text-sm leading-7 text-[var(--color-text-secondary)]">
          <h2 className="mb-3 text-lg font-bold text-[var(--color-text-primary)]">AI 塔羅解讀服務說明</h2>
          <p>
            本頁銷售內容為「神秘塔羅」線上 AI 塔羅解讀服務額度，可用於啟動全新牌陣解讀與同一輪解讀後的延伸追問服務。
            服務額度僅限本站帳戶本人於本站使用，不具貨幣價值，不得轉讓、兌換現金或用於其他平台商品交易。
          </p>
          <p className="mt-2">
            服務提供方式：付款完成後，系統會自動將可使用的解讀服務額度加入會員帳戶，使用者可在本站輸入問題、抽牌並取得 AI 產生的塔羅文字解讀。
          </p>
          <p className="mt-2 font-medium text-[var(--color-accent-gold)]">
            客服聯絡 Email：lukewolf899@gmail.com
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-lg font-bold text-[var(--color-text-primary)]">{t.billing.buyCredits}</h2>
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
                  <p className="text-base font-bold text-[var(--color-text-primary)]">{(t.billing.packages as PkgLocale)[item.id]?.name ?? item.name}</p>
                  <p className="mt-1 text-sm text-[var(--color-text-muted)]">{(t.billing.packages as PkgLocale)[item.id]?.description ?? item.description}</p>
                </div>
                <p className="mb-1 text-3xl font-bold text-[var(--color-accent-gold)]">
                  {convert(item.priceTwd).display}
                </p>
                <p className="mb-1 text-sm text-[var(--color-text-secondary)]">
                  {t.billing.pointsCount
                    .replace('{credits}', String(item.credits + item.bonusCredits))
                    .replace('{readingCount}', String(Math.floor((item.credits + item.bonusCredits) / QUESTION_CREDIT_COST)))
                    .replace('{followUpCount}', String(Math.floor((item.credits + item.bonusCredits) / FOLLOW_UP_CREDIT_COST)))}
                </p>
                {item.bonusCredits > 0 && (
                  <p className="mb-4 text-xs font-medium text-[var(--color-accent-mystic)]">
                    ✦ {t.billing.bonusTag.replace('{bonus}', String(item.bonusCredits))}
                  </p>
                )}
                <button
                  onClick={() => handlePackage(item.id)}
                  disabled={!user || Boolean(pending)}
                  className="w-full cursor-pointer rounded-lg border border-[var(--color-accent-gold)]/40 bg-[var(--color-accent-gold)]/15 px-4 py-2.5 text-sm font-bold tracking-wider text-[var(--color-accent-gold)] transition-all hover:bg-[var(--color-accent-gold)]/25 hover:border-[var(--color-accent-gold)]/60 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {pending?.type === 'package' && pending.id === item.id ? t.billing.creating : t.billing.buy}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-lg font-bold text-[var(--color-text-primary)]">{t.billing.subscribe}</h2>
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
                  <p className="text-base font-bold text-[var(--color-text-primary)]">{(t.billing.subscriptions as PkgLocale)[item.id]?.name ?? item.name}</p>
                  <p className="mt-1 text-sm text-[var(--color-text-muted)]">{(t.billing.subscriptions as PkgLocale)[item.id]?.description ?? item.description}</p>
                </div>
                <p className="mb-1 text-3xl font-bold text-[var(--color-accent-gold)]">
                  {convert(item.priceTwd).display}
                  <span className="text-sm font-normal text-[var(--color-text-muted)]"> {t.billing.perMonth}</span>
                </p>
                <p className="mb-1 text-sm text-[var(--color-text-secondary)]">
                  {t.billing.monthlyCount
                    .replace('{credits}', String(item.monthlyCredits + item.bonusCredits))
                    .replace('{readingCount}', String(Math.floor((item.monthlyCredits + item.bonusCredits) / QUESTION_CREDIT_COST)))
                    .replace('{followUpCount}', String(Math.floor((item.monthlyCredits + item.bonusCredits) / FOLLOW_UP_CREDIT_COST)))}
                </p>
                {item.bonusCredits > 0 && (
                  <p className="mb-4 text-xs font-medium text-[var(--color-accent-mystic)]">
                    ✦ {t.billing.bonusTag.replace('{bonus}', String(item.bonusCredits))}
                  </p>
                )}
                <button
                  onClick={() => handleSubscription(item.id)}
                  disabled={!user || Boolean(pending)}
                  className="w-full cursor-pointer rounded-lg border border-[var(--color-accent-purple)]/40 bg-gradient-to-r from-[var(--color-accent-purple)]/20 to-[var(--color-accent-mystic)]/20 px-4 py-2.5 text-sm font-bold tracking-wider text-[var(--color-accent-purple-light)] transition-all hover:border-[var(--color-accent-purple)]/60 hover:from-[var(--color-accent-purple)]/30 hover:to-[var(--color-accent-mystic)]/30 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {pending?.type === 'subscription' && pending.id === item.id ? t.billing.creating : t.billing.subscribing}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* 邀請碼區塊 */}
        {user && <ReferralSection t={t} />}
      </div>
    </div>
  );
}

/** 邀請好友區塊 */
function ReferralSection({ t }: { t: import('../../services/i18n').Locale }) {
  const { referralCode, referralLink, loading, applying, error, applied, reward, applyCode, copyLink } = useReferral();
  const [copied, setCopied] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const billingT = t.billing as Record<string, unknown>;

  const handleCopy = async () => {
    const ok = await copyLink();
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section className="ornate-card mt-8 rounded-xl p-6">
      <h2 className="mb-2 text-lg font-bold text-[var(--color-accent-gold)]">
        ✦ {billingT.referralTitle as string}
      </h2>
      <p className="mb-5 text-sm text-[var(--color-text-secondary)]">
        {(billingT.referralDesc as string).replace('{reward}', String(REFERRAL_REWARD))}
      </p>

      {/* 我的邀請碼 + 複製 */}
      <div className="mb-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
        <p className="mb-2 text-xs text-[var(--color-text-muted)]">{billingT.referralCode as string}</p>
        <div className="flex items-center gap-3">
          <code className="flex-1 rounded bg-[var(--color-bg-primary)] px-3 py-2 text-center text-lg font-bold tracking-[0.3em] text-[var(--color-accent-gold)]">
            {loading ? '...' : referralCode ?? '—'}
          </code>
          <button
            onClick={handleCopy}
            disabled={!referralLink}
            className="cursor-pointer rounded-lg border border-[var(--color-accent-gold)]/40 bg-[var(--color-accent-gold)]/10 px-4 py-2 text-sm font-bold text-[var(--color-accent-gold)] transition-all hover:bg-[var(--color-accent-gold)]/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {copied ? (billingT.referralCopied as string) : (billingT.referralCopy as string)}
          </button>
        </div>
      </div>

      {/* 兌換邀請碼 */}
      {!applied ? (
        <div>
          <p className="mb-2 text-xs text-[var(--color-text-muted)]">{billingT.referralInput as string}</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              maxLength={12}
              placeholder="XXXXXXXX"
              className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2.5 text-sm tracking-[0.15em] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none transition-colors focus:border-[var(--color-accent-gold)]"
            />
            <button
              onClick={() => applyCode(inputCode)}
              disabled={!inputCode.trim() || applying}
              className="cursor-pointer rounded-lg bg-[var(--color-accent-gold)] px-5 py-2.5 text-sm font-bold text-[var(--color-bg-primary)] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              {applying ? '...' : (billingT.referralApply as string)}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-xs text-red-400">{error}</p>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-center text-sm font-medium text-emerald-400">
          ✓ {(billingT.referralApplied as string).replace('{reward}', String(reward))}
        </div>
      )}
    </section>
  );
}
