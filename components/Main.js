"use client";
import { useState, useEffect, useRef } from "react";
import {
  auth, db, signInWithGoogle, signOutUser, isAdmin,
  ensureUserDoc, saveGroupPicks, saveBracketPicks,
  setApproved, setPaid, subscribeUsers,
  subscribeTournamentState, saveTournamentState,
  saveScorePrediction, saveReaction, saveDirectionPick,
} from "../lib/firebase";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
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

// 32강 공식 매치업 시드 순서 (FIFA Regulations Annex 기준, bracketTeams 배열 인덱스 0~31에 대응)
// 짝수 인덱스(0,2,4...) vs 다음 인덱스(1,3,5...)가 한 경기
// 2026 FIFA 공식 확정 32강 매치업 + 실제 16강 진출 대결구조까지 정확히 일치하는 순서
// (R16_i = winner(idx 2i) vs winner(idx 2i+1) 단순 인접 매칭이 그대로 실제 16강과 일치하도록 배열함)
const R32_MATCHUPS = [
  "A2","B2", "F1","C2", "E1","WC1", "I1","WC2",
  "C1","F2", "E2","I2", "A1","WC3", "L1","WC4",
  "H1","J2", "K2","L2", "G1","WC5", "D1","WC6",
  "D2","G2", "J1","H2", "B1","WC7", "K1","WC8",
];

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
    bracketLock:"Bracket picks lock: June 28, 2026 3:00 PM ET (kickoff of Round of 32 opener: South Africa vs Canada)",
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
    bracketLock:"Bracket picks cierran: 28 jun 2026 3:00 PM ET (inicio del primer partido: Sudáfrica vs Canadá)",
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
    bracketLock:"브래킷 픽 마감: 2026년 6월 28일 오후 3시 (ET) — 32강 첫 경기(South Africa vs Canada) 킥오프 직전",
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
      if((gr[grp]||[]).includes(t)){
        total+=3;breakdown.push({l:`${grp}: ${t}`,p:3});
      } else if(tournament.manualQualified && tournament.manualQualified[t]){
        // 조 결과 미확정이지만 Admin이 직접 32강 진출 확정(Q)으로 체크한 팀
        total+=3;breakdown.push({l:`${grp}: ${t} (clinched)`,p:3});
      }
    });
  });
  const br = tournament.bracketResults||{};
  Object.entries(picks.bracketPicks||{}).forEach(([key,winner])=>{
    if(br[key]&&br[key]===winner){
      const pts=ROUND_META[key.split("_")[0]]?.pts??5;
      total+=pts;breakdown.push({l:key,p:pts});
    }
  });
  // 우승자 예측 보너스: 결승(F_0) 픽이 실제 우승팀과 일치하면 +40점 추가
  // (결승 승자 맞추기 +30점과는 별개로, "이 팀이 우승한다"는 예측 자체에 주는 보너스)
  if(picks.bracketPicks && br["F_0"] && picks.bracketPicks["F_0"]===br["F_0"]){
    total+=40;breakdown.push({l:"Champion Pick",p:40});
  }
  return {total,breakdown};
}

function Avatar({name,photoURL,size=36}){
  const ini=(name||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  const pal=[["#D4A843","#7a5c10"],["#3B82F6","#1e40af"],["#22C55E","#166534"],["#EF4444","#991b1b"],["#8B5CF6","#5b21b6"],["#F59E0B","#92400e"]];
  const c=pal[(name||"x").charCodeAt(0)%pal.length];
  if(photoURL) return <img src={photoURL} referrerPolicy="no-referrer" style={{width:size,height:size,borderRadius:"50%",display:"block"}} alt=""/>;
  return <div style={{width:size,height:size,borderRadius:"50%",background:`linear-gradient(135deg,${c[0]},${c[1]})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.38,fontWeight:700,color:"#fff",flexShrink:0}}>{ini}</div>;
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
  // June 11 (Thu)
  {date:"2026-06-11T15:00:00-04:00",teams:"Mexico vs South Africa",group:"A",time:"3:00 PM ET"},
  {date:"2026-06-11T22:00:00-04:00",teams:"South Korea vs Czechia",group:"A",time:"10:00 PM ET"},
  // June 12 (Fri)
  {date:"2026-06-12T15:00:00-04:00",teams:"Canada vs Bosnia-Herzegovina",group:"B",time:"3:00 PM ET"},
  {date:"2026-06-12T21:00:00-04:00",teams:"USA vs Paraguay",group:"D",time:"9:00 PM ET"},
  // June 13 (Sat)
  {date:"2026-06-13T15:00:00-04:00",teams:"Qatar vs Switzerland",group:"B",time:"3:00 PM ET"},
  {date:"2026-06-13T18:00:00-04:00",teams:"Brazil vs Morocco",group:"C",time:"6:00 PM ET"},
  {date:"2026-06-13T21:00:00-04:00",teams:"Haiti vs Scotland",group:"C",time:"9:00 PM ET"},
  {date:"2026-06-14T00:00:00-04:00",teams:"Australia vs Türkiye",group:"D",time:"12:00 AM ET"},
  // June 14 (Sun)
  {date:"2026-06-14T13:00:00-04:00",teams:"Germany vs Curaçao",group:"E",time:"1:00 PM ET"},
  {date:"2026-06-14T16:00:00-04:00",teams:"Netherlands vs Japan",group:"F",time:"4:00 PM ET"},
  {date:"2026-06-14T19:00:00-04:00",teams:"Ivory Coast vs Ecuador",group:"E",time:"7:00 PM ET"},
  {date:"2026-06-14T22:00:00-04:00",teams:"Sweden vs Tunisia",group:"F",time:"10:00 PM ET"},
  // June 15 (Mon)
  {date:"2026-06-15T12:00:00-04:00",teams:"Spain vs Cape Verde",group:"H",time:"12:00 PM ET"},
  {date:"2026-06-15T15:00:00-04:00",teams:"Belgium vs Egypt",group:"G",time:"3:00 PM ET"},
  {date:"2026-06-15T18:00:00-04:00",teams:"Saudi Arabia vs Uruguay",group:"H",time:"6:00 PM ET"},
  {date:"2026-06-15T21:00:00-04:00",teams:"Iran vs New Zealand",group:"G",time:"9:00 PM ET"},
  // June 16 (Tue)
  {date:"2026-06-16T15:00:00-04:00",teams:"France vs Senegal",group:"I",time:"3:00 PM ET"},
  {date:"2026-06-16T18:00:00-04:00",teams:"Iraq vs Norway",group:"I",time:"6:00 PM ET"},
  {date:"2026-06-16T21:00:00-04:00",teams:"Argentina vs Algeria",group:"J",time:"9:00 PM ET"},
  {date:"2026-06-17T00:00:00-04:00",teams:"Austria vs Jordan",group:"J",time:"12:00 AM ET"},
  // June 17 (Wed)
  {date:"2026-06-17T13:00:00-04:00",teams:"Portugal vs Congo DR",group:"K",time:"1:00 PM ET"},
  {date:"2026-06-17T16:00:00-04:00",teams:"England vs Croatia",group:"L",time:"4:00 PM ET"},
  {date:"2026-06-17T19:00:00-04:00",teams:"Ghana vs Panama",group:"L",time:"7:00 PM ET"},
  {date:"2026-06-17T22:00:00-04:00",teams:"Uzbekistan vs Colombia",group:"K",time:"10:00 PM ET"},
  // Round of 32 (확정 매치업)
  {date:"2026-06-28T15:00:00-04:00",teams:"South Africa vs Canada",group:"R32",time:"3:00 PM ET"},
  {date:"2026-06-28T19:00:00-04:00",teams:"Netherlands vs Morocco",group:"R32",time:"7:00 PM ET"},
  {date:"2026-06-29T13:00:00-04:00",teams:"Germany vs Paraguay",group:"R32",time:"1:00 PM ET"},
  {date:"2026-06-29T17:00:00-04:00",teams:"France vs Sweden",group:"R32",time:"5:00 PM ET"},
  {date:"2026-06-29T21:00:00-04:00",teams:"Brazil vs Japan",group:"R32",time:"9:00 PM ET"},
  {date:"2026-06-30T13:00:00-04:00",teams:"Ivory Coast vs Norway",group:"R32",time:"1:00 PM ET"},
  {date:"2026-06-30T17:00:00-04:00",teams:"Mexico vs Ecuador",group:"R32",time:"5:00 PM ET"},
  {date:"2026-06-30T21:00:00-04:00",teams:"England vs Congo DR",group:"R32",time:"9:00 PM ET"},
  {date:"2026-07-01T13:00:00-04:00",teams:"Spain vs Austria",group:"R32",time:"1:00 PM ET"},
  {date:"2026-07-01T17:00:00-04:00",teams:"Portugal vs Croatia",group:"R32",time:"5:00 PM ET"},
  {date:"2026-07-01T21:00:00-04:00",teams:"Belgium vs Senegal",group:"R32",time:"9:00 PM ET"},
  {date:"2026-07-02T13:00:00-04:00",teams:"USA vs Bosnia-Herzegovina",group:"R32",time:"1:00 PM ET"},
  {date:"2026-07-02T17:00:00-04:00",teams:"Australia vs Egypt",group:"R32",time:"5:00 PM ET"},
  {date:"2026-07-02T21:00:00-04:00",teams:"Argentina vs Cape Verde",group:"R32",time:"9:00 PM ET"},
  {date:"2026-07-03T13:00:00-04:00",teams:"Switzerland vs Algeria",group:"R32",time:"1:00 PM ET"},
  {date:"2026-07-03T17:00:00-04:00",teams:"Colombia vs Ghana",group:"R32",time:"5:00 PM ET"},
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
            {lang==="ko"?"선택팀":lang==="es"?"Elegido":"Picked"}: <span style={{color:"#D4A843",fontWeight:700}}>{totalPicked}/32</span>
            {totalPickedRaw>32&&<span style={{fontSize:10,color:"#5A7090",marginLeft:4}}>(이전 데이터)</span>}
          </div>
          {hasResults&&<div style={{background:"rgba(34,197,94,.08)",border:"1px solid rgba(34,197,94,.2)",borderRadius:8,padding:"6px 12px",fontSize:12,color:"#22C55E"}}>
            {lang==="ko"?"정답":lang==="es"?"Correcto":"Correct"}: <span style={{fontWeight:700}}>{correct}</span> (+{correct*3} pts)
          </div>}
        </div>
        {totalPicked===0?(
          <div style={{textAlign:"center",color:"#5A7090",padding:"40px 0",fontSize:14}}>
            {lang==="ko"?"아직 픽하지 않았습니다":lang==="es"?"Aún sin picks enviados":"No picks submitted yet"}
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
                    {lang==="ko"?"조":lang==="es"?"GRUPO":"GROUP"} {grp}
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
// Phase2(브래킷) 픽 제출 현황 - 누가 했고 안 했는지 한눈에 보여주는 위젯 (Admin/Dave 리마인드용)
function BracketSubmissionStatus({users, tournament, lang}){
  const [expanded, setExpanded] = useState(false);
  if(tournament.phase !== "bracket") return null;

  // 31경기(R32 16 + R16 8 + QF 4 + SF 2 + F 1) 전부 채운 사람만 "제출완료"로 인정
  // (BracketView의 저장 잠금 조건과 동일한 기준 - 일부만 채운 경우는 제출완료로 카운트하지 않음)
  const TOTAL_BRACKET_MATCHES = Object.values(ROUND_META).reduce((s,m)=>s+m.matches,0);
  const approved = Object.values(users).filter(u => u.approved && u.paid);
  const submitted = approved.filter(u => u.bracketPicks && Object.keys(u.bracketPicks).length >= TOTAL_BRACKET_MATCHES);
  const notSubmitted = approved.filter(u => !u.bracketPicks || Object.keys(u.bracketPicks).length < TOTAL_BRACKET_MATCHES);

  const pct = approved.length > 0 ? Math.round((submitted.length / approved.length) * 100) : 0;

  return(
    <div style={{background:"rgba(212,168,67,.06)",border:"1px solid rgba(212,168,67,.2)",borderRadius:12,padding:"12px 14px",marginBottom:12}}>
      <div onClick={()=>setExpanded(!expanded)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",touchAction:"manipulation"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:16}}>🏆</span>
          <span style={{fontFamily:"'Teko',sans-serif",fontSize:14,color:"#D4A843",letterSpacing:".06em"}}>
            {lang==="ko"?"브래킷 픽 제출 현황":lang==="es"?"Estado de Picks de Bracket":"BRACKET PICK STATUS"}
          </span>
        </div>
        <span style={{fontSize:11,color:"#5A7090"}}>{expanded?"▲":"▼"}</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginTop:8}}>
        <div style={{flex:1,height:8,background:"rgba(255,255,255,.08)",borderRadius:4,overflow:"hidden"}}>
          <div style={{width:pct+"%",height:"100%",background:"#D4A843",borderRadius:4}}/>
        </div>
        <span style={{fontSize:12,color:"#D4A843",fontWeight:700,whiteSpace:"nowrap"}}>{submitted.length}/{approved.length}</span>
      </div>
      {expanded&&(
        <div style={{marginTop:10,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div>
            <div style={{fontSize:10,color:"#22C55E",marginBottom:5,letterSpacing:".06em"}}>
              ✓ {lang==="ko"?"제출완료":lang==="es"?"Enviado":"SUBMITTED"} ({submitted.length})
            </div>
            {submitted.map(u=>(
              <div key={u.uid} style={{fontSize:11,color:"#9CA3AF",padding:"2px 0"}}>{u.name}</div>
            ))}
          </div>
          <div>
            <div style={{fontSize:10,color:"#EF4444",marginBottom:5,letterSpacing:".06em"}}>
              ✗ {lang==="ko"?"미제출":lang==="es"?"Pendiente":"NOT YET"} ({notSubmitted.length})
            </div>
            {notSubmitted.map(u=>(
              <div key={u.uid} style={{fontSize:11,color:"#f87171",padding:"2px 0"}}>{u.name}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 브래킷 픽 공개 컴포넌트 - 모든 참가자의 픽을 라운드별로 볼 수 있음 (투명성)
function PublicBracketPicks({users, tournament, currentUid, lang}){
  const [selectedUser, setSelectedUser] = useState(null);
  if(tournament.phase !== "bracket") return null;

  const TOTAL = Object.values(ROUND_META).reduce((s,m)=>s+m.matches,0);
  const approved = Object.values(users).filter(u=>u.approved&&u.paid);
  const withPicks = approved.filter(u=>u.bracketPicks&&Object.keys(u.bracketPicks).length>=TOTAL);
  const withoutPicks = approved.filter(u=>!u.bracketPicks||Object.keys(u.bracketPicks).length<TOTAL);

  const lbl = (ko,en) => lang==="ko"?ko:en;

  return(
    <div style={{background:"#0C1620",border:"1px solid rgba(255,255,255,.08)",borderRadius:14,padding:"14px 16px",marginTop:12}}>
      <div style={{fontFamily:"'Teko',sans-serif",fontSize:16,color:"#D4A843",letterSpacing:".1em",marginBottom:10}}>
        🏆 {lbl("브래킷 픽 현황","BRACKET PICKS")}
      </div>

      {/* 제출 현황 */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
        {withPicks.map(u=>(
          <button key={u.uid} onClick={()=>setSelectedUser(selectedUser===u.uid?null:u.uid)}
            style={{padding:"5px 10px",borderRadius:20,border:`1px solid ${selectedUser===u.uid?"rgba(212,168,67,.5)":u.uid===currentUid?"rgba(212,168,67,.3)":"rgba(255,255,255,.1)"}`,
            background:selectedUser===u.uid?"rgba(212,168,67,.15)":u.uid===currentUid?"rgba(212,168,67,.07)":"transparent",
            color:selectedUser===u.uid?"#D4A843":u.uid===currentUid?"#D4A843":"#9CA3AF",
            fontSize:11,cursor:"pointer",touchAction:"manipulation"}}>
            {u.uid===currentUid?"⭐ ":""}{(u.name||"?").split(" ")[0]}
          </button>
        ))}
        {withoutPicks.map(u=>(
          <span key={u.uid} style={{padding:"5px 10px",borderRadius:20,border:"1px solid rgba(255,255,255,.05)",
            background:"transparent",color:"#3A5070",fontSize:11,opacity:0.6}}>
            {(u.name||"?").split(" ")[0]}
          </span>
        ))}
      </div>

      {/* 선택된 사용자의 픽 상세 */}
      {selectedUser&&(()=>{
        const u = approved.find(x=>x.uid===selectedUser);
        if(!u||!u.bracketPicks) return null;
        const bp = u.bracketPicks;
        return(
          <div style={{background:"rgba(255,255,255,.03)",borderRadius:10,padding:"12px"}}>
            <div style={{fontFamily:"'Teko',sans-serif",fontSize:14,color:"#D4A843",marginBottom:10}}>
              {u.uid===currentUid?"⭐ ":""}{u.name}
            </div>
            {ROUNDS.map(round=>{
              const {matches} = ROUND_META[round];
              const picks = [];
              for(let i=0;i<matches;i++){
                const key=`${round}_${i}`;
                if(bp[key]) picks.push({key, team:bp[key]});
              }
              if(picks.length===0) return null;
              return(
                <div key={round} style={{marginBottom:10}}>
                  <div style={{fontSize:10,color:"#5A7090",letterSpacing:".06em",marginBottom:4}}>
                    {ROUND_META[round].label[lang]} ({picks.length}/{ROUND_META[round].matches})
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                    {picks.map(p=>(
                      <span key={p.key} style={{fontSize:11,padding:"3px 8px",borderRadius:6,
                        background:"rgba(212,168,67,.1)",color:"#D4A843",border:"0.5px solid rgba(212,168,67,.2)"}}>
                        {tn(p.team,lang)}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {withPicks.length===0&&(
        <div style={{fontSize:12,color:"#5A7090",textAlign:"center",padding:"12px 0"}}>
          {lbl("아직 제출된 픽이 없습니다","No picks submitted yet")}
        </div>
      )}
    </div>
  );
}

function Dashboard({users, tournament, currentUid, lang}){
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

      {/* 상단 3카드 - 모바일: 1열, 데스크탑: 3열 */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:10,marginBottom:12}}>

        {/* Prize Pool */}
        <div style={{background:"#0C1620",border:"1px solid rgba(212,168,67,.25)",borderRadius:14,padding:"14px 16px"}}>
          <div style={{fontSize:10,color:"#5A7090",letterSpacing:".12em",marginBottom:4}}>{lbl("총 상금","PREMIO","PRIZE POOL")}</div>
          <div style={{fontFamily:"'Teko',sans-serif",fontSize:30,color:"#D4A843",lineHeight:1}}>{"$"+pool}</div>
          <div style={{fontSize:11,color:"#5A7090",marginBottom:10}}>{ranked.length} {lbl("명 × $30","× $30","paid × $30")}</div>
          <div style={{display:"flex",gap:6}}>
            {[["🥇","$"+Math.floor(pool*.5),"50%"],["🥈","$"+Math.floor(pool*.3),"30%"],["🥉","$"+Math.floor(pool*.2),"20%"]].map(([icon,amt,pct])=>(
              <div key={pct} style={{flex:1,textAlign:"center",background:"rgba(255,255,255,.04)",borderRadius:8,padding:"6px 4px",border:"0.5px solid rgba(255,255,255,.07)"}}>
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
                <div style={{fontFamily:"'Teko',sans-serif",fontSize:44,color:"#fff",lineHeight:1}}>{"#"+myRank}</div>
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
            <div style={{background:"rgba(220,38,38,.08)",border:"1px solid rgba(220,38,38,.2)",borderRadius:10,padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:4}}>
              <div>
                <span style={{fontSize:10,color:"#f87171",letterSpacing:".1em",marginRight:8}}>⏰ {lang==="ko"?"조별 픽 마감":lang==="es"?"LÍMITE DE PICKS":"GROUP PICKS DEADLINE"}</span>
                <span style={{fontSize:12,color:"#fca5a5",fontWeight:500}}>June 12, 2026 · Kickoff ET</span>
              </div>
              <span style={{fontSize:11,color:"#f87171"}}>{lang==="ko"?"마감 전 저장 필수!":lang==="es"?"¡Guarda antes del límite!":"Save before kickoff!"}</span>
            </div>
            {notPicked>0&&(()=>{
              const notPickedUsers = Object.values(users).filter(function(u){
                return u.approved&&u.paid&&Object.values(u.groupPicks||{}).reduce(function(a,b){return a+b.length;},0)===0;
              });
              return(
                <div style={{background:"rgba(245,158,11,.06)",border:"1px solid rgba(245,158,11,.25)",borderRadius:10,padding:"10px 14px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:notPickedUsers.length>0?8:0}}>
                    <span style={{fontSize:11,color:"#F59E0B",fontWeight:500}}>
                      ⚠️ {pickedCount}/{totalPaid} {lang==="ko"?"명 픽 완료":lang==="es"?" picks enviados":"picks submitted"} · {notPicked}{lang==="ko"?"명 아직 안 함":lang==="es"?" sin enviar":" yet to pick"}
                    </span>
                    <span style={{fontSize:10,color:"#D97706"}}>{lang==="ko"?"마감: 6/12 킥오프":lang==="es"?"Límite: 12 jun kickoff":"Deadline: Jun 12 kickoff"}</span>
                  </div>
                  {notPickedUsers.length>0&&(
                    <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                      {notPickedUsers.map(function(u){
                        return(
                          <div key={u.uid} style={{display:"flex",alignItems:"center",gap:5,background:"rgba(245,158,11,.1)",border:"0.5px solid rgba(245,158,11,.3)",borderRadius:20,padding:"3px 10px"}}>
                            <div style={{width:18,height:18,borderRadius:"50%",overflow:"hidden",background:"#1a2840",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#F59E0B"}}>
                              {u.photoURL
                                ? <img src={u.photoURL} style={{width:"100%",height:"100%",objectFit:"cover"}} onError={function(e){e.target.style.display="none";}}/>
                                : (u.name||"?")[0]}
                            </div>
                            <span style={{fontSize:11,color:"#F59E0B"}}>{(u.name||"?").split(" ")[0]}</span>
                            <span style={{fontSize:10}}>😴</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
            {notPicked===0&&totalPaid>0&&(
              <div style={{background:"rgba(34,197,94,.06)",border:"1px solid rgba(34,197,94,.2)",borderRadius:10,padding:"7px 14px",textAlign:"center"}}>
                <span style={{fontSize:11,color:"#22C55E"}}>✅ {lang==="ko"?"전원 픽 완료! 🎉":lang==="es"?"¡Todos enviaron sus picks! 🎉":"All "+totalPaid+" participants have submitted picks! 🎉"}</span>
              </div>
            )}
          </div>
        );
      })()}

      {/* 가젯 2개 - 모바일: 1열, 태블릿+: 2열 */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:10,marginBottom:12}}>
        <OddsWidget lang={lang} tournament={tournament}/>
        <WinProbWidget users={users} tournament={tournament} currentUid={currentUid} lang={lang}/>
      </div>

      {/* 브래킷 픽 공개 - 투명성을 위해 모든 사용자의 픽을 볼 수 있음 */}
      <PublicBracketPicks users={users} tournament={tournament} currentUid={currentUid} lang={lang}/>

      {/* 스프린트 레이스 (Phase 1+2 종합 순위) */}
      <SprintRace ranked={ranked} currentUid={currentUid} maxPts={MAX_PTS} lang={lang} users={users} tournament={tournament}/>

    </div>
  );
}




// ─── ODDS WIDGET ──────────────────────────────────────────────────────────────
function OddsWidget({lang, tournament}){
  const [odds, setOdds] = useState([]);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [matchIdx, setMatchIdx] = useState(0);

  useEffect(()=>{
    fetch('/api/odds')
      .then(r=>r.json())
      .then(d=>{
        setOdds(d.odds||[]);
        setLive(d.live||false);
        setLoading(false);
      })
      .catch(()=>setLoading(false));
  },[]);

  const lbl = lang==="ko"?"도박사 배팅 확률":lang==="es"?"PROBABILIDAD":"BOOKMAKER ODDS";
  // 킥오프 지난 경기 + 결과 있는 경기 제외
  const matchResults = tournament?.matchResults || {};
  const nowTs = Date.now();
  const filteredOdds = odds.filter(function(o){
    // id 기반으로 MATCH_SCHEDULE 매칭 (팀명 불일치 방지)
    const found = o.id
      ? MATCH_SCHEDULE.find(function(m){ return m.id===o.id; })
      : MATCH_SCHEDULE.find(function(m){
          return m.home===o.home && m.away===o.away;
        });
    if(!found) return false;
    // 킥오프 시간 지났으면 제외
    if(found.iso && nowTs >= new Date(found.iso).getTime()) return false;
    // 결과 이미 있으면 제외
    if(matchResults[found.id] || matchResults[found.id+"a"]) return false;
    return true;
  });
  const match = filteredOdds[matchIdx] || filteredOdds[0];
  // matchIdx가 범위 벗어나면 0으로 리셋
  if(matchIdx >= filteredOdds.length && filteredOdds.length > 0) setMatchIdx(0);

  if(loading) return(
    <div style={{background:"#0C1620",border:"1px solid rgba(255,255,255,.08)",borderRadius:14,padding:"14px 16px",height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <span style={{fontSize:12,color:"#5A7090"}}>Loading odds...</span>
    </div>
  );

  if(filteredOdds.length === 0) return(
    <div style={{background:"#0C1620",border:"1px solid rgba(255,255,255,.08)",borderRadius:14,padding:"20px 16px",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:6}}>
      <span style={{fontSize:20}}>✅</span>
      <span style={{fontSize:12,color:"#5A7090",textAlign:"center"}}>{lang==="ko"?"모든 예정 경기 완료":lang==="es"?"Todos los partidos completados":"All scheduled matches completed"}</span>
    </div>
  );
  if(!match) return null;

  const bars = [
    {label:tn(match.home,lang), pct:match.homeWin, color:"#60a5fa"},
    {label:lang==="ko"?"무":lang==="es"?"Empate":"Draw", pct:match.draw, color:"#9CA3AF"},
    {label:tn(match.away,lang), pct:match.awayWin, color:"#f87171"},
  ];

  return(
    <div style={{background:"#0C1620",border:"1px solid rgba(255,255,255,.08)",borderRadius:14,padding:"14px 16px",height:"100%"}}>
      {/* 헤더 */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={{fontFamily:"'Teko',sans-serif",fontSize:15,color:"#D4A843",letterSpacing:".1em"}}>
          🎲 {lbl}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:live?"#22C55E":"#F59E0B"}}/>
          <span style={{fontSize:10,color:"#5A7090"}}>{live?"Live":"Pinnacle ref"}</span>
        </div>
      </div>

      {/* 경기 선택 탭 */}
      {odds.length > 1 && (
        <div style={{display:"flex",gap:4,marginBottom:10,overflowX:"auto",paddingBottom:2}}>
          {filteredOdds.slice(0,6).map((m,i)=>(
            <button key={i} onClick={()=>setMatchIdx(i)}
              style={{flexShrink:0,fontSize:9,padding:"2px 7px",borderRadius:10,border:"0.5px solid "+(matchIdx===i?"rgba(212,168,67,.5)":"rgba(255,255,255,.1)"),background:matchIdx===i?"rgba(212,168,67,.12)":"transparent",color:matchIdx===i?"#D4A843":"#5A7090",cursor:"pointer",whiteSpace:"nowrap"}}>
              {tn(m.home,lang).split(" ")[0]} v {tn(m.away,lang).split(" ")[0]}
            </button>
          ))}
        </div>
      )}

      {/* 팀명 */}
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
        <span style={{fontSize:12,color:"#60a5fa",fontWeight:500}}>{tn(match.home,lang)}</span>
        <span style={{fontSize:10,color:"#5A7090"}}>vs</span>
        <span style={{fontSize:12,color:"#f87171",fontWeight:500}}>{tn(match.away,lang)}</span>
      </div>

      {/* 바 차트 */}
      {bars.map(function(b){
        return(
          <div key={b.label} style={{marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
              <span style={{fontSize:11,color:"#E0E8F0"}}>{b.label}</span>
              <span style={{fontSize:12,fontWeight:700,color:b.color}}>{b.pct}%</span>
            </div>
            <div style={{height:6,background:"rgba(255,255,255,.06)",borderRadius:3,overflow:"hidden"}}>
              <div style={{height:"100%",width:b.pct+"%",background:b.color,borderRadius:3,opacity:.8,transition:"width .5s ease"}}/>
            </div>
          </div>
        );
      })}

      <div style={{marginTop:8,fontSize:10,color:"#3A5070",textAlign:"right"}}>
        {match.source} · vig-removed implied prob.
      </div>
    </div>
  );
}


// ─── WIN PROBABILITY WIDGET ────────────────────────────────────────────────────
function WinProbWidget({users, tournament, currentUid, lang}){
  const [prob, setProb] = useState(null);
  const [prob2, setProb2] = useState(0);
  const [prob3, setProb3] = useState(0);
  const [trend, setTrend] = useState(null); // 'up' | 'down' | null

  useEffect(()=>{
    const approved = Object.values(users).filter(u=>u.approved&&u.paid);
    if(approved.length < 2){ setProb(100); return; }

    // ranked 형태로 변환
    const ranked = approved.map(u=>({
      uid: u.uid,
      name: u.name,
      total: calcScore({groupPicks:u.groupPicks||{},bracketPicks:u.bracketPicks||{}}, tournament).total,
      groupPicks: u.groupPicks||{},
      bracketPicks: u.bracketPicks||{},
    })).sort((a,b)=>b.total-a.total);

    const me = ranked.find(u=>u.uid===currentUid);
    if(!me){ setProb(0); return; }

    const probList = calcWinProbs(ranked, tournament);
    const myProb = probList.find(p=>p.uid===currentUid);
    const newProb = myProb ? myProb.prob : 0;
    const newProb2 = myProb ? (myProb.prob2||0) : 0;
    const newProb3 = myProb ? (myProb.prob3||0) : 0;

    setProb(prev => {
      if(prev !== null) setTrend(newProb > prev ? 'up' : newProb < prev ? 'down' : null);
      return newProb;
    });
    setProb2(newProb2);
    setProb3(newProb3);
  }, [Object.values(users).map(u=>u.uid+'_'+(u.groupPicks?Object.values(u.groupPicks).flat().join(','):'')).join('|'), JSON.stringify(tournament.groupResults||{}), JSON.stringify(tournament.matchResults||{})]);

  const lbl = lang==="ko"?"🥇 우승 확률":lang==="es"?"🥇 Mi probabilidad":"🥇 Win probability";
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
          {(prob2>0||prob3>0)&&(
            <div style={{display:"flex",gap:6,justifyContent:"center",marginTop:2}}>
              {prob2>0&&<span style={{fontSize:11,color:"#9CA3AF"}}>TOP2 {prob2}%</span>}
              {prob3>0&&<span style={{fontSize:11,color:"#9CA3AF"}}>TOP3 {prob3}%</span>}
            </div>
          )}

        {/* 설명 */}
        <div style={{flex:1}}>
          <div style={{fontSize:11,color:"#5A7090",lineHeight:1.5,marginBottom:6}}>
            {(()=>{
              var allZero = Object.values(users).filter(u=>u.approved&&u.paid).reduce(function(s,u){return s+calcScore({groupPicks:u.groupPicks||{},bracketPicks:u.bracketPicks||{}},tournament).total;},0)===0;
              if(allZero) return lang==="ko"?"첫 경기 전 — 전원 동일 확률":lang==="es"?"Antes del torneo — probabilidad igual para todos":"Pre-tournament — equal odds for all";
              return lang==="ko"?"확정 점수 + 남은 픽의 생존 가능성 기준":lang==="es"?"Basado en puntos confirmados + potencial restante":"Based on confirmed score + surviving pick potential";
            })()}
          </div>
          <div style={{fontSize:11,color:color,fontWeight:500}}>
            {prob===null?"계산 중...":
             prob>=70?(lang==="ko"?"🔥 매우 유리!":lang==="es"?"🔥 ¡Gran favorito!":"🔥 Strong favorite!"):
             prob>=40?(lang==="ko"?"💪 경쟁 중":lang==="es"?"💪 En competencia":"💪 In contention"):
             prob>=15?(lang==="ko"?"⚡ 역전 가능":lang==="es"?"⚡ Aún posible":"⚡ Still possible"):
             (lang==="ko"?"😤 기적이 필요해":lang==="es"?"😤 Necesita un milagro":"😤 Need a miracle")}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── NEXT MATCH CARD (dashboard용) ───────────────────────────────────────────
function NextMatchCard({lang}){
  const WC = [
    // June 11 (Thu)
    {date:"2026-06-11T15:00:00-04:00",teams:"Mexico vs South Africa",group:"A",time:"3:00 PM ET"},
    {date:"2026-06-11T22:00:00-04:00",teams:"South Korea vs Czechia",group:"A",time:"10:00 PM ET"},
    // June 12 (Fri)
    {date:"2026-06-12T15:00:00-04:00",teams:"Canada vs Bosnia-Herzegovina",group:"B",time:"3:00 PM ET"},
    {date:"2026-06-12T21:00:00-04:00",teams:"USA vs Paraguay",group:"D",time:"9:00 PM ET"},
    // June 13 (Sat)
    {date:"2026-06-13T15:00:00-04:00",teams:"Qatar vs Switzerland",group:"B",time:"3:00 PM ET"},
    {date:"2026-06-13T18:00:00-04:00",teams:"Brazil vs Morocco",group:"C",time:"6:00 PM ET"},
    {date:"2026-06-13T21:00:00-04:00",teams:"Haiti vs Scotland",group:"C",time:"9:00 PM ET"},
    {date:"2026-06-14T00:00:00-04:00",teams:"Australia vs Türkiye",group:"D",time:"12:00 AM ET"},
    // June 14 (Sun)
    {date:"2026-06-14T13:00:00-04:00",teams:"Germany vs Curaçao",group:"E",time:"1:00 PM ET"},
    {date:"2026-06-14T16:00:00-04:00",teams:"Netherlands vs Japan",group:"F",time:"4:00 PM ET"},
    {date:"2026-06-14T19:00:00-04:00",teams:"Ivory Coast vs Ecuador",group:"E",time:"7:00 PM ET"},
    {date:"2026-06-14T22:00:00-04:00",teams:"Sweden vs Tunisia",group:"F",time:"10:00 PM ET"},
    // June 15 (Mon)
    {date:"2026-06-15T12:00:00-04:00",teams:"Spain vs Cape Verde",group:"H",time:"12:00 PM ET"},
    {date:"2026-06-15T15:00:00-04:00",teams:"Belgium vs Egypt",group:"G",time:"3:00 PM ET"},
    {date:"2026-06-15T18:00:00-04:00",teams:"Saudi Arabia vs Uruguay",group:"H",time:"6:00 PM ET"},
    {date:"2026-06-15T21:00:00-04:00",teams:"Iran vs New Zealand",group:"G",time:"9:00 PM ET"},
    // June 16 (Tue)
    {date:"2026-06-16T15:00:00-04:00",teams:"France vs Senegal",group:"I",time:"3:00 PM ET"},
    {date:"2026-06-16T18:00:00-04:00",teams:"Iraq vs Norway",group:"I",time:"6:00 PM ET"},
    {date:"2026-06-16T21:00:00-04:00",teams:"Argentina vs Algeria",group:"J",time:"9:00 PM ET"},
    {date:"2026-06-17T00:00:00-04:00",teams:"Austria vs Jordan",group:"J",time:"12:00 AM ET"},
    // June 17 (Wed)
    {date:"2026-06-17T13:00:00-04:00",teams:"Portugal vs Congo DR",group:"K",time:"1:00 PM ET"},
    {date:"2026-06-17T16:00:00-04:00",teams:"England vs Croatia",group:"L",time:"4:00 PM ET"},
    {date:"2026-06-17T19:00:00-04:00",teams:"Ghana vs Panama",group:"L",time:"7:00 PM ET"},
    {date:"2026-06-17T22:00:00-04:00",teams:"Uzbekistan vs Colombia",group:"K",time:"10:00 PM ET"},
    // Round of 32
    {date:"2026-06-28T15:00:00-04:00",teams:"South Africa vs Canada",group:"R32",time:"3:00 PM ET"},
  ];  const [tl, setTl] = useState({d:0,h:0,m:0,s:0});
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
            {next.time&&<span style={{fontSize:10,color:"#60a5fa",marginLeft:6}}>· {next.time}</span>}
          </div>
          <div style={{display:"flex",gap:6}}>
            {[["d","day"],["h","hr"],["m","min"],["s","sec"]].map(([k,lbl])=>(
              <div key={k} style={{flex:1,textAlign:"center",background:"rgba(255,255,255,.05)",borderRadius:8,padding:"6px 2px",border:"0.5px solid rgba(255,255,255,.07)"}}>
                <div style={{fontFamily:"'Teko',sans-serif",fontSize:20,color:"#60a5fa",lineHeight:1}}>{tl[k]}</div>
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

  // 우승 확률 계산 — 살아있는 픽 기반
  useEffect(()=>{
    if(!ranked||ranked.length<2) return;
    const probList = calcWinProbs(ranked, tournament);
    const result = {};
    probList.forEach(p=>{ result[p.uid]={p1:p.prob||0, p2:p.prob2||0, p3:p.prob3||0}; });
    setWinProbs(result);
  },[ranked.map(r=>r.uid+'_'+r.total+'_'+Object.values(r.groupPicks||{}).flat().join(',')).join('|'), JSON.stringify(tournament.groupResults||{}), JSON.stringify(tournament.matchResults||{}), JSON.stringify(tournament.bracketResults||{})]);

  if(ranked.length === 0) return null;
  const topScore = Math.max(...ranked.map(r=>r.total), 1);

  // 동점자 그룹 내에서만 우승확률 높은 순으로 재정렬 (점수 순위 자체는 그대로 유지)
  const displayOrder = (function(){
    var groups = {};
    ranked.forEach(function(u){
      var key = u.total;
      if(!groups[key]) groups[key]=[];
      groups[key].push(u);
    });
    var scores = Object.keys(groups).map(Number).sort(function(a,b){return b-a;});
    var out = [];
    scores.forEach(function(s){
      var group = groups[s];
      group.sort(function(a,b){
        var pa = winProbs[a.uid]?.p1||0, pb = winProbs[b.uid]?.p1||0;
        return pb-pa;
      });
      out = out.concat(group);
    });
    return out;
  })();

  return(
    <div style={{background:"#0C1620",border:"1px solid rgba(255,255,255,.08)",borderRadius:14,padding:"14px 12px 8px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontFamily:"'Teko',sans-serif",fontSize:16,color:"#D4A843",letterSpacing:".1em"}}>
          {lang==="ko"?"순위 레이스":lang==="es"?"CARRERA":"LEADERBOARD RACE"}
        </div>
        <div style={{fontSize:11,color:"#5A7090"}}>max {maxPts} pts</div>
      </div>

      {displayOrder.map((u, i) => {
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
                position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",
                fontSize:10,color:isMe?"#D4A843":"#6b7280",fontWeight:isMe?500:400,
                pointerEvents:"none",whiteSpace:"nowrap",overflow:"hidden",maxWidth:"60%",
              }}>
                {(u.name||"?").split(" ")[0]}
              </div>
            </div>

            {/* 점수 + 확률 */}
            <div style={{textAlign:"right",flexShrink:0}}>
              <div style={{fontSize:12,fontWeight:500,color:isMe?"#D4A843":"#9CA3AF"}}>{u.total}pt</div>
              {winProbs[u.uid]!==undefined&&(
                <div style={{display:"flex",gap:3,justifyContent:"flex-end",flexWrap:"nowrap"}}>
                  <span style={{fontSize:9,color:(winProbs[u.uid].p1||0)>=30?"#22C55E":(winProbs[u.uid].p1||0)>=10?"#D4A843":"#5A7090",whiteSpace:"nowrap"}}>🥇{winProbs[u.uid].p1}%</span>
                  {winProbs[u.uid].p2>0&&<span style={{fontSize:9,color:"#5A7090",whiteSpace:"nowrap"}}>T2:{winProbs[u.uid].p2}%</span>}
                  {winProbs[u.uid].p3>0&&<span style={{fontSize:9,color:"#5A7090",whiteSpace:"nowrap"}}>T3:{winProbs[u.uid].p3}%</span>}
                </div>
              )}
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
// 2026 FIFA 공식 확정 32강 매치업 (R32_MATCHUPS와 동일 순서, WC는 third[] 배열과 순서 매칭)
// R32_MATCHUPS와 동일한 순서 - 실제 16강 대결구조까지 정확히 일치
const R32_MATCHUPS_OFFICIAL = [
  ["A2","B2"],
  ["F1","C2"],
  ["E1","WC"],   // E1 vs Paraguay(D3)
  ["I1","WC"],   // I1 vs Sweden(F3)
  ["C1","F2"],
  ["E2","I2"],
  ["A1","WC"],   // A1 vs Ecuador(E3)
  ["L1","WC"],   // L1 vs Congo DR(K3)
  ["H1","J2"],
  ["K2","L2"],
  ["G1","WC"],   // G1 vs Senegal(I3)
  ["D1","WC"],   // D1 vs Bosnia(B3)
  ["D2","G2"],
  ["J1","H2"],
  ["B1","WC"],   // B1 vs Algeria(J3)
  ["K1","WC"],   // K1 vs Ghana(L3)
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
  const [fullscreen, setFullscreen] = useState(false);
  const gr = tournament.groupResults||{};
  const bracketTeamsArrCheck = tournament.bracketTeams||[];
  const bracketHasData = bracketTeamsArrCheck.some(function(x){return x;});
  const doneCount = Object.keys(gr).length;
  const hasResults = doneCount >= 12 || bracketHasData;

  // 내 픽 팀 목록
  const me = Object.values(users).find(u=>u.uid===currentUid);
  const myPicks = new Set();
  Object.values(me?.groupPicks||{}).forEach(function(teams){ (teams||[]).forEach(function(t){myPicks.add(t);}); });

  // 조 1위/2위 결정 - Admin이 "32강 자동 채우기"로 이미 저장한 bracketTeams가 있으면 그걸 최우선 사용
  // (R32_MATCHUPS 시드 순서에 정확히 맞춰 계산된 값이라 가장 신뢰도 높음. 없으면 폴백 로직 사용.)
  const st = {};
  const third = []; // 3위팀 [팀명, 조] 목록
  const mr = tournament.matchResults || {};
  const mq = tournament.manualQualified || {};
  const bracketTeamsArr = tournament.bracketTeams || [];

  // R32_MATCHUPS 시드(A1,A2,B1...,WCn)와 bracketTeamsArr 인덱스를 매칭해서
  // 조별 1위/2위를 역으로 추출 (이미 정확하게 계산된 값이므로 재계산 불필요)
  if(bracketTeamsArr.some(function(x){return x;})){
    R32_MATCHUPS.forEach(function(seed, i){
      var team = bracketTeamsArr[i];
      if(!team) return;
      // st에 시드 키로 직접 저장 (WC 포함) - 모달의 renderR32가 st[seed]로 팀을 찾기 때문
      st[seed] = team;
      if(seed.indexOf("WC")===0) {
        // 와일드카드(3위) 팀 - 어느 조 소속인지 찾아서 third 배열에도 추가
        var ownerGroup = Object.keys(GROUPS).find(function(g){
          return (GROUPS[g].teams||[]).indexOf(team) !== -1;
        });
        if(ownerGroup && !third.some(function(w){return w.team===team;})){
          third.push({team:team, grp:ownerGroup});
        }
        return;
      }
      var g = seed[0], pos = seed[1];
      if(pos==="1") st[g+"1"] = team;
      if(pos==="2") st[g+"2"] = team;
    });
  }

  Object.entries(GROUPS).forEach(function(e){
    var grp=e[0], info=e[1];
    var advanced = gr[grp]||[];
    if(advanced.length>=1 && !st[grp+"1"]) st[grp+"1"]=advanced[0];
    if(advanced.length>=2 && !st[grp+"2"]) st[grp+"2"]=advanced[1];
    if(advanced.length>=3) third.push({team:advanced[2],grp:grp});

    // bracketTeams도 groupResults도 없는 조만 폴백: Q체크된 팀이 정확히 2명일 때만 배정
    if(!st[grp+"1"] && !st[grp+"2"]) {
      var teams = info.teams || [];
      var clinchedTeams = teams.filter(function(t){ return !!mq[t]; });
      if(clinchedTeams.length === 2) {
        var statsForSort = (computeAllGroupStats(mr)[grp]) || {};
        var sortedClinched = fifaSortGroup(clinchedTeams, statsForSort, grp, mr);
        st[grp+"1"] = sortedClinched[0];
        st[grp+"2"] = sortedClinched[1];
      } else if(clinchedTeams.length === 1) {
        st[grp+"1"] = clinchedTeams[0];
      }
      // 3명 이상이면 1·2위와 3위 와일드카드가 섞여있을 수 있어 자동 배정 안 함 (Admin이 자동채우기 버튼 사용 권장)
    }
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
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <div style={{fontFamily:"'Teko',sans-serif",fontSize:15,color:"#D4A843",letterSpacing:".1em"}}>
          ⚔️ {lang==="ko"?"32강 대진표":lang==="es"?"CUADRO DE 32":"ROUND OF 32"}
          <span style={{fontSize:10,color:"#5A7090",marginLeft:8,fontFamily:"sans-serif",letterSpacing:"normal",fontWeight:400}}>
            {lang==="ko"?"내 픽 ⭐":lang==="es"?"tus picks ⭐":"your picks ⭐"}
          </span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {!hasResults&&(
            <span style={{fontSize:11,color:"#5A7090"}}>{doneCount}/12 {lang==="ko"?"조 완료":lang==="es"?"grupos":"groups"}</span>
          )}
          <button onClick={()=>setFullscreen(true)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:8,border:"1px solid rgba(212,168,67,.35)",background:"rgba(212,168,67,.08)",color:"#D4A843",fontSize:11,fontWeight:600,cursor:"pointer",touchAction:"manipulation",whiteSpace:"nowrap"}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#D4A843" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
            {lang==="ko"?"브래킷 보기":lang==="es"?"Ver cuadro":"Full Bracket"}
          </button>
        </div>
      </div>

      {!hasResults&&doneCount===0&&!bracketHasData&&(
        <div style={{textAlign:"center",color:"#5A7090",fontSize:12,padding:"20px 0"}}>
          {lang==="ko"?"조별 결과가 모두 확정되면 공개됩니다":lang==="es"?"Se revela tras confirmar los 12 grupos":"Revealed after all 12 group results are confirmed"}
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:6}}>
        {(function(){
          var wcUsed=0;
          return R32_MATCHUPS_OFFICIAL.map(function(pair,i){
            var srcA=pair[0], srcB=pair[1];
            var teamA=st[srcA];
            var teamB, wcOwnerGrp=null;
            if(srcB==="WC"){
              var w=third[wcUsed]; wcUsed++;
              teamB=w?w.team:null; wcOwnerGrp=w?w.grp:null;
            } else {
              teamB=st[srcB];
            }
            var aMe=teamA&&myPicks.has(teamA);
            var bMe=teamB&&myPicks.has(teamB);
            var matchLabel = "M"+(73+i);

            return(
              <div key={i} style={{background:"rgba(255,255,255,.03)",border:"0.5px solid "+(aMe||bMe?"rgba(212,168,67,.25)":"rgba(255,255,255,.07)"),borderRadius:8,overflow:"hidden"}}>
                <div style={{fontSize:9,color:"#5A7090",padding:"3px 10px",borderBottom:"0.5px solid rgba(255,255,255,.05)",letterSpacing:".08em"}}>{matchLabel}</div>
                {[{src:srcA,team:teamA,isMe:aMe,wcGrp:null},{src:srcB,team:teamB,isMe:bMe,wcGrp:wcOwnerGrp}].map(function(slot,j){
                  var isWC = slot.src==="WC";
                  return(
                    <div key={j} style={{padding:"5px 10px",background:slot.isMe?"rgba(212,168,67,.12)":"transparent",borderBottom:j===0?"0.5px solid rgba(255,255,255,.05)":"none",display:"flex",alignItems:"center",gap:5}}>
                      {slot.isMe&&<span style={{fontSize:9}}>⭐</span>}
                      <span style={{fontSize:11,color:slot.isMe?"#D4A843":slot.team?"#E0E8F0":"#5A7090",flex:1}}>
                        {slot.team?tn(slot.team,lang):(isWC?"3위 WC":slot.src)}
                      </span>
                      <span style={{fontSize:9,color:"#3A5070",flexShrink:0}}>
                        {isWC?(slot.wcGrp?(slot.wcGrp+"조 3위"):"WC"):(slot.src.length===2?(slot.src[0]+"조"+(slot.src[1]==="1"?"1위":"2위")):slot.src)}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          });
        })()}
      </div>

      {third.length>0&&(
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

      {fullscreen && (
        <BracketFullscreenModal
          onClose={()=>setFullscreen(false)}
          st={st} myPicks={myPicks} lang={lang}
          bracketResults={tournament.bracketResults||{}}
        />
      )}
    </div>
  );
}

// ─── BRACKET FULLSCREEN MODAL (March Madness style) ─────────────────────────
function BracketFullscreenModal({onClose, st, myPicks, lang, bracketResults}){
  useEffect(()=>{
    var prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return ()=>{ document.body.style.overflow = prevOverflow; };
  },[]);

  // ── 자체 핀치줌/드래그 구현 (브라우저 viewport는 그대로 잠긴 상태 유지) ──
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({x:0,y:0});
  const pinchRef = useRef({dist:0, startZoom:1});
  const panRef = useRef({active:false, startX:0, startY:0, startPanX:0, startPanY:0});

  const getDist = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx*dx + dy*dy);
  };

  const onTouchStart = (e) => {
    if(e.touches.length === 2){
      pinchRef.current.dist = getDist(e.touches);
      pinchRef.current.startZoom = zoom;
    } else if(e.touches.length === 1){
      panRef.current = {active:true, startX:e.touches[0].clientX, startY:e.touches[0].clientY, startPanX:pan.x, startPanY:pan.y};
    }
  };
  const onTouchMove = (e) => {
    if(e.touches.length === 2){
      e.preventDefault();
      const newDist = getDist(e.touches);
      const scale = newDist / (pinchRef.current.dist||1);
      const newZoom = Math.max(0.5, Math.min(3, pinchRef.current.startZoom * scale));
      setZoom(newZoom);
    } else if(e.touches.length === 1 && panRef.current.active){
      // transform 순서가 translate(pan) scale(zoom) 이므로,
      // pan은 스케일 이전 좌표계 -> 화면상 dx/dy를 zoom으로 나눠야 손가락과 1:1로 맞음.
      // 90도 강제회전 상태에서는 실제 터치 이벤트 좌표축이 화면에 보이는 것과 90도 어긋나므로
      // (회전된 화면의 가로 = 원래좌표의 세로, 회전된 화면의 세로 = 원래좌표의 -가로) 보정함
      const rawDx = e.touches[0].clientX - panRef.current.startX;
      const rawDy = e.touches[0].clientY - panRef.current.startY;
      const dx = (isPortrait ? rawDy : rawDx) / zoom;
      const dy = (isPortrait ? -rawDx : rawDy) / zoom;
      setPan({x:panRef.current.startPanX+dx, y:panRef.current.startPanY+dy});
    }
  };
  const onTouchEnd = () => { panRef.current.active = false; };

  // 32강 매치업
  var R32 = {
    L: [
      {a:"A2",b:"B2"},{a:"F1",b:"C2"},{a:"E1",b:"WC1"},{a:"I1",b:"WC2"},
      {a:"C1",b:"F2"},{a:"E2",b:"I2"},{a:"A1",b:"WC3"},{a:"L1",b:"WC4"},
    ],
    R: [
      {a:"H1",b:"J2"},{a:"K2",b:"L2"},{a:"G1",b:"WC5"},{a:"D1",b:"WC6"},
      {a:"D2",b:"G2"},{a:"J1",b:"H2"},{a:"B1",b:"WC7"},{a:"K1",b:"WC8"},
    ],
  };

  var srcLabel = function(src){
    if(src.indexOf("WC")===0) return "3rd";
    return src[0]+(src[1]==="1"?" W":" R");
  };

  // ── 레이아웃 상수 ──────────────────────────────────────────────────────────
  var BOX_W = 118, BOX_H = 30, PAIR_GAP = 6;
  var ROUND_GAP = 36; // 라운드(컬럼) 간 가로 간격
  var TOP_MARGIN = 20;

  // 8개 32강 매치 -> 4개 16강 매치 -> 2개 8강 -> 1개 4강(준결승) -> 결승
  // 한쪽(L 또는 R)은 8경기(32강)->4(16강)->2(8강)->1(준결승)
  var pairHeight = function(round){ return Math.pow(2, round) * (BOX_H*2+PAIR_GAP); };
  // round 0 = 32강(8경기), round1=16강(4경기), round2=8강(2경기), round3=준결승(1경기)

  var ROUND_ROW_H = [
    BOX_H*2+PAIR_GAP,             // round0: 32강 한 매치 높이
    (BOX_H*2+PAIR_GAP)*2+PAIR_GAP, // round1: 16강 한 매치 높이(두 32강 매치를 합친 위치)
    (BOX_H*2+PAIR_GAP)*4+PAIR_GAP*3, // round2: 8강
    (BOX_H*2+PAIR_GAP)*8+PAIR_GAP*7, // round3: 준결승
  ];

  var SVG_H = 8*(BOX_H*2+PAIR_GAP) + TOP_MARGIN*2 + 40;
  var COL_W = BOX_W;
  var CENTER_GAP = 110;
  var SVG_W = COL_W*4*2 + ROUND_GAP*3*2 + CENTER_GAP + 60; // 좌우 각 4라운드 + 중앙

  var xColL = [20, 20+COL_W+ROUND_GAP, 20+2*(COL_W+ROUND_GAP), 20+3*(COL_W+ROUND_GAP)];
  var xColR = xColL.map(function(x){ return SVG_W - x - COL_W; }).reverse().map(function(x,i,arr){ return arr[arr.length-1-i]; });
  // 오른쪽은 결승쪽이 안쪽이라 역순 배치
  var xColRFixed = [
    SVG_W-20-COL_W,
    SVG_W-20-COL_W-(COL_W+ROUND_GAP),
    SVG_W-20-COL_W-2*(COL_W+ROUND_GAP),
    SVG_W-20-COL_W-3*(COL_W+ROUND_GAP),
  ];

  var br = bracketResults || {};
  var renderSlot = function(src, x, y, team, matchKey){
    var isMe = team && myPicks.has(team);
    var actualWinner = matchKey ? br[matchKey] : null;
    var isWinner = team && actualWinner && actualWinner === team;
    var isLoser = team && actualWinner && actualWinner !== team;
    var label = team ? tn(team,lang) : (src?srcLabel(src):"TBD");
    if(label.length>13) label = label.slice(0,12)+"…";
    return(
      <g key={x+"-"+y+"-"+(src||"x")} opacity={isLoser?0.4:1}>
        <rect x={x} y={y} width={BOX_W} height={BOX_H-2} rx={3}
          fill={isWinner?"rgba(34,197,94,.2)":isLoser?"rgba(239,68,68,.08)":isMe?"rgba(212,168,67,.22)":"rgba(255,255,255,.045)"}
          stroke={isWinner?"rgba(34,197,94,.6)":isLoser?"rgba(239,68,68,.2)":isMe?"#D4A843":"rgba(255,255,255,.1)"}
          strokeWidth={isWinner||isMe?1.2:0.5}/>
        <text x={x+6} y={y+BOX_H/2+2} fontSize={9.5}
          fill={isWinner?"#22C55E":isLoser?"#6B7280":isMe?"#D4A843":(team?"#E0E8F0":"#46566e")}
          fontWeight={isWinner||isMe?700:400}>
          {isWinner?"✓ ":isMe?"★ ":""}{label}
        </text>
      </g>
    );
  };

  // round0 (32강) 매치 렌더 - 실제 데이터 있음
  var renderR32 = function(m, i, xCol, isLeftSide){
    var y = TOP_MARGIN + i*(BOX_H*2+PAIR_GAP);
    var teamA = st[m.a], teamB = st[m.b]||null;  // WC 시드도 st에 포함돼 있으므로 그대로 lookup
    var midY = y + BOX_H - 1;
    var connX = isLeftSide ? xCol+BOX_W : xCol;
    var nextX = isLeftSide ? xCol+BOX_W+ROUND_GAP : xCol-ROUND_GAP;
    return(
      <g key={(isLeftSide?"L0-":"R0-")+i}>
        {renderSlot(m.a, xCol, y, teamA, "R32_"+i)}
        {renderSlot(m.b, xCol, y+BOX_H, teamB, "R32_"+i)}
        <line x1={connX} y1={y+BOX_H/2-1} x2={isLeftSide?connX+14:connX-14} y2={y+BOX_H/2-1} stroke="rgba(212,168,67,.28)" strokeWidth={1}/>
        <line x1={connX} y1={y+BOX_H*1.5-1} x2={isLeftSide?connX+14:connX-14} y2={y+BOX_H*1.5-1} stroke="rgba(212,168,67,.28)" strokeWidth={1}/>
        <line x1={isLeftSide?connX+14:connX-14} y1={y+BOX_H/2-1} x2={isLeftSide?connX+14:connX-14} y2={y+BOX_H*1.5-1} stroke="rgba(212,168,67,.28)" strokeWidth={1}/>
      </g>
    );
  };

  // 16강~4강 렌더 - bracketResults에서 실제 승자 표시 (없으면 TBD)
  // roundKey: "R16"|"QF"|"SF", prevKey: 직전 라운드 키
  var renderLiveRound = function(roundKey, prevKey, roundIdx, numMatches, xCol, isLeftSide, baseRowH, offset){
    var off = offset || 0;
    var boxes = [];
    for(var i=0;i<numMatches;i++){
      var y = TOP_MARGIN + i*baseRowH + baseRowH/2 - BOX_H;
      var connX = isLeftSide ? xCol+BOX_W : xCol;
      var teamA = br[prevKey+"_"+(off+i*2)] || null;
      var teamB = br[prevKey+"_"+(off+i*2+1)] || null;
      var matchKey = roundKey+"_"+(off/2+i);
      var winner = br[matchKey] || null;
      // 사용자 픽 체크
      var myPickForMatch = myPicks && myPicks.has ? (myPicks.has(teamA)?teamA:myPicks.has(teamB)?teamB:null) : null;
      boxes.push(
        <g key={"R"+roundIdx+"-"+i}>
          {renderSlot(null, xCol, y, teamA, matchKey)}
          {renderSlot(null, xCol, y+BOX_H, teamB, matchKey)}
          {roundIdx<3&&<>
            <line x1={connX} y1={y+BOX_H/2-1} x2={isLeftSide?connX+14:connX-14} y2={y+BOX_H/2-1} stroke={winner?"rgba(212,168,67,.3)":"rgba(255,255,255,.1)"} strokeWidth={0.8}/>
            <line x1={connX} y1={y+BOX_H*1.5-1} x2={isLeftSide?connX+14:connX-14} y2={y+BOX_H*1.5-1} stroke={winner?"rgba(212,168,67,.3)":"rgba(255,255,255,.1)"} strokeWidth={0.8}/>
            <line x1={isLeftSide?connX+14:connX-14} y1={y+BOX_H/2-1} x2={isLeftSide?connX+14:connX-14} y2={y+BOX_H*1.5-1} stroke={winner?"rgba(212,168,67,.3)":"rgba(255,255,255,.1)"} strokeWidth={0.8}/>
          </>}
        </g>
      );
    }
    return boxes;
  };

  var roundLabels = lang==="ko"
    ? ["32강","16강","8강","4강"]
    : ["R32","R16","QF","SF"];

  // 화면이 세로(portrait)면 CSS로 강제 90도 회전시켜 가로처럼 보이게 함
  // 모달이 열리는 순간의 방향을 한 번만 고정 (실기기 회전/resize에도 절대 안 바뀜 -> 깜빡임 방지)
  const [isPortrait] = useState(()=> typeof window !== "undefined" && window.innerHeight > window.innerWidth);
  const [lockedW] = useState(()=> typeof window !== "undefined" ? window.innerWidth : 375);
  const [lockedH] = useState(()=> typeof window !== "undefined" ? window.innerHeight : 667);

  var rotateStyle = isPortrait ? {
    position:"fixed", top:"50%", left:"50%",
    width:lockedH, height:lockedW,
    transform:"translate(-50%,-50%) rotate(90deg)",
    transformOrigin:"center center",
  } : { position:"fixed", inset:0 };

  return(
    <div style={{...rotateStyle,background:"#04080F",zIndex:9999,display:"flex",flexDirection:"column"}}>
      {/* 헤더 */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",borderBottom:"1px solid rgba(255,255,255,.08)",flexShrink:0,background:"#0C1620"}}>
        <div style={{fontFamily:"'Teko',sans-serif",fontSize:16,color:"#D4A843",letterSpacing:".1em"}}>
          🏆 {lang==="ko"?"토너먼트 대진표":"TOURNAMENT BRACKET"}
        </div>
        <button onClick={onClose} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 14px",borderRadius:8,border:"1px solid rgba(255,255,255,.15)",background:"rgba(255,255,255,.06)",color:"#E0E8F0",fontSize:12,cursor:"pointer",touchAction:"manipulation"}}>
          ✕ {lang==="ko"?"닫기":lang==="es"?"Cerrar":"Close"}
        </button>
      </div>

      {/* 자체 핀치줌+드래그 가능한 브래킷 영역 (브라우저 줌과 완전 분리) */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{flex:1,overflow:"hidden",touchAction:"none",position:"relative",background:"#04080F"}}
      >
        <div style={{
          position:"absolute",top:"50%",left:"50%",
          transform:`translate(-50%,-50%) translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
          transformOrigin:"center center",
          transition: panRef.current.active ? "none" : "transform 0.05s linear",
        }}>
          <svg width={SVG_W} height={SVG_H} style={{display:"block"}}>
            {/* 라운드 라벨 (위쪽) */}
            {roundLabels.map(function(lbl,i){
              return(
                <g key={"lblL"+i}>
                  <text x={xColL[i]+BOX_W/2} y={12} textAnchor="middle" fontSize={9} fill="#5A7090" letterSpacing="1">{lbl}</text>
                </g>
              );
            })}
            {roundLabels.map(function(lbl,i){
              return(
                <g key={"lblR"+i}>
                  <text x={xColRFixed[i]+BOX_W/2} y={12} textAnchor="middle" fontSize={9} fill="#5A7090" letterSpacing="1">{lbl}</text>
                </g>
              );
            })}

            {/* 중앙 결승 */}
            <text x={SVG_W/2} y={SVG_H/2-26} textAnchor="middle" fontSize={26}>🏆</text>
            <text x={SVG_W/2} y={SVG_H/2} textAnchor="middle" fontSize={12} fill="#D4A843" fontFamily="'Teko',sans-serif" letterSpacing="2">
              {lang==="ko"?"결승":"FINAL"}
            </text>
            <text x={SVG_W/2} y={SVG_H/2+15} textAnchor="middle" fontSize={8} fill="#5A7090">Jul 19</text>

            {/* 32강 (실데이터) - 왼쪽 */}
            {R32.L.map(function(m,i){ return renderR32(m,i,xColL[0],true); })}
            {/* 16강,8강,4강 실데이터 - 왼쪽 (R32 0~7 기반) */}
            {renderLiveRound("R16","R32",1,4,xColL[1],true,(BOX_H*2+PAIR_GAP)*2,0)}
            {renderLiveRound("QF","R16",2,2,xColL[2],true,(BOX_H*2+PAIR_GAP)*4,0)}
            {renderLiveRound("SF","QF",3,1,xColL[3],true,(BOX_H*2+PAIR_GAP)*8,0)}

            {/* 32강 (실데이터) - 오른쪽 */}
            {R32.R.map(function(m,i){ return renderR32(m,i,xColRFixed[0],false); })}
            {/* 16강,8강,4강 실데이터 - 오른쪽 (R32 8~15 기반) */}
            {renderLiveRound("R16","R32",1,4,xColRFixed[1],false,(BOX_H*2+PAIR_GAP)*2,8)}
            {renderLiveRound("QF","R16",2,2,xColRFixed[2],false,(BOX_H*2+PAIR_GAP)*4,8)}
            {renderLiveRound("SF","QF",3,1,xColRFixed[3],false,(BOX_H*2+PAIR_GAP)*8,4)}
          </svg>
        </div>

        {/* 줌 리셋 버튼 */}
        <button
          onClick={()=>{setZoom(1);setPan({x:0,y:0});}}
          style={{position:"absolute",bottom:14,right:14,padding:"8px 14px",borderRadius:8,border:"1px solid rgba(255,255,255,.2)",background:"rgba(12,22,32,.9)",color:"#D4A843",fontSize:11,touchAction:"manipulation"}}>
          ⟲ {lang==="ko"?"초기화":"Reset"}
        </button>
        <div style={{position:"absolute",top:8,left:0,right:0,textAlign:"center",fontSize:10,color:"#3A5070",pointerEvents:"none"}}>
          {lang==="ko"?"두 손가락으로 줌 · 한 손가락으로 이동":"pinch to zoom · drag to pan"}
        </div>
      </div>
    </div>
  );
}


// ─── WIN PROBABILITY CALCULATOR ───────────────────────────────────────────────
// 포커 토너먼트 방식:
// 각 유저의 "잠재점수" = 현재점수 + 아직 확정 안 된 픽팀들의 기대점수
// 살아있는 팀(아직 결과 없는 조의 픽)이 많을수록 잠재점수 높음
// Monte Carlo: 잠재점수 기반으로 랜덤 변동 부여 후 1등 횟수 집계
// matchResults 기반으로 각 팀의 현재 진출 확률(0~1)을 추정
// - 조가 이미 확정(groupResults 있음): 1위/2위면 1.0, 아니면 0.0
// - 조 진행 중: 승점+득실차 기반으로 1~2위 안에 들 확률 추정 (간단한 순위 기반 휴리스틱)

// ─── 32강 진출 여부 판정 (1·2위 자동진출 + 3위 와일드카드 상위 8개) ──────────
// 전체 12개조의 현재 stats를 한번에 계산
function computeAllGroupStats(matchResults) {
  var allStats = {}; // {group: {team: {pts,gd,gf,ga,played}}}
  Object.keys(GROUPS).forEach(function(grp){
    var teams = GROUPS[grp].teams;
    var stats = {};
    teams.forEach(function(t){ stats[t] = {pts:0,gd:0,gf:0,ga:0,played:0}; });
    MATCH_SCHEDULE.forEach(function(m){
      if(m.group !== grp) return;
      var r = matchResults[m.id] || matchResults[m.id+"a"];
      if(!r) return;
      var h = parseInt(r.home), a = parseInt(r.away);
      if(isNaN(h) || isNaN(a)) return;
      if(!stats[m.home] || !stats[m.away]) return;
      stats[m.home].played++; stats[m.away].played++;
      stats[m.home].gf+=h; stats[m.home].ga+=a;
      stats[m.away].gf+=a; stats[m.away].ga+=h;
      stats[m.home].gd = stats[m.home].gf - stats[m.home].ga;
      stats[m.away].gd = stats[m.away].gf - stats[m.away].ga;
      if(h>a) stats[m.home].pts += 3;
      else if(h<a) stats[m.away].pts += 3;
      else { stats[m.home].pts++; stats[m.away].pts++; }
    });
    allStats[grp] = stats;
  });
  return allStats;
}

// 전체 12개조 기준 "이 팀이 32강에 갈 수 있는가"를 0~1 확률로 추정
// 32강 탈락이 수학적으로 확정된 팀인지 (3·4위 둘 다 + 자신 포함 4팀 중 최소 2팀이 확실히 위에 있음)
function isTeamEliminated(team, group, tournament) {
  var gr = tournament.groupResults || {};
  if(gr[group]) return !gr[group].includes(team);

  var mr = tournament.matchResults || {};
  var allStats = computeAllGroupStats(mr);
  var myGroupTeams = (GROUPS[group]&&GROUPS[group].teams)||[];
  var myStats = allStats[group] || {};
  if(!myStats[team]) return false;

  var maxPlayed = Math.max.apply(null, myGroupTeams.map(function(t){ return (myStats[t]||{played:0}).played; }));
  if(maxPlayed === 0) return false;

  var h2h = buildHeadToHead(group, mr);
  var myMax = myStats[team].pts + (3-myStats[team].played)*3; // 내가 남은 경기 다 이겨도 도달 가능한 최대 점수
  var others = myGroupTeams.filter(function(t){ return t !== team; });

  var teamsAboveMeForSure = 0;
  others.forEach(function(other){
    if(myStats[other].pts > myMax) {
      teamsAboveMeForSure++;
    } else if(myStats[other].pts === myMax) {
      // 동률 가능 -> 맞대결로 확정 우위 있는지 확인
      var otherH2H = (h2h[other]||{})[team];
      var myH2H = (h2h[team]||{})[other];
      var otherPts = otherH2H ? otherH2H.pts : null;
      var myPts = myH2H ? myH2H.pts : 0;
      if(otherPts !== null && otherPts > myPts) teamsAboveMeForSure++;
    }
  });

  // 3개 팀 중 최소 2팀이 확실히 나보다 위 -> 나는 3위 이하로 확정 -> 32강(1·2위+WC) 중 1·2위는 탈락
  // 단, 3위로라도 와일드카드 갈 가능성은 별도이므로, 완전 탈락은 "3위 와일드카드 가능성도 없을 때"만
  if(teamsAboveMeForSure < 2) return false;

  // 안전장치: 다른 조들이 아직 안 끝났으면, 그 결과에 따라 와일드카드 컷오프 자체가 바뀔 수 있어
  // "탈락 확정" 표시는 모든 12개 조가 다 끝났을 때만 보여줌 (애매한 조기 판정으로 오해를 주지 않도록)
  var mr2 = tournament.matchResults || {};
  var allGroupsFinished = Object.keys(GROUPS).every(function(g){
    var gTeams = GROUPS[g].teams;
    var gStats = computeAllGroupStats(mr2)[g] || {};
    var gMaxPlayed = Math.max.apply(null, gTeams.map(function(t){ return (gStats[t]||{played:0}).played; }));
    return gMaxPlayed >= 3;
  });
  if(!allGroupsFinished) return false; // 다른 조가 안 끝났으면 보수적으로 "탈락 아님"으로 표시

  // 모든 조가 끝난 경우에만 와일드카드 가능성까지 확인
  var advProb = estimateAdvanceTo32(team, group, tournament);
  return advProb <= 0.03;
}


// 두 팀(현재 1위, 2위) 사이의 순서가 남은 경기 결과와 무관하게 100% 고정되는지 확인.
// 둘 다 32강 진출은 확정이어도, "누가 1위/2위인지"는 마지막 경기로 바뀔 수 있음 -> 브래킷 시딩에 중요.
function isOrderLocked(teamHigher, teamLower, group, tournament) {
  var gr = tournament.groupResults || {};
  if(gr[group]) return true; // 조 전체 확정이면 순서도 확정

  var mr = tournament.matchResults || {};
  var allStats = computeAllGroupStats(mr);
  var stats = allStats[group] || {};
  if(!stats[teamHigher] || !stats[teamLower]) return false;

  var higherMin = stats[teamHigher].pts; // 더 안 뛰어도 최소 보장 점수(현재값, 내려갈 일 없음)
  var lowerMax = stats[teamLower].pts + (3-stats[teamLower].played)*3; // 낮은팀 최대가능점수
  var lowerFullyPlayed = stats[teamLower].played >= 3;

  if(higherMin > lowerMax) return true; // 낮은팀이 다 이겨도 못 따라옴 -> 순서 고정

  if(higherMin === lowerMax) {
    // 동률 가능 -> 맞대결로 우선권 있는지 확인
    var h2h = buildHeadToHead(group, mr);
    var higherH2H = (h2h[teamHigher]||{})[teamLower];
    var lowerH2H = (h2h[teamLower]||{})[teamHigher];
    var higherPts = higherH2H ? higherH2H.pts : null;
    var lowerPts = lowerH2H ? lowerH2H.pts : 0;
    if(higherPts !== null && higherPts > lowerPts) return true; // 맞대결 우위 -> 순서 고정
    // 맞대결도 동률(또는 안 만남) -> 상대 경기가 모두 끝났으면 전체 득실차/득점까지 최종 비교
    if(lowerFullyPlayed) {
      if(stats[teamHigher].gd > stats[teamLower].gd) return true;
      if(stats[teamHigher].gd === stats[teamLower].gd && stats[teamHigher].gf >= stats[teamLower].gf) return true;
    }
  }
  return false; // 마지막 경기 결과에 따라 순서가 바뀔 수 있음
}


// 8개 와일드카드 자리를 두고 12개 조 3위가 경쟁하는 구조를 "전역 최악의 시나리오"로 정확히 계산.
// 각 미완료 조마다, 남은 한 경기의 모든 결과(승/무/패 x 다양한 골차)를 시도해서
// "그 조에서 나올 수 있는 가장 강력한 3위 후보"의 (pts,gd,gf)를 구하고,
// 이미 끝난 조의 3위들과 합쳐서 전체 12개를 정렬한 뒤 내 팀의 순위를 매김.
// 순위가 8위 이내면 확정.
function computeGlobalThirdPlaceRank(myTeam, myGroup, tournament) {
  var gr = tournament.groupResults || {};
  var mr = tournament.matchResults || {};
  var allStats = computeAllGroupStats(mr);

  function cmpRank(a, b) {
    return (b.pts - a.pts) || (b.gd - a.gd) || (b.gf - a.gf);
  }

  // 다른 11개 조: 각 조의 "최악의 시나리오 3위"(그 조에서 나올 수 있는 가장 강력한 3위 후보) 계산
  // 내 조(myGroup): 위와 같은 방식이 아니라, "myTeam 자신이 3위가 되는 시나리오 중 myTeam에게 가장 유리한 라인"을 계산
  // (myTeam의 글로벌 순위를 정확히 보려면 myTeam 본인의 최선 시나리오를 써야 함 - 다른 조는 "나를 위협하는 최악"을 쓰는 게 맞지만,
  //  내 조 자체는 "내가 3위가 되는 경우 내가 어떤 라인으로 들어가는지"를 봐야 함)
  var entries = [];

  Object.keys(GROUPS).forEach(function(grp) {
    var teams = GROUPS[grp].teams;
    var stats = allStats[grp] || {};
    var maxPlayed = Math.max.apply(null, teams.map(function(t){ return (stats[t]||{played:0}).played; }));
    var isMyGroup = (grp === myGroup);

    if (gr[grp] || maxPlayed >= 3) {
      var sorted = fifaSortGroup(teams, stats, grp, mr);
      var third = sorted[2];
      entries.push({grp: grp, team: third, pts: stats[third].pts, gd: stats[third].gd, gf: stats[third].gf});
      return;
    }

    var remainingMatches = MATCH_SCHEDULE.filter(function(m) {
      return m.group === grp && !mr[m.id] && !mr[m.id + "a"];
    });
    if (remainingMatches.length === 0) {
      var sorted2 = fifaSortGroup(teams, stats, grp, mr);
      var third2 = sorted2[2];
      entries.push({grp: grp, team: third2, pts: stats[third2].pts, gd: stats[third2].gd, gf: stats[third2].gf});
      return;
    }

    var outcomes = ["home", "draw", "away"];
    var margins = [0, 1, 2, 3, 4, 5];
    var best = null; // 다른 조: "이 조의 3위가 가장 강력해지는" 시나리오
    var bestForMyTeam = null; // 내 조일 때만: "myTeam이 3위가 되면서 myTeam에게 가장 좋은" 시나리오

    function tryAllCombos(idx, simStats) {
      if (idx >= remainingMatches.length) {
        var teamList = Object.keys(simStats);
        teamList.forEach(function(t){ simStats[t].gd = simStats[t].gf - simStats[t].ga; });
        var sorted3 = teamList.slice().sort(function(a, b) { return cmpRank(simStats[a], simStats[b]); });
        var thirdTeam = sorted3[2];
        var cand = { team: thirdTeam, pts: simStats[thirdTeam].pts, gd: simStats[thirdTeam].gd, gf: simStats[thirdTeam].gf };
        if (!best || cmpRank(best, cand) > 0) best = cand;

        if (isMyGroup && thirdTeam === myTeam) {
          // myTeam이 실제로 3위가 되는 시나리오 중, myTeam 입장에서 가장 유리한(=순위가 가장 높아지는) 라인을 채택
          if (!bestForMyTeam || cmpRank(bestForMyTeam, cand) > 0) bestForMyTeam = cand;
        }
        return;
      }
      var m = remainingMatches[idx];
      outcomes.forEach(function(outcome) {
        margins.forEach(function(margin) {
          var copy = JSON.parse(JSON.stringify(simStats));
          if (outcome === "home") {
            var g = 1 + margin;
            copy[m.home].pts += 3; copy[m.home].gf += g; copy[m.away].ga += g;
          } else if (outcome === "away") {
            var g2 = 1 + margin;
            copy[m.away].pts += 3; copy[m.away].gf += g2; copy[m.home].ga += g2;
          } else {
            copy[m.home].pts += 1; copy[m.away].pts += 1;
            copy[m.home].gf += 1; copy[m.home].ga += 1; copy[m.away].gf += 1; copy[m.away].ga += 1;
          }
          tryAllCombos(idx + 1, copy);
        });
      });
    }

    var initStats = {};
    teams.forEach(function(t){ initStats[t] = { pts: stats[t].pts, gf: stats[t].gf, ga: stats[t].ga }; });
    tryAllCombos(0, initStats);

    if (isMyGroup) {
      // myTeam이 3위가 되는 시나리오가 전혀 없으면(항상 1·2위거나 항상 4위면) -> 그 사실 그대로 사용
      // (1·2위면 이 함수가 호출될 일이 없고, 항상 4위면 와일드카드 자체가 불가능하므로 매우 낮은 라인 부여)
      entries.push(bestForMyTeam
        ? { grp: grp, team: myTeam, pts: bestForMyTeam.pts, gd: bestForMyTeam.gd, gf: bestForMyTeam.gf }
        : { grp: grp, team: myTeam, pts: -1, gd: -99, gf: -99 });
    } else {
      entries.push({ grp: grp, team: best.team, pts: best.pts, gd: best.gd, gf: best.gf });
    }
  });

  entries.sort(cmpRank);
  var myEntry = entries.find(function(e){ return e.grp === myGroup; });
  var rank = entries.indexOf(myEntry) + 1;
  return rank; // 1~12
}


function estimateAdvanceTo32(team, group, tournament) {
  var gr = tournament.groupResults || {};
  if(gr[group]) return gr[group].includes(team) ? 1 : 0;

  // 서버에서 미리 계산된 값이 있으면 그걸 그대로 사용 (없으면 기존 클라이언트 계산으로 안전하게 폴백)
  var precomputed = tournament.clinchStatus;
  if(precomputed && team in precomputed) return precomputed[team];

  var mr = tournament.matchResults || {};
  var allStats = computeAllGroupStats(mr);
  var myGroupTeams = (GROUPS[group]&&GROUPS[group].teams)||[];
  var myStats = allStats[group] || {};
  if(!myStats[team]) return 0.5;

  var maxPlayed = Math.max.apply(null, myGroupTeams.map(function(t){ return (myStats[t]||{played:0}).played; }));
  if(maxPlayed === 0) return 0.5; // 조 시작 전

  // 1) 그룹 내 순위 (FIFA 헤드투헤드 타이브레이커 적용)
  var sortedInGroup = fifaSortGroup(myGroupTeams, myStats, group, mr);
  var rankInGroup = sortedInGroup.indexOf(team); // 0~3

  // 2) 1·2위면: 32강행 여부만 중요 (정확히 몇 위인지는 무관).
  // 내가 3위 이하로 밀리려면 "다른 팀 중 최소 2팀"이 나를 동시에 추월해야 함
  // (둘 중 하나만 추월해도 나는 2위로 밀릴 뿐, 32강은 여전히 확정).
  // 단, 추월 가능한 팀이 1팀뿐이어도 "그 팀과의 직접 맞대결에서 내가 졌다면" 주의 필요 없음(이미 반영됨).
  if(rankInGroup < 2) {
    var h2h = buildHeadToHead(group, mr);
    var others = myGroupTeams.filter(function(t){ return t !== team; });

    // 각 도전자가 "나를 추월할 수 있는지"만 우선 판정 (동률 시 맞대결 -> 그래도 동률이면 골득실/득점으로 확인)
    // 단, 이미 나보다 위인 팀(1위 자리에서 나를 보는 경우의 상대 1위)은 "동료"로 취급해 카운트하지 않음:
    // 그 팀과 내가 순서를 바꿔도 둘 다 1·2위 안에 남으므로 무해함.
    var canOvertakeCount = 0;
    others.forEach(function(other){
      var otherRank = sortedInGroup.indexOf(other);
      var otherMax = myStats[other].pts + (3-myStats[other].played)*3;
      var otherFullyPlayed = myStats[other].played >= 3;

      function flagOvertake(){
        // other가 현재 1·2위 그룹(rank 0 또는 1) 안에 있다면, 나와 순서가 바뀌어도
        // 둘 다 여전히 1·2위 안에 남으므로 무해(동료) -> 카운트하지 않음.
        // other가 현재 3·4위(rank 2 또는 3)라면, 나를 밀어내고 들어오는 진짜 위협 -> 카운트.
        if(otherRank <= 1) return; // 1·2위 동료 -> 무해
        canOvertakeCount++;
      }

      if(myStats[team].pts > otherMax) return; // 못 따라옴
      if(myStats[team].pts === otherMax) {
        var myH2H = (h2h[team]||{})[other];
        var otherH2H = (h2h[other]||{})[team];
        var myH2HPts = myH2H ? myH2H.pts : null;
        var otherH2HPts = otherH2H ? otherH2H.pts : null;
        if(myH2HPts !== null && myH2HPts > (otherH2HPts||0)) return; // 맞대결 우위로 안전
        if(otherFullyPlayed) {
          if(myStats[team].gd > myStats[other].gd) return; // 득실차로 안전
          if(myStats[team].gd === myStats[other].gd && myStats[team].gf >= myStats[other].gf) return; // 득점까지 동률이상 안전
        }
        flagOvertake();
      } else {
        flagOvertake();
      }
    });

    // 나를 밀어낼 수 있는 "3·4위 도전자"가 0명이면 -> 1·2위 둘 다 안전 -> 32강 확정
    if(canOvertakeCount === 0) return 1;

    // 1명 이상이 나를 밀어낼 수 있으면 -> 3위 이하로 떨어질 위험 있음 -> 진행도 기반 확률
    var thirdInGroup = sortedInGroup[2];
    var progress = myStats[team].played / 3;
    var gapToThird = myStats[team].pts - (thirdInGroup ? myStats[thirdInGroup].pts : 0);
    var conf = Math.min(1, gapToThird/6);
    return Math.max(0.5, Math.min(0.98, 0.6 + 0.3*progress + 0.08*conf));
  }

  // 3) 4위인 경우: 먼저 "3위로 올라갈 수 있는지"부터 확인해야 함 (3위는 와일드카드 후보)
  // 4위가 3위를 추월하려면, 현재 3위 팀의 최대가능점수를 내가 넘어서야 함
  if(rankInGroup >= 3) {
    var thirdPlaceTeam = sortedInGroup[2];
    var myMaxAsFourth = myStats[team].pts + (3-myStats[team].played)*3;
    if(!thirdPlaceTeam) return 0.05;
    var thirdMaxAtMyRank = myStats[thirdPlaceTeam].pts; // 3위의 현재 점수 (이미 확정된 부분)
    // 내가 3위를 절대 못 넘을 상황(남은경기 다 이겨도 3위 현재점수보다 낮음)이면 탈락 직전
    if(myMaxAsFourth < thirdMaxAtMyRank) return 0.02;
    if(myMaxAsFourth === thirdMaxAtMyRank) {
      // 동률 가능 -> 맞대결 확인
      var h2hVs3rd = buildHeadToHead(group, mr);
      var my3rdH2H = (h2hVs3rd[team]||{})[thirdPlaceTeam];
      var third4thH2H = (h2hVs3rd[thirdPlaceTeam]||{})[team];
      var myPtsVs3rd = my3rdH2H ? my3rdH2H.pts : 0;
      var thirdPtsVs4th = third4thH2H ? third4thH2H.pts : 0;
      if(thirdPtsVs4th > myPtsVs3rd) return 0.03; // 맞대결도 불리 -> 거의 탈락
    }
    // 4위지만 아직 3위 추월 가능성이 남아있음 -> 진행도 기반 낮은 확률 (탈락 임박이지만 100%는 아님)
    var progress4th = myStats[team].played / 3;
    var gapBehind = thirdMaxAtMyRank - myStats[team].pts;
    return Math.max(0.05, Math.min(0.45, 0.3 - 0.1*progress4th - 0.03*gapBehind));
  }

  // 4) 3위인 경우: 다른 11개 조의 "각 조 최악의 시나리오(3위 후보가 도달 가능한 최강 라인)"까지
  // 전부 반영한 전역 순위로 정확히 판정. 그 전역 순위가 8위 이내면 100% 확정(1), 8위 밖이면 탈락 위험.
  var globalRank = computeGlobalThirdPlaceRank(team, group, tournament);
  if(globalRank <= 8) return 1; // 모든 조가 최악으로 흘러가도 8위 안 -> 수학적 확정
  // 8위 밖이면, 진행도 + 격차 기반 확률로 추정 (완전 탈락 단정은 아님)
  var progress = myStats[team].played / 3;
  var distOver = globalRank - 8; // 8위를 얼마나 넘었는지
  return Math.max(0.05, Math.min(0.45, 0.3 - 0.05*distOver - 0.1*progress));
}



// 포커 방식: "지금 이 순간의 확정 점수"만으로 우승확률 계산.
// 미확정 픽의 미래 기대값은 반영하지 않음 -> 점수가 같으면 확률도 동일.
// 픽이 실제로 탈락/진출 확정되는 "그 순간"에 점수(total)가 바뀌면서 확률도 자연히 갈림.
// 한 유저의 "남은 잠재 점수" 계산: 아직 결과 안 난 조의 픽들 중,
// 탈락 확정된 픽은 0, 그 외는 진출확률 기반 기대값 합산
function calcRemainingPotential(user, tournament) {
  var gr = tournament.groupResults || {};
  var mq = tournament.manualQualified || {};
  var mo = tournament.manualOut || {};
  var br = tournament.bracketResults || {};
  var potential = 0;

  // Phase 1: 그룹 픽 잠재력
  Object.entries(user.groupPicks||{}).forEach(function(e){
    var grp = e[0], teams = e[1]||[];
    if(gr[grp]) return;
    teams.forEach(function(team){
      potential += (mq[team] ? 1 : (mo[team] ? 0 : 0.5)) * 3;
    });
  });

  // Phase 2: 브래킷 픽 잠재력
  // - 결과 확정된 경기: 스킵 (calcScore가 처리)
  // - 미확정 경기: 픽한 팀이 직전 라운드에서 살아있으면 50% 기대값, 탈락했으면 0
  var ROUNDS = ["R32","R16","QF","SF","F"];
  var ROUND_PTS = {R32:5,R16:10,QF:15,SF:20,F:30};
  var ROUND_MATCHES = {R32:16,R16:8,QF:4,SF:2,F:1};

  // 탈락 확정된 팀 목록 구성: br에서 winner가 아닌 참가팀
  // 브래킷Teams 없이도: 이전 라운드 결과에서 winner가 있으면 그 상대가 탈락
  // 각 경기 key → winner 매핑에서, 픽한 팀이 그 라운드 i번 경기 winner인지 확인
  ROUNDS.forEach(function(round){
    var ri = ROUNDS.indexOf(round);
    var pts = ROUND_PTS[round];
    var matches = ROUND_MATCHES[round];
    for(var i=0;i<matches;i++){
      var key = round+"_"+i;
      var myPick = user.bracketPicks && user.bracketPicks[key];
      if(!myPick) continue;
      if(br[key] !== undefined) continue; // 이미 확정 → 스킵

      // 이전 라운드에서 myPick이 살아있는지 확인
      var alive = true;
      if(ri > 0){
        var prev = ROUNDS[ri-1];
        // 이 round i번 경기에 feeder: prev_(i*2) 와 prev_(i*2+1)
        var slotA = prev+"_"+(i*2);
        var slotB = prev+"_"+(i*2+1);
        var winA = br[slotA]; // undefined=미확정, string=확정승자
        var winB = br[slotB];
        // slotA 결과 확정됐는데 myPick이 아님 → myPick이 slotA에서 졌을 가능성
        // slotB 결과 확정됐는데 myPick이 아님 → myPick이 slotB에서 졌을 가능성
        // 둘 다 확정됐고 둘 다 myPick이 아니면 → 이 round에 myPick이 올라올 방법 없음
        var lostA = winA !== undefined && winA !== myPick;
        var lostB = winB !== undefined && winB !== myPick;
        if(lostA && lostB) { alive = false; } // 두 feeder 모두 다른 팀이 이김
        else if(ri === 1 && (lostA || lostB)) { alive = false; } // R16은 feeder가 R32 1경기뿐
      }
      if(alive) potential += pts * 0.5;
    }
  });

  // 우승 보너스 잠재력
  if(user.bracketPicks && user.bracketPicks["F_0"] && br["F_0"] === undefined){
    potential += 20; // 40점 * 0.5
  }

  return potential;
}

function calcWinProbs(ranked, tournament) {
  var N = ranked ? ranked.length : 0;
  if(N < 2) return (ranked||[]).map(function(u){return {uid:u.uid,prob:100};});
  var br = tournament.bracketResults || {};
  var ROUNDS = ["R32","R16","QF","SF","F"];
  var ROUND_PTS = {R32:5,R16:10,QF:15,SF:20,F:30};
  var ROUND_MATCHES = {R32:16,R16:8,QF:4,SF:2,F:1};

  // 미확정 경기 중 사용자들이 실제로 픽한 후보팀 수집
  var pending = {};
  ranked.forEach(function(u){
    Object.entries(u.bracketPicks||{}).forEach(function(e){
      var key=e[0], team=e[1];
      if(!team || br[key]!==undefined) return;
      if(!pending[key]) pending[key]=[];
      if(pending[key].indexOf(team)===-1) pending[key].push(team);
    });
  });
  var pendingKeys = Object.keys(pending).sort(function(a,b){
    var ra=a.split("_")[0], rb=b.split("_")[0];
    var ri=ROUNDS.indexOf(ra)-ROUNDS.indexOf(rb);
    if(ri!==0) return ri;
    return parseInt(a.split("_")[1])-parseInt(b.split("_")[1]);
  });

  if(pendingKeys.length===0){
    // 모든 경기 확정 - 현재 점수가 최종
    var scores = ranked.map(function(u){return u.total||0;});
    var maxS = Math.max.apply(null,scores);
    var winners = ranked.filter(function(u){return (u.total||0)===maxS;});
    return ranked.map(function(u){
      return {uid:u.uid, prob: (u.total||0)===maxS ? Math.round(100/winners.length) : 0};
    });
  }

  // 현재 확정 점수
  var baseScores = {};
  ranked.forEach(function(u){ baseScores[u.uid] = u.total||0; });

  // 몬테카를로 시뮬레이션 (3000회 - 모바일에서 가볍게)
  var winCounts = {};
  ranked.forEach(function(u){ winCounts[u.uid]={p1:0,p2:0,p3:0}; });
  var N_SIM = 3000;

  for(var sim=0;sim<N_SIM;sim++){
    // 각 미확정 경기에서 픽된 팀 중 랜덤 선택
    var simRes = {};
    pendingKeys.forEach(function(key){
      var candidates = pending[key];
      simRes[key] = candidates[Math.floor(Math.random()*candidates.length)];
    });

    // 각 사용자 최종 점수
    var finalScores = {};
    ranked.forEach(function(u){
      var score = baseScores[u.uid];
      pendingKeys.forEach(function(key){
        if((u.bracketPicks||{})[key] === simRes[key]){
          var pts = ROUND_PTS[key.split("_")[0]]||5;
          score += pts;
        }
      });
      // 우승자 보너스
      if(simRes["F_0"] && (u.bracketPicks||{})["F_0"]===simRes["F_0"]) score+=40;
      finalScores[u.uid] = score;
    });

    // 1등, 2등, 3등 카운트 (동점 공동 처리)
    var sortedScores = ranked.map(function(u){return finalScores[u.uid];}).sort(function(a,b){return b-a;});
    var s1=sortedScores[0], s2=sortedScores[1]||0, s3=sortedScores[2]||0;
    var top1 = ranked.filter(function(u){return finalScores[u.uid]===s1;});
    var top2 = ranked.filter(function(u){return finalScores[u.uid]===s2 && s2<s1;});
    var top3 = ranked.filter(function(u){return finalScores[u.uid]===s3 && s3<s2;});
    // p1=1등확률, p2=상위2안에들확률(1등+2등), p3=상위3안에들확률(1+2+3등)
    top1.forEach(function(u){ winCounts[u.uid].p1 += 1/top1.length; winCounts[u.uid].p2 += 1/top1.length; winCounts[u.uid].p3 += 1/top1.length; });
    top2.forEach(function(u){ winCounts[u.uid].p2 += 1/top2.length; winCounts[u.uid].p3 += 1/top2.length; });
    top3.forEach(function(u){ winCounts[u.uid].p3 += 1/top3.length; });
  }

  return ranked.map(function(u){
    return {
      uid: u.uid,
      prob: Math.round(100*winCounts[u.uid].p1/N_SIM),
      prob2: Math.round(100*winCounts[u.uid].p2/N_SIM),
      prob3: Math.round(100*winCounts[u.uid].p3/N_SIM),
    };
  });
}




// ─── TODAY'S MATCHES + SCORE PREDICTION ──────────────────────────────────────
function TodayMatches({users, tournament, currentUid, lang}){
  const [drafts, setDrafts] = useState({});   // {matchId:{home,away}}
  const [savingId, setSavingId] = useState(null);
  const [savedIds, setSavedIds] = useState({});
  const [now, setNow] = useState(Date.now());

  useEffect(()=>{
    const iv = setInterval(()=>setNow(Date.now()), 30000);
    return ()=>clearInterval(iv);
  },[]);

  const me = Object.values(users).find(function(u){ return u.uid===currentUid; });
  const myPreds = me?.scorePredictions || {};
  const matchResults = tournament.matchResults || {};

  // 오늘(ET 기준) + 아직 결과 없는 다음 경기들 (최대 4개)
  const upcoming = MATCH_SCHEDULE
    .filter(function(m){ return !matchResults[m.id]; })
    .slice(0, 4);

  if(upcoming.length === 0) return null;

  const lbl = lang==="ko"?"스코어 맞히기":lang==="es"?"PREDICE EL MARCADOR":"PREDICT THE SCORE";

  return(
    <div style={{background:"#0C1620",border:"1px solid rgba(255,255,255,.08)",borderRadius:14,padding:"14px 16px",marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
        <div style={{fontFamily:"'Teko',sans-serif",fontSize:15,color:"#D4A843",letterSpacing:".1em"}}>
          🎯 {lbl}
        </div>
        <span style={{fontSize:10,color:"#5A7090"}}>
          {lang==="ko"?"킥오프 전까지 · 점수 무관 자랑용":lang==="es"?"antes del inicio · solo por diversión":"before kickoff · bragging rights only"}
        </span>
      </div>
      <div style={{fontSize:10,color:"#3A5070",marginBottom:10}}>
        {lang==="ko"?"정확한 스코어를 맞히면 결과 카드에 🎯 예언가 표시!":lang==="es"?"¡Adivina el marcador exacto y aparece 🎯 Profeta!":"Nail the exact score → 🎯 Prophet badge on the result card!"}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:8}}>
        {upcoming.map(function(m){
          const kicked = m.iso ? now >= new Date(m.iso).getTime() : false;
          const myP = myPreds[m.id];
          const draft = drafts[m.id] || {home: myP?myP.home:"", away: myP?myP.away:""};
          const justSaved = savedIds[m.id];

          // 킥오프 후 → 전원 예측 공개
          const allPreds = kicked
            ? Object.values(users)
                .filter(function(u){ return u.approved && u.scorePredictions?.[m.id]; })
                .map(function(u){ return {name:(u.name||"?").split(" ")[0], p:u.scorePredictions[m.id]}; })
            : [];

          return(
            <div key={m.id} style={{background:"rgba(255,255,255,.03)",border:"0.5px solid "+(myP?"rgba(212,168,67,.25)":"rgba(255,255,255,.07)"),borderRadius:10,padding:"10px 12px"}}>
              <div style={{fontSize:10,color:"#5A7090",marginBottom:6}}>
                {m.date} · {m.time} · Group {m.group}
                {kicked&&<span style={{color:"#f87171",marginLeft:6}}>🔒 {lang==="ko"?"마감":lang==="es"?"cerrado":"locked"}</span>}
              </div>

              {/* 예측 입력 행 */}
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:12,color:"#E0E8F0",flex:1,textAlign:"right"}}>{tn(m.home,lang)}</span>
                <input type="number" min="0" max="20" disabled={kicked}
                  value={draft.home}
                  onChange={function(e){ setDrafts(function(prev){ return {...prev,[m.id]:{...draft,home:e.target.value}}; }); }}
                  style={{width:38,textAlign:"center",background:kicked?"rgba(255,255,255,.03)":"rgba(255,255,255,.08)",border:"0.5px solid rgba(255,255,255,.15)",borderRadius:6,color:kicked?"#5A7090":"#fff",fontSize:15,fontFamily:"'Teko',sans-serif",padding:"3px 0"}}/>
                <span style={{color:"#5A7090",fontSize:12}}>:</span>
                <input type="number" min="0" max="20" disabled={kicked}
                  value={draft.away}
                  onChange={function(e){ setDrafts(function(prev){ return {...prev,[m.id]:{...draft,away:e.target.value}}; }); }}
                  style={{width:38,textAlign:"center",background:kicked?"rgba(255,255,255,.03)":"rgba(255,255,255,.08)",border:"0.5px solid rgba(255,255,255,.15)",borderRadius:6,color:kicked?"#5A7090":"#fff",fontSize:15,fontFamily:"'Teko',sans-serif",padding:"3px 0"}}/>
                <span style={{fontSize:12,color:"#E0E8F0",flex:1}}>{tn(m.away,lang)}</span>
              </div>

              {/* 저장 버튼 / 상태 */}
              {!kicked&&(
                <div style={{marginTop:7,display:"flex",justifyContent:"flex-end",alignItems:"center",gap:8}}>
                  {myP&&!justSaved&&<span style={{fontSize:10,color:"#22C55E"}}>✓ {myP.home}:{myP.away} {lang==="ko"?"제출됨":lang==="es"?"enviado":"submitted"}</span>}
                  {justSaved&&<span style={{fontSize:10,color:"#22C55E"}}>✓ {lang==="ko"?"저장!":lang==="es"?"¡guardado!":"saved!"}</span>}
                  <button
                    disabled={savingId===m.id||draft.home===""||draft.away===""}
                    onClick={async function(){
                      setSavingId(m.id);
                      try{
                        await saveScorePrediction(currentUid, m.id, String(draft.home), String(draft.away));
                        setSavedIds(function(p){ return {...p,[m.id]:true}; });
                        setTimeout(function(){ setSavedIds(function(p){ var n={...p}; delete n[m.id]; return n; }); }, 2500);
                      }catch(e){}
                      setSavingId(null);
                    }}
                    style={{padding:"5px 14px",borderRadius:14,border:"none",fontSize:11,fontWeight:600,cursor:"pointer",background:(draft.home!==""&&draft.away!=="")?"rgba(212,168,67,.9)":"rgba(255,255,255,.08)",color:(draft.home!==""&&draft.away!=="")?"#000":"#5A7090",touchAction:"manipulation"}}>
                    {savingId===m.id?"...":myP?(lang==="ko"?"수정":lang==="es"?"EDITAR":"UPDATE"):(lang==="ko"?"제출":lang==="es"?"ENVIAR":"SUBMIT")}
                  </button>
                </div>
              )}

              {/* 킥오프 후: 전원 예측 공개 */}
              {kicked&&allPreds.length>0&&(
                <div style={{marginTop:8,display:"flex",flexWrap:"wrap",gap:4}}>
                  {allPreds.map(function(ap){
                    return(
                      <span key={ap.name} style={{fontSize:10,padding:"2px 7px",borderRadius:10,background:"rgba(255,255,255,.05)",color:"#9CA3AF"}}>
                        {ap.name} {ap.p.home}:{ap.p.away}
                      </span>
                    );
                  })}
                </div>
              )}
              {kicked&&allPreds.length===0&&(
                <div style={{marginTop:8,fontSize:10,color:"#3A5070"}}>{lang==="ko"?"예측 없음":lang==="es"?"sin predicciones":"no predictions"}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ─── 1. 예언가 랭킹 ──────────────────────────────────────────────────────────
function ProphetLeaderboard({users, tournament, lang}){
  const matchResults = tournament.matchResults || {};
  const playedIds = Object.keys(matchResults);
  if(playedIds.length === 0) return null;

  const approved = Object.values(users).filter(u=>u.approved&&u.paid);
  const ranked = approved.map(u=>{
    let score=0, exact=0, dir=0;
    playedIds.forEach(mid=>{
      const r = matchResults[mid];
      const p = u.scorePredictions?.[mid];
      const d = u.directionPicks?.[mid];
      if(!r) return;
      const actualDir = r.home>r.away?"home":r.home<r.away?"away":"draw";
      // 스코어 예측에서 방향 추론 (명시적 방향 픽 없어도 정확한 스코어면 방향도 자동 인정)
      const predDir = d || (p ? (parseInt(p.home)>parseInt(p.away)?"home":parseInt(p.home)<parseInt(p.away)?"away":"draw") : null);
      if(p && String(p.home)===String(r.home) && String(p.away)===String(r.away)){
        exact++; score+=3;
      }
      if(predDir && predDir===actualDir){ dir++; score+=1; }
    });
    return {uid:u.uid, name:(u.name||"?").split(" ")[0], photo:u.photoURL, exact, dir, score};
  }).sort((a,b)=>b.score-a.score||b.exact-a.exact);

  const lbl = lang==="ko"?"예언가 랭킹":lang==="es"?"PROFETAS":"PROPHET RANKING";
  const top = ranked.slice(0,5);

  return(
    <div style={{background:"#0C1620",border:"1px solid rgba(255,255,255,.08)",borderRadius:14,padding:"14px 16px",marginBottom:12}}>
      <div style={{fontFamily:"'Teko',sans-serif",fontSize:15,color:"#D4A843",letterSpacing:".1em",marginBottom:4}}>
        🔮 {lbl}
      </div>
      <div style={{fontSize:10,color:"#3A5070",marginBottom:10}}>
        {lang==="ko"?"정확한 스코어 +3점 · 승무패 방향 +1점":lang==="es"?"Marcador exacto +3pts · Resultado correcto +1pt":"Exact score +3pts · Correct direction +1pt"}
      </div>
      {top.map((u,i)=>{
        const medals=["🥇","🥈","🥉","④","⑤"];
        return(
          <div key={u.uid} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:i<top.length-1?"0.5px solid rgba(255,255,255,.05)":"none"}}>
            <span style={{fontSize:13,width:20}}>{medals[i]||i+1}</span>
            <div style={{width:24,height:24,borderRadius:"50%",overflow:"hidden",background:"#1a2840",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#9CA3AF"}}>
              {u.photo?<img src={u.photo} style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>{e.target.style.display="none";}}/>:u.name[0]}
            </div>
            <span style={{flex:1,fontSize:12,color:"#E0E8F0"}}>{u.name}</span>
            <span style={{fontSize:10,color:"#D4A843"}}>🎯{u.exact}</span>
            <span style={{fontSize:10,color:"#9CA3AF",marginLeft:4}}>✓{u.dir}</span>
            <span style={{fontSize:13,fontFamily:"'Teko',sans-serif",color:"#D4A843",marginLeft:6,width:28,textAlign:"right"}}>{u.score}pt</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── 2. 조별 순위표 ──────────────────────────────────────────────────────────
function GroupStandings({users, tournament, currentUid, lang}){
  const matchResults = tournament.matchResults || {};
  if(Object.keys(matchResults).length === 0) return null;

  const me = Object.values(users).find(u=>u.uid===currentUid);
  const myPicks = me?.groupPicks || {};

  // 조별 팀 목록 (GROUPS에서)
  const groups = {};
  Object.entries(GROUPS).forEach(([grp,{teams}])=>{ groups[grp]=teams; });

  // 경기별 승점 계산
  const teamStats = {}; // {teamName: {w,d,l,gf,ga,pts,group}}
  MATCH_SCHEDULE.forEach(m=>{
    // 현재 id와 레거시 id(뒤에 a/b/c 붙은 것) 모두 체크
    const r = matchResults[m.id] || matchResults[m.id+"a"] || matchResults[m.id.replace(/[abc]$/,"")];
    if(!r) return;
    const h=parseInt(r.home), a=parseInt(r.away);
    if(isNaN(h)||isNaN(a)||String(r.home)===""||String(r.away)==="") return;
    [m.home, m.away].forEach(t=>{
      if(!teamStats[t]) teamStats[t]={w:0,d:0,l:0,gf:0,ga:0,pts:0,group:m.group};
    });
    if(h>a){
      teamStats[m.home].w++; teamStats[m.home].pts+=3;
      teamStats[m.away].l++;
    } else if(h<a){
      teamStats[m.away].w++; teamStats[m.away].pts+=3;
      teamStats[m.home].l++;
    } else {
      teamStats[m.home].d++; teamStats[m.home].pts++;
      teamStats[m.away].d++; teamStats[m.away].pts++;
    }
    teamStats[m.home].gf+=h; teamStats[m.home].ga+=a;
    teamStats[m.away].gf+=a; teamStats[m.away].ga+=h;
  });

  // 데이터 있는 조만 필터
  const activeGroups = Object.keys(groups).filter(grp=>
    groups[grp].some(t=>teamStats[t]&&(teamStats[t].w+teamStats[t].d+teamStats[t].l)>0)
  ).sort();

  if(activeGroups.length===0) return null;

  const lbl = lang==="ko"?"조별 순위":lang==="es"?"TABLA DE GRUPOS":"GROUP STANDINGS";

  return(
    <div style={{background:"#0C1620",border:"1px solid rgba(255,255,255,.08)",borderRadius:14,padding:"14px 16px",marginBottom:12}}>
      <div style={{fontFamily:"'Teko',sans-serif",fontSize:15,color:"#D4A843",letterSpacing:".1em",marginBottom:10}}>
        📊 {lbl}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:10}}>
        {activeGroups.map(grp=>{
          const teams = groups[grp] || [];
          const orderedNames = fifaSortGroup(teams, teamStats, grp, matchResults);
          const sorted = orderedNames.map(t=>({name:t,...(teamStats[t]||{w:0,d:0,l:0,gf:0,ga:0,pts:0})}));
          const myGrpPicks = myPicks[grp]||[];

          return(
            <div key={grp} style={{background:"rgba(255,255,255,.02)",border:"0.5px solid rgba(255,255,255,.07)",borderRadius:10,overflow:"hidden"}}>
              <div style={{background:"rgba(212,168,67,.07)",padding:"5px 10px",borderBottom:"0.5px solid rgba(255,255,255,.07)"}}>
                <span style={{fontFamily:"'Teko',sans-serif",fontSize:13,color:"#D4A843",letterSpacing:".08em"}}>
                  GROUP {grp}
                </span>
              </div>
              {/* 헤더 */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 28px 28px 28px 28px 32px",gap:2,padding:"4px 8px",borderBottom:"0.5px solid rgba(255,255,255,.05)"}}>
                {["","W","D","L","GD","PTS"].map(h=>(
                  <span key={h} style={{fontSize:9,color:"#5A7090",textAlign:"center"}}>{h}</span>
                ))}
              </div>
              {sorted.map((t,i)=>{
                const isMyPick = myGrpPicks.includes(t.name);
                const inZone = i<2; // 현재 순위 기준 진출권
                const gd = t.gf-t.ga;
                // 자동 추정 로직 대신 Admin이 직접 체크한 manualQualified/manualOut만 사용
                const isQualified = !!(tournament.manualQualified && tournament.manualQualified[t.name]);
                const isEliminated = !!(tournament.manualOut && tournament.manualOut[t.name]);
                return(
                  <div key={t.name} style={{display:"grid",gridTemplateColumns:"1fr 28px 28px 28px 28px 32px",gap:2,padding:"5px 8px",background:isQualified?"rgba(34,197,94,.06)":isEliminated?"rgba(239,68,68,.04)":inZone?"rgba(34,197,94,.04)":"transparent",borderBottom:"0.5px solid rgba(255,255,255,.03)"}}>
                    <div style={{display:"flex",alignItems:"center",gap:5,minWidth:0}}>
                      {isQualified&&<div style={{width:3,height:14,borderRadius:2,background:"#22C55E",flexShrink:0}}/>}
                      {isEliminated&&<div style={{width:3,height:14,borderRadius:2,background:"#EF4444",flexShrink:0}}/>}
                      {!isQualified&&!isEliminated&&inZone&&<div style={{width:3,height:14,borderRadius:2,background:"rgba(34,197,94,.4)",flexShrink:0}}/>}
                      {!isQualified&&!isEliminated&&!inZone&&<div style={{width:3,height:14,flexShrink:0}}/>}
                      <span style={{fontSize:11,color:isMyPick?"#D4A843":isEliminated?"#5A7090":"#E0E8F0",fontWeight:isMyPick?600:400,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textDecoration:isEliminated?"line-through":"none"}}>
                        {isMyPick?"⭐ ":""}{tn(t.name,lang)}
                      </span>
                      {isQualified&&<span style={{fontSize:8,padding:"1px 4px",borderRadius:4,background:"rgba(34,197,94,.2)",color:"#22C55E",fontWeight:700,flexShrink:0,letterSpacing:".02em"}}>Q</span>}
                      {isEliminated&&<span style={{fontSize:8,padding:"1px 4px",borderRadius:4,background:"rgba(239,68,68,.15)",color:"#EF4444",fontWeight:700,flexShrink:0,letterSpacing:".02em"}}>OUT</span>}
                    </div>
                    {[t.w,t.d,t.l,(gd>0?"+":"")+gd,t.pts].map((v,j)=>(
                      <span key={j} style={{fontSize:11,color:j===4?"#E0E8F0":"#9CA3AF",fontWeight:j===4?700:400,textAlign:"center"}}>{v}</span>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 3. 승/무/패 방향 예측 (TodayMatches에 통합) ─────────────────────────────
// → TodayMatches 컴포넌트를 교체해서 스코어 + 방향 예측 합체


// ─── PROPHET TAB ─────────────────────────────────────────────────────────────
function ProphetTab({users, tournament, currentUid, lang}){
  const matchResults = tournament.matchResults || {};
  const playedIds = Object.keys(matchResults);
  const approved = Object.values(users).filter(u=>u.approved&&u.paid);

  // 예언가 점수 계산
  const ranked = approved.map(u=>{
    let exactScore=0, dirScore=0, exactCount=0, dirCount=0;
    playedIds.forEach(mid=>{
      const r = matchResults[mid];
      if(!r||r.home===""||r.away==="") return;
      const p = u.scorePredictions?.[mid];
      const d = u.directionPicks?.[mid];
      const actualDir = parseInt(r.home)>parseInt(r.away)?"home":parseInt(r.home)<parseInt(r.away)?"away":"draw";
      // 스코어 예측에서 방향 추론 (명시적 방향 픽 없어도 정확한 스코어면 방향도 자동 인정)
      const predDir = d || (p ? (parseInt(p.home)>parseInt(p.away)?"home":parseInt(p.home)<parseInt(p.away)?"away":"draw") : null);
      if(p && String(p.home)===String(r.home) && String(p.away)===String(r.away)){
        exactCount++; exactScore+=3;
      }
      if(predDir && predDir===actualDir){ dirCount++; dirScore+=1; }
    });
    return {
      uid:u.uid,
      name:(u.name||"?").split(" ")[0],
      photo:u.photoURL,
      exactCount, dirCount,
      total: exactScore+dirScore,
      exactScore, dirScore,
      isMe: u.uid===currentUid,
    };
  }).sort((a,b)=>b.total-a.total||b.exactCount-a.exactCount||b.dirCount-a.dirCount);

  const medals = ["🥇","🥈","🥉"];

  return(
    <div>
      {/* 헤더 */}
      <div style={{background:"linear-gradient(135deg,rgba(139,92,246,.15),rgba(212,168,67,.1))",border:"1px solid rgba(139,92,246,.25)",borderRadius:14,padding:"16px",marginBottom:16,textAlign:"center"}}>
        <div style={{fontFamily:"'Teko',sans-serif",fontSize:28,color:"#a78bfa",letterSpacing:".15em",marginBottom:4}}>
          🔮 PROPHET LEAGUE
        </div>
        <div style={{fontSize:12,color:"#9CA3AF",marginBottom:10}}>
          {lang==="ko"
            ? "본 게임과 무관한 독립 예측 리그 · 브래킷 픽과 상금 없음"
            : "Independent prediction league · separate from main game · no prize"}
        </div>
        <div style={{display:"flex",justifyContent:"center",gap:16}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontFamily:"'Teko',sans-serif",fontSize:22,color:"#D4A843"}}>🎯 +3</div>
            <div style={{fontSize:10,color:"#5A7090"}}>{lang==="ko"?"정확한 스코어":lang==="es"?"Marcador exacto":"Exact score"}</div>
          </div>
          <div style={{width:"1px",background:"rgba(255,255,255,.08)"}}/>
          <div style={{textAlign:"center"}}>
            <div style={{fontFamily:"'Teko',sans-serif",fontSize:22,color:"#60a5fa"}}>✓ +1</div>
            <div style={{fontSize:10,color:"#5A7090"}}>{lang==="ko"?"승무패 방향":lang==="es"?"Resultado (V/E/D)":"Win/Draw/Loss"}</div>
          </div>
          <div style={{width:"1px",background:"rgba(255,255,255,.08)"}}/>
          <div style={{textAlign:"center"}}>
            <div style={{fontFamily:"'Teko',sans-serif",fontSize:22,color:"#9CA3AF"}}>{playedIds.length}</div>
            <div style={{fontSize:10,color:"#5A7090"}}>{lang==="ko"?"경기 완료":lang==="es"?"partidos jugados":"matches played"}</div>
          </div>
        </div>
      </div>

      {/* 랭킹 없음 */}
      {playedIds.length===0&&(
        <div style={{textAlign:"center",padding:"40px 0",color:"#5A7090"}}>
          <div style={{fontSize:32,marginBottom:8}}>⏳</div>
          <div style={{fontSize:13}}>{lang==="ko"?"경기 결과 입력 후 랭킹이 업데이트됩니다":lang==="es"?"El ranking se actualiza tras ingresar resultados":"Rankings update after match results are entered"}</div>
        </div>
      )}

      {/* 랭킹 테이블 */}
      {playedIds.length>0&&(
        <div style={{background:"#0C1620",border:"1px solid rgba(255,255,255,.08)",borderRadius:14,overflow:"hidden"}}>
          {/* 컬럼 헤더 */}
          <div style={{display:"grid",gridTemplateColumns:"36px 1fr 60px 60px 60px",gap:4,padding:"8px 14px",borderBottom:"0.5px solid rgba(255,255,255,.08)",background:"rgba(255,255,255,.02)"}}>
            {["","",lang==="ko"?"🎯 정확":lang==="es"?"🎯 Exacto":"🎯 Exact",lang==="ko"?"✓ 방향":lang==="es"?"✓ Result.":"✓ Dir",lang==="ko"?"총점":lang==="es"?"Total":"Total"].map((h,i)=>(
              <span key={i} style={{fontSize:10,color:"#5A7090",textAlign:i>1?"center":"left"}}>{h}</span>
            ))}
          </div>
          {ranked.map((u,i)=>{
            const prev = i>0 && ranked[i-1].total===u.total ? ranked[i-1] : null;
            const rank = prev ? i : i; // 동점 처리
            return(
              <div key={u.uid} style={{
                display:"grid",gridTemplateColumns:"36px 1fr 60px 60px 60px",gap:4,
                padding:"10px 14px",
                borderBottom:"0.5px solid rgba(255,255,255,.05)",
                background:u.isMe?"rgba(212,168,67,.05)":"transparent",
              }}>
                {/* 순위 */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {rank<3
                    ? <span style={{fontSize:16}}>{medals[rank]}</span>
                    : <span style={{fontSize:12,color:"#5A7090",fontFamily:"'Teko',sans-serif"}}>{rank+1}</span>
                  }
                </div>
                {/* 이름 */}
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:28,height:28,borderRadius:"50%",overflow:"hidden",background:"#1a2840",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#9CA3AF",border:u.isMe?"1.5px solid #D4A843":"none"}}>
                    {u.photo
                      ? <img src={u.photo} style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>{e.target.style.display="none";}}/>
                      : u.name[0]}
                  </div>
                  <span style={{fontSize:13,color:u.isMe?"#D4A843":"#E0E8F0",fontWeight:u.isMe?600:400}}>
                    {u.name}{u.isMe&&" ★"}
                  </span>
                </div>
                {/* 정확한 스코어 */}
                <div style={{textAlign:"center"}}>
                  <span style={{fontSize:13,color:u.exactCount>0?"#D4A843":"#3A5070",fontWeight:600}}>{u.exactCount}</span>
                  {u.exactCount>0&&<span style={{fontSize:9,color:"#D4A843",marginLeft:2}}>({u.exactScore}pt)</span>}
                </div>
                {/* 방향 */}
                <div style={{textAlign:"center"}}>
                  <span style={{fontSize:13,color:u.dirCount>0?"#60a5fa":"#3A5070",fontWeight:600}}>{u.dirCount}</span>
                  {u.dirCount>0&&<span style={{fontSize:9,color:"#60a5fa",marginLeft:2}}>({u.dirScore}pt)</span>}
                </div>
                {/* 총점 */}
                <div style={{textAlign:"center"}}>
                  <span style={{fontFamily:"'Teko',sans-serif",fontSize:18,color:u.isMe?"#D4A843":u.total>0?"#E0E8F0":"#3A5070"}}>{u.total}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 내 예측 현황 */}
      {(()=>{
        const me = ranked.find(u=>u.isMe);
        if(!me||playedIds.length===0) return null;
        const predCount = Object.keys(Object.values(users).find(u=>u.uid===currentUid)?.scorePredictions||{}).length;
        const dirCount2 = Object.keys(Object.values(users).find(u=>u.uid===currentUid)?.directionPicks||{}).length;
        return(
          <div style={{marginTop:12,padding:"12px 16px",background:"rgba(212,168,67,.05)",border:"0.5px solid rgba(212,168,67,.15)",borderRadius:12,display:"flex",gap:16,justifyContent:"center",flexWrap:"wrap"}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontFamily:"'Teko',sans-serif",fontSize:20,color:"#D4A843"}}>{predCount}</div>
              <div style={{fontSize:10,color:"#5A7090"}}>{lang==="ko"?"스코어 예측 제출":lang==="es"?"predicciones de marcador":"score predictions"}</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontFamily:"'Teko',sans-serif",fontSize:20,color:"#60a5fa"}}>{dirCount2}</div>
              <div style={{fontSize:10,color:"#5A7090"}}>{lang==="ko"?"방향 예측 제출":lang==="es"?"predicciones de resultado":"direction picks"}</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontFamily:"'Teko',sans-serif",fontSize:20,color:me.total>0?"#a78bfa":"#3A5070"}}>{me.total}pt</div>
              <div style={{fontSize:10,color:"#5A7090"}}>{lang==="ko"?"현재 예언가 점수":lang==="es"?"puntos de profeta":"prophet score"}</div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── RESULTS TAB ─────────────────────────────────────────────────────────────
function ResultsTab({users, tournament, currentUid, lang}){
  const [showBracket, setShowBracket] = useState(false);
  const matchResults = tournament.matchResults || {};
  const bracketResults = tournament.bracketResults || {};
  const bracketTeams = tournament.bracketTeams || [];
  const phase = tournament.phase || "group";

  // 조별리그 경기 (matchResults 기반)
  const played = MATCH_SCHEDULE.filter(m => matchResults[m.id]||matchResults[m.id+"a"]||matchResults[m.id.replace(/[abc]$/,"")]);
  const upcoming = phase==="group" ? MATCH_SCHEDULE.filter(m => !matchResults[m.id]) : [];

  // 32강 이후 브래킷 경기 생성 (bracketTeams + R32_MATCHUPS 기반)
  const bracketSchedule = [];
  if(phase==="bracket" && bracketTeams.length>0){
    const seeds = {};
    R32_MATCHUPS.forEach((seed,i)=>{
      if(bracketTeams[i]) seeds[seed]=bracketTeams[i];
    });
    // R32 경기
    for(let i=0;i<16;i++){
      const key="R32_"+i;
      const home=bracketTeams[i*2]||"TBD";
      const away=bracketTeams[i*2+1]||"TBD";
      const winner=bracketResults[key];
      bracketSchedule.push({key,round:"32강",home,away,winner,done:!!winner});
    }
    // R16 경기
    for(let i=0;i<8;i++){
      const key="R16_"+i;
      const home=bracketResults["R32_"+(i*2)]||"TBD";
      const away=bracketResults["R32_"+(i*2+1)]||"TBD";
      const winner=bracketResults[key];
      if(home!=="TBD"||away!=="TBD") bracketSchedule.push({key,round:"16강",home,away,winner,done:!!winner});
    }
    // QF 경기
    for(let i=0;i<4;i++){
      const key="QF_"+i;
      const home=bracketResults["R16_"+(i*2)]||"TBD";
      const away=bracketResults["R16_"+(i*2+1)]||"TBD";
      const winner=bracketResults[key];
      if(home!=="TBD"||away!=="TBD") bracketSchedule.push({key,round:"8강",home,away,winner,done:!!winner});
    }
    // SF
    for(let i=0;i<2;i++){
      const key="SF_"+i;
      const home=bracketResults["QF_"+(i*2)]||"TBD";
      const away=bracketResults["QF_"+(i*2+1)]||"TBD";
      const winner=bracketResults[key];
      if(home!=="TBD"||away!=="TBD") bracketSchedule.push({key,round:"4강",home,away,winner,done:!!winner});
    }
    // Final
    const fHome=bracketResults["SF_0"]||"TBD";
    const fAway=bracketResults["SF_1"]||"TBD";
    const fWinner=bracketResults["F_0"];
    if(fHome!=="TBD"||fAway!=="TBD") bracketSchedule.push({key:"F_0",round:"결승",home:fHome,away:fAway,winner:fWinner,done:!!fWinner});
  }

  // 브래킷 phase면 bracketSchedule을 보여줌
  // bracketResults 기반으로 st 구성 (모달에 전달용)
  const btArr = tournament.bracketTeams||[];
  const bRes = tournament.bracketResults||{};
  const bScores = tournament.bracketScores||{};
  const stForModal = {};
  R32_MATCHUPS.forEach(function(seed,i){
    if(btArr[i]) stForModal[seed]=btArr[i];
  });
  const myPicksSet = new Set();

  if(phase==="bracket") return(
    <div style={{paddingBottom:24}}>
      {showBracket&&(
        <BracketFullscreenModal
          onClose={()=>setShowBracket(false)}
          st={stForModal} myPicks={myPicksSet} lang={lang}
          bracketResults={bRes}
        />
      )}
      <button onClick={()=>setShowBracket(true)} style={{width:"100%",padding:"12px",borderRadius:12,border:"1px solid rgba(212,168,67,.3)",background:"rgba(212,168,67,.08)",color:"#D4A843",fontFamily:"'Teko',sans-serif",fontSize:16,fontWeight:700,cursor:"pointer",marginBottom:14,touchAction:"manipulation",letterSpacing:".06em"}}>
        ⚔️ {lang==="ko"?"브래킷 전체 보기 (가로 뷰)":"VIEW FULL BRACKET →"}
      </button>
      <div style={{fontFamily:"'Teko',sans-serif",fontSize:16,color:"#D4A843",letterSpacing:".1em",marginBottom:12}}>
        {lang==="ko"?"⚔️ 토너먼트 결과":"⚔️ TOURNAMENT RESULTS"}
      </div>
      {bracketSchedule.length===0?(
        <div style={{textAlign:"center",padding:"40px 20px",color:"#5A7090",fontSize:13}}>
          {lang==="ko"?"Admin이 32강 결과를 입력하면 표시됩니다":"Results will appear after Admin enters R32 scores"}
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {["32강","16강","8강","4강","결승"].map(round=>{
            const roundMatches = bracketSchedule.filter(m=>m.round===round);
            if(roundMatches.length===0) return null;
            return(
              <div key={round} style={{marginBottom:8}}>
                <div style={{fontSize:11,color:"#5A7090",letterSpacing:".08em",marginBottom:6,fontFamily:"'Teko',sans-serif"}}>
                  {lang==="ko"?round:{"32강":"ROUND OF 32","16강":"ROUND OF 16","8강":"QUARTERFINALS","4강":"SEMIFINALS","결승":"FINAL"}[round]||round}
                </div>
                {roundMatches.map(m=>(
                  <div key={m.key} style={{background:m.done?"rgba(255,255,255,.03)":"rgba(212,168,67,.04)",border:"0.5px solid "+(m.done?"rgba(255,255,255,.07)":"rgba(212,168,67,.15)"),borderRadius:9,padding:"9px 12px",marginBottom:4}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{flex:1,textAlign:"right",fontSize:12,color:m.winner===m.home?"#22C55E":"#E0E8F0",fontWeight:m.winner===m.home?700:400}}>{tn(m.home,lang)}</div>
                      <div style={{textAlign:"center",flexShrink:0,minWidth:44}}>
                        {bScores[m.key]&&bScores[m.key].home!==""&&bScores[m.key].away!==""?(
                          <span style={{fontSize:14,fontWeight:700,color:"#E0E8F0",fontFamily:"'Teko',sans-serif"}}>{bScores[m.key].home} - {bScores[m.key].away}</span>
                        ):(
                          <span style={{fontSize:10,color:"#5A7090"}}>vs</span>
                        )}
                      </div>
                      <div style={{flex:1,textAlign:"left",fontSize:12,color:m.winner===m.away?"#22C55E":"#E0E8F0",fontWeight:m.winner===m.away?700:400}}>{tn(m.away,lang)}</div>
                    </div>
                    {bScores[m.key]&&bScores[m.key].pen&&(
                      <div style={{textAlign:"center",fontSize:10,color:"#D4A843",marginTop:3}}>PEN {bScores[m.key].pen}</div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  if(played.length === 0) return(
    <div style={{textAlign:"center",padding:"60px 20px",color:"#5A7090"}}>
      <div style={{fontSize:40,marginBottom:12}}>⏳</div>
      <div style={{fontFamily:"'Teko',sans-serif",fontSize:20,color:"#D4A843",marginBottom:8}}>
        {lang==="ko"?"아직 결과 없음":lang==="es"?"Aún sin resultados":"No results yet"}
      </div>
      <div style={{fontSize:13}}>
        {lang==="ko"?"경기 후 Admin에서 스코어를 입력하면 표시됩니다":"Scores will appear after Admin enters match results"}
      </div>
    </div>
  );

  return(
    <div>
      {/* FIFA Official 링크 */}
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:14}}>
        <a href="https://www.youtube.com/@FIFAWorldCup/videos" target="_blank" rel="noopener noreferrer"
          style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#f87171",textDecoration:"none",padding:"5px 12px",borderRadius:20,border:"0.5px solid rgba(248,113,113,.3)",background:"rgba(248,113,113,.07)"}}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="#f87171"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.8 15.5V8.5l6.3 3.5-6.3 3.5z"/></svg>
          FIFA Official
        </a>
      </div>

      {/* 완료된 경기 */}
      <div style={{fontFamily:"'Teko',sans-serif",fontSize:14,color:"#D4A843",letterSpacing:".1em",marginBottom:10}}>
        ✅ {lang==="ko"?"완료된 경기":"COMPLETED"} ({played.length})
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:10,marginBottom:20}}>
        {played.map(function(m){
          const r = matchResults[m.id]||matchResults[m.id+"a"]||matchResults[m.id.replace(/[abc]$/,"")];
          const ytUrl = "https://www.youtube.com/results?search_query=FIFA+World+Cup+2026+"+m.home.replace(/ /g,"+")+"+"+ m.away.replace(/ /g,"+")+ "+highlights";
          const homeWin = r.home > r.away;
          const awayWin = r.away > r.home;
          const draw = r.home === r.away;

          return(
            <div key={m.id} style={{background:"#0C1620",border:"1px solid rgba(255,255,255,.08)",borderRadius:12,overflow:"hidden"}}>
              {/* 헤더 */}
              <div style={{background:"rgba(255,255,255,.03)",padding:"6px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"0.5px solid rgba(255,255,255,.06)"}}>
                <span style={{fontSize:10,color:"#5A7090",letterSpacing:".06em"}}>Group {m.group} · {m.date} · {m.time}</span>
                <a href={ytUrl} target="_blank" rel="noopener noreferrer"
                  style={{display:"flex",alignItems:"center",gap:3,fontSize:10,color:"#f87171",textDecoration:"none",padding:"2px 7px",borderRadius:10,background:"rgba(248,113,113,.1)"}}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="#f87171"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.8 15.5V8.5l6.3 3.5-6.3 3.5z"/></svg>
                  HL
                </a>
              </div>
              {/* 스코어 */}
              <div style={{padding:"14px 16px",display:"flex",alignItems:"center",gap:8}}>
                <div style={{flex:1,textAlign:"right"}}>
                  <div style={{fontSize:13,color:homeWin?"#E0E8F0":"#5A7090",fontWeight:homeWin?600:400}}>{tn(m.home,lang)}</div>
                </div>
                <div style={{textAlign:"center",minWidth:70}}>
                  <div style={{fontFamily:"'Teko',sans-serif",fontSize:28,color:"#fff",lineHeight:1}}>
                    {r.home} – {r.away}
                  </div>
                  {draw&&<div style={{fontSize:10,color:"#9CA3AF",marginTop:2}}>DRAW</div>}
                </div>
                <div style={{flex:1,textAlign:"left"}}>
                  <div style={{fontSize:13,color:awayWin?"#E0E8F0":"#5A7090",fontWeight:awayWin?600:400}}>{tn(m.away,lang)}</div>
                </div>
              </div>

              {/* 🎯 예측 적중자 */}
              {(function(){
                const prophets = Object.values(users).filter(function(u){
                  const p = u.scorePredictions?.[m.id];
                  return u.approved && p && String(p.home)===String(r.home) && String(p.away)===String(r.away);
                });
                if(prophets.length===0) return null;
                return(
                  <div style={{padding:"0 16px 8px",display:"flex",flexWrap:"wrap",gap:5,alignItems:"center"}}>
                    <span style={{fontSize:10,color:"#D4A843"}}>🎯 {lang==="ko"?"예언가":"Prophets"}:</span>
                    {prophets.map(function(u){
                      return(
                        <span key={u.uid} style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:"rgba(212,168,67,.15)",border:"0.5px solid rgba(212,168,67,.35)",color:"#D4A843",fontWeight:600}}>
                          {(u.name||"?").split(" ")[0]}
                        </span>
                      );
                    })}
                  </div>
                );
              })()}

              {/* 이모지 리액션 바 */}
              <div style={{padding:"8px 16px 10px",borderTop:"0.5px solid rgba(255,255,255,.05)",display:"flex",gap:6}}>
                {["🔥","😱","😂","💀"].map(function(emoji){
                  const count = Object.values(users).filter(function(u){ return u.reactions?.[m.id]===emoji; }).length;
                  const mine = Object.values(users).find(function(u){ return u.uid===currentUid; })?.reactions?.[m.id]===emoji;
                  return(
                    <button key={emoji}
                      onClick={async function(){
                        try{ await saveReaction(currentUid, m.id, mine ? "" : emoji); }catch(e){}
                      }}
                      style={{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",borderRadius:14,cursor:"pointer",touchAction:"manipulation",border:"0.5px solid "+(mine?"rgba(212,168,67,.5)":"rgba(255,255,255,.08)"),background:mine?"rgba(212,168,67,.12)":"rgba(255,255,255,.03)"}}>
                      <span style={{fontSize:13}}>{emoji}</span>
                      {count>0&&<span style={{fontSize:11,color:mine?"#D4A843":"#5A7090",fontWeight:600}}>{count}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 예정된 경기 — 날짜별 그룹핑 */}
      {upcoming.length > 0 && (function(){
        // 날짜별 그룹핑
        const byDate = {};
        upcoming.forEach(function(m){
          if(!byDate[m.date]) byDate[m.date]=[];
          byDate[m.date].push(m);
        });
        const dates = Object.keys(byDate);

        return(
          <div>
            <div style={{fontFamily:"'Teko',sans-serif",fontSize:16,color:"#5A7090",letterSpacing:".1em",marginBottom:12}}>
              📅 {lang==="ko"?"앞으로의 경기":"UPCOMING MATCHES"} ({upcoming.length})
            </div>
            {dates.map(function(date){
              const matches = byDate[date];
              return(
                <div key={date} style={{marginBottom:16}}>
                  {/* 날짜 헤더 */}
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                    <div style={{fontFamily:"'Teko',sans-serif",fontSize:14,color:"#D4A843",letterSpacing:".08em"}}>{date}</div>
                    <div style={{flex:1,height:"0.5px",background:"rgba(255,255,255,.07)"}}/>
                    <div style={{fontSize:10,color:"#5A7090"}}>{matches.length}{lang==="ko"?"경기":"matches"}</div>
                  </div>
                  {/* 경기 목록 */}
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {matches.map(function(m){
                      const now = Date.now();
                      const isNext = m.iso && Math.abs(new Date(m.iso).getTime()-now) < 86400000*2;
                      return(
                        <div key={m.id} style={{
                          background:isNext?"rgba(212,168,67,.06)":"rgba(255,255,255,.02)",
                          border:"0.5px solid "+(isNext?"rgba(212,168,67,.2)":"rgba(255,255,255,.06)"),
                          borderRadius:10,
                          padding:"10px 14px",
                          display:"flex",
                          alignItems:"center",
                          gap:8,
                        }}>
                          {/* 시간 */}
                          <div style={{textAlign:"center",flexShrink:0,width:70}}>
                            <div style={{fontSize:11,color:isNext?"#D4A843":"#60a5fa",fontWeight:600}}>{m.time}</div>
                            <div style={{fontSize:9,color:"#3A5070",letterSpacing:".06em"}}>Group {m.group}</div>
                          </div>
                          {/* 구분선 */}
                          <div style={{width:"0.5px",height:28,background:"rgba(255,255,255,.08)",flexShrink:0}}/>
                          {/* 홈팀 */}
                          <div style={{flex:1,textAlign:"right",fontSize:12,color:"#E0E8F0",fontWeight:500}}>{tn(m.home,lang)}</div>
                          {/* vs */}
                          <div style={{textAlign:"center",flexShrink:0,width:24,fontSize:10,color:"#5A7090"}}>vs</div>
                          {/* 어웨이팀 */}
                          <div style={{flex:1,textAlign:"left",fontSize:12,color:"#E0E8F0",fontWeight:500}}>{tn(m.away,lang)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}


// ─── MATCH SCHEDULE (스코어 입력용) ─────────────────────────────────────────
const MATCH_SCHEDULE = [
  // ── ROUND 1 (Jun 11-17) ────────────────────────────────────────────────────
  {id:"A1", iso:"2026-06-11T15:00:00-04:00", date:"Jun 11", time:"3:00 PM ET",  home:"Mexico",              away:"South Africa",       group:"A"},
  {id:"A2", iso:"2026-06-11T22:00:00-04:00", date:"Jun 11", time:"10:00 PM ET", home:"South Korea",         away:"Czechia",            group:"A"},
  {id:"B1", iso:"2026-06-12T15:00:00-04:00", date:"Jun 12", time:"3:00 PM ET",  home:"Canada",              away:"Bosnia-Herzegovina",  group:"B"},
  {id:"D1", iso:"2026-06-12T21:00:00-04:00", date:"Jun 12", time:"9:00 PM ET",  home:"United States",                 away:"Paraguay",            group:"D"},
  {id:"B2", iso:"2026-06-13T15:00:00-04:00", date:"Jun 13", time:"3:00 PM ET",  home:"Qatar",               away:"Switzerland",         group:"B"},
  {id:"C1", iso:"2026-06-13T18:00:00-04:00", date:"Jun 13", time:"6:00 PM ET",  home:"Brazil",              away:"Morocco",             group:"C"},
  {id:"C2", iso:"2026-06-13T21:00:00-04:00", date:"Jun 13", time:"9:00 PM ET",  home:"Haiti",               away:"Scotland",            group:"C"},
  {id:"D2", iso:"2026-06-14T00:00:00-04:00", date:"Jun 14", time:"12:00 AM ET", home:"Australia",           away:"Türkiye",             group:"D"},
  {id:"E1", iso:"2026-06-14T13:00:00-04:00", date:"Jun 14", time:"1:00 PM ET",  home:"Germany",             away:"Curaçao",             group:"E"},
  {id:"F1", iso:"2026-06-14T16:00:00-04:00", date:"Jun 14", time:"4:00 PM ET",  home:"Netherlands",         away:"Japan",               group:"F"},
  {id:"E2", iso:"2026-06-14T19:00:00-04:00", date:"Jun 14", time:"7:00 PM ET",  home:"Ivory Coast",         away:"Ecuador",             group:"E"},
  {id:"F2", iso:"2026-06-14T22:00:00-04:00", date:"Jun 14", time:"10:00 PM ET", home:"Sweden",              away:"Tunisia",             group:"F"},
  {id:"H1", iso:"2026-06-15T12:00:00-04:00", date:"Jun 15", time:"12:00 PM ET", home:"Spain",               away:"Cape Verde",          group:"H"},
  {id:"G1", iso:"2026-06-15T15:00:00-04:00", date:"Jun 15", time:"3:00 PM ET",  home:"Belgium",             away:"Egypt",               group:"G"},
  {id:"H2", iso:"2026-06-15T18:00:00-04:00", date:"Jun 15", time:"6:00 PM ET",  home:"Saudi Arabia",        away:"Uruguay",             group:"H"},
  {id:"G2", iso:"2026-06-15T21:00:00-04:00", date:"Jun 15", time:"9:00 PM ET",  home:"Iran",                away:"New Zealand",         group:"G"},
  {id:"I1", iso:"2026-06-16T15:00:00-04:00", date:"Jun 16", time:"3:00 PM ET",  home:"France",              away:"Senegal",             group:"I"},
  {id:"I2", iso:"2026-06-16T18:00:00-04:00", date:"Jun 16", time:"6:00 PM ET",  home:"Iraq",                away:"Norway",              group:"I"},
  {id:"J1", iso:"2026-06-16T21:00:00-04:00", date:"Jun 16", time:"9:00 PM ET",  home:"Argentina",           away:"Algeria",             group:"J"},
  {id:"J2", iso:"2026-06-17T00:00:00-04:00", date:"Jun 17", time:"12:00 AM ET", home:"Austria",             away:"Jordan",              group:"J"},
  {id:"K1", iso:"2026-06-17T13:00:00-04:00", date:"Jun 17", time:"1:00 PM ET",  home:"Portugal",            away:"Congo DR",            group:"K"},
  {id:"L1", iso:"2026-06-17T16:00:00-04:00", date:"Jun 17", time:"4:00 PM ET",  home:"England",             away:"Croatia",             group:"L"},
  {id:"L2", iso:"2026-06-17T19:00:00-04:00", date:"Jun 17", time:"7:00 PM ET",  home:"Ghana",               away:"Panama",              group:"L"},
  {id:"K2", iso:"2026-06-17T22:00:00-04:00", date:"Jun 17", time:"10:00 PM ET", home:"Uzbekistan",          away:"Colombia",            group:"K"},
  // ── ROUND 2 (Jun 18-21) ────────────────────────────────────────────────────
  {id:"A3b", iso:"2026-06-18T12:00:00-04:00", date:"Jun 18", time:"12:00 PM ET", home:"Czechia",             away:"South Africa",        group:"A"},
  {id:"B3b", iso:"2026-06-18T15:00:00-04:00", date:"Jun 18", time:"3:00 PM ET",  home:"Switzerland",         away:"Bosnia-Herzegovina",  group:"B"},
  {id:"B4b", iso:"2026-06-18T18:00:00-04:00", date:"Jun 18", time:"6:00 PM ET",  home:"Canada",              away:"Qatar",               group:"B"},
  {id:"A4b", iso:"2026-06-18T21:00:00-04:00", date:"Jun 18", time:"9:00 PM ET",  home:"Mexico",              away:"South Korea",         group:"A"},
  {id:"D3b", iso:"2026-06-19T15:00:00-04:00", date:"Jun 19", time:"3:00 PM ET",  home:"United States",                 away:"Australia",           group:"D"},
  {id:"C3b", iso:"2026-06-19T18:00:00-04:00", date:"Jun 19", time:"6:00 PM ET",  home:"Scotland",            away:"Morocco",             group:"C"},
  {id:"C4b", iso:"2026-06-19T20:30:00-04:00", date:"Jun 19", time:"8:30 PM ET",  home:"Brazil",              away:"Haiti",               group:"C"},
  {id:"D4b", iso:"2026-06-19T23:00:00-04:00", date:"Jun 19", time:"11:00 PM ET", home:"Türkiye",             away:"Paraguay",            group:"D"},
  {id:"F3b", iso:"2026-06-20T13:00:00-04:00", date:"Jun 20", time:"1:00 PM ET",  home:"Netherlands",         away:"Sweden",              group:"F"},
  {id:"E3b", iso:"2026-06-20T16:00:00-04:00", date:"Jun 20", time:"4:00 PM ET",  home:"Germany",             away:"Ivory Coast",         group:"E"},
  {id:"E4b", iso:"2026-06-20T20:00:00-04:00", date:"Jun 20", time:"8:00 PM ET",  home:"Ecuador",             away:"Curaçao",             group:"E"},
  {id:"F4b", iso:"2026-06-21T00:00:00-04:00", date:"Jun 21", time:"12:00 AM ET", home:"Tunisia",             away:"Japan",               group:"F"},
  {id:"H3b", iso:"2026-06-21T12:00:00-04:00", date:"Jun 21", time:"12:00 PM ET", home:"Spain",               away:"Saudi Arabia",        group:"H"},
  {id:"G3b", iso:"2026-06-21T15:00:00-04:00", date:"Jun 21", time:"3:00 PM ET",  home:"Belgium",             away:"Iran",                group:"G"},
  {id:"H4b", iso:"2026-06-21T18:00:00-04:00", date:"Jun 21", time:"6:00 PM ET",  home:"Uruguay",             away:"Cape Verde",          group:"H"},
  {id:"G4b", iso:"2026-06-21T21:00:00-04:00", date:"Jun 21", time:"9:00 PM ET",  home:"New Zealand",         away:"Egypt",               group:"G"},
  {id:"J3b", iso:"2026-06-22T13:00:00-04:00", date:"Jun 22", time:"1:00 PM ET",  home:"Argentina",           away:"Austria",             group:"J"},
  {id:"I3b", iso:"2026-06-22T17:00:00-04:00", date:"Jun 22", time:"5:00 PM ET",  home:"France",              away:"Iraq",                group:"I"},
  {id:"I4b", iso:"2026-06-22T20:00:00-04:00", date:"Jun 22", time:"8:00 PM ET",  home:"Norway",              away:"Senegal",             group:"I"},
  {id:"J4b", iso:"2026-06-22T23:00:00-04:00", date:"Jun 22", time:"11:00 PM ET", home:"Jordan",              away:"Algeria",             group:"J"},
  {id:"K3b", iso:"2026-06-23T13:00:00-04:00", date:"Jun 23", time:"1:00 PM ET",  home:"Portugal",            away:"Uzbekistan",          group:"K"},
  {id:"L3b", iso:"2026-06-23T16:00:00-04:00", date:"Jun 23", time:"4:00 PM ET",  home:"England",             away:"Ghana",               group:"L"},
  {id:"L4b", iso:"2026-06-23T19:00:00-04:00", date:"Jun 23", time:"7:00 PM ET",  home:"Panama",              away:"Croatia",             group:"L"},
  {id:"K4b", iso:"2026-06-23T22:00:00-04:00", date:"Jun 23", time:"10:00 PM ET", home:"Colombia",            away:"Congo DR",            group:"K"},
  // ── ROUND 3 (Jun 24-27, 동시 킥오프) ─────────────────────────────────────────
  {id:"B5c", iso:"2026-06-24T15:00:00-04:00", date:"Jun 24", time:"3:00 PM ET",  home:"Switzerland",         away:"Canada",              group:"B"},
  {id:"B6c", iso:"2026-06-24T15:00:00-04:00", date:"Jun 24", time:"3:00 PM ET",  home:"Bosnia-Herzegovina",  away:"Qatar",               group:"B"},
  {id:"C5c", iso:"2026-06-24T18:00:00-04:00", date:"Jun 24", time:"6:00 PM ET",  home:"Scotland",            away:"Brazil",              group:"C"},
  {id:"C6c", iso:"2026-06-24T18:00:00-04:00", date:"Jun 24", time:"6:00 PM ET",  home:"Morocco",             away:"Haiti",               group:"C"},
  {id:"A5c", iso:"2026-06-24T21:00:00-04:00", date:"Jun 24", time:"9:00 PM ET",  home:"Czechia",             away:"Mexico",              group:"A"},
  {id:"A6c", iso:"2026-06-24T21:00:00-04:00", date:"Jun 24", time:"9:00 PM ET",  home:"South Africa",        away:"South Korea",         group:"A"},
  {id:"E5c", iso:"2026-06-25T16:00:00-04:00", date:"Jun 25", time:"4:00 PM ET",  home:"Curaçao",             away:"Ivory Coast",         group:"E"},
  {id:"E6c", iso:"2026-06-25T16:00:00-04:00", date:"Jun 25", time:"4:00 PM ET",  home:"Ecuador",             away:"Germany",             group:"E"},
  {id:"F5c", iso:"2026-06-25T19:00:00-04:00", date:"Jun 25", time:"7:00 PM ET",  home:"Japan",               away:"Sweden",              group:"F"},
  {id:"F6c", iso:"2026-06-25T19:00:00-04:00", date:"Jun 25", time:"7:00 PM ET",  home:"Tunisia",             away:"Netherlands",         group:"F"},
  {id:"D5c", iso:"2026-06-25T22:00:00-04:00", date:"Jun 25", time:"10:00 PM ET", home:"Türkiye",             away:"United States",                 group:"D"},
  {id:"D6c", iso:"2026-06-25T22:00:00-04:00", date:"Jun 25", time:"10:00 PM ET", home:"Paraguay",            away:"Australia",           group:"D"},
  {id:"I5c", iso:"2026-06-26T15:00:00-04:00", date:"Jun 26", time:"3:00 PM ET",  home:"Norway",              away:"France",              group:"I"},
  {id:"I6c", iso:"2026-06-26T15:00:00-04:00", date:"Jun 26", time:"3:00 PM ET",  home:"Senegal",             away:"Iraq",                group:"I"},
  {id:"H5c", iso:"2026-06-26T20:00:00-04:00", date:"Jun 26", time:"8:00 PM ET",  home:"Cape Verde",          away:"Saudi Arabia",        group:"H"},
  {id:"H6c", iso:"2026-06-26T20:00:00-04:00", date:"Jun 26", time:"8:00 PM ET",  home:"Uruguay",             away:"Spain",               group:"H"},
  {id:"G5c", iso:"2026-06-26T23:00:00-04:00", date:"Jun 26", time:"11:00 PM ET", home:"Egypt",               away:"Iran",                group:"G"},
  {id:"G6c", iso:"2026-06-26T23:00:00-04:00", date:"Jun 26", time:"11:00 PM ET", home:"New Zealand",         away:"Belgium",             group:"G"},
  {id:"L5c", iso:"2026-06-27T17:00:00-04:00", date:"Jun 27", time:"5:00 PM ET",  home:"Panama",              away:"England",             group:"L"},
  {id:"L6c", iso:"2026-06-27T17:00:00-04:00", date:"Jun 27", time:"5:00 PM ET",  home:"Croatia",             away:"Ghana",               group:"L"},
  {id:"K5c", iso:"2026-06-27T19:30:00-04:00", date:"Jun 27", time:"7:30 PM ET",  home:"Colombia",            away:"Portugal",            group:"K"},
  {id:"K6c", iso:"2026-06-27T19:30:00-04:00", date:"Jun 27", time:"7:30 PM ET",  home:"Congo DR",            away:"Uzbekistan",          group:"K"},
  {id:"J5c", iso:"2026-06-27T22:00:00-04:00", date:"Jun 27", time:"10:00 PM ET", home:"Jordan",              away:"Argentina",           group:"J"},
  {id:"J6c", iso:"2026-06-27T22:00:00-04:00", date:"Jun 27", time:"10:00 PM ET", home:"Algeria",             away:"Austria",             group:"J"},
];


// ─── FIFA 랭킹 (June 11, 2026 공식) ─────────────────────────────────────────
const FIFA_RANK = {
  "Argentina":1,"Spain":2,"France":3,"England":4,"Portugal":5,
  "Brazil":6,"Morocco":7,"Netherlands":8,"Belgium":9,"Germany":10,
  "Croatia":11,"Colombia":13,"Mexico":14,"Senegal":15,"Uruguay":16,
  "USA":17,"Japan":18,"Switzerland":19,"Iran":20,"IR Iran":20,
  "Türkiye":22,"Turkey":22,"Ecuador":23,"Austria":24,
  "South Korea":25,"Korea Republic":25,"Australia":27,
  "Algeria":28,"Egypt":29,"Canada":30,"Norway":31,
  "Ivory Coast":33,"Côte d\'Ivoire":33,"Panama":34,"Sweden":38,
  "Czechia":40,"Paraguay":41,"Scotland":42,"Congo DR":46,
  "Tunisia":45,"South Africa":66,"Ghana":56,"Uzbekistan":74,
  "Haiti":100,"New Zealand":103,"Cape Verde":71,
  "Bosnia-Herzegovina":65,"Qatar":58,"Jordan":87,"Curaçao":88,
};

const TITLE_ODDS = [
  {team:"Argentina",  flag:"🇦🇷", rank:1,  prob:18, color:"#60a5fa"},
  {team:"France",     flag:"🇫🇷", rank:3,  prob:14, color:"#60a5fa"},
  {team:"Spain",      flag:"🇪🇸", rank:2,  prob:13, color:"#f87171"},
  {team:"England",    flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿", rank:4,  prob:10, color:"#f87171"},
  {team:"Brazil",     flag:"🇧🇷", rank:6,  prob:9,  color:"#22C55E"},
  {team:"Germany",    flag:"🇩🇪", rank:10, prob:7,  color:"#D4A843"},
  {team:"Portugal",   flag:"🇵🇹", rank:5,  prob:6,  color:"#f87171"},
  {team:"Netherlands",flag:"🇳🇱", rank:8,  prob:5,  color:"#f87171"},
  {team:"Morocco",    flag:"🇲🇦", rank:7,  prob:4,  color:"#22C55E"},
  {team:"Colombia",   flag:"🇨🇴", rank:13, prob:3,  color:"#22C55E"},
  {team:"USA",        flag:"🇺🇸", rank:17, prob:2,  color:"#60a5fa"},
  {team:"Others",     flag:"🌍",  rank:null,prob:9, color:"#5A7090"},
];


// ─── INFO TAB ─────────────────────────────────────────────────────────────────
function InfoTab({users, tournament, currentUid, lang}){
  const me = Object.values(users).find(function(u){return u.uid===currentUid;});
  const myPicks = new Set();
  Object.values(me?.groupPicks||{}).forEach(function(teams){(teams||[]).forEach(function(t){myPicks.add(t);});});
  const lbl = function(ko,en){return lang==="ko"?ko:en;};
  const gr = tournament?.groupResults||{};

  return(
    <div>
      {/* 우승 후보 오즈 */}
      <div style={{background:"#0C1620",border:"1px solid rgba(255,255,255,.08)",borderRadius:14,padding:"16px",marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
          <div style={{fontFamily:"'Teko',sans-serif",fontSize:18,color:"#D4A843",letterSpacing:".1em"}}>
            🏆 {lbl("우승 후보 확률","TITLE ODDS")}
          </div>
          <span style={{fontSize:10,color:"#5A7090"}}>Pinnacle ref · Jun 2026</span>
        </div>
        <div style={{fontSize:11,color:"#3A5070",marginBottom:12}}>
          {lbl("Pinnacle 북메이커 내재 확률 (vig 제거)","Pinnacle implied probability (vig-removed)")}
        </div>
        {TITLE_ODDS.map(function(t){
          var isMyPick = myPicks.has(t.team);
          return(
            <div key={t.team} style={{marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                <span style={{fontSize:14,flexShrink:0}}>{t.flag}</span>
                <span style={{fontSize:12,color:isMyPick?"#D4A843":"#E0E8F0",fontWeight:isMyPick?600:400,flex:1}}>
                  {isMyPick?"⭐ ":""}{tn(t.team,lang)}
                  {t.rank&&<span style={{fontSize:10,color:"#5A7090",marginLeft:5}}>FIFA #{t.rank}</span>}
                </span>
                <span style={{fontSize:13,fontWeight:700,color:t.color}}>{t.prob}%</span>
              </div>
              <div style={{height:6,background:"rgba(255,255,255,.05)",borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:t.prob+"%",background:t.color,borderRadius:3,opacity:.75}}/>
              </div>
            </div>
          );
        })}
        <div style={{marginTop:8,fontSize:10,color:"#3A5070",textAlign:"right"}}>{lbl("⭐ = 내 픽","⭐ = my picks")}</div>
      </div>

      {/* FIFA 랭킹 */}
      <div style={{background:"#0C1620",border:"1px solid rgba(255,255,255,.08)",borderRadius:14,padding:"16px",marginBottom:14}}>
        <div style={{fontFamily:"'Teko',sans-serif",fontSize:18,color:"#D4A843",letterSpacing:".1em",marginBottom:4}}>
          📊 {lbl("FIFA 랭킹 (참가 48개국)","FIFA RANKINGS (48 teams)")}
        </div>
        <div style={{fontSize:11,color:"#3A5070",marginBottom:12}}>{lbl("2026년 6월 11일 공식 기준","Official as of June 11, 2026")}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:6}}>
          {Object.entries(GROUPS).sort(function(a,b){return a[0].localeCompare(b[0]);}).map(function(e){
            var grp=e[0], info=e[1];
            var myGrpPicks = me?.groupPicks?.[grp]||[];
            return(
              <div key={grp} style={{background:"rgba(255,255,255,.02)",border:"0.5px solid rgba(255,255,255,.06)",borderRadius:8,overflow:"hidden"}}>
                <div style={{padding:"4px 10px",background:"rgba(212,168,67,.07)",borderBottom:"0.5px solid rgba(255,255,255,.05)"}}>
                  <span style={{fontFamily:"'Teko',sans-serif",fontSize:13,color:"#D4A843"}}>GROUP {grp}</span>
                </div>
                {info.teams.map(function(team,i){
                  var rank = FIFA_RANK[team];
                  var isMyPick = myGrpPicks.includes(team);
                  var flag = info.flags?.[i]||"🏳";
                  return(
                    <div key={team} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px",borderBottom:"0.5px solid rgba(255,255,255,.03)",background:isMyPick?"rgba(212,168,67,.05)":"transparent"}}>
                      <span style={{fontSize:12,flexShrink:0}}>{flag}</span>
                      <span style={{fontSize:11,flex:1,color:isMyPick?"#D4A843":"#E0E8F0",fontWeight:isMyPick?600:400}}>
                        {isMyPick?"⭐ ":""}{tn(team,lang)}
                      </span>
                      <span style={{fontSize:11,color:rank?(rank<=10?"#22C55E":rank<=20?"#D4A843":"#9CA3AF"):"#5A7090",fontWeight:rank&&rank<=10?600:400}}>
                        {rank?"#"+rank:"–"}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* 32강 브래킷 */}
      <div style={{background:"#0C1620",border:"1px solid rgba(255,255,255,.08)",borderRadius:14,padding:"16px"}}>
        <div style={{fontFamily:"'Teko',sans-serif",fontSize:18,color:"#D4A843",letterSpacing:".1em",marginBottom:4}}>
          ⚔️ {lbl("32강 브래킷","ROUND OF 32 BRACKET")}
        </div>
        <div style={{fontSize:11,color:"#3A5070",marginBottom:12}}>
          {lbl("조별 결과 후 팀명이 채워집니다 · ⭐ 내 픽 · 가로 스크롤","Fills in after group results · ⭐ your picks · scroll →")}
        </div>
        {(function(){
          var st2={};
          var wcMap={};
          // bracketTeams(이미 자동채우기로 정확히 계산된 값)가 있으면 최우선 사용
          var bt2 = tournament.bracketTeams||[];
          if(bt2.some(function(x){return x;})){
            R32_MATCHUPS.forEach(function(seed,i){
              var team=bt2[i];
              if(!team) return;
              if(seed.indexOf("WC")===0){ wcMap[seed]=team; return; }
              var g=seed[0], pos=seed[1];
              if(pos==="1") st2[g+"1"]=team;
              if(pos==="2") st2[g+"2"]=team;
            });
          }
          // bracketTeams에 없는 조는 groupResults 폴백
          Object.entries(GROUPS).forEach(function(e){var g=e[0],adv=gr[g]||[];if(!st2[g+"1"]&&adv[0])st2[g+"1"]=adv[0];if(!st2[g+"2"]&&adv[1])st2[g+"2"]=adv[1];});
          var rSrc=function(src,wc){
            if(src==="WC") return wc?("3rd·"+wc):"3rd WC";
            return src[0]+(src[1]==="1"?" Win":" R-up");
          };
          var LEFT=[
            {a:"A2",b:"B2",date:"Jun 28"},
            {a:"C1",b:"F2",date:"Jun 29"},
            {a:"E1",b:"WC",wc:"ABCDF",wcKey:"WC1",date:"Jun 29"},
            {a:"F1",b:"C2",date:"Jun 29"},
            {a:"E2",b:"I2",date:"Jun 30"},
            {a:"I1",b:"WC",wc:"CDFGH",wcKey:"WC2",date:"Jun 30"},
            {a:"A1",b:"WC",wc:"CEFHI",wcKey:"WC3",date:"Jun 30"},
            {a:"B1",b:"D2",date:"Jul 2"},
          ];
          var RIGHT=[
            {a:"L1",b:"WC",wc:"EHIJK",wcKey:"WC4",date:"Jul 1"},
            {a:"G1",b:"WC",wc:"AEHIJ",wcKey:"WC6",date:"Jul 1"},
            {a:"D1",b:"WC",wc:"BEFIJ",wcKey:"WC5",date:"Jul 1"},
            {a:"J1",b:"H2",date:"Jul 1"},
            {a:"K1",b:"WC",wc:"DEIJL",wcKey:"WC7",date:"Jul 1"},
            {a:"H1",b:"G2",date:"Jul 2"},
            {a:"L2",b:"K2",date:"Jul 2"},
            {a:"J2",b:"WC",wc:"last",wcKey:"WC8",date:"Jul 2"},
          ];

          var TH=28, GAP=8, ROW=TH*2+GAP, ROWS=8;
          var CW=148, CH=ROW, CONN=24, MID=60;
          var W=CW*2+CONN*2+MID, H=ROWS*ROW+16;

          var TeamRow=function(team,src,wc,isMe,y,x,w){
            var label=team?tn(team,lang):(lang==="ko"?src[0]+(src==="WC"?"위("+wc+")":src[1]==="1"?"조1위":"조2위"):rSrc(src,wc));
            return(
              <g>
                <rect x={x} y={y} width={w} height={TH} rx={3}
                  fill={isMe?"rgba(212,168,67,.18)":team?"rgba(255,255,255,.06)":"rgba(255,255,255,.02)"}
                  stroke={isMe?"rgba(212,168,67,.5)":"rgba(255,255,255,.1)"} strokeWidth={0.5}/>
                <text x={x+6} y={y+TH/2+4} fontSize={isMe?9:8.5}
                  fill={isMe?"#D4A843":team?"#E0E8F0":"#3A5070"}
                  fontWeight={isMe?700:team?400:300}
                  fontStyle={team?"normal":"italic"}>
                  {label.length>16?label.slice(0,15)+"…":label}
                </text>
                {isMe&&<text x={x+w-10} y={y+TH/2+4} fontSize={8} fill="#D4A843" textAnchor="middle">⭐</text>}
              </g>
            );
          };

          var MatchCard=function(m,i,side){
            var tA=st2[m.a]||null, tB=m.b==="WC"?(wcMap[m.wcKey]||null):(st2[m.b]||null);
            var aMe=tA&&myPicks.has(tA), bMe=tB&&myPicks.has(tB);
            var y=8+i*ROW;
            var x=side==="left"?0:W-CW;
            var connX=side==="left"?CW:W-CW-CONN;
            var midY=y+TH+GAP/2;
            return(
              <g key={side+i}>
                {TeamRow(tA,m.a,m.wc,aMe,y,x,CW)}
                <rect x={x} y={y+TH} width={CW} height={GAP} fill="transparent"/>
                {TeamRow(tB,m.b,m.wc,bMe,y+TH+GAP,x,CW)}
                {/* 연결선 */}
                <line x1={side==="left"?CW:W-CW} y1={y+TH/2}
                      x2={side==="left"?CW+CONN/2:W-CW-CONN/2} y2={y+TH/2}
                      stroke="rgba(255,255,255,.15)" strokeWidth={0.5}/>
                <line x1={side==="left"?CW:W-CW} y1={y+TH+GAP+TH/2}
                      x2={side==="left"?CW+CONN/2:W-CW-CONN/2} y2={y+TH+GAP+TH/2}
                      stroke="rgba(255,255,255,.15)" strokeWidth={0.5}/>
                <line x1={side==="left"?CW+CONN/2:W-CW-CONN/2} y1={y+TH/2}
                      x2={side==="left"?CW+CONN/2:W-CW-CONN/2} y2={y+TH+GAP+TH/2}
                      stroke="rgba(255,255,255,.15)" strokeWidth={0.5}/>
                {/* 날짜 */}
                <text x={side==="left"?x+2:x+CW-2} y={y-1}
                  textAnchor={side==="left"?"start":"end"}
                  fontSize={6.5} fill="#3A5070">{m.date}</text>
              </g>
            );
          };

          return(
            <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
              <svg width={W} height={H} style={{display:"block",minWidth:300}}>
                {/* 중앙 구분선 */}
                <line x1={W/2} y1={0} x2={W/2} y2={H}
                  stroke="rgba(255,255,255,.06)" strokeWidth={1} strokeDasharray="3,4}"/>
                {/* 중앙 텍스트 */}
                <text x={W/2} y={H/2+4} textAnchor="middle" fontSize={8}
                  fill="#5A7090" letterSpacing="0.5">R16</text>
                <text x={W/2} y={H/2+14} textAnchor="middle" fontSize={7}
                  fill="#3A5070">→</text>
                {LEFT.map(function(m,i){return MatchCard(m,i,"left");})}
                {RIGHT.map(function(m,i){return MatchCard(m,i,"right");})}
              </svg>
            </div>
          );
        })()}
      </div>
    </div>
  );
}


// ─── FIFA 2026 공식 타이브레이커 (Regulations Article 13) ────────────────────
// 순서: 1)승점 2)맞대결승점 3)맞대결득실차 4)맞대결득점 5)전체득실차 6)전체득점
// (페어플레이/FIFA랭킹은 카드 데이터 없어 미구현 - 완전동률 시 그대로 둠)
function buildHeadToHead(group, matchResults) {
  var h2h = {};
  MATCH_SCHEDULE.forEach(function(m){
    if(m.group !== group) return;
    var r = matchResults[m.id] || matchResults[m.id+"a"];
    if(!r) return;
    var h = parseInt(r.home), a = parseInt(r.away);
    if(isNaN(h)||isNaN(a)) return;
    [m.home, m.away].forEach(function(t){
      if(!h2h[t]) h2h[t] = {};
    });
    if(!h2h[m.home][m.away]) h2h[m.home][m.away] = {pts:0,gd:0,gf:0};
    if(!h2h[m.away][m.home]) h2h[m.away][m.home] = {pts:0,gd:0,gf:0};
    h2h[m.home][m.away].gd += (h-a); h2h[m.home][m.away].gf += h;
    h2h[m.away][m.home].gd += (a-h); h2h[m.away][m.home].gf += a;
    if(h>a) h2h[m.home][m.away].pts += 3;
    else if(h<a) h2h[m.away][m.home].pts += 3;
    else { h2h[m.home][m.away].pts++; h2h[m.away][m.home].pts++; }
  });
  return h2h;
}

// FIFA 공식 순서로 팀 배열 정렬. teamStats: {team:{pts,gd,gf,ga}}
function fifaSortGroup(teams, teamStats, group, matchResults) {
  var h2h = buildHeadToHead(group, matchResults||{});

  var byPts = {};
  teams.forEach(function(t){
    var p = (teamStats[t]||{pts:0}).pts;
    if(!byPts[p]) byPts[p] = [];
    byPts[p].push(t);
  });
  var ptsLevels = Object.keys(byPts).map(Number).sort(function(a,b){return b-a;});

  var result = [];
  ptsLevels.forEach(function(p){
    var tied = byPts[p];
    if(tied.length === 1) { result.push(tied[0]); return; }

    var miniStats = {};
    tied.forEach(function(t){ miniStats[t] = {pts:0,gd:0,gf:0}; });
    tied.forEach(function(t1){
      tied.forEach(function(t2){
        if(t1===t2) return;
        var rec = (h2h[t1]||{})[t2];
        if(rec){
          miniStats[t1].pts += rec.pts;
          miniStats[t1].gd += rec.gd;
          miniStats[t1].gf += rec.gf;
        }
      });
    });

    var sortedTied = tied.slice().sort(function(a,b){
      // 2.맞대결승점 3.맞대결득실차 4.맞대결득점
      if(miniStats[b].pts !== miniStats[a].pts) return miniStats[b].pts - miniStats[a].pts;
      if(miniStats[b].gd !== miniStats[a].gd) return miniStats[b].gd - miniStats[a].gd;
      if(miniStats[b].gf !== miniStats[a].gf) return miniStats[b].gf - miniStats[a].gf;
      // 5.전체득실차 6.전체득점
      var sa = teamStats[a]||{gf:0,ga:0}, sb = teamStats[b]||{gf:0,ga:0};
      var gdA = sa.gf - sa.ga, gdB = sb.gf - sb.ga;
      if(gdB !== gdA) return gdB - gdA;
      if(sb.gf !== sa.gf) return sb.gf - sa.gf;
      return 0; // 완전 동률 (페어플레이/FIFA랭킹 단계 - 카드 데이터 없어 미반영, 입력 순서 유지)
    });
    result = result.concat(sortedTied);
  });

  return result;
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

      {/* Prophet League 가이드 */}
      <div style={{background:"linear-gradient(135deg,rgba(139,92,246,.12),rgba(212,168,67,.06))",border:"1px solid rgba(139,92,246,.3)",borderRadius:14,padding:"16px 18px",marginBottom:10,borderLeft:"3px solid #a78bfa"}}>
        {/* 헤더 */}
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <span style={{fontSize:20}}>🔮</span>
          <div>
            <div style={{fontFamily:"'Teko',sans-serif",fontSize:18,color:"#a78bfa",letterSpacing:".1em",lineHeight:1}}>
              {lang==="ko"?"예언가 리그":"PROPHET LEAGUE"}
            </div>
            <div style={{fontSize:10,color:"#7C3AED",letterSpacing:".06em"}}>
              {lang==="ko"?"사이드 이벤트 · 본 게임과 완전 별개":"SIDE EVENT · COMPLETELY SEPARATE FROM MAIN GAME"}
            </div>
          </div>
        </div>

        {/* 핵심 강조 배너 */}
        <div style={{background:"rgba(139,92,246,.15)",border:"1px solid rgba(139,92,246,.35)",borderRadius:8,padding:"8px 12px",marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:16}}>⚠️</span>
          <span style={{fontSize:12,color:"#c4b5fd",fontWeight:600}}>
            {lang==="ko"
              ? "상금 없음 · 브래킷 픽과 무관 · 순수 자랑용 사이드 게임"
              : "No prize · Independent of bracket picks · Bragging rights only"}
          </span>
        </div>

        {/* 참여 방법 */}
        <div style={{fontSize:13,color:"#D1D5DB",marginBottom:12}}>
          <div style={{fontWeight:600,color:"#a78bfa",marginBottom:6}}>
            {lang==="ko"?"참여 방법:":"How to play:"}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {[
              {icon:"1️⃣", ko:"홈 대시보드 → 🎯 스코어 맞히기 카드에서 경기별 스코어 예측 입력", en:"Home dashboard → 🎯 Predict The Score card → enter your score prediction per match"},
              {icon:"2️⃣", ko:"킥오프 전까지만 가능 · 킥오프 후 자동 잠금 + 전원 예측 공개", en:"Deadline = kickoff · Auto-locked after kickoff · All predictions revealed"},
              {icon:"3️⃣", ko:"결과 나오면 🔮 PROPHET 탭에서 랭킹 확인 (승무패는 스코어에서 자동 판정)", en:"After results → check rankings in 🔮 PROPHET tab (Win/Draw/Loss auto-detected from your score)"},
            ].map(function(item,i){
              return(
                <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                  <span style={{fontSize:13,flexShrink:0}}>{item.icon}</span>
                  <span style={{fontSize:12,color:"#D1D5DB",lineHeight:1.5}}>{lang==="ko"?item.ko:item.en}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 점수 체계 */}
        <div style={{marginBottom:8}}>
          <div style={{fontWeight:600,color:"#a78bfa",fontSize:13,marginBottom:8}}>
            {lang==="ko"?"점수 체계:":"Scoring:"}
          </div>
          <div style={{display:"flex",gap:8}}>
            {[
              {icon:"🎯", pts:"+3", label:{ko:"정확한 스코어 적중", en:"Exact score"}},
              {icon:"✓",  pts:"+1", label:{ko:"승무패 방향 적중",   en:"Correct W/D/L"}},
            ].map(function(item){
              return(
                <div key={item.pts} style={{flex:1,background:"rgba(139,92,246,.1)",border:"1px solid rgba(139,92,246,.25)",borderRadius:8,padding:"8px 12px",textAlign:"center"}}>
                  <div style={{fontSize:18,marginBottom:2}}>{item.icon}</div>
                  <div style={{fontFamily:"'Teko',sans-serif",fontSize:22,color:"#a78bfa",lineHeight:1}}>{item.pts}</div>
                  <div style={{fontSize:11,color:"#9CA3AF",marginTop:2}}>{lang==="ko"?item.label.ko:item.label.en}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{fontSize:11,color:"#6D28D9",marginTop:8,textAlign:"center"}}>
          {lang==="ko"
            ? "💡 정확한 스코어를 맞히면 결과 카드에 🎯 예언가 배지 표시!"
            : "💡 Nail the exact score → 🎯 Prophet badge on the result card!"}
        </div>
      </div>
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
        <h1 style={{fontFamily:"'Teko',sans-serif",fontSize:44,color:"#fff",lineHeight:1,marginBottom:3}}>{t.title}</h1>
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
            {saved&&!dirty&&<span style={{fontSize:11,color:"#22C55E"}}>{lang==="ko"?"✓ 저장됨":lang==="es"?"✓ Guardado":"✓ Saved"}</span>}
            {dirty&&<span style={{fontSize:11,color:"#F59E0B"}}>{lang==="ko"?"● 미저장":lang==="es"?"● Sin guardar":"● Unsaved"}</span>}
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
  const [justSaved,setJustSaved]=useState(false);
  const [hasLoadedInitial,setHasLoadedInitial]=useState(false);
  const [editMode,setEditMode]=useState(false);
  const locked=tournament.bracketLocked;
  const bracketTeams=tournament.bracketTeams||[];
  const actual=tournament.bracketResults||{};
  const TOTAL_MATCHES_ALL = Object.values(ROUND_META).reduce((s,m)=>s+m.matches,0);
  // 이미 31개 다 채워서 저장된 상태면, editMode를 켜지 않은 한 읽기 전용으로 표시
  const isFullySaved = hasLoadedInitial && myPicks && Object.keys(myPicks).length >= TOTAL_MATCHES_ALL;
  const readOnly = isFullySaved && !editMode;
  // 최초 1회만 myPicks(서버 저장값)로 picks를 채움. 이후에는 로컬 클릭 상태(picks)를 그대로 신뢰하고
  // 부모에서 내려오는 myPicks로 절대 덮어쓰지 않음 (덮어쓰면 방금 클릭한 픽이 순간적으로 사라지는/겹쳐보이는 현상 발생)
  useEffect(()=>{
    if(!hasLoadedInitial && myPicks && Object.keys(myPicks).length>0){
      setPicks(myPicks);
      setHasLoadedInitial(true);
    }
  },[myPicks]);
  const getTeams=(round,i)=>{
    const ri=ROUNDS.indexOf(round);
    if(round==="R32")return{t1:bracketTeams[i*2]||"TBD",t2:bracketTeams[i*2+1]||"TBD"};
    const prev=ROUNDS[ri-1];
    return{t1:actual[`${prev}_${i*2}`]||picks[`${prev}_${i*2}`]||"TBD",t2:actual[`${prev}_${i*2+1}`]||picks[`${prev}_${i*2+1}`]||"TBD"};
  };
  const doPick=(key,team)=>{if(locked||actual[key]||readOnly)return;setPicks(prev=>({...prev,[key]:team}));};
  // 31경기(R32 16 + R16 8 + QF 4 + SF 2 + F 1) 전부 픽해야만 저장 가능
  // 단순히 picks 객체에 키가 있는지가 아니라, getTeams로 그 매치에 실제 두 팀이 다 채워져 있고(TBD 아님),
  // 그 중 하나를 실제로 클릭해서 골랐는지까지 정확히 검증함 (이전 라운드 미선택으로 인한 잘못된 카운트 방지)
  const TOTAL_MATCHES = TOTAL_MATCHES_ALL;
  const pickedCount = ROUNDS.reduce((sum,round)=>{
    const {matches} = ROUND_META[round];
    for(let i=0;i<matches;i++){
      const key = `${round}_${i}`;
      const myPick = picks[key];
      if(!myPick) continue; // 안 고름
      const {t1,t2} = getTeams(round,i);
      // 고른 값이 실제 그 매치의 유효한 두 팀(t1 또는 t2) 중 하나이고, TBD가 아닐 때만 유효한 픽으로 카운트
      if(myPick!=="TBD" && (myPick===t1||myPick===t2) && t1!=="TBD" && t2!=="TBD"){ sum++; }
    }
    return sum;
  },0);
  const allPicked = pickedCount >= TOTAL_MATCHES;
  const handleSave=async()=>{
    if(!allPicked) return; // 안전장치: 다 안 채워지면 저장 자체를 막음
    setSaving(true);
    try{
      await saveBracketPicks(uid,picks);
      showToast(t.savePicks+" ✓");
      setJustSaved(true);
      setEditMode(false); // 저장 완료 -> 다시 읽기 전용 상태로
      setTimeout(()=>setJustSaved(false), 2000);
    }catch{showToast("Error","error");}
    setSaving(false);
  };
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
        {!locked&&(
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
            {readOnly?(
              <button onClick={()=>setEditMode(true)} style={{padding:"8px 18px",borderRadius:9,border:"1px solid rgba(212,168,67,.4)",background:"transparent",color:"#D4A843",fontFamily:"'Teko',sans-serif",fontSize:15,fontWeight:700,cursor:"pointer",touchAction:"manipulation"}}>
                ✏️ {lang==="ko"?"수정하기":lang==="es"?"Editar":"EDIT"}
              </button>
            ):(
              <button onClick={handleSave} disabled={saving||!allPicked} style={{padding:"8px 18px",borderRadius:9,border:"none",background:!allPicked?"rgba(255,255,255,.08)":justSaved?"linear-gradient(135deg,#22C55E,#15803d)":"linear-gradient(135deg,#D4A843,#8B6914)",color:!allPicked?"#5A7090":justSaved?"#fff":"#000",fontFamily:"'Teko',sans-serif",fontSize:15,fontWeight:700,cursor:allPicked?"pointer":"not-allowed",opacity:saving?0.7:1,transition:"background .2s"}}>
                {justSaved?(lang==="ko"?"저장됨 ✓":lang==="es"?"Guardado ✓":"Saved ✓"):(saving?t.saving:`${t.savePicks} (${pickedCount}/${TOTAL_MATCHES})`)}
              </button>
            )}
            {!readOnly&&!allPicked&&<div style={{fontSize:10,color:"#EF4444"}}>
              {lang==="ko"?"모든 경기를 선택해야 저장할 수 있습니다":lang==="es"?"Debes elegir todos los partidos para guardar":"Pick every match to enable saving"}
            </div>}
            {readOnly&&<div style={{fontSize:10,color:"#5A7090"}}>
              {lang==="ko"?"제출 완료 · 수정하려면 EDIT":lang==="es"?"Enviado · Editar para cambiar":"Submitted · Tap EDIT to change"}
            </div>}
          </div>
        )}
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
                    const row=(team,slotIdx)=>{
                      if(!team||team==="TBD")return<div key={"tbd-"+slotIdx} style={{padding:"5px 7px",borderRadius:5,marginBottom:2,background:"#111E2E",color:"#5A7090",fontSize:11}}>TBD</div>;
                      const isPick=myPick===team;const correct=done&&actualW===team&&isPick;const wrong=done&&actualW!==team&&isPick;const isW=done&&actualW===team;
                      return(
                        <div key={team} onClick={()=>doPick(matchKey,team)} style={{padding:"5px 7px",borderRadius:5,marginBottom:2,cursor:locked||done||readOnly?"default":"pointer",background:correct?"rgba(34,197,94,.13)":wrong?"rgba(239,68,68,.11)":isPick?"rgba(212,168,67,.1)":"transparent",border:`1px solid ${correct?"rgba(34,197,94,.4)":wrong?"rgba(239,68,68,.38)":isPick?"rgba(212,168,67,.28)":"rgba(255,255,255,.07)"}`,color:correct?"#22C55E":wrong?"#EF4444":isPick?"#D4A843":isW?"#fff":"#9CA3AF",fontSize:11,fontWeight:isPick||isW?600:400,display:"flex",alignItems:"center",gap:4,transition:"all .1s"}}>
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
                        {row(t1,0)}{row(t2,1)}
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
  const [st,setSt]=useState({...tournament,bracketTeams:[...(tournament.bracketTeams||Array(32).fill(""))],groupResults:{...(tournament.groupResults||{})},bracketResults:{...(tournament.bracketResults||{})},bracketScores:{...(tournament.bracketScores||{})},matchResults:{...(tournament.matchResults||{})}});
  const [tab,setTab]=useState("approvals");
  const [saving,setSaving]=useState(false);
  const pending=Object.values(users).filter(u=>!u.approved);
  const approved=Object.values(users).filter(u=>u.approved);
  const save=async()=>{
    setSaving(true);
    try{
      // groupResults 저장 전 FIFA 공식 타이브레이커 순서로 자동 재정렬 (1위가 항상 [0])
      var fixedGroupResults = {};
      Object.entries(st.groupResults||{}).forEach(function(e){
        var grp=e[0], picked=e[1]||[];
        if(picked.length<2){ fixedGroupResults[grp]=picked; return; }
        // 해당 조 전체 경기 결과로 stats 계산 후 FIFA 순서 적용, picked팀만 필터
        var groupTeams = (GROUPS[grp]&&GROUPS[grp].teams)||[];
        var stats={};
        groupTeams.forEach(function(t){stats[t]={pts:0,gf:0,ga:0};});
        MATCH_SCHEDULE.forEach(function(m){
          if(m.group!==grp) return;
          var r=(st.matchResults||{})[m.id]||(st.matchResults||{})[m.id+"a"];
          if(!r) return;
          var h=parseInt(r.home),a=parseInt(r.away);
          if(isNaN(h)||isNaN(a)) return;
          if(!stats[m.home]||!stats[m.away]) return;
          stats[m.home].gf+=h;stats[m.home].ga+=a;
          stats[m.away].gf+=a;stats[m.away].ga+=h;
          if(h>a) stats[m.home].pts+=3;
          else if(h<a) stats[m.away].pts+=3;
          else { stats[m.home].pts++; stats[m.away].pts++; }
        });
        var sortedAll = fifaSortGroup(groupTeams, stats, grp, st.matchResults||{});
        fixedGroupResults[grp] = sortedAll.filter(function(t){return picked.includes(t);});
      });
      await saveTournamentState({...st, groupResults: fixedGroupResults});
      showToast("Saved ✓");
      onClose();
    }catch{showToast("Error","error");}
    setSaving(false);
  };
  const toggleGroup=(grp,team)=>setSt(prev=>{const cur=prev.groupResults?.[grp]||[];const next=cur.includes(team)?cur.filter(x=>x!==team):[...cur,team];return{...prev,groupResults:{...prev.groupResults,[grp]:next}};});
  const toggleManualQ=(team)=>setSt(prev=>{
    const mq={...(prev.manualQualified||{})};
    const mo={...(prev.manualOut||{})};
    if(mq[team]){ delete mq[team]; } else { mq[team]=true; delete mo[team]; }
    return{...prev,manualQualified:mq,manualOut:mo};
  });
  const toggleManualOut=(team)=>setSt(prev=>{
    const mq={...(prev.manualQualified||{})};
    const mo={...(prev.manualOut||{})};
    if(mo[team]){ delete mo[team]; } else { mo[team]=true; delete mq[team]; }
    return{...prev,manualQualified:mq,manualOut:mo};
  });
  const setBR=(key,winner)=>setSt(prev=>({...prev,bracketResults:{...prev.bracketResults,[key]:prev.bracketResults?.[key]===winner?"":winner}}));
  const setScore=(key,field,val)=>setSt(prev=>({...prev,bracketScores:{...prev.bracketScores,[key]:{...(prev.bracketScores?.[key]||{}),[field]:val}}}));
  const setTeam=(idx,val)=>setSt(prev=>{const arr=[...prev.bracketTeams];arr[idx]=val;return{...prev,bracketTeams:arr};});
  // 32강 시드 자동 채우기: groupResults(확정된 1·2위) + manualQualified(Q체크) 기반으로
  // R32_MATCHUPS 순서(A2,B2,E1,WC1...)에 맞춰 32칸을 한 번에 채움. 와일드카드(3위)는 골득실 순으로 자동 배정.
  const autoFillBracket=()=>{
    const gr=st.groupResults||{};
    const mq=st.manualQualified||{};
    const mr=st.matchResults||{};

    // 각 조의 1위/2위 확정값 (groupResults 우선)
    const winner={}, runnerUp={};
    Object.keys(GROUPS).forEach(function(g){
      const adv=gr[g]||[];
      if(adv[0]) winner[g]=adv[0];
      if(adv[1]) runnerUp[g]=adv[1];
    });

    // manualQualified로 체크된 팀 중, groupResults에 없는 조의 1위/2위 추정
    // (Q체크된 팀이 2명이면 골득실 순으로 1위/2위 배정, 1명이면 1위만)
    Object.keys(GROUPS).forEach(function(g){
      if(winner[g]&&runnerUp[g]) return; // 이미 확정됨
      const teams=GROUPS[g].teams||[];
      const qTeams=teams.filter(function(tm){return !!mq[tm];});
      if(qTeams.length>=2){
        const stats=(computeAllGroupStats(mr)[g])||{};
        const sorted=fifaSortGroup(qTeams,stats,g,mr);
        if(!winner[g]) winner[g]=sorted[0];
        if(!runnerUp[g]) runnerUp[g]=sorted[1];
      } else if(qTeams.length===1&&!winner[g]){
        winner[g]=qTeams[0];
      }
    });

    // 와일드카드(3위) 후보: 각 조 3위 중 Q체크된 팀들을 골득실 순으로 정렬해 WC1~WC8 배정
    const thirdCandidates=[];
    Object.keys(GROUPS).forEach(function(g){
      const teams=GROUPS[g].teams||[];
      const stats=(computeAllGroupStats(mr)[g])||{};
      const sorted=fifaSortGroup(teams,stats,g,mr);
      const third=sorted[2];
      if(third&&mq[third]&&third!==winner[g]&&third!==runnerUp[g]){
        thirdCandidates.push({team:third,stats:stats[third]||{pts:0,gd:0,gf:0}});
      }
    });
    thirdCandidates.sort(function(a,b){
      return (b.stats.pts-a.stats.pts)||(b.stats.gd-a.stats.gd)||(b.stats.gf-a.stats.gf);
    });
    const wildcards={};
    thirdCandidates.slice(0,8).forEach(function(c,i){ wildcards["WC"+(i+1)]=c.team; });

    function resolveSeed(seed){
      if(seed.indexOf("WC")===0) return wildcards[seed]||"";
      const g=seed[0], pos=seed[1];
      if(pos==="1") return winner[g]||"";
      if(pos==="2") return runnerUp[g]||"";
      return "";
    }

    const arr=R32_MATCHUPS.map(resolveSeed);
    setSt(function(prev){ return {...prev, bracketTeams:arr}; });
    showToast(lang==="ko"?"32강 자동 채우기 완료 ✓":"Round of 32 auto-filled ✓");
  };
  const TABS=[["approvals",t.approvals+(pending.length>0?` (${pending.length})`:"")] ,["payments",t.payments],["phase",t.phase],["matches",lang==="ko"?"경기결과":"MATCH RESULTS"],["group",t.group_tab],["teams",t.teams_tab],["bracket",t.bracket_tab],["userpicks",lang==="ko"?"사용자 픽 현황":"USER PICKS"]];
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.9)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(6px)"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#0C1620",border:"1px solid rgba(239,68,68,.22)",borderRadius:18,padding:"20px 18px",maxWidth:860,width:"96vw",maxHeight:"91vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={{fontFamily:"'Teko',sans-serif",fontSize:20,color:"#f87171",letterSpacing:".1em"}}>🔑 {t.adminTitle}</div>
          <button onClick={onClose} style={{background:"transparent",border:"none",color:"#5A7090",fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{display:"flex",gap:4,marginBottom:14,overflowX:"auto",paddingBottom:2}}>
          {TABS.map(([id,label])=>(
            <button key={id} onClick={(e)=>{e.stopPropagation();setTab(id);}} style={{padding:"10px 14px",borderRadius:7,fontSize:12,fontFamily:"'Teko',sans-serif",letterSpacing:".1em",whiteSpace:"nowrap",cursor:"pointer",border:`1px solid ${tab===id?"rgba(239,68,68,.5)":"rgba(255,255,255,.09)"}`,background:tab===id?"rgba(239,68,68,.14)":"transparent",color:tab===id?"#f87171":"#5A7090",minHeight:40,touchAction:"manipulation"}}>{label.toUpperCase()}</button>
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
              {["group","bracket"].map(p=><button key={p} onClick={()=>setSt(prev=>({...prev,phase:p}))} style={{padding:"12px 20px",borderRadius:8,fontFamily:"'Teko',sans-serif",cursor:"pointer",border:`1px solid ${st.phase===p?"rgba(239,68,68,.5)":"rgba(255,255,255,.09)"}`,background:st.phase===p?"rgba(239,68,68,.14)":"transparent",color:st.phase===p?"#f87171":"#5A7090",touchAction:"manipulation",minHeight:44}}>{p==="group"?t.groupStage.toUpperCase():t.knockout.toUpperCase()}</button>)}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {[["groupLocked",t.lockGroup],["bracketLocked",t.lockBracket]].map(([key,label])=>(
                <button key={key} onClick={(e)=>{e.stopPropagation();setSt(prev=>({...prev,[key]:!prev[key]}));}}
                  style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",padding:"12px 16px",marginBottom:8,borderRadius:10,border:`1px solid ${st[key]?"rgba(239,68,68,.5)":"rgba(255,255,255,.1)"}`,background:st[key]?"rgba(239,68,68,.1)":"rgba(255,255,255,.03)",width:"100%",touchAction:"manipulation"}}>
                  <div style={{width:40,height:22,borderRadius:11,background:st[key]?"#EF4444":"rgba(255,255,255,.15)",position:"relative",flexShrink:0,transition:"background .2s"}}>
                    <div style={{width:18,height:18,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:st[key]?20:2,transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.3)"}}/>
                  </div>
                  <span style={{fontSize:13,color:st[key]?"#f87171":"#9CA3AF",fontWeight:500,flex:1,textAlign:"left"}}>{label}</span>
                  <span style={{fontSize:11,color:st[key]?"#f87171":"#5A7090"}}>{st[key]?"🔒 ON":"OFF"}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab==="matches"&&(
          <div>
            <p style={{color:"#5A7090",fontSize:12,marginBottom:12}}>
              {lang==="ko"?"경기 스코어 입력 후 SAVE ALL CHANGES":"Enter match scores then SAVE ALL CHANGES"}
            </p>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {MATCH_SCHEDULE.map(function(m){
                const r = st.matchResults?.[m.id] || {home:"",away:""};
                const done = r.home!==""&&r.away!=="";
                return(
                  <div key={m.id} style={{background:done?"rgba(34,197,94,.05)":"#111E2E",border:`0.5px solid ${done?"rgba(34,197,94,.2)":"rgba(255,255,255,.07)"}`,borderRadius:10,padding:"10px 12px",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                    {/* 경기 정보 */}
                    <div style={{fontSize:10,color:"#5A7090",width:"100%",marginBottom:4}}>
                      {m.date} · {m.time} · Group {m.group}
                    </div>
                    {/* 홈팀 */}
                    <span style={{fontSize:12,color:"#E0E8F0",flex:1,textAlign:"right",minWidth:80}}>{tn(m.home,lang)}</span>
                    {/* 홈 스코어 */}
                    <input type="number" min="0" max="20" value={r.home}
                      onChange={function(e){setSt(function(prev){const mr={...(prev.matchResults||{})};mr[m.id]={...(mr[m.id]||{home:"",away:""}),home:e.target.value};return{...prev,matchResults:mr};});}}
                      style={{width:44,textAlign:"center",background:"rgba(255,255,255,.08)",border:"0.5px solid rgba(255,255,255,.15)",borderRadius:6,color:"#fff",fontSize:16,fontFamily:"'Teko',sans-serif",padding:"4px 0",touchAction:"manipulation"}}
                    />
                    <span style={{color:"#5A7090",fontSize:14}}>–</span>
                    {/* 어웨이 스코어 */}
                    <input type="number" min="0" max="20" value={r.away}
                      onChange={function(e){setSt(function(prev){const mr={...(prev.matchResults||{})};mr[m.id]={...(mr[m.id]||{home:"",away:""}),away:e.target.value};return{...prev,matchResults:mr};});}}
                      style={{width:44,textAlign:"center",background:"rgba(255,255,255,.08)",border:"0.5px solid rgba(255,255,255,.15)",borderRadius:6,color:"#fff",fontSize:16,fontFamily:"'Teko',sans-serif",padding:"4px 0",touchAction:"manipulation"}}
                    />
                    {/* 어웨이팀 */}
                    <span style={{fontSize:12,color:"#E0E8F0",flex:1,minWidth:80}}>{tn(m.away,lang)}</span>
                    {done&&<span style={{fontSize:11,color:"#22C55E"}}>✓</span>}
                  </div>
                );
              })}
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
                    {teams.map((team,i)=>{
                      const on=adv.includes(team);
                      const isQ=!!(st.manualQualified&&st.manualQualified[team]);
                      const isOut=!!(st.manualOut&&st.manualOut[team]);
                      return(
                      <div key={team} style={{display:"flex",alignItems:"center",gap:4,marginBottom:4}}>
                        <div onClick={()=>toggleGroup(grp,team)} style={{flex:1,display:"flex",alignItems:"center",gap:6,padding:"10px 10px",borderRadius:8,cursor:"pointer",touchAction:"manipulation",minHeight:40,background:on?"rgba(239,68,68,.12)":"transparent",border:`1px solid ${on?"rgba(239,68,68,.4)":"rgba(255,255,255,.07)"}`,color:on?"#f87171":"#5A7090",fontSize:11}}>
                          <span>{flags[i]}</span><span style={{flex:1}}>{tn(team,lang)}</span>{on&&"✓"}
                        </div>
                        <button onClick={(e)=>{e.stopPropagation();toggleManualQ(team);}} style={{minWidth:32,minHeight:40,borderRadius:6,border:`1px solid ${isQ?"rgba(34,197,94,.5)":"rgba(255,255,255,.1)"}`,background:isQ?"rgba(34,197,94,.18)":"transparent",color:isQ?"#22C55E":"#3A5070",fontSize:10,fontWeight:700,touchAction:"manipulation",cursor:"pointer"}}>Q</button>
                        <button onClick={(e)=>{e.stopPropagation();toggleManualOut(team);}} style={{minWidth:36,minHeight:40,borderRadius:6,border:`1px solid ${isOut?"rgba(239,68,68,.5)":"rgba(255,255,255,.1)"}`,background:isOut?"rgba(239,68,68,.18)":"transparent",color:isOut?"#EF4444":"#3A5070",fontSize:9,fontWeight:700,touchAction:"manipulation",cursor:"pointer"}}>OUT</button>
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
            <button onClick={autoFillBracket} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,width:"100%",padding:"12px 16px",borderRadius:10,border:"1px solid rgba(212,168,67,.4)",background:"rgba(212,168,67,.1)",color:"#D4A843",fontFamily:"'Teko',sans-serif",fontSize:15,fontWeight:700,cursor:"pointer",marginBottom:12,touchAction:"manipulation",minHeight:44}}>
              ⚡ {lang==="ko"?"Q체크 팀으로 32강 자동 채우기":"Auto-fill from Q-checked teams"}
            </button>
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
                          <div style={{display:"flex",gap:4,marginBottom:4}}>
                            {[t1,t2].map(team=>(
                              <button key={team} onClick={()=>setBR(matchKey,team)} style={{flex:1,padding:"5px",borderRadius:5,fontSize:10,cursor:"pointer",border:`1px solid ${winner===team?"rgba(239,68,68,.5)":"rgba(255,255,255,.09)"}`,background:winner===team?"rgba(239,68,68,.15)":"transparent",color:winner===team?"#f87171":"#5A7090"}}>{tn(team,lang)}</button>
                            ))}
                            {winner&&<button onClick={()=>setBR(matchKey,"")} style={{padding:"5px 6px",borderRadius:5,border:"1px solid rgba(255,255,255,.09)",background:"transparent",color:"#5A7090",fontSize:9,cursor:"pointer"}}>✕</button>}
                          </div>
                          {winner&&(
                            <div style={{display:"flex",gap:3,alignItems:"center"}}>
                              <input placeholder="홈" value={(st.bracketScores?.[matchKey]?.home)||""} onChange={e=>setScore(matchKey,"home",e.target.value)}
                                style={{width:32,padding:"3px 4px",borderRadius:4,border:"1px solid rgba(255,255,255,.1)",background:"rgba(255,255,255,.05)",color:"#E0E8F0",fontSize:11,textAlign:"center"}}/>
                              <span style={{fontSize:9,color:"#5A7090"}}>-</span>
                              <input placeholder="어웨" value={(st.bracketScores?.[matchKey]?.away)||""} onChange={e=>setScore(matchKey,"away",e.target.value)}
                                style={{width:32,padding:"3px 4px",borderRadius:4,border:"1px solid rgba(255,255,255,.1)",background:"rgba(255,255,255,.05)",color:"#E0E8F0",fontSize:11,textAlign:"center"}}/>
                              <span style={{fontSize:9,color:"#5A7090",marginLeft:2}}>PEN:</span>
                              <input placeholder="4-3" value={(st.bracketScores?.[matchKey]?.pen)||""} onChange={e=>setScore(matchKey,"pen",e.target.value)}
                                style={{width:38,padding:"3px 4px",borderRadius:4,border:"1px solid rgba(255,255,255,.1)",background:"rgba(255,255,255,.05)",color:"#D4A843",fontSize:11,textAlign:"center"}}/>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

{tab==="userpicks"&&(
          <div>
            <p style={{color:"#5A7090",fontSize:13,marginBottom:10}}>
              {lang==="ko"?"각 사용자의 브래킷 픽(32강~결승)을 확인합니다. 31/31이 아니면 아직 제출 전입니다.":"View each user's full bracket picks (R32-Final). Anything below 31/31 has not been submitted yet."}
            </p>
            {Object.values(users).filter(u=>u.approved&&u.paid).map(u=>{
              const bp = u.bracketPicks||{};
              const pickedKeys = Object.keys(bp);
              const TOTAL = Object.values(ROUND_META).reduce((s,m)=>s+m.matches,0);
              const isFull = pickedKeys.length >= TOTAL;
              return(
                <details key={u.uid} style={{background:"#111E2E",borderRadius:8,marginBottom:6,border:"1px solid rgba(255,255,255,.07)"}}>
                  <summary style={{padding:"10px 12px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",touchAction:"manipulation"}}>
                    <span style={{fontSize:13,color:"#E0E8F0"}}>{u.name}</span>
                    <span style={{fontSize:11,fontWeight:700,color:isFull?"#22C55E":"#EF4444"}}>{pickedKeys.length}/{TOTAL}</span>
                  </summary>
                  <div style={{padding:"0 12px 12px"}}>
                    {pickedKeys.length===0?(
                      <div style={{fontSize:12,color:"#5A7090",padding:"6px 0"}}>{lang==="ko"?"아직 픽하지 않음":"No picks yet"}</div>
                    ):(
                      ROUNDS.map(round=>{
                        const {matches} = ROUND_META[round];
                        const roundPicks = [];
                        for(let i=0;i<matches;i++){
                          const key = `${round}_${i}`;
                          if(bp[key]) roundPicks.push({key, team:bp[key]});
                        }
                        if(roundPicks.length===0) return null;
                        return(
                          <div key={round} style={{marginBottom:8}}>
                            <div style={{fontSize:10,color:"#5A7090",marginBottom:3,letterSpacing:".06em"}}>{ROUND_META[round].label[lang]}</div>
                            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                              {roundPicks.map(rp=>(
                                <span key={rp.key} style={{fontSize:11,padding:"3px 8px",borderRadius:6,background:"rgba(212,168,67,.1)",color:"#D4A843"}}>{tn(rp.team,lang)}</span>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        )}

        <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:18}}>
          <button onClick={onClose} style={{padding:"7px 16px",borderRadius:8,border:"1px solid rgba(255,255,255,.09)",background:"transparent",color:"#5A7090",fontSize:12,cursor:"pointer"}}>{t.cancel}</button>
          <button onClick={save} disabled={saving} style={{padding:"12px 24px",borderRadius:8,border:"none",background:"#EF4444",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",opacity:saving?0.7:1,touchAction:"manipulation",minHeight:44}}>{saving?t.saving:t.saveAll}</button>
          {tab==="group"&&<button onClick={async()=>{
            const grpRes=st.groupResults||{};
            const entries=Object.entries(grpRes);
            await Promise.all(entries.map(async function(e){
              var grp=e[0],teams=e[1];
              if(teams&&teams.length>0){
                try{await fetch("/api/notify-group-result",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({adminSecret:"korbiz2026admin",groupKey:grp,advancedTeams:teams})});}catch(err){}
              }
            }));

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
  const setTabAndScroll = (t) => { setTab(t); window.scrollTo({top:0,behavior:"smooth"}); };
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

  // 탭 변경 시 맨 위로
  useEffect(()=>{ setTimeout(function(){window.scrollTo({top:0,behavior:"instant"});},0); },[tab]);

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
    {id:"results",label:lang==="ko"?"결과/일정":lang==="es"?"RESULTADOS":"RESULTS & SCHEDULE"},
    {id:"prophet",label:"🔮 PROPHET"},
    {id:"leaderboard",label:t.standings},
    ...(phase!=="bracket"?[{id:"stats",label:lang==="ko"?"통계":lang==="es"?"STATS":"STATS"}]:[]),
    {id:"info",label:lang==="ko"?"정보":"INFO 🌍"},
    {id:"rules",label:t.howToPlay},
  ];

  return(
    <div style={{minHeight:"100vh",background:"#060C14",fontFamily:"'Outfit',sans-serif",color:"#E0E8F0",overflowX:"hidden",touchAction:"pan-y",overscrollBehaviorX:"none"}}>
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
        </div>
        <div style={{display:"flex",borderTop:"1px solid rgba(255,255,255,.07)",overflowX:"auto",WebkitOverflowScrolling:"touch",msOverflowStyle:"none",scrollbarWidth:"none",touchAction:"pan-x",overscrollBehaviorY:"contain"}}>
          {tabs.map(tb=><button key={tb.id} onClick={()=>setTabAndScroll(tb.id)} style={{padding:"12px 14px",border:"none",background:"transparent",whiteSpace:"nowrap",color:tab===tb.id?"#D4A843":"#5A7090",borderBottom:`2px solid ${tab===tb.id?"#D4A843":"transparent"}`,fontFamily:"'Teko',sans-serif",letterSpacing:".12em",fontSize:13,whiteSpace:"nowrap",cursor:"pointer",touchAction:"manipulation",minHeight:44}}>{tb.label.toUpperCase()}</button>)}
          <button onClick={signOutUser} style={{padding:"12px 14px",border:"none",background:"transparent",whiteSpace:"nowrap",color:"#EF4444",borderBottom:"2px solid transparent",fontFamily:"'Teko',sans-serif",letterSpacing:".12em",fontSize:13,cursor:"pointer",touchAction:"manipulation",minHeight:44,flexShrink:0}}>↪ {t.signOut.toUpperCase()}</button>
        </div>
      </div>

      <div style={{maxWidth:1280,margin:"0 auto",padding:"12px 10px"}}>
        {tab==="dashboard"&&<Dashboard users={users} tournament={tournament} currentUid={firebaseUser.uid} lang={lang}/>}
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
        {tab==="results"&&<ResultsTab users={users} tournament={tournament} currentUid={firebaseUser.uid} lang={lang}/>}
        {tab==="prophet"&&<ProphetTab users={users} tournament={tournament} currentUid={firebaseUser.uid} lang={lang}/>}
        {tab==="leaderboard"&&<Leaderboard users={users} currentUid={firebaseUser.uid} tournament={tournament} t={t} lang={lang}/>}
        {tab==="stats"&&<PickStats users={users} tournament={tournament} lang={lang}/>}
        {tab==="info"&&<InfoTab users={users} tournament={tournament} currentUid={firebaseUser.uid} lang={lang}/>}
        {tab==="rules"&&<HowToPlay lang={lang}/>}
      </div>

      {showAdmin&&admin&&<AdminPanel tournament={tournament} users={users} onClose={()=>setShowAdmin(false)} showToast={showMsg} t={t} lang={lang}/>}
      {toast&&<div style={{position:"fixed",bottom:20,left:"50%",transform:"translateX(-50%)",background:toast.type==="error"?"#EF4444":"#D4A843",color:toast.type==="error"?"#fff":"#000",fontWeight:700,padding:"9px 22px",borderRadius:9,fontSize:13,zIndex:9999,boxShadow:"0 8px 40px rgba(0,0,0,.6)",whiteSpace:"nowrap"}}>{toast.msg}</div>}
    </div>
  );
}
