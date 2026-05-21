/**
 * 輕量 Analytics 追蹤。
 *
 * 使用 Firebase Analytics（如有設定）或 console.debug 作為 fallback。
 * 不影響核心功能，初始化失敗時靜默降級。
 */

import type { Analytics } from 'firebase/analytics';

let analytics: Analytics | null = null;
let logEventFn: ((name: string, params?: Record<string, unknown>) => void) | null = null;

/** 延遲初始化 Analytics（避免影響首屏載入） */
async function ensureAnalytics() {
  if (logEventFn) return;

  try {
    const { getAnalytics, logEvent } = await import('firebase/analytics');
    const { initializeApp, getApps } = await import('firebase/app');

    const app = getApps()[0] ?? initializeApp({});
    analytics = getAnalytics(app);
    logEventFn = (name, params) => logEvent(analytics!, name, params);
  } catch {
    // Analytics 不可用（例如被 ad blocker 擋），靜默降級
    logEventFn = (name, params) => {
      if (import.meta.env.DEV) {
        console.debug('[analytics]', name, params);
      }
    };
  }
}

/**
 * 記錄自訂事件。
 * 不阻塞呼叫方，初始化失敗時靜默跳過。
 */
export function trackEvent(name: string, params?: Record<string, unknown>): void {
  ensureAnalytics().then(() => logEventFn?.(name, params)).catch(() => {});
}
