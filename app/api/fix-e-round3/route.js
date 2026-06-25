import { adminDb } from '../../../lib/firebaseAdmin';

export async function GET() {
  const ref = adminDb.collection('tournament').doc('state');
  const doc = await ref.get();
  const data = doc.data() || {};
  const matchResults = data.matchResults || {};

  // E5c: Germany 1 - 2 Ecuador
  // E6c: Curaçao 0 - 2 Ivory Coast
  matchResults['E5c'] = { home: "1", away: "2" };
  matchResults['E6c'] = { home: "0", away: "2" };

  await ref.set({ ...data, matchResults }, { merge: true });

  return new Response(JSON.stringify({ ok: true, added: ['E5c','E6c'], matchResults: { E5c: matchResults.E5c, E6c: matchResults.E6c } }), {
    headers: {'Content-Type':'application/json'}
  });
}
