import { adminDb } from '../../../lib/firebaseAdmin';

export async function GET() {
  const ref = adminDb.collection('tournament').doc('state');
  const doc = await ref.get();
  const data = doc.data() || {};
  const matchResults = data.matchResults || {};

  // E5c: Curacao 0 - 2 Ivory Coast (정확한 결과)
  matchResults['E5c'] = { home: "0", away: "2" };
  // E6c: Ecuador 2 - 1 Germany (정확한 결과)
  matchResults['E6c'] = { home: "2", away: "1" };

  await ref.set({ ...data, matchResults }, { merge: true });

  return new Response(JSON.stringify({ ok: true, fixed: { E5c: matchResults.E5c, E6c: matchResults.E6c } }), {
    headers: {'Content-Type':'application/json'}
  });
}
