importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBQnPwdaT0ez5Dr8unb23m1vxxxNASZ1UA",
  authDomain: "korbiz-worldcup-2026.firebaseapp.com",
  projectId: "korbiz-worldcup-2026",
  storageBucket: "korbiz-worldcup-2026.firebasestorage.app",
  messagingSenderId: "945184343238",
  appId: "1:945184343238:web:6e85db48fcd418d49683c7",
  measurementId: "G-BM2SB1TYTR",
});

const messaging = firebase.messaging();

// 백그라운드 메시지 처리
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || 'Korbiz World Cup 2026', {
    body: body || '',
    icon: icon || '/favicon.ico',
    badge: '/favicon.ico',
    tag: payload.data?.tag || 'worldcup-notification',
    data: payload.data,
    actions: [{ action: 'open', title: 'Open App' }],
  });
});

// 알림 클릭 → 앱 열기
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(clients.openWindow('https://korbiz-worldcup-2026.vercel.app'));
});
