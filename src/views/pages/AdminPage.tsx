import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../controllers/useAuth';
import {
  adminAdjustCreditsCallable,
  adminCheckAccessCallable,
  adminFindCreditUserCallable,
  adminListUsersCallable,
  type AdminCreditUser,
  type AdminUserListItem,
} from '../../services/admin/admin-service';

/** 登入方式 providerId → 中文顯示 */
function providerLabel(providerId: string): string {
  if (providerId.includes('google')) return 'Google';
  if (providerId.includes('password')) return 'Email';
  if (providerId.includes('custom') || providerId === '') return 'LINE';
  return providerId;
}

/** 格式化時間 */
function formatTime(iso: string): string {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

type Tab = 'users' | 'credits';

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [adminEmail, setAdminEmail] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('users');

  // 使用者名單
  const [userList, setUserList] = useState<AdminUserListItem[]>([]);
  const [userListLoading, setUserListLoading] = useState(false);
  const [userListLoaded, setUserListLoaded] = useState(false);
  const [filterText, setFilterText] = useState('');

  // 點數管理
  const [query, setQuery] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [target, setTarget] = useState<AdminCreditUser | null>(null);

  const [checking, setChecking] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // 檢查管理員權限
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

    return () => { active = false; };
  }, [user]);

  // 載入使用者名單
  const loadUsers = async () => {
    setUserListLoading(true);
    setError('');
    try {
      const result = await adminListUsersCallable({ maxResults: 200 });
      setUserList(result.data.users);
      setUserListLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入使用者失敗');
    } finally {
      setUserListLoading(false);
    }
  };

  // 切到 users tab 時自動載入
  useEffect(() => {
    if (activeTab === 'users' && adminEmail && !userListLoaded && !userListLoading) {
      loadUsers();
    }
  }, [activeTab, adminEmail]); // eslint-disable-line react-hooks/exhaustive-deps

  // 搜尋過濾
  const filteredUsers = useMemo(() => {
    if (!filterText.trim()) return userList;
    const lower = filterText.toLowerCase();
    return userList.filter(
      (u) =>
        u.email.toLowerCase().includes(lower) ||
        u.displayName.toLowerCase().includes(lower) ||
        u.uid.toLowerCase().includes(lower) ||
        providerLabel(u.providerId).toLowerCase().includes(lower),
    );
  }, [userList, filterText]);

  // 點數管理：查詢使用者
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

  // 從名單快速帶入查詢
  const handleSelectUser = (u: AdminUserListItem) => {
    setActiveTab('credits');
    setQuery(u.email || u.uid);
    // 直接查詢
    setPending(true);
    setError('');
    setMessage('');
    adminFindCreditUserCallable({ query: u.email || u.uid })
      .then((result) => setTarget(result.data))
      .catch((err) => {
        setTarget(null);
        setError(err instanceof Error ? err.message : '查詢使用者失敗');
      })
      .finally(() => setPending(false));
  };

  // 點數調整
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

  /* ---------- 渲染 ---------- */

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
            目前登入帳號沒有管理員權限。
          </p>
          {error && <p className="mt-3 text-xs text-red-300">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-20">
      <div className="w-full max-w-5xl animate-fade-in-up">
        {/* 標題 */}
        <div className="mb-6">
          <p className="mb-2 text-xs tracking-wider text-[var(--color-text-muted)] uppercase">
            Admin
          </p>
          <h1 className="text-2xl font-bold text-[var(--color-accent-gold)]">管理後台</h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            管理員：{adminEmail}
          </p>
        </div>

        {/* Tab 切換 */}
        <div className="mb-6 flex gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-1">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 cursor-pointer rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'users'
                ? 'bg-[var(--color-accent-gold)] text-[var(--color-bg-primary)]'
                : 'bg-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            成員名單
          </button>
          <button
            onClick={() => setActiveTab('credits')}
            className={`flex-1 cursor-pointer rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'credits'
                ? 'bg-[var(--color-accent-gold)] text-[var(--color-bg-primary)]'
                : 'bg-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            點數管理
          </button>
        </div>

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

        {/* ===== 成員名單 Tab ===== */}
        {activeTab === 'users' && (
          <section className="space-y-4">
            {/* 搜尋列 + 重新整理 */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <input
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  placeholder="搜尋 email、名稱、UID 或登入方式..."
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2.5 pl-10 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-gold)]"
                />
                <svg
                  className="absolute top-1/2 left-3 -translate-y-1/2 text-[var(--color-text-muted)]"
                  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
              </div>
              <button
                onClick={loadUsers}
                disabled={userListLoading}
                className="cursor-pointer rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-accent-gold)] disabled:opacity-40"
              >
                {userListLoading ? '載入中...' : '重新整理'}
              </button>
            </div>

            {/* 統計 */}
            <p className="text-xs text-[var(--color-text-muted)]">
              共 {userList.length} 位使用者
              {filterText && `，篩選出 ${filteredUsers.length} 位`}
            </p>

            {/* 名單表格 */}
            {userListLoading && !userListLoaded ? (
              <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">
                載入使用者名單中...
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-card)]">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-card)]">
                      <th className="px-4 py-3 font-medium text-[var(--color-text-muted)]">使用者</th>
                      <th className="hidden px-4 py-3 font-medium text-[var(--color-text-muted)] sm:table-cell">登入方式</th>
                      <th className="px-4 py-3 text-right font-medium text-[var(--color-text-muted)]">點數</th>
                      <th className="hidden px-4 py-3 font-medium text-[var(--color-text-muted)] md:table-cell">最後登入</th>
                      <th className="px-4 py-3 font-medium text-[var(--color-text-muted)]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                          {filterText ? '找不到符合條件的使用者' : '尚無使用者'}
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr
                          key={u.uid}
                          className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] transition-colors hover:bg-[var(--color-bg-card)]"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {u.photoURL ? (
                                <img
                                  src={u.photoURL}
                                  alt=""
                                  className="h-8 w-8 rounded-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-accent-purple)]/30 text-xs font-bold text-[var(--color-accent-gold)]">
                                  {(u.displayName || u.email || '?')[0].toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="truncate font-medium text-[var(--color-text-primary)]">
                                  {u.displayName || '(未設定名稱)'}
                                </p>
                                <p className="truncate text-xs text-[var(--color-text-muted)]">
                                  {u.email || u.uid}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="hidden px-4 py-3 sm:table-cell">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                              u.providerId.includes('google')
                                ? 'bg-blue-500/20 text-blue-300'
                                : u.providerId.includes('password')
                                  ? 'bg-gray-500/20 text-gray-300'
                                  : 'bg-green-500/20 text-green-300'
                            }`}>
                              {providerLabel(u.providerId)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-bold text-[var(--color-accent-gold)]">
                              {u.balance}
                            </span>
                          </td>
                          <td className="hidden px-4 py-3 text-xs text-[var(--color-text-muted)] md:table-cell">
                            {formatTime(u.lastSignInTime)}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleSelectUser(u)}
                              className="cursor-pointer rounded-md border border-[var(--color-border)] bg-transparent px-3 py-1 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent-gold)] hover:text-[var(--color-accent-gold)]"
                            >
                              管理
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ===== 點數管理 Tab ===== */}
        {activeTab === 'credits' && (
          <>
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

            {target && (
              <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
                <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[var(--shadow-card)]">
                  <h2 className="mb-4 text-lg font-bold text-[var(--color-text-primary)]">
                    使用者資料
                  </h2>
                  <div className="space-y-2 text-sm text-[var(--color-text-secondary)]">
                    <p>Email：{target.user.email || '-'}</p>
                    <p>名稱：{target.user.displayName || '-'}</p>
                    <p className="break-all">UID：<span className="select-all font-mono text-xs">{target.user.uid}</span></p>
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
          </>
        )}
      </div>
    </div>
  );
}
