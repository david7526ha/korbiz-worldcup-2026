import { adminDb } from '../../../lib/firebaseAdmin';

export async function GET() {
  const ref = adminDb.collection('tournament').doc('state');
  const doc = await ref.get();
  const data = doc.data() || {};
  return new Response(JSON.stringify({
    groupResults: data.groupResults || {},
    manualQualified: data.manualQualified || {},
    bracketTeams: data.bracketTeams || [],
  }, null, 1), {
    headers: {'Content-Type':'application/json'}
  });
}
