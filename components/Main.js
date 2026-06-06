"use client";
import { useState, useEffect } from "react";

// ─── WORLD CUP DATA ───────────────────────────────────────────────────────────
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
  R32: { label:"Round of 32",   pts:5,  matches:16 },
  R16: { label:"Round of 16",   pts:10, matches:8  },
  QF:  { label:"Quarterfinals", pts:15, matches:4  },
  SF:  { label:"Semifinals",    pts:20, matches:2  },
  F:   { label:"Final",         pts:30, matches:1  },
};

// ─── TRANSLATIONS ──────────────────────────────────────────────────────────────
const T = {
  en: {
    title: "WORLD CUP 2026",
    subtitle: "BRACKET CHALLENGE",
    org: "KORBIZ INTERNAL",
    entryFee: "ENTRY FEE",
    howToPlay: "HOW TO PLAY",
    awaiting: "AWAITING APPROVAL",
    awaitingMsg: "Your registration has been received. Dave will approve your entry once your $30 has been collected. You'll get full access immediately after approval.",
    phase1Title: "PHASE 1 — GROUP STAGE",
    phase1: "Pick up to 3 teams per group that you think will advance to the Round of 32. You earn +3 points for each correct team — it doesn't matter if they finish 1st, 2nd, or 3rd.",
    phase2Title: "PHASE 2 — KNOCKOUT BRACKET",
    phase2: "Once the group stage ends, the 32 qualified teams enter a March Madness-style bracket. Pick the winner of every single match. Points increase with each round.",
    scoring: "SCORING",
    payment: "HOW TO PAY",
    paymentDesc: "Pay $30 cash to Dave Ha. Once received, Dave will approve your access and you can start making picks. All picks lock when each phase begins.",
    prizeDist: "PRIZE DISTRIBUTION",
    prize1: "1st Place — 50% of pool",
    prize2: "2nd Place — 30% of pool",
    prize3: "3rd Place — 20% of pool",
    format: "2026 FORMAT",
    formatDesc: "48 teams · 12 groups of 4 · Top 2 per group advance automatically · Best 8 third-place teams also qualify · Total 32 teams in knockout stage",
    register: "REGISTER",
    enterName: "Your full name",
    enterEmail: "Your email address",
    joinBtn: "JOIN THE CHALLENGE",
    alreadyHave: "Already registered?",
    switchToLogin: "Sign in",
    loginBtn: "SIGN IN",
    noAccount: "New here?",
    switchToRegister: "Register",
    signOut: "Sign out",
    picks: "MY PICKS",
    standings: "STANDINGS",
    rules: "RULES",
    groupPicks: "GROUP PICKS",
    bracket: "BRACKET",
    savePicks: "SAVE PICKS",
    saved: "Saved ✓",
    ptsLabel: "PTS",
    paid: "PAID",
    unpaid: "UNPAID",
    admin: "ADMIN",
    groupStage: "GROUP STAGE",
    knockout: "KNOCKOUT",
    prizePot: "PRIZE POOL",
    pointSystem: "POINT SYSTEM",
    keyDates: "KEY DATES",
    groupLock: "Group picks lock: June 12, 2026",
    finalDate: "Final: July 19, 2026 — MetLife Stadium, NJ",
    bracketWait: "BRACKET OPENS AFTER GROUP STAGE",
    bracketWaitSub: "32 qualified teams will be seeded once group stage concludes",
    groupCorrect: "per correct qualifier",
    maxPhase1: "Max Phase 1",
    maxPhase2: "Max Phase 2",
    nameTaken: "This name is already registered. Please sign in instead.",
    fillAll: "Please fill in both fields.",
    registered: "Registered! Awaiting Dave's approval.",
    userNotFound: "Name not found. Please register first.",
  },
  es: {
    title: "MUNDIAL 2026",
    subtitle: "DESAFÍO DE BRACKET",
    org: "KORBIZ INTERNO",
    entryFee: "CUOTA DE ENTRADA",
    howToPlay: "CÓMO JUGAR",
    awaiting: "ESPERANDO APROBACIÓN",
    awaitingMsg: "Tu registro fue recibido. Dave aprobará tu entrada una vez que se haya cobrado tu $30. Tendrás acceso completo inmediatamente después de la aprobación.",
    phase1Title: "FASE 1 — FASE DE GRUPOS",
    phase1: "Elige hasta 3 equipos por grupo que creas que avanzarán a los octavos de final. Ganas +3 puntos por cada equipo correcto — no importa si terminan 1.°, 2.° o 3.°.",
    phase2Title: "FASE 2 — BRACKET ELIMINATORIO",
    phase2: "Una vez que termine la fase de grupos, los 32 equipos clasificados entran en un bracket estilo March Madness. Elige al ganador de cada partido. Los puntos aumentan con cada ronda.",
    scoring: "PUNTUACIÓN",
    payment: "CÓMO PAGAR",
    paymentDesc: "Paga $30 en efectivo a Dave Ha. Una vez recibido, Dave aprobará tu acceso y podrás comenzar a hacer tus selecciones. Todas las selecciones se bloquean cuando comienza cada fase.",
    prizeDist: "DISTRIBUCIÓN DE PREMIOS",
    prize1: "1er lugar — 50% del pozo",
    prize2: "2do lugar — 30% del pozo",
    prize3: "3er lugar — 20% del pozo",
    format: "FORMATO 2026",
    formatDesc: "48 equipos · 12 grupos de 4 · Los 2 mejores de cada grupo avanzan automáticamente · Los 8 mejores terceros también califican · 32 equipos en total en fase eliminatoria",
    register: "REGISTRO",
    enterName: "Tu nombre completo",
    enterEmail: "Tu correo electrónico",
    joinBtn: "UNIRSE AL DESAFÍO",
    alreadyHave: "¿Ya estás registrado?",
    switchToLogin: "Iniciar sesión",
    loginBtn: "INICIAR SESIÓN",
    noAccount: "¿Nuevo aquí?",
    switchToRegister: "Registrarse",
    signOut: "Cerrar sesión",
    picks: "MIS SELECCIONES",
    standings: "CLASIFICACIÓN",
    rules: "REGLAS",
    groupPicks: "PICKS DE GRUPO",
    bracket: "BRACKET",
    savePicks: "GUARDAR",
    saved: "Guardado ✓",
    ptsLabel: "PTS",
    paid: "PAGADO",
    unpaid: "PENDIENTE",
    admin: "ADMIN",
    groupStage: "FASE DE GRUPOS",
    knockout: "ELIMINATORIA",
    prizePot: "POZO DE PREMIOS",
    pointSystem: "SISTEMA DE PUNTOS",
    keyDates: "FECHAS CLAVE",
    groupLock: "Selecciones de grupo cierran: 12 de junio de 2026",
    finalDate: "Final: 19 de julio de 2026 — MetLife Stadium, NJ",
    bracketWait: "EL BRACKET ABRE DESPUÉS DE LA FASE DE GRUPOS",
    bracketWaitSub: "Los 32 equipos clasificados serán sembrados una vez concluya la fase de grupos",
    groupCorrect: "por clasificado correcto",
    maxPhase1: "Máx Fase 1",
    maxPhase2: "Máx Fase 2",
    nameTaken: "Este nombre ya está registrado. Por favor inicia sesión.",
    fillAll: "Por favor completa ambos campos.",
    registered: "¡Registrado! Esperando aprobación de Dave.",
    userNotFound: "Nombre no encontrado. Por favor regístrate primero.",
  },
  mn: {
    title: "ДЭЛХИЙН ЦОМ 2026",
    subtitle: "BRACKET ТОГЛООМ",
    org: "KORBIZ ДОТООД",
    entryFee: "ОРОЛЦООНЫ ХУРААМЖ",
    howToPlay: "ХЭРХЭН ТОГЛОХ",
    awaiting: "ЗӨВШӨӨРЛИЙГ ХҮЛЭЭЖ БАЙНА",
    awaitingMsg: "Таны бүртгэл хүлээн авлаа. Dave таны $30-ыг хүлээн авсны дараа зөвшөөрөл өгнө. Зөвшөөрөл өгөгдмөгц бүрэн хандалт нээгдэнэ.",
    phase1Title: "1-Р ҮЕ ШАТ — БҮЛГИЙН ТОГЛОЛТ",
    phase1: "Бүлэг тус бүрээс дараагийн шатанд гарна гэж бодсон 3 хүртэлх багийг сонго. Зөв таасан баг тутамд +3 оноо авна — 1, 2, 3-р байр хамаагүй.",
    phase2Title: "2-Р ҮЕ ШАТ — BRACKET ТЭМЦЭЭН",
    phase2: "Бүлгийн шат дуусмагц 32 тэмцэгч March Madness загварын bracket-д орно. Тоглолт бүрийн ялагчийг сонго. Шат ахих тусам оноо нэмэгдэнэ.",
    scoring: "ОНОО ТООЦООЛОЛ",
    payment: "ХЭРХЭН ТӨЛӨХ",
    paymentDesc: "Dave Ha-д $30 бэлнээр төл. Хүлээн авмагц Dave хандалт нээж өгнө. Шат бүр эхэлмэгц сонголтууд хаагдана.",
    prizeDist: "ШАГНАЛЫН ХУВААРИЛАЛТ",
    prize1: "1-р байр — нийт дүнгийн 50%",
    prize2: "2-р байр — нийт дүнгийн 30%",
    prize3: "3-р байр — нийт дүнгийн 20%",
    format: "2026 ФОРМАТ",
    formatDesc: "48 баг · 12 бүлэг, бүлэг тус бүрт 4 баг · Бүлэг тус бүрийн шилдэг 2 баг автоматаар дэвшинэ · Шилдэг 8 3-р байрын баг мөн дэвшинэ · Нийт 32 баг playoff-д орно",
    register: "БҮРТГЭЛ",
    enterName: "Бүтэн нэр",
    enterEmail: "И-мэйл хаяг",
    joinBtn: "ТОГЛООМД НЭГДЭХ",
    alreadyHave: "Аль хэдийн бүртгэгдсэн үү?",
    switchToLogin: "Нэвтрэх",
    loginBtn: "НЭВТРЭХ",
    noAccount: "Шинэ хэрэглэгч үү?",
    switchToRegister: "Бүртгүүлэх",
    signOut: "Гарах",
    picks: "МИНИЙ СОНГОЛТ",
    standings: "БАЙДАЛ",
    rules: "ДҮРЭМ",
    groupPicks: "БҮЛГИЙН СОНГОЛТ",
    bracket: "BRACKET",
    savePicks: "ХАДГАЛАХ",
    saved: "Хадгалагдлаа ✓",
    ptsLabel: "ОНО",
    paid: "ТӨЛСӨН",
    unpaid: "ТӨЛӨӨГҮЙ",
    admin: "АДМИН",
    groupStage: "БҮЛГИЙН ШАТНЫ",
    knockout: "KNOCKOUT",
    prizePot: "ШАГНАЛЫН САН",
    pointSystem: "ОНОО СИСТЕМ",
    keyDates: "ГОЛ ОГНООНУУД",
    groupLock: "Бүлгийн сонголт хаагдах: 2026 оны 6-р сарын 12",
    finalDate: "Финал: 2026 оны 7-р сарын 19 — MetLife Stadium, NJ",
    bracketWait: "BRACKET БҮЛГИЙН ШАТ ДУУССАНЫ ДАРАА НЭЭГДЭНЭ",
    bracketWaitSub: "32 тэмцэгч бүлгийн шат дуусмагц жагсаагдана",
    groupCorrect: "зөв тогтоосон баг тутамд",
    maxPhase1: "1-р үе шатын дээд",
    maxPhase2: "2-р үе шатын дээд",
    nameTaken: "Энэ нэр аль хэдийн бүртгэгдсэн. Нэвтрэх хэсэгт очно уу.",
    fillAll: "Талбаруудыг бүгдийг бөглөнө үү.",
    registered: "Бүртгэгдлээ! Dave-ийн зөвшөөрлийг хүлээж байна.",
    userNotFound: "Нэр олдсонгүй. Эхлээд бүртгүүлнэ үү.",
  },
};

// ─── SCORE CALC ───────────────────────────────────────────────────────────────
function calcScore(picks = {}, tournament = {}) {
  let total = 0, breakdown = [];
  const gr = tournament.groupResults || {};
  Object.entries(picks.groupPicks || {}).forEach(([grp, picked]) => {
    (picked || []).forEach(t => {
      if ((gr[grp] || []).includes(t)) { total += 3; breakdown.push({ l: `Group ${grp}: ${t}`, p: 3 }); }
    });
  });
  const br = tournament.bracketResults || {};
  Object.entries(picks.bracketPicks || {}).forEach(([key, winner]) => {
    if (br[key] && br[key] === winner) {
      const pts = ROUND_META[key.split("_")[0]]?.pts ?? 5;
      total += pts; breakdown.push({ l: `${ROUND_META[key.split("_")[0]]?.label}: ${winner}`, p: pts });
    }
  });
  return { total, breakdown };
}

// ─── AVATAR ───────────────────────────────────────────────────────────────────
function Avatar({ name, size = 36 }) {
  const ini = (name || "?").split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase();
  const pal = [["#D4A843","#7a5c10"],["#3B82F6","#1e40af"],["#22C55E","#166534"],["#EF4444","#991b1b"],["#8B5CF6","#5b21b6"],["#F59E0B","#92400e"]];
  const c = pal[(name||"").charCodeAt(0) % pal.length];
  return <div style={{ width:size,height:size,borderRadius:"50%",background:`linear-gradient(135deg,${c[0]},${c[1]})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.38,fontWeight:700,color:"#fff",fontFamily:"'Teko',sans-serif",flexShrink:0 }}>{ini}</div>;
}

// ─── LANG SWITCHER ────────────────────────────────────────────────────────────
function LangSwitcher({ lang, setLang }) {
  const opts = [["en","EN 🇺🇸"],["es","ES 🇲🇽"],["mn","MN 🇲🇳"]];
  return (
    <div style={{ display:"flex",gap:6 }}>
      {opts.map(([k,label]) => (
        <button key={k} onClick={() => setLang(k)} style={{
          padding:"5px 12px",borderRadius:8,border:`1px solid ${lang===k?"#D4A843":"rgba(255,255,255,.12)"}`,
          background:lang===k?"rgba(212,168,67,.15)":"transparent",
          color:lang===k?"#D4A843":"#6b7280",fontSize:12,fontWeight:600,
          cursor:"pointer",transition:"all .15s",
        }}>{label}</button>
      ))}
    </div>
  );
}

// ─── PENDING / INFO SCREEN ────────────────────────────────────────────────────
function PendingScreen({ user, lang, setLang, onSignOut, t }) {
  return (
    <div style={{ minHeight:"100vh",background:"#060C14",backgroundImage:"radial-gradient(ellipse at 20% 60%,rgba(212,168,67,.06) 0%,transparent 60%)" }}>
      {/* Top bar */}
      <div style={{ background:"#0C1620",borderBottom:"1px solid rgba(255,255,255,.07)",padding:"12px 20px",display:"flex",alignItems:"center",gap:12 }}>
        <span style={{ fontSize:22 }}>🏆</span>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Teko',sans-serif",fontSize:10,color:"#5A7090",letterSpacing:".22em" }}>KORBIZ</div>
          <div style={{ fontFamily:"'Teko',sans-serif",fontSize:18,color:"#D4A843",lineHeight:1 }}>WORLD CUP 2026</div>
        </div>
        <LangSwitcher lang={lang} setLang={setLang} />
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <Avatar name={user.name} size={32} />
          <button onClick={onSignOut} style={{ background:"transparent",border:"1px solid rgba(255,255,255,.12)",borderRadius:8,padding:"5px 12px",color:"#6b7280",fontSize:12,cursor:"pointer" }}>{t.signOut}</button>
        </div>
      </div>

      <div style={{ maxWidth:740,margin:"0 auto",padding:"32px 20px" }}>
        {/* Awaiting banner */}
        <div style={{ background:"rgba(212,168,67,.1)",border:"1px solid rgba(212,168,67,.3)",borderRadius:14,padding:"20px 24px",marginBottom:28,display:"flex",gap:16,alignItems:"flex-start" }}>
          <div style={{ fontSize:36,flexShrink:0 }}>⏳</div>
          <div>
            <div style={{ fontFamily:"'Teko',sans-serif",fontSize:20,color:"#D4A843",letterSpacing:".1em",marginBottom:6 }}>{t.awaiting}</div>
            <div style={{ fontSize:14,color:"#9CA3AF",lineHeight:1.7 }}>{t.awaitingMsg}</div>
          </div>
        </div>

        {/* How to Pay */}
        <Section icon="💵" title={t.payment} accent="#22C55E">
          <p style={{ fontSize:14,color:"#D1D5DB",lineHeight:1.8 }}>{t.paymentDesc}</p>
        </Section>

        {/* Prize */}
        <Section icon="🏆" title={t.prizeDist} accent="#D4A843">
          <div style={{ display:"flex",gap:10,flexWrap:"wrap",marginTop:4 }}>
            {[t.prize1, t.prize2, t.prize3].map((p,i) => (
              <div key={i} style={{ flex:"1 1 160px",background:"rgba(212,168,67,.08)",border:"1px solid rgba(212,168,67,.2)",borderRadius:10,padding:"12px 16px",textAlign:"center" }}>
                <div style={{ fontSize:24 }}>{["🥇","🥈","🥉"][i]}</div>
                <div style={{ fontSize:13,color:"#D4A843",marginTop:4,fontWeight:600 }}>{p}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* How to Play */}
        <Section icon="📋" title={t.howToPlay} accent="#3B82F6">
          <div style={{ marginBottom:14 }}>
            <div style={{ fontFamily:"'Teko',sans-serif",fontSize:16,color:"#D4A843",letterSpacing:".1em",marginBottom:6 }}>{t.phase1Title}</div>
            <p style={{ fontSize:14,color:"#D1D5DB",lineHeight:1.7 }}>{t.phase1}</p>
            <div style={{ display:"flex",gap:10,marginTop:10,flexWrap:"wrap" }}>
              <ScoreBadge label="Group qualifier" pts={3} suffix={t.groupCorrect} />
            </div>
          </div>
          <div style={{ borderTop:"1px solid rgba(255,255,255,.07)",paddingTop:14 }}>
            <div style={{ fontFamily:"'Teko',sans-serif",fontSize:16,color:"#D4A843",letterSpacing:".1em",marginBottom:6 }}>{t.phase2Title}</div>
            <p style={{ fontSize:14,color:"#D1D5DB",lineHeight:1.7 }}>{t.phase2}</p>
            <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginTop:10 }}>
              {Object.entries(ROUND_META).map(([r,{label,pts}]) => <ScoreBadge key={r} label={label} pts={pts} />)}
            </div>
          </div>
        </Section>

        {/* Format */}
        <Section icon="⚽" title={t.format} accent="#8B5CF6">
          <p style={{ fontSize:14,color:"#D1D5DB",lineHeight:1.8 }}>{t.formatDesc}</p>
        </Section>

        {/* Key dates */}
        <Section icon="📅" title={t.keyDates} accent="#F59E0B">
          <div style={{ fontSize:14,color:"#D1D5DB",lineHeight:2 }}>
            <div>🔒 {t.groupLock}</div>
            <div>🏆 {t.finalDate}</div>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ icon, title, accent, children }) {
  return (
    <div style={{ background:"#0C1620",border:"1px solid rgba(255,255,255,.07)",borderRadius:14,padding:"20px 22px",marginBottom:14,borderLeft:`3px solid ${accent}` }}>
      <div style={{ fontFamily:"'Teko',sans-serif",fontSize:17,color:"#fff",letterSpacing:".1em",marginBottom:12 }}>{icon} {title}</div>
      {children}
    </div>
  );
}

function ScoreBadge({ label, pts, suffix }) {
  return (
    <div style={{ background:"rgba(212,168,67,.1)",border:"1px solid rgba(212,168,67,.25)",borderRadius:8,padding:"7px 14px",display:"flex",flexDirection:"column",alignItems:"center",minWidth:80 }}>
      <div style={{ fontFamily:"'Teko',sans-serif",fontSize:22,color:"#D4A843",lineHeight:1 }}>+{pts}</div>
      <div style={{ fontSize:11,color:"#9CA3AF",marginTop:2,textAlign:"center" }}>{label}{suffix?" "+suffix:""}</div>
    </div>
  );
}

// ─── AUTH SCREENS ─────────────────────────────────────────────────────────────
function AuthScreen({ onLogin, lang, setLang, t, users }) {
  const [mode, setMode] = useState("register"); // register | login
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const handleRegister = () => {
    if (!name.trim() || !email.trim()) { setErr(t.fillAll); return; }
    if (users[name.trim()]) { setErr(t.nameTaken); return; }
    setErr(""); setMsg(t.registered);
    onLogin({ name: name.trim(), email: email.trim(), isNew: true });
  };

  const handleLogin = () => {
    if (!name.trim()) { setErr(t.fillAll); return; }
    if (!users[name.trim()]) { setErr(t.userNotFound); return; }
    setErr("");
    onLogin({ name: name.trim(), email: users[name.trim()].email, isNew: false });
  };

  return (
    <div style={{ minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#060C14",backgroundImage:"radial-gradient(ellipse at 20% 60%,rgba(212,168,67,.07) 0%,transparent 60%),radial-gradient(ellipse at 80% 20%,rgba(13,50,100,.14) 0%,transparent 55%)",padding:24 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Teko:wght@400;500;600;700&family=Outfit:wght@300;400;500;600&display=swap');*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Outfit',sans-serif;}`}</style>

      <div style={{ textAlign:"center",maxWidth:440,width:"100%" }}>
        <div style={{ fontSize:68,marginBottom:8,filter:"drop-shadow(0 0 24px rgba(212,168,67,.35))" }}>🏆</div>
        <div style={{ fontFamily:"'Teko',sans-serif",fontSize:11,color:"#D4A843",letterSpacing:".28em",marginBottom:4 }}>KORBIZ INTERNAL · 2026</div>
        <h1 style={{ fontFamily:"'Teko',sans-serif",fontSize:54,color:"#fff",lineHeight:1,marginBottom:2 }}>{t.title}</h1>
        <div style={{ fontFamily:"'Teko',sans-serif",fontSize:22,color:"#D4A843",letterSpacing:".18em",marginBottom:24 }}>{t.subtitle}</div>

        {/* Lang */}
        <div style={{ display:"flex",justifyContent:"center",marginBottom:24 }}>
          <LangSwitcher lang={lang} setLang={setLang} />
        </div>

        {/* Card */}
        <div style={{ background:"#0C1620",border:"1px solid rgba(255,255,255,.09)",borderRadius:16,padding:"24px 22px" }}>
          <div style={{ display:"flex",marginBottom:20,background:"#060C14",borderRadius:10,padding:4 }}>
            {[["register",t.register],["login",t.loginBtn]].map(([m,label]) => (
              <button key={m} onClick={() => { setMode(m); setErr(""); setMsg(""); }} style={{
                flex:1,padding:"9px",borderRadius:8,border:"none",
                background:mode===m?"#D4A843":""  ,
                color:mode===m?"#000":"#6b7280",
                fontFamily:"'Teko',sans-serif",fontSize:15,letterSpacing:".1em",cursor:"pointer",
              }}>{label}</button>
            ))}
          </div>

          <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder={t.enterName}
              onKeyDown={e => e.key==="Enter" && (mode==="register"?handleRegister():handleLogin())}
              style={{ background:"#060C14",border:"1px solid rgba(255,255,255,.12)",borderRadius:10,padding:"12px 14px",color:"#fff",fontSize:14,outline:"none",fontFamily:"'Outfit',sans-serif" }} />
            {mode === "register" && (
              <input value={email} onChange={e => setEmail(e.target.value)}
                placeholder={t.enterEmail}
                onKeyDown={e => e.key==="Enter" && handleRegister()}
                style={{ background:"#060C14",border:"1px solid rgba(255,255,255,.12)",borderRadius:10,padding:"12px 14px",color:"#fff",fontSize:14,outline:"none",fontFamily:"'Outfit',sans-serif" }} />
            )}
          </div>

          {err && <div style={{ marginTop:12,fontSize:13,color:"#EF4444",background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.3)",borderRadius:8,padding:"9px 12px" }}>{err}</div>}
          {msg && <div style={{ marginTop:12,fontSize:13,color:"#22C55E",background:"rgba(34,197,94,.1)",border:"1px solid rgba(34,197,94,.3)",borderRadius:8,padding:"9px 12px" }}>{msg}</div>}

          <button onClick={mode==="register"?handleRegister:handleLogin} style={{
            width:"100%",marginTop:16,padding:"13px",borderRadius:12,border:"none",
            background:"linear-gradient(135deg,#D4A843,#8B6914)",
            color:"#000",fontFamily:"'Teko',sans-serif",fontSize:18,fontWeight:700,
            letterSpacing:".1em",cursor:"pointer",
          }}>{mode==="register"?t.joinBtn:t.loginBtn}</button>
        </div>

        {/* Info teaser */}
        <div style={{ marginTop:20,display:"flex",gap:16,justifyContent:"center" }}>
          {[["$30",t.entryFee],["48","TEAMS"],["104","MATCHES"]].map(([v,l]) => (
            <div key={l} style={{ textAlign:"center" }}>
              <div style={{ fontFamily:"'Teko',sans-serif",fontSize:26,color:"#D4A843",lineHeight:1 }}>{v}</div>
              <div style={{ fontSize:10,color:"#5A7090",letterSpacing:".12em" }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── GROUP PICKS ──────────────────────────────────────────────────────────────
function GroupPicks({ myPicks, tournament, onSave, t }) {
  const [picks, setPicks] = useState(myPicks || {});
  const [saved, setSaved] = useState(false);
  const locked = tournament.groupLocked;
  const gr = tournament.groupResults || {};

  const toggle = (grp, team) => {
    if (locked) return;
    setSaved(false);
    setPicks(prev => {
      const cur = prev[grp] || [];
      if (cur.includes(team)) return { ...prev, [grp]: cur.filter(x => x !== team) };
      if (cur.length >= 3) return prev;
      return { ...prev, [grp]: [...cur, team] };
    });
  };

  const handleSave = () => { onSave(picks); setSaved(true); setTimeout(() => setSaved(false), 2500); };
  const total = Object.values(picks).reduce((a,b) => a+b.length, 0);

  return (
    <div>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:20,flexWrap:"wrap",gap:10 }}>
        <div>
          <div style={{ fontFamily:"'Teko',sans-serif",fontSize:28,color:"#D4A843",letterSpacing:".08em",lineHeight:1 }}>PHASE 1 — {t.groupPicks.toUpperCase()}</div>
          <div style={{ color:"#5A7090",fontSize:13,marginTop:3 }}>Select up to 3 teams per group · <span style={{ color:"#D4A843" }}>+3 pts</span> per correct qualifier</div>
        </div>
        {!locked && (
          <button onClick={handleSave} style={{ padding:"9px 22px",borderRadius:10,border:"none",background:saved?"#22C55E":"linear-gradient(135deg,#D4A843,#8B6914)",color:"#000",fontFamily:"'Teko',sans-serif",fontSize:16,fontWeight:700,cursor:"pointer",letterSpacing:".08em" }}>
            {saved ? t.saved : `${t.savePicks} (${total})`}
          </button>
        )}
      </div>

      {locked && <div style={{ background:"rgba(59,130,246,.1)",border:"1px solid rgba(59,130,246,.3)",borderRadius:10,padding:"10px 16px",marginBottom:18,color:"#60a5fa",fontSize:13 }}>🔒 Picks are locked — group stage has begun</div>}

      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(255px,1fr))",gap:12 }}>
        {Object.entries(GROUPS).map(([grp, { teams, flags }]) => {
          const myG = picks[grp] || [];
          const adv = gr[grp] || [];
          const hasRes = adv.length > 0;
          return (
            <div key={grp} style={{ background:"#0C1620",border:"1px solid rgba(255,255,255,.07)",borderRadius:14,padding:15 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:11 }}>
                <div style={{ fontFamily:"'Teko',sans-serif",fontSize:17,color:"#D4A843",letterSpacing:".14em" }}>GROUP {grp}</div>
                <div style={{ fontSize:11,color:"#5A7090" }}>{myG.length}/3</div>
              </div>
              {teams.map((team,i) => {
                const picked = myG.includes(team);
                const correct = hasRes && adv.includes(team) && picked;
                const wrong = hasRes && !adv.includes(team) && picked;
                const didAdv = hasRes && adv.includes(team);
                return (
                  <div key={team} onClick={() => toggle(grp,team)} style={{
                    display:"flex",alignItems:"center",gap:8,padding:"8px 10px",
                    borderRadius:9,marginBottom:5,cursor:locked?"default":"pointer",
                    background:correct?"rgba(34,197,94,.12)":wrong?"rgba(239,68,68,.1)":picked?"rgba(212,168,67,.1)":"transparent",
                    border:`1px solid ${correct?"rgba(34,197,94,.4)":wrong?"rgba(239,68,68,.35)":picked?"rgba(212,168,67,.28)":"rgba(255,255,255,.07)"}`,
                    transition:"all .13s",
                  }}>
                    <span style={{ fontSize:17 }}>{flags[i]}</span>
                    <span style={{ flex:1,fontSize:13,fontWeight:picked?600:400,color:correct?"#22C55E":wrong?"#EF4444":picked?"#D4A843":"#E0E8F0" }}>{team}</span>
                    {correct && <span style={{ fontSize:12 }}>✅ +3</span>}
                    {wrong && <span style={{ fontSize:12 }}>❌</span>}
                    {!hasRes && picked && <span style={{ color:"#D4A843",fontSize:11 }}>✓</span>}
                    {hasRes && didAdv && !picked && <span style={{ fontSize:10,color:"#5A7090" }}>advanced</span>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {!locked && (
        <div style={{ display:"flex",justifyContent:"center",marginTop:24 }}>
          <button onClick={handleSave} style={{ padding:"12px 44px",borderRadius:12,border:"none",background:saved?"#22C55E":"linear-gradient(135deg,#D4A843,#8B6914)",color:"#000",fontFamily:"'Teko',sans-serif",fontSize:18,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 24px rgba(212,168,67,.25)" }}>
            {saved ? t.saved : `${t.savePicks} — ${total} teams`}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── BRACKET ──────────────────────────────────────────────────────────────────
function BracketView({ myPicks, tournament, onSave, t }) {
  const [picks, setPicks] = useState(myPicks || {});
  const [saved, setSaved] = useState(false);
  const locked = tournament.bracketLocked;
  const bracketTeams = tournament.bracketTeams || [];
  const actual = tournament.bracketResults || {};

  const getTeams = (round, i) => {
    const ri = ROUNDS.indexOf(round);
    if (round === "R32") return { t1:bracketTeams[i*2]||"TBD", t2:bracketTeams[i*2+1]||"TBD" };
    const prev = ROUNDS[ri-1];
    return { t1:actual[`${prev}_${i*2}`]||picks[`${prev}_${i*2}`]||"TBD", t2:actual[`${prev}_${i*2+1}`]||picks[`${prev}_${i*2+1}`]||"TBD" };
  };

  const doPick = (key, team) => {
    if (locked || actual[key]) return;
    setSaved(false);
    setPicks(prev => ({ ...prev, [key]: team }));
  };

  const handleSave = () => { onSave(picks); setSaved(true); setTimeout(() => setSaved(false), 2500); };

  if (!bracketTeams.some(x => x)) {
    return (
      <div style={{ textAlign:"center",padding:"80px 20px" }}>
        <div style={{ fontSize:56,marginBottom:12 }}>⏳</div>
        <div style={{ fontFamily:"'Teko',sans-serif",fontSize:26,color:"#D4A843" }}>{t.bracketWait}</div>
        <div style={{ color:"#5A7090",fontSize:13,marginTop:6 }}>{t.bracketWaitSub}</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:16,flexWrap:"wrap",gap:10 }}>
        <div>
          <div style={{ fontFamily:"'Teko',sans-serif",fontSize:28,color:"#D4A843",letterSpacing:".08em",lineHeight:1 }}>PHASE 2 — KNOCKOUT {t.bracket.toUpperCase()}</div>
          <div style={{ color:"#5A7090",fontSize:13,marginTop:3 }}>Click to pick winners · Points increase each round</div>
        </div>
        {!locked && (
          <button onClick={handleSave} style={{ padding:"9px 22px",borderRadius:10,border:"none",background:saved?"#22C55E":"linear-gradient(135deg,#D4A843,#8B6914)",color:"#000",fontFamily:"'Teko',sans-serif",fontSize:16,fontWeight:700,cursor:"pointer" }}>
            {saved ? t.saved : t.savePicks}
          </button>
        )}
      </div>

      <div style={{ display:"flex",gap:8,marginBottom:16,flexWrap:"wrap" }}>
        {ROUNDS.map(r => <div key={r} style={{ padding:"4px 11px",borderRadius:7,background:"#111E2E",border:"1px solid rgba(255,255,255,.07)",fontSize:12,color:"#5A7090" }}>{ROUND_META[r].label}: <span style={{ color:"#D4A843",fontWeight:700 }}>+{ROUND_META[r].pts}</span></div>)}
      </div>

      <div style={{ overflowX:"auto",paddingBottom:12 }}>
        <div style={{ display:"flex",gap:12,minWidth:960 }}>
          {ROUNDS.map(round => {
            const { label, pts, matches } = ROUND_META[round];
            return (
              <div key={round} style={{ flex:1,minWidth:170 }}>
                <div style={{ fontFamily:"'Teko',sans-serif",fontSize:13,color:round==="F"?"#D4A843":"#5A7090",letterSpacing:".14em",textAlign:"center",marginBottom:10,paddingBottom:7,borderBottom:"1px solid rgba(255,255,255,.07)" }}>
                  {round==="F"?"🏆 ":""}{label}
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:7 }}>
                  {Array.from({ length:matches }, (_,i) => {
                    const matchKey = `${round}_${i}`;
                    const { t1, t2 } = getTeams(round, i);
                    const myPick = picks[matchKey];
                    const actualW = actual[matchKey];
                    const done = !!actualW;
                    const teamRow = (team) => {
                      if (team === "TBD") return <div key="tbd" style={{ padding:"7px 9px",borderRadius:7,marginBottom:3,background:"#111E2E",color:"#5A7090",fontSize:12 }}>TBD</div>;
                      const isPick = myPick === team;
                      const correct = done && actualW === team && isPick;
                      const wrong = done && actualW !== team && isPick;
                      const isW = done && actualW === team;
                      return (
                        <div key={team} onClick={() => doPick(matchKey, team)} style={{
                          padding:"7px 9px",borderRadius:7,marginBottom:3,cursor:locked||done?"default":"pointer",
                          background:correct?"rgba(34,197,94,.13)":wrong?"rgba(239,68,68,.11)":isPick?"rgba(212,168,67,.1)":"transparent",
                          border:`1px solid ${correct?"rgba(34,197,94,.4)":wrong?"rgba(239,68,68,.38)":isPick?"rgba(212,168,67,.28)":"rgba(255,255,255,.07)"}`,
                          color:correct?"#22C55E":wrong?"#EF4444":isPick?"#D4A843":isW?"#fff":"#9CA3AF",
                          fontSize:12,fontWeight:isPick||isW?600:400,display:"flex",alignItems:"center",gap:5,transition:"all .12s",
                        }}>
                          <span style={{ flex:1 }}>{team}</span>
                          {correct&&"✅"}{wrong&&"❌"}
                          {!done&&isPick&&<span style={{ fontSize:10,color:"#D4A843" }}>✓</span>}
                          {isW&&!isPick&&<span style={{ fontSize:9,color:"#5A7090" }}>won</span>}
                        </div>
                      );
                    };
                    return (
                      <div key={matchKey} style={{ background:"#0C1620",border:"1px solid rgba(255,255,255,.07)",borderRadius:9,padding:"9px 10px" }}>
                        <div style={{ fontSize:9,color:"#5A7090",letterSpacing:".1em",marginBottom:6 }}>+{pts} PTS</div>
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

// ─── LEADERBOARD ──────────────────────────────────────────────────────────────
function Leaderboard({ users, currentName, tournament, t }) {
  const ranked = Object.values(users)
    .map(u => ({ ...u, ...calcScore({ groupPicks:u.groupPicks, bracketPicks:u.bracketPicks }, tournament) }))
    .sort((a,b) => b.total - a.total);
  const paid = ranked.filter(u => u.paid).length;
  const pot = paid * 30;
  const medals = ["🥇","🥈","🥉"];

  return (
    <div>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:20,flexWrap:"wrap",gap:10 }}>
        <div style={{ fontFamily:"'Teko',sans-serif",fontSize:28,color:"#D4A843" }}>{t.standings.toUpperCase()}</div>
        <div style={{ textAlign:"center",background:"rgba(212,168,67,.1)",border:"1px solid rgba(212,168,67,.28)",borderRadius:10,padding:"8px 18px" }}>
          <div style={{ fontFamily:"'Teko',sans-serif",fontSize:26,color:"#D4A843" }}>${pot}</div>
          <div style={{ fontSize:10,color:"#5A7090",letterSpacing:".14em" }}>{t.prizePot} · {paid} {t.paid}</div>
        </div>
      </div>
      <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
        {ranked.filter(u => u.approved).map((u,i) => (
          <div key={u.name} style={{
            display:"flex",alignItems:"center",gap:12,padding:"13px 15px",borderRadius:12,
            background:u.name===currentName?"rgba(212,168,67,.1)":"#0C1620",
            border:`1px solid ${u.name===currentName?"rgba(212,168,67,.28)":"rgba(255,255,255,.07)"}`,
          }}>
            <div style={{ width:30,textAlign:"center",fontSize:i<3?22:13,fontFamily:"'Teko',sans-serif",color:"#5A7090" }}>{i<3?medals[i]:`#${i+1}`}</div>
            <Avatar name={u.name} size={38} />
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ fontSize:14,fontWeight:600,color:u.name===currentName?"#D4A843":"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                {u.name} {u.name===currentName&&<span style={{ fontSize:11,color:"#5A7090" }}>(you)</span>}
              </div>
              <div style={{ fontSize:11,color:"#5A7090" }}>{u.email}</div>
            </div>
            <div style={{ padding:"2px 8px",borderRadius:5,fontSize:10,fontWeight:700,background:u.paid?"rgba(34,197,94,.12)":"rgba(239,68,68,.12)",color:u.paid?"#22C55E":"#EF4444",border:`1px solid ${u.paid?"rgba(34,197,94,.3)":"rgba(239,68,68,.3)"}`}}>{u.paid?t.paid:t.unpaid}</div>
            <div style={{ textAlign:"right",minWidth:52 }}>
              <div style={{ fontFamily:"'Teko',sans-serif",fontSize:24,color:"#D4A843",lineHeight:1 }}>{u.total}</div>
              <div style={{ fontSize:9,color:"#5A7090",letterSpacing:".1em" }}>{t.ptsLabel}</div>
            </div>
          </div>
        ))}
        {ranked.filter(u=>u.approved).length===0&&<div style={{ textAlign:"center",color:"#5A7090",padding:"60px 0" }}>No approved participants yet</div>}
      </div>
    </div>
  );
}

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────
function AdminPanel({ tournament, users, onClose, onSaveTournament, onApprove, onTogglePaid }) {
  const [st, setSt] = useState({ ...tournament });
  const [tab, setTab] = useState("approvals");

  const toggleGroupResult = (grp, team) => {
    setSt(prev => {
      const cur = prev.groupResults?.[grp] || [];
      const next = cur.includes(team) ? cur.filter(x=>x!==team) : [...cur,team];
      return { ...prev, groupResults:{ ...prev.groupResults, [grp]:next } };
    });
  };

  const setBracketResult = (key, winner) => {
    setSt(prev => ({ ...prev, bracketResults:{ ...prev.bracketResults, [key]: prev.bracketResults?.[key]===winner?"":winner } }));
  };

  const setTeamAt = (idx, val) => {
    setSt(prev => {
      const arr = [...(prev.bracketTeams||Array(32).fill(""))];
      arr[idx] = val;
      return { ...prev, bracketTeams:arr };
    });
  };

  const pending = Object.values(users).filter(u => !u.approved);
  const approved = Object.values(users).filter(u => u.approved);

  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.9)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(6px)" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#0C1620",border:"1px solid rgba(239,68,68,.22)",borderRadius:18,padding:"24px 22px",maxWidth:840,width:"96vw",maxHeight:"91vh",overflowY:"auto",boxShadow:"0 0 80px rgba(239,68,68,.08)" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18 }}>
          <div style={{ fontFamily:"'Teko',sans-serif",fontSize:22,color:"#f87171",letterSpacing:".1em" }}>🔑 ADMIN PANEL</div>
          <button onClick={onClose} style={{ background:"transparent",border:"none",color:"#5A7090",fontSize:22,cursor:"pointer" }}>✕</button>
        </div>

        <div style={{ display:"flex",gap:6,marginBottom:18,overflowX:"auto",paddingBottom:4 }}>
          {["approvals","payments","phase","group","teams","bracket"].map(at => (
            <button key={at} onClick={() => setTab(at)} style={{
              padding:"6px 13px",borderRadius:8,fontSize:12,fontFamily:"'Teko',sans-serif",letterSpacing:".1em",whiteSpace:"nowrap",cursor:"pointer",
              border:`1px solid ${tab===at?"rgba(239,68,68,.5)":"rgba(255,255,255,.09)"}`,
              background:tab===at?"rgba(239,68,68,.14)":"transparent",
              color:tab===at?"#f87171":"#5A7090",
            }}>
              {at==="approvals"&&pending.length>0?`APPROVALS (${pending.length})`:at.toUpperCase()}
            </button>
          ))}
        </div>

        {/* APPROVALS */}
        {tab==="approvals" && (
          <div>
            <p style={{ color:"#5A7090",fontSize:13,marginBottom:14 }}>Approve participants after collecting $30 cash. Approved users get full app access instantly.</p>
            {pending.length > 0 && (
              <>
                <div style={{ fontFamily:"'Teko',sans-serif",color:"#f87171",fontSize:14,marginBottom:10,letterSpacing:".1em" }}>⏳ PENDING ({pending.length})</div>
                <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:20 }}>
                  {pending.map(u => (
                    <div key={u.name} style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:10,background:"rgba(239,68,68,.06)",border:"1px solid rgba(239,68,68,.2)" }}>
                      <Avatar name={u.name} size={36} />
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:14,fontWeight:600,color:"#fff" }}>{u.name}</div>
                        <div style={{ fontSize:11,color:"#5A7090" }}>{u.email}</div>
                      </div>
                      <button onClick={() => onApprove(u.name, true)} style={{ padding:"7px 18px",borderRadius:8,border:"1px solid rgba(34,197,94,.4)",background:"rgba(34,197,94,.12)",color:"#22C55E",fontSize:13,fontWeight:700,cursor:"pointer" }}>
                        ✓ APPROVE + MARK PAID
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
            {approved.length > 0 && (
              <>
                <div style={{ fontFamily:"'Teko',sans-serif",color:"#22C55E",fontSize:14,marginBottom:10,letterSpacing:".1em" }}>✓ APPROVED ({approved.length})</div>
                <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                  {approved.map(u => (
                    <div key={u.name} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:10,background:"rgba(34,197,94,.06)",border:"1px solid rgba(34,197,94,.15)" }}>
                      <Avatar name={u.name} size={32} />
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13,fontWeight:600,color:"#fff" }}>{u.name}</div>
                        <div style={{ fontSize:11,color:"#5A7090" }}>{u.email}</div>
                      </div>
                      <button onClick={() => onApprove(u.name, false)} style={{ padding:"5px 12px",borderRadius:7,border:"1px solid rgba(239,68,68,.3)",background:"transparent",color:"#f87171",fontSize:11,cursor:"pointer" }}>Revoke</button>
                    </div>
                  ))}
                </div>
              </>
            )}
            {pending.length===0&&approved.length===0&&<div style={{ color:"#5A7090",textAlign:"center",padding:"40px 0" }}>No registrations yet</div>}
          </div>
        )}

        {/* PAYMENTS */}
        {tab==="payments" && (
          <div>
            <p style={{ color:"#5A7090",fontSize:13,marginBottom:14 }}>Manually adjust paid status if needed.</p>
            <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
              {Object.values(users).filter(u=>u.approved).map(u => (
                <div key={u.name} style={{ display:"flex",alignItems:"center",gap:12,padding:"11px 14px",borderRadius:10,background:"#111E2E",border:"1px solid rgba(255,255,255,.07)" }}>
                  <Avatar name={u.name} size={34} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14,fontWeight:600,color:"#fff" }}>{u.name}</div>
                    <div style={{ fontSize:11,color:"#5A7090" }}>{u.email}</div>
                  </div>
                  <div style={{ padding:"2px 9px",borderRadius:5,fontSize:11,fontWeight:700,background:u.paid?"rgba(34,197,94,.12)":"rgba(239,68,68,.12)",color:u.paid?"#22C55E":"#EF4444",border:`1px solid ${u.paid?"rgba(34,197,94,.3)":"rgba(239,68,68,.3)"}`}}>{u.paid?"✓ PAID $30":"UNPAID"}</div>
                  <button onClick={() => onTogglePaid(u.name,!u.paid)} style={{ padding:"6px 13px",borderRadius:7,fontSize:12,cursor:"pointer",border:`1px solid ${u.paid?"rgba(239,68,68,.3)":"rgba(34,197,94,.3)"}`,background:"transparent",color:u.paid?"#f87171":"#22C55E" }}>{u.paid?"Unmark":"Mark Paid"}</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PHASE */}
        {tab==="phase" && (
          <div>
            <p style={{ color:"#5A7090",fontSize:13,marginBottom:14 }}>Control tournament phase and lock picks.</p>
            <div style={{ display:"flex",gap:10,marginBottom:20 }}>
              {["group","bracket"].map(p => (
                <button key={p} onClick={() => setSt(prev=>({...prev,phase:p}))} style={{ padding:"9px 20px",borderRadius:8,fontFamily:"'Teko',sans-serif",letterSpacing:".1em",cursor:"pointer",border:`1px solid ${st.phase===p?"rgba(239,68,68,.5)":"rgba(255,255,255,.09)"}`,background:st.phase===p?"rgba(239,68,68,.14)":"transparent",color:st.phase===p?"#f87171":"#5A7090" }}>
                  {p==="group"?"GROUP STAGE":"KNOCKOUT"}
                </button>
              ))}
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
              {[["groupLocked","Lock Group Picks"],["bracketLocked","Lock Bracket Picks"]].map(([key,label]) => (
                <label key={key} style={{ display:"flex",alignItems:"center",gap:10,cursor:"pointer",fontSize:14,color:"#E0E8F0" }}>
                  <input type="checkbox" checked={!!st[key]} onChange={e => setSt(prev=>({...prev,[key]:e.target.checked}))} style={{ width:15,height:15,accentColor:"#f87171" }} />
                  {label}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* GROUP RESULTS */}
        {tab==="group" && (
          <div>
            <p style={{ color:"#5A7090",fontSize:13,marginBottom:14 }}>Select advancing teams per group. Scores Phase 1 instantly for all users.</p>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(205px,1fr))",gap:10 }}>
              {Object.entries(GROUPS).map(([grp,{teams,flags}]) => {
                const adv = st.groupResults?.[grp]||[];
                return (
                  <div key={grp} style={{ background:"#111E2E",borderRadius:10,padding:12,border:"1px solid rgba(255,255,255,.07)" }}>
                    <div style={{ fontFamily:"'Teko',sans-serif",color:"#f87171",marginBottom:8,fontSize:14 }}>GROUP {grp} <span style={{ color:"#5A7090",fontSize:11 }}>({adv.length} adv.)</span></div>
                    {teams.map((team,i) => {
                      const on = adv.includes(team);
                      return (
                        <div key={team} onClick={() => toggleGroupResult(grp,team)} style={{ display:"flex",alignItems:"center",gap:7,padding:"5px 8px",borderRadius:6,marginBottom:4,cursor:"pointer",background:on?"rgba(239,68,68,.12)":"transparent",border:`1px solid ${on?"rgba(239,68,68,.4)":"rgba(255,255,255,.07)"}`,color:on?"#f87171":"#5A7090",fontSize:12 }}>
                          <span>{flags[i]}</span><span style={{ flex:1 }}>{team}</span>{on&&"✓"}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* BRACKET TEAMS */}
        {tab==="teams" && (
          <div>
            <p style={{ color:"#5A7090",fontSize:13,marginBottom:12 }}>Enter 32 qualified teams in bracket seeding order (pairs: slots 0+1 play each other, 2+3, etc.)</p>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:6 }}>
              {Array.from({length:32},(_,i) => (
                <div key={i} style={{ display:"flex",alignItems:"center",gap:7 }}>
                  <span style={{ color:"#5A7090",fontSize:11,width:18,textAlign:"right" }}>{i+1}</span>
                  <input value={(st.bracketTeams||[])[i]||""} onChange={e=>setTeamAt(i,e.target.value)} placeholder={`Team ${i+1}`} style={{ flex:1,background:"#111E2E",border:"1px solid rgba(255,255,255,.09)",borderRadius:7,padding:"6px 9px",color:"#E0E8F0",fontSize:12,outline:"none" }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BRACKET RESULTS */}
        {tab==="bracket" && (
          <div>
            <p style={{ color:"#5A7090",fontSize:13,marginBottom:14 }}>Click the winning team for each match to score Phase 2.</p>
            {ROUNDS.map(round => {
              const {label,matches} = ROUND_META[round];
              const ri = ROUNDS.indexOf(round);
              return (
                <div key={round} style={{ marginBottom:18 }}>
                  <div style={{ fontFamily:"'Teko',sans-serif",color:"#f87171",fontSize:15,marginBottom:9 }}>{label}</div>
                  <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))",gap:7 }}>
                    {Array.from({length:matches},(_,i) => {
                      const matchKey=`${round}_${i}`;
                      let t1="?",t2="?";
                      if(round==="R32"){t1=(st.bracketTeams||[])[i*2]||`Slot ${i*2+1}`;t2=(st.bracketTeams||[])[i*2+1]||`Slot ${i*2+2}`;}
                      else{const prev=ROUNDS[ri-1];t1=st.bracketResults?.[`${prev}_${i*2}`]||"TBD";t2=st.bracketResults?.[`${prev}_${i*2+1}`]||"TBD";}
                      const winner=st.bracketResults?.[matchKey]||"";
                      return (
                        <div key={matchKey} style={{ background:"#111E2E",borderRadius:9,padding:10,border:"1px solid rgba(255,255,255,.07)" }}>
                          <div style={{ fontSize:10,color:"#5A7090",marginBottom:6 }}>Match {i+1}: {t1} vs {t2}</div>
                          <div style={{ display:"flex",gap:5 }}>
                            {[t1,t2].map(team => (
                              <button key={team} onClick={()=>setBracketResult(matchKey,team)} style={{ flex:1,padding:"6px",borderRadius:6,fontSize:11,cursor:"pointer",border:`1px solid ${winner===team?"rgba(239,68,68,.5)":"rgba(255,255,255,.09)"}`,background:winner===team?"rgba(239,68,68,.15)":"transparent",color:winner===team?"#f87171":"#5A7090" }}>{team}</button>
                            ))}
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

        <div style={{ display:"flex",justifyContent:"flex-end",gap:10,marginTop:22 }}>
          <button onClick={onClose} style={{ padding:"9px 20px",borderRadius:10,border:"1px solid rgba(255,255,255,.09)",background:"transparent",color:"#5A7090",fontSize:14,cursor:"pointer" }}>Cancel</button>
          <button onClick={() => onSaveTournament(st)} style={{ padding:"9px 24px",borderRadius:10,border:"none",background:"#EF4444",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer" }}>SAVE CHANGES</button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
const DAVE = { name:"Dave Ha", email:"dave@korbiz.com", approved:true, paid:true, groupPicks:{}, bracketPicks:{} };
const TEST = { name:"Test User", email:"test@demo.com", approved:false, paid:false, groupPicks:{}, bracketPicks:{} };
const INIT_USERS = { "Dave Ha":DAVE, "Test User":TEST };
const INIT_TOURNAMENT = { phase:"group", groupLocked:false, bracketLocked:false, groupResults:{}, bracketTeams:Array(32).fill(""), bracketResults:{} };

export default function App() {
  const [users, setUsers] = useState(INIT_USERS);
  const [tournament, setTournament] = useState(INIT_TOURNAMENT);
  const [currentUser, setCurrentUser] = useState(null);
  const [tab, setTab] = useState("picks");
  const [showAdmin, setShowAdmin] = useState(false);
  const [lang, setLang] = useState("en");
  const [toast, setToast] = useState(null);

  const t = T[lang];
  const me = currentUser ? users[currentUser] : null;

  const showMsg = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  const handleLogin = ({ name, email, isNew }) => {
    if (isNew) {
      if (users[name]) { showMsg(t.nameTaken,"error"); return; }
      setUsers(prev => ({ ...prev, [name]:{ name, email, approved:false, paid:false, groupPicks:{}, bracketPicks:{} } }));
    }
    setCurrentUser(name);
  };

  const handleSignOut = () => { setCurrentUser(null); setTab("picks"); };

  const saveGroupPicks = (groupPicks) => {
    setUsers(prev => ({ ...prev, [currentUser]:{ ...prev[currentUser], groupPicks } }));
    showMsg("Group picks saved ✓");
  };

  const saveBracketPicks = (bracketPicks) => {
    setUsers(prev => ({ ...prev, [currentUser]:{ ...prev[currentUser], bracketPicks } }));
    showMsg("Bracket saved ✓");
  };

  const handleApprove = (name, approved) => {
    setUsers(prev => ({ ...prev, [name]:{ ...prev[name], approved, paid: approved ? true : prev[name].paid } }));
    showMsg(approved ? `${name} approved ✓` : `${name} access revoked`);
  };

  const handleTogglePaid = (name, paid) => {
    setUsers(prev => ({ ...prev, [name]:{ ...prev[name], paid } }));
    showMsg(`${name} marked as ${paid?"paid":"unpaid"}`);
  };

  const saveTournament = (st) => { setTournament(st); setShowAdmin(false); showMsg("Saved ✓"); };

  const isAdmin = currentUser === "Dave Ha";
  const myScore = me ? calcScore({ groupPicks:me.groupPicks, bracketPicks:me.bracketPicks }, tournament) : { total:0 };

  // Not logged in
  if (!currentUser) {
    return <AuthScreen onLogin={handleLogin} lang={lang} setLang={setLang} t={t} users={users} />;
  }

  // Logged in but not approved → show info screen only
  if (!me?.approved) {
    return <PendingScreen user={me} lang={lang} setLang={setLang} onSignOut={handleSignOut} t={t} />;
  }

  // Full access
  const tabs = [
    { id:"picks", label: tournament.phase==="group" ? t.groupPicks : t.bracket },
    { id:"leaderboard", label: t.standings },
    { id:"rules", label: t.rules },
  ];

  return (
    <div style={{ minHeight:"100vh",background:"#060C14",fontFamily:"'Outfit',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Teko:wght@400;500;600;700&family=Outfit:wght@300;400;500;600&display=swap');*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}`}</style>

      {/* Header */}
      <div style={{ background:"#0C1620",borderBottom:"1px solid rgba(255,255,255,.07)",position:"sticky",top:0,zIndex:200 }}>
        <div style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 16px" }}>
          <span style={{ fontSize:20 }}>🏆</span>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"'Teko',sans-serif",fontSize:9,color:"#5A7090",letterSpacing:".22em" }}>KORBIZ</div>
            <div style={{ fontFamily:"'Teko',sans-serif",fontSize:17,color:"#D4A843",lineHeight:1 }}>WORLD CUP 2026</div>
          </div>

          <LangSwitcher lang={lang} setLang={setLang} />

          <div style={{ padding:"3px 9px",borderRadius:6,fontSize:11,fontFamily:"'Teko',sans-serif",letterSpacing:".12em",background:tournament.phase==="group"?"rgba(59,130,246,.14)":"rgba(212,168,67,.12)",color:tournament.phase==="group"?"#60a5fa":"#D4A843",border:`1px solid ${tournament.phase==="group"?"rgba(59,130,246,.3)":"rgba(212,168,67,.28)"}` }}>
            {tournament.phase==="group"?t.groupStage:t.knockout}
          </div>

          <div style={{ textAlign:"center",background:"rgba(212,168,67,.1)",border:"1px solid rgba(212,168,67,.26)",borderRadius:8,padding:"4px 12px" }}>
            <div style={{ fontFamily:"'Teko',sans-serif",fontSize:19,color:"#D4A843",lineHeight:1 }}>{myScore.total}</div>
            <div style={{ fontSize:9,color:"#5A7090",letterSpacing:".1em" }}>{t.ptsLabel}</div>
          </div>

          <div style={{ padding:"3px 8px",borderRadius:5,fontSize:10,fontWeight:700,background:me.paid?"rgba(34,197,94,.12)":"rgba(239,68,68,.12)",color:me.paid?"#22C55E":"#EF4444",border:`1px solid ${me.paid?"rgba(34,197,94,.3)":"rgba(239,68,68,.3)"}`}}>
            {me.paid?t.paid:t.unpaid}
          </div>

          {isAdmin && (
            <button onClick={()=>setShowAdmin(true)} style={{ padding:"5px 11px",borderRadius:7,border:"1px solid rgba(239,68,68,.35)",background:"rgba(239,68,68,.1)",color:"#f87171",fontFamily:"'Teko',sans-serif",letterSpacing:".1em",fontSize:12,cursor:"pointer" }}>{t.admin}</button>
          )}

          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
            <Avatar name={me.name} size={32} />
            <button onClick={handleSignOut} style={{ background:"transparent",border:"1px solid rgba(255,255,255,.1)",borderRadius:7,padding:"4px 10px",color:"#5A7090",fontSize:11,cursor:"pointer" }}>{t.signOut}</button>
          </div>
        </div>

        <div style={{ display:"flex",borderTop:"1px solid rgba(255,255,255,.07)",overflowX:"auto" }}>
          {tabs.map(tb => (
            <button key={tb.id} onClick={()=>setTab(tb.id)} style={{ padding:"9px 20px",border:"none",background:"transparent",color:tab===tb.id?"#D4A843":"#5A7090",borderBottom:`2px solid ${tab===tb.id?"#D4A843":"transparent"}`,fontFamily:"'Teko',sans-serif",letterSpacing:".12em",fontSize:13,whiteSpace:"nowrap",cursor:"pointer" }}>
              {tb.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth:1280,margin:"0 auto",padding:"22px 16px" }}>
        {tab==="picks" && tournament.phase==="group" && <GroupPicks myPicks={me.groupPicks} tournament={tournament} onSave={saveGroupPicks} t={t} />}
        {tab==="picks" && tournament.phase==="bracket" && <BracketView myPicks={me.bracketPicks} tournament={tournament} onSave={saveBracketPicks} t={t} />}
        {tab==="leaderboard" && <Leaderboard users={users} currentName={currentUser} tournament={tournament} t={t} />}
        {tab==="rules" && (
          <div style={{ maxWidth:660 }}>
            <div style={{ fontFamily:"'Teko',sans-serif",fontSize:28,color:"#D4A843",marginBottom:18 }}>{t.rules.toUpperCase()}</div>
            <Section icon="💵" title={t.payment} accent="#22C55E"><p style={{ fontSize:14,color:"#D1D5DB",lineHeight:1.8 }}>{t.paymentDesc}</p></Section>
            <Section icon="📋" title={t.phase1Title} accent="#3B82F6">
              <p style={{ fontSize:14,color:"#D1D5DB",lineHeight:1.8,marginBottom:12 }}>{t.phase1}</p>
              <div style={{ background:"#111E2E",borderRadius:8,padding:"9px 14px",fontSize:12,color:"#5A7090" }}>{t.maxPhase1}: 12 × 3 × 3 = <strong style={{ color:"#D4A843" }}>108 pts</strong></div>
            </Section>
            <Section icon="🏆" title={t.phase2Title} accent="#D4A843">
              <p style={{ fontSize:14,color:"#D1D5DB",lineHeight:1.8,marginBottom:12 }}>{t.phase2}</p>
              <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
                {Object.entries(ROUND_META).map(([r,{label,pts}]) => <ScoreBadge key={r} label={label} pts={pts} />)}
              </div>
              <div style={{ background:"#111E2E",borderRadius:8,padding:"9px 14px",fontSize:12,color:"#5A7090",marginTop:10 }}>{t.maxPhase2}: (16×5)+(8×10)+(4×15)+(2×20)+(1×30) = <strong style={{ color:"#D4A843" }}>330 pts</strong></div>
            </Section>
            <Section icon="🏅" title={t.prizeDist} accent="#F59E0B">
              {[t.prize1,t.prize2,t.prize3].map((p,i)=><div key={i} style={{ fontSize:14,color:"#D1D5DB",padding:"5px 0" }}>{["🥇","🥈","🥉"][i]} {p}</div>)}
            </Section>
            <Section icon="📅" title={t.keyDates} accent="#8B5CF6">
              <div style={{ fontSize:14,color:"#D1D5DB",lineHeight:2 }}><div>🔒 {t.groupLock}</div><div>🏆 {t.finalDate}</div></div>
            </Section>
          </div>
        )}
      </div>

      {showAdmin && isAdmin && (
        <AdminPanel tournament={tournament} users={users} onClose={()=>setShowAdmin(false)} onSaveTournament={saveTournament} onApprove={handleApprove} onTogglePaid={handleTogglePaid} />
      )}

      {toast && (
        <div style={{ position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:toast.type==="error"?"#EF4444":"#D4A843",color:toast.type==="error"?"#fff":"#000",fontWeight:700,padding:"11px 26px",borderRadius:11,fontSize:14,zIndex:9999,boxShadow:"0 8px 40px rgba(0,0,0,.6)",whiteSpace:"nowrap" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
