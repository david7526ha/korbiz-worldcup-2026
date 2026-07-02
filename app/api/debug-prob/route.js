import { adminDb } from '../../../lib/firebaseAdmin';
export async function GET() {
  const tournDoc = await adminDb.collection('tournament').doc('state').get();
  const t = tournDoc.data() || {};
  const usersSnap = await adminDb.collection('users').get();
  const users = {};
  usersSnap.forEach(doc => { users[doc.id] = doc.data(); });
  
  const MKim = Object.values(users).find(u=>u.name==="M KIM");
  const Alexa = Object.values(users).find(u=>u.name==="Alexa Gagliardi");
  
  return new Response(JSON.stringify({
    bracketResults: t.bracketResults||{},
    MKim: MKim ? {name:MKim.name, bracketPicks:MKim.bracketPicks||{}, groupPicks:MKim.groupPicks||{}} : null,
    Alexa: Alexa ? {name:Alexa.name, bracketPicks:Alexa.bracketPicks||{}, groupPicks:Alexa.groupPicks||{}} : null,
  }, null, 1), { headers: {'Content-Type':'application/json'} });
}