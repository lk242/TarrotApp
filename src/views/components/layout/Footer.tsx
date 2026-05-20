export default function Footer() {
  return (
    <footer className="mt-auto border-t border-[var(--color-border)] py-8 text-center">
      {/* 煉金術裝飾分隔圖 */}
      <img
        src="/images/theme/divider.webp"
        alt=""
        className="mx-auto mb-4 h-5 w-auto opacity-40"
      />
      <p className="text-sm tracking-wider text-[var(--color-text-muted)]">
        神秘塔羅
      </p>
      <p className="mt-1 text-[10px] tracking-[0.2em] text-[var(--color-text-muted)] opacity-50">
        以古老智慧照亮前方道路
      </p>
    </footer>
  );
}
