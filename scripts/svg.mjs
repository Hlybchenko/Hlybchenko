// Shared pieces for the profile SVGs: themes, embedded fonts, escaping, file output.
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);

export const themes = {
  dark: {
    card: '#0f141b', stroke: '#262c36', grid: '#1b222c',
    text: '#e6edf3', muted: '#8b949e', faint: '#3a424e',
    accent: '#3fe0b0', accent2: '#7aa2ff', warm: '#f2c14e',
  },
  light: {
    card: '#f8fafc', stroke: '#d8dee4', grid: '#e6eaef',
    text: '#1f2328', muted: '#59636e', faint: '#c4cbd3',
    accent: '#0b9c78', accent2: '#2f62e0', warm: '#b7791f',
  },
};

const font = (family, weight, file) => {
  const b64 = readFileSync(new URL(`assets/fonts/${file}`, root)).toString('base64');
  return `@font-face{font-family:'${family}';font-weight:${weight};src:url(data:font/woff2;base64,${b64}) format('woff2');}`;
};

// Only the faces a given SVG uses get embedded, to keep files small.
export const fonts = {
  sans500: () => font('P Sans', 500, 'inter-latin-500-normal.woff2'),
  sans800: () => font('P Sans', 800, 'inter-latin-800-normal.woff2'),
  mono400: () => font('P Mono', 400, 'jetbrains-mono-latin-400-normal.woff2'),
  mono500: () => font('P Mono', 500, 'jetbrains-mono-latin-500-normal.woff2'),
};

export const SANS = `'P Sans',Inter,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif`;
export const MONO = `'P Mono','JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`;
// JetBrains Mono advance width is 600/1000 em.
export const monoWidth = (text, size) => text.length * size * 0.6;

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const svg = ({ width, height, title, css, body }) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}">
<title>${esc(title)}</title>
<style>${css}
@media (prefers-reduced-motion: reduce){*{animation:none!important}}</style>
${body}
</svg>
`;

export const write = (name, content) => {
  writeFileSync(new URL(`assets/${name}`, root), content);
  console.log(`assets/${name}  ${(content.length / 1024).toFixed(1)} KB`);
};

// Card frame with a faint dot grid, shared by every panel.
export const frame = (t, w, h, id) => `<defs><pattern id="dots-${id}" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" fill="${t.grid}"/></pattern></defs>
<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="18" fill="${t.card}" stroke="${t.stroke}"/>
<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="18" fill="url(#dots-${id})"/>`;
