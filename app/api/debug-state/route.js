import { adminDb } from '../../../lib/firebaseAdmin';

// GET: 현재 matchResults 읽기
export async function GET() {
  const doc = await adminDb.collection('tournament').doc('state').get();
  const data = doc.data() || {};
  return Response.json({
    matchResults: data.matchResults || {},
    groupResults: data.groupResults || {},
  });
}
