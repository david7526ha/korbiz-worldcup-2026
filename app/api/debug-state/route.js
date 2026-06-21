import { adminDb } from '../../../lib/firebaseAdmin';

export async function GET() {
  const data = (await adminDb.collection('tournament').doc('state').get()).data() || {};
  return new Response(JSON.stringify({matchResults:data.matchResults||{}, groupResults:data.groupResults||{}}), {
    headers: {'Content-Type':'application/json'}
  });
}
