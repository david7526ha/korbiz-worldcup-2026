import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

// VAPID key — Firebase Console > Cloud Messaging > Web Push certificates
// 아직 없으면 일단 placeholder, 나중에 교체
const VAPID_KEY = "BEw5L16KJZtL5_oJTGTZV4sBE7yI5VvqaWXq3RiiSBFrTxPzP5LASkKW4tWSff234TO-Gw95xTT5oHumvDJmc2l";

let messagingInstance = null;

function getMsg() {
  if (typeof window === "undefined") return null;
  if (!messagingInstance) {
    const { getApp } = require("firebase/app");
    messagingInstance = getMessaging(getApp());
  }
  return messagingInstance;
}

// 마감 알람 일정 (ET 기준)
export const DEADLINES = {
  group: {
    date: new Date("2026-06-12T00:00:00-04:00"), // June 12 킥오프
    label: { en: "Group Picks", es: "Picks de Grupo", mn: "Бүлгийн Сонголт", ko: "조별 픽" },
  },
  bracket: {
    date: new Date("2026-06-27T23:59:00-04:00"), // June 27 자정 ET
    label: { en: "Bracket Picks", es: "Picks de Bracket", mn: "Bracket Сонголт", ko: "브래킷 픽" },
  },
};

// 알림 메시지 생성
function getNotifMessage(deadlineKey, lang, hoursLeft) {
  const labels = { en: "deadline", es: "vence en", mn: "дуусна", ko: "마감" };
  const dlLabel = DEADLINES[deadlineKey]?.label[lang] || DEADLINES[deadlineKey]?.label.en;
  if (hoursLeft >= 48) {
    const days = Math.round(hoursLeft / 24);
    const suffix = {
      en: `${days} days left to submit!`,
      es: `¡Quedan ${days} días!`,
      mn: `${days} хоног үлдлээ!`,
      ko: `마감 ${days}일 전입니다!`,
    };
    return { title: `⏰ ${dlLabel}`, body: suffix[lang] || suffix.en };
  }
  if (hoursLeft >= 2) {
    const h = Math.round(hoursLeft);
    const suffix = {
      en: `Only ${h} hours left!`,
      es: `¡Solo quedan ${h} horas!`,
      mn: `${h} цаг үлдлээ!`,
      ko: `마감 ${h}시간 전입니다!`,
    };
    return { title: `🚨 ${dlLabel}`, body: suffix[lang] || suffix.en };
  }
  return {
    title: `🔴 ${dlLabel}`,
    body: { en: "Closing soon!", es: "¡Cerrando pronto!", mn: "Удахгүй хаагдана!", ko: "곧 마감됩니다!" }[lang] || "Closing soon!",
  };
}

// 브라우저 로컬 알림 예약 (Service Worker Notification API)
async function scheduleLocalNotif(deadlineKey, lang) {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
  const deadline = DEADLINES[deadlineKey]?.date;
  if (!deadline) return;
  const now = Date.now();
  const msLeft = deadline.getTime() - now;
  if (msLeft <= 0) return;

  // 예약 시점: 3일 전, 1일 전, 6시간 전
  const schedules = [
    { label: "3d", offset: 3 * 24 * 60 * 60 * 1000, hours: 72 },
    { label: "1d", offset: 1 * 24 * 60 * 60 * 1000, hours: 24 },
    { label: "6h", offset: 6 * 60 * 60 * 1000, hours: 6 },
  ];

  const reg = await navigator.serviceWorker.ready;
  for (const { label, offset, hours } of schedules) {
    const delay = msLeft - offset;
    if (delay <= 0) continue; // 이미 지났으면 스킵
    const storageKey = `notif_scheduled_${deadlineKey}_${label}`;
    if (localStorage.getItem(storageKey)) continue; // 이미 예약됨
    // setTimeout으로 예약 (탭 열려있을 때만 작동, 백그라운드는 FCM으로)
    setTimeout(() => {
      const { title, body } = getNotifMessage(deadlineKey, lang, hours);
      reg.showNotification(title, {
        body,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: `${deadlineKey}-${label}`,
        data: { url: "https://korbiz-worldcup-2026.vercel.app" },
      });
    }, delay);
    localStorage.setItem(storageKey, "1");
  }
}

// FCM 토큰 저장
async function saveFCMToken(uid, token) {
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const tokens = snap.data().fcmTokens || [];
      if (!tokens.includes(token)) {
        await setDoc(ref, { fcmTokens: [...tokens, token] }, { merge: true });
      }
    }
  } catch (e) {
    console.warn("FCM token save failed:", e);
  }
}

// 푸시 알림 권한 요청 + 토큰 등록
export async function requestNotificationPermission(uid, lang = "en") {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window)) return false;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;
    // Service worker 등록 확인
    await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    // 로컬 알림 예약
    await scheduleLocalNotif("group", lang);
    await scheduleLocalNotif("bracket", lang);
    // FCM 토큰 (VAPID key 실제 키로 교체 전까지 스킵)
    try {
      const msg = getMsg();
      if (msg && VAPID_KEY && !VAPID_KEY.includes("placeholder")) {
        const token = await getToken(msg, { vapidKey: VAPID_KEY });
        if (token && uid) await saveFCMToken(uid, token);
      }
    } catch (e) {
      console.warn("FCM token error (expected if VAPID not set):", e);
    }
    return true;
  } catch (e) {
    console.warn("Notification permission error:", e);
    return false;
  }
}

// 포그라운드 메시지 수신
export function onForegroundMessage(callback) {
  const msg = getMsg();
  if (!msg) return () => {};
  return onMessage(msg, callback);
}

// 남은 시간 텍스트 계산
export function getTimeRemaining(deadlineKey, lang = "en") {
  const deadline = DEADLINES[deadlineKey]?.date;
  if (!deadline) return null;
  const now = Date.now();
  const msLeft = deadline.getTime() - now;
  if (msLeft <= 0) return { expired: true, text: "" };
  const days = Math.floor(msLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) {
    return {
      expired: false,
      urgent: days <= 3,
      text: { en: `${days}d ${hours}h left`, es: `${days}d ${hours}h restantes`, mn: `${days}ө ${hours}ц үлдсэн`, ko: `${days}일 ${hours}시간 남음` }[lang],
    };
  }
  if (hours > 0) {
    return {
      expired: false,
      urgent: true,
      text: { en: `${hours}h ${mins}m left`, es: `${hours}h ${mins}m restantes`, mn: `${hours}ц ${mins}м үлдсэн`, ko: `${hours}시간 ${mins}분 남음` }[lang],
    };
  }
  return {
    expired: false,
    urgent: true,
    text: { en: `${mins}m left`, es: `${mins}m restantes`, mn: `${mins}м үлдсэн`, ko: `${mins}분 남음` }[lang],
  };
}
