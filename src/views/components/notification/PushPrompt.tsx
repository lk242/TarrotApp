import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '../../../controllers/useI18n';

interface Props {
  supported: boolean;
  granted: boolean;
  requesting: boolean;
  onRequest: () => void;
}

/**
 * 推播通知開啟提示。
 *
 * 在使用者完成占卜後，若尚未授權推播，底部滑入提示。
 * 使用者可選擇「開啟」或「稍後再說」。
 */
export default function PushPrompt({ supported, granted, requesting, onRequest }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const { t } = useI18n();

  if (!supported || granted || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        className="mt-4 w-full max-w-md rounded-xl border border-[var(--color-accent-gold)]/20 bg-[var(--color-bg-card)] p-4 shadow-[var(--shadow-card)]"
      >
        <p className="mb-1 text-sm font-bold text-[var(--color-text-primary)]">
          {t.notification.title}
        </p>
        <p className="mb-3 text-xs text-[var(--color-text-muted)]">
          {t.notification.description}
        </p>
        <div className="flex gap-2">
          <button
            onClick={onRequest}
            disabled={requesting}
            className="cursor-pointer rounded-lg bg-[var(--color-accent-gold)] px-4 py-2 text-xs font-bold text-[var(--color-bg-primary)] transition-opacity disabled:opacity-50"
          >
            {requesting ? t.notification.requesting : t.notification.enable}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="cursor-pointer rounded-lg border border-[var(--color-border)] bg-transparent px-4 py-2 text-xs text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-secondary)]"
          >
            {t.notification.later}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
