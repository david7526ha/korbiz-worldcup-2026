import { NextResponse } from 'next/server';

// 다음 경기 오즈를 가져오는 API Route
// Pinnacle public API (no auth for basic h2h)
export async function GET() {
  // 현재 진행 중이거나 다음 경기 팀 목록
  const NEXT_MATCHES = [
    { home: "Mexico", away: "South Africa", date: "2026-06-11" },
    { home: "South Korea", away: "Czechia", date: "2026-06-11" },
    { home: "Canada", away: "Bosnia-Herzegovina", date: "2026-06-12" },
    { home: "USA", away: "Paraguay", date: "2026-06-12" },
    { home: "Qatar", away: "Switzerland", date: "2026-06-13" },
    { home: "Brazil", away: "Morocco", date: "2026-06-13" },
    { home: "Haiti", away: "Scotland", date: "2026-06-13" },
    { home: "Australia", away: "Turkey", date: "2026-06-14" },
    { home: "Germany", away: "Curacao", date: "2026-06-14" },
    { home: "Netherlands", away: "Japan", date: "2026-06-14" },
    { home: "Ivory Coast", away: "Ecuador", date: "2026-06-14" },
    { home: "Sweden", away: "Tunisia", date: "2026-06-14" },
  ];

  try {
    // The Odds API 시도 (무료 키 없이 샘플 반환 여부 확인)
    const res = await fetch(
      'https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds/?regions=us&markets=h2h&oddsFormat=decimal',
      { 
        headers: { 'Content-Type': 'application/json' },
        next: { revalidate: 300 } // 5분 캐시
      }
    );

    if (res.ok) {
      const data = await res.json();
      // odds 데이터 있으면 변환
      const formatted = data.slice(0,8).map(game => {
        const pinnacle = game.bookmakers?.find(b => b.key === 'pinnacle') || game.bookmakers?.[0];
        const h2h = pinnacle?.markets?.find(m => m.key === 'h2h');
        if (!h2h) return null;
        
        const home = h2h.outcomes.find(o => o.name === game.home_team);
        const away = h2h.outcomes.find(o => o.name === game.away_team);
        const draw = h2h.outcomes.find(o => o.name === 'Draw');
        
        // 소수 오즈 → 확률 변환 (vig 제거)
        const toProb = (dec) => dec ? 1/dec : 0;
        const hp = toProb(home?.price), ap = toProb(away?.price), dp = toProb(draw?.price);
        const total = hp + ap + dp;
        
        return {
          home: game.home_team,
          away: game.away_team,
          date: game.commence_time?.split('T')[0],
          homeWin: Math.round(hp/total*100),
          draw: Math.round(dp/total*100),
          awayWin: Math.round(ap/total*100),
          source: pinnacle?.title || 'Pinnacle',
        };
      }).filter(Boolean);

      return NextResponse.json({ odds: formatted, live: true });
    }
  } catch(e) {
    console.log('Live odds fetch failed:', e.message);
  }

  // fallback: Pinnacle 직접 스크래핑 시도
  try {
    const res2 = await fetch(
      'https://guest.api.arcadia.pinnacle.com/0.1/leagues/3507/matchups?brandId=0',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'X-Device-UUID': 'web-uuid-1234',
        },
        next: { revalidate: 300 }
      }
    );
    if (res2.ok) {
      const d = await res2.json();
      return NextResponse.json({ odds: d.slice(0,8), live: true, source: 'pinnacle_direct' });
    }
  } catch(e) {}

  // 최종 fallback: 정적 오즈 데이터 (ESPN/Pinnacle 기반 수동 입력)
  const staticOdds = [
    { home:"Mexico", away:"South Africa", homeWin:42, draw:27, awayWin:31, source:"Pinnacle" },
    { home:"South Korea", away:"Czechia", homeWin:38, draw:28, awayWin:34, source:"Pinnacle" },
    { home:"Canada", away:"Bosnia-Herzegovina", homeWin:44, draw:26, awayWin:30, source:"Pinnacle" },
    { home:"USA", away:"Paraguay", homeWin:48, draw:25, awayWin:27, source:"Pinnacle" },
    { home:"Qatar", away:"Switzerland", homeWin:22, draw:25, awayWin:53, source:"Pinnacle" },
    { home:"Brazil", away:"Morocco", homeWin:58, draw:23, awayWin:19, source:"Pinnacle" },
    { home:"Germany", away:"Curacao", homeWin:85, draw:10, awayWin:5, source:"Pinnacle" },
    { home:"Netherlands", away:"Japan", homeWin:52, draw:26, awayWin:22, source:"Pinnacle" },
  ];
  
  return NextResponse.json({ odds: staticOdds, live: false });
}
