import { useMemo } from 'react';
import type { AdminUserListItem } from '../../../services/admin/admin-service';
import { useTheme } from '../../../controllers/useTheme';

interface Props {
  users: AdminUserListItem[];
}

/** 簡易長條圖元件（純 CSS） */
function BarChart({ data, label }: { data: { key: string; value: number }[]; label: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div>
      <p className="mb-3 text-sm font-bold text-[var(--color-text-primary)]">{label}</p>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.key} className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-right text-xs text-[var(--color-text-muted)]">
              {d.key}
            </span>
            <div className="flex-1 h-5 rounded-full bg-[var(--color-bg-secondary)] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent-gold)]/60 to-[var(--color-accent-gold)]"
                style={{ width: `${(d.value / max) * 100}%`, transition: 'width 0.5s ease' }}
              />
            </div>
            <span className="w-10 text-right text-xs font-bold text-[var(--color-accent-gold)]">
              {d.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 管理員儀表板 — 統計概覽。
 *
 * 從使用者名單資料直接計算：
 * - 用戶總覽（總人數、本月新增、活躍用戶）
 * - 登入方式分佈
 * - 近 7 天新用戶趨勢
 * - 點數分佈
 */
export default function AdminDashboard({ users }: Props) {
  const stats = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 基本統計
    const total = users.length;
    const newThisMonth = users.filter(
      (u) => u.creationTime && new Date(u.creationTime) >= thirtyDaysAgo,
    ).length;
    const activeRecently = users.filter(
      (u) => u.lastSignInTime && new Date(u.lastSignInTime) >= sevenDaysAgo,
    ).length;
    const totalCredits = users.reduce((sum, u) => sum + (u.balance || 0), 0);

    // 登入方式分佈
    const providerMap = new Map<string, number>();
    for (const u of users) {
      const p = u.providerId.includes('google')
        ? 'Google'
        : u.providerId.includes('password')
          ? 'Email'
          : 'LINE';
      providerMap.set(p, (providerMap.get(p) || 0) + 1);
    }
    const providers = [...providerMap.entries()]
      .map(([key, value]) => ({ key, value }))
      .sort((a, b) => b.value - a.value);

    // 近 7 天新用戶趨勢
    const dailyNew: { key: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
      const count = users.filter((u) => {
        if (!u.creationTime) return false;
        const created = new Date(u.creationTime);
        return (
          created.getFullYear() === date.getFullYear() &&
          created.getMonth() === date.getMonth() &&
          created.getDate() === date.getDate()
        );
      }).length;
      dailyNew.push({ key: dateStr, value: count });
    }

    // 點數分佈
    const creditRanges = [
      { key: '0', min: 0, max: 0 },
      { key: '1-50', min: 1, max: 50 },
      { key: '51-100', min: 51, max: 100 },
      { key: '101-500', min: 101, max: 500 },
      { key: '500+', min: 501, max: Infinity },
    ];
    const creditDist = creditRanges.map((range) => ({
      key: range.key,
      value: users.filter((u) => u.balance >= range.min && u.balance <= range.max).length,
    }));

    return { total, newThisMonth, activeRecently, totalCredits, providers, dailyNew, creditDist };
  }, [users]);

  const { theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <div className="space-y-6">
      {/* 四大指標卡片 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: '總用戶數', value: stats.total, color: 'var(--color-accent-gold)' },
          { label: '本月新增', value: stats.newThisMonth, color: isLight ? '#059669' : '#86efac' },
          { label: '近 7 天活躍', value: stats.activeRecently, color: isLight ? '#2563eb' : '#93c5fd' },
          { label: '全站總點數', value: stats.totalCredits, color: isLight ? '#7c3aed' : '#d8b4fe' },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[var(--shadow-card)]"
          >
            <p className="text-xs text-[var(--color-text-muted)]">{card.label}</p>
            <p className="mt-1 text-2xl font-bold" style={{ color: card.color }}>{card.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* 圖表區 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[var(--shadow-card)]">
          <BarChart data={stats.dailyNew} label="近 7 天新增用戶" />
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[var(--shadow-card)]">
          <BarChart data={stats.providers} label="登入方式分佈" />
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[var(--shadow-card)]">
        <BarChart data={stats.creditDist} label="點數分佈" />
      </div>
    </div>
  );
}
