// Builds the static profile SVGs (hero, now, stack) in a dark and a light variant.
// Run: node scripts/build.mjs
import { themes, fonts, SANS, MONO, monoWidth, esc, svg, write, frame } from './svg.mjs';

// Deterministic noise so rebuilding does not change the files.
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

/* ---------- hero ---------- */

const TYPED = [
  'building interfaces for conversational AI avatars',
  'shipping drone detection to Raspberry Pi in the field',
  'React, TypeScript and CSS, all the way down',
  'running a multi-agent dev pipeline on two machines',
];

function typing(t, x0, y, size) {
  const cw = size * 0.6;
  const TYPE = 0.055, HOLD = 1.9, ERASE = 0.018, GAP = 0.35;
  // A timeline of [time, line, chars] steps across all lines.
  const steps = [];
  let now = 0;
  TYPED.forEach((line, i) => {
    for (let c = 0; c <= line.length; c++) steps.push([now + c * TYPE, i, c]);
    now += line.length * TYPE + HOLD;
    for (let c = line.length - 1; c >= 0; c--) steps.push([now + (line.length - 1 - c) * ERASE, i, c]);
    now += line.length * ERASE + GAP;
  });
  const T = now;
  // Start the loop with the first line already typed, so a static first frame still reads.
  const shift = TYPED[0].length * TYPE;
  for (const st of steps) st[0] = (st[0] - shift + T) % T;
  steps.sort((a, b) => a[0] - b[0]);
  const kt = (s) => (s / T).toFixed(5);
  const keyTimes = steps.map(([s]) => kt(s)).join(';');
  const cursorX = steps.map(([, , c]) => (x0 + c * cw).toFixed(1)).join(';');
  const anim = (attr, values) =>
    `<animate attributeName="${attr}" values="${values}" keyTimes="${keyTimes}" dur="${T.toFixed(2)}s" calcMode="discrete" repeatCount="indefinite"/>`;

  const clips = TYPED.map((_, i) => {
    const widths = steps.map(([, l, c]) => (l === i ? (c * cw).toFixed(1) : 0)).join(';');
    return `<clipPath id="ty${i}"><rect x="${x0}" y="${y - size}" height="${size * 1.4}" width="${i === 0 ? (TYPED[0].length * cw).toFixed(1) : 0}">${anim('width', widths)}</rect></clipPath>`;
  }).join('');
  const texts = TYPED.map((line, i) =>
    `<text x="${x0}" y="${y}" clip-path="url(#ty${i})" class="typed">${esc(line)}</text>`).join('');
  const cursor = `<rect class="cursor" x="${(x0 + TYPED[0].length * cw).toFixed(1)}" y="${y - size * 0.82}" width="${cw * 0.9}" height="${size * 1.05}" rx="2" fill="${t.accent}">${anim('x', cursorX)}</rect>`;
  return `<defs>${clips}</defs>${texts}${cursor}`;
}

function spectrum(t, x0, x1, base) {
  const w = x1 - x0;
  // Low noise floor across the band.
  let floor = `M${x0} ${base}`;
  for (let x = x0; x <= x1; x += 5) floor += ` L${x} ${(base - 3 - rnd() * 7).toFixed(1)}`;
  floor += ` L${x1} ${base}`;
  // Carriers: position (0..1), height, width, period.
  const peaks = [[0.09, 34, 10, 2.4], [0.24, 58, 7, 3.1], [0.4, 26, 18, 2.7], [0.57, 70, 6, 1.9], [0.73, 40, 12, 3.5], [0.9, 50, 8, 2.2]];
  const peakPaths = peaks.map(([p, h, sd, d], i) => {
    const cx = x0 + p * w;
    let path = `M${cx - sd * 4} ${base}`;
    for (let x = cx - sd * 4; x <= cx + sd * 4; x += 2) {
      const g = Math.exp(-((x - cx) ** 2) / (2 * sd * sd));
      path += ` L${x.toFixed(1)} ${(base - 4 - h * g - rnd() * 3 * g).toFixed(1)}`;
    }
    // Fill the closed shape, stroke only the curve, so no line runs along the floor.
    return `<g class="peak" style="animation-duration:${d}s;animation-delay:-${(i * 0.7).toFixed(1)}s"><path d="${path} L${cx + sd * 4} ${base} Z" fill="url(#area)"/><path d="${path.replace(/^M[^L]+ L/, 'M')}" fill="none" stroke="${t.accent}" stroke-width="1.4"/></g>`;
  }).join('');
  const ticks = [0, 1, 2, 3, 4, 5, 6].map((g) => {
    const x = x0 + (g / 6) * w;
    return `<line x1="${x}" y1="${base}" x2="${x}" y2="${base + 5}" stroke="${t.faint}"/><text x="${x}" y="${base + 22}" class="tick" text-anchor="${g === 0 ? 'start' : g === 6 ? 'end' : 'middle'}">${g === 6 ? '6 GHz' : g}</text>`;
  }).join('');
  return `<defs>
<linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.accent}" stop-opacity=".45"/><stop offset="1" stop-color="${t.accent}" stop-opacity="0"/></linearGradient>
<linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${t.accent2}" stop-opacity="0"/><stop offset="1" stop-color="${t.accent2}" stop-opacity=".22"/></linearGradient>
<clipPath id="band"><rect x="${x0}" y="${base - 90}" width="${w}" height="90"/></clipPath>
</defs>
<g clip-path="url(#band)">
<path d="${floor} Z" fill="url(#area)" stroke="${t.accent}" stroke-opacity=".55" stroke-width="1"/>
${peakPaths}
<g class="sweep"><rect x="${x0 - 140}" y="${base - 90}" width="140" height="90" fill="url(#sweep)"/><rect x="${x0 - 1.5}" y="${base - 90}" width="1.5" height="90" fill="${t.accent2}" opacity=".8"/></g>
</g>
<line x1="${x0}" y1="${base}" x2="${x1}" y2="${base}" stroke="${t.faint}"/>
${ticks}`;
}

function hero(t) {
  const W = 1200, H = 380;
  const css = `${fonts.sans800()}${fonts.mono400()}${fonts.mono500()}
.label{font:500 15px ${MONO};letter-spacing:3px;fill:${t.muted}}
.name{font:800 72px ${SANS};letter-spacing:-2px;fill:${t.text}}
.typed{font:400 25px ${MONO};fill:${t.text}}
.prompt{font:500 25px ${MONO};fill:${t.accent}}
.tick{font:400 12px ${MONO};fill:${t.muted}}
.cursor{animation:blink 1s steps(1) infinite}
@keyframes blink{50%{opacity:0}}
.pulse{animation:pulse 2.4s ease-out infinite;transform-box:fill-box;transform-origin:center}
@keyframes pulse{0%{transform:scale(1);opacity:.7}100%{transform:scale(3.2);opacity:0}}
.peak{animation:breathe ease-in-out infinite alternate;transform-box:fill-box;transform-origin:50% 100%}
@keyframes breathe{from{transform:scaleY(.55)}to{transform:scaleY(1)}}
.sweep{animation:sweep 6.5s linear infinite}
@keyframes sweep{from{transform:translateX(0)}to{transform:translateX(${W - 112 + 140}px)}}`;
  const body = `${frame(t, W, H, 'hero')}
<defs><linearGradient id="nameg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${t.accent}"/><stop offset="1" stop-color="${t.accent2}"/></linearGradient></defs>
<circle cx="62" cy="61" r="5" fill="${t.accent}"/><circle class="pulse" cx="62" cy="61" r="5" fill="${t.accent}"/>
<text x="80" y="66" class="label">KYIV, UKRAINE  ·  SENIOR FRONTEND LEAD</text>
<text x="${W - 56}" y="66" class="label" text-anchor="end">SINCE 2019</text>
<text x="52" y="158" class="name">Oleksandr <tspan fill="url(#nameg)">Hlybchenko</tspan></text>
<text x="56" y="218" class="prompt">$</text>
${typing(t, 88, 218, 25)}
${spectrum(t, 56, W - 56, 318)}`;
  return svg({ width: W, height: H, title: 'Oleksandr Hlybchenko, senior frontend lead in Kyiv', css, body });
}

/* ---------- now: four cards ---------- */

const CARDS = [
  {
    tag: '01 · AI INTERFACES',
    title: 'Conversational AI avatar studio',
    body: [
      'Frontend lead of a SaaS studio where teams build,',
      'brand and ship talking AI avatars: the dashboard,',
      'an embeddable chat widget, Pixel Streaming, white-',
      'label theming and the product docs.',
    ],
    stat: '3.5k+ commits since 2024',
    accent: 'eq',
  },
  {
    tag: '02 · RF ON THE EDGE',
    title: 'Drone RF detection on Raspberry Pi 5',
    body: [
      'An SDR sweeps 0–6 GHz, classifies signals and raises',
      'alerts over MAVLink, UDP, UART and GPIO. On-device',
      'web UI, fleet backend, device agent, signed .deb',
      'packages, an APT repository and golden SD images.',
    ],
    stat: '1.8k+ commits in 2026',
    accent: 'radar',
  },
  {
    tag: '03 · DETECTION PLATFORM',
    title: 'Modular detectors by contract',
    body: [
      'A Rust platform that runs independently built',
      'detector modules: contracts, Rust and Python SDK,',
      'signed objects, device runtime, cloud licensing.',
      'Camera detector with YOLO models trained on CUDA.',
    ],
    stat: 'Rust · Python · Hailo · DVC',
    accent: 'bus',
  },
  {
    tag: '04 · AGENTIC ENGINEERING',
    title: 'Multi-agent development, on rails',
    body: [
      'Claude Code, Codex, Gemini and Cursor working in',
      'parallel on a Mac and a 64-thread Linux box over',
      'a tailnet. Own Claude Code mods, hooks and gates:',
      'every change passes tests, types and review.',
    ],
    stat: 'two machines, one pipeline',
    accent: 'agents',
  },
];

const ACCENTS = {
  eq: (t, x, y) => [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const h = [16, 30, 22, 38, 26, 34, 14][i];
    return `<rect class="bar" style="animation-delay:-${(i * 0.17).toFixed(2)}s;animation-duration:${(0.9 + (i % 3) * 0.25).toFixed(2)}s" x="${x + i * 10}" y="${y + 40 - h}" width="5" height="${h}" rx="2.5" fill="${t.accent}"/>`;
  }).join(''),
  radar: (t, x, y) => {
    const cx = x + 40, cy = y + 22, r = 21;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${t.faint}"/><circle cx="${cx}" cy="${cy}" r="12" fill="none" stroke="${t.faint}"/><circle cx="${cx}" cy="${cy}" r="4" fill="none" stroke="${t.faint}"/>
<g class="spin" style="transform-origin:${cx}px ${cy}px"><path d="M${cx} ${cy} L${cx + r} ${cy} A${r} ${r} 0 0 0 ${(cx + r * Math.cos(-0.7)).toFixed(1)} ${(cy + r * Math.sin(-0.7)).toFixed(1)} Z" fill="${t.accent}" opacity=".35"/><line x1="${cx}" y1="${cy}" x2="${cx + r}" y2="${cy}" stroke="${t.accent}" stroke-width="1.5"/></g>
<circle class="blip" cx="${cx + 10}" cy="${cy - 9}" r="3" fill="${t.warm}"/>`;
  },
  bus: (t, x, y) => {
    const pts = [[x + 4, y + 36], [x + 34, y + 6], [x + 64, y + 36]];
    const d = `M${pts[0][0]} ${pts[0][1]} L${pts[1][0]} ${pts[1][1]} L${pts[2][0]} ${pts[2][1]}`;
    return `<path d="${d}" fill="none" stroke="${t.faint}" stroke-width="1.5"/>${pts.map(([px, py]) => `<rect x="${px - 6}" y="${py - 6}" width="12" height="12" rx="3" fill="${t.card}" stroke="${t.accent}" stroke-width="1.5"/>`).join('')}
<circle r="3.5" fill="${t.warm}"><animateMotion dur="2.6s" repeatCount="indefinite" path="${d}"/></circle>`;
  },
  agents: (t, x, y) => {
    const c = [x + 34, y + 22];
    const nodes = [[x + 6, y], [x + 62, y], [x + 62, y + 44], [x + 6, y + 44]];
    return nodes.map(([nx, ny]) => `<line x1="${c[0]}" y1="${c[1]}" x2="${nx}" y2="${ny}" stroke="${t.faint}" stroke-width="1.5"/>`).join('') +
      `<circle cx="${c[0]}" cy="${c[1]}" r="6" fill="${t.accent2}"/>` +
      nodes.map(([nx, ny], i) => `<circle class="agent" style="animation-delay:${(i * 0.45).toFixed(2)}s" cx="${nx}" cy="${ny}" r="5" fill="${t.accent}"/>`).join('');
  },
};

function now(t) {
  const W = 1200, CW = 588, CH = 262, GAP = 24, H = CH * 2 + GAP;
  const css = `${fonts.sans500()}${fonts.sans800()}${fonts.mono500()}
.tag{font:500 13px ${MONO};letter-spacing:2.5px;fill:${t.accent}}
.title{font:800 26px ${SANS};letter-spacing:-.4px;fill:${t.text}}
.body{font:500 16.5px ${SANS};fill:${t.muted}}
.stat{font:500 14px ${MONO};fill:${t.text}}
.bar{animation:eq ease-in-out infinite alternate;transform-box:fill-box;transform-origin:50% 100%}
@keyframes eq{from{transform:scaleY(.3)}to{transform:scaleY(1)}}
.spin{animation:spin 3s linear infinite}
@keyframes spin{to{transform:rotate(-360deg)}}
.blip{animation:blip 3s ease-out infinite}
@keyframes blip{0%,30%{opacity:0}40%{opacity:1}100%{opacity:0}}
.agent{animation:agent 1.8s ease-in-out infinite}
@keyframes agent{0%,100%{opacity:.35}50%{opacity:1}}`;
  const cards = CARDS.map((c, i) => {
    const x = (i % 2) * (CW + GAP), y = Math.floor(i / 2) * (CH + GAP);
    const lines = c.body.map((l, j) => `<text x="32" y="${124 + j * 25}" class="body">${esc(l)}</text>`).join('');
    return `<g transform="translate(${x} ${y})">
${frame(t, CW, CH, `c${i}`)}
<text x="32" y="46" class="tag">${esc(c.tag)}</text>
<text x="32" y="86" class="title">${esc(c.title)}</text>
${lines}
<line x1="32" y1="${CH - 50}" x2="${CW - 32}" y2="${CH - 50}" stroke="${t.stroke}"/>
<text x="32" y="${CH - 22}" class="stat"><tspan fill="${t.accent}">▸ </tspan>${esc(c.stat)}</text>
${ACCENTS[c.accent](t, CW - 108, 20)}
</g>`;
  }).join('\n');
  const title = CARDS.map((c) => `${c.title}: ${c.body.join(' ')} ${c.stat}.`).join(' ');
  return svg({ width: W, height: H, title, css, body: cards });
}

/* ---------- stack ---------- */

const STACK = [
  ['INTERFACE', ['React', 'TypeScript', 'CSS / SCSS', 'Zustand', 'TanStack Query', 'react-aria', 'i18next', 'Three.js', 'Vite', 'Vitest', 'Playwright']],
  ['PLATFORM', ['Node.js', 'Fastify', 'Express', 'Next.js', 'PostgreSQL', 'Drizzle', 'Prisma', 'Supabase', 'Cloudflare Workers', 'Docker']],
  ['EDGE & ML', ['Rust', 'Python', 'Raspberry Pi 5', 'SDR', 'MAVLink', 'YOLO', 'Hailo-8', 'CUDA', 'DVC']],
  ['DELIVERY & AI', ['GitHub Actions', 'Debian packaging', 'OpenTofu', 'Tailscale', 'Claude Code', 'Codex', 'Gemini', 'Cursor']],
];

function stack(t) {
  const W = 1200, PAD = 32, GAP = 20, COLW = (W - PAD * 2 - GAP * 3) / 4;
  const FS = 13.5, CH = 30, CG = 8;
  let maxY = 0;
  const cols = STACK.map(([head, items], ci) => {
    const x0 = PAD + ci * (COLW + GAP);
    let x = 0, y = 0;
    const chips = items.map((name) => {
      const w = monoWidth(name, FS) + 24;
      if (x + w > COLW) { x = 0; y += CH + CG; }
      const chip = `<g transform="translate(${(x0 + x).toFixed(1)} ${86 + y})"><rect width="${w.toFixed(1)}" height="${CH}" rx="8" fill="${t.card}" stroke="${t.stroke}"/><text x="12" y="20" class="chip">${esc(name)}</text></g>`;
      x += w + CG;
      return chip;
    }).join('');
    maxY = Math.max(maxY, 86 + y + CH);
    return `<text x="${x0}" y="58" class="head">${esc(head)}</text><line x1="${x0}" y1="70" x2="${x0 + COLW}" y2="70" stroke="${t.stroke}"/>${chips}`;
  }).join('\n');
  const H = maxY + 34;
  const css = `${fonts.mono400()}${fonts.mono500()}
.head{font:500 13px ${MONO};letter-spacing:2.5px;fill:${t.accent}}
.chip{font:400 ${FS}px ${MONO};fill:${t.text}}`;
  const title = STACK.map(([h, items]) => `${h}: ${items.join(', ')}.`).join(' ');
  return svg({ width: W, height: H, title, css, body: `${frame(t, W, H, 'stack')}\n${cols}` });
}

for (const [name, t] of Object.entries(themes)) {
  seed = 7;
  write(`hero-${name}.svg`, hero(t));
  write(`now-${name}.svg`, now(t));
  write(`stack-${name}.svg`, stack(t));
}
