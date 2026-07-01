import { adminDb } from '../../../lib/firebaseAdmin';
export async function GET() {
  const doc = await adminDb.collection('tournament').doc('state').get();
  const d = doc.data() || {};
  return new Response(JSON.stringify({
    bracketResults: d.bracketResults || {},
    bracketTeams: d.bracketTeams || [],
    phase: d.phase,
  }, null, 1), { headers: {'Content-Type':'application/json'} });
}