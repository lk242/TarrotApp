/**
 * Firebase Cloud Messaging Service Worker。
 * 處理背景推播通知（App 未在前景時）。
 */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  // 這些是公開的 Firebase config，不含敏感資訊
  apiKey: 'AIzaSyAnlQP4BRU2TXhV6FcqSHYvJwM5vZrXl6g',
  authDomain: 'mystic-tarot-2026.firebaseapp.com',
  projectId: 'mystic-tarot-2026',
  storageBucket: 'mystic-tarot-2026.firebasestorage.app',
  messagingSenderId: '599328361392',
  appId: '1:599328361392:web:0a0a1400000000000000',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || '神秘塔羅';
  const options = {
    body: payload.notification?.body || '你的每日塔羅提醒到了',
    icon: '/images/theme/logo.webp',
    badge: '/images/theme/logo.webp',
    data: { url: payload.data?.url || '/' },
  };

  self.registration.showNotification(title, options);
});

// 使用者點擊通知時開啟對應頁面
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});
