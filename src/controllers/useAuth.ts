import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import type { User } from 'firebase/auth';
import {
  signInWithGoogle,
  signInWithLine,
  signInWithEmail,
  signUpWithEmail,
  signOut,
  onAuthChanged,
} from '../services/firebase/auth-service';
import { tryAutoLineLogin } from '../services/line/liff-service';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  loginWithGoogle: () => Promise<void>;
  loginWithLine: (tokenInfo: { type: 'id_token' | 'access_token'; token: string }) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

/**
 * AuthContext 是 Controller 層對 Firebase Auth 的唯一入口。
 *
 * View 元件只呼叫 useAuth()，不直接 import Firebase SDK，維持 MVC 邊界：
 * - Service：實際 Firebase Auth 操作
 * - Controller：整理成 React 可用狀態與 callback
 * - View：只顯示登入/登出 UI
 */
export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 必須在 AuthProvider 內使用');
  return ctx;
}

/** 供 AuthProvider 使用的 hook */
export function useAuthState(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthChanged((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    let cancelled = false;
    tryAutoLineLogin().then(async (tokenInfo) => {
      if (cancelled || !tokenInfo) return;
      try {
        await signInWithLine(tokenInfo);
      } catch {
        // LINE auto-login failed silently; user can retry manually
      }
    });
    return () => { cancelled = true; };
  }, []);

  const loginWithGoogle = useCallback(async () => {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e: unknown) {
      // 保留 Firebase 原始訊息，方便部署後快速定位 OAuth / 網域 / popup 問題。
      setError(e instanceof Error ? e.message : '登入失敗');
    }
  }, []);

  const loginWithLine = useCallback(async (tokenInfo: { type: 'id_token' | 'access_token'; token: string }) => {
    setError(null);
    try {
      await signInWithLine(tokenInfo);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'LINE 登入失敗');
    }
  }, []);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      await signInWithEmail(email, password);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '登入失敗');
    }
  }, []);

  const registerWithEmail = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      await signUpWithEmail(email, password);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '註冊失敗');
    }
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    await signOut();
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    user,
    loading,
    error,
    loginWithGoogle,
    loginWithLine,
    loginWithEmail,
    registerWithEmail,
    logout,
    clearError,
  };
}
