"use client";
import { useState, useEffect } from "react";
import {
  auth, signInWithGoogle, signOutUser, isAdmin,
  ensureUserDoc, saveGroupPicks, saveBracketPicks,
  setApproved, setPaid, subscribeUsers,
  subscribeTournamentState, saveTournamentState,
} from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

const GROUPS = {
  A:{teams:["USA","Panama","Honduras","Bosnia & Herz."],flags:["🇺🇸","🇵🇦","🇭🇳","🇧🇦"]},
  B:{teams:["Mexico","Jamaica","Costa Rica","New Zealand"],flags:["🇲🇽","🇯🇲","🇨🇷","🇳🇿"]},
  C:{teams:["Argentina","Chile","Peru","Albania"],flags:["🇦🇷","🇨🇱","🇵🇪","🇦🇱"]},
  D:{teams:["France","Morocco","Croatia","Ukraine"],flags:["🇫🇷","🇲🇦","🇭🇷","🇺🇦"]},
  E:{teams:["Spain","Belgium","Wales","Egypt"],flags:["🇪🇸","🇧🇪","🏴󠁧󠁢󠁷󠁬󠁳󠁿","🇪🇬"]},
  F:{teams:["Brazil","Colombia","Ecuador","Saudi Arabia"],flags:["🇧🇷","🇨🇴","🇪🇨","🇸🇦"]},
  G:{teams:["Germany","Serbia","Turkey","Iceland"],flags:["🇩🇪","🇷🇸","🇹🇷","🇮🇸"]},
  H:{teams:["Portugal","Poland","Iran","Venezuela"],flags:["🇵🇹","🇵🇱","🇮🇷","🇻🇪"]},
  I:{teams:["England","Senegal","DR Congo","Guatemala"],flags:["🏴󠁧󠁢󠁥󠁮󠁧󠁿","🇸🇳","🇨🇩","🇬🇹"]},
  J:{teams:["Netherlands","Cameroon","Ivory Coast","Libya"],flags:["🇳🇱","🇨🇲","🇨🇮","🇱🇾"]},
  K:{teams:["Japan","South Korea","Australia","Indonesia"],flags:["🇯🇵","🇰🇷","🇦🇺","🇮🇩"]},
  L:{teams:["Uruguay","Canada","Qatar","Moldova"],flags:["🇺🇾","🇨🇦","🇶🇦","🇲🇩"]},
};
const ROUNDS=["R32","R16","QF","SF","F"];
const ROUND_META={
  R32:{label:"Round of 32",pts:5,matches:16},
  R16:{label:"Round of 16",pts:10,matches:8},
  QF:{label:"Quarterfinals",pts:15,matches:4},
  SF:{label:"Semifinals",pts:20,matches:2},
  F:{label:"Final",pts:30,matches:1},
};

const TRANSLATIONS={
  en:{
    title:"WORLD CUP 2026",subtitle:"BRACKET CHALLENGE",org:"KORBIZ INTERNAL",
    loginBtn:"SIGN IN WITH GOOGLE",signOut:"Sign out",
    picks:"MY PICKS",standings:"STANDINGS",rules:"HOW TO PLAY",
    groupPicks:"GROUP PICKS",bracket:"BRACKET",
    savePicks:"SAVE PICKS",saved:"Saved ✓",
    ptsLabel:"PTS",paid:"PAID",unpaid:"UNPAID",admin:"ADMIN",
    groupStage:"GROUP STAGE",knockout:"KNOCKOUT",prizePot:"PRIZE POOL",
    awaiting:"AWAITING APPROVAL",
    awaitingMsg:"Your registration is received. Dave will approve your access once your $30 entry fee has been collected.",
    bracketWait:"BRACKET OPENS AFTER GROUP STAGE",
    bracketWaitSub:"32 qualified teams will be seeded once group stage concludes",
    entryFee:"ENTRY FEE",
  },
  es:{
    title:"MUNDIAL 2026",subtitle:"DESAFÍO DE BRACKET",org:"KORBIZ INTERNO",
    loginBtn:"INICIAR CON GOOGLE",signOut:"Cerrar sesión",
    picks:"MIS PICKS",standings:"CLASIFICACIÓN",rules:"CÓMO JUGAR",
    groupPicks:"PICKS GRUPO",bracket:"BRACKET",
    savePicks:"GUARDAR",saved:"Guardado ✓",
    ptsLabel:"PTS",paid:"PAGADO",unpaid:"PENDIENTE",admin:"ADMIN",
    groupStage:"GRUPOS",knockout:"KNOCKOUT",prizePot:"PREMIOS",
    awaiting:"ESPERANDO APROBACIÓN",
    awaitingMsg:"Registro recibido. Dave aprobará tu acceso cuando reciba tu cuota de $30.",
    bracketWait:"BRACKET ABRE DESPUÉS DE GRUPOS",
    bracketWaitSub:"32 equipos clasificados serán sembrados al concluir la fase de grupos",
    entryFee:"CUOTA",
  },
  mn:{
    title:"ДЭЛХИЙН ЦОМ 2026",subtitle:"BRACKET ТОГЛООМ",org:"KORBIZ ДОТООД",
    loginBtn:"GOOGLE-ЭЭР НЭВТРЭХ",signOut:"Гарах",
    picks:"МИНИЙ СОНГОЛТ",standings:"БАЙДАЛ",rules:"ХЭРХЭН ТОГЛОХ",
    groupPicks:"БҮЛГИЙН СОНГОЛТ",bracket:"BRACKET",
    savePicks:"ХАДГАЛАХ",saved:"Хадгалагдлаа ✓",
    ptsLabel:"ОНО",paid:"ТӨЛСӨН",unpaid:"ТӨЛӨӨГҮЙ",admin:"АДМИН",
    groupStage:"БҮЛГИЙН ШАТ",knockout:"KNOCKOUT",prizePot:"ШАГНАЛЫН САН",
    awaiting:"ЗӨВШӨӨРЛИЙГ ХҮЛЭЭЖ БАЙНА",
    awaitingMsg:"Бүртгэл хүлээн авлаа. Dave $30 авсны дараа хандалт нээнэ.",
    bracketWait:"BRACKET БҮЛГИЙН ШАТ ДУУССАНЫ ДАРАА НЭЭГДЭНЭ",
    bracketWaitSub:"32 тэмцэгч бүлгийн шат дуусмагц жагсаагдана",
    entryFee:"ХУРААМЖ",
  },
};

function calcScore(picks={},tournament={}){
  let total=0,breakdown=[];
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
  return{total,breakdown};
}

// ── UI Components ─────────────────────────────────────────────────────────────
function Avatar({name,photoURL,size=36}){
  const ini=(name||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  const pal=[["#D4A843","#7a5c10"],["#3B82F6","#1e40af"],["#22C55E","#166534"],["#EF4444","#991b1b"],["#8B5CF6","#5b21b6"],["#F59E0B","#92400e"]];
  const c=pal[(name||"x").charCodeAt(0)%pal.length];
  if(photoURL)return<img src={photoURL} referrerPolicy="no-referrer" style={{width:size,height:size,borderRadius:"50%",display:"block"}} alt=""/>;
  return<div style={{width:size,height:size,borderRadius:"50%",background:`linear-gradient(135deg,${c[0]},${c[1]})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.38,fontWeight:700,color:"#fff",fontFamily:"'Teko',sans-serif",flexShrink:0}}>{ini}</div>;
}

function LangSwitcher({lang,setLang}){
  return<div style={{display:"flex",gap:5}}>{[["en","EN 🇺🇸"],["es","ES 🇲🇽"],["mn","MN 🇲🇳"]].map(([k,l])=><button key={k} onClick={()=>setLang(k)} style={{padding:"4px 9px",borderRadius:7,border:`1px solid ${lang===k?"#D4A843":"rgba(255,255,255,.14)"}`,background:lang===k?"rgba(212,168,67,.15)":"transparent",color:lang===k?"#D4A843":"#6b7280",fontSize:11,fontWeight:600,cursor:"pointer"}}>{l}</button>)}</div>;
}

// ── HOW TO PLAY SECTION (shown pre-login and in rules tab) ────────────────────
function HowToPlay({lang}){
  const t=TRANSLATIONS[lang];
  const S=({icon,title,accent,children})=>(
    <div style={{background:"#0C1620",border:"1px solid rgba(255,255,255,.07)",borderRadius:14,padding:"16px 18px",marginBottom:10,borderLeft:`3px solid ${accent}`}}>
      <div style={{fontFamily:"'Teko',sans-serif",fontSize:16,color:"#fff",letterSpacing:".1em",marginBottom:8}}>{icon} {title}</div>
      {children}
    </div>
  );
  return(
    <div style={{maxWidth:660,margin:"0 auto"}}>
      <S icon="💵" title={lang==="en"?"ENTRY & PRIZES":lang==="es"?"ENTRADA Y PREMIOS":"ОРОЛЦООНЫ ХУРААМЖ"} accent="#22C55E">
        <p style={{fontSize:13,color:"#D1D5DB",lineHeight:1.8}}>
          {lang==="en"&&<>Entry fee: <strong style={{color:"#D4A843"}}>$30 cash to Dave Ha</strong>. Once confirmed, Dave approves your access and you can start making picks.<br/>Prize pool split: <strong style={{color:"#D4A843"}}>1st 50%</strong> · 2nd 30% · 3rd 20%</>}
          {lang==="es"&&<>Cuota: <strong style={{color:"#D4A843"}}>$30 en efectivo a Dave Ha</strong>. Una vez confirmado, Dave aprueba tu acceso.<br/>Premios: <strong style={{color:"#D4A843"}}>1ro 50%</strong> · 2do 30% · 3ro 20%</>}
          {lang==="mn"&&<>Хураамж: <strong style={{color:"#D4A843"}}>Dave Ha-д $30 бэлнээр</strong>. Баталгаажсаны дараа Dave хандалт нээнэ.<br/>Шагнал: <strong style={{color:"#D4A843"}}>1-р 50%</strong> · 2-р 30% · 3-р 20%</>}
        </p>
      </S>
      <S icon="📋" title={lang==="en"?"PHASE 1 — GROUP STAGE":lang==="es"?"FASE 1 — GRUPOS":"1-Р ҮЕ ШАТ — БҮЛЭГ"} accent="#3B82F6">
        <p style={{fontSize:13,color:"#D1D5DB",lineHeight:1.8,marginBottom:10}}>
          {lang==="en"&&<>Pick up to <strong style={{color:"#D4A843"}}>3 teams per group</strong> that you think will advance to the Round of 32. You earn <strong style={{color:"#D4A843"}}>+3 points</strong> for each correct team — it doesn't matter if they finish 1st, 2nd or 3rd in the group.<br/><em style={{color:"#5A7090",fontSize:12}}>Max: 12 groups × 3 teams × 3 pts = 108 pts</em></>}
          {lang==="es"&&<>Elige hasta <strong style={{color:"#D4A843"}}>3 equipos por grupo</strong> que creas que avanzarán. Ganas <strong style={{color:"#D4A843"}}>+3 puntos</strong> por cada equipo correcto.<br/><em style={{color:"#5A7090",fontSize:12}}>Máx: 12 grupos × 3 × 3 = 108 pts</em></>}
          {lang==="mn"&&<>Бүлэг тус бүрээс <strong style={{color:"#D4A843"}}>3 хүртэлх баг</strong> сонго. Зөв баг тутамд <strong style={{color:"#D4A843"}}>+3 оноо</strong>.<br/><em style={{color:"#5A7090",fontSize:12}}>Дээд: 12×3×3 = 108 оноо</em></>}
        </p>
        <div style={{background:"rgba(59,130,246,.08)",border:"1px solid rgba(59,130,246,.2)",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#9CA3AF"}}>
          {lang==="en"&&"📌 2026 Format: 48 teams · 12 groups of 4 · Top 2 + best 8 third-place teams = 32 advance"}
          {lang==="es"&&"📌 Formato 2026: 48 equipos · 12 grupos de 4 · Top 2 + 8 mejores terceros = 32 avanzan"}
          {lang==="mn"&&"📌 2026 формат: 48 баг · 12 бүлэг · Дээд 2 + 8 шилдэг 3-р = 32 дэвшинэ"}
        </div>
      </S>
      <S icon="🏆" title={lang==="en"?"PHASE 2 — KNOCKOUT BRACKET":lang==="es"?"FASE 2 — BRACKET ELIMINATORIO":"2-Р ҮЕ ШАТ — BRACKET"} accent="#D4A843">
        <p style={{fontSize:13,color:"#D1D5DB",lineHeight:1.8,marginBottom:12}}>
          {lang==="en"&&<>March Madness style — pick the winner of every knockout match. Points increase each round. Bracket opens after all group stage matches finish.</>}
          {lang==="es"&&<>Estilo March Madness — elige al ganador de cada partido eliminatorio. Los puntos aumentan por ronda.</>}
          {lang==="mn"&&<>March Madness загвар — тоглолт бүрийн ялагчийг сонго. Шат ахих тусам оноо нэмэгдэнэ.</>}
        </p>
        <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
          {Object.entries(ROUND_META).map(([r,{label,pts}])=>(
            <div key={r} style={{background:"rgba(212,168,67,.1)",border:"1px solid rgba(212,168,67,.25)",borderRadius:8,padding:"7px 12px",textAlign:"center",minWidth:70}}>
              <div style={{fontFamily:"'Teko',sans-serif",fontSize:20,color:"#D4A843",lineHeight:1}}>+{pts}</div>
              <div style={{fontSize:10,color:"#9CA3AF",marginTop:2}}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{marginTop:10,fontSize:12,color:"#5A7090"}}>
          {lang==="en"&&"Max Phase 2: (16×5)+(8×10)+(4×15)+(2×20)+(1×30) = 330 pts"}
          {lang==="es"&&"Máx Fase 2: 330 pts"}
          {lang==="mn"&&"Дээд 2-р үе: 330 оноо"}
        </div>
      </S>
      <S icon="📅" title={lang==="en"?"KEY DATES":lang==="es"?"FECHAS CLAVE":"ГОЛ ОГНООНУУД"} accent="#8B5CF6">
        <div style={{fontSize:13,color:"#D1D5DB",lineHeight:2.2}}>
          <div>⚽ {lang==="en"?"Group stage:":lang==="es"?"Fase de grupos:":"Бүлгийн шат:"} <strong style={{color:"#fff"}}>June 12 – July 2, 2026</strong></div>
          <div>🔒 {lang==="en"?"Group picks lock:":lang==="es"?"Picks cierran:":"Сонголт хаагдах:"} <strong style={{color:"#fff"}}>June 12, kickoff</strong></div>
          <div>🏆 {lang==="en"?"Final:":"Final:"} <strong style={{color:"#fff"}}>July 19, 2026 — MetLife Stadium, NJ</strong></div>
        </div>
      </S>
    </div>
  );
}

// ── Login Screen ──────────────────────────────────────────────────────────────
function LoginScreen({lang,setLang}){
  const t=TRANSLATIONS[lang];
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState("");
  const [showRules,setShowRules]=useState(false);
  const handleLogin=async()=>{setLoading(true);setErr("");try{await signInWithGoogle();}catch(e){setErr("Login failed — please try again");setLoading(false);}};
  return(
    <div style={{minHeight:"100vh",background:"#060C14",backgroundImage:"radial-gradient(ellipse at 20% 60%,rgba(212,168,67,.06) 0%,transparent 60%)"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Teko:wght@400;600;700&family=Outfit:wght@300;400;500;600&display=swap');*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Outfit',sans-serif;color:#E0E8F0;}`}</style>
      <div style={{padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid rgba(255,255,255,.06)"}}>
        <div style={{fontFamily:"'Teko',sans-serif",fontSize:16,color:"#D4A843"}}>🏆 KORBIZ WORLD CUP 2026</div>
        <LangSwitcher lang={lang} setLang={setLang}/>
      </div>

      {/* Hero */}
      <div style={{textAlign:"center",padding:"48px 24px 32px"}}>
        <div style={{fontSize:64,marginBottom:8,filter:"drop-shadow(0 0 24px rgba(212,168,67,.35))"}}>🏆</div>
        <h1 style={{fontFamily:"'Teko',sans-serif",fontSize:54,color:"#fff",lineHeight:1,marginBottom:4}}>{t.title}</h1>
        <div style={{fontFamily:"'Teko',sans-serif",fontSize:22,color:"#D4A843",letterSpacing:".18em",marginBottom:24}}>{t.subtitle}</div>

        {/* Stats row */}
        <div style={{display:"flex",justifyContent:"center",gap:28,marginBottom:28}}>
          {[["$30",t.entryFee],["48","TEAMS"],["104","MATCHES"],["🥇","PRIZES"]].map(([v,l])=>(
            <div key={l} style={{textAlign:"center"}}>
              <div style={{fontFamily:"'Teko',sans-serif",fontSize:26,color:"#D4A843",lineHeight:1}}>{v}</div>
              <div style={{fontSize:10,color:"#5A7090",letterSpacing:".12em"}}>{l}</div>
            </div>
          ))}
        </div>

        {/* Login button */}
        {err&&<div style={{marginBottom:12,fontSize:13,color:"#EF4444",background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.3)",borderRadius:8,padding:"9px 12px",maxWidth:380,margin:"0 auto 12px"}}>{err}</div>}
        <button onClick={handleLogin} disabled={loading} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12,width:"100%",maxWidth:360,margin:"0 auto",padding:"14px",borderRadius:12,border:"none",background:"#fff",color:"#111",fontSize:15,fontWeight:600,cursor:"pointer",boxShadow:"0 4px 24px rgba(0,0,0,.4)",opacity:loading?0.7:1}}>
          <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.29-8.16 2.29-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          {loading?"Loading...":t.loginBtn}
        </button>
        <p style={{color:"#5A7090",fontSize:12,marginTop:12}}>Korbiz employees only · Personal Google account</p>

        {/* Toggle How to Play */}
        <button onClick={()=>setShowRules(r=>!r)} style={{marginTop:20,background:"transparent",border:"1px solid rgba(212,168,67,.3)",borderRadius:10,padding:"9px 22px",color:"#D4A843",fontSize:13,fontWeight:600,cursor:"pointer",letterSpacing:".05em"}}>
          {showRules?"▲ Hide":"▼ How to Play / Rules"}
        </button>
      </div>

      {/* How to play — collapsible */}
      {showRules&&(
        <div style={{padding:"0 20px 40px"}}>
          <HowToPlay lang={lang}/>
        </div>
      )}
    </div>
  );
}

// ── Pending Screen ────────────────────────────────────────────────────────────
function PendingScreen({user,lang,setLang}){
  const t=TRANSLATIONS[lang];
  const [showRules,setShowRules]=useState(true);
  return(
    <div style={{minHeight:"100vh",background:"#060C14"}}>
      <div style={{background:"#0C1620",borderBottom:"1px solid rgba(255,255,255,.07)",padding:"12px 20px",display:"flex",alignItems:"center",gap:12}}>
        <span style={{fontSize:20}}>🏆</span>
        <div style={{fontFamily:"'Teko',sans-serif",fontSize:17,color:"#D4A843",flex:1}}>WORLD CUP 2026</div>
        <LangSwitcher lang={lang} setLang={setLang}/>
        <Avatar name={user.displayName} photoURL={user.photoURL} size={30}/>
        <button onClick={signOutUser} style={{background:"transparent",border:"1px solid rgba(255,255,255,.12)",borderRadius:7,padding:"4px 10px",color:"#6b7280",fontSize:11,cursor:"pointer"}}>{t.signOut}</button>
      </div>
      <div style={{maxWidth:660,margin:"0 auto",padding:"24px 20px"}}>
        <div style={{background:"rgba(212,168,67,.08)",border:"1px solid rgba(212,168,67,.3)",borderRadius:14,padding:"16px 20px",marginBottom:20,display:"flex",gap:12,alignItems:"flex-start"}}>
          <div style={{fontSize:28,flexShrink:0}}>⏳</div>
          <div>
            <div style={{fontFamily:"'Teko',sans-serif",fontSize:18,color:"#D4A843",marginBottom:6}}>{t.awaiting}</div>
            <div style={{fontSize:13,color:"#9CA3AF",lineHeight:1.7}}>{t.awaitingMsg}</div>
          </div>
        </div>
        <button onClick={()=>setShowRules(r=>!r)} style={{width:"100%",background:"transparent",border:"1px solid rgba(255,255,255,.1)",borderRadius:10,padding:"10px",color:"#D4A843",fontSize:13,fontWeight:600,cursor:"pointer",marginBottom:16}}>
          {showRules?"▲ Hide Rules":"▼ View Rules & How to Play"}
        </button>
        {showRules&&<HowToPlay lang={lang}/>}
      </div>
    </div>
  );
}

// ── Group Picks ───────────────────────────────────────────────────────────────
function GroupPicks({uid,myPicks,tournament,showToast,t}){
  const [picks,setPicks]=useState(myPicks||{});
  const [saving,setSaving]=useState(false);
  const locked=tournament.groupLocked;
  const gr=tournament.groupResults||{};

  // sync when myPicks changes (e.g. loaded from firebase)
  useEffect(()=>{setPicks(myPicks||{});},[JSON.stringify(myPicks)]);

  const toggle=(grp,team)=>{
    if(locked)return;
    setPicks(prev=>{const cur=prev[grp]||[];if(cur.includes(team))return{...prev,[grp]:cur.filter(x=>x!==team)};if(cur.length>=3)return prev;return{...prev,[grp]:[...cur,team]};});
  };
  const handleSave=async()=>{
    setSaving(true);
    try{await saveGroupPicks(uid,picks);showToast("Group picks saved ✓");}
    catch(e){showToast("Save failed — try again","error");}
    setSaving(false);
  };
  const total=Object.values(picks).reduce((a,b)=>a+b.length,0);

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:18,flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontFamily:"'Teko',sans-serif",fontSize:26,color:"#D4A843",letterSpacing:".08em",lineHeight:1}}>PHASE 1 — GROUP PICKS</div>
          <div style={{color:"#5A7090",fontSize:13,marginTop:3}}>Select up to 3 teams per group · <span style={{color:"#D4A843"}}>+3 pts</span> per correct qualifier</div>
        </div>
        {!locked&&<button onClick={handleSave} disabled={saving} style={{padding:"9px 20px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#D4A843,#8B6914)",color:"#000",fontFamily:"'Teko',sans-serif",fontSize:16,fontWeight:700,cursor:"pointer",opacity:saving?0.7:1}}>{saving?"Saving...":t.savePicks+" ("+total+")"}</button>}
      </div>
      {locked&&<div style={{background:"rgba(59,130,246,.1)",border:"1px solid rgba(59,130,246,.3)",borderRadius:10,padding:"10px 16px",marginBottom:16,color:"#60a5fa",fontSize:13}}>🔒 Group stage has started — picks are locked</div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(255px,1fr))",gap:12}}>
        {Object.entries(GROUPS).map(([grp,{teams,flags}])=>{
          const myG=picks[grp]||[];const adv=gr[grp]||[];const hasRes=adv.length>0;
          return(
            <div key={grp} style={{background:"#0C1620",border:"1px solid rgba(255,255,255,.07)",borderRadius:13,padding:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{fontFamily:"'Teko',sans-serif",fontSize:16,color:"#D4A843",letterSpacing:".14em"}}>GROUP {grp}</div>
                <div style={{fontSize:11,color:"#5A7090"}}>{myG.length}/3</div>
              </div>
              {teams.map((team,i)=>{
                const picked=myG.includes(team);const correct=hasRes&&adv.includes(team)&&picked;const wrong=hasRes&&!adv.includes(team)&&picked;const didAdv=hasRes&&adv.includes(team);
                return(
                  <div key={team} onClick={()=>toggle(grp,team)} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 9px",borderRadius:8,marginBottom:4,cursor:locked?"default":"pointer",background:correct?"rgba(34,197,94,.12)":wrong?"rgba(239,68,68,.1)":picked?"rgba(212,168,67,.1)":"transparent",border:`1px solid ${correct?"rgba(34,197,94,.4)":wrong?"rgba(239,68,68,.35)":picked?"rgba(212,168,67,.28)":"rgba(255,255,255,.07)"}`,transition:"all .12s"}}>
                    <span style={{fontSize:16}}>{flags[i]}</span>
                    <span style={{flex:1,fontSize:13,fontWeight:picked?600:400,color:correct?"#22C55E":wrong?"#EF4444":picked?"#D4A843":"#E0E8F0"}}>{team}</span>
                    {correct&&<span>✅ +3</span>}
                    {wrong&&<span>❌</span>}
                    {!hasRes&&picked&&<span style={{color:"#D4A843",fontSize:11}}>✓</span>}
                    {hasRes&&didAdv&&!picked&&<span style={{fontSize:10,color:"#5A7090"}}>advanced</span>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      {!locked&&(
        <div style={{display:"flex",justifyContent:"center",marginTop:22}}>
          <button onClick={handleSave} disabled={saving} style={{padding:"12px 40px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#D4A843,#8B6914)",color:"#000",fontFamily:"'Teko',sans-serif",fontSize:17,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 24px rgba(212,168,67,.25)",opacity:saving?0.7:1}}>
            {saving?"Saving...":t.savePicks+" — "+total+" teams"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Bracket ───────────────────────────────────────────────────────────────────
function BracketView({uid,myPicks,tournament,showToast,t}){
  const [picks,setPicks]=useState(myPicks||{});
  const [saving,setSaving]=useState(false);
  const locked=tournament.bracketLocked;
  const bracketTeams=tournament.bracketTeams||[];
  const actual=tournament.bracketResults||{};

  useEffect(()=>{setPicks(myPicks||{});},[JSON.stringify(myPicks)]);

  const getTeams=(round,i)=>{
    const ri=ROUNDS.indexOf(round);
    if(round==="R32")return{t1:bracketTeams[i*2]||"TBD",t2:bracketTeams[i*2+1]||"TBD"};
    const prev=ROUNDS[ri-1];
    return{t1:actual[`${prev}_${i*2}`]||picks[`${prev}_${i*2}`]||"TBD",t2:actual[`${prev}_${i*2+1}`]||picks[`${prev}_${i*2+1}`]||"TBD"};
  };
  const doPick=(key,team)=>{if(locked||actual[key])return;setPicks(prev=>({...prev,[key]:team}));};
  const handleSave=async()=>{
    setSaving(true);
    try{await saveBracketPicks(uid,picks);showToast("Bracket saved ✓");}
    catch(e){showToast("Save failed","error");}
    setSaving(false);
  };

  if(!bracketTeams.some(x=>x))return(
    <div style={{textAlign:"center",padding:"80px 20px"}}>
      <div style={{fontSize:52,marginBottom:12}}>⏳</div>
      <div style={{fontFamily:"'Teko',sans-serif",fontSize:24,color:"#D4A843"}}>{t.bracketWait}</div>
      <div style={{color:"#5A7090",fontSize:13,marginTop:6}}>{t.bracketWaitSub}</div>
    </div>
  );

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:14,flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontFamily:"'Teko',sans-serif",fontSize:26,color:"#D4A843",letterSpacing:".08em",lineHeight:1}}>PHASE 2 — KNOCKOUT BRACKET</div>
          <div style={{color:"#5A7090",fontSize:13,marginTop:3}}>Click teams to pick winners · Points scale up per round</div>
        </div>
        {!locked&&<button onClick={handleSave} disabled={saving} style={{padding:"9px 20px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#D4A843,#8B6914)",color:"#000",fontFamily:"'Teko',sans-serif",fontSize:16,fontWeight:700,cursor:"pointer",opacity:saving?0.7:1}}>{saving?"Saving...":t.savePicks}</button>}
      </div>
      <div style={{display:"flex",gap:7,marginBottom:14,flexWrap:"wrap"}}>
        {ROUNDS.map(r=><div key={r} style={{padding:"3px 10px",borderRadius:6,background:"#111E2E",border:"1px solid rgba(255,255,255,.07)",fontSize:12,color:"#5A7090"}}>{ROUND_META[r].label}: <span style={{color:"#D4A843",fontWeight:700}}>+{ROUND_META[r].pts}</span></div>)}
      </div>
      <div style={{overflowX:"auto",paddingBottom:12}}>
        <div style={{display:"flex",gap:10,minWidth:960}}>
          {ROUNDS.map(round=>{
            const{label,pts,matches}=ROUND_META[round];
            return(
              <div key={round} style={{flex:1,minWidth:165}}>
                <div style={{fontFamily:"'Teko',sans-serif",fontSize:12,color:round==="F"?"#D4A843":"#5A7090",letterSpacing:".14em",textAlign:"center",marginBottom:9,paddingBottom:6,borderBottom:"1px solid rgba(255,255,255,.07)"}}>{round==="F"?"🏆 ":""}{label}</div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {Array.from({length:matches},(_,i)=>{
                    const matchKey=`${round}_${i}`;
                    const{t1,t2}=getTeams(round,i);
                    const myPick=picks[matchKey];const actualW=actual[matchKey];const done=!!actualW;
                    const teamRow=(team)=>{
                      if(!team||team==="TBD")return<div key="tbd" style={{padding:"6px 8px",borderRadius:6,marginBottom:3,background:"#111E2E",color:"#5A7090",fontSize:11}}>TBD</div>;
                      const isPick=myPick===team;const correct=done&&actualW===team&&isPick;const wrong=done&&actualW!==team&&isPick;const isW=done&&actualW===team;
                      return(
                        <div key={team} onClick={()=>doPick(matchKey,team)} style={{padding:"6px 8px",borderRadius:6,marginBottom:3,cursor:locked||done?"default":"pointer",background:correct?"rgba(34,197,94,.13)":wrong?"rgba(239,68,68,.11)":isPick?"rgba(212,168,67,.1)":"transparent",border:`1px solid ${correct?"rgba(34,197,94,.4)":wrong?"rgba(239,68,68,.38)":isPick?"rgba(212,168,67,.28)":"rgba(255,255,255,.07)"}`,color:correct?"#22C55E":wrong?"#EF4444":isPick?"#D4A843":isW?"#fff":"#9CA3AF",fontSize:12,fontWeight:isPick||isW?600:400,display:"flex",alignItems:"center",gap:4,transition:"all .11s"}}>
                          <span style={{flex:1}}>{team}</span>
                          {correct&&"✅"}{wrong&&"❌"}
                          {!done&&isPick&&<span style={{fontSize:9,color:"#D4A843"}}>✓</span>}
                          {isW&&!isPick&&<span style={{fontSize:9,color:"#5A7090"}}>✓</span>}
                        </div>
                      );
                    };
                    return(
                      <div key={matchKey} style={{background:"#0C1620",border:"1px solid rgba(255,255,255,.07)",borderRadius:8,padding:"8px 9px"}}>
                        <div style={{fontSize:9,color:"#5A7090",letterSpacing:".1em",marginBottom:5}}>+{pts} PTS</div>
                        {teamRow(t1)}{teamRow(t2)}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Leaderboard ───────────────────────────────────────────────────────────────
function Leaderboard({users,currentUid,tournament,t}){
  const ranked=Object.values(users)
    .map(u=>({...u,...calcScore({groupPicks:u.groupPicks||{},bracketPicks:u.bracketPicks||{}},tournament)}))
    .sort((a,b)=>b.total-a.total)
    .filter(u=>u.approved);
  const paid=ranked.filter(u=>u.paid).length;
  const medals=["🥇","🥈","🥉"];
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:18,flexWrap:"wrap",gap:10}}>
        <div style={{fontFamily:"'Teko',sans-serif",fontSize:26,color:"#D4A843"}}>{t.standings.toUpperCase()}</div>
        <div style={{textAlign:"center",background:"rgba(212,168,67,.1)",border:"1px solid rgba(212,168,67,.28)",borderRadius:10,padding:"7px 16px"}}>
          <div style={{fontFamily:"'Teko',sans-serif",fontSize:24,color:"#D4A843"}}>${paid*30}</div>
          <div style={{fontSize:10,color:"#5A7090",letterSpacing:".12em"}}>{t.prizePot} · {paid} {t.paid}</div>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:7}}>
        {ranked.map((u,i)=>(
          <div key={u.uid} style={{display:"flex",alignItems:"center",gap:11,padding:"12px 14px",borderRadius:11,background:u.uid===currentUid?"rgba(212,168,67,.09)":"#0C1620",border:`1px solid ${u.uid===currentUid?"rgba(212,168,67,.27)":"rgba(255,255,255,.07)"}`}}>
            <div style={{width:28,textAlign:"center",fontSize:i<3?20:12,fontFamily:"'Teko',sans-serif",color:"#5A7090"}}>{i<3?medals[i]:`#${i+1}`}</div>
            <Avatar name={u.name} photoURL={u.photoURL} size={36}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:600,color:u.uid===currentUid?"#D4A843":"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.name}{u.uid===currentUid&&<span style={{fontSize:11,color:"#5A7090",fontWeight:400}}> (you)</span>}</div>
              <div style={{fontSize:11,color:"#5A7090"}}>{u.email}</div>
            </div>
            <div style={{padding:"2px 7px",borderRadius:5,fontSize:10,fontWeight:700,background:u.paid?"rgba(34,197,94,.12)":"rgba(239,68,68,.12)",color:u.paid?"#22C55E":"#EF4444",border:`1px solid ${u.paid?"rgba(34,197,94,.3)":"rgba(239,68,68,.3)"}`}}>{u.paid?t.paid:t.unpaid}</div>
            <div style={{textAlign:"right",minWidth:48}}>
              <div style={{fontFamily:"'Teko',sans-serif",fontSize:22,color:"#D4A843",lineHeight:1}}>{u.total}</div>
              <div style={{fontSize:9,color:"#5A7090",letterSpacing:".1em"}}>{t.ptsLabel}</div>
            </div>
          </div>
        ))}
        {ranked.length===0&&<div style={{textAlign:"center",color:"#5A7090",padding:"50px 0",fontSize:14}}>No approved participants yet</div>}
      </div>
      {/* Scoring legend */}
      <div style={{marginTop:20,padding:"14px 16px",background:"#111E2E",borderRadius:12,border:"1px solid rgba(255,255,255,.07)"}}>
        <div style={{fontFamily:"'Teko',sans-serif",fontSize:12,color:"#5A7090",letterSpacing:".14em",marginBottom:8}}>POINT SYSTEM</div>
        <div style={{display:"flex",gap:14,flexWrap:"wrap",fontSize:12,color:"#5A7090"}}>
          <span>Group: <span style={{color:"#D4A843",fontWeight:700}}>+3</span></span>
          {ROUNDS.map(r=><span key={r}>{ROUND_META[r].label}: <span style={{color:"#D4A843",fontWeight:700}}>+{ROUND_META[r].pts}</span></span>)}
        </div>
      </div>
    </div>
  );
}

// ── Admin Panel ───────────────────────────────────────────────────────────────
function AdminPanel({tournament,users,onClose,showToast}){
  const [st,setSt]=useState({...tournament,bracketTeams:[...(tournament.bracketTeams||Array(32).fill(""))],groupResults:{...tournament.groupResults},bracketResults:{...tournament.bracketResults}});
  const [tab,setTab]=useState("approvals");
  const [saving,setSaving]=useState(false);
  const pending=Object.values(users).filter(u=>!u.approved);
  const approved=Object.values(users).filter(u=>u.approved);

  const save=async()=>{
    setSaving(true);
    try{await saveTournamentState(st);showToast("Saved ✓");onClose();}
    catch(e){showToast("Save failed","error");}
    setSaving(false);
  };
  const toggleGroup=(grp,team)=>setSt(prev=>{const cur=prev.groupResults?.[grp]||[];const next=cur.includes(team)?cur.filter(x=>x!==team):[...cur,team];return{...prev,groupResults:{...prev.groupResults,[grp]:next}};});
  const setBR=(key,winner)=>setSt(prev=>({...prev,bracketResults:{...prev.bracketResults,[key]:prev.bracketResults?.[key]===winner?"":winner}}));
  const setTeam=(idx,val)=>setSt(prev=>{const arr=[...prev.bracketTeams];arr[idx]=val;return{...prev,bracketTeams:arr};});

  const ATABS=["approvals","payments","phase","group","teams","bracket"];

  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.9)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(6px)"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#0C1620",border:"1px solid rgba(239,68,68,.22)",borderRadius:18,padding:"22px 20px",maxWidth:860,width:"96vw",maxHeight:"91vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{fontFamily:"'Teko',sans-serif",fontSize:21,color:"#f87171",letterSpacing:".1em"}}>🔑 ADMIN PANEL</div>
          <button onClick={onClose} style={{background:"transparent",border:"none",color:"#5A7090",fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{display:"flex",gap:5,marginBottom:16,overflowX:"auto",paddingBottom:2}}>
          {ATABS.map(at=>(
            <button key={at} onClick={()=>setTab(at)} style={{padding:"5px 12px",borderRadius:7,fontSize:12,fontFamily:"'Teko',sans-serif",letterSpacing:".1em",whiteSpace:"nowrap",cursor:"pointer",border:`1px solid ${tab===at?"rgba(239,68,68,.5)":"rgba(255,255,255,.09)"}`,background:tab===at?"rgba(239,68,68,.14)":"transparent",color:tab===at?"#f87171":"#5A7090"}}>
              {at==="approvals"&&pending.length>0?`APPROVALS (${pending.length})`:at.toUpperCase()}
            </button>
          ))}
        </div>

        {tab==="approvals"&&(
          <div>
            <p style={{color:"#5A7090",fontSize:13,marginBottom:12}}>Approve participants after collecting $30 cash. Approved users get instant full access.</p>
            {pending.length>0&&(<>
              <div style={{fontFamily:"'Teko',sans-serif",color:"#f87171",fontSize:13,marginBottom:8}}>⏳ PENDING ({pending.length})</div>
              <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:16}}>
                {pending.map(u=>(
                  <div key={u.uid} style={{display:"flex",alignItems:"center",gap:11,padding:"11px 13px",borderRadius:9,background:"rgba(239,68,68,.06)",border:"1px solid rgba(239,68,68,.2)"}}>
                    <Avatar name={u.name} photoURL={u.photoURL} size={34}/>
                    <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:"#fff"}}>{u.name}</div><div style={{fontSize:11,color:"#5A7090"}}>{u.email}</div></div>
                    <button onClick={async()=>{await setApproved(u.uid,true);showToast(`${u.name} approved ✓`);}} style={{padding:"6px 16px",borderRadius:7,border:"1px solid rgba(34,197,94,.4)",background:"rgba(34,197,94,.12)",color:"#22C55E",fontSize:12,fontWeight:700,cursor:"pointer"}}>✓ APPROVE + PAID</button>
                  </div>
                ))}
              </div>
            </>)}
            {approved.length>0&&(<>
              <div style={{fontFamily:"'Teko',sans-serif",color:"#22C55E",fontSize:13,marginBottom:8}}>✓ APPROVED ({approved.length})</div>
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                {approved.map(u=>(
                  <div key={u.uid} style={{display:"flex",alignItems:"center",gap:11,padding:"9px 13px",borderRadius:9,background:"rgba(34,197,94,.06)",border:"1px solid rgba(34,197,94,.14)"}}>
                    <Avatar name={u.name} photoURL={u.photoURL} size={30}/>
                    <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:"#fff"}}>{u.name}</div><div style={{fontSize:11,color:"#5A7090"}}>{u.email}</div></div>
                    <button onClick={async()=>{await setApproved(u.uid,false);showToast(`${u.name} revoked`);}} style={{padding:"4px 11px",borderRadius:6,border:"1px solid rgba(239,68,68,.3)",background:"transparent",color:"#f87171",fontSize:11,cursor:"pointer"}}>Revoke</button>
                  </div>
                ))}
              </div>
            </>)}
            {pending.length===0&&approved.length===0&&<div style={{color:"#5A7090",textAlign:"center",padding:"30px 0"}}>No registrations yet</div>}
          </div>
        )}

        {tab==="payments"&&(
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {Object.values(users).filter(u=>u.approved).map(u=>(
              <div key={u.uid} style={{display:"flex",alignItems:"center",gap:11,padding:"10px 13px",borderRadius:9,background:"#111E2E",border:"1px solid rgba(255,255,255,.07)"}}>
                <Avatar name={u.name} photoURL={u.photoURL} size={32}/>
                <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:"#fff"}}>{u.name}</div><div style={{fontSize:11,color:"#5A7090"}}>{u.email}</div></div>
                <div style={{padding:"2px 8px",borderRadius:5,fontSize:10,fontWeight:700,background:u.paid?"rgba(34,197,94,.12)":"rgba(239,68,68,.12)",color:u.paid?"#22C55E":"#EF4444",border:`1px solid ${u.paid?"rgba(34,197,94,.3)":"rgba(239,68,68,.3)"}`}}>{u.paid?"✓ PAID":"UNPAID"}</div>
                <button onClick={async()=>{await setPaid(u.uid,!u.paid);showToast(`${u.name} marked ${u.paid?"unpaid":"paid"}`);}} style={{padding:"5px 12px",borderRadius:7,fontSize:11,cursor:"pointer",border:`1px solid ${u.paid?"rgba(239,68,68,.3)":"rgba(34,197,94,.3)"}`,background:"transparent",color:u.paid?"#f87171":"#22C55E"}}>{u.paid?"Unmark":"Mark Paid"}</button>
              </div>
            ))}
            {Object.values(users).filter(u=>u.approved).length===0&&<div style={{color:"#5A7090",textAlign:"center",padding:"30px 0"}}>No approved users</div>}
          </div>
        )}

        {tab==="phase"&&(
          <div>
            <p style={{color:"#5A7090",fontSize:13,marginBottom:12}}>Switch tournament phase and lock picks.</p>
            <div style={{display:"flex",gap:9,marginBottom:16}}>
              {["group","bracket"].map(p=><button key={p} onClick={()=>setSt(prev=>({...prev,phase:p}))} style={{padding:"8px 18px",borderRadius:8,fontFamily:"'Teko',sans-serif",letterSpacing:".1em",cursor:"pointer",border:`1px solid ${st.phase===p?"rgba(239,68,68,.5)":"rgba(255,255,255,.09)"}`,background:st.phase===p?"rgba(239,68,68,.14)":"transparent",color:st.phase===p?"#f87171":"#5A7090"}}>{p==="group"?"GROUP STAGE":"KNOCKOUT"}</button>)}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {[["groupLocked","🔒 Lock Group Picks (no more changes)"],["bracketLocked","🔒 Lock Bracket Picks"]].map(([key,label])=>(
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
            <p style={{color:"#5A7090",fontSize:13,marginBottom:12}}>Click teams that advanced from each group. This auto-scores Phase 1 for everyone instantly.</p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:9}}>
              {Object.entries(GROUPS).map(([grp,{teams,flags}])=>{
                const adv=st.groupResults?.[grp]||[];
                return(
                  <div key={grp} style={{background:"#111E2E",borderRadius:9,padding:11,border:"1px solid rgba(255,255,255,.07)"}}>
                    <div style={{fontFamily:"'Teko',sans-serif",color:"#f87171",marginBottom:7,fontSize:13}}>GROUP {grp} <span style={{color:"#5A7090",fontSize:10}}>({adv.length} advanced)</span></div>
                    {teams.map((team,i)=>{const on=adv.includes(team);return(
                      <div key={team} onClick={()=>toggleGroup(grp,team)} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 7px",borderRadius:6,marginBottom:3,cursor:"pointer",background:on?"rgba(239,68,68,.12)":"transparent",border:`1px solid ${on?"rgba(239,68,68,.4)":"rgba(255,255,255,.07)"}`,color:on?"#f87171":"#5A7090",fontSize:12}}>
                        <span>{flags[i]}</span><span style={{flex:1}}>{team}</span>{on&&"✓"}
                      </div>
                    );})}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab==="teams"&&(
          <div>
            <p style={{color:"#5A7090",fontSize:13,marginBottom:10}}>Enter 32 qualified teams in bracket seeding order (pairs: slots 0+1 play each other, 2+3, etc.)</p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(185px,1fr))",gap:5}}>
              {Array.from({length:32},(_,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{color:"#5A7090",fontSize:11,width:18,textAlign:"right"}}>{i+1}</span>
                  <input value={st.bracketTeams[i]||""} onChange={e=>setTeam(i,e.target.value)} placeholder={`Team ${i+1}`} style={{flex:1,background:"#111E2E",border:"1px solid rgba(255,255,255,.09)",borderRadius:6,padding:"5px 8px",color:"#E0E8F0",fontSize:11,outline:"none"}}/>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==="bracket"&&(
          <div>
            <p style={{color:"#5A7090",fontSize:13,marginBottom:12}}>Click the actual winner for each match. This auto-scores Phase 2 for everyone instantly.</p>
            {ROUNDS.map(round=>{
              const{label,matches}=ROUND_META[round];const ri=ROUNDS.indexOf(round);
              return(
                <div key={round} style={{marginBottom:16}}>
                  <div style={{fontFamily:"'Teko',sans-serif",color:"#f87171",fontSize:14,marginBottom:8}}>{label}</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:6}}>
                    {Array.from({length:matches},(_,i)=>{
                      const matchKey=`${round}_${i}`;
                      let t1="?",t2="?";
                      if(round==="R32"){t1=st.bracketTeams[i*2]||`Slot ${i*2+1}`;t2=st.bracketTeams[i*2+1]||`Slot ${i*2+2}`;}
                      else{const prev=ROUNDS[ri-1];t1=st.bracketResults?.[`${prev}_${i*2}`]||"TBD";t2=st.bracketResults?.[`${prev}_${i*2+1}`]||"TBD";}
                      const winner=st.bracketResults?.[matchKey]||"";
                      return(
                        <div key={matchKey} style={{background:"#111E2E",borderRadius:8,padding:9,border:"1px solid rgba(255,255,255,.07)"}}>
                          <div style={{fontSize:10,color:"#5A7090",marginBottom:5}}>Match {i+1}: {t1} vs {t2}</div>
                          <div style={{display:"flex",gap:5}}>
                            {[t1,t2].map(team=>(
                              <button key={team} onClick={()=>setBR(matchKey,team)} style={{flex:1,padding:"5px",borderRadius:6,fontSize:11,cursor:"pointer",border:`1px solid ${winner===team?"rgba(239,68,68,.5)":"rgba(255,255,255,.09)"}`,background:winner===team?"rgba(239,68,68,.15)":"transparent",color:winner===team?"#f87171":"#5A7090"}}>{team}</button>
                            ))}
                            {winner&&<button onClick={()=>setBR(matchKey,"")} style={{padding:"5px 7px",borderRadius:6,border:"1px solid rgba(255,255,255,.09)",background:"transparent",color:"#5A7090",fontSize:10,cursor:"pointer"}}>✕</button>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{display:"flex",justifyContent:"flex-end",gap:9,marginTop:20}}>
          <button onClick={onClose} style={{padding:"8px 18px",borderRadius:9,border:"1px solid rgba(255,255,255,.09)",background:"transparent",color:"#5A7090",fontSize:13,cursor:"pointer"}}>Cancel</button>
          <button onClick={save} disabled={saving} style={{padding:"8px 22px",borderRadius:9,border:"none",background:"#EF4444",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",opacity:saving?0.7:1}}>{saving?"Saving...":"SAVE ALL CHANGES"}</button>
        </div>
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function Main(){
  const [firebaseUser,setFirebaseUser]=useState(undefined);
  const [userData,setUserData]=useState(null);
  const [users,setUsers]=useState({});
  const [tournament,setTournament]=useState(null);
  const [tab,setTab]=useState("picks");
  const [showAdmin,setShowAdmin]=useState(false);
  const [lang,setLang]=useState("en");
  const [toast,setToast]=useState(null);
  const t=TRANSLATIONS[lang];

  useEffect(()=>{
    return onAuthStateChanged(auth,async fu=>{
      if(fu){
        const data=await ensureUserDoc(fu);
        setFirebaseUser(fu);setUserData(data);
      }else{setFirebaseUser(null);setUserData(null);}
    });
  },[]);

  useEffect(()=>{
    if(!firebaseUser)return;
    const u1=subscribeUsers(setUsers);
    const u2=subscribeTournamentState(setTournament);
    return()=>{u1();u2();};
  },[firebaseUser?.uid]);

  const showMsg=(msg,type="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),3000);};

  // Loading
  if(firebaseUser===undefined)return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#060C14"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Teko:wght@400;600;700&family=Outfit:wght@300;400;500;600&display=swap');*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Outfit',sans-serif;}`}</style>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:8}}>🏆</div>
        <div style={{fontFamily:"'Teko',sans-serif",fontSize:18,color:"#D4A843",letterSpacing:3}}>LOADING...</div>
      </div>
    </div>
  );

  if(!firebaseUser)return<LoginScreen lang={lang} setLang={setLang}/>;

  const me=users[firebaseUser.uid]||userData||{};
  const admin=isAdmin(firebaseUser.email);
  const approved=me.approved||admin;

  if(!approved)return<PendingScreen user={firebaseUser} lang={lang} setLang={setLang}/>;

  if(!tournament)return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#060C14"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Teko:wght@400;600;700&family=Outfit:wght@300;400;500;600&display=swap');*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Outfit',sans-serif;}`}</style>
      <div style={{fontFamily:"'Teko',sans-serif",fontSize:18,color:"#D4A843",letterSpacing:3}}>LOADING...</div>
    </div>
  );

  const myScore=calcScore({groupPicks:me.groupPicks||{},bracketPicks:me.bracketPicks||{}},tournament);
  const phase=tournament.phase||"group";
  const tabs=[
    {id:"picks",label:phase==="group"?t.groupPicks:t.bracket},
    {id:"leaderboard",label:t.standings},
    {id:"rules",label:t.rules},
  ];

  return(
    <div style={{minHeight:"100vh",background:"#060C14",fontFamily:"'Outfit',sans-serif",color:"#E0E8F0"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Teko:wght@400;600;700&family=Outfit:wght@300;400;500;600&display=swap');*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}`}</style>

      {/* Header */}
      <div style={{background:"#0C1620",borderBottom:"1px solid rgba(255,255,255,.07)",position:"sticky",top:0,zIndex:200}}>
        <div style={{display:"flex",alignItems:"center",gap:9,padding:"9px 14px"}}>
          <span style={{fontSize:18}}>🏆</span>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Teko',sans-serif",fontSize:8,color:"#5A7090",letterSpacing:".22em"}}>KORBIZ</div>
            <div style={{fontFamily:"'Teko',sans-serif",fontSize:16,color:"#D4A843",lineHeight:1}}>WORLD CUP 2026</div>
          </div>
          <LangSwitcher lang={lang} setLang={setLang}/>
          <div style={{padding:"2px 8px",borderRadius:5,fontSize:10,fontFamily:"'Teko',sans-serif",letterSpacing:".12em",background:phase==="group"?"rgba(59,130,246,.14)":"rgba(212,168,67,.12)",color:phase==="group"?"#60a5fa":"#D4A843",border:`1px solid ${phase==="group"?"rgba(59,130,246,.3)":"rgba(212,168,67,.28)"}`}}>{phase==="group"?t.groupStage:t.knockout}</div>
          <div style={{textAlign:"center",background:"rgba(212,168,67,.1)",border:"1px solid rgba(212,168,67,.26)",borderRadius:7,padding:"3px 10px"}}>
            <div style={{fontFamily:"'Teko',sans-serif",fontSize:17,color:"#D4A843",lineHeight:1}}>{myScore.total}</div>
            <div style={{fontSize:8,color:"#5A7090",letterSpacing:".1em"}}>{t.ptsLabel}</div>
          </div>
          <div style={{padding:"2px 6px",borderRadius:4,fontSize:9,fontWeight:700,background:me.paid?"rgba(34,197,94,.12)":"rgba(239,68,68,.12)",color:me.paid?"#22C55E":"#EF4444",border:`1px solid ${me.paid?"rgba(34,197,94,.3)":"rgba(239,68,68,.3)"}`}}>{me.paid?t.paid:t.unpaid}</div>
          {admin&&<button onClick={()=>setShowAdmin(true)} style={{padding:"4px 10px",borderRadius:6,border:"1px solid rgba(239,68,68,.35)",background:"rgba(239,68,68,.1)",color:"#f87171",fontFamily:"'Teko',sans-serif",letterSpacing:".1em",fontSize:11,cursor:"pointer"}}>{t.admin}</button>}
          <div style={{display:"flex",alignItems:"center",gap:7}}>
            <Avatar name={firebaseUser.displayName} photoURL={firebaseUser.photoURL} size={30}/>
            <button onClick={signOutUser} style={{background:"transparent",border:"1px solid rgba(255,255,255,.1)",borderRadius:6,padding:"3px 9px",color:"#5A7090",fontSize:10,cursor:"pointer"}}>{t.signOut}</button>
          </div>
        </div>
        <div style={{display:"flex",borderTop:"1px solid rgba(255,255,255,.07)",overflowX:"auto"}}>
          {tabs.map(tb=><button key={tb.id} onClick={()=>setTab(tb.id)} style={{padding:"8px 18px",border:"none",background:"transparent",color:tab===tb.id?"#D4A843":"#5A7090",borderBottom:`2px solid ${tab===tb.id?"#D4A843":"transparent"}`,fontFamily:"'Teko',sans-serif",letterSpacing:".12em",fontSize:12,whiteSpace:"nowrap",cursor:"pointer"}}>{tb.label}</button>)}
        </div>
      </div>

      {/* Content */}
      <div style={{maxWidth:1280,margin:"0 auto",padding:"20px 14px"}}>
        {tab==="picks"&&phase==="group"&&<GroupPicks uid={firebaseUser.uid} myPicks={me.groupPicks} tournament={tournament} showToast={showMsg} t={t}/>}
        {tab==="picks"&&phase==="bracket"&&<BracketView uid={firebaseUser.uid} myPicks={me.bracketPicks} tournament={tournament} showToast={showMsg} t={t}/>}
        {tab==="leaderboard"&&<Leaderboard users={users} currentUid={firebaseUser.uid} tournament={tournament} t={t}/>}
        {tab==="rules"&&<HowToPlay lang={lang}/>}
      </div>

      {showAdmin&&admin&&<AdminPanel tournament={tournament} users={users} onClose={()=>setShowAdmin(false)} showToast={showMsg}/>}
      {toast&&<div style={{position:"fixed",bottom:22,left:"50%",transform:"translateX(-50%)",background:toast.type==="error"?"#EF4444":"#D4A843",color:toast.type==="error"?"#fff":"#000",fontWeight:700,padding:"10px 24px",borderRadius:10,fontSize:13,zIndex:9999,boxShadow:"0 8px 40px rgba(0,0,0,.6)",whiteSpace:"nowrap"}}>{toast.msg}</div>}
    </div>
  );
}
