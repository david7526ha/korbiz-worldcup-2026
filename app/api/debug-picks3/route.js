import { adminDb } from '../../../lib/firebaseAdmin';

export async function GET() {
  const usersSnap = await adminDb.collection('users').get();
  const result = [];
  usersSnap.forEach(doc => {
    const data = doc.data();
    if(data.bracketPicks) {
      const ROUND_META = {R32:16,R16:8,QF:4,SF:2,F:1};
      const ROUNDS = ["R32","R16","QF","SF","F"];
      let count = 0;
      const missing = [];
      ROUNDS.forEach(round => {
        for(let i=0;i<ROUND_META[round];i++){
          const key = round+"_"+i;
          if(data.bracketPicks[key]) count++;
          else missing.push(key);
        }
      });
      result.push({ name: data.name, pickedCount: count, totalKeys: Object.keys(data.bracketPicks).length, missing, allValues: data.bracketPicks });
    }
  });
  return new Response(JSON.stringify(result, null, 1), {
    headers: {'Content-Type':'application/json'}
  });
}
