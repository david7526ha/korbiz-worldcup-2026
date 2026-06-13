import { adminDb } from '../../../lib/firebaseAdmin';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const doc = await adminDb.collection('tournament').doc('state').get();
    const data = doc.data() || {};
    return NextResponse.json({
      matchResults: data.matchResults || {},
      groupResults: data.groupResults || {},
      phase: data.phase,
      groupLocked: data.groupLocked,
    });
  } catch(e) {
    return NextResponse.json({error: e.message}, {status: 500});
  }
}
