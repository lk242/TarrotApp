import { useEffect, useState } from 'react';
import { useAuth } from '../../controllers/useAuth';
import {
  adminAdjustCreditsCallable,
  adminCheckAccessCallable,
  adminFindCreditUserCallable,
  type AdminCreditUser,
} from '../../services/admin/admin-service';

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [adminEmail, setAdminEmail] = useState('');
  const [query, setQuery] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [target, setTarget] = useState<AdminCreditUser | null>(null);
  const [checking, setChecking] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user) return;

    let active = true;

    queueMicrotask(() => {
      setChecking(true);
      setError('');

      adminCheckAccessCallable()
        .then((result) => {
          if (!active) return;
          setAdminEmail(result.data.email);
        })
        .catch((err) => {
          if (!active) return;
          setAdminEmail('');
          setError(err instanceof Error ? err.message : '無法確認管理員權限');
        })
        .finally(() => {
          if (active) setChecking(false);
        });
    });

    return () => {
      active = false;
    };
  }, [user]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setPending(true);
    setError('');
    setMessage('');
    try {
      const result = await adminFindCreditUserCallable({ query: query.trim() });
      setTarget(result.data);
    } catch (err) {
      setTarget(null);
      setError(err instanceof Error ? err.message : '查詢使用者失敗');
    } finally {
      setPending(false);
    }
  };

  const handleAdjust = async () => {
    if (!target) return;
    const parsedAmount = Number(amount);
    setPending(true);
    setError('');
    setMessage('');
    try {
      const result = await adminAdjustCreditsCallable({
        userId: target.user.uid,
        amount: parsedAmount,
        reason: reason.trim(),
      });
      setTarget({
        ...target,
        profile: result.data.profile,
        transactions: result.data.transactions,
      });
      setAmount('');
      setReason('');
      setMessage('點數已調整並寫入交易紀錄');
    } catch (err) {
      setError(err instanceof Error ? err.message : '調整點數失敗');
    } finally {
      setPending(false);
    }
  };

  if (loading || checking) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-20 text-sm text-[var(--color-text-secondary)]">
        檢查管理員權限...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-20 text-sm text-[var(--color-text-secondary)]">
        請先登入管理員帳號。
      </div>
    );
  }

  if (!adminEmail) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-20">
        <div className="max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 text-center shadow-[var(--shadow-card)]">
          <h1 className="mb-3 text-xl font-bold text-[var(--color-accent-gold)]">無管理權限</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            目前登入帳號沒有點數管理權限。
          </p>
          {error && <p className="mt-3 text-xs text-red-300">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-20">
      <div className="w-full max-w-5xl animate-fade-in-up">
        <div className="mb-8">
          <p className="mb-2 text-xs tracking-wider text-[var(--color-text-muted)] uppercase">
            Admin
          </p>
          <h1 className="text-2xl font-bold text-[var(--color-accent-gold)]">點數管理</h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            目前管理員：{adminEmail}
          </p>
        </div>

        <section className="mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[var(--shadow-card)]">
          <label className="mb-2 block text-sm font-bold text-[var(--color-text-primary)]">
            查詢使用者
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleSearch();
              }}
              placeholder="輸入 email 或 uid"
              className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-gold)]"
            />
            <button
              onClick={handleSearch}
              disabled={pending || !query.trim()}
              className="cursor-pointer rounded-lg bg-[var(--color-accent-gold)] px-5 py-2.5 text-sm font-bold text-[var(--color-bg-primary)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              查詢
            </button>
          </div>
        </section>

        {error && (
          <div className="mb-6 rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-200">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-6 rounded-lg border border-[var(--color-accent-gold)]/30 bg-[var(--color-accent-gold)]/10 p-4 text-sm text-[var(--color-text-secondary)]">
            {message}
          </div>
        )}

        {target && (
          <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[var(--shadow-card)]">
              <h2 className="mb-4 text-lg font-bold text-[var(--color-text-primary)]">
                使用者資料
              </h2>
              <div className="space-y-2 text-sm text-[var(--color-text-secondary)]">
                <p>Email：{target.user.email || '-'}</p>
                <p>名稱：{target.user.displayName || '-'}</p>
                <p className="break-all">UID：{target.user.uid}</p>
                <p>狀態：{target.user.disabled ? '停用' : '正常'}</p>
              </div>
              <div className="mt-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
                <p className="text-xs tracking-wider text-[var(--color-text-muted)] uppercase">
                  目前點數
                </p>
                <p className="mt-1 text-4xl font-bold text-[var(--color-accent-gold)]">
                  {target.profile.balance}
                </p>
              </div>

              <div className="mt-6 space-y-3">
                <label className="block text-sm font-bold text-[var(--color-text-primary)]">
                  調整點數
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="正數補點，負數扣點，例如 100 或 -20"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-gold)]"
                />
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="調整原因，例如：客服補點、活動贈點、退款修正"
                  rows={3}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-gold)]"
                />
                <button
                  onClick={handleAdjust}
                  disabled={pending || !amount || !reason.trim()}
                  className="w-full cursor-pointer rounded-lg bg-gradient-to-r from-[var(--color-accent-purple)] to-[var(--color-accent-mystic)] px-5 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  寫入調整
                </button>
              </div>
            </section>

            <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[var(--shadow-card)]">
              <h2 className="mb-4 text-lg font-bold text-[var(--color-text-primary)]">
                最近交易
              </h2>
              <div className="space-y-3">
                {target.transactions.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-muted)]">尚無交易紀錄</p>
                ) : (
                  target.transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 text-sm"
                    >
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <span
                          className={
                            transaction.amount > 0
                              ? 'font-bold text-green-300'
                              : 'font-bold text-red-300'
                          }
                        >
                          {transaction.amount > 0 ? '+' : ''}
                          {transaction.amount}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {transaction.type}
                        </span>
                      </div>
                      <p className="text-[var(--color-text-secondary)]">{transaction.reason}</p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
