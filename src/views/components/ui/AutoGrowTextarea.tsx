import { useRef, useCallback, useEffect } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Enter 送出時的 callback（Shift+Enter 為換行） */
  onSubmit?: () => void;
  placeholder?: string;
  maxLength?: number;
  /** 最小行數（預設 1） */
  minRows?: number;
  /** 最大行數（超過後顯示滾動條，預設 6） */
  maxRows?: number;
  disabled?: boolean;
  className?: string;
}

/**
 * 自動增長的 textarea 元件。
 *
 * - Shift+Enter → 換行
 * - Enter（不含 Shift）→ 呼叫 onSubmit
 * - 高度隨內容自動增長，最大到 maxRows 行
 * - 超過 maxLength 時停止輸入
 */
export default function AutoGrowTextarea({
  value,
  onChange,
  onSubmit,
  placeholder,
  maxLength,
  minRows = 1,
  maxRows = 6,
  disabled = false,
  className = '',
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // 重設高度以取得正確的 scrollHeight
    el.style.height = 'auto';
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 20;
    const minHeight = lineHeight * minRows;
    el.style.height = `${Math.max(el.scrollHeight, minHeight)}px`;
  }, [minRows, maxRows]);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = maxLength ? e.target.value.slice(0, maxLength) : e.target.value;
      onChange(newValue);
    },
    [onChange, maxLength],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter（不含 Shift / Ctrl / Meta）= 送出
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (onSubmit && value.trim()) {
          onSubmit();
        }
      }
      // Shift+Enter = 換行（瀏覽器預設行為，不需攔截）
    },
    [onSubmit, value],
  );

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={minRows}
        className={`resize-none overflow-hidden ${className}`}
        style={{ lineHeight: '1.6' }}
      />
      {maxLength && (
        <span
          className="pointer-events-none absolute bottom-2 right-3 text-[10px] transition-opacity"
          style={{
            color: value.length > maxLength * 0.9 ? '#dc2626' : 'var(--color-text-muted)',
            opacity: value.length > maxLength * 0.5 ? 0.7 : 0,
          }}
        >
          {value.length}/{maxLength}
        </span>
      )}
    </div>
  );
}
