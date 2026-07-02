import { adminDb } from '../../../lib/firebaseAdmin';
export async function GET() {
  const t = (await adminDb.collection('tournament').doc('state').get()).data()||{};
  const usersSnap = await adminDb.collection('users').get();
  const users = [];
  usersSnap.forEach(doc => {
    const d = doc.data();
    if(d.approved && d.paid) users.push({uid:doc.id, name:d.name, total:0, bracketPicks:d.bracketPicks||{}, groupPicks:d.groupPicks||{}});
  });
  return new Response(JSON.stringify({
    bracketResults: t.bracketResults||{},
    bracketTeams: t.bracketTeams||[],
    users
  }, null, 1), { headers: {'Content-Type':'application/json'} });
}