import { NextResponse } from 'next/server';

export async function GET() {
  // MATCH_SCHEDULE과 완전 동일한 팀명 사용
  const staticOdds = [
    // Round 1
    { id:"A1",  home:"Mexico",        away:"South Africa",      homeWin:42, draw:27, awayWin:31 },
    { id:"A2",  home:"South Korea",   away:"Czechia",           homeWin:38, draw:28, awayWin:34 },
    { id:"B1",  home:"Canada",        away:"Bosnia-Herzegovina",homeWin:44, draw:26, awayWin:30 },
    { id:"D1",  home:"United States", away:"Paraguay",          homeWin:48, draw:25, awayWin:27 },
    { id:"B2",  home:"Qatar",         away:"Switzerland",       homeWin:22, draw:25, awayWin:53 },
    { id:"C1",  home:"Brazil",        away:"Morocco",           homeWin:58, draw:23, awayWin:19 },
    { id:"C2",  home:"Haiti",         away:"Scotland",          homeWin:18, draw:27, awayWin:55 },
    { id:"D2",  home:"Australia",     away:"Türkiye",           homeWin:35, draw:27, awayWin:38 },
    { id:"E1",  home:"Germany",       away:"Curaçao",           homeWin:85, draw:10, awayWin:5  },
    { id:"F1",  home:"Netherlands",   away:"Japan",             homeWin:52, draw:26, awayWin:22 },
    { id:"E2",  home:"Ivory Coast",   away:"Ecuador",           homeWin:38, draw:28, awayWin:34 },
    { id:"F2",  home:"Sweden",        away:"Tunisia",           homeWin:45, draw:28, awayWin:27 },
    { id:"H1",  home:"Spain",         away:"Cape Verde",        homeWin:78, draw:14, awayWin:8  },
    { id:"G1",  home:"Belgium",       away:"Egypt",             homeWin:58, draw:25, awayWin:17 },
    { id:"H2",  home:"Saudi Arabia",  away:"Uruguay",           homeWin:28, draw:27, awayWin:45 },
    { id:"G2",  home:"Iran",          away:"New Zealand",       homeWin:42, draw:28, awayWin:30 },
    { id:"I1",  home:"France",        away:"Senegal",           homeWin:55, draw:25, awayWin:20 },
    { id:"I2",  home:"Iraq",          away:"Norway",            homeWin:25, draw:28, awayWin:47 },
    { id:"J1",  home:"Argentina",     away:"Algeria",           homeWin:72, draw:18, awayWin:10 },
    { id:"J2",  home:"Austria",       away:"Jordan",            homeWin:55, draw:25, awayWin:20 },
    { id:"K1",  home:"Portugal",      away:"Congo DR",          homeWin:75, draw:15, awayWin:10 },
    { id:"L1",  home:"England",       away:"Croatia",           homeWin:52, draw:27, awayWin:21 },
    { id:"L2",  home:"Ghana",         away:"Panama",            homeWin:38, draw:28, awayWin:34 },
    { id:"K2",  home:"Uzbekistan",    away:"Colombia",          homeWin:28, draw:28, awayWin:44 },
    // Round 2
    { id:"A3b", home:"Czechia",             away:"South Africa",      homeWin:48, draw:27, awayWin:25 },
    { id:"B3b", home:"Switzerland",         away:"Bosnia-Herzegovina", homeWin:52, draw:26, awayWin:22 },
    { id:"B4b", home:"Canada",              away:"Qatar",             homeWin:62, draw:22, awayWin:16 },
    { id:"A4b", home:"Mexico",              away:"South Korea",       homeWin:42, draw:28, awayWin:30 },
    { id:"D3b", home:"United States",       away:"Australia",         homeWin:48, draw:26, awayWin:26 },
    { id:"C3b", home:"Scotland",            away:"Morocco",           homeWin:28, draw:27, awayWin:45 },
    { id:"C4b", home:"Brazil",              away:"Haiti",             homeWin:88, draw:8,  awayWin:4  },
    { id:"D4b", home:"Türkiye",             away:"Paraguay",          homeWin:42, draw:28, awayWin:30 },
    { id:"F3b", home:"Netherlands",         away:"Sweden",            homeWin:55, draw:25, awayWin:20 },
    { id:"E3b", home:"Germany",             away:"Ivory Coast",       homeWin:62, draw:22, awayWin:16 },
    { id:"E4b", home:"Ecuador",             away:"Curaçao",           homeWin:68, draw:20, awayWin:12 },
    { id:"F4b", home:"Tunisia",             away:"Japan",             homeWin:30, draw:28, awayWin:42 },
    { id:"H3b", home:"Spain",               away:"Saudi Arabia",      homeWin:72, draw:18, awayWin:10 },
    { id:"G3b", home:"Belgium",             away:"Iran",              homeWin:62, draw:22, awayWin:16 },
    { id:"H4b", home:"Uruguay",             away:"Cape Verde",        homeWin:65, draw:20, awayWin:15 },
    { id:"G4b", home:"New Zealand",         away:"Egypt",             homeWin:32, draw:28, awayWin:40 },
    { id:"J3b", home:"Argentina",           away:"Austria",           homeWin:62, draw:22, awayWin:16 },
    { id:"I3b", home:"France",              away:"Iraq",              homeWin:78, draw:14, awayWin:8  },
    { id:"I4b", home:"Norway",              away:"Senegal",           homeWin:42, draw:28, awayWin:30 },
    { id:"J4b", home:"Jordan",              away:"Algeria",           homeWin:28, draw:28, awayWin:44 },
    { id:"K3b", home:"Portugal",            away:"Uzbekistan",        homeWin:72, draw:18, awayWin:10 },
    { id:"L3b", home:"England",             away:"Ghana",             homeWin:58, draw:24, awayWin:18 },
    { id:"L4b", home:"Panama",              away:"Croatia",           homeWin:28, draw:27, awayWin:45 },
    { id:"K4b", home:"Colombia",            away:"Congo DR",          homeWin:58, draw:24, awayWin:18 },
  ];

  return NextResponse.json({ odds: staticOdds, live: false, source: "Pinnacle ref" });
}
