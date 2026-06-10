"use client";
import { useState, useEffect, useRef } from "react";
import {
  auth, db, signInWithGoogle, signOutUser, isAdmin,
  ensureUserDoc, saveGroupPicks, saveBracketPicks,
  setApproved, setPaid, subscribeUsers,
  subscribeTournamentState, saveTournamentState,
} from "../lib/firebase";
import {
  collection, addDoc, onSnapshot, query,
  orderBy, limit, serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { requestNotificationPermission, onForegroundMessage, getTimeRemaining, DEADLINES } from "../lib/notifications";



// ─── TEAM META (FIFA Rank June 2026 + Confederation) ─────────────────────────
const TEAM_META = {
  "Mexico":            {rank:15,  conf:"CONCACAF"},
  "South Africa":      {rank:67,  conf:"CAF"},
  "South Korea":       {rank:22,  conf:"AFC"},
  "Czechia":           {rank:37,  conf:"UEFA"},
  "Canada":            {rank:40,  conf:"CONCACAF"},
  "Bosnia-Herzegovina":{rank:63,  conf:"UEFA"},
  "Qatar":             {rank:58,  conf:"AFC"},
  "Switzerland":       {rank:20,  conf:"UEFA"},
  "Brazil":            {rank:4,   conf:"CONMEBOL"},
  "Morocco":           {rank:13,  conf:"CAF"},
  "Haiti":             {rank:97,  conf:"CONCACAF"},
  "Scotland":          {rank:38,  conf:"UEFA"},
  "United States":     {rank:14,  conf:"CONCACAF"},
  "Paraguay":          {rank:39,  conf:"CONMEBOL"},
  "Australia":         {rank:26,  conf:"AFC"},
  "Türkiye":           {rank:25,  conf:"UEFA"},
  "Germany":           {rank:12,  conf:"UEFA"},
  "Curaçao":           {rank:77,  conf:"CONCACAF"},
  "Ivory Coast":       {rank:48,  conf:"CAF"},
  "Ecuador":           {rank:35,  conf:"CONMEBOL"},
  "Netherlands":       {rank:7,   conf:"UEFA"},
  "Japan":             {rank:16,  conf:"AFC"},
  "Sweden":            {rank:24,  conf:"UEFA"},
  "Tunisia":           {rank:54,  conf:"CAF"},
  "Belgium":           {rank:3,   conf:"UEFA"},
  "Egypt":             {rank:34,  conf:"CAF"},
  "Iran":              {rank:22,  conf:"AFC"},
  "New Zealand":       {rank:91,  conf:"OFC"},
  "Spain":             {rank:1,   conf:"UEFA"},
  "Cape Verde":        {rank:57,  conf:"CAF"},
  "Saudi Arabia":      {rank:59,  conf:"AFC"},
  "Uruguay":           {rank:17,  conf:"CONMEBOL"},
  "France":            {rank:2,   conf:"UEFA"},
  "Senegal":           {rank:18,  conf:"CAF"},
  "Iraq":              {rank:60,  conf:"AFC"},
  "Norway":            {rank:27,  conf:"UEFA"},
  "Argentina":         {rank:5,   conf:"CONMEBOL"},
  "Algeria":           {rank:50,  conf:"CAF"},
  "Austria":           {rank:29,  conf:"UEFA"},
  "Jordan":            {rank:73,  conf:"AFC"},
  "Portugal":          {rank:6,   conf:"UEFA"},
  "Congo DR":          {rank:54,  conf:"CAF"},
  "Uzbekistan":        {rank:70,  conf:"AFC"},
  "Colombia":          {rank:21,  conf:"CONMEBOL"},
  "England":           {rank:8,   conf:"UEFA"},
  "Croatia":           {rank:10,  conf:"UEFA"},
  "Ghana":             {rank:66,  conf:"CAF"},
  "Panama":            {rank:43,  conf:"CONCACAF"},
};

// ─── GROUPS — 나라 이름 4개 언어 ────────────────────────────────────────────
const TEAM_NAMES = {
  en: {
    "Mexico":"Mexico","South Africa":"South Africa","South Korea":"South Korea","Czechia":"Czechia",
    "Canada":"Canada","Bosnia-Herzegovina":"Bosnia-Herzegovina","Qatar":"Qatar","Switzerland":"Switzerland",
    "Brazil":"Brazil","Morocco":"Morocco","Haiti":"Haiti","Scotland":"Scotland",
    "United States":"United States","Paraguay":"Paraguay","Australia":"Australia","Türkiye":"Türkiye",
    "Germany":"Germany","Curaçao":"Curaçao","Ivory Coast":"Ivory Coast","Ecuador":"Ecuador",
    "Netherlands":"Netherlands","Japan":"Japan","Sweden":"Sweden","Tunisia":"Tunisia",
    "Belgium":"Belgium","Egypt":"Egypt","Iran":"Iran","New Zealand":"New Zealand",
    "Spain":"Spain","Cape Verde":"Cape Verde","Saudi Arabia":"Saudi Arabia","Uruguay":"Uruguay",
    "France":"France","Senegal":"Senegal","Iraq":"Iraq","Norway":"Norway",
    "Argentina":"Argentina","Algeria":"Algeria","Austria":"Austria","Jordan":"Jordan",
    "Portugal":"Portugal","Congo DR":"Congo DR","Uzbekistan":"Uzbekistan","Colombia":"Colombia",
    "England":"England","Croatia":"Croatia","Ghana":"Ghana","Panama":"Panama",
  },
  es: {
    "Mexico":"México","South Africa":"Sudáfrica","South Korea":"Corea del Sur","Czechia":"Chequia",
    "Canada":"Canadá","Bosnia-Herzegovina":"Bosnia-Herzegovina","Qatar":"Catar","Switzerland":"Suiza",
    "Brazil":"Brasil","Morocco":"Marruecos","Haiti":"Haití","Scotland":"Escocia",
    "United States":"EE.UU.","Paraguay":"Paraguay","Australia":"Australia","Türkiye":"Turquía",
    "Germany":"Alemania","Curaçao":"Curazao","Ivory Coast":"Costa de Marfil","Ecuador":"Ecuador",
    "Netherlands":"Países Bajos","Japan":"Japón","Sweden":"Suecia","Tunisia":"Túnez",
    "Belgium":"Bélgica","Egypt":"Egipto","Iran":"Irán","New Zealand":"Nueva Zelanda",
    "Spain":"España","Cape Verde":"Cabo Verde","Saudi Arabia":"Arabia Saudita","Uruguay":"Uruguay",
    "France":"Francia","Senegal":"Senegal","Iraq":"Irak","Norway":"Noruega",
    "Argentina":"Argentina","Algeria":"Argelia","Austria":"Austria","Jordan":"Jordania",
    "Portugal":"Portugal","Congo DR":"Congo R.D.","Uzbekistan":"Uzbekistán","Colombia":"Colombia",
    "England":"Inglaterra","Croatia":"Croacia","Ghana":"Ghana","Panama":"Panamá",
  },
  ko: {
    "Mexico":"멕시코","South Africa":"남아프리카공화국","South Korea":"대한민국","Czechia":"체코",
    "Canada":"캐나다","Bosnia-Herzegovina":"보스니아 헤르체고비나","Qatar":"카타르","Switzerland":"스위스",
    "Brazil":"브라질","Morocco":"모로코","Haiti":"아이티","Scotland":"스코틀랜드",
    "United States":"미국","Paraguay":"파라과이","Australia":"호주","Türkiye":"튀르키예",
    "Germany":"독일","Curaçao":"퀴라소","Ivory Coast":"코트디부아르","Ecuador":"에콰도르",
    "Netherlands":"네덜란드","Japan":"일본","Sweden":"스웨덴","Tunisia":"튀니지",
    "Belgium":"벨기에","Egypt":"이집트","Iran":"이란","New Zealand":"뉴질랜드",
    "Spain":"스페인","Cape Verde":"카보베르데","Saudi Arabia":"사우디아라비아","Uruguay":"우루과이",
    "France":"프랑스","Senegal":"세네갈","Iraq":"이라크","Norway":"노르웨이",
    "Argentina":"아르헨티나","Algeria":"알제리","Austria":"오스트리아","Jordan":"요르단",
    "Portugal":"포르투갈","Congo DR":"콩고 민주공화국","Uzbekistan":"우즈베키스탄","Colombia":"콜롬비아",
    "England":"잉글랜드","Croatia":"크로아티아","Ghana":"가나","Panama":"파나마",
  },
};

const GROUPS = {
  A:{teams:["Mexico","South Africa","South Korea","Czechia"],flags:["🇲🇽","🇿🇦","🇰🇷","🇨🇿"]},
  B:{teams:["Canada","Bosnia-Herzegovina","Qatar","Switzerland"],flags:["🇨🇦","🇧🇦","🇶🇦","🇨🇭"]},
  C:{teams:["Brazil","Morocco","Haiti","Scotland"],flags:["🇧🇷","🇲🇦","🇭🇹","🏴󠁧󠁢󠁳󠁣󠁴󠁿"]},
  D:{teams:["United States","Paraguay","Australia","Türkiye"],flags:["🇺🇸","🇵🇾","🇦🇺","🇹🇷"]},
  E:{teams:["Germany","Curaçao","Ivory Coast","Ecuador"],flags:["🇩🇪","🇨🇼","🇨🇮","🇪🇨"]},
  F:{teams:["Netherlands","Japan","Sweden","Tunisia"],flags:["🇳🇱","🇯🇵","🇸🇪","🇹🇳"]},
  G:{teams:["Belgium","Egypt","Iran","New Zealand"],flags:["🇧🇪","🇪🇬","🇮🇷","🇳🇿"]},
  H:{teams:["Spain","Cape Verde","Saudi Arabia","Uruguay"],flags:["🇪🇸","🇨🇻","🇸🇦","🇺🇾"]},
  I:{teams:["France","Senegal","Iraq","Norway"],flags:["🇫🇷","🇸🇳","🇮🇶","🇳🇴"]},
  J:{teams:["Argentina","Algeria","Austria","Jordan"],flags:["🇦🇷","🇩🇿","🇦🇹","🇯🇴"]},
  K:{teams:["Portugal","Congo DR","Uzbekistan","Colombia"],flags:["🇵🇹","🇨🇩","🇺🇿","🇨🇴"]},
  L:{teams:["England","Croatia","Ghana","Panama"],flags:["🏴󠁧󠁢󠁥󠁮󠁧󠁿","🇭🇷","🇬🇭","🇵🇦"]},
};

const ROUNDS = ["R32","R16","QF","SF","F"];
const ROUND_META = {
  R32:{label:{en:"Round of 32",es:"Ronda de 32",mn:"32-н үе",ko:"32강"},pts:5,matches:16},
  R16:{label:{en:"Round of 16",es:"Octavos",mn:"16-н үе",ko:"16강"},pts:10,matches:8},
  QF:{label:{en:"Quarterfinals",es:"Cuartos",mn:"Хоёрдугаар шат",ko:"8강"},pts:15,matches:4},
  SF:{label:{en:"Semifinals",es:"Semifinal",mn:"Хагас шигшээ",ko:"4강"},pts:20,matches:2},
  F:{label:{en:"Final",es:"Final",mn:"Финал",ko:"결승"},pts:30,matches:1},
};

// ─── TRANSLATIONS ─────────────────────────────────────────────────────────────
const T = {
  en:{
    title:"WORLD CUP 2026",subtitle:"BRACKET CHALLENGE",org:"KORBIZ INTERNAL",
    loginBtn:"SIGN IN WITH GOOGLE",signOut:"Sign out",
    groupPicks:"GROUP PICKS",bracket:"BRACKET",standings:"STANDINGS",howToPlay:"HOW TO PLAY",
    savePicks:"SAVE PICKS",saving:"Saving...",
    pts:"PTS",paid:"PAID",unpaid:"UNPAID",admin:"ADMIN",
    groupStage:"GROUP STAGE",knockout:"KNOCKOUT",prizePool:"PRIZE POOL",
    awaiting:"AWAITING APPROVAL",
    awaitingMsg:"Your registration is received. Dave will approve your access once your $30 entry fee is collected.",
    bracketWait:"BRACKET OPENS AFTER GROUP STAGE",
    bracketWaitSub:"32 qualified teams will be seeded once group stage concludes",
    entryFee:"ENTRY FEE",teams:"TEAMS",matches:"MATCHES",prizes:"PRIZES",
    // How to play
    entryPrizes:"ENTRY & PRIZES",
    entryDesc:"Entry fee: $30 cash to Dave Ha. Dave approves access after payment.",
    prizeDesc:"Prize split: 1st 50% · 2nd 30% · 3rd 20%",
    phase1Title:"PHASE 1 — GROUP STAGE",
    phase1Desc:"Pick up to 3 teams per group that you think will advance. +3 pts per correct team.",
    phase1Max:"Max: 12 groups × 3 teams × 3 pts = 108 pts",
    phase1Note:"2026 Format: 48 teams · 12 groups of 4 · Top 2 + best 8 third-place = 32 advance",
    phase2Title:"PHASE 2 — KNOCKOUT BRACKET",
    phase2Desc:"March Madness style — pick the winner of every match. Points increase each round. Bracket opens after group stage.",
    phase2Max:"Max Phase 2: 330 pts",
    keyDates:"KEY DATES",
    groupLock:"Group picks lock: June 12, 2026 (kickoff)",
    bracketLock:"Bracket picks lock: June 27, 2026 midnight ET",
    finalDate:"Final: July 19, 2026 — MetLife Stadium, NJ",
    // Group picks
    phase1Header:"PHASE 1 — GROUP PICKS",
    phase1Sub:"Select up to 3 teams per group",
    perCorrect:"+3 pts per correct qualifier",
    lockedMsg:"Group stage has started — picks are locked",
    // Bracket
    phase2Header:"PHASE 2 — KNOCKOUT BRACKET",
    phase2Sub:"Click teams to pick winners · Points scale up per round",
    // Leaderboard
    pointSystem:"POINT SYSTEM",
    group:"Group",
    // Admin
    adminTitle:"ADMIN PANEL",
    approvals:"APPROVALS",payments:"PAYMENTS",phase:"PHASE",
    group_tab:"GROUP RESULTS",teams_tab:"BRACKET TEAMS",bracket_tab:"BRACKET RESULTS",
    pendingUsers:"PENDING",approvedUsers:"APPROVED",
    approveBtn:"✓ APPROVE + PAID",revokeBtn:"Revoke",
    markPaid:"Mark Paid",unmarkPaid:"Unmark",
    lockGroup:"🔒 Lock Group Picks",lockBracket:"🔒 Lock Bracket Picks",
    saveAll:"SAVE ALL CHANGES",cancel:"Cancel",
    noRegistrations:"No registrations yet",noApproved:"No approved users",
    approveDesc:"Approve participants after collecting $30. Approved users get instant full access.",
    bracketTeamDesc:"Enter 32 qualified teams in bracket seeding order (pairs play each other).",
    bracketResultDesc:"Click actual winner for each match. This auto-scores Phase 2 instantly.",
    advanced:"advanced",match:"Match",
    you:"you",
  },
  es:{
    title:"MUNDIAL 2026",subtitle:"DESAFÍO DE BRACKET",org:"KORBIZ INTERNO",
    loginBtn:"INICIAR CON GOOGLE",signOut:"Cerrar sesión",
    groupPicks:"GRUPOS",bracket:"BRACKET",standings:"CLASIFICACIÓN",howToPlay:"CÓMO JUGAR",
    savePicks:"GUARDAR",saving:"Guardando...",
    pts:"PTS",paid:"PAGADO",unpaid:"PENDIENTE",admin:"ADMIN",
    groupStage:"GRUPOS",knockout:"KNOCKOUT",prizePool:"PREMIOS",
    awaiting:"ESPERANDO APROBACIÓN",
    awaitingMsg:"Registro recibido. Dave aprobará tu acceso cuando reciba tu cuota de $30.",
    bracketWait:"BRACKET ABRE DESPUÉS DE GRUPOS",
    bracketWaitSub:"32 equipos clasificados serán sembrados al concluir la fase de grupos",
    entryFee:"CUOTA",teams:"EQUIPOS",matches:"PARTIDOS",prizes:"PREMIOS",
    entryPrizes:"CUOTA Y PREMIOS",
    entryDesc:"Cuota: $30 en efectivo a Dave Ha. Dave aprueba el acceso tras el pago.",
    prizeDesc:"Distribución: 1ro 50% · 2do 30% · 3ro 20%",
    phase1Title:"FASE 1 — GRUPOS",
    phase1Desc:"Elige hasta 3 equipos por grupo que creas que avanzarán. +3 pts por equipo correcto.",
    phase1Max:"Máx: 12 grupos × 3 × 3 = 108 pts",
    phase1Note:"Formato 2026: 48 equipos · 12 grupos de 4 · Top 2 + mejores 8 terceros = 32 avanzan",
    phase2Title:"FASE 2 — BRACKET",
    phase2Desc:"Estilo March Madness — elige al ganador de cada partido. Los puntos aumentan por ronda.",
    phase2Max:"Máx Fase 2: 330 pts",
    keyDates:"FECHAS CLAVE",
    groupLock:"Picks cierran: 12 jun 2026",
    bracketLock:"Bracket picks cierran: 27 jun 2026 medianoche ET",
    finalDate:"Final: 19 jul 2026 — MetLife Stadium, NJ",
    phase1Header:"FASE 1 — PICKS DE GRUPO",
    phase1Sub:"Selecciona hasta 3 equipos por grupo",
    perCorrect:"+3 pts por clasificado correcto",
    lockedMsg:"La fase de grupos ha comenzado — los picks están bloqueados",
    phase2Header:"FASE 2 — BRACKET ELIMINATORIO",
    phase2Sub:"Haz clic en equipos para elegir ganadores",
    pointSystem:"SISTEMA DE PUNTOS",
    group:"Grupo",
    adminTitle:"PANEL ADMIN",
    approvals:"APROBACIONES",payments:"PAGOS",phase:"FASE",
    group_tab:"RESULTADOS GRUPOS",teams_tab:"EQUIPOS BRACKET",bracket_tab:"RESULTADOS BRACKET",
    pendingUsers:"PENDIENTES",approvedUsers:"APROBADOS",
    approveBtn:"✓ APROBAR + PAGADO",revokeBtn:"Revocar",
    markPaid:"Marcar Pagado",unmarkPaid:"Desmarcar",
    lockGroup:"🔒 Bloquear Picks de Grupo",lockBracket:"🔒 Bloquear Picks de Bracket",
    saveAll:"GUARDAR CAMBIOS",cancel:"Cancelar",
    noRegistrations:"Sin registros",noApproved:"Sin usuarios aprobados",
    approveDesc:"Aprueba participantes después de cobrar $30.",
    bracketTeamDesc:"Ingresa 32 equipos clasificados en orden de siembra.",
    bracketResultDesc:"Haz clic en el ganador real de cada partido.",
    advanced:"clasificó",match:"Partido",
    you:"tú",
  },
  ko:{
    title:"2026 월드컵",subtitle:"브래킷 챌린지",org:"KORBIZ 내부",
    loginBtn:"구글로 로그인",signOut:"로그아웃",
    groupPicks:"조별 픽",bracket:"브래킷",standings:"순위표",howToPlay:"게임 방법",
    savePicks:"저장하기",saving:"저장 중...",
    pts:"점",paid:"납부완료",unpaid:"미납",admin:"관리자",
    groupStage:"조별리그",knockout:"녹아웃",prizePool:"상금 풀",
    awaiting:"승인 대기 중",
    awaitingMsg:"등록이 접수됐습니다. Dave가 $30 참가비 수령 후 승인해 드립니다.",
    bracketWait:"브래킷은 조별리그 종료 후 공개됩니다",
    bracketWaitSub:"조별리그가 끝나면 32개 진출팀이 배정됩니다",
    entryFee:"참가비",teams:"팀",matches:"경기",prizes:"상금",
    entryPrizes:"참가비 & 상금",
    entryDesc:"참가비: Dave Ha에게 현금 $30. 수령 후 Dave가 접근 권한을 부여합니다.",
    prizeDesc:"상금 배분: 1위 50% · 2위 30% · 3위 20%",
    phase1Title:"1단계 — 조별리그",
    phase1Desc:"각 조에서 최대 3팀을 선택하세요. 정답 팀당 +3점.",
    phase1Max:"최대: 12조 × 3팀 × 3점 = 108점",
    phase1Note:"2026 포맷: 48팀 · 12개조 4팀씩 · 각 조 상위 2팀 + 3위 중 상위 8팀 = 32팀 진출",
    phase2Title:"2단계 — 녹아웃 브래킷",
    phase2Desc:"March Madness 방식 — 모든 경기의 승자를 선택. 라운드마다 점수 증가.",
    phase2Max:"2단계 최대: 330점",
    keyDates:"주요 일정",
    groupLock:"조별 픽 마감: 2026년 6월 12일 (킥오프)",
    bracketLock:"브래킷 픽 마감: 2026년 6월 27일 자정 (ET)",
    finalDate:"결승: 2026년 7월 19일 — MetLife Stadium, NJ",
    phase1Header:"1단계 — 조별 픽",
    phase1Sub:"각 조에서 최대 3팀 선택",
    perCorrect:"정답 팀당 +3점",
    lockedMsg:"조별리그가 시작되어 픽이 잠겼습니다",
    phase2Header:"2단계 — 녹아웃 브래킷",
    phase2Sub:"팀을 클릭해서 승자 선택 · 라운드마다 점수 증가",
    pointSystem:"점수 체계",
    group:"조",
    adminTitle:"관리자 패널",
    approvals:"승인 관리",payments:"납부 관리",phase:"단계",
    group_tab:"조별 결과",teams_tab:"브래킷 팀 배정",bracket_tab:"브래킷 결과",
    pendingUsers:"대기 중",approvedUsers:"승인됨",
    approveBtn:"✓ 승인 + 납부확인",revokeBtn:"취소",
    markPaid:"납부 확인",unmarkPaid:"납부 취소",
    lockGroup:"🔒 조별 픽 잠금",lockBracket:"🔒 브래킷 픽 잠금",
    saveAll:"모든 변경사항 저장",cancel:"취소",
    noRegistrations:"등록된 참가자가 없습니다",noApproved:"승인된 참가자가 없습니다",
    approveDesc:"$30 참가비 수령 후 참가자를 승인하세요. 즉시 전체 접근 권한이 부여됩니다.",
    bracketTeamDesc:"32개 진출팀을 브래킷 시드 순서로 입력 (짝수 번호끼리 대결).",
    bracketResultDesc:"각 경기의 실제 승자를 클릭하면 즉시 점수가 반영됩니다.",
    advanced:"진출",match:"경기",
    you:"나",
  },
};

function tn(team, lang) { return TEAM_NAMES[lang]?.[team] || team; }
function calcScore(picks={}, tournament={}) {
  let total=0, breakdown=[];
  const gr = tournament.groupResults||{};
  Object.entries(picks.groupPicks||{}).forEach(([grp,picked])=>{
    (picked||[]).forEach(t=>{
      if((gr[grp]||[]).includes(t)){total+=3;breakdown.push({l:`${grp}: ${t}`,p:3});}
    });
  });
  const br = tournament.bracketResults||{};
  Object.entries(picks.bracketPicks||{}).forEach(([key,winner])=>{
    if(br[key]&&br[key]===winner){
      const pts=ROUND_META[key.split("_")[0]]?.pts??5;
      total+=pts;breakdown.push({l:key,p:pts});
    }
  });
  return {total,breakdown};
}

function Avatar({name,photoURL,size=36}){
  const ini=(name||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  const pal=[["#D4A843","#7a5c10"],["#3B82F6","#1e40af"],["#22C55E","#166534"],["#EF4444","#991b1b"],["#8B5CF6","#5b21b6"],["#F59E0B","#92400e"]];
  const c=pal[(name||"x").charCodeAt(0)%pal.length];
  if(photoURL) return <img src={photoURL} referrerPolicy="no-referrer" style={{width:size,height:size,borderRadius:"50%",display:"block"}} alt=""/>;
  return <div style={{width:size,height:size,borderRadius:"50%",background:`linear-gradient(135deg,${c[0]},${c[1]})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.38,fontWeight:700,color:"#fff",flexShrink:0}}>{ini}</div>;
}




// ─── LIVE CHAT ────────────────────────────────────────────────────────────────
function LiveChat({currentUser, lang}){
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(()=>{
    const q = query(collection(db,"chat"), orderBy("ts","asc"), limit(60));
    const unsub = onSnapshot(q, snap=>{
      setMessages(snap.docs.map(d=>({id:d.id,...d.data()})));
    });
    return unsub;
  },[]);

  useEffect(()=>{
    if(bottomRef.current) bottomRef.current.scrollIntoView({behavior:"smooth"});
  },[messages]);

  const send = async() => {
    if(!input.trim()||sending) return;
    setSending(true);
    try {
      await addDoc(collection(db,"chat"),{
        uid: currentUser.uid,
        name: (currentUser.displayName||"?").split(" ")[0],
        photo: currentUser.photoURL||null,
        text: input.trim().slice(0,200),
        ts: serverTimestamp(),
      });
      setInput("");
    } catch(e){}
    setSending(false);
  };

  const handleKey = (e) => { if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); send(); } };

  const fmtTime = (ts) => {
    if(!ts) return "";
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",hour12:false,timeZone:"America/New_York"})+" ET";
    } catch(e){ return ""; }
  };

  const lbl = lang==="ko"?"라이브 채팅":lang==="es"?"CHAT EN VIVO":"LIVE CHAT";
  const ph = lang==="ko"?"메시지 입력... (Enter)":"Type a message... (Enter)";

  return(
    <div style={{background:"#0C1620",border:"1px solid rgba(255,255,255,.08)",borderRadius:14,overflow:"hidden",marginTop:12}}>
      <div style={{padding:"10px 16px",borderBottom:"0.5px solid rgba(255,255,255,.07)",display:"flex",alignItems:"center",gap:8}}>
        <div style={{width:7,height:7,borderRadius:"50%",background:"#22C55E",flexShrink:0}}/>
        <span style={{fontFamily:"'Teko',sans-serif",fontSize:15,color:"#D4A843",letterSpacing:".1em"}}>{lbl}</span>
        <span style={{fontSize:11,color:"#5A7090",marginLeft:"auto"}}>{messages.length} msg</span>
      </div>
      <div style={{height:200,overflowY:"auto",padding:"10px 14px",display:"flex",flexDirection:"column",gap:6}}>
        {messages.length===0&&(
          <div style={{textAlign:"center",color:"#5A7090",fontSize:12,marginTop:56}}>
            {lang==="ko"?"첫 메시지를 남겨보세요 🎉":"Be the first to say something 🎉"}
          </div>
        )}
        {messages.map(m=>{
          const isMe = m.uid===currentUser.uid;
          return(
            <div key={m.id} style={{display:"flex",gap:7,alignItems:"flex-start",flexDirection:isMe?"row-reverse":"row"}}>
              <div style={{width:24,height:24,borderRadius:"50%",flexShrink:0,overflow:"hidden",background:"#1a2840",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#9CA3AF"}}>
                {m.photo
                  ? <img src={m.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} onError={function(e){e.target.style.display="none";}}/>
                  : (m.name||"?")[0]}
              </div>
              <div style={{maxWidth:"70%"}}>
                {!isMe&&<div style={{fontSize:10,color:"#5A7090",marginBottom:2}}>{m.name}</div>}
                <div style={{background:isMe?"rgba(212,168,67,.15)":"rgba(255,255,255,.06)",border:isMe?"1px solid rgba(212,168,67,.3)":"0.5px solid rgba(255,255,255,.08)",borderRadius:isMe?"12px 4px 12px 12px":"4px 12px 12px 12px",padding:"6px 10px",fontSize:12,color:"#E0E8F0",wordBreak:"break-word",lineHeight:1.4}}>
                  {m.text}
                </div>
                <div style={{fontSize:10,color:"#5A7090",marginTop:2,textAlign:isMe?"right":"left"}}>{fmtTime(m.ts)}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef}/>
      </div>
      <div style={{padding:"8px 12px",borderTop:"0.5px solid rgba(255,255,255,.07)",display:"flex",gap:8,alignItems:"center"}}>
        <input value={input} onChange={function(e){setInput(e.target.value);}} onKeyDown={handleKey} placeholder={ph} maxLength={200}
          style={{flex:1,background:"rgba(255,255,255,.06)",border:"0.5px solid rgba(255,255,255,.1)",borderRadius:20,padding:"7px 14px",fontSize:12,color:"#E0E8F0",outline:"none"}}/>
        <button onClick={send} disabled={!input.trim()||sending}
          style={{background:input.trim()?"rgba(212,168,67,.9)":"rgba(255,255,255,.08)",border:"none",borderRadius:"50%",width:32,height:32,cursor:input.trim()?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill={input.trim()?"#000":"#5A7090"}><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
        </button>
      </div>
    </div>
  );
}

// ─── PRIZE DASHBOARD ──────────────────────────────────────────────────────────
function PrizeDashboard({users, lang}){
  const approved = Object.values(users).filter(u=>u.approved&&u.paid);
  const pool = approved.length * 30;
  const p1 = Math.floor(pool*0.5);
  const p2 = Math.floor(pool*0.3);
  const p3 = Math.floor(pool*0.2);
  const label = lang==="ko" ? "총 상금 풀" : lang==="es" ? "PREMIO TOTAL" : "PRIZE POOL";
  const sub = lang==="ko" ? "명 납부 × $30" : lang==="es" ? "pagados × $30" : "paid × $30";
  const empty = lang==="ko" ? "참가비 납부 후 업데이트됩니다" : lang==="es" ? "Se actualiza con los pagos" : "Updates as participants pay";
  const places = [
    {icon:"🥇", lbl: lang==="ko"?"1위":lang==="es"?"1er":"1st", amt:p1, pct:"50%", color:"#D4A843"},
    {icon:"🥈", lbl: lang==="ko"?"2위":lang==="es"?"2do":"2nd", amt:p2, pct:"30%", color:"#9CA3AF"},
    {icon:"🥉", lbl: lang==="ko"?"3위":lang==="es"?"3ro":"3rd", amt:p3, pct:"20%", color:"#CD7C2F"},
  ];
  return(
    <div style={{background:"linear-gradient(135deg,rgba(212,168,67,.1),rgba(212,168,67,.04))",border:"1px solid rgba(212,168,67,.3)",borderRadius:14,padding:"14px 16px",marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontFamily:"'Teko',sans-serif",fontSize:10,color:"#5A7090",letterSpacing:".18em",marginBottom:1}}>{label}</div>
          <div style={{fontFamily:"'Teko',sans-serif",fontSize:40,color:"#D4A843",lineHeight:1}}>{"$"+pool}</div>
          <div style={{fontSize:11,color:"#5A7090",marginTop:1}}>{approved.length} {sub}</div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {places.map(({icon,lbl,amt,pct,color})=>(
            <div key={lbl} style={{textAlign:"center",background:"rgba(0,0,0,.25)",borderRadius:10,padding:"10px 14px",minWidth:76,border:"1px solid "+color+"44"}}>
              <div style={{fontSize:20,marginBottom:3}}>{icon}</div>
              <div style={{fontFamily:"'Teko',sans-serif",fontSize:22,color,lineHeight:1}}>{"$"+amt}</div>
              <div style={{fontSize:10,color:"#5A7090",marginTop:1}}>{pct}</div>
              <div style={{fontSize:10,color:"#9CA3AF"}}>{lbl}</div>
            </div>
          ))}
        </div>
      </div>
      {pool===0&&<div style={{fontSize:11,color:"#5A7090",textAlign:"center",marginTop:8}}>{empty}</div>}
    </div>
  );
}


// ─── PRIZE DASHBOARD ──────────────────────────────────────────────────────────

// ─── NEXT MATCH COUNTDOWN ─────────────────────────────────────────────────────
const WC_MATCHES = [
  {date:"2026-06-11T17:00:00-04:00",teams:"Mexico vs South Africa",group:"A"},
  {date:"2026-06-11T20:00:00-04:00",teams:"USA vs Panama",group:"D"},
  {date:"2026-06-12T14:00:00-04:00",teams:"Brazil vs Morocco",group:"C"},
  {date:"2026-06-12T17:00:00-04:00",teams:"Spain vs Cape Verde",group:"H"},
  {date:"2026-06-13T14:00:00-04:00",teams:"France vs Senegal",group:"I"},
  {date:"2026-06-13T17:00:00-04:00",teams:"Argentina vs Algeria",group:"J"},
  {date:"2026-06-14T14:00:00-04:00",teams:"Germany vs Curaçao",group:"E"},
  {date:"2026-06-14T17:00:00-04:00",teams:"England vs Croatia",group:"L"},
  {date:"2026-06-28T12:00:00-04:00",teams:"Round of 32 begins",group:"R32"},
];

function NextMatchBanner({lang}){
  const [timeLeft,setTimeLeft]=useState("");
  const [next,setNext]=useState(null);
  useEffect(()=>{
    const findNext=()=>{
      const now=Date.now();
      const m=WC_MATCHES.find(x=>new Date(x.date).getTime()>now);
      setNext(m||null);
    };
    findNext();
    const iv=setInterval(()=>{
      if(!next)return;
      const ms=new Date(next.date).getTime()-Date.now();
      if(ms<=0){findNext();return;}
      const d=Math.floor(ms/86400000),h=Math.floor((ms%86400000)/3600000),m=Math.floor((ms%3600000)/60000),s=Math.floor((ms%60000)/1000);
      setTimeLeft(d>0?d+"d "+h+"h "+m+"m":h>0?h+"h "+m+"m "+s+"s":m+"m "+s+"s");
    },1000);
    return()=>clearInterval(iv);
  },[next?.date]);
  if(!next||!timeLeft)return null;
  const lbl=lang==="ko"?"다음 경기":lang==="es"?"Próximo partido":"Next match";
  return(
    <div style={{background:"rgba(59,130,246,.08)",border:"1px solid rgba(59,130,246,.2)",borderRadius:10,padding:"8px 14px",marginBottom:10,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
      <span style={{fontSize:16}}>⚽</span>
      <div style={{flex:1}}>
        <div style={{fontSize:10,color:"#5A7090",letterSpacing:".1em"}}>{lbl} · Group {next.group}</div>
        <div style={{fontSize:13,color:"#E0E8F0",fontWeight:600}}>{next.teams}</div>
      </div>
      <div style={{fontFamily:"'Teko',sans-serif",fontSize:20,color:"#60a5fa",lineHeight:1}}>{timeLeft}</div>
    </div>
  );
}


// ─── PICK STATS ───────────────────────────────────────────────────────────────
function PickStats({users,tournament,lang}){
  const locked=tournament.groupLocked;
  if(!locked)return(
    <div style={{textAlign:"center",padding:"60px 20px",color:"#5A7090"}}>
      <div style={{fontSize:32,marginBottom:8}}>🔒</div>
      <div style={{fontSize:14}}>{lang==="ko"?"조별 픽 마감 후 통계가 공개됩니다":lang==="es"?"Las estadísticas se revelarán después del cierre":"Stats revealed after group picks deadline"}</div>
    </div>
  );
  const approved=Object.values(users).filter(u=>u.approved);
  const total=approved.length;
  if(total===0)return null;
  return(
    <div>
      <div style={{fontFamily:"'Teko',sans-serif",fontSize:22,color:"#D4A843",marginBottom:14}}>
        {lang==="ko"?"픽 통계":lang==="es"?"ESTADÍSTICAS":"PICK STATS"}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:10}}>
        {Object.entries(GROUPS).map(([grp,{teams,flags}])=>(
          <div key={grp} style={{background:"#0C1620",border:"1px solid rgba(255,255,255,.07)",borderRadius:12,padding:14}}>
            <div style={{fontFamily:"'Teko',sans-serif",fontSize:14,color:"#D4A843",letterSpacing:".12em",marginBottom:10}}>
              {lang==="ko"?"조":lang==="es"?"GRUPO":"GROUP"} {grp}
            </div>
            {teams.map((team,i)=>{
              const cnt=approved.filter(u=>(u.groupPicks?.[grp]||[]).includes(team)).length;
              const pct=total>0?Math.round(cnt/total*100):0;
              return(
                <div key={team} style={{marginBottom:7}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                    <span style={{fontSize:12,color:"#E0E8F0"}}>{flags[i]} {tn(team,lang)}</span>
                    <span style={{fontSize:11,color:"#D4A843",fontWeight:700}}>{cnt}/{total} ({pct}%)</span>
                  </div>
                  <div style={{height:5,background:"rgba(255,255,255,.07)",borderRadius:3,overflow:"hidden"}}>
                    <div style={{height:"100%",width:pct+"%",background:pct>=50?"#D4A843":"rgba(212,168,67,.4)",borderRadius:3}}/>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}


// ─── PICKS MODAL ──────────────────────────────────────────────────────────────
function PicksModal({user,tournament,lang,onClose}){
  const gr=tournament.groupResults||{};
  const picks=user.groupPicks||{};
  const totalPickedRaw=Object.values(picks).reduce((a,b)=>a+b.length,0);
  const totalPicked=Math.min(totalPickedRaw,32);
  const correct=Object.entries(picks).reduce((acc,[grp,teams])=>acc+teams.filter(t=>(gr[grp]||[]).includes(t)).length,0);
  const hasResults=Object.keys(gr).length>0;
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:998,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)",padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#0C1620",border:"1px solid rgba(255,255,255,.12)",borderRadius:18,padding:"20px 18px",maxWidth:560,width:"100%",maxHeight:"85vh",overflowY:"auto"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
          <Avatar name={user.name} photoURL={user.photoURL} size={40}/>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Teko',sans-serif",fontSize:20,color:"#fff",lineHeight:1}}>{user.name}</div>
            <div style={{fontSize:11,color:"#5A7090",marginTop:2}}>{user.email}</div>
          </div>
          <div style={{textAlign:"center",background:"rgba(212,168,67,.1)",border:"1px solid rgba(212,168,67,.25)",borderRadius:8,padding:"4px 12px"}}>
            <div style={{fontFamily:"'Teko',sans-serif",fontSize:22,color:"#D4A843",lineHeight:1}}>{user.totalScore||0}</div>
            <div style={{fontSize:9,color:"#5A7090"}}>PTS</div>
          </div>
          <button onClick={onClose} style={{background:"transparent",border:"none",color:"#5A7090",fontSize:20,cursor:"pointer",padding:"0 4px"}}>✕</button>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
          <div style={{background:"rgba(255,255,255,.05)",borderRadius:8,padding:"6px 12px",fontSize:12,color:"#9CA3AF"}}>
            {lang==="ko"?"선택팀":"Picked"}: <span style={{color:"#D4A843",fontWeight:700}}>{totalPicked}/32</span>
            {totalPickedRaw>32&&<span style={{fontSize:10,color:"#5A7090",marginLeft:4}}>(이전 데이터)</span>}
          </div>
          {hasResults&&<div style={{background:"rgba(34,197,94,.08)",border:"1px solid rgba(34,197,94,.2)",borderRadius:8,padding:"6px 12px",fontSize:12,color:"#22C55E"}}>
            {lang==="ko"?"정답":"Correct"}: <span style={{fontWeight:700}}>{correct}</span> (+{correct*3} pts)
          </div>}
        </div>
        {totalPicked===0?(
          <div style={{textAlign:"center",color:"#5A7090",padding:"40px 0",fontSize:14}}>
            {lang==="ko"?"아직 픽하지 않았습니다":"No picks submitted yet"}
          </div>
        ):(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))",gap:10}}>
            {Object.entries(GROUPS).map(([grp,{teams,flags}])=>{
              const myPicks=picks[grp]||[];
              if(myPicks.length===0)return null;
              const adv=gr[grp]||[];
              const hasRes=adv.length>0;
              return(
                <div key={grp} style={{background:"#111E2E",borderRadius:11,padding:12,border:"1px solid rgba(255,255,255,.07)"}}>
                  <div style={{fontFamily:"'Teko',sans-serif",fontSize:13,color:"#D4A843",letterSpacing:".12em",marginBottom:8}}>
                    {lang==="ko"?"조":"GROUP"} {grp}
                  </div>
                  {myPicks.map(team=>{
                    const i=teams.indexOf(team);
                    const flag=i>=0?flags[i]:"🏳";
                    const isCorrect=hasRes&&adv.includes(team);
                    const isWrong=hasRes&&!adv.includes(team);
                    return(
                      <div key={team} style={{display:"flex",alignItems:"center",gap:7,padding:"5px 8px",borderRadius:7,marginBottom:3,background:isCorrect?"rgba(34,197,94,.1)":isWrong?"rgba(239,68,68,.08)":"rgba(255,255,255,.04)",border:"1px solid "+(isCorrect?"rgba(34,197,94,.3)":isWrong?"rgba(239,68,68,.25)":"rgba(255,255,255,.08)")}}>
                        <span style={{fontSize:14}}>{flag}</span>
                        <span style={{flex:1,fontSize:12,color:isCorrect?"#22C55E":isWrong?"#EF4444":"#E0E8F0"}}>{tn(team,lang)}</span>
                        {isCorrect&&<span style={{fontSize:11}}>✅ +3</span>}
                        {isWrong&&<span style={{fontSize:11}}>❌</span>}
                        {!hasRes&&<span style={{fontSize:10,color:"#5A7090"}}>✓</span>}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({users, tournament, currentUid, currentUser, lang}){
  const MAX_PTS = 438;
  const gr = tournament.groupResults || {};

  // 유저별 점수 계산 + 정렬
  const ranked = Object.values(users)
    .filter(u => u.approved && u.paid)
    .map(u => {
      const s = calcScore({groupPicks: u.groupPicks||{}, bracketPicks: u.bracketPicks||{}}, tournament);
      return {...u, total: s.total};
    })
    .sort((a,b) => b.total - a.total);

  const me = ranked.find(u => u.uid === currentUid);
  const myRank = ranked.findIndex(u => u.uid === currentUid) + 1;
  const leader = ranked[0];
  const pool = ranked.length * 30;

  // 최근 결과 (groupResults에서 추출)
  const recentResults = Object.entries(gr).slice(0,4);

  const lbl = (ko, es, en) => lang==="ko"?ko:lang==="es"?es:en;

  return (
    <div style={{paddingBottom:24}}>

      {/* 상단 3카드 */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:12}}>

        {/* Prize Pool */}
        <div style={{background:"#0C1620",border:"1px solid rgba(212,168,67,.25)",borderRadius:14,padding:"14px 16px"}}>
          <div style={{fontSize:10,color:"#5A7090",letterSpacing:".12em",marginBottom:4}}>{lbl("총 상금","PREMIO","PRIZE POOL")}</div>
          <div style={{fontFamily:"'Teko',sans-serif",fontSize:34,color:"#D4A843",lineHeight:1}}>{"$"+pool}</div>
          <div style={{fontSize:11,color:"#5A7090",marginBottom:10}}>{ranked.length} {lbl("명 × $30","× $30","paid × $30")}</div>
          <div style={{display:"flex",gap:6}}>
            {[["🥇","$"+Math.floor(pool*.5),"50%"],["🥈","$"+Math.floor(pool*.3),"30%"],["🥉","$"+Math.floor(pool*.2),"20%"]].map(([icon,amt,pct])=>(
              <div key={pct} style={{flex:1,textAlign:"center",background:"rgba(255,255,255,.04)",borderRadius:8,padding:"6px 2px",border:"0.5px solid rgba(255,255,255,.07)"}}>
                <div style={{fontSize:13,marginBottom:2}}>{icon}</div>
                <div style={{fontFamily:"'Teko',sans-serif",fontSize:14,color:"#D4A843",lineHeight:1}}>{amt}</div>
                <div style={{fontSize:10,color:"#5A7090"}}>{pct}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 내 순위 */}
        <div style={{background:"#0C1620",border:"1px solid rgba(255,255,255,.08)",borderRadius:14,padding:"14px 16px"}}>
          <div style={{fontSize:10,color:"#5A7090",letterSpacing:".12em",marginBottom:4}}>{lbl("내 순위","MI LUGAR","MY RANK")}</div>
          {me ? (()=>{
            // 정확도 계산
            const grpDone = Object.keys(gr).length;
            const myGroupPicks = me.groupPicks||{};
            let myCorrect=0, myTotal=0;
            Object.entries(myGroupPicks).forEach(([grp,teams])=>{
              const adv=gr[grp]||[];
              if(adv.length>0){ myTotal+=teams.length; myCorrect+=teams.filter(t=>adv.includes(t)).length; }
            });
            const accuracy = myTotal>0 ? Math.round(myCorrect/myTotal*100) : null;
            // 전체 평균 정확도
            const allAccuracies = ranked.map(u=>{
              let c=0,t=0;
              Object.entries(u.groupPicks||{}).forEach(([grp,teams])=>{
                const adv=gr[grp]||[];
                if(adv.length>0){ t+=teams.length; c+=teams.filter(tm=>adv.includes(tm)).length; }
              });
              return t>0?c/t:null;
            }).filter(v=>v!==null);
            const avgAcc = allAccuracies.length>0 ? Math.round(allAccuracies.reduce((a,b)=>a+b,0)/allAccuracies.length*100) : null;
            const accDiff = accuracy!==null&&avgAcc!==null ? accuracy-avgAcc : null;
            return(
              <>
                <div style={{fontFamily:"'Teko',sans-serif",fontSize:52,color:"#fff",lineHeight:1}}>{"#"+myRank}</div>
                <div style={{fontSize:12,color:"#5A7090",marginTop:2}}>{me.total} pts · {me.name?.split(" ")[0]}</div>
                <div style={{marginTop:6,display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                  <div style={{fontSize:11,padding:"2px 10px",borderRadius:20,background:"rgba(255,255,255,.06)",color:"#5A7090"}}>
                    {myRank===1
                      ? lbl("🏆 선두!","🏆 Líder!","🏆 Leading!")
                      : (leader.total - me.total)+" pts behind"}
                  </div>
                  {accuracy!==null&&(
                    <div style={{fontSize:11,padding:"2px 10px",borderRadius:20,background:accDiff>0?"rgba(34,197,94,.1)":"rgba(255,255,255,.06)",border:accDiff>0?"0.5px solid rgba(34,197,94,.3)":"none",color:accDiff>0?"#22C55E":"#9CA3AF"}}>
                      🎯 {accuracy}%{accDiff!==null&&accDiff!==0?(accDiff>0?" ↑"+accDiff+"% avg":" ↓"+Math.abs(accDiff)+"% avg"):""}
                    </div>
                  )}
                </div>
              </>
            );
          })() : (
            <div style={{fontSize:13,color:"#5A7090",marginTop:8}}>{lbl("승인 대기 중","Pendiente","Pending approval")}</div>
          )}
        </div>

        {/* 카운트다운 */}
        <NextMatchCard lang={lang}/>
      </div>

      {/* 데드라인 + 미완료 배너 */}
      {!tournament.groupLocked&&(()=>{
        const pickedCount = Object.values(users).filter(u=>u.approved&&u.paid&&Object.values(u.groupPicks||{}).reduce((a,b)=>a+b.length,0)>0).length;
        const totalPaid = Object.values(users).filter(u=>u.approved&&u.paid).length;
        const notPicked = totalPaid - pickedCount;
        return(
          <div style={{marginBottom:10,display:"flex",flexDirection:"column",gap:6}}>
            <div style={{background:"rgba(220,38,38,.08)",border:"1px solid rgba(220,38,38,.2)",borderRadius:10,padding:"8px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <span style={{fontSize:10,color:"#f87171",letterSpacing:".1em",marginRight:8}}>⏰ {lang==="ko"?"조별 픽 마감":"GROUP PICKS DEADLINE"}</span>
                <span style={{fontSize:12,color:"#fca5a5",fontWeight:500}}>June 12, 2026 · Kickoff ET</span>
              </div>
              <span style={{fontSize:11,color:"#f87171"}}>{lang==="ko"?"마감 전 저장 필수!":"Save before kickoff!"}</span>
            </div>
            {notPicked>0&&(
              <div style={{background:"rgba(245,158,11,.06)",border:"1px solid rgba(245,158,11,.2)",borderRadius:10,padding:"7px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:11,color:"#F59E0B"}}>
                  📋 {pickedCount}/{totalPaid} {lang==="ko"?"명 픽 완료":"picks submitted"}
                </span>
                <span style={{fontSize:11,color:"#F59E0B",fontWeight:500}}>
                  {notPicked}{lang==="ko"?"명 아직 안 함 ⚠️":" yet to pick ⚠️"}
                </span>
              </div>
            )}
            {notPicked===0&&totalPaid>0&&(
              <div style={{background:"rgba(34,197,94,.06)",border:"1px solid rgba(34,197,94,.2)",borderRadius:10,padding:"7px 14px",textAlign:"center"}}>
                <span style={{fontSize:11,color:"#22C55E"}}>✅ {lang==="ko"?"전원 픽 완료!":"All "+totalPaid+" participants have submitted picks!"}</span>
              </div>
            )}
          </div>
        );
      })()}

      {/* 가젯 2개 */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
        <HotPickWidget users={users} tournament={tournament} lang={lang}/>
        <WinProbWidget users={users} tournament={tournament} currentUid={currentUid} lang={lang}/>
      </div>

      {/* 스프린트 레이스 */}
      <SprintRace ranked={ranked} currentUid={currentUid} maxPts={MAX_PTS} lang={lang} users={users} tournament={tournament}/>

      {/* 32강 대진표 */}
      <BracketPreview users={users} tournament={tournament} currentUid={currentUid} lang={lang}/>

      {/* 라이브 채팅 */}
      <LiveChat currentUser={currentUser} lang={lang}/>

      {/* 최근 결과 */}
      {recentResults.length > 0 && (
        <div style={{background:"#0C1620",border:"1px solid rgba(255,255,255,.08)",borderRadius:14,padding:"14px 16px",marginTop:12}}>
          <div style={{fontFamily:"'Teko',sans-serif",fontSize:16,color:"#D4A843",letterSpacing:".1em",marginBottom:10}}>
            {lbl("최근 결과","RESULTADOS","RECENT RESULTS")}
          </div>
          <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
            {recentResults.map(([grp, teams])=>(
              <div key={grp} style={{flexShrink:0,border:"0.5px solid rgba(255,255,255,.08)",borderRadius:10,padding:"10px 12px",minWidth:130}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div style={{fontSize:10,color:"#5A7090",letterSpacing:".08em"}}>GROUP {grp}</div>
                  <a href={"https://www.youtube.com/results?search_query=FIFA+World+Cup+2026+Group+"+grp+"+highlights"} target="_blank" rel="noopener noreferrer"
                    style={{display:"flex",alignItems:"center",gap:3,fontSize:10,color:"#f87171",textDecoration:"none",padding:"2px 7px",borderRadius:10,background:"rgba(248,113,113,.1)"}}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="#f87171"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.8 15.5V8.5l6.3 3.5-6.3 3.5z"/></svg>
                    HL
                  </a>
                </div>
                {(teams||[]).map(team=>(
                  <div key={team} style={{fontSize:12,color:"#22C55E",marginBottom:2}}>✓ {team}</div>
                ))}
              </div>
            ))}
          </div>
          <div style={{marginTop:10,textAlign:"right"}}>
            <a href="https://www.youtube.com/@FIFAWorldCup/videos" target="_blank" rel="noopener noreferrer"
              style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11,color:"#f87171",textDecoration:"none",padding:"3px 10px",borderRadius:20,border:"0.5px solid rgba(248,113,113,.3)"}}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="#f87171"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.8 15.5V8.5l6.3 3.5-6.3 3.5z"/></svg>
              FIFA Official Channel
            </a>
          </div>
        </div>
      )}

    </div>
  );
}



// ─── HOT PICK WIDGET ──────────────────────────────────────────────────────────
function HotPickWidget({users, tournament, lang}){
  const approved = Object.values(users).filter(u=>u.approved);
  const total = approved.length || 1;
  const gr = tournament.groupResults || {};
  const phase = tournament.phase || "group";
  const isBracket = phase !== "group";

  // phase에 따라 groupPicks 또는 bracketPicks 집계
  const counts = {};
  approved.forEach(u => {
    if(isBracket) {
      // 브래킷: 각 라운드별 픽 집계
      Object.entries(u.bracketPicks||{}).forEach(([round, matches]) => {
        (matches||[]).forEach(team => {
          if(team) counts[team] = (counts[team]||0) + 1;
        });
      });
    } else {
      // 조별: groupPicks 집계
      Object.entries(u.groupPicks||{}).forEach(([grp, teams]) => {
        (teams||[]).forEach(team => {
          counts[team] = (counts[team]||0) + 1;
        });
      });
    }
  });

  const top5 = Object.entries(counts)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,5);

  const lbl = isBracket
    ? (lang==="ko"?"인기 우승 픽":lang==="es"?"FAVORITOS":"TOP PICKS")
    : (lang==="ko"?"핫픽":lang==="es"?"HOT PICK":"HOT PICK");
  const sublbl = isBracket
    ? (lang==="ko"?"브래킷 픽 기준":"by bracket picks")
    : (lang==="ko"?"픽 횟수 기준":"by pick count");

  return(
    <div style={{background:"#0C1620",border:"1px solid rgba(255,255,255,.08)",borderRadius:14,padding:"14px 16px",height:"100%"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontFamily:"'Teko',sans-serif",fontSize:15,color:"#D4A843",letterSpacing:".1em"}}>🔥 {lbl}</div>
        <div style={{fontSize:10,color:"#5A7090"}}>{sublbl}</div>
      </div>
      {top5.length===0 ? (
        <div style={{fontSize:12,color:"#5A7090",textAlign:"center",padding:"20px 0"}}>
          {lang==="ko"?"아직 픽 없음":"No picks yet"}
        </div>
      ) : top5.map(([team,cnt], i)=>{
        const pct = Math.round(cnt/total*100);
        const adv = Object.values(gr).some(teams=>(teams||[]).includes(team));
        const colors = ["#D4A843","#9CA3AF","#CD7C2F","#60a5fa","#a78bfa"];
        const color = colors[i] || "#5A7090";
        return(
          <div key={team} style={{marginBottom:i<4?8:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:11,color:"#5A7090",width:14}}>{i+1}</span>
                <span style={{fontSize:12,color:"#E0E8F0",fontWeight:500}}>{team}</span>
                {adv&&<span style={{fontSize:10,color:"#22C55E"}}>✓</span>}
              </div>
              <span style={{fontSize:11,color:color,fontWeight:500}}>{pct}%</span>
            </div>
            <div style={{height:4,background:"rgba(255,255,255,.06)",borderRadius:2,overflow:"hidden"}}>
              <div style={{height:"100%",width:pct+"%",background:color,borderRadius:2,opacity:.7}}/>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── WIN PROBABILITY WIDGET ────────────────────────────────────────────────────
function WinProbWidget({users, tournament, currentUid, lang}){
  const [prob, setProb] = useState(null);
  const [trend, setTrend] = useState(null); // 'up' | 'down' | null

  useEffect(()=>{
    const approved = Object.values(users).filter(u=>u.approved&&u.paid);
    if(approved.length < 2){ setProb(100); return; }

    // 현재 점수
    const scores = approved.map(u=>({
      uid: u.uid,
      pts: calcScore({groupPicks:u.groupPicks||{},bracketPicks:u.bracketPicks||{}}, tournament).total,
    }));

    // 남은 잠재 점수 계산
    const grpDone = Object.keys(tournament.groupResults||{}).length;
    const grpLeft = 12 - grpDone;
    // 평균 그룹당 픽 수 기반 남은 기대점수 범위
    const grpMax = grpLeft * 3 * 3; // 최대 남은 그룹 점수
    const bktMax = tournament.groupLocked ? 330 : 0; // 브래킷 점수

    // Monte Carlo 시뮬레이션 (3000회)
    const SIMS = 3000;
    let myWins = 0;
    const me = scores.find(s=>s.uid===currentUid);
    if(!me){ setProb(0); return; }

    for(let i=0; i<SIMS; i++){
      // 각 유저에게 랜덤 잔여점수 부여 (0 ~ 각자 최대)
      const simScores = scores.map(s=>{
        const remaining = Math.random() * (grpMax + bktMax);
        return s.pts + remaining;
      });
      const myIdx = scores.findIndex(s=>s.uid===currentUid);
      const myFinal = simScores[myIdx];
      const iWin = simScores.every((v,i)=> i===myIdx || v<=myFinal);
      if(iWin) myWins++;
    }

    const newProb = Math.round(myWins/SIMS*100);
    setProb(prev => {
      if(prev !== null) setTrend(newProb > prev ? 'up' : newProb < prev ? 'down' : null);
      return newProb;
    });
  }, [users, tournament]);

  const lbl = lang==="ko"?"우승 확률":lang==="es"?"Mi probabilidad":"Win probability";
  const color = prob===null ? "#5A7090" : prob>=60?"#22C55E":prob>=30?"#D4A843":"#EF4444";

  // 확률 게이지 아크 계산
  const r=54, cx=70, cy=70;
  const startAngle = 180;
  const endAngle = 180 + (prob||0)*1.8;
  const toRad = d => d*Math.PI/180;
  const arcX = (a) => cx + r*Math.cos(toRad(a));
  const arcY = (a) => cy + r*Math.sin(toRad(a));
  const largeSweep = (endAngle-startAngle)>180?1:0;

  return(
    <div style={{background:"#0C1620",border:"1px solid rgba(255,255,255,.08)",borderRadius:14,padding:"14px 16px",height:"100%"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{fontFamily:"'Teko',sans-serif",fontSize:15,color:"#D4A843",letterSpacing:".1em"}}>🎯 {lbl.toUpperCase()}</div>
        {trend&&<span style={{fontSize:12,color:trend==="up"?"#22C55E":"#EF4444"}}>{trend==="up"?"↑":"↓"}</span>}
      </div>

      <div style={{display:"flex",alignItems:"center",gap:12}}>
        {/* 반원 게이지 */}
        <svg width={140} height={80} viewBox="0 0 140 80">
          {/* 배경 아크 */}
          <path
            d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`}
            fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={10} strokeLinecap="round"
          />
          {/* 값 아크 */}
          {prob!==null&&prob>0&&<path
            d={`M ${arcX(startAngle)} ${arcY(startAngle)} A ${r} ${r} 0 ${largeSweep} 1 ${arcX(endAngle)} ${arcY(endAngle)}`}
            fill="none" stroke={color} strokeWidth={10} strokeLinecap="round"
          />}
          {/* 확률 텍스트 */}
          <text x={cx} y={cy+4} textAnchor="middle" fill={color}
            style={{fontFamily:"'Teko',sans-serif",fontSize:26,fontWeight:700}}>
            {prob===null?"...":prob+"%"}
          </text>
        </svg>

        {/* 설명 */}
        <div style={{flex:1}}>
          <div style={{fontSize:11,color:"#5A7090",lineHeight:1.5,marginBottom:6}}>
            {lang==="ko"
              ? "현재 점수 + 남은 경기 시뮬레이션 3,000회 기반"
              : lang==="es"
              ? "Basado en 3,000 simulaciones"
              : "Based on 3,000 simulations of remaining matches"}
          </div>
          <div style={{fontSize:11,color:color,fontWeight:500}}>
            {prob===null?"계산 중...":
             prob>=70?(lang==="ko"?"🔥 매우 유리!":"🔥 Strong favorite!"):
             prob>=40?(lang==="ko"?"💪 경쟁 중":"💪 In contention"):
             prob>=15?(lang==="ko"?"⚡ 역전 가능":"⚡ Still possible"):
             (lang==="ko"?"😤 기적이 필요해":"😤 Need a miracle")}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── NEXT MATCH CARD (dashboard용) ───────────────────────────────────────────
function NextMatchCard({lang}){
  const WC = [
    {date:"2026-06-11T17:00:00-04:00",teams:"Mexico vs South Africa",group:"A"},
    {date:"2026-06-11T20:00:00-04:00",teams:"USA vs Panama",group:"D"},
    {date:"2026-06-12T14:00:00-04:00",teams:"Brazil vs Morocco",group:"C"},
    {date:"2026-06-12T17:00:00-04:00",teams:"Spain vs Cape Verde",group:"H"},
    {date:"2026-06-13T14:00:00-04:00",teams:"France vs Senegal",group:"I"},
    {date:"2026-06-13T17:00:00-04:00",teams:"Argentina vs Algeria",group:"J"},
    {date:"2026-06-14T14:00:00-04:00",teams:"Germany vs Curaçao",group:"E"},
    {date:"2026-06-14T17:00:00-04:00",teams:"England vs Croatia",group:"L"},
    {date:"2026-06-28T12:00:00-04:00",teams:"Round of 32 begins",group:"R32"},
  ];
  const [tl, setTl] = useState({d:0,h:0,m:0,s:0});
  const [next, setNext] = useState(null);

  useEffect(()=>{
    const findNext = () => {
      const now = Date.now();
      const m = WC.find(x => new Date(x.date).getTime() > now);
      setNext(m || null);
      return m;
    };
    let cur = findNext();
    const iv = setInterval(()=>{
      if(!cur){ cur = findNext(); return; }
      const ms = new Date(cur.date).getTime() - Date.now();
      if(ms <= 0){ cur = findNext(); return; }
      setTl({
        d: Math.floor(ms/86400000),
        h: Math.floor((ms%86400000)/3600000),
        m: Math.floor((ms%3600000)/60000),
        s: Math.floor((ms%60000)/1000),
      });
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  const lbl = lang==="ko"?"다음 경기":lang==="es"?"Próximo partido":"Next match";

  return(
    <div style={{background:"#0C1620",border:"1px solid rgba(255,255,255,.08)",borderRadius:14,padding:"14px 16px"}}>
      <div style={{fontSize:10,color:"#5A7090",letterSpacing:".12em",marginBottom:6}}>{lbl.toUpperCase()}</div>
      {next ? (
        <>
          <div style={{fontSize:13,fontWeight:500,color:"#E0E8F0",marginBottom:10}}>
            ⚽ {next.teams}
            <span style={{fontSize:10,color:"#5A7090",marginLeft:6}}>Group {next.group}</span>
          </div>
          <div style={{display:"flex",gap:6}}>
            {[["d","day"],["h","hr"],["m","min"],["s","sec"]].map(([k,lbl])=>(
              <div key={k} style={{flex:1,textAlign:"center",background:"rgba(255,255,255,.05)",borderRadius:8,padding:"6px 2px",border:"0.5px solid rgba(255,255,255,.07)"}}>
                <div style={{fontFamily:"'Teko',sans-serif",fontSize:22,color:"#60a5fa",lineHeight:1}}>{tl[k]}</div>
                <div style={{fontSize:10,color:"#5A7090"}}>{lbl}</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{fontSize:13,color:"#5A7090"}}>
          {lang==="ko"?"일정 없음":lang==="es"?"Sin partido":"No upcoming matches"}
        </div>
      )}
    </div>
  );
}

// ─── SPRINT RACE ──────────────────────────────────────────────────────────────
function SprintRace({ranked, currentUid, maxPts, lang, users, tournament}){
  const [animated, setAnimated] = useState(false);
  const [winProbs, setWinProbs] = useState({});

  useEffect(()=>{ const t = setTimeout(()=>setAnimated(true), 100); return ()=>clearTimeout(t); }, []);

  // 전체 우승 확률 계산 (1500회 빠른 시뮬)
  useEffect(()=>{
    if(!ranked||ranked.length<2) return;
    const SIMS=1500;
    const grpDone=Object.keys(tournament.groupResults||{}).length;
    const grpLeft=12-grpDone;
    const remaining=(grpLeft*9)+(tournament.groupLocked?330:0);
    const probs={};
    ranked.forEach(u=>{ probs[u.uid]=0; });
    for(let i=0;i<SIMS;i++){
      let best=-1, bestUid=null;
      ranked.forEach(u=>{
        const sim=u.total+Math.random()*remaining;
        if(sim>best){ best=sim; bestUid=u.uid; }
      });
      if(bestUid) probs[bestUid]=(probs[bestUid]||0)+1;
    }
    const result={};
    ranked.forEach(u=>{ result[u.uid]=Math.round((probs[u.uid]||0)/SIMS*100); });
    setWinProbs(result);
  },[ranked.map(r=>r.total).join(','), Object.keys(tournament.groupResults||{}).length]);

  if(ranked.length === 0) return null;
  const topScore = Math.max(...ranked.map(r=>r.total), 1);

  return(
    <div style={{background:"#0C1620",border:"1px solid rgba(255,255,255,.08)",borderRadius:14,padding:"16px 16px 8px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontFamily:"'Teko',sans-serif",fontSize:16,color:"#D4A843",letterSpacing:".1em"}}>
          {lang==="ko"?"순위 레이스":lang==="es"?"CARRERA":"LEADERBOARD RACE"}
        </div>
        <div style={{fontSize:11,color:"#5A7090"}}>max {maxPts} pts</div>
      </div>

      {ranked.map((u, i) => {
        const isMe = u.uid === currentUid;
        const pct = topScore > 0 ? (u.total / topScore) * 88 : 0;
        const finalPct = animated ? pct : 0;
        const medals = ["🥇","🥈","🥉"];

        return(
          <div key={u.uid} style={{display:"flex",alignItems:"center",gap:7,marginBottom:7}}>
            {/* 순위 */}
            <div style={{width:22,textAlign:"right",fontSize:i<3?14:11,color:"#5A7090",flexShrink:0}}>
              {i<3 ? medals[i] : "#"+(i+1)}
            </div>

            {/* 트랙 */}
            <div style={{flex:1,position:"relative",height:28}}>
              {/* 트랙 배경 */}
              <div style={{position:"absolute",inset:0,background:"rgba(255,255,255,.04)",borderRadius:18,border:"0.5px solid rgba(255,255,255,.06)"}}/>

              {/* 달리는 바 */}
              <div style={{
                position:"absolute",top:0,left:0,height:"100%",
width: finalPct + "%",
minWidth: 32,
borderRadius:16,
                background: isMe
                  ? "linear-gradient(90deg,rgba(212,168,67,.25),rgba(212,168,67,.1))"
                  : "rgba(255,255,255,.06)",
                border: isMe ? "1px solid rgba(212,168,67,.4)" : "0.5px solid rgba(255,255,255,.08)",
                transition: animated ? "width 1.2s cubic-bezier(.34,1.2,.64,1)" : "none",
                display:"flex",alignItems:"center",justifyContent:"flex-end",
                paddingRight:0,
                overflow:"visible",
              }}>
                {/* 프로필 사진 원 */}
                <div style={{
                  position:"absolute",right:-14,top:"50%",transform:"translateY(-50%)",
width:28,height:28,borderRadius:"50%",
                  border: isMe ? "2px solid #D4A843" : "1.5px solid rgba(255,255,255,.2)",
                  overflow:"hidden",flexShrink:0,
                  background:"#1a2840",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  boxShadow: isMe ? "0 0 0 3px rgba(212,168,67,.2)" : "none",
                  zIndex:2,
                }}>
                  {u.photoURL ? (
                    <img src={u.photoURL} alt={u.name} style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>{e.target.style.display="none";}}/>
                  ) : (
                    <span style={{fontSize:12,fontWeight:500,color:isMe?"#D4A843":"#9CA3AF"}}>
                      {(u.name||"?").split(" ").map(w=>w[0]).join("").slice(0,2)}
                    </span>
                  )}
                </div>
              </div>

              {/* 이름 (바 안에) */}
              <div style={{
                position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",
                fontSize:11,color:isMe?"#D4A843":"#6b7280",fontWeight:isMe?500:400,
                pointerEvents:"none",whiteSpace:"nowrap",
              }}>
                {u.name?.split(" ")[0]}
              </div>
            </div>

            {/* 점수 + 확률 */}
            <div style={{width:64,textAlign:"right",flexShrink:0}}>
              <div style={{fontSize:12,fontWeight:500,color:isMe?"#D4A843":"#9CA3AF"}}>{u.total}</div>
              <div style={{fontSize:10,color:winProbs[u.uid]>=30?"#22C55E":winProbs[u.uid]>=10?"#D4A843":"#5A7090"}}>
                {winProbs[u.uid]!==undefined ? winProbs[u.uid]+"%" : ""}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}


// ─── R32 BRACKET PREVIEW ──────────────────────────────────────────────────────
// 2026 FIFA 공식 32강 대진표 (ESPN/FIFA 공식 발표 기준)
// 3위 와일드카드는 어느 조 조합에서 나왔냐에 따라 배정이 결정됨
const R32_FIXED = [
  // 확정 매치업 (1위vs2위, 2위vs2위)
  {m:"M73", a:"A2", b:"B2", date:"Jun 28"},
  {m:"M74", a:"C1", b:"F2", date:"Jun 29"},
  {m:"M75", a:"F1", b:"C2", date:"Jun 29"},
  {m:"M76", a:"E2", b:"I2", date:"Jun 30"},
  {m:"M77", a:"J1", b:"H2", date:"Jul 1"},
  {m:"M78", a:"H1", b:"G2", date:"Jul 1"},
  {m:"M79", a:"B1", b:"D2", date:"Jul 2"},
  {m:"M80", a:"D1", b:"C2_ALT", date:"Jul 2"},  // ESPN: D1 vs third
  {m:"M81", a:"G1", b:"WC_AEHIJrd", date:"Jul 1"},
  {m:"M82", a:"I1", b:"WC_CDFGHrd", date:"Jun 30"},
  {m:"M83", a:"A1", b:"WC_CEFHIrd", date:"Jun 30"},
  {m:"M84", a:"L1", b:"WC_EHIJKrd", date:"Jul 1"},
  {m:"M85", a:"E1", b:"WC_ABCDFrd", date:"Jun 29"},
  {m:"M86", a:"K1", b:"WC_DEIJLrd", date:"Jul 1"},
  {m:"M87", a:"L2", b:"K2",  date:"Jul 2"},
  {m:"M88", a:"J2", b:"WC_last", date:"Jul 2"},
];

// 실제 공식 대진 (1위/2위 확정된 것만, 3위는 별도 처리)
const R32_MATCHUPS_OFFICIAL = [
  ["A2","B2"],   // M73
  ["C1","F2"],   // M74
  ["E1","WC"],   // M75 - E1 vs 3위(A/B/C/D/F)
  ["F1","C2"],   // M76
  ["E2","I2"],   // M77
  ["I1","WC"],   // M78 - I1 vs 3위(C/D/F/G/H)
  ["A1","WC"],   // M79 - A1 vs 3위(C/E/F/H/I)
  ["L1","WC"],   // M80 - L1 vs 3위(E/H/I/J/K)
  ["G1","WC"],   // M81 - G1 vs 3위(A/E/H/I/J)
  ["D1","WC"],   // M82 - D1 vs 3위(B/E/F/I/J)
  ["J1","H2"],   // M83
  ["K1","WC"],   // M84 - K1 vs 3위(D/E/I/J/L)
  ["B1","D2"],   // M85 (추정, ESPN 기준)
  ["H1","G2"],   // M86
  ["L2","K2"],   // M87
  ["J2","WC"],   // M88 - J2 vs 나머지 3위
];

// 3위팀 출처 정보 (각 와일드카드 슬롯별 허용 조 목록)
const WC_SLOTS = [
  {slot:"WC1", groups:["A","B","C","D","F"]},  // E1 상대
  {slot:"WC2", groups:["C","D","F","G","H"]},  // I1 상대
  {slot:"WC3", groups:["C","E","F","H","I"]},  // A1 상대
  {slot:"WC4", groups:["E","H","I","J","K"]},  // L1 상대
  {slot:"WC5", groups:["A","E","H","I","J"]},  // G1 상대
  {slot:"WC6", groups:["B","E","F","I","J"]},  // D1 상대
  {slot:"WC7", groups:["D","E","I","J","L"]},  // K1 상대
  {slot:"WC8", groups:["A","B","C","D","E","F","G","H","I","J","K","L"]}, // J2 상대
];

function BracketPreview({users, tournament, currentUid, lang}){
  const gr = tournament.groupResults||{};
  const doneCount = Object.keys(gr).length;
  const hasResults = doneCount >= 12;

  // 내 픽 팀 목록
  const me = Object.values(users).find(u=>u.uid===currentUid);
  const myPicks = new Set();
  Object.values(me?.groupPicks||{}).forEach(function(teams){ (teams||[]).forEach(function(t){myPicks.add(t);}); });

  // 조 1위/2위 결정
  const st = {};
  const third = []; // 3위팀 [팀명, 조] 목록
  Object.entries(GROUPS).forEach(function(e){
    var grp=e[0], info=e[1];
    var advanced = gr[grp]||[];
    if(advanced.length>=1) st[grp+"1"]=advanced[0];
    if(advanced.length>=2) st[grp+"2"]=advanced[1];
    if(advanced.length>=3) third.push({team:advanced[2],grp:grp});
  });

  // 라벨 헬퍼
  const srcLabel = function(src){
    if(src==="WC") return "3rd";
    if(src.length===2) return src[0]+"조 "+src[1]+"위";
    return src;
  };

  const TeamSlot = function({src, isWC}){
    var team = st[src];
    var isMe = team&&myPicks.has(team);
    var label = team || (isWC?"3위 와일드카드":src);
    return(
      <div style={{padding:"5px 10px",background:isMe?"rgba(212,168,67,.12)":"transparent",display:"flex",alignItems:"center",gap:5}}>
        {isMe&&<span style={{fontSize:9}}>⭐</span>}
        <span style={{fontSize:11,color:isMe?"#D4A843":team?"#E0E8F0":"#5A7090",flex:1,lineHeight:1.2}}>
          {label}
        </span>
        <span style={{fontSize:9,color:"#3A5070",flexShrink:0,letterSpacing:".04em"}}>
          {src.length<=2&&!isWC?(src[0]+"조"+(src[1]==="1"?"1위":"2위")):"WC"}
        </span>
      </div>
    );
  };

  return(
    <div style={{background:"#0C1620",border:"1px solid rgba(255,255,255,.08)",borderRadius:14,padding:"14px 16px",marginTop:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontFamily:"'Teko',sans-serif",fontSize:15,color:"#D4A843",letterSpacing:".1em"}}>
          ⚔️ {lang==="ko"?"32강 대진표":"ROUND OF 32"}
          <span style={{fontSize:10,color:"#5A7090",marginLeft:8,fontFamily:"sans-serif",letterSpacing:"normal",fontWeight:400}}>
            {lang==="ko"?"내 픽 ⭐":"your picks ⭐"}
          </span>
        </div>
        {!hasResults&&(
          <span style={{fontSize:11,color:"#5A7090"}}>{doneCount}/12 {lang==="ko"?"조 완료":"groups"}</span>
        )}
      </div>

      {!hasResults&&doneCount===0&&(
        <div style={{textAlign:"center",color:"#5A7090",fontSize:12,padding:"20px 0"}}>
          {lang==="ko"?"조별 결과가 모두 확정되면 공개됩니다":"Revealed after all 12 group results are confirmed"}
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:6}}>
        {R32_MATCHUPS_OFFICIAL.map(function(pair,i){
          var srcA=pair[0], srcB=pair[1];
          var teamA=st[srcA], teamB=srcB==="WC"?null:st[srcB];
          var aMe=teamA&&myPicks.has(teamA);
          var bMe=teamB&&myPicks.has(teamB);
          var matchLabel = "M"+(73+i);

          return(
            <div key={i} style={{background:"rgba(255,255,255,.03)",border:"0.5px solid "+(aMe||bMe?"rgba(212,168,67,.25)":"rgba(255,255,255,.07)"),borderRadius:8,overflow:"hidden"}}>
              <div style={{fontSize:9,color:"#5A7090",padding:"3px 10px",borderBottom:"0.5px solid rgba(255,255,255,.05)",letterSpacing:".08em"}}>{matchLabel}</div>
              {[{src:srcA,team:teamA,isMe:aMe},{src:srcB,team:teamB,isMe:bMe}].map(function(slot,j){
                var isWC = slot.src==="WC";
                return(
                  <div key={j} style={{padding:"5px 10px",background:slot.isMe?"rgba(212,168,67,.12)":"transparent",borderBottom:j===0?"0.5px solid rgba(255,255,255,.05)":"none",display:"flex",alignItems:"center",gap:5}}>
                    {slot.isMe&&<span style={{fontSize:9}}>⭐</span>}
                    <span style={{fontSize:11,color:slot.isMe?"#D4A843":slot.team?"#E0E8F0":"#5A7090",flex:1}}>
                      {slot.team||(isWC?"3위 WC":slot.src)}
                    </span>
                    <span style={{fontSize:9,color:"#3A5070",flexShrink:0}}>
                      {isWC?"WC":(slot.src.length===2?(slot.src[0]+"조"+(slot.src[1]==="1"?"1위":"2위")):slot.src)}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {hasResults&&third.length>0&&(
        <div style={{marginTop:10,padding:"8px 10px",background:"rgba(96,165,250,.06)",border:"0.5px solid rgba(96,165,250,.2)",borderRadius:8}}>
          <div style={{fontSize:10,color:"#60a5fa",marginBottom:5,letterSpacing:".08em"}}>3위 와일드카드 ({third.length}/8)</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
            {third.map(function(w){
              var isMe=myPicks.has(w.team);
              return(
                <span key={w.team} style={{fontSize:11,padding:"2px 8px",borderRadius:12,background:isMe?"rgba(212,168,67,.15)":"rgba(255,255,255,.06)",color:isMe?"#D4A843":"#9CA3AF",border:isMe?"0.5px solid rgba(212,168,67,.3)":"none"}}>
                  {isMe?"⭐ ":""}{w.team} ({w.grp}조 3위)
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── COUNTDOWN BANNER ─────────────────────────────────────────────────────────
function CountdownBanner({ lang, phase, uid }) {
  const [groupTime, setGroupTime] = useState(null);
  const [bracketTime, setBracketTime] = useState(null);
  const [notifGranted, setNotifGranted] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);

  useEffect(() => {
    // 알림 권한 상태 확인
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifGranted(Notification.permission === "granted");
    }
    // 카운트다운 업데이트
    const update = () => {
      setGroupTime(getTimeRemaining("group", lang));
      setBracketTime(getTimeRemaining("bracket", lang));
    };
    update();
    const iv = setInterval(update, 60000); // 1분마다 갱신
    return () => clearInterval(iv);
  }, [lang]);

  const handleNotif = async () => {
    setNotifLoading(true);
    const granted = await requestNotificationPermission(uid, lang);
    setNotifGranted(granted);
    setNotifLoading(false);
  };

  const NOTIF_LABELS = {
    en: { allow: "🔔 Get Reminders", enabled: "🔔 Reminders On", loading: "Setting up..." },
    es: { allow: "🔔 Recordatorios", enabled: "🔔 Activados", loading: "Configurando..." },
    ko: { allow: "🔔 알림 받기", enabled: "🔔 알림 켜짐", loading: "설정 중..." },
  };
  const nl = NOTIF_LABELS[lang] || NOTIF_LABELS.en;

  // 표시할 마감: 조별 안 지났으면 조별, 지났으면 브래킷
  const activeTime = groupTime && !groupTime.expired ? groupTime : bracketTime;
  const activeKey = groupTime && !groupTime.expired ? "group" : "bracket";
  const DEADLINE_LABELS = {
    group: { en: "Group Picks Deadline", es: "Vence Picks de Grupo", mn: "Бүлгийн Сонголт Дуусна", ko: "조별 픽 마감" },
    bracket: { en: "Bracket Picks Deadline", es: "Vence Picks de Bracket", mn: "Bracket Сонголт Дуусна", ko: "브래킷 픽 마감" },
  };

  if (!activeTime || activeTime.expired) return null;

  return (
    <div style={{
      background: activeTime.urgent ? "rgba(239,68,68,.12)" : "rgba(212,168,67,.08)",
      border: `1px solid ${activeTime.urgent ? "rgba(239,68,68,.35)" : "rgba(212,168,67,.25)"}`,
      borderRadius: 10, padding: "10px 14px", marginBottom: 14,
      display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: activeTime.urgent ? "#f87171" : "#D4A843", fontWeight: 600, marginBottom: 2 }}>
          {activeTime.urgent ? "🚨" : "⏰"} {DEADLINE_LABELS[activeKey][lang] || DEADLINE_LABELS[activeKey].en}
        </div>
        <div style={{
          fontFamily: "'Teko',sans-serif", fontSize: 20,
          color: activeTime.urgent ? "#EF4444" : "#D4A843", lineHeight: 1,
        }}>{activeTime.text}</div>
      </div>
      {!notifGranted && typeof window !== "undefined" && "Notification" in window && Notification.permission !== "denied" && (
        <button onClick={handleNotif} disabled={notifLoading} style={{
          padding: "6px 13px", borderRadius: 8,
          border: "1px solid rgba(212,168,67,.4)",
          background: "rgba(212,168,67,.1)", color: "#D4A843",
          fontSize: 12, fontWeight: 600, cursor: "pointer",
          opacity: notifLoading ? 0.7 : 1, whiteSpace: "nowrap",
        }}>
          {notifLoading ? nl.loading : nl.allow}
        </button>
      )}
      {notifGranted && (
        <div style={{ fontSize: 11, color: "#22C55E", whiteSpace: "nowrap" }}>{nl.enabled}</div>
      )}
    </div>
  );
}

function LangSwitcher({lang,setLang}){
  return <div style={{display:"flex",gap:4}}>{[["en","EN"],["es","ES"],["ko","KO"]].map(([k,l])=><button key={k} onClick={()=>setLang(k)} style={{padding:"3px 8px",borderRadius:6,border:`1px solid ${lang===k?"#D4A843":"rgba(255,255,255,.14)"}`,background:lang===k?"rgba(212,168,67,.15)":"transparent",color:lang===k?"#D4A843":"#6b7280",fontSize:11,fontWeight:600,cursor:"pointer"}}>{l}</button>)}</div>;
}

// ─── HOW TO PLAY ───────────────────────────────────────────────────────────────
function HowToPlay({lang}){
  const t=T[lang];
  const S=({icon,title,accent,children})=>(
    <div style={{background:"#0C1620",border:"1px solid rgba(255,255,255,.07)",borderRadius:14,padding:"15px 17px",marginBottom:10,borderLeft:`3px solid ${accent}`}}>
      <div style={{fontFamily:"'Teko',sans-serif",fontSize:16,color:"#fff",letterSpacing:".1em",marginBottom:8}}>{icon} {title}</div>
      {children}
    </div>
  );
  return(
    <div style={{maxWidth:660,margin:"0 auto"}}>
      <S icon="💵" title={t.entryPrizes} accent="#22C55E">
        <p style={{fontSize:13,color:"#D1D5DB",lineHeight:1.8}}>{t.entryDesc}</p>
        <p style={{fontSize:13,color:"#D4A843",marginTop:4}}>{t.prizeDesc}</p>
      </S>
      <S icon="📋" title={t.phase1Title} accent="#3B82F6">
        <p style={{fontSize:13,color:"#D1D5DB",lineHeight:1.8,marginBottom:8}}>{t.phase1Desc}</p>
        <p style={{fontSize:12,color:"#5A7090",marginBottom:8}}>{t.phase1Max}</p>
        <div style={{background:"rgba(59,130,246,.08)",border:"1px solid rgba(59,130,246,.2)",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#9CA3AF"}}>📌 {t.phase1Note}</div>
      </S>
      <S icon="🏆" title={t.phase2Title} accent="#D4A843">
        <p style={{fontSize:13,color:"#D1D5DB",lineHeight:1.8,marginBottom:10}}>{t.phase2Desc}</p>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
          {Object.entries(ROUND_META).map(([r,{label,pts}])=>(
            <div key={r} style={{background:"rgba(212,168,67,.1)",border:"1px solid rgba(212,168,67,.25)",borderRadius:8,padding:"6px 10px",textAlign:"center"}}>
              <div style={{fontFamily:"'Teko',sans-serif",fontSize:19,color:"#D4A843",lineHeight:1}}>+{pts}</div>
              <div style={{fontSize:10,color:"#9CA3AF",marginTop:1}}>{label[lang]}</div>
            </div>
          ))}
        </div>
        <p style={{fontSize:12,color:"#5A7090"}}>{t.phase2Max}</p>
      </S>
      <S icon="📅" title={t.keyDates} accent="#8B5CF6">
        <div style={{fontSize:13,color:"#D1D5DB",lineHeight:2.2}}>
          <div>🔒 {t.groupLock}</div>
          <div>🏆 {t.bracketLock}</div>
          <div>🏆 {t.finalDate}</div>
        </div>
      </S>
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen({lang,setLang}){
  const t=T[lang];
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState("");
  const [showRules,setShowRules]=useState(false);
  const handle=async()=>{setLoading(true);setErr("");try{await signInWithGoogle();}catch(e){setErr("Login failed — please try again");setLoading(false);}};
  return(
    <div style={{minHeight:"100vh",background:"#060C14"}}>
      <div style={{padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid rgba(255,255,255,.06)"}}>
        <div style={{fontFamily:"'Teko',sans-serif",fontSize:15,color:"#D4A843"}}>🏆 KORBIZ WORLD CUP 2026</div>
        <LangSwitcher lang={lang} setLang={setLang}/>
      </div>
      <div style={{textAlign:"center",padding:"44px 22px 28px"}}>
        <div style={{fontSize:62,marginBottom:6,filter:"drop-shadow(0 0 20px rgba(212,168,67,.35))"}}>🏆</div>
        <h1 style={{fontFamily:"'Teko',sans-serif",fontSize:52,color:"#fff",lineHeight:1,marginBottom:3}}>{t.title}</h1>
        <div style={{fontFamily:"'Teko',sans-serif",fontSize:20,color:"#D4A843",letterSpacing:".18em",marginBottom:20}}>{t.subtitle}</div>
        <div style={{display:"flex",justifyContent:"center",gap:24,marginBottom:24}}>
          {[[`$30`,t.entryFee],["48",t.teams],["104",t.matches],["🥇",t.prizes]].map(([v,l])=>(
            <div key={l}><div style={{fontFamily:"'Teko',sans-serif",fontSize:24,color:"#D4A843",lineHeight:1}}>{v}</div><div style={{fontSize:10,color:"#5A7090",letterSpacing:".1em"}}>{l}</div></div>
          ))}
        </div>
        {err&&<div style={{marginBottom:12,fontSize:13,color:"#EF4444",background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.3)",borderRadius:8,padding:"9px 12px",maxWidth:360,margin:"0 auto 12px"}}>{err}</div>}
        <button onClick={handle} disabled={loading} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12,width:"100%",maxWidth:360,margin:"0 auto",padding:"14px",borderRadius:12,border:"none",background:"#fff",color:"#111",fontSize:15,fontWeight:600,cursor:"pointer",boxShadow:"0 4px 24px rgba(0,0,0,.4)",opacity:loading?0.7:1}}>
          <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.29-8.16 2.29-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          {loading?"Loading...":t.loginBtn}
        </button>
        <p style={{color:"#5A7090",fontSize:12,marginTop:10}}>Korbiz employees only · Personal Google account</p>
        <button onClick={()=>setShowRules(r=>!r)} style={{marginTop:16,background:"transparent",border:"1px solid rgba(212,168,67,.3)",borderRadius:10,padding:"8px 20px",color:"#D4A843",fontSize:13,fontWeight:600,cursor:"pointer"}}>
          {showRules?"▲ Hide":"▼"} {t.howToPlay}
        </button>
      </div>
      {showRules&&<div style={{padding:"0 18px 40px"}}><HowToPlay lang={lang}/></div>}
    </div>
  );
}

// ─── PENDING ──────────────────────────────────────────────────────────────────
function PendingScreen({user,lang,setLang}){
  const t=T[lang];
  const [show,setShow]=useState(true);
  return(
    <div style={{minHeight:"100vh",background:"#060C14"}}>
      <div style={{background:"#0C1620",borderBottom:"1px solid rgba(255,255,255,.07)",padding:"11px 18px",display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:18}}>🏆</span>
        <div style={{fontFamily:"'Teko',sans-serif",fontSize:16,color:"#D4A843",flex:1}}>WORLD CUP 2026</div>
        <LangSwitcher lang={lang} setLang={setLang}/>
        <Avatar name={user.displayName} photoURL={user.photoURL} size={28}/>
        <button onClick={signOutUser} style={{background:"transparent",border:"1px solid rgba(255,255,255,.12)",borderRadius:6,padding:"3px 9px",color:"#6b7280",fontSize:11,cursor:"pointer"}}>{t.signOut}</button>
      </div>
      <div style={{maxWidth:660,margin:"0 auto",padding:"22px 18px"}}>
        <div style={{background:"rgba(212,168,67,.08)",border:"1px solid rgba(212,168,67,.3)",borderRadius:14,padding:"15px 18px",marginBottom:16,display:"flex",gap:12,alignItems:"flex-start"}}>
          <div style={{fontSize:28,flexShrink:0}}>⏳</div>
          <div>
            <div style={{fontFamily:"'Teko',sans-serif",fontSize:17,color:"#D4A843",marginBottom:5}}>{t.awaiting}</div>
            <div style={{fontSize:13,color:"#9CA3AF",lineHeight:1.7}}>{t.awaitingMsg}</div>
          </div>
        </div>
        <button onClick={()=>setShow(r=>!r)} style={{width:"100%",background:"transparent",border:"1px solid rgba(255,255,255,.1)",borderRadius:10,padding:"9px",color:"#D4A843",fontSize:13,fontWeight:600,cursor:"pointer",marginBottom:14}}>
          {show?"▲":"▼"} {t.howToPlay}
        </button>
        {show&&<HowToPlay lang={lang}/>}
      </div>
    </div>
  );
}

// ─── GROUP PICKS ──────────────────────────────────────────────────────────────
function GroupPicks({uid,myPicks,tournament,showToast,t,lang}){
  const [picks,setPicks]=useState(myPicks||{});
  const [saving,setSaving]=useState(false);
  const [saved,setSaved]=useState(false);
  const [dirty,setDirty]=useState(false);
  const locked=tournament.groupLocked;
  const gr=tournament.groupResults||{};
  useEffect(()=>{
    setPicks(myPicks||{});
    const hasData=Object.values(myPicks||{}).reduce((a,b)=>a+(Array.isArray(b)?b.length:0),0)>0;
    setSaved(hasData); setDirty(false);
  },[JSON.stringify(myPicks)]);
  const toggle=(grp,team)=>{
    if(locked)return;
    setPicks(prev=>{
      const cur=prev[grp]||[];
      // 선택 해제
      if(cur.includes(team))return{...prev,[grp]:cur.filter(x=>x!==team)};
      // 조당 최대 3팀
      if(cur.length>=3)return prev;
      // 전체 최대 32팀
      const totalPicked=Object.values(prev).reduce((a,b)=>a+b.length,0);
      if(totalPicked>=32)return prev;
      return{...prev,[grp]:[...cur,team]};
    });
  };
  const handleSave=async()=>{setSaving(true);try{await saveGroupPicks(uid,picks);setSaved(true); setDirty(false); showToast(t.savePicks+" ✓");}catch{showToast("Error","error");}setSaving(false);};
  const total=Object.values(picks).reduce((a,b)=>a+b.length,0);
  return(
    <div>
      <CountdownBanner lang={lang} phase="group" uid={uid}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:16,flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontFamily:"'Teko',sans-serif",fontSize:24,color:"#D4A843",lineHeight:1}}>{t.phase1Header}</div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginTop:2,flexWrap:"wrap"}}>
            {saved&&!dirty&&<span style={{fontSize:11,color:"#22C55E"}}>✓ 저장됨</span>}
            {dirty&&<span style={{fontSize:11,color:"#F59E0B"}}>● 미저장</span>}
            <span style={{color:"#5A7090",fontSize:13}}>{t.phase1Sub}</span>
            <span style={{fontFamily:"'Teko',sans-serif",fontSize:14,color:total>=32?"#EF4444":"#D4A843"}}>{total}/32</span>
            <span style={{color:"#5A7090",fontSize:13}}>· {t.perCorrect}</span>
          </div>
        </div>
        {!locked&&<button
            onClick={saved&&!dirty ? ()=>{setDirty(true);setSaved(false);} : handleSave}
            disabled={saving}
            style={{
              padding:"8px 18px",borderRadius:9,fontFamily:"'Teko',sans-serif",fontSize:15,fontWeight:700,cursor:saving?"not-allowed":"pointer",
              background: saving?"rgba(212,168,67,.4)": saved&&!dirty?"rgba(34,197,94,.15)":"linear-gradient(135deg,#D4A843,#8B6914)",
              border: saved&&!dirty?"2px solid #22C55E": dirty&&saved?"2px solid #fff":"none",
              color: saved&&!dirty?"#22C55E":"#000",
              opacity:saving?0.7:1
            }}>
            {saving ? "저장 중..." : saved&&!dirty ? "✓ SAVED ("+total+"/32)" : dirty&&saved ? "UPDATE PICKS ("+total+"/32)" : t.savePicks+" ("+total+"/32)"}
          </button>}
      </div>
      {locked&&<div style={{background:"rgba(59,130,246,.1)",border:"1px solid rgba(59,130,246,.3)",borderRadius:9,padding:"9px 14px",marginBottom:14,color:"#60a5fa",fontSize:13}}>🔒 {t.lockedMsg}</div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))",gap:10}}>
        {Object.entries(GROUPS).map(([grp,{teams,flags}])=>{
          const myG=picks[grp]||[];const adv=gr[grp]||[];const hasRes=adv.length>0;
          return(
            <div key={grp} style={{background:"#0C1620",border:"1px solid rgba(255,255,255,.07)",borderRadius:12,padding:13}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:9}}>
                <div style={{fontFamily:"'Teko',sans-serif",fontSize:15,color:"#D4A843",letterSpacing:".12em"}}>{t.group} {grp}</div>
                <div style={{fontSize:11,color:"#5A7090"}}>{myG.length}/3</div>
              </div>
              {teams.map((team,i)=>{
                const picked=myG.includes(team);const correct=hasRes&&adv.includes(team)&&picked;const wrong=hasRes&&!adv.includes(team)&&picked;const didAdv=hasRes&&adv.includes(team);
                return(
                  <div key={team} onClick={()=>toggle(grp,team)} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 9px",borderRadius:8,marginBottom:4,cursor:locked?"default":"pointer",background:correct?"rgba(34,197,94,.12)":wrong?"rgba(239,68,68,.1)":picked?"rgba(212,168,67,.1)":"transparent",border:`1px solid ${correct?"rgba(34,197,94,.4)":wrong?"rgba(239,68,68,.35)":picked?"rgba(212,168,67,.28)":"rgba(255,255,255,.07)"}`,transition:"all .12s"}}>
                    <span style={{fontSize:16}}>{flags[i]}</span>
                    <span style={{flex:1,fontSize:13,fontWeight:picked?600:400,color:correct?"#22C55E":wrong?"#EF4444":picked?"#D4A843":"#E0E8F0"}}>{tn(team,lang)}</span>
                    <span style={{display:"flex",gap:3,alignItems:"center",flexShrink:0}}>
                      {TEAM_META[team]&&<span style={{fontSize:9,color:"#5A7090",background:"rgba(255,255,255,.07)",borderRadius:3,padding:"1px 4px"}}>{TEAM_META[team].conf}</span>}
                      {TEAM_META[team]&&<span style={{fontSize:9,color:"#5A7090",background:"rgba(255,255,255,.07)",borderRadius:3,padding:"1px 4px"}}>#{TEAM_META[team].rank}</span>}
                    </span>
                    {correct&&<span style={{fontSize:12}}>✅ +3</span>}
                    {wrong&&<span style={{fontSize:12}}>❌</span>}
                    {!hasRes&&picked&&<span style={{color:"#D4A843",fontSize:10}}>✓</span>}
                    {hasRes&&didAdv&&!picked&&<span style={{fontSize:10,color:"#5A7090"}}>{t.advanced}</span>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      {!locked&&<div style={{display:"flex",justifyContent:"center",marginTop:20}}><button onClick={handleSave} disabled={saving} style={{padding:"11px 36px",borderRadius:11,border:"none",background:"linear-gradient(135deg,#D4A843,#8B6914)",color:"#000",fontFamily:"'Teko',sans-serif",fontSize:16,fontWeight:700,cursor:"pointer",opacity:saving?0.7:1}}>{saving?t.saving:`${t.savePicks} — ${total}`}</button></div>}
    </div>
  );
}

// ─── BRACKET ──────────────────────────────────────────────────────────────────
function BracketView({uid,myPicks,tournament,showToast,t,lang}){
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
  const handleSave=async()=>{setSaving(true);try{await saveBracketPicks(uid,picks);showToast(t.savePicks+" ✓");}catch{showToast("Error","error");}setSaving(false);};
  if(!bracketTeams.some(x=>x))return(
    <div style={{textAlign:"center",padding:"80px 20px"}}>
      <div style={{fontSize:52,marginBottom:10}}>⏳</div>
      <div style={{fontFamily:"'Teko',sans-serif",fontSize:22,color:"#D4A843"}}>{t.bracketWait}</div>
      <div style={{color:"#5A7090",fontSize:13,marginTop:5}}>{t.bracketWaitSub}</div>
    </div>
  );
  return(
    <div>
      <CountdownBanner lang={lang} phase="bracket" uid={uid}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:12,flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontFamily:"'Teko',sans-serif",fontSize:24,color:"#D4A843",lineHeight:1}}>{t.phase2Header}</div>
          <div style={{color:"#5A7090",fontSize:13,marginTop:2}}>{t.phase2Sub}</div>
        </div>
        {!locked&&<button onClick={handleSave} disabled={saving} style={{padding:"8px 18px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#D4A843,#8B6914)",color:"#000",fontFamily:"'Teko',sans-serif",fontSize:15,fontWeight:700,cursor:"pointer",opacity:saving?0.7:1}}>{saving?t.saving:t.savePicks}</button>}
      </div>
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
        {ROUNDS.map(r=><div key={r} style={{padding:"3px 9px",borderRadius:6,background:"#111E2E",border:"1px solid rgba(255,255,255,.07)",fontSize:11,color:"#5A7090"}}>{ROUND_META[r].label[lang]}: <span style={{color:"#D4A843",fontWeight:700}}>+{ROUND_META[r].pts}</span></div>)}
      </div>
      <div style={{overflowX:"auto",paddingBottom:10}}>
        <div style={{display:"flex",gap:9,minWidth:920}}>
          {ROUNDS.map(round=>{
            const{matches,pts}=ROUND_META[round];
            return(
              <div key={round} style={{flex:1,minWidth:155}}>
                <div style={{fontFamily:"'Teko',sans-serif",fontSize:11,color:round==="F"?"#D4A843":"#5A7090",letterSpacing:".12em",textAlign:"center",marginBottom:8,paddingBottom:5,borderBottom:"1px solid rgba(255,255,255,.07)"}}>{round==="F"?"🏆 ":""}{ROUND_META[round].label[lang]}</div>
                <div style={{display:"flex",flexDirection:"column",gap:5}}>
                  {Array.from({length:matches},(_,i)=>{
                    const matchKey=`${round}_${i}`;
                    const{t1,t2}=getTeams(round,i);
                    const myPick=picks[matchKey];const actualW=actual[matchKey];const done=!!actualW;
                    const row=(team)=>{
                      if(!team||team==="TBD")return<div key="tbd" style={{padding:"5px 7px",borderRadius:5,marginBottom:2,background:"#111E2E",color:"#5A7090",fontSize:11}}>TBD</div>;
                      const isPick=myPick===team;const correct=done&&actualW===team&&isPick;const wrong=done&&actualW!==team&&isPick;const isW=done&&actualW===team;
                      return(
                        <div key={team} onClick={()=>doPick(matchKey,team)} style={{padding:"5px 7px",borderRadius:5,marginBottom:2,cursor:locked||done?"default":"pointer",background:correct?"rgba(34,197,94,.13)":wrong?"rgba(239,68,68,.11)":isPick?"rgba(212,168,67,.1)":"transparent",border:`1px solid ${correct?"rgba(34,197,94,.4)":wrong?"rgba(239,68,68,.38)":isPick?"rgba(212,168,67,.28)":"rgba(255,255,255,.07)"}`,color:correct?"#22C55E":wrong?"#EF4444":isPick?"#D4A843":isW?"#fff":"#9CA3AF",fontSize:11,fontWeight:isPick||isW?600:400,display:"flex",alignItems:"center",gap:4,transition:"all .1s"}}>
                          <span style={{flex:1}}>{tn(team,lang)}</span>
                          {correct&&"✅"}{wrong&&"❌"}
                          {!done&&isPick&&<span style={{fontSize:9,color:"#D4A843"}}>✓</span>}
                          {isW&&!isPick&&<span style={{fontSize:9,color:"#5A7090"}}>✓</span>}
                        </div>
                      );
                    };
                    return(
                      <div key={matchKey} style={{background:"#0C1620",border:"1px solid rgba(255,255,255,.07)",borderRadius:7,padding:"7px 8px"}}>
                        <div style={{fontSize:9,color:"#5A7090",marginBottom:4}}>+{pts}</div>
                        {row(t1)}{row(t2)}
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


// ─── PICKS MODAL ──────────────────────────────────────────────────────────────

// ─── LEADERBOARD ─────────────────────────────────────────────────────────────
function Leaderboard({users,currentUid,tournament,t,lang}){
  const [selectedUser,setSelectedUser]=useState(null);
  const ranked=Object.values(users).map(u=>({...u,...calcScore({groupPicks:u.groupPicks||{},bracketPicks:u.bracketPicks||{}},tournament)})).sort((a,b)=>b.total-a.total).filter(u=>u.approved);
  const paid=ranked.filter(u=>u.paid).length;
  const medals=["🥇","🥈","🥉"];
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:16,flexWrap:"wrap",gap:10}}>
        <div style={{fontFamily:"'Teko',sans-serif",fontSize:24,color:"#D4A843"}}>{t.standings.toUpperCase()}</div>
        <div style={{textAlign:"center",background:"rgba(212,168,67,.1)",border:"1px solid rgba(212,168,67,.28)",borderRadius:10,padding:"6px 14px"}}>
          <div style={{fontFamily:"'Teko',sans-serif",fontSize:22,color:"#D4A843"}}>${paid*30}</div>
          <div style={{fontSize:10,color:"#5A7090",letterSpacing:".1em"}}>{t.prizePool} · {paid} {t.paid}</div>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {ranked.map((u,i)=>(
          <div key={u.uid} onClick={()=>setSelectedUser({...u,totalScore:u.total})} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 13px",borderRadius:10,background:u.uid===currentUid?"rgba(212,168,67,.09)":"#0C1620",border:`1px solid ${u.uid===currentUid?"rgba(212,168,67,.27)":"rgba(255,255,255,.07)"}`,cursor:"pointer",transition:"background .15s"}} onMouseEnter={e=>{if(u.uid!==currentUid)e.currentTarget.style.background="#111E2E"}} onMouseLeave={e=>{if(u.uid!==currentUid)e.currentTarget.style.background="#0C1620"}}>
            <div style={{width:26,textAlign:"center",fontSize:i<3?19:12,color:"#5A7090"}}>{i<3?medals[i]:`#${i+1}`}</div>
            <Avatar name={u.name} photoURL={u.photoURL} size={34}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,color:u.uid===currentUid?"#D4A843":"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.name}{u.uid===currentUid&&<span style={{fontSize:11,color:"#5A7090",fontWeight:400}}> ({t.you})</span>}</div>
              <div style={{fontSize:11,color:"#5A7090"}}>{u.email}</div>
            </div>
            <div style={{padding:"2px 6px",borderRadius:4,fontSize:9,fontWeight:700,background:u.paid?"rgba(34,197,94,.12)":"rgba(239,68,68,.12)",color:u.paid?"#22C55E":"#EF4444",border:`1px solid ${u.paid?"rgba(34,197,94,.3)":"rgba(239,68,68,.3)"}`}}>{u.paid?t.paid:t.unpaid}</div>
            <div style={{textAlign:"right",minWidth:44}}>
              <div style={{fontFamily:"'Teko',sans-serif",fontSize:21,color:"#D4A843",lineHeight:1}}>{u.total}</div>
              <div style={{fontSize:9,color:"#5A7090"}}>{t.pts}</div>
            </div>
          </div>
        ))}
        {ranked.length===0&&<div style={{textAlign:"center",color:"#5A7090",padding:"50px 0",fontSize:14}}>{t.noApproved}</div>}
    {selectedUser&&<PicksModal user={selectedUser} tournament={tournament} lang={lang} onClose={()=>setSelectedUser(null)}/>}
    </div>
    {selectedUser&&<PicksModal user={selectedUser} tournament={tournament} lang={lang} onClose={()=>setSelectedUser(null)}/>}
    <div style={{marginTop:18,padding:"13px 15px",background:"#111E2E",borderRadius:11,border:"1px solid rgba(255,255,255,.07)"}}>
        <div style={{fontFamily:"'Teko',sans-serif",fontSize:12,color:"#5A7090",letterSpacing:".12em",marginBottom:7}}>{t.pointSystem}</div>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",fontSize:12,color:"#5A7090"}}>
          <span>{t.group}: <span style={{color:"#D4A843",fontWeight:700}}>+3</span></span>
          {ROUNDS.map(r=><span key={r}>{ROUND_META[r].label[lang]}: <span style={{color:"#D4A843",fontWeight:700}}>+{ROUND_META[r].pts}</span></span>)}
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────
function AdminPanel({tournament,users,onClose,showToast,t,lang}){
  const [st,setSt]=useState({...tournament,bracketTeams:[...(tournament.bracketTeams||Array(32).fill(""))],groupResults:{...(tournament.groupResults||{})},bracketResults:{...(tournament.bracketResults||{})}});
  const [tab,setTab]=useState("approvals");
  const [saving,setSaving]=useState(false);
  const pending=Object.values(users).filter(u=>!u.approved);
  const approved=Object.values(users).filter(u=>u.approved);
  const save=async()=>{setSaving(true);try{await saveTournamentState(st);showToast("Saved ✓");onClose();}catch{showToast("Error","error");}setSaving(false);};
  const toggleGroup=(grp,team)=>setSt(prev=>{const cur=prev.groupResults?.[grp]||[];const next=cur.includes(team)?cur.filter(x=>x!==team):[...cur,team];return{...prev,groupResults:{...prev.groupResults,[grp]:next}};});
  const setBR=(key,winner)=>setSt(prev=>({...prev,bracketResults:{...prev.bracketResults,[key]:prev.bracketResults?.[key]===winner?"":winner}}));
  const setTeam=(idx,val)=>setSt(prev=>{const arr=[...prev.bracketTeams];arr[idx]=val;return{...prev,bracketTeams:arr};});
  const TABS=[["approvals",t.approvals+(pending.length>0?` (${pending.length})`:"")] ,["payments",t.payments],["phase",t.phase],["group",t.group_tab],["teams",t.teams_tab],["bracket",t.bracket_tab]];
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.9)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(6px)"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#0C1620",border:"1px solid rgba(239,68,68,.22)",borderRadius:18,padding:"20px 18px",maxWidth:860,width:"96vw",maxHeight:"91vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={{fontFamily:"'Teko',sans-serif",fontSize:20,color:"#f87171",letterSpacing:".1em"}}>🔑 {t.adminTitle}</div>
          <button onClick={onClose} style={{background:"transparent",border:"none",color:"#5A7090",fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{display:"flex",gap:4,marginBottom:14,overflowX:"auto",paddingBottom:2}}>
          {TABS.map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)} style={{padding:"5px 11px",borderRadius:7,fontSize:11,fontFamily:"'Teko',sans-serif",letterSpacing:".1em",whiteSpace:"nowrap",cursor:"pointer",border:`1px solid ${tab===id?"rgba(239,68,68,.5)":"rgba(255,255,255,.09)"}`,background:tab===id?"rgba(239,68,68,.14)":"transparent",color:tab===id?"#f87171":"#5A7090"}}>{label.toUpperCase()}</button>
          ))}
        </div>

        {tab==="approvals"&&(
          <div>
            <p style={{color:"#5A7090",fontSize:13,marginBottom:10}}>{t.approveDesc}</p>
            {pending.length>0&&(<>
              <div style={{fontFamily:"'Teko',sans-serif",color:"#f87171",fontSize:12,marginBottom:7}}>⏳ {t.pendingUsers} ({pending.length})</div>
              <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:14}}>
                {pending.map(u=>(
                  <div key={u.uid} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:8,background:"rgba(239,68,68,.06)",border:"1px solid rgba(239,68,68,.2)"}}>
                    <Avatar name={u.name} photoURL={u.photoURL} size={32}/>
                    <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:"#fff"}}>{u.name}</div><div style={{fontSize:11,color:"#5A7090"}}>{u.email}</div></div>
                    <button onClick={async()=>{await setApproved(u.uid,true);showToast(`${u.name} ✓`);}} style={{padding:"6px 14px",borderRadius:7,border:"1px solid rgba(34,197,94,.4)",background:"rgba(34,197,94,.12)",color:"#22C55E",fontSize:12,fontWeight:700,cursor:"pointer"}}>{t.approveBtn}</button>
                  </div>
                ))}
              </div>
            </>)}
            {approved.length>0&&(<>
              <div style={{fontFamily:"'Teko',sans-serif",color:"#22C55E",fontSize:12,marginBottom:6}}>✓ {t.approvedUsers} ({approved.length})</div>
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                {approved.map(u=>(
                  <div key={u.uid} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:8,background:"rgba(34,197,94,.06)",border:"1px solid rgba(34,197,94,.14)"}}>
                    <Avatar name={u.name} photoURL={u.photoURL} size={28}/>
                    <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:"#fff"}}>{u.name}</div><div style={{fontSize:10,color:"#5A7090"}}>{u.email}</div></div>
                    <button onClick={async()=>{await setApproved(u.uid,false);showToast(`${u.name} revoked`);}} style={{padding:"4px 10px",borderRadius:6,border:"1px solid rgba(239,68,68,.3)",background:"transparent",color:"#f87171",fontSize:11,cursor:"pointer"}}>{t.revokeBtn}</button>
                  </div>
                ))}
              </div>
            </>)}
            {pending.length===0&&approved.length===0&&<div style={{color:"#5A7090",textAlign:"center",padding:"30px 0"}}>{t.noRegistrations}</div>}
          </div>
        )}

        {tab==="payments"&&(
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {Object.values(users).filter(u=>u.approved).map(u=>(
              <div key={u.uid} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:8,background:"#111E2E",border:"1px solid rgba(255,255,255,.07)"}}>
                <Avatar name={u.name} photoURL={u.photoURL} size={30}/>
                <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:"#fff"}}>{u.name}</div><div style={{fontSize:10,color:"#5A7090"}}>{u.email}</div></div>
                <div style={{padding:"2px 7px",borderRadius:4,fontSize:9,fontWeight:700,background:u.paid?"rgba(34,197,94,.12)":"rgba(239,68,68,.12)",color:u.paid?"#22C55E":"#EF4444",border:`1px solid ${u.paid?"rgba(34,197,94,.3)":"rgba(239,68,68,.3)"}`}}>{u.paid?`✓ ${t.paid}`:`${t.unpaid}`}</div>
                <button onClick={async()=>{await setPaid(u.uid,!u.paid);showToast(`${u.name} updated`);}} style={{padding:"4px 10px",borderRadius:6,fontSize:11,cursor:"pointer",border:`1px solid ${u.paid?"rgba(239,68,68,.3)":"rgba(34,197,94,.3)"}`,background:"transparent",color:u.paid?"#f87171":"#22C55E"}}>{u.paid?t.unmarkPaid:t.markPaid}</button>
              </div>
            ))}
            {Object.values(users).filter(u=>u.approved).length===0&&<div style={{color:"#5A7090",textAlign:"center",padding:"30px 0"}}>{t.noApproved}</div>}
          </div>
        )}

        {tab==="phase"&&(
          <div>
            <div style={{display:"flex",gap:8,marginBottom:14}}>
              {["group","bracket"].map(p=><button key={p} onClick={()=>setSt(prev=>({...prev,phase:p}))} style={{padding:"7px 16px",borderRadius:8,fontFamily:"'Teko',sans-serif",cursor:"pointer",border:`1px solid ${st.phase===p?"rgba(239,68,68,.5)":"rgba(255,255,255,.09)"}`,background:st.phase===p?"rgba(239,68,68,.14)":"transparent",color:st.phase===p?"#f87171":"#5A7090"}}>{p==="group"?t.groupStage.toUpperCase():t.knockout.toUpperCase()}</button>)}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {[["groupLocked",t.lockGroup],["bracketLocked",t.lockBracket]].map(([key,label])=>(
                <label key={key} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",fontSize:13,color:"#E0E8F0"}}>
                  <input type="checkbox" checked={!!st[key]} onChange={e=>setSt(prev=>({...prev,[key]:e.target.checked}))} style={{width:14,height:14,accentColor:"#f87171"}}/>
                  {label}
                </label>
              ))}
            </div>
          </div>
        )}

        {tab==="group"&&(
          <div>
            <p style={{color:"#5A7090",fontSize:13,marginBottom:10}}>{t.bracketResultDesc}</p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(195px,1fr))",gap:8}}>
              {Object.entries(GROUPS).map(([grp,{teams,flags}])=>{
                const adv=st.groupResults?.[grp]||[];
                return(
                  <div key={grp} style={{background:"#111E2E",borderRadius:8,padding:10,border:"1px solid rgba(255,255,255,.07)"}}>
                    <div style={{fontFamily:"'Teko',sans-serif",color:"#f87171",marginBottom:6,fontSize:12}}>{t.group} {grp} <span style={{color:"#5A7090",fontSize:10}}>({adv.length} {t.advanced})</span></div>
                    {teams.map((team,i)=>{const on=adv.includes(team);return(
                      <div key={team} onClick={()=>toggleGroup(grp,team)} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 7px",borderRadius:5,marginBottom:3,cursor:"pointer",background:on?"rgba(239,68,68,.12)":"transparent",border:`1px solid ${on?"rgba(239,68,68,.4)":"rgba(255,255,255,.07)"}`,color:on?"#f87171":"#5A7090",fontSize:11}}>
                        <span>{flags[i]}</span><span style={{flex:1}}>{tn(team,lang)}</span>{on&&"✓"}
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
            <p style={{color:"#5A7090",fontSize:13,marginBottom:9}}>{t.bracketTeamDesc}</p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:5}}>
              {Array.from({length:32},(_,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:5}}>
                  <span style={{color:"#5A7090",fontSize:11,width:16,textAlign:"right"}}>{i+1}</span>
                  <input value={st.bracketTeams[i]||""} onChange={e=>setTeam(i,e.target.value)} placeholder={`${t.group} ${i+1}`} style={{flex:1,background:"#111E2E",border:"1px solid rgba(255,255,255,.09)",borderRadius:6,padding:"5px 7px",color:"#E0E8F0",fontSize:11,outline:"none"}}/>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==="bracket"&&(
          <div>
            <p style={{color:"#5A7090",fontSize:13,marginBottom:10}}>{t.bracketResultDesc}</p>
            {ROUNDS.map(round=>{
              const{matches}=ROUND_META[round];const ri=ROUNDS.indexOf(round);
              return(
                <div key={round} style={{marginBottom:14}}>
                  <div style={{fontFamily:"'Teko',sans-serif",color:"#f87171",fontSize:13,marginBottom:7}}>{ROUND_META[round].label[lang]}</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(235px,1fr))",gap:5}}>
                    {Array.from({length:matches},(_,i)=>{
                      const matchKey=`${round}_${i}`;
                      let t1="?",t2="?";
                      if(round==="R32"){t1=st.bracketTeams[i*2]||`Slot ${i*2+1}`;t2=st.bracketTeams[i*2+1]||`Slot ${i*2+2}`;}
                      else{const prev=ROUNDS[ri-1];t1=st.bracketResults?.[`${prev}_${i*2}`]||"TBD";t2=st.bracketResults?.[`${prev}_${i*2+1}`]||"TBD";}
                      const winner=st.bracketResults?.[matchKey]||"";
                      return(
                        <div key={matchKey} style={{background:"#111E2E",borderRadius:7,padding:8,border:"1px solid rgba(255,255,255,.07)"}}>
                          <div style={{fontSize:9,color:"#5A7090",marginBottom:4}}>{t.match} {i+1}: {tn(t1,lang)} vs {tn(t2,lang)}</div>
                          <div style={{display:"flex",gap:4}}>
                            {[t1,t2].map(team=>(
                              <button key={team} onClick={()=>setBR(matchKey,team)} style={{flex:1,padding:"5px",borderRadius:5,fontSize:10,cursor:"pointer",border:`1px solid ${winner===team?"rgba(239,68,68,.5)":"rgba(255,255,255,.09)"}`,background:winner===team?"rgba(239,68,68,.15)":"transparent",color:winner===team?"#f87171":"#5A7090"}}>{tn(team,lang)}</button>
                            ))}
                            {winner&&<button onClick={()=>setBR(matchKey,"")} style={{padding:"5px 6px",borderRadius:5,border:"1px solid rgba(255,255,255,.09)",background:"transparent",color:"#5A7090",fontSize:9,cursor:"pointer"}}>✕</button>}
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

        <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:18}}>
          <button onClick={onClose} style={{padding:"7px 16px",borderRadius:8,border:"1px solid rgba(255,255,255,.09)",background:"transparent",color:"#5A7090",fontSize:12,cursor:"pointer"}}>{t.cancel}</button>
          <button onClick={save} disabled={saving} style={{padding:"7px 20px",borderRadius:8,border:"none",background:"#EF4444",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",opacity:saving?0.7:1}}>{saving?t.saving:t.saveAll}</button>
          {tab==="group"&&<button onClick={async()=>{
            const grpRes=st.groupResults||{};
            const entries=Object.entries(grpRes);
            await Promise.all(entries.map(async function(e){
              var grp=e[0],teams=e[1];
              if(teams&&teams.length>0){
                try{await fetch("/api/notify-group-result",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({adminSecret:"korbiz2026admin",groupKey:grp,advancedTeams:teams})});}catch(err){}
              }
            }));
            // 오늘의 예측왕 자동 채팅 메시지
            try {
              const allUsers = Object.values(users||{}).filter(function(u){return u.approved&&u.paid;});
              var bestName="", bestScore=0;
              allUsers.forEach(function(u){
                var correct=0;
                Object.entries(st.groupResults||{}).forEach(function(e2){
                  var grp2=e2[0],adv=e2[1]||[];
                  (u.groupPicks?.[grp2]||[]).forEach(function(t){if(adv.includes(t))correct++;});
                });
                if(correct>bestScore){bestScore=correct;bestName=u.name?.split(" ")[0]||"?"}
              });
              if(bestName&&bestScore>0){
                await addDoc(collection(db,"chat"),{
                  uid:"system",name:"Korbiz Bot",photo:null,
                  text:"🏆 오늘의 예측왕: "+bestName+" ("+bestScore+"팀 적중!) — 현재까지 최고 정확도!",
                  ts:serverTimestamp(),
                });
              }
            } catch(err){}
            showToast("📢 알림 발송됨!");
          }} style={{padding:"7px 14px",borderRadius:8,border:"1px solid rgba(239,68,68,.4)",background:"transparent",color:"#f87171",fontSize:11,cursor:"pointer"}}>📢 알림 보내기</button>}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function Main(){
  const [firebaseUser,setFirebaseUser]=useState(null);
  const [authReady,setAuthReady]=useState(false);
  const [userData,setUserData]=useState(null);
  const [users,setUsers]=useState({});
  const [tournament,setTournament]=useState(null);
  const [tab,setTab]=useState("dashboard");
  const [showAdmin,setShowAdmin]=useState(false);
  const [lang,setLang]=useState("en");
  const [toast,setToast]=useState(null);
  const t=T[lang];

  useEffect(()=>{
    return onAuthStateChanged(auth,async fu=>{
      if(fu){const data=await ensureUserDoc(fu);setFirebaseUser(fu);setUserData(data);}
      else{setFirebaseUser(null);setUserData(null);}
      setAuthReady(true);
    });
  },[]);

  useEffect(()=>{
    if(!firebaseUser)return;
    const u1=subscribeUsers(setUsers);
    const u2=subscribeTournamentState(setTournament);
    return()=>{u1();u2();};
  },[firebaseUser?.uid]);

  const showMsg=(msg,type="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),3000);};

  // 포그라운드 푸시 수신 → 토스트로 표시
  useEffect(()=>{
    if(!firebaseUser)return;
    try{
      const unsub=onForegroundMessage((payload)=>{
        const {title,body}=payload.notification||{};
        showMsg(`${title}: ${body}`);
      });
      return unsub;
    }catch(e){}
  },[firebaseUser?.uid]);

  if(!authReady)return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#060C14"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Teko:wght@400;600;700&family=Outfit:wght@300;400;500;600&display=swap');*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Outfit',sans-serif;}`}</style>
      <div style={{textAlign:"center"}}><div style={{fontSize:40,marginBottom:8}}>🏆</div><div style={{fontFamily:"'Teko',sans-serif",fontSize:18,color:"#D4A843",letterSpacing:3}}>LOADING...</div></div>
    </div>
  );

  if(!firebaseUser)return<LoginScreen lang={lang} setLang={setLang}/>;

  const me=users[firebaseUser.uid]||userData||{};
  const admin=isAdmin(firebaseUser.email);
  const approved=me.approved||admin;

  if(!approved)return<PendingScreen user={firebaseUser} lang={lang} setLang={setLang}/>;

  if(!tournament)return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#060C14"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Teko:wght@400;600;700&family=Outfit:wght@300;400;500;600&display=swap');*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Outfit',sans-serif;}`}</style>
      <div style={{fontFamily:"'Teko',sans-serif",fontSize:18,color:"#D4A843",letterSpacing:3}}>LOADING...</div>
    </div>
  );

  const myScore=calcScore({groupPicks:me.groupPicks||{},bracketPicks:me.bracketPicks||{}},tournament);
  const phase=tournament.phase||"group";
  const tabs=[
    {id:"dashboard",label:lang==="ko"?"홈":lang==="es"?"INICIO":"HOME"},
    {id:"picks",label:phase==="group"?t.groupPicks:t.bracket},
    {id:"leaderboard",label:t.standings},
    {id:"stats",label:lang==="ko"?"통계":lang==="es"?"STATS":"STATS"},
    {id:"rules",label:t.howToPlay},
  ];

  return(
    <div style={{minHeight:"100vh",background:"#060C14",fontFamily:"'Outfit',sans-serif",color:"#E0E8F0"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Teko:wght@400;600;700&family=Outfit:wght@300;400;500;600&display=swap');*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}`}</style>
      <div style={{background:"#0C1620",borderBottom:"1px solid rgba(255,255,255,.07)",position:"sticky",top:0,zIndex:200}}>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px"}}>
          <span style={{fontSize:17}}>🏆</span>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Teko',sans-serif",fontSize:8,color:"#5A7090",letterSpacing:".2em"}}>KORBIZ</div>
            <div style={{fontFamily:"'Teko',sans-serif",fontSize:15,color:"#D4A843",lineHeight:1}}>WORLD CUP 2026</div>
          </div>
          <LangSwitcher lang={lang} setLang={setLang}/>
          <div style={{padding:"2px 7px",borderRadius:5,fontSize:9,fontFamily:"'Teko',sans-serif",letterSpacing:".1em",background:phase==="group"?"rgba(59,130,246,.14)":"rgba(212,168,67,.12)",color:phase==="group"?"#60a5fa":"#D4A843",border:`1px solid ${phase==="group"?"rgba(59,130,246,.3)":"rgba(212,168,67,.28)"}`}}>{phase==="group"?t.groupStage:t.knockout}</div>
          <div style={{textAlign:"center",background:"rgba(212,168,67,.1)",border:"1px solid rgba(212,168,67,.24)",borderRadius:7,padding:"3px 9px"}}>
            <div style={{fontFamily:"'Teko',sans-serif",fontSize:16,color:"#D4A843",lineHeight:1}}>{myScore.total}</div>
            <div style={{fontSize:8,color:"#5A7090",letterSpacing:".1em"}}>{t.pts}</div>
          </div>
          <div style={{padding:"2px 6px",borderRadius:4,fontSize:9,fontWeight:700,background:me.paid?"rgba(34,197,94,.12)":"rgba(239,68,68,.12)",color:me.paid?"#22C55E":"#EF4444",border:`1px solid ${me.paid?"rgba(34,197,94,.3)":"rgba(239,68,68,.3)"}`}}>{me.paid?t.paid:t.unpaid}</div>
          {admin&&<button onClick={()=>setShowAdmin(true)} style={{padding:"3px 9px",borderRadius:6,border:"1px solid rgba(239,68,68,.35)",background:"rgba(239,68,68,.1)",color:"#f87171",fontFamily:"'Teko',sans-serif",letterSpacing:".1em",fontSize:10,cursor:"pointer"}}>{t.admin}</button>}
          <Avatar name={firebaseUser.displayName} photoURL={firebaseUser.photoURL} size={28}/>
          <button onClick={signOutUser} style={{background:"transparent",border:"1px solid rgba(255,255,255,.1)",borderRadius:6,padding:"3px 8px",color:"#5A7090",fontSize:10,cursor:"pointer"}}>{t.signOut}</button>
        </div>
        <div style={{display:"flex",borderTop:"1px solid rgba(255,255,255,.07)",overflowX:"auto"}}>
          {tabs.map(tb=><button key={tb.id} onClick={()=>setTab(tb.id)} style={{padding:"7px 16px",border:"none",background:"transparent",color:tab===tb.id?"#D4A843":"#5A7090",borderBottom:`2px solid ${tab===tb.id?"#D4A843":"transparent"}`,fontFamily:"'Teko',sans-serif",letterSpacing:".12em",fontSize:12,whiteSpace:"nowrap",cursor:"pointer"}}>{tb.label.toUpperCase()}</button>)}
        </div>
      </div>

      <div style={{maxWidth:1280,margin:"0 auto",padding:"18px 12px"}}>
        {tab==="dashboard"&&<Dashboard users={users} tournament={tournament} currentUid={firebaseUser.uid} currentUser={firebaseUser} lang={lang}/>}
        {tab==="picks"&&phase==="group"&&(
          <div>
            <PrizeDashboard users={users} lang={lang}/>
            <GroupPicks uid={firebaseUser.uid} myPicks={me.groupPicks} tournament={tournament} showToast={showMsg} t={t} lang={lang}/>
          </div>
        )}
        {tab==="picks"&&phase==="bracket"&&(
          <div>
            <PrizeDashboard users={users} lang={lang}/>
            <BracketView uid={firebaseUser.uid} myPicks={me.bracketPicks} tournament={tournament} showToast={showMsg} t={t} lang={lang}/>
          </div>
        )}
        {tab==="leaderboard"&&<Leaderboard users={users} currentUid={firebaseUser.uid} tournament={tournament} t={t} lang={lang}/>}
        {tab==="stats"&&<PickStats users={users} tournament={tournament} lang={lang}/>}
        {tab==="rules"&&<HowToPlay lang={lang}/>}
      </div>

      {showAdmin&&admin&&<AdminPanel tournament={tournament} users={users} onClose={()=>setShowAdmin(false)} showToast={showMsg} t={t} lang={lang}/>}
      {toast&&<div style={{position:"fixed",bottom:20,left:"50%",transform:"translateX(-50%)",background:toast.type==="error"?"#EF4444":"#D4A843",color:toast.type==="error"?"#fff":"#000",fontWeight:700,padding:"9px 22px",borderRadius:9,fontSize:13,zIndex:9999,boxShadow:"0 8px 40px rgba(0,0,0,.6)",whiteSpace:"nowrap"}}>{toast.msg}</div>}
    </div>
  );
}
