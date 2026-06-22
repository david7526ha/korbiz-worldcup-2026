import { adminDb } from '../../../lib/firebaseAdmin';

export async function GET() {
  const ref = adminDb.collection('tournament').doc('state');
  const doc = await ref.get();
  const data = doc.data() || {};
  const matchResults = data.matchResults || {};
  
  // D4b: Türkiye 0 - Paraguay 1 (실제 경기 결과, 6/19 San Francisco)
  matchResults['D4b'] = { home: "0", away: "1" };
  
  await ref.set({ ...data, matchResults }, { merge: true });
  
  return new Response(JSON.stringify({ ok: true, updated: 'D4b', matchResults }), {
    headers: {'Content-Type':'application/json'}
  });
}
