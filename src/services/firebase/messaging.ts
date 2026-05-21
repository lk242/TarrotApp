/**
 * Firebase Cloud Messaging 推播通知服務。
 *
 * 提供 FCM token 的取得、儲存、訂閱功能。
 * 使用者點擊「開啟通知」時呼叫 requestPermissionAndToken()，
 * token 存入 Firestore 以供後端排程推播。
 */

import { trackEvent } from './analytics';

let messagingInstance: import('firebase/messaging').Messaging | null = null;

/** 動態載入 firebase/messaging（只在使用者同意後才載入） */
async function getMessaging() {
  if (messagingInstance) return messagingInstance;
  const { getMessaging: init } = await import('firebase/messaging');
  const { getApp } = await import('firebase/app');
  messagingInstance = init(getApp());
  return messagingInstance;
}

/**
 * 請求推播權限並取得 FCM token。
 * 回傳 token 字串，若使用者拒絕則回傳 null。
 */
export async function requestPermissionAndToken(): Promise<string | null> {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      trackEvent('notification_permission', { granted: false });
      return null;
    }

    const messaging = await getMessaging();
    const { getToken } = await import('firebase/messaging');

    // VAPID key 從環境變數讀取
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.warn('[messaging] VITE_FIREBASE_VAPID_KEY 未設定，略過 FCM');
      return null;
    }

    const token = await getToken(messaging, { vapidKey });
    trackEvent('notification_permission', { granted: true });
    return token;
  } catch (err) {
    console.error('[messaging] requestPermissionAndToken failed:', err);
    return null;
  }
}

/**
 * 將 FCM token 存入 Firestore（users/{uid}/fcmTokens/{token}）。
 * 後端排程推播時查此 collection。
 */
export async function saveFcmToken(uid: string, token: string): Promise<void> {
  const { getFirestore, doc, setDoc, serverTimestamp } = await import('firebase/firestore');
  const { getApp } = await import('firebase/app');
  const db = getFirestore(getApp());

  await setDoc(doc(db, `users/${uid}/fcmTokens`, token), {
    token,
    platform: navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop',
    createdAt: serverTimestamp(),
    lastActiveAt: serverTimestamp(),
  });
}

/**
 * 監聽前景訊息（App 開啟狀態收到推播時）。
 * 在 App 層呼叫一次即可。
 */
export async function onForegroundMessage(
  callback: (payload: { title?: string; body?: string }) => void,
): Promise<() => void> {
  try {
    const messaging = await getMessaging();
    const { onMessage } = await import('firebase/messaging');
    return onMessage(messaging, (payload) => {
      callback({
        title: payload.notification?.title,
        body: payload.notification?.body,
      });
    });
  } catch {
    return () => {};
  }
}

/** 檢查瀏覽器是否支援推播 */
export function isPushSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

/** 檢查使用者是否已授權推播 */
export function isPushGranted(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}
