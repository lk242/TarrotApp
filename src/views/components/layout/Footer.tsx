import { useI18n } from '../../../controllers/useI18n';

export default function Footer() {
  const { t } = useI18n();

  return (
    <footer className="mt-auto border-t border-[var(--color-border)] py-8 text-center">
      {/* 煉金術裝飾分隔圖 */}
      <img
        src="/images/theme/divider.webp"
        alt=""
        className="mx-auto mb-4 h-5 w-auto opacity-40"
      />
      <p className="text-sm tracking-wider text-[var(--color-text-muted)]">
        {t.appName}
      </p>
      <p className="mt-1 text-[10px] tracking-[0.2em] text-[var(--color-text-muted)] opacity-50">
        {t.footer.tagline}
      </p>
      <p className="mt-3 text-xs tracking-wide text-[var(--color-text-muted)]">
        客服聯絡：lukewolf899@gmail.com
      </p>
    </footer>
  );
}
