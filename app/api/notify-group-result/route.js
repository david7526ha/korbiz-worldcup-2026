import { adminDb, adminMessaging } from '../../../lib/firebaseAdmin';
import { NextResponse } from 'next/server';

export async function POST(req) {
  const { adminSecret, groupKey, advancedTeams } = await req.json();
  if (adminSecret !== process.env.NOTIFY_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const usersSnap = await adminDb.collection('users').get();
    const tokens = [];
    const matchedUsers = {};

    usersSnap.forEach(doc => {
      const u = doc.data();
      if (!u.approved) return;
      (u.fcmTokens || []).forEach(t => { if (t) tokens.push(t); });
      const userPicks = u.groupPicks?.[groupKey] || [];
      advancedTeams.forEach(team => {
        if (userPicks.includes(team)) {
          if (!matchedUsers[team]) matchedUsers[team] = [];
          matchedUsers[team].push(u.name?.split(' ')[0] || '?');
        }
      });
    });

    // 알림 메시지
    const lines = advancedTeams.map(team => {
      const names = matchedUsers[team] || [];
      return names.length > 0 ? `✅ ${team}: ${names.join(', ')}` : `❌ ${team}: 아무도 못 맞춤`;
    });
    const title = `🏆 Group ${groupKey} 결과 확정!`;
    const body = lines.join(' / ');

    if (tokens.length > 0) {
      const unique = [...new Set(tokens)];
      const res = await adminMessaging.sendEachForMulticast({
        tokens: unique,
        notification: { title, body: body.substring(0, 150) },
        webpush: {
          notification: { title, body: body.substring(0, 150), icon: '/favicon.ico', tag: `grp-${groupKey}` },
          fcmOptions: { link: 'https://korbizwc2026.vercel.app' },
        },
      });
      return NextResponse.json({ success: true, sent: res.successCount, matchedUsers });
    }
    return NextResponse.json({ success: true, sent: 0, matchedUsers });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
