import { adminDb } from '../../../lib/firebaseAdmin';

export async function GET(request) {
  const data = (await adminDb.collection('tournament').doc('state').get()).data() || {};
  const mr = data.matchResults || {};
  const gr = data.groupResults || {};
  return new Response(JSON.stringify({matchResults:mr, groupResults:gr, phase:data.phase}), {
    headers: {'Content-Type':'application/json', 'Access-Control-Allow-Origin':'*'}
  });
}
