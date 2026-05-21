import { useState, useCallback, useEffect } from 'react';
import {
  isPushSupported,
  isPushGranted,
  requestPermissionAndToken,
  saveFcmToken,
  onForegroundMessage,
} from '../services/firebase/messaging';

interface PushState {
  /** 瀏覽器是否支援推播 */
  supported: boolean;
  /** 使用者是否已授權 */
  granted: boolean;
  /** 是否正在請求權限 */
  requesting: boolean;
  /** 前景收到的最新推播 */
  latestMessage: { title?: string; body?: string } | null;
  /** 請求推播權限 */
  requestPush: () => Promise<void>;
  /** 關閉推播提示 */
  dismissMessage: () => void;
}

/**
 * 推播通知 Controller hook。
 *
 * @param uid 目前登入的使用者 ID（null 表示未登入）
 */
export function usePushNotification(uid: string | null): PushState {
  const [supported] = useState(isPushSupported);
  const [granted, setGranted] = useState(isPushGranted);
  const [requesting, setRequesting] = useState(false);
  const [latestMessage, setLatestMessage] = useState<{ title?: string; body?: string } | null>(null);

  const requestPush = useCallback(async () => {
    if (!uid || requesting) return;
    setRequesting(true);
    try {
      const token = await requestPermissionAndToken();
      if (token) {
        await saveFcmToken(uid, token);
        setGranted(true);
      }
    } finally {
      setRequesting(false);
    }
  }, [uid, requesting]);

  const dismissMessage = useCallback(() => setLatestMessage(null), []);

  // 監聽前景推播
  useEffect(() => {
    if (!granted) return;

    let cleanup: (() => void) | undefined;
    onForegroundMessage((msg) => setLatestMessage(msg)).then((unsub) => {
      cleanup = unsub;
    });

    return () => cleanup?.();
  }, [granted]);

  return { supported, granted, requesting, latestMessage, requestPush, dismissMessage };
}
