import { useState, useRef, useCallback, useEffect } from 'react';
import { getAuth } from 'firebase/auth';

interface Props {
  text: string;
  locale: string;
  className?: string;
}

const TTS_URL =
  (import.meta.env.VITE_TTS_URL as string | undefined) ||
  'https://asia-east1-mystic-tarot-2026.cloudfunctions.net/generateTTS';

type Status = 'idle' | 'loading' | 'playing' | 'paused';

export default function TtsButton({ text, locale, className = '' }: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState(0);   // 0–1
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  // 卸載時釋放 Blob URL
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  const handleClick = useCallback(async () => {
    // 已有音頻 → 播放 / 暫停
    if (audioRef.current) {
      if (status === 'playing') {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      return;
    }

    // 第一次點擊：取得音頻
    setStatus('loading');
    try {
      const user = getAuth().currentUser;
      if (!user) throw new Error('請先登入');
      const idToken = await user.getIdToken();

      const res = await fetch(TTS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ text, locale }),
      });

      if (!res.ok) throw new Error(`TTS 失敗 (${res.status})`);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.ontimeupdate = () => {
        if (audio.duration) setProgress(audio.currentTime / audio.duration);
      };
      audio.onplay = () => setStatus('playing');
      audio.onpause = () => setStatus('paused');
      audio.onended = () => {
        setStatus('idle');
        setProgress(0);
        audioRef.current = null;
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = null;
        }
      };

      await audio.play();
      setStatus('playing');
    } catch (e) {
      console.error('TTS error:', e);
      setStatus('idle');
    }
  }, [text, locale, status]);

  // 圖示
  const icon =
    status === 'loading' ? (
      <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
    ) : status === 'playing' ? (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="4" width="4" height="16" rx="1" />
        <rect x="14" y="4" width="4" height="16" rx="1" />
      </svg>
    ) : (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      </svg>
    );

  const label =
    status === 'loading' ? '生成中…' :
    status === 'playing' ? '暫停' :
    status === 'paused'  ? '繼續' : '聆聽';

  return (
    <button
      onClick={handleClick}
      disabled={status === 'loading'}
      title={label}
      className={`group relative flex items-center gap-1.5 overflow-hidden rounded-full border px-3 py-1.5 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50
        border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]
        hover:border-[var(--color-accent-gold)]/50 hover:text-[var(--color-accent-gold)]
        ${status === 'playing' ? 'border-[var(--color-accent-gold)]/40 text-[var(--color-accent-gold)]' : ''}
        ${className}`}
    >
      {/* 進度條背景 */}
      {(status === 'playing' || status === 'paused') && (
        <span
          className="pointer-events-none absolute inset-0 rounded-full bg-[var(--color-accent-gold)]/8 transition-none"
          style={{ width: `${progress * 100}%` }}
        />
      )}
      {icon}
      <span className="relative">{label}</span>
    </button>
  );
}
