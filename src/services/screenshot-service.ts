import { trackEvent } from './firebase/analytics';

/**
 * 將指定 DOM 元素截圖為 Blob（PNG）。
 * 使用 html2canvas 做離屏渲染。
 */
export async function captureElement(el: HTMLElement): Promise<Blob | null> {
  try {
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(el, {
      backgroundColor: '#0A0A14',
      scale: 2, // 高解析度
      useCORS: true,
      logging: false,
    });
    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((blob: Blob | null) => resolve(blob), 'image/png'),
    );
  } catch (err) {
    console.error('[screenshot] captureElement failed:', err);
    return null;
  }
}

/**
 * 將截圖 Blob 透過 Web Share API 分享（支援圖片分享）。
 * 回傳是否成功。
 */
export async function shareScreenshot(blob: Blob, title: string): Promise<boolean> {
  const file = new File([blob], 'tarot-reading.png', { type: 'image/png' });

  // 先嘗試 Web Share with files
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        title,
        files: [file],
      });
      trackEvent('share_screenshot', { method: 'native' });
      return true;
    } catch {
      // 使用者取消
    }
  }

  // fallback: 下載圖片
  downloadBlob(blob, 'tarot-reading.png');
  trackEvent('share_screenshot', { method: 'download' });
  return true;
}

/** 觸發瀏覽器下載 Blob */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
