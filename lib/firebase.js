import { initializeApp, getApps } from "firebase/app";
import {
  getAuth, GoogleAuthProvider,
  signInWithPopup, signInWithRedirect,
  signOut, onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc,
  collection, onSnapshot, deleteField,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBQnPwdaT0ez5Dr8unb23m1vxxxNASZ1UA",
  authDomain: "korbiz-worldcup-2026.firebaseapp.com",
  projectId: "korbiz-worldcup-2026",
  storageBucket: "korbiz-worldcup-2026.firebasestorage.app",
  messagingSenderId: "945184343238",
  appId: "1:945184343238:web:6e85db48fcd418d49683c7",
  measurementId: "G-BM2SB1TYTR",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const provider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    return await signInWithPopup(auth, provider);
  } catch (err) {
    if (
      err.code === "auth/popup-blocked" ||
      err.code === "auth/popup-closed-by-user" ||
      err.code === "auth/cancelled-popup-request"
    ) {
      return signInWithRedirect(auth, provider);
    }
    throw err;
  }
};

export const signOutUser = () => signOut(auth);
export const ADMIN_EMAIL = "dave.yedam.ha@gmail.com";
export const isAdmin = (email) => email === ADMIN_EMAIL;

// ── User ──────────────────────────────────────────────────────────────────────
export async function ensureUserDoc(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      name: user.displayName,
      email: user.email,
      photoURL: user.photoURL || "",
      paid: false,
      approved: false,
      groupPicks: {},
      bracketPicks: {},
      createdAt: Date.now(),
    });
  }
  return (await getDoc(ref)).data();
}

export async function saveGroupPicks(uid, groupPicks) {
  await updateDoc(doc(db, "users", uid), { groupPicks });
}

export async function saveBracketPicks(uid, bracketPicks) {
  await updateDoc(doc(db, "users", uid), { bracketPicks });
}

// 경기별 스코어 예측 저장 (users/{uid}.scorePredictions = {matchId:{home,away,ts}})
export async function saveScorePrediction(uid, matchId, home, away) {
  await updateDoc(doc(db, "users", uid), {
    ["scorePredictions." + matchId]: { home, away, ts: Date.now() }
  });
}

// 경기별 이모지 리액션 저장 (users/{uid}.reactions = {matchId:"🔥"})
export async function saveReaction(uid, matchId, emoji) {
  await updateDoc(doc(db, "users", uid), {
    ["reactions." + matchId]: emoji
  });
}

// 경기별 승/무/패 방향 예측 (users/{uid}.directionPicks = {matchId:"home"|"draw"|"away"|""})
export async function saveDirectionPick(uid, matchId, direction) {
  await updateDoc(doc(db, "users", uid), {
    ["directionPicks." + matchId]: direction
  });
}

export async function setApproved(uid, approved) {
  await updateDoc(doc(db, "users", uid), {
    approved,
    paid: approved ? true : false,
  });
}

export async function setPaid(uid, paid) {
  await updateDoc(doc(db, "users", uid), { paid });
}

export function subscribeUsers(cb) {
  return onSnapshot(collection(db, "users"), (snap) => {
    const users = {};
    snap.forEach((d) => (users[d.id] = d.data()));
    cb(users);
  });
}

// ── Tournament — merge:false로 전체 덮어쓰기 ─────────────────────────────────
const DEFAULT_TOURNAMENT = {
  phase: "group",
  groupLocked: false,
  bracketLocked: false,
  groupResults: {},
  bracketTeams: Array(32).fill(""),
  bracketResults: {},
};

export async function getTournamentState() {
  const snap = await getDoc(doc(db, "tournament", "state"));
  return snap.exists() ? snap.data() : DEFAULT_TOURNAMENT;
}

// merge:false → 전체 교체 (이전 데이터 완전히 삭제)
export async function saveTournamentState(state) {
  await setDoc(doc(db, "tournament", "state"), {
    phase: state.phase ?? "group",
    groupLocked: state.groupLocked ?? false,
    bracketLocked: state.bracketLocked ?? false,
    groupResults: state.groupResults ?? {},
    bracketTeams: state.bracketTeams ?? Array(32).fill(""),
    bracketResults: state.bracketResults ?? {},
    bracketScores: state.bracketScores ?? {},
    matchResults: state.matchResults ?? {},
    manualQualified: state.manualQualified ?? {},
    manualOut: state.manualOut ?? {},
  });
}

export function subscribeTournamentState(cb) {
  return onSnapshot(doc(db, "tournament", "state"), (snap) => {
    if (snap.exists()) cb(snap.data());
    else cb(DEFAULT_TOURNAMENT);
  });
}
