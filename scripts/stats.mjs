// Builds assets/stats-{dark,light}.svg from the GitHub GraphQL API.
// Counts every contribution of the last year, organization repositories included, so it needs a
// token that can read them: GH_TOKEN (a fine-grained or classic PAT with read access).
// Run: GH_TOKEN=... node scripts/stats.mjs
import { themes, fonts, SANS, MONO, esc, svg, write, frame } from './svg.mjs';

const LOGIN = process.env.PROFILE_LOGIN ?? 'Hlybchenko';
const token = process.env.GH_TOKEN;
if (!token) {
  console.log('GH_TOKEN is not set: stats not rebuilt.');
  process.exit(0);
}

const query = `query($login:String!){ viewer { login } user(login:$login){ contributionsCollection {
  totalCommitContributions totalPullRequestContributions totalPullRequestReviewContributions
  contributionCalendar { totalContributions }
  commitContributionsByRepository(maxRepositories:100){
    contributions { totalCount }
    repository { owner { __typename } languages(first:10, orderBy:{field:SIZE, direction:DESC}){ totalSize edges { size node { name color } } } }
  } } } }`;

const res = await fetch('https://api.github.com/graphql', {
  method: 'POST',
  headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'profile-stats' },
  body: JSON.stringify({ query, variables: { login: LOGIN } }),
});
// A classic token with the repo scope is the only kind that sees private repositories of several
// owners at once. Anything else returns public data only, so refuse rather than shrink the card.
const scopes = res.headers.get('x-oauth-scopes');
if (scopes === null || !scopes.split(/,\s*/).includes('repo')) {
  console.error(`Token scopes: ${scopes ?? 'none reported (not a classic PAT)'}. A classic PAT with the repo scope is required.`);
  process.exit(1);
}
const json = await res.json();
if (!res.ok || json.errors) throw new Error(JSON.stringify(json.errors ?? json));
// A token of another account sees only public contributions: refuse rather than shrink the card.
console.log(`Token: ${json.data.viewer.login}, scopes: ${scopes}`);
if (json.data.viewer.login.toLowerCase() !== LOGIN.toLowerCase()) {
  console.error(`The token belongs to ${json.data.viewer.login}, not ${LOGIN}.`);
  process.exit(1);
}
const cc = json.data.user.contributionsCollection;
const repos = cc.commitContributionsByRepository;

// Languages weighted by my commits in each repository, not by repository size:
// what I write, not what I vendor.
const langs = new Map();
for (const { contributions, repository } of repos) {
  const { totalSize, edges } = repository.languages;
  if (!totalSize) continue;
  for (const { size, node } of edges) {
    const prev = langs.get(node.name) ?? { w: 0, color: node.color ?? '#8b949e' };
    prev.w += contributions.totalCount * (size / totalSize);
    langs.set(node.name, prev);
  }
}
const total = [...langs.values()].reduce((s, l) => s + l.w, 0);
const sorted = [...langs.entries()].map(([name, l]) => ({ name, color: l.color, p: l.w / total })).sort((a, b) => b.p - a.p);
const top = sorted.slice(0, 6);
const rest = 1 - top.reduce((s, l) => s + l.p, 0);
if (rest > 0.005) top.push({ name: 'Other', color: null, p: rest });

const orgRepos = repos.filter((r) => r.repository.owner.__typename === 'Organization').length;
const fmt = (n) => n.toLocaleString('en-US');
const METRICS = [
  [fmt(cc.contributionCalendar.totalContributions), 'contributions, last 12 months'],
  [fmt(cc.totalCommitContributions), 'commits'],
  [fmt(cc.totalPullRequestContributions), 'pull requests'],
  [`${repos.length}`, `repositories · ${orgRepos} in organizations`],
];
const updated = new Date().toISOString().slice(0, 10);

function card(t) {
  const W = 1200, H = 300;
  const css = `${fonts.sans800()}${fonts.mono400()}${fonts.mono500()}
.head{font:500 13px ${MONO};letter-spacing:2.5px;fill:${t.accent}}
.num{font:800 40px ${SANS};letter-spacing:-1px;fill:${t.text}}
.cap{font:400 13.5px ${MONO};fill:${t.muted}}
.lang{font:500 14px ${MONO};fill:${t.text}}
.pct{font:400 14px ${MONO};fill:${t.muted}}`;
  const metrics = METRICS.map(([n, cap], i) => {
    const x = 40 + (i % 2) * 270, y = 116 + Math.floor(i / 2) * 92;
    return `<text x="${x}" y="${y}" class="num">${esc(n)}</text><text x="${x}" y="${y + 26}" class="cap">${esc(cap)}</text>`;
  }).join('');
  const BX = 640, BW = W - BX - 40;
  let acc = 0;
  const segs = top.map((l) => {
    const x = BX + acc * BW, w = Math.max(l.p * BW - 3, 2);
    acc += l.p;
    return `<rect x="${x.toFixed(1)}" y="88" width="${w.toFixed(1)}" height="14" rx="4" fill="${l.color ?? t.faint}"/>`;
  }).join('');
  const legend = top.map((l, i) => {
    const x = BX + (i % 2) * 270, y = 146 + Math.floor(i / 2) * 34;
    return `<circle cx="${x + 6}" cy="${y - 5}" r="6" fill="${l.color ?? t.faint}"/><text x="${x + 22}" y="${y}" class="lang">${esc(l.name)}</text><text x="${x + 250}" y="${y}" class="pct" text-anchor="end">${(l.p * 100).toFixed(1)}%</text>`;
  }).join('');
  const body = `${frame(t, W, H, 'stats')}
<text x="40" y="56" class="head">LAST 12 MONTHS · ALL REPOSITORIES</text>
<text x="${BX}" y="56" class="head">LANGUAGES · WEIGHTED BY MY COMMITS</text>
<line x1="600" y1="40" x2="600" y2="${H - 40}" stroke="${t.stroke}"/>
${metrics}
${segs}
${legend}
<text x="${W - 40}" y="${H - 22}" class="cap" text-anchor="end">updated ${updated}</text>`;
  const title = `${METRICS.map(([n, c]) => `${n} ${c}`).join(', ')}. Languages: ${top.map((l) => `${l.name} ${(l.p * 100).toFixed(0)}%`).join(', ')}.`;
  return svg({ width: W, height: H, title, css, body });
}

for (const [name, t] of Object.entries(themes)) write(`stats-${name}.svg`, card(t));
