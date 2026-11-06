export type BotConfig = { shape: number; color: number; hat: number; glasses: number };
export const DEFAULT_BOT: BotConfig = { shape: 1, color: 7, hat: 0, glasses: 0 };
export const encodeBot = (b: BotConfig) => `${b.shape}.${b.color}.${b.hat}.${b.glasses}`;

export const decodeBot = (s: string | undefined | null): BotConfig => {
  if (!s || typeof s !== 'string') return { ...DEFAULT_BOT };
  // Check if string contains encoded format "shape.color.hat.glasses"
  const clean = s.startsWith("face:") ? s.slice(5) : s;
  const parts = clean.split('.');
  if (parts.length !== 4) return { ...DEFAULT_BOT };
  const [shape, color, hat, glasses] = parts.map(Number);
  if ([shape, color, hat, glasses].some((v) => Number.isNaN(v))) {
    return { ...DEFAULT_BOT };
  }
  return {
    shape: shape >= 0 && shape < SHAPES.length ? shape : DEFAULT_BOT.shape,
    color: color >= 0 && color < COLORS.length ? color : DEFAULT_BOT.color,
    hat: hat >= 0 && hat < HAT_NAMES.length ? hat : DEFAULT_BOT.hat,
    glasses: glasses >= 0 && glasses < GLASSES_NAMES.length ? glasses : DEFAULT_BOT.glasses,
  };
};

type Brick = { r: string[]; f: [number, number, number]; n?: 1 };
type Solid = { t: 'p' | 'y' | 'c'; c: number; d?: number; h: number; s: number };
type Pair = [string, string];
const P = 28,
  D = 14,
  U = 22;

export const SHAPES: (Brick | Solid)[] = [
  { r: ['2'], f: [0.5, 0, 0.8] },
  { r: ['22'], f: [1, 0, 1] },
  { r: ['22', '22'], f: [1, 1, 1] },
  { r: ['222'], f: [1.5, 0, 1.25] },
  { r: ['2222'], f: [2, 0, 1.5] },
  { r: ['11'], f: [1, 0, 0.6] },
  { r: ['33'], f: [1, 0, 1.1] },
  { r: ['22', '22'], f: [1, 1, 1], n: 1 },
  { r: ['33', '22'], f: [1, 1, 1] },
  { r: ['222', '222'], f: [1.5, 1, 1.2] },
  { r: ['3'], f: [0.5, 0, 0.8] },
  { r: ['1'], f: [0.5, 0, 0.5] },
  { t: 'p', c: 2, d: 2, h: 2.5, s: 0.9 },
  { t: 'y', c: 2, d: 2, h: 2.5, s: 0.9 },
  { t: 'c', c: 2, h: 2, s: 1 },
];

export const COLORS: Pair[] = [
  ['#2a2a31', '#000000'],
  ['#9a5b2e', '#6a3a1a'],
  ['#f0283c', '#a81626'],
  ['#ff6a13', '#bf4806'],
  ['#f7931e', '#b86a08'],
  ['#14b866', '#0a7a42'],
  ['#12a99a', '#0a7066'],
  ['#1f6bff', '#1042b8'],
  ['#8a4dff', '#5a2cc0'],
  ['#ff3b9a', '#b81e6c'],
  ['#8a8f98', '#555a62'],
];

export const COLOR_NAMES = [
  'Charcoal',
  'Brown',
  'Crimson',
  'Orange',
  'Amber',
  'Emerald',
  'Teal',
  'Blue',
  'Purple',
  'Pink',
  'Slate',
];

const HAT_COLORS: (string[] | null)[] = [
  null,
  ['#ffd23f', '#d99a0b', '#ffffff', '#b8bdc7'],
  ['#e8412c', '#b82d1c', '#2f6bff', '#1d46b8'],
  ['#26262c', '#d63a3a', '#f2f2f4', '#8a8f98'],
  ['#ffc83d', '#e09a00', '#fff0b3', '#e0c25a'],
  ['#ff4fb3', '#ffd23f', '#8a4dff', '#ffd23f'],
];
const HAT_TOP = [0, 19, 29, 31, 20, 40];
export const HAT_NAMES = ['None', 'Cap', 'Beanie', 'Top Hat', 'Crown', 'Party'];
export const GLASSES_NAMES = ['None', 'Round', 'Square', 'Sunglasses'];

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (h: string) => {
  const [r, g, b] = hex(h);
  return 0.299 * r + 0.587 * g + 0.114 * b;
};
const dist = (a: string, b: string) => {
  const x = hex(a),
    y = hex(b);
  return Math.abs(x[0] - y[0]) + Math.abs(x[1] - y[1]) + Math.abs(x[2] - y[2]);
};
const mix = (a: string, b: string, t: number) => {
  const x = hex(a),
    y = hex(b);
  return (
    '#' +
    x
      .map((v, i) =>
        Math.round(v + (y[i] - v) * t)
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  );
};

const rr = (x: number, y: number, w: number, h: number, r: number, a: boolean, b: boolean, c: boolean, d: boolean) => {
  const A = a ? r : 0,
    B = b ? r : 0,
    E = c ? r : 0,
    F = d ? r : 0;
  return `M${x + A} ${y}H${x + w - B}${B ? `A${B} ${B} 0 0 1 ${x + w} ${y + B}` : ''}V${y + h - E}${E ? `A${E} ${E} 0 0 1 ${x + w - E} ${y + h}` : ''}H${x + F}${F ? `A${F} ${F} 0 0 1 ${x} ${y + h - F}` : ''}V${y + A}${A ? `A${A} ${A} 0 0 1 ${x + A} ${y}` : ''}Z`;
};

const PILLS = `<rect x='-11' y='-8' width='6' height='16' rx='2.5' fill='#fff'/><rect x='5' y='-8' width='6' height='16' rx='2.5' fill='#fff'/>`;

function glassesSvg(g: number, c: Pair): string {
  if (!g) return '';
  const f = lum(c[0]) < 110 ? '#f4f4f6' : '#1c1c21',
    st = `stroke='${f}' stroke-width='2.4'`;
  if (g === 1)
    return `<g fill='#fff' fill-opacity='.14' ${st}><circle cx='-10.5' r='9.5'/><circle cx='10.5' r='9.5'/></g><path d='M-1 -2Q0 -4 1 -2' fill='none' ${st}/>`;
  if (g === 2)
    return `<g fill='#fff' fill-opacity='.14' ${st}><rect x='-20' y='-9.5' width='19' height='19' rx='3'/><rect x='1' y='-9.5' width='19' height='19' rx='3'/></g><path d='M-1 -3H1' fill='none' ${st}/>`;
  const l = `<path d='M-20 -9H-1V2Q-1 9.5 -8 9.5H-13Q-20 9.5 -20 2Z' fill='#0d0d10' fill-opacity='.9' stroke='${f}' stroke-width='1.4'/><path d='M-16 -4H-11' stroke='#fff' stroke-opacity='.35' stroke-width='2' stroke-linecap='round'/>`;
  return `${l}<g transform='scale(-1 1)'>${l}</g><path d='M-1 -6H1' fill='none' ${st}/>`;
}

const eyes = (x: number, y: number, k: number, g: number, c: Pair) =>
  `<g class='ey'><g transform='translate(${x},${y}) scale(${g ? k * 0.75 : k}) rotate(-8)'>${PILLS}${glassesSvg(g, c)}</g></g>`;

function hatSvg(i: number, c: Pair, ax: number, ay: number, aw: number): [string, number] {
  if (!i) return ['', 1e9];
  const p = HAT_COLORS[i]!,
    near = dist(p[0], c[0]) < 130,
    A = near ? p[2] : p[0],
    B = near ? p[3] : p[1],
    s = aw / 40;
  const m = [
    '',
    `<path d='M-20 0A20 16 0 0 1 20 0A20 10 0 0 1 -20 0Z' fill='${A}'/><circle cy='-16' r='2.6' fill='${B}'/><ellipse cy='9' rx='16' ry='6.5' fill='${B}'/>`,
    `<path d='M-18 -4A18 20 0 0 1 18 -4A18 8 0 0 1 -18 -4Z' fill='${A}'/><path d='M-20 -5V1A20 10 0 0 0 20 1V-5A20 10 0 0 1 -20 -5Z' fill='${B}'/><circle cy='-24' r='5' fill='#fff'/>`,
    `<ellipse rx='20' ry='10' fill='${mix(A, '#ffffff', 0.1)}'/><path d='M-11 0V-24A11 5.5 0 0 1 11 -24V0A11 5.5 0 0 1 -11 0Z' fill='${A}'/><path d='M-11 -6V0A11 5.5 0 0 0 11 0V-6A11 5.5 0 0 1 -11 -6Z' fill='${B}'/><ellipse cy='-24' rx='11' ry='5.5' fill='${mix(A, '#ffffff', 0.18)}'/>`,
    `<path d='M-16 0V-16L-8 -8L0 -20L8 -8L16 -16V0A16 8 0 0 1 -16 0Z' fill='${A}'/><path d='M-16 -4H16V0A16 8 0 0 1 -16 0Z' fill='${B}'/><circle cy='-8' r='2.6' fill='#e63946'/>`,
    `<path d='M-18 0L0 -36L18 0A18 9 0 0 1 -18 0Z' fill='${A}'/><path d='M-12 -12L12 -12L9 -18L-9 -18Z' fill='${B}'/><path d='M-17 -2L17 -2L14 -8L-14 -8Z' fill='${B}'/><circle cy='-36' r='3.5' fill='${B}'/>`,
  ][i];
  return [`<g transform='translate(${ax},${ay}) scale(${s})'>${m}</g>`, ay - HAT_TOP[i] * s - 2];
}

const shadow = (cx: number, y: number, rx: number) =>
  `<ellipse cx='${cx}' cy='${y}' rx='${rx}' ry='3.5' fill='#000' opacity='.13'/>`;

const stud = (cx: number, cy: number, c: Pair) => {
  const t = cy - 6;
  return `<path d='M${cx - 8} ${t}V${cy}A8 4 0 0 0 ${cx + 8} ${cy}V${t}Z' fill='${mix(c[0], c[1], 0.6)}'/><ellipse cx='${cx}' cy='${t}' rx='8' ry='4' fill='${mix(c[0], '#ffffff', 0.32)}'/>`;
};

const wrap = (vb: string, z: number, body: string) =>
  `<svg class='bt' viewBox='${vb}' width='${z}' height='${z}' aria-hidden='true'>${body}</svg>`;

function brick(s: Brick, c: Pair, z: number, h: number, g: number): string {
  const gr = s.r.map((r) => [...r].map((ch) => (ch === '.' ? 0 : +ch)));
  const R = gr.length,
    W = gr[0].length,
    tp = Math.max(...gr.flat());
  const has = (x: number, y: number) => !!(gr[y] && gr[y][x] > 0),
    yg = (r: number) => (r + 1) * D;
  const top = mix(c[0], '#ffffff', 0.22),
    cols = new Set<number>();
  let o = '',
    minY = 1e9,
    maxY = 0,
    sx = 0,
    sy = 0,
    n = 0;
  for (let r = 0; r < R; r++)
    for (let k = 0; k < W; k++) {
      const v = gr[r][k];
      if (!v) continue;
      const H = v * U,
        y = yg(r),
        x = k * P,
        L = has(k - 1, r),
        Rt = has(k + 1, r),
        B = has(k, r - 1);
      const w = P + (Rt ? 0.6 : 0),
        e = B ? 0.6 : 0;
      o += `<path d='${rr(x, y - H - D - e, w, D + e, 5, !L && !B, !Rt && !B, false, false)}' fill='${top}'/>`;
      o += `<path d='${rr(x, y - H, w, H, 5, false, false, !Rt, !L)}' fill='${c[1]}'/><path d='${rr(x, y - H, w, H - 5, 5, false, false, false, false)}' fill='${c[0]}'/>`;
      if (!L)
        o += `<rect x='${x + 4}' y='${y - H + 4}' width='${Math.min(12, P - 8)}' height='3' rx='1.5' fill='#fff' opacity='.3'/>`;
      minY = Math.min(minY, y - H - D);
      if (!s.n) {
        o += stud(x + P / 2, y - H - D / 2, c);
        minY = Math.min(minY, y - H - D / 2 - 10);
      }
      if (v === tp) {
        sx += x + P / 2;
        sy += y - H - D / 2;
        n++;
        cols.add(k);
      }
      maxY = Math.max(maxY, y);
    }
  const hh = hatSvg(h, c, sx / n, sy / n, Math.max(24, Math.min(46, cols.size * P * 0.85)));
  minY = Math.min(minY, hh[1]);
  const [fx, fr, fs] = s.f,
    fh = gr[fr][Math.min(Math.floor(fx), W - 1)] * U;
  o += hh[0] + eyes(fx * P, yg(fr) - fh / 2 - 2, fs, g, c);
  return wrap(`-2 ${minY - 2} ${W * P + 4} ${maxY + 6 - minY}`, z, shadow((W * P) / 2, maxY + 1, (W * P) / 2) + o);
}

function tri(s: Solid, c: Pair, z: number, h: number, g: number): string {
  const W = s.c * P,
    dp = (s.d || 1) * D,
    H = s.h * U,
    cx = W / 2,
    pyr = s.t === 'y';
  const ya = pyr ? -H - dp / 2 : -H,
    Ht = -ya,
    xl = (cx * 5) / Ht;
  const l = mix(c[0], '#ffffff', 0.3),
    r = mix(c[0], '#ffffff', 0.16);
  let o = pyr
    ? `<path d='M0 0L0 ${-dp}L${cx} ${ya}Z' fill='${l}'/><path d='M${W} 0L${W} ${-dp}L${cx} ${ya}Z' fill='${r}'/>`
    : `<path d='M0 0L${cx} ${ya}L${cx} ${ya - dp}L0 ${-dp}Z' fill='${l}'/><path d='M${W} 0L${cx} ${ya}L${cx} ${ya - dp}L${W} ${-dp}Z' fill='${r}'/>`;
  o += `<path d='M0 0L${cx} ${ya}L${W} 0Z' fill='${c[1]}'/><path d='M${xl} -5L${cx} ${ya}L${W - xl} -5Z' fill='${c[0]}'/>`;
  const hh = pyr ? hatSvg(h, c, cx, ya + 5, 20) : hatSvg(h, c, cx, ya - dp / 2 + 3, 24);
  const mn = Math.min(pyr ? ya : ya - dp, hh[1]);
  o += hh[0] + eyes(cx, -Ht * 0.36, s.s, g, c);
  return wrap(`-2 ${mn - 2} ${W + 4} ${-mn + 8}`, z, shadow(cx, 1, W / 2) + o);
}

function cyl(s: Solid, c: Pair, z: number, h: number, g: number): string {
  const W = s.c * P,
    R = W / 2,
    H = s.h * U,
    ty = -H - D;
  let o = `<path d='M0 ${ty}V-${D}A${R} ${D} 0 0 0 ${W} -${D}V${ty}Z' fill='${c[1]}'/><path d='M0 ${ty}V-${D + 5}A${R} ${D} 0 0 0 ${W} -${D + 5}V${ty}Z' fill='${c[0]}'/>`;
  o +=
    `<rect x='6' y='${ty + 8}' width='4' height='${H - 14}' rx='2' fill='#fff' opacity='.25'/><ellipse cx='${R}' cy='${ty}' rx='${R}' ry='${D}' fill='${mix(c[0], '#ffffff', 0.22)}'/>` +
    stud(R, ty, c);
  const hh = hatSvg(h, c, R, ty, Math.min(46, R * 1.4)),
    mn = Math.min(-H - 30, hh[1]);
  o += hh[0] + eyes(R, -H / 2 - 1, s.s, g, c);
  return wrap(`-2 ${mn} ${W + 4} ${-mn + 6}`, z, shadow(R, 1, R) + o);
}

const renderCache = new Map<string, string>();

/** Main entry: returns an SVG string for a bot at the given pixel size. */
export function renderBot({ shape, color, hat, glasses }: BotConfig, size = 48): string {
  const sIndex = shape >= 0 && shape < SHAPES.length ? shape : 1;
  const cIndex = color >= 0 && color < COLORS.length ? color : 7;
  const hIndex = hat >= 0 && hat < HAT_NAMES.length ? hat : 0;
  const gIndex = glasses >= 0 && glasses < GLASSES_NAMES.length ? glasses : 0;

  const key = `${sIndex}.${cIndex}.${hIndex}.${gIndex}@${size}`;
  const cached = renderCache.get(key);
  if (cached) return cached;

  const s = SHAPES[sIndex] ?? SHAPES[1];
  const c = COLORS[cIndex] ?? COLORS[7];
  let res: string;
  if ('t' in s) {
    res = s.t === 'c' ? cyl(s, c, size, hIndex, gIndex) : tri(s, c, size, hIndex, gIndex);
  } else {
    res = brick(s, c, size, hIndex, gIndex);
  }
  renderCache.set(key, res);
  return res;
}

function applyLook(s: SVGSVGElement, dx: number, dy: number) {
  const ey = s.querySelector<SVGGElement>('.ey');
  if (ey) ey.style.transform = `translate(${dx * 3.5}px,${dy * 2.5}px)`;
  s.style.transform = `translate(${dx * 2}px,${dy * 1.5}px) rotate(${dx * 5}deg)`;
}

/** Eyes and body follow the pointer on avatars with class 'bt'. Returns a cleanup function. */
export function attachMouseFollow(root: ParentNode = document): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};
  let mx: number | null = null,
    my = 0,
    raf = 0;
  const query = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const reduced = !query || query.matches;
  if (reduced) return () => {};

  const look = () => {
    raf = 0;
    const avatars = Array.from(root.querySelectorAll<SVGSVGElement>('svg.bt'));
    if (mx == null) {
      for (const s of avatars) applyLook(s, 0, 0);
      return;
    }
    let nearest: SVGSVGElement | null = null;
    let best = Infinity;
    let nearA = 0;
    let nearB = 0;
    for (const s of avatars) {
      const r = s.getBoundingClientRect();
      const a = mx - (r.left + r.width / 2);
      const b = my - (r.top + r.height / 2);
      const d = Math.hypot(a, b);
      if (d < best) {
        best = d;
        nearest = s;
        nearA = a;
        nearB = b;
      }
    }
    for (const s of avatars) {
      if (s !== nearest) {
        applyLook(s, 0, 0);
        continue;
      }
      const d = best || 1;
      const k = Math.min(1, d / 100);
      applyLook(s, (nearA / d) * k, (nearB / d) * k);
    }
  };

  const move = (e: MouseEvent) => {
    mx = e.clientX;
    my = e.clientY;
    if (!raf) raf = requestAnimationFrame(look);
  };
  const leave = () => {
    mx = null;
    look();
  };

  document.addEventListener('mousemove', move);
  document.documentElement.addEventListener('mouseleave', leave);
  return () => {
    document.removeEventListener('mousemove', move);
    document.documentElement.removeEventListener('mouseleave', leave);
    if (raf) cancelAnimationFrame(raf);
  };
}
