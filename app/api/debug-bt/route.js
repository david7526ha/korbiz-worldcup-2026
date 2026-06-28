import { adminDb } from '../../../lib/firebaseAdmin';

export async function GET() {
  const ref = adminDb.collection('tournament').doc('state');
  const doc = await ref.get();
  const data = doc.data() || {};

  const correctBracketTeams = ["South Africa", "Canada", "Netherlands", "Morocco", "Germany", "Paraguay", "France", "Sweden", "Brazil", "Japan", "Ivory Coast", "Norway", "Mexico", "Ecuador", "England", "Congo DR", "Spain", "Austria", "Portugal", "Croatia", "Belgium", "Senegal", "United States", "Bosnia-Herzegovina", "Australia", "Egypt", "Argentina", "Cape Verde", "Switzerland", "Algeria", "Colombia", "Ghana"];

  await ref.set({ ...data, bracketTeams: correctBracketTeams }, { merge: true });

  return new Response(JSON.stringify({ ok: true, bracketTeams: correctBracketTeams }, null, 1), {
    headers: {'Content-Type':'application/json'}
  });
}
