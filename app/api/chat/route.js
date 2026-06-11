import { adminDb } from '../../../lib/firebaseAdmin';
import { NextResponse } from 'next/server';

// GET: 메시지 읽기
export async function GET() {
  try {
    const snap = await adminDb.collection('chat')
      .orderBy('clientTs','asc')
      .limitToLast(60)
      .get();
    const msgs = snap.docs.map(d=>({id:d.id,...d.data()}));
    return NextResponse.json({messages: msgs});
  } catch(e) {
    return NextResponse.json({messages:[], error:e.message});
  }
}

// POST: 메시지 저장 (Admin SDK → rules 무관)
export async function POST(req) {
  try {
    const {uid, name, photo, text, clientTs} = await req.json();
    if(!uid||!text?.trim()) return NextResponse.json({error:'invalid'},{status:400});
    const ref = await adminDb.collection('chat').add({
      uid, name, photo: photo||null,
      text: text.trim().slice(0,200),
      clientTs: clientTs||Date.now(),
      ts: adminDb.constructor.name ? Date.now() : Date.now(),
    });
    return NextResponse.json({id: ref.id, ok: true});
  } catch(e) {
    return NextResponse.json({error:e.message},{status:500});
  }
}
