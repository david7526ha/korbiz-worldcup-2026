"use client";
import { useState, useEffect } from "react";
import {
  auth, db, signInWithGoogle, signOutUser, isAdmin,
  ensureUserDoc, saveGroupPicks, saveBracketPicks,
  setApproved, setPaid, subscribeUsers,
  subscribeTournamentState, saveTournamentState,
} from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

// ─── WORLD CUP DATA ──────────────────────────────────────────────────────────
const GROUPS = {
  A: { teams: ["USA", "Panama", "Honduras", "Bosnia & Herz."],     flags: ["🇺🇸","🇵🇦","🇭🇳","🇧🇦"] },
  B: { teams: ["Mexico", "Jamaica", "Costa Rica", "New Zealand"],   flags: ["🇲🇽","🇯🇲","🇨🇷","🇳🇿"] },
  C: { teams: ["Argentina", "Chile", "Peru", "Albania"],            flags: ["🇦🇷","🇨🇱","🇵🇪","🇦🇱"] },
  D: { teams: ["France", "Morocco", "Croatia", "Ukraine"],          flags: ["🇫🇷","🇲🇦","🇭🇷","🇺🇦"] },
  E: { teams: ["Spain", "Belgium", "Wales", "Egypt"],               flags: ["🇪🇸","🇧🇪","🏴󠁧󠁢󠁷󠁬󠁳󠁿","🇪🇬"] },
  F: { teams: ["Brazil", "Colombia", "Ecuador", "Saudi Arabia"],    flags: ["🇧🇷","🇨🇴","🇪🇨","🇸🇦"] },
  G: { teams: ["Germany", "Serbia", "Turkey", "Iceland"],           flags: ["🇩🇪","🇷🇸","🇹🇷","🇮🇸"] },
  H: { teams: ["Portugal", "Poland", "Iran", "Venezuela"],          flags: ["🇵🇹","🇵🇱","🇮🇷","🇻🇪"] },
  I: { teams: ["England", "Senegal", "DR Congo", "Guatemala"],      flags: ["🏴󠁧󠁢󠁥󠁮󠁧󠁿","🇸🇳","🇨🇩","🇬🇹"] },
  J: { teams: ["Netherlands", "Cameroon", "Ivory Coast", "Libya"],  flags: ["🇳🇱","🇨🇲","🇨🇮","🇱🇾"] },
  K: { teams: ["Japan", "South Korea", "Australia", "Indonesia"],   flags: ["🇯🇵","🇰🇷","🇦🇺","🇮🇩"] },
  L: { teams: ["Uruguay", "Canada", "Qatar", "Moldova"],            flags: ["🇺🇾","🇨🇦","🇶🇦","🇲🇩"] },
};
const ROUNDS = ["R32","R16","QF","SF","F"];
const ROUND_META = {
  R32:{label:"Round of 32",pts:5,matches:16},
  R16:{label:"Round of 16",pts:10,matches:8},
  QF:{label:"Quarterfinals",pts:15,matches:4},
  SF:{label:"Semifinals",pts:20,matches:2},
  F:{label:"Final",pts:30,matches:1},
};

// ─── TRANSLATIONS ─────────────────────────────────────────────────────────────
const T = {
  en: {
    title:"WORLD CUP 2026",subtitle:"BRACKET CHALLENGE",org:"KORBIZ INTERNAL",
    awaiting:"AWAITING APPROVAL",
    awaitingMsg:"Your registration has been received. Dave will approve your entry once your $30 has been collected. You'll get full access immediately after approval.",
    phase1Title:"PHASE 1 — GROUP STAGE",
    phase1:"Pick up to 3 teams per group that you think will advance. +3 points for each correct team.",
    phase2Title:"PHASE 2 — KNOCKOUT BRACKET",
    phase2:"March Madness style — pick the winner of every match. Points increase each round.",
    payment:"HOW TO PAY",paymentDesc:"Pay $30 cash to Dave Ha. Once received, Dave will approve your access.",
    prizeDist:"PRIZE DISTRIBUTION",prize1:"1st Place — 50% of pool",prize2:"2nd Place — 30% of pool",prize3:"3rd Place — 20% of pool",
    format:"2026 FORMAT",formatDesc:"48 teams · 12 groups of 4 · Top 2 per group advance · Best 8 third-place teams also qualify · Total 32 teams in knockout stage",
    loginBtn:"SIGN IN WITH GOOGLE",signOut:"Sign out",
    picks:"MY PICKS",standings:"STANDINGS",rules:"RULES",
    groupPicks:"GROUP PICKS",bracket:"BRACKET",savePicks:"SAVE PICKS",saved:"Saved ✓",
    ptsLabel:"PTS",paid:"PAID",unpaid:"UNPAID",admin:"ADMIN",
    groupStage:"GROUP STAGE",knockout:"KNOCKOUT",prizePot:"PRIZE POOL",
    keyDates:"KEY DATES",groupLock:"Group picks lock: June 12, 2026",finalDate:"Final: July 19, 2026 — MetLife Stadium, NJ",
    bracketWait:"BRACKET OPENS AFTER GROUP STAGE",bracketWaitSub:"32 qualified teams will be seeded once group stage concludes",
    groupCorrect:"per correct qualifier",maxPhase1:"Max Phase 1",maxPhase2:"Max Phase 2",
    howToPlay:"HOW TO PLAY",entryFee:"ENTRY FEE",
  },
  es: {
    title:"MUNDIAL 2026",subtitle:"DESAFÍO DE BRACKET",org:"KORBIZ INTERNO",
    awaiting:"ESPERANDO APROBACIÓN",
    awaitingMsg:"Tu registro fue recibido. Dave aprobará tu entrada una vez que se haya cobrado tu $30.",
    phase1Title:"FASE 1 — GRUPOS",phase1:"Elige hasta 3 equipos por grupo. +3 puntos por equipo correcto.",
    phase2Title:"FASE 2 — BRACKET",phase2:"Estilo March Madness — elige al ganador de cada partido.",
    payment:"CÓMO PAGAR",paymentDesc:"Paga $30 en efectivo a Dave Ha.",
    prizeDist:"PREMIOS",prize1:"1er lugar — 50%",prize2:"2do lugar — 30%",prize3:"3er lugar — 20%",
    format:"FORMATO 2026",formatDesc:"48 equipos · 12 grupos · Top 2 de cada grupo · 8 mejores terceros · 32 en bracket",
    loginBtn:"INICIAR CON GOOGLE",signOut:"Cerrar sesión",
    picks:"MIS PICKS",standings:"CLASIFICACIÓN",rules:"REGLAS",
    groupPicks:"PICKS GRUPO",bracket:"BRACKET",savePicks:"GUARDAR",saved:"Guardado ✓",
    ptsLabel:"PTS",paid:"PAGADO",unpaid:"PENDIENTE",admin:"ADMIN",
    groupStage:"GRUPOS",knockout:"ELIMINATORIA",prizePot:"PREMIO",
    keyDates:"FECHAS",groupLock:"Picks cierran: 12 jun 2026",finalDate:"Final: 19 jul 2026 — MetLife Stadium",
    bracketWait:"BRACKET ABRE DESPUÉS DE GRUPOS",bracketWaitSub:"32 equipos clasificados serán sembrados",
    groupCorrect:"por clasificado",maxPhase1:"Máx Fase 1",maxPhase2:"Máx Fase 2",
    howToPlay:"CÓMO JUGAR",entryFee:"CUOTA",
  },
  mn: {
    title:"ДЭЛХИЙН ЦОМ 2026",subtitle:"BRACKET ТОГЛООМ",org:"KORBIZ ДОТООД",
    awaiting:"ЗӨВШӨӨРЛИЙГ ХҮЛЭЭЖ БАЙНА",
    awaitingMsg:"Таны бүртгэл хүлээн авлаа. Dave $30 авсны дараа зөвшөөрөл өгнө.",
    phase1Title:"1-Р ҮЕ ШАТ — БҮЛЭГ",phase1:"Бүлэг тус бүрээс 3 баг сонго. Зөв баг тутамд +3 оноо.",
    phase2Title:"2-Р ҮЕ ШАТ — BRACKET",phase2:"March Madness загвар — тоглолт бүрийн ялагчийг сонго.",
    payment:"ХЭРХЭН ТӨЛӨХ",paymentDesc:"Dave Ha-д $30 бэлнээр төл.",
    prizeDist:"ШАГНАЛ",prize1:"1-р байр — 50%",prize2:"2-р байр — 30%",prize3:"3-р байр — 20%",
    format:"2026 ФОРМАТ",formatDesc:"48 баг · 12 бүлэг · Дээд 2 · 8 шилдэг 3-р · 32 баг bracket-д",
    loginBtn:"GOOGLE-ЭЭР НЭВТРЭХ",signOut:"Гарах",
    picks:"МИНИЙ СОНГОЛТ",standings:"БАЙДАЛ",rules:"ДҮРЭМ",
    groupPicks:"БҮЛГИЙН СОНГОЛТ",bracket:"BRACKET",savePicks:"ХАДГАЛАХ",saved:"Хадгалагдлаа ✓",
    ptsLabel:"ОНО",paid:"ТӨЛСӨН",unpaid:"ТӨЛӨӨГҮЙ",admin:"АДМИН",
    groupStage:"БҮЛГИЙН ШАТ",knockout:"KNOCKOUT",prizePot:"ШАГНАЛЫН САН",
    keyDates:"ОГНООНУУД",groupLock:"Сонголт хаагдах: 2026.06.12",finalDate:"Финал: 2026.07.19 — MetLife",
    bracketWait:"BRACKET БҮЛГИЙН ШАТ ДУУССАНЫ ДАРАА",bracketWaitSub:"32 тэмцэгч жагсаагдана",
    groupCorrect:"зөв баг тутамд",maxPhase1:"1-р үе дээд",maxPhase2:"2-р үе дээд",
    howToPlay:"ХЭРХЭН ТОГЛОХ",entryFee:"ХУРААМЖ",
  },
};

// ─── SCORE CALC ───────────────────────────────────────────────────────────────
function calcScore(picks={}, tournament={}) {
  let total=0, breakdown=[];
  const gr=tournament.groupResults||{};
  Object.entries(picks.groupPicks||{}).forEach(([grp,picked])=>{
    (picked||[]).forEach(t=>{
      if((gr[grp]||[]).includes(t)){total+=3;breakdown.push({l:`Group ${grp}: ${t}`,p:3});}
    });
  });
  const br=tournament.bracketResults||{};
  Object.entries(picks.bracketPicks||{}).forEach(([key,winner])=>{
    if(br[key]&&br[key]===winner){
      const pts=ROUND_META[key.split("_")[0]]?.pts??5;
      total+=pts;breakdown.push({l:`${ROUND_META[key.split("_")[0]]?.label}: ${winner}`,p:pts});
    }
  });
  return {total,breakdown};
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function Avatar({name,photoURL,size=36}){
  const ini=(name||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  const pal=[["#D4A843","#7a5c10"],["#3B82F6","#1e40af"],["#22C55E","#166534"],["#EF4444","#991b1b"],["#8B5CF6","#5b21b6"],["#F59E0B","#92400e"]];
  const c=pal[(name||"").charCodeAt(0)%pal.length];
  if(photoURL) return <img src={photoURL} referrerPolicy="no-referrer" style={{width:size,height:size,borderRadius:"50%",display:"block"}} alt=""/>;
  return <div style={{width:size,height:size,borderRadius:"50%",background:`linear-gradient(135deg,${c[0]},${c[1]})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.38,fontWeight:700,color:"#fff",fontFamily:"'Teko',sans-serif",flexShrink:0}}>{ini}</div>;
}

function LangSwitcher({lang,setLang}){
  return <div style={{display:"flex",gap:6}}>{[["en","EN 🇺🇸"],["es","ES 🇲🇽"],["mn","MN 🇲🇳"]].map(([k,l])=><button key={k} onClick={()=>setLang(k)} style={{padding:"4px 10px",borderRadius:7,border:`1px solid ${lang===k?"#D4A843":"rgba(255,255,255,.12)"}`,background:lang===k?"rgba(212,168,67,.15)":"transparent",color:lang===k?"#D4A843":"#6b7280",fontSize:11,fontWeight:600,cursor:"pointer"}}>{l}</button>)}</div>;
}

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
function LoginScreen({lang,setLang,t}){
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState("");
  const handleLogin=async()=>{
    setLoading(true);setErr("");
    try{await signInWithGoogle();}
    catch(e){setErr(e.message||"Login failed");setLoading(false);}
  };
  return(
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#060C14",backgroundImage:"radial-gradient(ellipse at 20% 60%,rgba(212,168,67,.06) 0%,transparent 60%)",padding:24}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Teko:wght@400;600;700&family=Outfit:wght@300;400;500;600&display=swap');*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Outfit',sans-serif;}`}</style>
      <div style={{textAlign:"center",maxWidth:420,width:"100%"}}>
        <div style={{fontSize:68,marginBottom:8,filter:"drop-shadow(0 0 24px rgba(212,168,67,.35))"}}>🏆</div>
        <div style={{fontFamily:"'Teko',sans-serif",fontSize:11,color:"#D4A843",letterSpacing:".28em",marginBottom:4}}>KORBIZ INTERNAL · 2026</div>
        <h1 style={{fontFamily:"'Teko',sans-serif",fontSize:52,color:"#fff",lineHeight:1,marginBottom:2}}>{t.title}</h1>
        <div style={{fontFamily:"'Teko',sans-serif",fontSize:22,color:"#D4A843",letterSpacing:".18em",marginBottom:24}}>{t.subtitle}</div>
        <div style={{display:"flex",justifyContent:"center",marginBottom:24}}><LangSwitcher lang={lang} setLang={setLang}/></div>
        <div style={{display:"flex",justifyContent:"center",gap:24,marginBottom:32,padding:"14px 20px",background:"rgba(212,168,67,.1)",border:"1px solid rgba(212,168,67,.28)",borderRadius:12}}>
          {[["$30",t.entryFee],["48","TEAMS"],["104","MATCHES"]].map(([v,l])=><div key={l} style={{textAlign:"center"}}><div style={{fontFamily:"'Teko',sans-serif",fontSize:28,color:"#D4A843",lineHeight:1}}>{v}</div><div style={{fontSize:10,color:"#5A7090",letterSpacing:".12em"}}>{l}</div></div>)}
        </div>
        {err&&<div style={{marginBottom:16,fontSize:13,color:"#EF4444",background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.3)",borderRadius:8,padding:"9px 12px"}}>{err}</div>}
        <button onClick={handleLogin} disabled={loading} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12,width:"100%",padding:"14px",borderRadius:12,border:"none",background:"#fff",color:"#111",fontSize:15,fontWeight:600,cursor:"pointer",boxShadow:"0 4px 24px rgba(0,0,0,.4)",opacity:loading?0.7:1}}>
          <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.29-8.16 2.29-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          {loading?"Loading...":t.loginBtn}
        </button>
        <p style={{color:"#5A7090",fontSize:12,marginTop:16}}>Korbiz employees only · Use your personal Google account</p>
      </div>
    </div>
  );
}

// ─── PENDING SCREEN ───────────────────────────────────────────────────────────
function PendingScreen({user,lang,setLang,t}){
  const Section=({icon,title,accent,children})=>(
    <div style={{background:"#0C1620",border:"1px solid rgba(255,255,255,.07)",borderRadius:14,padding:"18px 20px",marginBottom:12,borderLeft:`3px solid ${accent}`}}>
      <div style={{fontFamily:"'Teko',sans-serif",fontSize:17,color:"#fff",letterSpacing:".1em",marginBottom:10}}>{icon} {title}</div>
      {children}
    </div>
  );
  return(
    <div style={{minHeight:"100vh",background:"#060C14"}}>
      <div style={{background:"#0C1620",borderBottom:"1px solid rgba(255,255,255,.07)",padding:"12px 20px",display:"flex",alignItems:"center",gap:12}}>
        <span style={{fontSize:22}}>🏆</span>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Teko',sans-serif",fontSize:10,color:"#5A7090",letterSpacing:".22em"}}>KORBIZ</div>
          <div style={{fontFamily:"'Teko',sans-serif",fontSize:18,color:"#D4A843",lineHeight:1}}>WORLD CUP 2026</div>
        </div>
        <LangSwitcher lang={lang} setLang={setLang}/>
        <Avatar name={user.displayName} photoURL={user.photoURL} size={32}/>
        <button onClick={signOutUser} style={{background:"transparent",border:"1px solid rgba(255,255,255,.12)",borderRadius:8,padding:"5px 12px",color:"#6b7280",fontSize:12,cursor:"pointer"}}>{t.signOut}</button>
      </div>
      <div style={{maxWidth:700,margin:"0 auto",padding:"28px 20px"}}>
        <div style={{background:"rgba(212,168,67,.1)",border:"1px solid rgba(212,168,67,.3)",borderRadius:14,padding:"18px 22px",marginBottom:24,display:"flex",gap:14,alignItems:"flex-start"}}>
          <div style={{fontSize:32}}>⏳</div>
          <div>
            <div style={{fontFamily:"'Teko',sans-serif",fontSize:20,color:"#D4A843",letterSpacing:".1em",marginBottom:6}}>{t.awaiting}</div>
            <div style={{fontSize:14,color:"#9CA3AF",lineHeight:1.7}}>{t.awaitingMsg}</div>
          </div>
        </div>
        <Section icon="💵" title={t.payment} accent="#22C55E"><p style={{fontSize:14,color:"#D1D5DB",lineHeight:1.8}}>{t.paymentDesc}</p></Section>
        <Section icon="🏆" title={t.prizeDist} accent="#D4A843">
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:4}}>
            {[t.prize1,t.prize2,t.prize3].map((p,i)=><div key={i} style={{flex:"1 1 140px",background:"rgba(212,168,67,.08)",border:"1px solid rgba(212,168,67,.2)",borderRadius:10,padding:"10px 14px",textAlign:"center"}}><div style={{fontSize:22}}>{"🥇🥈🥉"[i*2]}</div><div style={{fontSize:13,color:"#D4A843",marginTop:4,fontWeight:600}}>{p}</div></div>)}
          </div>
        </Section>
        <Section icon="📋" title={t.howToPlay} accent="#3B82F6">
          <div style={{fontSize:14,color:"#D1D5DB",lineHeight:1.8,marginBottom:10}}><strong style={{color:"#D4A843"}}>{t.phase1Title}:</strong> {t.phase1}</div>
          <div style={{fontSize:14,color:"#D1D5DB",lineHeight:1.8}}><strong style={{color:"#D4A843"}}>{t.phase2Title}:</strong> {t.phase2}</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}>
            {Object.entries(ROUND_META).map(([r,{label,pts}])=><div key={r} style={{background:"rgba(212,168,67,.1)",border:"1px solid rgba(212,168,67,.25)",borderRadius:8,padding:"6px 12px",textAlign:"center"}}><div style={{fontFamily:"'Teko',sans-serif",fontSize:20,color:"#D4A843",lineHeight:1}}>+{pts}</div><div style={{fontSize:11,color:"#9CA3AF"}}>{label}</div></div>)}
          </div>
        </Section>
        <Section icon="⚽" title={t.format} accent="#8B5CF6"><p style={{fontSize:14,color:"#D1D5DB",lineHeight:1.8}}>{t.formatDesc}</p></Section>
        <Section icon="📅" title={t.keyDates} accent="#F59E0B">
          <div style={{fontSize:14,color:"#D1D5DB",lineHeight:2}}><div>🔒 {t.groupLock}</div><div>🏆 {t.finalDate}</div></div>
        </Section>
      </div>
    </div>
  );
}

// ─── GROUP PICKS ──────────────────────────────────────────────────────────────
function GroupPicks({uid,myPicks,tournament,showToast,t}){
  const [picks,setPicks]=useState(myPicks||{});
  const [saved,setSaved]=useState(false);
  const locked=tournament.groupLocked;
  const gr=tournament.groupResults||{};
  const toggle=(grp,team)=>{if(locked)return;setSaved(false);setPicks(prev=>{const cur=prev[grp]||[];if(cur.includes(team))return{...prev,[grp]:cur.filter(x=>x!==team)};if(cur.length>=3)return prev;return{...prev,[grp]:[...cur,team]};});};
  const handleSave=async()=>{await saveGroupPicks(uid,picks);setSaved(true);showToast("Saved ✓");setTimeout(()=>setSaved(false),2500);};
  const total=Object.values(picks).reduce((a,b)=>a+b.length,0);
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div><div style={{fontFamily:"'Teko',sans-serif",fontSize:28,color:"#D4A843",letterSpacing:".08em",lineHeight:1}}>PHASE 1 — GROUP PICKS</div><div style={{color:"#5A7090",fontSize:13,marginTop:3}}>Select up to 3 teams per group · <span style={{color:"#D4A843"}}>+3 pts</span> per correct qualifier</div></div>
        {!locked&&<button onClick={handleSave} style={{padding:"9px 22px",borderRadius:10,border:"none",background:saved?"#22C55E":"linear-gradient(135deg,#D4A843,#8B6914)",color:"#000",fontFamily:"'Teko',sans-serif",fontSize:16,fontWeight:700,cursor:"pointer"}}>{saved?t.saved:`${t.savePicks} (${total})`}</button>}
      </div>
      {locked&&<div style={{background:"rgba(59,130,246,.1)",border:"1px solid rgba(59,130,246,.3)",borderRadius:10,padding:"10px 16px",marginBottom:18,color:"#60a5fa",fontSize:13}}>🔒 Picks are locked</div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(255px,1fr))",gap:12}}>
        {Object.entries(GROUPS).map(([grp,{teams,flags}])=>{
          const myG=picks[grp]||[];const adv=gr[grp]||[];const hasRes=adv.length>0;
          return(<div key={grp} style={{background:"#0C1620",border:"1px solid rgba(255,255,255,.07)",borderRadius:14,padding:15}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:11}}>
              <div style={{fontFamily:"'Teko',sans-serif",fontSize:17,color:"#D4A843",letterSpacing:".14em"}}>GROUP {grp}</div>
              <div style={{fontSize:11,color:"#5A7090"}}>{myG.length}/3</div>
            </div>
            {teams.map((team,i)=>{
              const picked=myG.includes(team);const correct=hasRes&&adv.includes(team)&&picked;const wrong=hasRes&&!adv.includes(team)&&picked;const didAdv=hasRes&&adv.includes(team);
              return(<div key={team} onClick={()=>toggle(grp,team)} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:9,marginBottom:5,cursor:locked?"default":"pointer",background:correct?"rgba(34,197,94,.12)":wrong?"rgba(239,68,68,.1)":picked?"rgba(212,168,67,.1)":"transparent",border:`1px solid ${correct?"rgba(34,197,94,.4)":wrong?"rgba(239,68,68,.35)":picked?"rgba(212,168,67,.28)":"rgba(255,255,255,.07)"}`,transition:"all .13s"}}>
                <span style={{fontSize:17}}>{flags[i]}</span>
                <span style={{flex:1,fontSize:13,fontWeight:picked?600:400,color:correct?"#22C55E":wrong?"#EF4444":picked?"#D4A843":"#E0E8F0"}}>{team}</span>
                {correct&&<span style={{fontSize:12}}>✅ +3</span>}
                {wrong&&<span style={{fontSize:12}}>❌</span>}
                {!hasRes&&picked&&<span style={{color:"#D4A843",fontSize:11}}>✓</span>}
                {hasRes&&didAdv&&!picked&&<span style={{fontSize:10,color:"#5A7090"}}>advanced</span>}
              </div>);
            })}
          </div>);
        })}
      </div>
    </div>
  );
}

// ─── BRACKET ──────────────────────────────────────────────────────────────────
function BracketView({uid,myPicks,tournament,showToast,t}){
  const [picks,setPicks]=useState(myPicks||{});
  const [saved,setSaved]=useState(false);
  const locked=tournament.bracketLocked;
  const bracketTeams=tournament.bracketTeams||[];
  const actual=tournament.bracketResults||{};
  const getTeams=(round,i)=>{
    const ri=ROUNDS.indexOf(round);
    if(round==="R32")return{t1:bracketTeams[i*2]||"TBD",t2:bracketTeams[i*2+1]||"TBD"};
    const prev=ROUNDS[ri-1];
    return{t1:actual[`${prev}_${i*2}`]||picks[`${prev}_${i*2}`]||"TBD",t2:actual[`${prev}_${i*2+1}`]||picks[`${prev}_${i*2+1}`]||"TBD"};
  };
  const doPick=(key,team)=>{if(locked||actual[key])return;setSaved(false);setPicks(prev=>({...prev,[key]:team}));};
  const handleSave=async()=>{await saveBracketPicks(uid,picks);setSaved(true);showToast("Saved ✓");setTimeout(()=>setSaved(false),2500);};
  if(!bracketTeams.some(x=>x))return(<div style={{textAlign:"center",padding:"80px 20px"}}><div style={{fontSize:56,marginBottom:12}}>⏳</div><div style={{fontFamily:"'Teko',sans-serif",fontSize:26,color:"#D4A843"}}>{t.bracketWait}</div><div style={{color:"#5A7090",fontSize:13,marginTop:6}}>{t.bracketWaitSub}</div></div>);
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:16,flexWrap:"wrap",gap:10}}>
        <div><div style={{fontFamily:"'Teko',sans-serif",fontSize:28,color:"#D4A843",letterSpacing:".08em",lineHeight:1}}>PHASE 2 — KNOCKOUT BRACKET</div></div>
        {!locked&&<button onClick={handleSave} style={{padding:"9px 22px",borderRadius:10,border:"none",background:saved?"#22C55E":"linear-gradient(135deg,#D4A843,#8B6914)",color:"#000",fontFamily:"'Teko',sans-serif",fontSize:16,fontWeight:700,cursor:"pointer"}}>{saved?t.saved:t.savePicks}</button>}
      </div>
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        {ROUNDS.map(r=><div key={r} style={{padding:"4px 11px",borderRadius:7,background:"#111E2E",border:"1px solid rgba(255,255,255,.07)",fontSize:12,color:"#5A7090"}}>{ROUND_META[r].label}: <span style={{color:"#D4A843",fontWeight:700}}>+{ROUND_META[r].pts}</span></div>)}
      </div>
      <div style={{overflowX:"auto",paddingBottom:12}}>
        <div style={{display:"flex",gap:12,minWidth:960}}>
          {ROUNDS.map(round=>{
            const{label,pts,matches}=ROUND_META[round];
            return(<div key={round} style={{flex:1,minWidth:170}}>
              <div style={{fontFamily:"'Teko',sans-serif",fontSize:13,color:round==="F"?"#D4A843":"#5A7090",letterSpacing:".14em",textAlign:"center",marginBottom:10,paddingBottom:7,borderBottom:"1px solid rgba(255,255,255,.07)"}}>{round==="F"?"🏆 ":""}{label}</div>
              <div style={{display:"flex",flexDirection:"column",gap:7}}>
                {Array.from({length:matches},(_,i)=>{
                  const matchKey=`${round}_${i}`;
                  const{t1,t2}=getTeams(round,i);
                  const myPick=picks[matchKey];const actualW=actual[matchKey];const done=!!actualW;
                  const teamRow=(team)=>{
                    if(team==="TBD")return<div key="tbd" style={{padding:"7px 9px",borderRadius:7,marginBottom:3,background:"#111E2E",color:"#5A7090",fontSize:12}}>TBD</div>;
                    const isPick=myPick===team;const correct=done&&actualW===team&&isPick;const wrong=done&&actualW!==team&&isPick;const isW=done&&actualW===team;
                    return(<div key={team} onClick={()=>doPick(matchKey,team)} style={{padding:"7px 9px",borderRadius:7,marginBottom:3,cursor:locked||done?"default":"pointer",background:correct?"rgba(34,197,94,.13)":wrong?"rgba(239,68,68,.11)":isPick?"rgba(212,168,67,.1)":"transparent",border:`1px solid ${correct?"rgba(34,197,94,.4)":wrong?"rgba(239,68,68,.38)":isPick?"rgba(212,168,67,.28)":"rgba(255,255,255,.07)"}`,color:correct?"#22C55E":wrong?"#EF4444":isPick?"#D4A843":isW?"#fff":"#9CA3AF",fontSize:12,fontWeight:isPick||isW?600:400,display:"flex",alignItems:"center",gap:5,transition:"all .12s"}}>
                      <span style={{flex:1}}>{team}</span>
                      {correct&&"✅"}{wrong&&"❌"}
                      {!done&&isPick&&<span style={{fontSize:10,color:"#D4A843"}}>✓</span>}
                      {isW&&!isPick&&<span style={{fontSize:9,color:"#5A7090"}}>won</span>}
                    </div>);
                  };
                  return(<div key={matchKey} style={{background:"#0C1620",border:"1px solid rgba(255,255,255,.07)",borderRadius:9,padding:"9px 10px"}}><div style={{fontSize:9,color:"#5A7090",letterSpacing:".1em",marginBottom:6}}>+{pts} PTS</div>{teamRow(t1)}{teamRow(t2)}</div>);
                })}
              </div>
            </div>);
          })}
        </div>
      </div>
    </div>
  );
}

// ─── LEADERBOARD ─────────────────────────────────────────────────────────────
function Leaderboard({users,currentUid,tournament,t}){
  const ranked=Object.values(users).map(u=>({...u,...calcScore({groupPicks:u.groupPicks,bracketPicks:u.bracketPicks},tournament)})).sort((a,b)=>b.total-a.total).filter(u=>u.approved);
  const paid=ranked.filter(u=>u.paid).length;
  const medals=["🥇","🥈","🥉"];
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div style={{fontFamily:"'Teko',sans-serif",fontSize:28,color:"#D4A843"}}>{t.standings.toUpperCase()}</div>
        <div style={{textAlign:"center",background:"rgba(212,168,67,.1)",border:"1px solid rgba(212,168,67,.28)",borderRadius:10,padding:"8px 18px"}}>
          <div style={{fontFamily:"'Teko',sans-serif",fontSize:26,color:"#D4A843"}}>${paid*30}</div>
          <div style={{fontSize:10,color:"#5A7090",letterSpacing:".14em"}}>{t.prizePot} · {paid} {t.paid}</div>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {ranked.map((u,i)=>(
          <div key={u.uid} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 15px",borderRadius:12,background:u.uid===currentUid?"rgba(212,168,67,.1)":"#0C1620",border:`1px solid ${u.uid===currentUid?"rgba(212,168,67,.28)":"rgba(255,255,255,.07)"}`}}>
            <div style={{width:30,textAlign:"center",fontSize:i<3?22:13,fontFamily:"'Teko',sans-serif",color:"#5A7090"}}>{i<3?medals[i]:`#${i+1}`}</div>
            <Avatar name={u.name} photoURL={u.photoURL} size={38}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:600,color:u.uid===currentUid?"#D4A843":"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.name} {u.uid===currentUid&&<span style={{fontSize:11,color:"#5A7090"}}>(you)</span>}</div>
              <div style={{fontSize:11,color:"#5A7090"}}>{u.email}</div>
            </div>
            <div style={{padding:"2px 8px",borderRadius:5,fontSize:10,fontWeight:700,background:u.paid?"rgba(34,197,94,.12)":"rgba(239,68,68,.12)",color:u.paid?"#22C55E":"#EF4444",border:`1px solid ${u.paid?"rgba(34,197,94,.3)":"rgba(239,68,68,.3)"}`}}>{u.paid?t.paid:t.unpaid}</div>
            <div style={{textAlign:"right",minWidth:52}}>
              <div style={{fontFamily:"'Teko',sans-serif",fontSize:24,color:"#D4A843",lineHeight:1}}>{u.total}</div>
              <div style={{fontSize:9,color:"#5A7090",letterSpacing:".1em"}}>{t.ptsLabel}</div>
            </div>
          </div>
        ))}
        {ranked.length===0&&<div style={{textAlign:"center",color:"#5A7090",padding:"60px 0"}}>No approved participants yet</div>}
      </div>
    </div>
  );
}

// ─── ADMIN PANEL ─────────────────────────────────────────────────────────────
function AdminPanel({tournament,users,onClose,showToast}){
  const [st,setSt]=useState({...tournament});
  const [tab,setTab]=useState("approvals");
  const pending=Object.values(users).filter(u=>!u.approved);
  const approved=Object.values(users).filter(u=>u.approved);
  const save=async()=>{await saveTournamentState(st);showToast("Saved ✓");onClose();};
  const toggleGroup=(grp,team)=>setSt(prev=>{const cur=prev.groupResults?.[grp]||[];const next=cur.includes(team)?cur.filter(x=>x!==team):[...cur,team];return{...prev,groupResults:{...prev.groupResults,[grp]:next}};});
  const setBracketResult=(key,winner)=>setSt(prev=>({...prev,bracketResults:{...prev.bracketResults,[key]:prev.bracketResults?.[key]===winner?"":winner}}));
  const setTeamAt=(idx,val)=>setSt(prev=>{const arr=[...(prev.bracketTeams||Array(32).fill(""))];arr[idx]=val;return{...prev,bracketTeams:arr};});
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.9)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(6px)"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#0C1620",border:"1px solid rgba(239,68,68,.22)",borderRadius:18,padding:"24px 22px",maxWidth:840,width:"96vw",maxHeight:"91vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <div style={{fontFamily:"'Teko',sans-serif",fontSize:22,color:"#f87171",letterSpacing:".1em"}}>🔑 ADMIN PANEL</div>
          <button onClick={onClose} style={{background:"transparent",border:"none",color:"#5A7090",fontSize:22,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{display:"flex",gap:6,marginBottom:18,overflowX:"auto",paddingBottom:4}}>
          {["approvals","payments","phase","group","teams","bracket"].map(at=>(
            <button key={at} onClick={()=>setTab(at)} style={{padding:"6px 13px",borderRadius:8,fontSize:12,fontFamily:"'Teko',sans-serif",letterSpacing:".1em",whiteSpace:"nowrap",cursor:"pointer",border:`1px solid ${tab===at?"rgba(239,68,68,.5)":"rgba(255,255,255,.09)"}`,background:tab===at?"rgba(239,68,68,.14)":"transparent",color:tab===at?"#f87171":"#5A7090"}}>
              {at==="approvals"&&pending.length>0?`APPROVALS (${pending.length})`:at.toUpperCase()}
            </button>
          ))}
        </div>

        {tab==="approvals"&&(
          <div>
            <p style={{color:"#5A7090",fontSize:13,marginBottom:14}}>Approve participants after collecting $30 cash.</p>
            {pending.length>0&&(<><div style={{fontFamily:"'Teko',sans-serif",color:"#f87171",fontSize:14,marginBottom:10}}>⏳ PENDING ({pending.length})</div>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
              {pending.map(u=>(
                <div key={u.uid} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:10,background:"rgba(239,68,68,.06)",border:"1px solid rgba(239,68,68,.2)"}}>
                  <Avatar name={u.name} photoURL={u.photoURL} size={36}/>
                  <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:"#fff"}}>{u.name}</div><div style={{fontSize:11,color:"#5A7090"}}>{u.email}</div></div>
                  <button onClick={async()=>{await setApproved(u.uid,true);showToast(`${u.name} approved ✓`);}} style={{padding:"7px 18px",borderRadius:8,border:"1px solid rgba(34,197,94,.4)",background:"rgba(34,197,94,.12)",color:"#22C55E",fontSize:13,fontWeight:700,cursor:"pointer"}}>✓ APPROVE + MARK PAID</button>
                </div>
              ))}
            </div></>)}
            {approved.length>0&&(<><div style={{fontFamily:"'Teko',sans-serif",color:"#22C55E",fontSize:14,marginBottom:10}}>✓ APPROVED ({approved.length})</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {approved.map(u=>(
                <div key={u.uid} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:10,background:"rgba(34,197,94,.06)",border:"1px solid rgba(34,197,94,.15)"}}>
                  <Avatar name={u.name} photoURL={u.photoURL} size={32}/>
                  <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:"#fff"}}>{u.name}</div><div style={{fontSize:11,color:"#5A7090"}}>{u.email}</div></div>
                  <button onClick={async()=>{await setApproved(u.uid,false);showToast(`${u.name} revoked`);}} style={{padding:"5px 12px",borderRadius:7,border:"1px solid rgba(239,68,68,.3)",background:"transparent",color:"#f87171",fontSize:11,cursor:"pointer"}}>Revoke</button>
                </div>
              ))}
            </div></>)}
          </div>
        )}

        {tab==="payments"&&(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {Object.values(users).filter(u=>u.approved).map(u=>(
              <div key={u.uid} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 14px",borderRadius:10,background:"#111E2E",border:"1px solid rgba(255,255,255,.07)"}}>
                <Avatar name={u.name} photoURL={u.photoURL} size={34}/>
                <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:"#fff"}}>{u.name}</div><div style={{fontSize:11,color:"#5A7090"}}>{u.email}</div></div>
                <div style={{padding:"2px 9px",borderRadius:5,fontSize:11,fontWeight:700,background:u.paid?"rgba(34,197,94,.12)":"rgba(239,68,68,.12)",color:u.paid?"#22C55E":"#EF4444",border:`1px solid ${u.paid?"rgba(34,197,94,.3)":"rgba(239,68,68,.3)"}`}}>{u.paid?"✓ PAID $30":"UNPAID"}</div>
                <button onClick={async()=>{await setPaid(u.uid,!u.paid);showToast(`${u.name} marked as ${u.paid?"unpaid":"paid"}`);}} style={{padding:"6px 13px",borderRadius:7,fontSize:12,cursor:"pointer",border:`1px solid ${u.paid?"rgba(239,68,68,.3)":"rgba(34,197,94,.3)"}`,background:"transparent",color:u.paid?"#f87171":"#22C55E"}}>{u.paid?"Unmark":"Mark Paid"}</button>
              </div>
            ))}
          </div>
        )}

        {tab==="phase"&&(
          <div>
            <div style={{display:"flex",gap:10,marginBottom:20}}>
              {["group","bracket"].map(p=><button key={p} onClick={()=>setSt(prev=>({...prev,phase:p}))} style={{padding:"9px 20px",borderRadius:8,fontFamily:"'Teko',sans-serif",letterSpacing:".1em",cursor:"pointer",border:`1px solid ${st.phase===p?"rgba(239,68,68,.5)":"rgba(255,255,255,.09)"}`,background:st.phase===p?"rgba(239,68,68,.14)":"transparent",color:st.phase===p?"#f87171":"#5A7090"}}>{p==="group"?"GROUP STAGE":"KNOCKOUT"}</button>)}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {[["groupLocked","Lock Group Picks"],["bracketLocked","Lock Bracket Picks"]].map(([key,label])=>(
                <label key={key} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",fontSize:14,color:"#E0E8F0"}}>
                  <input type="checkbox" checked={!!st[key]} onChange={e=>setSt(prev=>({...prev,[key]:e.target.checked}))} style={{width:15,height:15,accentColor:"#f87171"}}/>
                  {label}
                </label>
              ))}
            </div>
          </div>
        )}

        {tab==="group"&&(
          <div>
            <p style={{color:"#5A7090",fontSize:13,marginBottom:14}}>Select advancing teams per group. Scores Phase 1 instantly.</p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(205px,1fr))",gap:10}}>
              {Object.entries(GROUPS).map(([grp,{teams,flags}])=>{
                const adv=st.groupResults?.[grp]||[];
                return(<div key={grp} style={{background:"#111E2E",borderRadius:10,padding:12,border:"1px solid rgba(255,255,255,.07)"}}>
                  <div style={{fontFamily:"'Teko',sans-serif",color:"#f87171",marginBottom:8,fontSize:14}}>GROUP {grp} <span style={{color:"#5A7090",fontSize:11}}>({adv.length} adv.)</span></div>
                  {teams.map((team,i)=>{const on=adv.includes(team);return(<div key={team} onClick={()=>toggleGroup(grp,team)} style={{display:"flex",alignItems:"center",gap:7,padding:"5px 8px",borderRadius:6,marginBottom:4,cursor:"pointer",background:on?"rgba(239,68,68,.12)":"transparent",border:`1px solid ${on?"rgba(239,68,68,.4)":"rgba(255,255,255,.07)"}`,color:on?"#f87171":"#5A7090",fontSize:12}}><span>{flags[i]}</span><span style={{flex:1}}>{team}</span>{on&&"✓"}</div>);})}
                </div>);
              })}
            </div>
          </div>
        )}

        {tab==="teams"&&(
          <div>
            <p style={{color:"#5A7090",fontSize:13,marginBottom:12}}>Enter 32 qualified teams in bracket seeding order.</p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:6}}>
              {Array.from({length:32},(_,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:7}}>
                  <span style={{color:"#5A7090",fontSize:11,width:18,textAlign:"right"}}>{i+1}</span>
                  <input value={(st.bracketTeams||[])[i]||""} onChange={e=>setTeamAt(i,e.target.value)} placeholder={`Team ${i+1}`} style={{flex:1,background:"#111E2E",border:"1px solid rgba(255,255,255,.09)",borderRadius:7,padding:"6px 9px",color:"#E0E8F0",fontSize:12,outline:"none"}}/>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==="bracket"&&(
          <div>
            <p style={{color:"#5A7090",fontSize:13,marginBottom:14}}>Click winner for each match to score Phase 2.</p>
            {ROUNDS.map(round=>{
              const{label,matches}=ROUND_META[round];const ri=ROUNDS.indexOf(round);
              return(<div key={round} style={{marginBottom:18}}>
                <div style={{fontFamily:"'Teko',sans-serif",color:"#f87171",fontSize:15,marginBottom:9}}>{label}</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))",gap:7}}>
                  {Array.from({length:matches},(_,i)=>{
                    const matchKey=`${round}_${i}`;let t1="?",t2="?";
                    if(round==="R32"){t1=(st.bracketTeams||[])[i*2]||`Slot ${i*2+1}`;t2=(st.bracketTeams||[])[i*2+1]||`Slot ${i*2+2}`;}
                    else{const prev=ROUNDS[ri-1];t1=st.bracketResults?.[`${prev}_${i*2}`]||"TBD";t2=st.bracketResults?.[`${prev}_${i*2+1}`]||"TBD";}
                    const winner=st.bracketResults?.[matchKey]||"";
                    return(<div key={matchKey} style={{background:"#111E2E",borderRadius:9,padding:10,border:"1px solid rgba(255,255,255,.07)"}}>
                      <div style={{fontSize:10,color:"#5A7090",marginBottom:6}}>Match {i+1}: {t1} vs {t2}</div>
                      <div style={{display:"flex",gap:5}}>
                        {[t1,t2].map(team=><button key={team} onClick={()=>setBracketResult(matchKey,team)} style={{flex:1,padding:"6px",borderRadius:6,fontSize:11,cursor:"pointer",border:`1px solid ${winner===team?"rgba(239,68,68,.5)":"rgba(255,255,255,.09)"}`,background:winner===team?"rgba(239,68,68,.15)":"transparent",color:winner===team?"#f87171":"#5A7090"}}>{team}</button>)}
                      </div>
                    </div>);
                  })}
                </div>
              </div>);
            })}
          </div>
        )}

        <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:22}}>
          <button onClick={onClose} style={{padding:"9px 20px",borderRadius:10,border:"1px solid rgba(255,255,255,.09)",background:"transparent",color:"#5A7090",fontSize:14,cursor:"pointer"}}>Cancel</button>
          <button onClick={save} style={{padding:"9px 24px",borderRadius:10,border:"none",background:"#EF4444",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>SAVE CHANGES</button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function Main(){
  const [firebaseUser,setFirebaseUser]=useState(undefined);
  const [userData,setUserData]=useState(null);
  const [users,setUsers]=useState({});
  const [tournament,setTournament]=useState(null);
  const [tab,setTab]=useState("picks");
  const [showAdmin,setShowAdmin]=useState(false);
  const [lang,setLang]=useState("en");
  const [toast,setToast]=useState(null);
  const t=T[lang];

  useEffect(()=>{
    const unsub=onAuthStateChanged(auth,async(fu)=>{
      if(fu){
        const data=await ensureUserDoc(fu);
        setFirebaseUser(fu);setUserData(data);
      }else{setFirebaseUser(null);setUserData(null);}
    });
    return unsub;
  },[]);

  useEffect(()=>{
    if(!firebaseUser)return;
    const u1=subscribeUsers(setUsers);
    const u2=subscribeTournamentState(setTournament);
    return()=>{u1();u2();};
  },[firebaseUser]);

  const showMsg=(msg,type="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),3000);};

  if(firebaseUser===undefined)return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#060C14"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Teko:wght@400;600;700&family=Outfit:wght@300;400;500;600&display=swap');*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Outfit',sans-serif;}`}</style>
      <div style={{fontFamily:"'Teko',sans-serif",fontSize:24,color:"#D4A843",letterSpacing:4}}>LOADING...</div>
    </div>
  );

  if(!firebaseUser)return<LoginScreen lang={lang} setLang={setLang} t={t}/>;

  const me=users[firebaseUser.uid]||userData||{};
  const admin=isAdmin(firebaseUser.email);
  const approved=me.approved||admin;

  if(!approved)return<PendingScreen user={firebaseUser} lang={lang} setLang={setLang} t={t}/>;

  if(!tournament)return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#060C14"}}>
      <div style={{fontFamily:"'Teko',sans-serif",fontSize:24,color:"#D4A843",letterSpacing:4}}>LOADING...</div>
    </div>
  );

  const myScore=calcScore({groupPicks:me.groupPicks,bracketPicks:me.bracketPicks},tournament);
  const phase=tournament.phase||"group";
  const tabs=[{id:"picks",label:phase==="group"?t.groupPicks:t.bracket},{id:"leaderboard",label:t.standings},{id:"rules",label:t.rules}];

  return(
    <div style={{minHeight:"100vh",background:"#060C14",fontFamily:"'Outfit',sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Teko:wght@400;600;700&family=Outfit:wght@300;400;500;600&display=swap');*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Outfit',sans-serif;color:#E0E8F0;}`}</style>
      <div style={{background:"#0C1620",borderBottom:"1px solid rgba(255,255,255,.07)",position:"sticky",top:0,zIndex:200}}>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px"}}>
          <span style={{fontSize:20}}>🏆</span>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Teko',sans-serif",fontSize:9,color:"#5A7090",letterSpacing:".22em"}}>KORBIZ</div>
            <div style={{fontFamily:"'Teko',sans-serif",fontSize:17,color:"#D4A843",lineHeight:1}}>WORLD CUP 2026</div>
          </div>
          <LangSwitcher lang={lang} setLang={setLang}/>
          <div style={{padding:"3px 9px",borderRadius:6,fontSize:11,fontFamily:"'Teko',sans-serif",letterSpacing:".12em",background:phase==="group"?"rgba(59,130,246,.14)":"rgba(212,168,67,.12)",color:phase==="group"?"#60a5fa":"#D4A843",border:`1px solid ${phase==="group"?"rgba(59,130,246,.3)":"rgba(212,168,67,.28)"}`}}>{phase==="group"?t.groupStage:t.knockout}</div>
          <div style={{textAlign:"center",background:"rgba(212,168,67,.1)",border:"1px solid rgba(212,168,67,.26)",borderRadius:8,padding:"4px 12px"}}>
            <div style={{fontFamily:"'Teko',sans-serif",fontSize:19,color:"#D4A843",lineHeight:1}}>{myScore.total}</div>
            <div style={{fontSize:9,color:"#5A7090",letterSpacing:".1em"}}>{t.ptsLabel}</div>
          </div>
          <div style={{padding:"3px 8px",borderRadius:5,fontSize:10,fontWeight:700,background:me.paid?"rgba(34,197,94,.12)":"rgba(239,68,68,.12)",color:me.paid?"#22C55E":"#EF4444",border:`1px solid ${me.paid?"rgba(34,197,94,.3)":"rgba(239,68,68,.3)"}`}}>{me.paid?t.paid:t.unpaid}</div>
          {admin&&<button onClick={()=>setShowAdmin(true)} style={{padding:"5px 11px",borderRadius:7,border:"1px solid rgba(239,68,68,.35)",background:"rgba(239,68,68,.1)",color:"#f87171",fontFamily:"'Teko',sans-serif",letterSpacing:".1em",fontSize:12,cursor:"pointer"}}>{t.admin}</button>}
          <Avatar name={firebaseUser.displayName} photoURL={firebaseUser.photoURL} size={32}/>
          <button onClick={signOutUser} style={{background:"transparent",border:"1px solid rgba(255,255,255,.1)",borderRadius:7,padding:"4px 10px",color:"#5A7090",fontSize:11,cursor:"pointer"}}>{t.signOut}</button>
        </div>
        <div style={{display:"flex",borderTop:"1px solid rgba(255,255,255,.07)",overflowX:"auto"}}>
          {tabs.map(tb=><button key={tb.id} onClick={()=>setTab(tb.id)} style={{padding:"9px 20px",border:"none",background:"transparent",color:tab===tb.id?"#D4A843":"#5A7090",borderBottom:`2px solid ${tab===tb.id?"#D4A843":"transparent"}`,fontFamily:"'Teko',sans-serif",letterSpacing:".12em",fontSize:13,whiteSpace:"nowrap",cursor:"pointer"}}>{tb.label}</button>)}
        </div>
      </div>

      <div style={{maxWidth:1280,margin:"0 auto",padding:"22px 16px"}}>
        {tab==="picks"&&phase==="group"&&<GroupPicks uid={firebaseUser.uid} myPicks={me.groupPicks} tournament={tournament} showToast={showMsg} t={t}/>}
        {tab==="picks"&&phase==="bracket"&&<BracketView uid={firebaseUser.uid} myPicks={me.bracketPicks} tournament={tournament} showToast={showMsg} t={t}/>}
        {tab==="leaderboard"&&<Leaderboard users={users} currentUid={firebaseUser.uid} tournament={tournament} t={t}/>}
        {tab==="rules"&&(
          <div style={{maxWidth:660}}>
            <div style={{fontFamily:"'Teko',sans-serif",fontSize:28,color:"#D4A843",marginBottom:18}}>RULES & SCORING</div>
            {[["💵",t.payment,"#22C55E",t.paymentDesc],[`📋`,t.phase1Title,"#3B82F6",t.phase1],["🏆",t.phase2Title,"#D4A843",t.phase2],["🏅",t.prizeDist,"#F59E0B",`${t.prize1} · ${t.prize2} · ${t.prize3}`],["📅",t.keyDates,"#8B5CF6",`${t.groupLock} | ${t.finalDate}`]].map(([icon,title,accent,desc])=>(
              <div key={title} style={{background:"#0C1620",border:"1px solid rgba(255,255,255,.07)",borderRadius:14,padding:"18px 20px",marginBottom:12,borderLeft:`3px solid ${accent}`}}>
                <div style={{fontFamily:"'Teko',sans-serif",fontSize:17,color:"#fff",letterSpacing:".1em",marginBottom:10}}>{icon} {title}</div>
                <p style={{fontSize:14,color:"#D1D5DB",lineHeight:1.8}}>{desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdmin&&admin&&<AdminPanel tournament={tournament} users={users} onClose={()=>setShowAdmin(false)} showToast={showMsg}/>}

      {toast&&<div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:toast.type==="error"?"#EF4444":"#D4A843",color:toast.type==="error"?"#fff":"#000",fontWeight:700,padding:"11px 26px",borderRadius:11,fontSize:14,zIndex:9999,boxShadow:"0 8px 40px rgba(0,0,0,.6)",whiteSpace:"nowrap"}}>{toast.msg}</div>}
    </div>
  );
}
