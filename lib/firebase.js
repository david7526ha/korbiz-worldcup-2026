import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  onSnapshot,
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
export const signInWithGoogle = () => signInWithPopup(auth, provider);
export const signOutUser = () => signOut(auth);

export const ADMIN_EMAIL = "dave.yedam.ha@gmail.com";
export const isAdmin = (email) => email === ADMIN_EMAIL;

// ── User Doc ──────────────────────────────────────────────────────────────────
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

export async function setApproved(uid, approved) {
  await updateDoc(doc(db, "users", uid), { approved, paid: approved ? true : false });
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

// ── Tournament State ──────────────────────────────────────────────────────────
export async function getTournamentState() {
  const snap = await getDoc(doc(db, "tournament", "state"));
  return snap.exists() ? snap.data() : {
    phase: "group",
    groupLocked: false,
    bracketLocked: false,
    groupResults: {},
    bracketTeams: Array(32).fill(""),
    bracketResults: {},
  };
}

export async function saveTournamentState(state) {
  await setDoc(doc(db, "tournament", "state"), state, { merge: true });
}

export function subscribeTournamentState(cb) {
  return onSnapshot(doc(db, "tournament", "state"), (snap) => {
    if (snap.exists()) cb(snap.data());
    else cb({ phase: "group", groupLocked: false, bracketLocked: false, groupResults: {}, bracketTeams: Array(32).fill(""), bracketResults: {} });
  });
}
