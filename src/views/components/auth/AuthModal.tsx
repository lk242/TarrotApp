import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../../controllers/useAuth';
import { useI18n } from '../../../controllers/useI18n';
import { getLineToken, isLineLoginConfigured } from '../../../services/line/liff-service';
import {
  copyCurrentUrl,
  isGoogleAuthBlockedBrowser,
  isLineInAppBrowser,
} from '../../../utils/in-app-browser';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AuthModal({ open, onClose }: Props) {
  const { t } = useI18n();
  const {
    user,
    loginWithGoogle,
    loginWithLine,
    loginWithEmail,
    registerWithEmail,
    error,
    clearError,
  } = useAuth();

  // 登入成功後自動關閉
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && user) onClose();
    wasOpen.current = open;
  }, [user, open, onClose]);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [browserNotice, setBrowserNotice] = useState('');
  const googleAuthBlocked = isGoogleAuthBlockedBrowser();
  const lineBrowser = isLineInAppBrowser();
  const lineConfigured = isLineLoginConfigured();

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password);
      }
    } finally {
      setSubmitting(false);
    }
    // 如果成功（user 會更新），關閉 modal
    // error 會由 useAuth 設置
  };

  const handleGoogle = async () => {
    if (googleAuthBlocked) {
      setBrowserNotice(t.auth.googleBlocked);
      return;
    }

    setSubmitting(true);
    try {
      await loginWithGoogle();
    } finally {
      setSubmitting(false);
    }
  };

  const handleLine = async () => {
    if (!lineConfigured) {
      setBrowserNotice(t.auth.lineNotConfigured);
      return;
    }

    setSubmitting(true);
    try {
      const tokenInfo = await getLineToken();
      if (!tokenInfo) return;
      await loginWithLine(tokenInfo);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyUrl = async () => {
    await copyCurrentUrl();
    setBrowserNotice(t.auth.urlCopied);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative mx-4 w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 關閉 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 cursor-pointer border-none bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
        >
          ✕
        </button>

        <h2 className="mb-1 text-center text-xl font-bold text-[var(--color-accent-gold)]">
          {mode === 'login' ? t.auth.loginTitle : t.auth.registerTitle}
        </h2>
        <p className="mb-6 text-center text-xs text-[var(--color-text-muted)]">
          {mode === 'login' ? t.auth.loginSubtitle : t.auth.registerSubtitle}
        </p>

        {lineConfigured && (
          <button
            onClick={handleLine}
            disabled={submitting}
            className="mb-4 flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-[#06C755]/60 bg-[#06C755] px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <span className="text-base font-black">LINE</span>
            {lineBrowser ? t.auth.lineQuickLogin : t.auth.lineLogin}
          </button>
        )}

        {googleAuthBlocked && (
          <div className="mb-4 rounded-lg border border-[var(--color-accent-gold)]/40 bg-[var(--color-accent-gold)]/10 p-3 text-xs leading-relaxed text-[var(--color-text-secondary)]">
            <p>
              {t.auth.googleBlocked}
            </p>
            <button
              type="button"
              onClick={handleCopyUrl}
              className="mt-2 cursor-pointer rounded border border-[var(--color-accent-gold)]/50 bg-transparent px-3 py-1.5 text-xs font-bold text-[var(--color-accent-gold)]"
            >
              {t.auth.copyUrl}
            </button>
          </div>
        )}

        {browserNotice && (
          <p className="mb-3 text-xs leading-relaxed text-[var(--color-accent-gold)]">
            {browserNotice}
          </p>
        )}

        {/* Google 登入 */}
        <button
          onClick={handleGoogle}
          disabled={submitting || googleAuthBlocked}
          className="mb-4 flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-border-hover)] disabled:opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {t.auth.googleLogin}
        </button>

        {/* 分隔線 */}
        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--color-border)]" />
          <span className="text-xs text-[var(--color-text-muted)]">{t.auth.separator}</span>
          <div className="h-px flex-1 bg-[var(--color-border)]" />
        </div>

        {/* Email 表單 */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); clearError(); }}
            placeholder={t.auth.emailPlaceholder}
            required
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none focus:border-[var(--color-accent-gold)]"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); clearError(); }}
            placeholder={t.auth.passwordPlaceholder}
            required
            minLength={6}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none focus:border-[var(--color-accent-gold)]"
          />

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full cursor-pointer rounded-lg bg-gradient-to-r from-[var(--color-accent-purple)] to-[var(--color-accent-mystic)] px-4 py-2.5 text-sm font-bold text-white transition-opacity disabled:opacity-50"
          >
            {submitting ? t.auth.submitting : mode === 'login' ? t.auth.loginButton : t.auth.registerButton}
          </button>
        </form>

        {/* 切換模式 */}
        <p className="mt-5 text-center text-xs text-[var(--color-text-muted)]">
          {mode === 'login' ? t.auth.noAccount : t.auth.hasAccount}
          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); clearError(); }}
            className="ml-1 cursor-pointer border-none bg-transparent text-[var(--color-accent-gold)] underline"
          >
            {mode === 'login' ? t.auth.registerNow : t.auth.backToLogin}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
