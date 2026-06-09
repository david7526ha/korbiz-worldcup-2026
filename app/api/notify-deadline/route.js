import { adminDb, adminMessaging } from '../../lib/firebaseAdmin';

const MESSAGES = {
  group: {
    '3d': { title: '⏰ Group Picks 마감 3일 전!', body: 'korbizwc2026.vercel.app에서 아직 픽 안 하셨으면 서두르세요!' },
    '1d': { title: '🚨 Group Picks 마감 내일!', body: '내일 킥오프 전까지만! 지금 바로 픽하세요.' },
    '6h': { title: '🔴 Group Picks 마감 6시간 전!', body: '곧 잠깁니다. 마지막 기회!' },
  },
  bracket: {
    '3d': { title: '⏰ Bracket Picks 마감 3일 전!', body: '6월 27일 자정까지. 브래킷 픽 하세요!' },
    '1d': { title: '🚨 Bracket Picks 마감 내일!', body: '내일 자정까지! korbizwc2026.vercel.app' },
    '6h': { title: '🔴 Bracket Picks 마감 6시간 전!', body: '지금 당장 브래킷 완성하세요!' },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { adminSecret, type, timing } = req.body;
  if (adminSecret !== process.env.NOTIFY_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const msg = MESSAGES[type]?.[timing];
  if (!msg) return res.status(400).json({ error: 'Invalid type/timing' });

  try {
    const usersSnap = await adminDb.collection('users').get();
    const tokens = [];
    usersSnap.forEach(doc => {
      const u = doc.data();
      if (u.approved) (u.fcmTokens || []).forEach(t => { if (t) tokens.push(t); });
    });

    if (tokens.length === 0) return res.json({ success: true, sent: 0 });

    const uniqueTokens = [...new Set(tokens)];
    const response = await adminMessaging.sendEachForMulticast({
      tokens: uniqueTokens,
      notification: msg,
      webpush: {
        notification: { ...msg, icon: '/favicon.ico', tag: `deadline-${type}-${timing}` },
        fcmOptions: { link: 'https://korbizwc2026.vercel.app' },
      },
    });

    return res.json({ success: true, sent: response.successCount });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
