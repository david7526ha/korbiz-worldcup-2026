import { adminDb } from '../../../lib/firebaseAdmin';

export async function GET() {
  const tDoc = (await adminDb.collection('tournament').doc('state').get()).data() || {};
  const usersSnap = await adminDb.collection('users').get();
  const users = {};
  usersSnap.forEach(doc => { 
    const d = doc.data();
    users[doc.id] = { name: d.name, groupPicks: d.groupPicks||{} };
  });
  return new Response(JSON.stringify({
    matchResults: tDoc.matchResults||{}, 
    groupResults: tDoc.groupResults||{},
    users
  }), { headers: {'Content-Type':'application/json'} });
}
