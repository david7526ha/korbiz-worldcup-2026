import { adminDb } from '../../../lib/firebaseAdmin';

export async function GET() {
  const tournRef = adminDb.collection('tournament').doc('state');
  const tournDoc = await tournRef.get();
  const tournament = tournDoc.data() || {};

  const usersSnap = await adminDb.collection('users').get();
  const usersWithBracketPicks = [];
  usersSnap.forEach(doc => {
    const data = doc.data();
    if(data.bracketPicks && Object.keys(data.bracketPicks).length > 0) {
      usersWithBracketPicks.push({ uid: doc.id, name: data.name, bracketPicks: data.bracketPicks });
    }
  });

  return new Response(JSON.stringify({
    bracketTeams: tournament.bracketTeams || [],
    usersWithBracketPicksCount: usersWithBracketPicks.length,
    usersWithBracketPicks,
  }, null, 1), {
    headers: {'Content-Type':'application/json'}
  });
}
