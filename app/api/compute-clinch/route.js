import { adminDb } from '../../../lib/firebaseAdmin';

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
  {id:"J5c", iso:"2026-06-27T22:00:00-04:00", date:"Jun 27", time:"10:00 PM ET", home:"Algeria",             away:"Argentina",           group:"J"},
  {id:"J6c", iso:"2026-06-27T22:00:00-04:00", date:"Jun 27", time:"10:00 PM ET", home:"Jordan",              away:"Austria",             group:"J"},
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

function cmpStatRank(a, b) {
  return (b.pts - a.pts) || (b.gd - a.gd) || (b.gf - a.gf);
}

function generateGroupScenarios(group, matchResults) {
  var teams = (GROUPS[group] && GROUPS[group].teams) || [];
  var baseStats = {};
  teams.forEach(function(t){ baseStats[t] = {pts:0, gf:0, ga:0, played:0}; });

  MATCH_SCHEDULE.forEach(function(m){
    if(m.group !== group) return;
    var r = matchResults[m.id] || matchResults[m.id+"a"];
    if(!r) return;
    var h = parseInt(r.home), a = parseInt(r.away);
    if(isNaN(h) || isNaN(a)) return;
    if(!baseStats[m.home] || !baseStats[m.away]) return;
    baseStats[m.home].played++; baseStats[m.away].played++;
    baseStats[m.home].gf+=h; baseStats[m.home].ga+=a;
    baseStats[m.away].gf+=a; baseStats[m.away].ga+=h;
    if(h>a) baseStats[m.home].pts+=3;
    else if(h<a) baseStats[m.away].pts+=3;
    else { baseStats[m.home].pts++; baseStats[m.away].pts++; }
  });

  var remainingMatches = MATCH_SCHEDULE.filter(function(m){
    return m.group === group && !matchResults[m.id] && !matchResults[m.id+"a"];
  });

  if(remainingMatches.length === 0) {
    teams.forEach(function(t){ baseStats[t].gd = baseStats[t].gf - baseStats[t].ga; });
    return [baseStats];
  }

  var outcomes = ["home", "draw", "away"];
  var margins = [1, 5];
  var scenarios = [];

  function recurse(idx, stats) {
    if(idx >= remainingMatches.length) {
      var copy = {};
      teams.forEach(function(t){
        copy[t] = { pts: stats[t].pts, gf: stats[t].gf, ga: stats[t].ga, played: stats[t].played };
        copy[t].gd = copy[t].gf - copy[t].ga;
      });
      scenarios.push(copy);
      return;
    }
    var m = remainingMatches[idx];
    outcomes.forEach(function(outcome) {
      if(outcome === "draw") {
        var next = {};
        teams.forEach(function(t){ next[t] = { pts: stats[t].pts, gf: stats[t].gf, ga: stats[t].ga, played: stats[t].played }; });
        next[m.home].pts += 1; next[m.away].pts += 1;
        next[m.home].gf += 1; next[m.home].ga += 1;
        next[m.away].gf += 1; next[m.away].ga += 1;
        recurse(idx + 1, next);
        return;
      }
      margins.forEach(function(margin) {
        var next = {};
        teams.forEach(function(t){ next[t] = { pts: stats[t].pts, gf: stats[t].gf, ga: stats[t].ga, played: stats[t].played }; });
        if(outcome === "home") {
          next[m.home].pts += 3; next[m.home].gf += margin; next[m.away].ga += margin;
        } else {
          next[m.away].pts += 3; next[m.away].gf += margin; next[m.home].ga += margin;
        }
        recurse(idx + 1, next);
      });
    });
  }
  recurse(0, baseStats);
  return scenarios;
}

function computeFairCutoffLine(groupResults, matchResults) {
  var thirds = [];
  Object.keys(GROUPS).forEach(function(group) {
    var teams = GROUPS[group].teams;
    if(groupResults[group]) {
      var scenarios = generateGroupScenarios(group, matchResults);
      var stats = scenarios[0];
      var thirdTeam = groupResults[group][2];
      if(thirdTeam) thirds.push({pts: stats[thirdTeam].pts, gd: stats[thirdTeam].gd, gf: stats[thirdTeam].gf});
      return;
    }
    var scenarios2 = generateGroupScenarios(group, matchResults);
    var best = null;
    scenarios2.forEach(function(stats) {
      var sorted = teams.slice().sort(function(a, b){ return cmpStatRank(stats[a], stats[b]); });
      var third = sorted[2];
      var cand = { pts: stats[third].pts, gd: stats[third].gd, gf: stats[third].gf };
      if(!best || cmpStatRank(best, cand) > 0) best = cand;
    });
    if(best) thirds.push(best);
  });
  thirds.sort(cmpStatRank);
  return thirds[7] || { pts: -1, gd: -99, gf: -99 };
}

function isClinched(team, group, groupResults, matchResults, cutoff) {
  if(groupResults[group]) return groupResults[group].includes(team) ? 1 : 0;
  var teams = (GROUPS[group] && GROUPS[group].teams) || [];
  if(teams.indexOf(team) === -1) return 0.5;
  var scenarios = generateGroupScenarios(group, matchResults);
  if(scenarios.length === 0) return 0.5;
  var maxPlayed = Math.max.apply(null, teams.map(function(t){ return scenarios[0][t].played; }));
  var safeCount = 0, dangerCount = 0;
  scenarios.forEach(function(stats) {
    var sorted = teams.slice().sort(function(a, b){ return cmpStatRank(stats[a], stats[b]); });
    var rank = sorted.indexOf(team);
    if(rank < 2) { safeCount++; return; }
    if(cmpStatRank(stats[team], cutoff) < 0) { safeCount++; }
    else { dangerCount++; }
  });
  if(dangerCount === 0) return 1;
  if(safeCount === 0) return 0.02;
  var progress = maxPlayed / 3;
  var safeRatio = safeCount / (safeCount + dangerCount);
  return Math.max(0.05, Math.min(0.95, 0.1 + 0.8 * safeRatio + 0.1 * progress));
}

export async function GET() {
  const ref = adminDb.collection('tournament').doc('state');
  const doc = await ref.get();
  const data = doc.data() || {};
  const matchResults = data.matchResults || {};
  const groupResults = data.groupResults || {};

  const cutoff = computeFairCutoffLine(groupResults, matchResults);
  const clinchStatus = {};

  Object.keys(GROUPS).forEach(function(grp) {
    GROUPS[grp].teams.forEach(function(team) {
      clinchStatus[team] = isClinched(team, grp, groupResults, matchResults, cutoff);
    });
  });

  await ref.set({ ...data, clinchStatus, clinchUpdatedAt: Date.now() }, { merge: true });

  return new Response(JSON.stringify({ ok: true, cutoff, clinchStatus }), {
    headers: {'Content-Type':'application/json'}
  });
}
