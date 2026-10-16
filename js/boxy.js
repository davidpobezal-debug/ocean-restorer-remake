// Boxy low-poly models in the style of the original V2.2.2 renderer: boxes, gems and
// coarse ellipsoids with flat vertex colours. Builders return BufferGeometry so they can be
// merged, instanced or swapped for GLB models later.
import * as THREE from 'three';

export class Builder {
  constructor() { this.p = []; this.c = []; }
  tri(a, b, c, col) { this.p.push(...a, ...b, ...c); for (let i = 0; i < 3; i++) this.c.push(col[0], col[1], col[2]); }
  quad(a, b, c, d, col) { this.tri(a, b, c, col); this.tri(a, c, d, col); }
  // Axis-aligned box standing on y, rotated by yaw/pitch/roll around its base centre.
  box(x, y, z, sx, sy, sz, col, yaw = 0, pitch = 0, roll = 0) {
    const ca = Math.cos(yaw), sa = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
    const P = (a, b, d) => { const ax = a * cr - b * sr, by = a * sr + b * cr, yy = by * cp - d * sp, zz = by * sp + d * cp; return [x + ax * ca + zz * sa, y + yy, z - ax * sa + zz * ca]; };
    const a = sx / 2, b = sz / 2;
    this.quad(P(-a, 0, -b), P(-a, sy, -b), P(a, sy, -b), P(a, 0, -b), col); this.quad(P(a, 0, b), P(a, sy, b), P(-a, sy, b), P(-a, 0, b), col);
    this.quad(P(-a, 0, b), P(-a, sy, b), P(-a, sy, -b), P(-a, 0, -b), col); this.quad(P(a, 0, -b), P(a, sy, -b), P(a, sy, b), P(a, 0, b), col);
    this.quad(P(-a, sy, -b), P(-a, sy, b), P(a, sy, b), P(a, sy, -b), col); this.quad(P(-a, 0, b), P(-a, 0, -b), P(a, 0, -b), P(a, 0, b), col);
  }
  ellipsoid(x, y, z, rx, ry, rz, col, yaw = 0, n = 8, k = 4) {
    const ca = Math.cos(yaw), sa = Math.sin(yaw), P = (u, v) => { const ax = Math.cos(v) * Math.cos(u) * rx, zz = Math.cos(v) * Math.sin(u) * rz; return [x + ax * ca + zz * sa, y + Math.sin(v) * ry, z - ax * sa + zz * ca]; };
    for (let j = 0; j < k; j++) for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, b = (i + 1) / n * Math.PI * 2, v = -Math.PI / 2 + j / k * Math.PI, w = -Math.PI / 2 + (j + 1) / k * Math.PI; this.quad(P(a, v), P(a, w), P(b, w), P(b, v), col); }
  }
  gem(x, y, z, r, h, col, n = 5) {
    const top = [x, y + h, z], bot = [x, y, z];
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, b = (i + 1) / n * Math.PI * 2, A = [x + Math.cos(a) * r, y + h * .4, z + Math.sin(a) * r], B = [x + Math.cos(b) * r, y + h * .4, z + Math.sin(b) * r]; this.tri(A, top, B, col); this.tri(bot, A, B, col); }
  }
  disc(x, y, z, r, col, n = 12) { for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, b = (i + 1) / n * Math.PI * 2; this.tri([x, y, z], [x + Math.cos(b) * r, y, z + Math.sin(b) * r], [x + Math.cos(a) * r, y, z + Math.sin(a) * r], col); } }
  ring(x, y, z, r, w, col, n = 20) { for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, b = (i + 1) / n * Math.PI * 2; this.quad([x + Math.cos(a) * r, y, z + Math.sin(a) * r], [x + Math.cos(b) * r, y, z + Math.sin(b) * r], [x + Math.cos(b) * (r + w), y, z + Math.sin(b) * (r + w)], [x + Math.cos(a) * (r + w), y, z + Math.sin(a) * (r + w)], col); } }
  geometry() {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    // Colours are authored in display (sRGB) space like the original; convert for the linear pipeline.
    const lin = this.c.map(v => v < .04045 ? v * .0773993808 : Math.pow(v * .9478672986 + .0521327014, 2.4)); g.setAttribute('color', new THREE.Float32BufferAttribute(lin, 3));
    g.computeVertexNormals(); g.computeBoundingSphere(); return g;
  }
}

const hex = h => [(h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255];
export const GOLD = [1, .82, .32], GOLD_DARK = [.86, .58, .16], EYE = [1, .98, .89], PUPIL = [.035, .14, .2];

// Cartoon eyes: cream sclera, dark pupil, tiny highlight. f = local→world point mapper.
function eyes(m, f, x, y, z, s, gold = false) {
  for (const side of [-1, 1]) {
    const e = f(side * x, y, z), p = f(side * (x + s * .35), y + s * .05, z + s * .45), h = f(side * (x + s * .2), y + s * .45, z + s * .7);
    m.ellipsoid(...e, s, s * 1.1, s, gold ? [1, .9, .55] : EYE, 0, 6, 3);
    m.ellipsoid(...p, s * .55, s * .65, s * .55, PUPIL, 0, 6, 3);
    m.box(h[0], h[1], h[2], s * .25, s * .25, s * .25, [1, 1, 1]);
  }
}
const mapper = (x, y, z, size, yaw) => { const ca = Math.cos(yaw), sa = Math.sin(yaw); return (a, b, c) => [x + (a * ca + c * sa) * size, y + b * size, z + (-a * sa + c * ca) * size]; };

// ---------- Diver (original proportions: chunky suit, big helmet, cyan visor, fins) ----------
export function diverGeometry({ suit = [.98, .62, .16], helmet = [1, .8, .34], visor = [.16, .82, .95], dark = [.07, .23, .31], fin = [.1, .7, .72], kick = 0, arm = 0 } = {}) {
  const m = new Builder();
  const part = (x, y, z, sx, sy, sz, col, pitch = 0) => m.box(x, y, z, sx, sy, sz, col, 0, pitch);
  part(-.18, .22, -.08, .21, .44, .24, dark, kick); part(.18, .22, -.08, .21, .44, .24, dark, -kick);
  part(-.18, .1, -.3, .27, .07, .58, fin, kick); part(.18, .1, -.3, .27, .07, .58, fin, -kick);
  part(0, .62, 0, .62, .56, .4, suit); part(0, .74, -.3, .42, .56, .24, [.12, .5, .6]);
  part(0, .76, -.44, .1, .5, .1, [.85, .95, .98]);
  part(0, 1.16, .02, .66, .46, .58, helmet); part(0, 1.24, .32, .52, .24, .08, visor); part(.16, 1.38, .37, .1, .07, .02, [.85, 1, 1]);
  part(0, 1.62, .02, .1, .1, .1, [1, .95, .55]);
  part(-.38, .72, .14, .17, .34, .22, dark, .22 + arm); part(.38, .72, .18, .17, .34, .22, dark, .35 - arm);
  part(0, .58, .2, .64, .08, .02, [1, .9, .45]);
  return m.geometry();
}
export function nozzleGeometry() { const m = new Builder(); m.box(0, 0, 0, .56, .13, .26, [.43, .95, .85]); m.box(0, .02, -.25, .12, .12, .3, [.12, .44, .5]); m.box(0, .13, 0, .18, .05, .12, [1, .85, .3]); return m.geometry(); }

// ---------- Fish buddies & ambient fish (gold trim for friends) ----------
export function fishGeometry(kind = 'clown', color = [1, .56, .22], { friend = false, t = 0 } = {}) {
  const m = new Builder(), f = mapper(0, 0, 0, 1, 0), ell = (a, b, c, rx, ry, rz, col) => m.ellipsoid(...f(a, b, c), rx, ry, rz, col, 0, 8, 4);
  const wag = Math.sin(t * 6) * .15, finCol = friend ? GOLD : kind === 'tang' ? [1, .8, .25] : color;
  if (kind === 'ray') {
    ell(0, 0, 0, .42, .13, .5, color); m.tri(f(-.15, .02, .28), f(-1, Math.sin(t * 4) * .15, -.1), f(-.2, 0, -.45), color); m.tri(f(.15, .02, .28), f(.2, 0, -.45), f(1, Math.sin(t * 4) * .15, -.1), color);
    m.tri(f(-.05, 0, -.35), f(.05, 0, -.35), f(wag, -.04, -1.2), finCol);
  } else if (kind === 'turtle') {
    ell(0, .02, -.05, .43, .24, .53, [.2, .62, .4]); ell(0, .02, .51, .2, .14, .25, color); m.gem(...f(0, .16, -.05), .19, .21, friend ? GOLD : [.72, .9, .47]);
    for (const s of [-1, 1]) for (const fr of [-1, 1]) m.box(...f(s * .43, -.05, fr * .28), .37, .07, .22, color, s * (.4 + Math.sin(t * 3 + fr) * .2));
  } else {
    const tall = kind === 'tang' ? .34 : .26; ell(0, 0, 0, .27, tall, .56, color);
    if (kind === 'clown') for (const zz of [-.22, .16]) ell(0, 0, zz, .275, tall * .95, .04, [1, .95, .8]);
    if (kind === 'dolphin') ell(0, -.01, .61, .13, .1, .3, color);
    m.tri(f(0, .15, -.3), f(0, .52, -.1), f(0, .15, .18), finCol); m.tri(f(0, .15, -.3), f(0, .15, .18), f(0, .52, -.1), finCol);
    m.tri(f(0, 0, -.45), f(-.29, 0, -.82 + wag), f(.29, 0, -.82 - wag), finCol); m.tri(f(0, 0, -.45), f(.29, 0, -.82 - wag), f(-.29, 0, -.82 + wag), finCol);
    for (const s of [-1, 1]) m.tri(f(s * .13, 0, .17), f(s * .48, Math.sin(t * 7) * .04, -.06), f(s * .15, -.07, -.16), finCol);
  }
  const eyeZ = kind === 'turtle' ? .66 : .36, eyeX = kind === 'turtle' ? .12 : .22, eyeY = kind === 'ray' ? .09 : .1;
  eyes(m, f, eyeX, eyeY, eyeZ, .085, friend);
  return m.geometry();
}
// Gold halo + gem that marks a companion.
export function friendMarkGeometry(r = .45) { const m = new Builder(); m.ring(0, .04, 0, r, .05, GOLD, 18); m.gem(0, 0, 0, .06, .14, GOLD); return m.geometry(); }

// ---------- Playful shark: round snout, big eyes, grin, pink cheeks ----------
export function sharkGeometry({ top = [.36, .58, .8], belly = [.9, .96, .97], t = 0, angry = false } = {}) {
  const m = new Builder(), f = mapper(0, 0, 0, 1, 0);
  m.box(...f(0, 0, -.1), .7, .44, 1.5, top); m.box(...f(0, .02, .7), .6, .38, .5, top); m.box(...f(0, .04, 1.02), .44, .3, .18, top);
  m.box(...f(0, -.01, .2), .56, .08, 1.6, belly);
  m.box(...f(0, .07, 1.08), .34, .05, .06, [.95, .35, .45]); for (let i = -2; i <= 2; i++) m.box(...f(i * .06, .1, 1.1), .035, .05, .03, [1, 1, 1]);
  for (const s of [-1, 1]) { m.box(...f(s * .29, .14, .9), .05, .08, .14, [1, .55, .65]); for (let g = 0; g < 3; g++) m.box(...f(s * .36, .16, .45 - g * .1), .02, .2, .03, [.25, .42, .6]); }
  m.tri(f(0, .44, -.3), f(0, .95, -.05), f(0, .44, .35), top); m.tri(f(0, .44, -.3), f(0, .44, .35), f(0, .95, -.05), top);
  for (const s of [-1, 1]) { m.tri(f(s * .3, .1, .3), f(s * .95, .02, -.15), f(s * .3, .1, -.15), top); m.tri(f(s * .3, .1, .3), f(s * .3, .1, -.15), f(s * .95, .02, -.15), top); }
  const wag = Math.sin(t * 7) * .25;
  m.tri(f(0, .2, -.85), f(wag, .85, -1.45), f(wag, -.2, -1.45), top); m.tri(f(0, .2, -.85), f(wag, -.2, -1.45), f(wag, .85, -1.45), top);
  eyes(m, f, .2, .34, .86, .11);
  if (angry) for (const s of [-1, 1]) m.box(...f(s * .2, .5, .92), .2, .04, .05, PUPIL, 0, 0, s * .4);
  return m.geometry();
}

// ---------- Corals and reef props (original vocabulary: stacked boxes + gems) ----------
export function coralGeometries() {
  const W = [1, 1, 1], out = [];
  { const m = new Builder(); m.box(0, 0, 0, .13, .62, .13, W); m.box(.18, .2, 0, .13, .3, .13, W); m.box(-.15, .1, .05, .11, .4, .11, W); m.gem(-.19, 0, .13, .13, .4, W); out.push(m.geometry()); }
  { const m = new Builder(); m.gem(0, 0, 0, .19, .9, W); m.gem(.25, 0, -.1, .09, .5, W); m.gem(-.2, 0, .12, .1, .45, W); out.push(m.geometry()); }
  { const m = new Builder(); m.ellipsoid(0, .05, 0, .38, .28, .38, W, 0, 7, 3); out.push(m.geometry()); }
  { const m = new Builder(); for (let i = 0; i < 5; i++) { const a = i * 1.26, d = i ? .17 : 0; m.box(Math.cos(a) * d, 0, Math.sin(a) * d, .12, .3 + (i % 3) * .14, .12, W); } out.push(m.geometry()); }
  { const m = new Builder(); m.box(0, 0, 0, .1, .36, .1, W); m.box(0, .36, 0, .7, .08, .5, W, .4); out.push(m.geometry()); }
  { const m = new Builder(); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; m.box(Math.cos(a) * .14, .01, Math.sin(a) * .14, .1, .06, .3, W, -a + Math.PI / 2); } m.box(0, .01, 0, .16, .07, .16, W); out.push(m.geometry()); }
  return out;
}
export function archGeometry(col = hex(0x2b7b8a)) {
  const m = new Builder(), N = 9;
  for (let i = 0; i <= N; i++) { const a = i / N * Math.PI, x = Math.cos(a) * 2, y = Math.sin(a) * 1.7, shade = .85 + (i % 2) * .15; m.box(x, y, 0, .7, .62, .75, col.map(v => v * shade), 0, 0, a - Math.PI / 2); }
  for (const x of [-2, 2]) m.box(x, -.02, 0, 1, .25, 1, col.map(v => v * .7));
  m.gem(0, 1.95, 0, .18, .45, [1, .55, .75]); m.gem(-1.1, 1.6, .2, .12, .35, [.55, .45, 1]);
  return m.geometry();
}
