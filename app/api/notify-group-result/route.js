import { adminDb, adminMessaging } from '../../lib/firebaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // Admin 인증 확인
  const { adminSecret, groupKey, advancedTeams, groupResults, allUsers } = req.body;
  if (adminSecret !== process.env.NOTIFY_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 1. 모든 유저 FCM 토큰 수집
    const usersSnap = await adminDb.collection('users').get();
    const tokens = [];
    const matchedUsers = {}; // team -> [user names]

    usersSnap.forEach(doc => {
      const u = doc.data();
      if (!u.approved) return;

      // FCM 토큰
      (u.fcmTokens || []).forEach(t => { if (t) tokens.push(t); });

      // 각 팀별로 맞춘 유저 집계
      const userPicks = u.groupPicks?.[groupKey] || [];
      advancedTeams.forEach(team => {
        if (userPicks.includes(team)) {
          if (!matchedUsers[team]) matchedUsers[team] = [];
          matchedUsers[team].push(u.name?.split(' ')[0] || u.email?.split('@')[0]);
        }
      });
    });

    // 2. 알림 메시지 구성
    const teamLines = advancedTeams.map(team => {
      const names = matchedUsers[team] || [];
      if (names.length === 0) return `${team}: 아무도 못 맞춤`;
      return `${team}: ${names.join(', ')}`;
    }).join('\n');

    const title = `🏆 Group ${groupKey} 결과 확정!`;
    const body = teamLines.length > 100 ? teamLines.substring(0, 97) + '...' : teamLines;

    // 3. FCM 발송 (토큰 배치 최대 500개)
    if (tokens.length > 0) {
      const uniqueTokens = [...new Set(tokens)];
      const chunks = [];
      for (let i = 0; i < uniqueTokens.length; i += 500) {
        chunks.push(uniqueTokens.slice(i, i + 500));
      }

      let successCount = 0;
      for (const chunk of chunks) {
        const response = await adminMessaging.sendEachForMulticast({
          tokens: chunk,
          notification: { title, body },
          webpush: {
            notification: {
              title,
              body,
              icon: '/favicon.ico',
              badge: '/favicon.ico',
              tag: `group-${groupKey}-result`,
              requireInteraction: false,
            },
            fcmOptions: { link: 'https://korbizwc2026.vercel.app' },
          },
        });
        successCount += response.successCount;
      }

      return res.json({
        success: true,
        sent: successCount,
        matchedUsers,
        message: `Group ${groupKey}: ${title}`,
      });
    }

    return res.json({ success: true, sent: 0, matchedUsers, message: 'No FCM tokens found' });

  } catch (err) {
    console.error('Notify error:', err);
    return res.status(500).json({ error: err.message });
  }
}
