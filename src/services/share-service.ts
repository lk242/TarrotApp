import { shareToLine } from './line/liff-service';
import { trackEvent } from './firebase/analytics';

interface ShareParams {
  /** 分享標題 */
  title: string;
  /** 摘要描述（1-2 句） */
  description: string;
  /** 分享連結 */
  url?: string;
}

/**
 * 分享占卜結果。
 *
 * 優先順序：
 * 1. LIFF shareTargetPicker（LINE 內建瀏覽器）
 * 2. Web Share API（手機原生分享面板）
 * 3. 複製連結到剪貼簿
 *
 * 回傳分享方式名稱，方便 UI 顯示對應提示。
 */
export async function shareReading(params: ShareParams): Promise<'line' | 'native' | 'clipboard'> {
  const url = params.url || window.location.origin;
  const fullText = `${params.title}\n${params.description}\n\n${url}`;

  // 1. 嘗試 LIFF 分享
  const lineShared = await shareToLine({
    title: params.title,
    description: params.description,
    url,
  });

  if (lineShared) {
    trackEvent('share_reading', { method: 'line' });
    return 'line';
  }

  // 2. 嘗試 Web Share API
  if (navigator.share) {
    try {
      await navigator.share({
        title: `${params.title} — 神秘塔羅`,
        text: params.description,
        url,
      });
      trackEvent('share_reading', { method: 'native' });
      return 'native';
    } catch {
      // 使用者取消分享，fallback 到剪貼簿
    }
  }

  // 3. 複製到剪貼簿
  try {
    await navigator.clipboard.writeText(fullText);
  } catch {
    // 剪貼簿 API 不可用（極少數情況）
    const textarea = document.createElement('textarea');
    textarea.value = fullText;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
  trackEvent('share_reading', { method: 'clipboard' });
  return 'clipboard';
}
