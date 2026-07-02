import { adminDb } from '../../../lib/firebaseAdmin';

export async function GET() {
  const t = (await adminDb.collection('tournament').doc('state').get()).data()||{};
  const usersSnap = await adminDb.collection('users').get();
  
  const gr = t.groupResults || {};
  const br = t.bracketResults || {};
  const mq = t.manualQualified || {};
  const ROUND_PTS = {R32:5,R16:10,QF:15,SF:20,F:30};

  const users = [];
  usersSnap.forEach(doc => {
    const d = doc.data();
    if(!d.approved || !d.paid) return;
    let total = 0;
    // 그룹 픽 점수
    Object.entries(d.groupPicks||{}).forEach(([grp,picked])=>{
      (picked||[]).forEach(t=>{
        if((gr[grp]||[]).includes(t)) total+=3;
        else if(mq[t]) total+=3;
      });
    });
    // 브래킷 픽 점수
    Object.entries(d.bracketPicks||{}).forEach(([key,winner])=>{
      if(br[key]&&br[key]===winner) total+=(ROUND_PTS[key.split("_")[0]]||5);
    });
    if(br["F_0"]&&d.bracketPicks?.["F_0"]===br["F_0"]) total+=40;
    
    users.push({name:d.name, total, bracketPicks:d.bracketPicks||{}});
  });
  
  users.sort((a,b)=>b.total-a.total);
  
  return new Response(JSON.stringify({
    bracketTeams: t.bracketTeams||[],
    bracketResults: br,
    groupResults: gr,
    users
  }, null, 1), { headers: {'Content-Type':'application/json'} });
}