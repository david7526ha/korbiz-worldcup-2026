import { adminDb, adminMessaging } from '../../../lib/firebaseAdmin';
import { NextResponse } from 'next/server';

const MSGS = {
  group_3d:   { title: '⏰ Group Picks 마감 3일 전!', body: '아직 픽 안 하셨으면 서두르세요!' },
  group_1d:   { title: '🚨 Group Picks 마감 내일!', body: '내일 킥오프 전까지! 지금 픽하세요.' },
  group_6h:   { title: '🔴 Group Picks 마감 6시간 전!', body: '곧 잠깁니다. 마지막 기회!' },
  bracket_3d: { title: '⏰ Bracket Picks 마감 3일 전!', body: '6월 27일 자정까지. 브래킷 픽 하세요!' },
  bracket_1d: { title: '🚨 Bracket Picks 마감 내일!', body: '내일 자정까지! 브래킷 완성하세요.' },
  bracket_6h: { title: '🔴 Bracket Picks 마감 6시간 전!', body: '지금 당장 브래킷 완성하세요!' },
};

export async function POST(req) {
  const { adminSecret, key } = await req.json();
  if (adminSecret !== process.env.NOTIFY_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const msg = MSGS[key];
  if (!msg) return NextResponse.json({ error: 'Invalid key' }, { status: 400 });

  try {
    const snap = await adminDb.collection('users').get();
    const tokens = [];
    snap.forEach(d => { const u = d.data(); if (u.approved)(u.fcmTokens||[]).forEach(t=>{if(t)tokens.push(t);}); });
    if (!tokens.length) return NextResponse.json({ success: true, sent: 0 });
    const unique = [...new Set(tokens)];
    const res = await adminMessaging.sendEachForMulticast({
      tokens: unique,
      notification: msg,
      webpush: { notification: { ...msg, icon: '/favicon.ico', tag: `dl-${key}` }, fcmOptions: { link: 'https://korbizwc2026.vercel.app' } },
    });
    return NextResponse.json({ success: true, sent: res.successCount });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
