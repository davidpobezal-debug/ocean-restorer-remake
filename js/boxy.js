// V3 models in the style of the original game (ocean-restorer-6 renderer): boxes, gems and coarse
// faceted ellipsoids with flat vertex colours. Every model is a THREE.Group of a few meshes; moving
// parts (fins, tails, legs, arms) sit on pivot groups and `userData.tick(t, speed)` animates them by
// rotation only, so nothing is rebuilt per frame.
import * as THREE from 'three';
import { mats as RM, initMaterials, blobShadow, textTexture } from './models.js';

const _v = new THREE.Vector3();
const hsh = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
const TAU = Math.PI * 2;

export class Builder {
  constructor() { this.p = []; this.c = []; this.T = null; }
  // col: [r,g,b] in sRGB, or fn(cx,cy,cz) of the face centre in the current local frame.
  tri(a, b, c, col) {
    if (typeof col === 'function') col = col((a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3);
    if (this.T) { a = this.T(a); b = this.T(b); c = this.T(c); }
    this.p.push(...a, ...b, ...c); for (let i = 0; i < 3; i++) this.c.push(col[0], col[1], col[2]);
  }
  quad(a, b, c, d, col) {
    if (typeof col === 'function') { const k = col((a[0] + b[0] + c[0] + d[0]) / 4, (a[1] + b[1] + c[1] + d[1]) / 4, (a[2] + b[2] + c[2] + d[2]) / 4); col = k; }
    this.tri(a, b, c, col); this.tri(a, c, d, col);
  }
  // Run fn with a local frame (position, euler rotation, scale); frames nest.
  at(pos, rot, s, fn) {
    const M = new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), typeof s === 'number' ? new THREE.Vector3(s, s, s) : new THREE.Vector3(...s));
    const prev = this.T; this.T = p => { _v.set(p[0], p[1], p[2]).applyMatrix4(M); const q = [_v.x, _v.y, _v.z]; return prev ? prev(q) : q; };
    fn(); this.T = prev; return this;
  }
  // Box standing on y, rotated by yaw/pitch/roll around its base centre.
  box(x, y, z, sx, sy, sz, col, yaw = 0, pitch = 0, roll = 0) {
    const ca = Math.cos(yaw), sa = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
    const P = (a, b, d) => { const ax = a * cr - b * sr, by = a * sr + b * cr, yy = by * cp - d * sp, zz = by * sp + d * cp; return [x + ax * ca + zz * sa, y + yy, z - ax * sa + zz * ca]; };
    const a = sx / 2, b = sz / 2;
    this.quad(P(-a, 0, -b), P(-a, sy, -b), P(a, sy, -b), P(a, 0, -b), col); this.quad(P(a, 0, b), P(a, sy, b), P(-a, sy, b), P(-a, 0, b), col);
    this.quad(P(-a, 0, b), P(-a, sy, b), P(-a, sy, -b), P(-a, 0, -b), col); this.quad(P(a, 0, -b), P(a, sy, -b), P(a, sy, b), P(a, 0, b), col);
    this.quad(P(-a, sy, -b), P(-a, sy, b), P(a, sy, b), P(a, sy, -b), col); this.quad(P(-a, 0, b), P(-a, 0, -b), P(a, 0, -b), P(a, 0, b), col);
  }
  cube(x, y, z, sx, sy, sz, col, yaw = 0, pitch = 0, roll = 0) { this.box(x, y - sy / 2, z, sx, sy, sz, col, yaw, pitch, roll); }
  // Faceted ellipsoid; jit roughens it (rocks, bags) without opening gaps; half = upper dome only.
  ellipsoid(x, y, z, rx, ry, rz, col, yaw = 0, n = 8, k = 4, { jit = 0, seed = 1, half = false } = {}) {
    const ca = Math.cos(yaw), sa = Math.sin(yaw);
    const V = (i, j) => {
      const u = i / n * TAU, v = -Math.PI / 2 + j / k * Math.PI, pole = j === 0 || j === k, ii = pole ? 0 : i % n, f = 1 + (hsh(ii + seed, j + seed * 3) - .5) * 2 * jit;
      const ax = Math.cos(v) * Math.cos(u) * rx * f, zz = Math.cos(v) * Math.sin(u) * rz * f; return [x + ax * ca + zz * sa, y + Math.sin(v) * ry * (pole ? 1 : f), z - ax * sa + zz * ca];
    };
    for (let j = half ? k / 2 : 0; j < k; j++) for (let i = 0; i < n; i++) this.quad(V(i, j), V(i, j + 1), V(i + 1, j + 1), V(i + 1, j), col);
    if (half) for (let i = 0; i < n; i++) this.tri([x, y, z], V(i + 1, k / 2), V(i, k / 2), col);
  }
  gem(x, y, z, r, h, col, n = 5) {
    const top = [x, y + h, z], bot = [x, y, z];
    for (let i = 0; i < n; i++) { const a = i / n * TAU, b = (i + 1) / n * TAU, A = [x + Math.cos(a) * r, y + h * .4, z + Math.sin(a) * r], B = [x + Math.cos(b) * r, y + h * .4, z + Math.sin(b) * r]; this.tri(A, top, B, col); this.tri(bot, A, B, col); }
  }
  // n-sided column from y to y+h, radius r at the bottom and r2 at the top.
  prism(x, y, z, r, h, n, col, r2 = r, caps = true) {
    for (let i = 0; i < n; i++) {
      const a = (i + .5) / n * TAU, b = (i + 1.5) / n * TAU, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
      this.quad([x + ca * r, y, z + sa * r], [x + ca * r2, y + h, z + sa * r2], [x + cb * r2, y + h, z + sb * r2], [x + cb * r, y, z + sb * r], col);
      if (caps) { this.tri([x, y + h, z], [x + cb * r2, y + h, z + sb * r2], [x + ca * r2, y + h, z + sa * r2], col); this.tri([x, y, z], [x + ca * r, y, z + sa * r], [x + cb * r, y, z + sb * r], col); }
    }
  }
  // Torus lying in XZ; arc < 2π gives an open loop (handles).
  torus(x, y, z, R, r, nu, nv, col, arc = TAU) {
    const P = (i, j) => { const u = i / nu * arc, v = j / nv * TAU, d = R + r * Math.cos(v); return [x + d * Math.cos(u), y + r * Math.sin(v), z + d * Math.sin(u)]; };
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) this.quad(P(i, j), P(i, j + 1), P(i + 1, j + 1), P(i + 1, j), col);
  }
  // Tube along a path in the XY plane; neighbouring rings share vertices, so the surface is closed.
  sweep(path, rad, sides, col, { jit = 0, seed = 1 } = {}) {
    const rings = path.map((c, i) => {
      const a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)], tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1, nx = ty / l, ny = -tx / l, [rn, rz] = rad(i / (path.length - 1));
      return Array.from({ length: sides }, (_, j) => { const th = (j + .5) / sides * TAU, f = 1 + (hsh(i + seed, j) - .5) * 2 * jit; return [c[0] + nx * Math.cos(th) * rn * f, c[1] + ny * Math.cos(th) * rn * f, c[2] + Math.sin(th) * rz * f]; });
    });
    for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < sides; j++) this.quad(rings[i][j], rings[i + 1][j], rings[i + 1][(j + 1) % sides], rings[i][(j + 1) % sides], col);
    for (const [ring, c] of [[rings[0], path[0]], [rings[rings.length - 1], path[path.length - 1]]]) for (let j = 0; j < sides; j++) this.tri(c, ring[j], ring[(j + 1) % sides], col);
  }
  // Body of n-gon sections along z: [z, halfWidth, halfHeight, centreY]; flat top and belly.
  loft(sec, n, col) {
    const rings = sec.map(([z, w, h, y]) => Array.from({ length: n }, (_, j) => { const a = j / n * TAU; return [Math.cos(a) * w, y + Math.sin(a) * h, z]; }));
    for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < n; j++) this.quad(rings[i][j], rings[i][(j + 1) % n], rings[i + 1][(j + 1) % n], rings[i + 1][j], col);
    for (const [k, [z, , , y]] of [[0, sec[0]], [rings.length - 1, sec[sec.length - 1]]]) for (let j = 0; j < n; j++) this.tri([0, y, z], rings[k][j], rings[k][(j + 1) % n], col);
  }
  disc(x, y, z, r, col, n = 12) { for (let i = 0; i < n; i++) { const a = i / n * TAU, b = (i + 1) / n * TAU; this.tri([x, y, z], [x + Math.cos(b) * r, y, z + Math.sin(b) * r], [x + Math.cos(a) * r, y, z + Math.sin(a) * r], col); } }
  ring(x, y, z, r, w, col, n = 20) { for (let i = 0; i < n; i++) { const a = i / n * TAU, b = (i + 1) / n * TAU; this.quad([x + Math.cos(a) * r, y, z + Math.sin(a) * r], [x + Math.cos(b) * r, y, z + Math.sin(b) * r], [x + Math.cos(b) * (r + w), y, z + Math.sin(b) * (r + w)], [x + Math.cos(a) * (r + w), y, z + Math.sin(a) * (r + w)], col); } }
  geometry() {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    // Colours are authored in display (sRGB) space like the original; convert for the linear pipeline.
    const lin = this.c.map(v => v < .04045 ? v * .0773993808 : Math.pow(v * .9478672986 + .0521327014, 2.4)); g.setAttribute('color', new THREE.Float32BufferAttribute(lin, 3));
    g.computeVertexNormals(); g.computeBoundingSphere(); return g;
  }
}

// ---------- Shared materials ----------
export const LOOK = {};
function mat() {
  if (LOOK.solid) return LOOK;
  if (!RM.glowSprite) initMaterials();
  LOOK.solid = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });
  LOOK.glow = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, emissive: 0x5a3cff, emissiveIntensity: .55 });
  LOOK.jelly = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, transparent: true, opacity: .78, emissive: 0xb0306f, emissiveIntensity: .45, side: THREE.DoubleSide, depthWrite: false });
  LOOK.glass = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, transparent: true, opacity: .55, emissive: 0x2b8fb0, emissiveIntensity: .5, depthWrite: false });
  return LOOK;
}
const mesh = (b, m) => new THREE.Mesh(b.geometry(), m || mat().solid);
const pivot = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
const shade = (c, k) => c.map(v => Math.min(1, v * k));
export const materials = mat;
// Soft additive halo, used to make pickups (O₂, pearls, treasure) and lights glow.
function glow(col, s, o = .75) { mat(); const sp = new THREE.Sprite(RM.glowSprite.clone()); sp.material.color.setRGB(col[0], col[1], col[2], THREE.SRGBColorSpace); sp.material.opacity = o; sp.scale.setScalar(s); return sp; }

export const GOLD = [1, .82, .26], EYE = [1, .98, .9], PUPIL = [.035, .12, .18];

// Cartoon eyes on both sides: cream sclera, dark pupil, white glint.
function eyes(m, x, y, z, s) {
  for (const side of [-1, 1]) {
    m.ellipsoid(side * x, y, z, s, s * 1.1, s, EYE, 0, 6, 3);
    m.ellipsoid(side * (x + s * .4), y + s * .05, z + s * .4, s * .55, s * .65, s * .55, PUPIL, 0, 6, 3);
    m.cube(side * (x + s * .75), y + s * .4, z + s * .55, s * .28, s * .28, s * .28, [1, 1, 1]);
  }
}
// A buddy is marked like in the original: thin gold ring on the floor and a small gold gem above.
export function friendMark(r = .5) { const m = new Builder(); m.ring(0, 0, 0, r, .035, GOLD, 18); return mesh(m); }

// ---------- Diver: swims flat, head first, flutter-kicking fins ----------
export function diver({ suit = [1, .5, .1], helmet = [1, .82, .24], visor = [.25, .9, 1], wet = [.08, .28, .38], tank = [.14, .6, .74], fin = [.16, .86, .74], trim = [1, .92, .35], material } = {}) {
  const root = new THREE.Group(), body = pivot(root), m = new Builder();
  m.cube(0, 0, .04, .6, .36, .74, suit);
  m.cube(0, 0, -.3, .63, .39, .1, trim);
  m.cube(0, -.01, .2, .64, .2, .06, trim);
  m.at([0, .3, -.02], [Math.PI / 2, 0, 0], 1, () => { m.prism(0, -.34, 0, .15, .68, 8, tank); m.prism(0, -.36, 0, .16, .06, 8, shade(tank, .7)); });
  m.cube(0, .3, .38, .1, .1, .08, [.85, .9, .95]);
  m.cube(0, .06, .62, .56, .5, .46, helmet);
  m.cube(0, .09, .86, .42, .25, .03, visor); m.cube(.12, .16, .875, .09, .06, .01, [.92, 1, 1]);
  m.cube(0, .36, .66, .14, .08, .16, [1, .97, .7]);
  for (const s of [-1, 1]) m.at([s * .34, -.02, .32], [.5, 0, 0], 1, () => { m.cube(0, 0, .19, .16, .16, .4, wet); m.cube(0, 0, .43, .18, .16, .12, trim); });
  m.at([0, -.24, .7], [.9, 0, 0], 1, () => m.cube(0, 0, .18, .08, .08, .4, [.12, .44, .5]));
  const bodyMesh = mesh(m, material); body.add(bodyMesh);
  // Nozzle sits on its own pivot so the game can sweep it over the seabed.
  const nozzle = pivot(root, 0, -.52, .96), nz = new Builder(); nz.cube(0, 0, 0, .5, .1, .24, [.43, .95, .85]); nz.cube(0, .06, 0, .2, .04, .14, [1, .85, .3]); nozzle.add(mesh(nz));
  const legs = [-1, 1].map(s => {
    const p = pivot(body, s * .16, -.02, -.34), l = new Builder();
    l.cube(0, 0, -.26, .2, .2, .52, wet); l.cube(0, -.01, -.5, .22, .22, .06, trim);
    l.cube(0, -.03, -.76, .3, .05, .5, fin); l.cube(0, -.03, -1.02, .34, .05, .06, shade(fin, .75));
    p.add(mesh(l, material)); return p;
  });
  Object.assign(root.userData, { pivot: body, legs, bodyMesh, nozzle });
  root.userData.tick = (t, sp = 1) => {
    legs[0].rotation.x = Math.sin(t * 9 * sp) * .38; legs[1].rotation.x = -Math.sin(t * 9 * sp) * .38;
    body.rotation.z = Math.sin(t * 4.5 * sp) * .04; body.position.y = Math.sin(t * 3) * .05;
  };
  return root;
}

// ---------- Fish & sea animals (original creature vocabulary, rigged) ----------
// kind: clown | tang | ray | turtle | dolphin | seal | octopus | whale | fish
export const CREATURES = {
  clown: { color: [1, .55, .18] }, tang: { color: [.22, .62, 1] }, ray: { color: [.69, .55, .98] }, turtle: { color: [.45, .85, .5] },
  dolphin: { color: [.45, .72, .95] }, seal: { color: [.62, .67, .74] }, octopus: { color: [.96, .42, .62] }, whale: { color: [.3, .5, .9] },
};
export function creature(kind, { color = CREATURES[kind]?.color || [1, .6, .3], friend = false } = {}) {
  const root = new THREE.Group(), m = new Builder(), anim = [], fin = kind === 'tang' ? [1, .82, .25] : shade(color, 1.1);
  const flap = (p, axis, amp, f, ph = 0) => anim.push((t, sp) => { p.rotation[axis] = Math.sin(t * f * sp + ph) * amp; });
  const part = (x, y, z, build) => { const p = pivot(root, x, y, z), b = new Builder(); build(b); p.add(mesh(b)); return p; };
  if (kind === 'ray') {
    m.ellipsoid(0, 0, 0, .42, .13, .5, color); for (const [x, z] of [[.12, .1], [-.15, -.05], [.05, -.2], [-.02, .22]]) m.cube(x, .12, z, .06, .02, .06, shade(color, 1.35));
    eyes(m, .16, .1, .3, .07);
    for (const s of [-1, 1]) flap(part(s * .14, 0, 0, b => { b.tri([0, .02, .28], [s * .86, 0, -.12], [0, 0, -.45], color); b.tri([0, -.01, .28], [0, -.01, -.45], [s * .86, -.01, -.12], shade(color, .8)); }), 'z', .35 * s, 4);
    flap(part(0, 0, -.42, b => { b.tri([-.05, 0, 0], [.05, 0, 0], [0, -.03, -.8], fin); }), 'y', .3, 3);
  } else if (kind === 'turtle') {
    m.ellipsoid(0, .02, -.05, .43, .24, .53, (x, y, z) => (Math.floor(x * 4.5 + 9) + Math.floor(z * 4.5 + 9)) % 2 ? [.2, .58, .36] : [.3, .7, .42]);
    m.ellipsoid(0, -.02, -.05, .47, .07, .57, [.86, .8, .5]); m.gem(0, .16, -.05, .19, .21, [.72, .9, .47]);
    m.ellipsoid(0, .04, .55, .18, .15, .22, color); eyes(m, .1, .1, .66, .065);
    for (const s of [-1, 1]) for (const fr of [-1, 1]) flap(part(s * .38, -.03, fr * .26, b => b.cube(s * .16, 0, 0, .36, .07, .2, fr > 0 ? color : shade(color, .85))), 'y', .35 * s, 3, fr);
  } else if (kind === 'octopus') {
    m.ellipsoid(0, .62, -.05, .42, .5, .42, color); for (const [x, y, z] of [[.2, .95, -.2], [-.25, .85, -.25], [.05, 1.05, .05], [-.12, .7, -.4]]) m.ellipsoid(x, y, z, .06, .04, .06, shade(color, 1.25), 0, 5, 2);
    eyes(m, .17, .62, .32, .1); m.cube(0, .42, .38, .14, .05, .04, shade(color, .55));
    for (let i = 0; i < 8; i++) {
      const a = (i + .5) / 8 * TAU, base = pivot(root, Math.sin(a) * .26, .26, Math.cos(a) * .26); base.rotation.y = a;
      let p = base; for (let k = 0; k < 3; k++) { const seg = pivot(p, 0, 0, k ? .26 : 0), b = new Builder(); b.cube(0, -.02, .13, .13 - k * .03, .1 - k * .02, .28, k % 2 ? shade(color, .85) : color); seg.add(mesh(b)); seg.rotation.x = k ? -.35 : .45; const r0 = seg.rotation.x; anim.push((t, sp) => { seg.rotation.x = r0 + Math.sin(t * 3.5 * sp + i + k) * .22; }); p = seg; }
    }
  } else if (kind === 'whale') {
    m.ellipsoid(0, 0, 0, .62, .52, 1.25, (x, y, z) => y < -.22 ? (Math.floor(x * 9 + 20) % 2 ? [.92, .95, .98] : [.78, .86, .93]) : color, 0, 10, 5);
    m.cube(0, .5, .45, .12, .05, .12, shade(color, .5)); eyes(m, .5, .02, .78, .08);
    for (const s of [-1, 1]) flap(part(s * .5, -.2, .35, b => { b.tri([0, 0, .15], [s * .7, -.15, -.25], [0, 0, -.3], fin); }), 'z', .25 * s, 2);
    flap(part(0, .05, -1.15, b => { b.ellipsoid(0, 0, -.2, .2, .16, .35, color); b.tri([0, 0, -.35], [-.7, .05, -.75], [0, 0, -.55], fin); b.tri([0, 0, -.35], [0, 0, -.55], [.7, .05, -.75], fin); }), 'x', .3, 2.4);
  } else if (kind === 'seal') {
    m.ellipsoid(0, 0, 0, .34, .3, .62, (x, y) => y < -.1 ? [.88, .9, .92] : color);
    for (const [x, y, z] of [[.2, .18, -.1], [-.15, .22, -.3], [.05, .26, .15]]) m.cube(x, y, z, .07, .03, .07, shade(color, .75));
    m.ellipsoid(0, .14, .56, .26, .24, .26, color); m.ellipsoid(0, .06, .78, .15, .1, .1, [.9, .9, .9]); m.cube(0, .12, .87, .08, .05, .04, [.08, .08, .1]);
    for (const s of [-1, 1]) for (let w = 0; w < 2; w++) m.cube(s * .14, .06 + w * .04, .84, .14, .015, .015, [.25, .25, .28]);
    eyes(m, .13, .24, .74, .075);
    for (const s of [-1, 1]) flap(part(s * .3, -.12, .2, b => b.cube(s * .14, 0, -.05, .3, .06, .18, shade(color, .85))), 'z', .3 * s, 4);
    flap(part(0, 0, -.55, b => { for (const s of [-1, 1]) b.tri([0, 0, 0], [s * .32, 0, -.45], [s * .05, 0, -.42], shade(color, .8)); }), 'y', .3, 4);
  } else if (kind === 'dolphin') {
    m.ellipsoid(0, 0, 0, .26, .25, .72, (x, y) => y < -.07 ? [.88, .95, .97] : color); m.ellipsoid(0, -.05, .72, .1, .08, .22, color);
    m.cube(0, -.07, .74, .16, .02, .14, [.2, .25, .3]); eyes(m, .16, .06, .44, .065);
    m.tri([0, .2, -.15], [0, .58, -.38], [0, .2, .18], fin);
    for (const s of [-1, 1]) flap(part(s * .2, -.1, .2, b => b.tri([0, 0, .1], [s * .38, -.12, -.2], [0, 0, -.12], fin)), 'z', .2 * s, 3);
    flap(part(0, 0, -.66, b => { b.ellipsoid(0, 0, -.12, .1, .09, .2, color); b.tri([0, 0, -.2], [-.36, 0, -.48], [0, 0, -.36], fin); b.tri([0, 0, -.2], [0, 0, -.36], [.36, 0, -.48], fin); }), 'x', .35, 5);
  } else {
    const tall = kind === 'tang' ? .34 : .26;
    m.ellipsoid(0, 0, 0, .27, tall, .56, color);
    if (kind === 'clown') for (const z of [-.22, .16]) { m.ellipsoid(0, 0, z, .28, tall * .97, .045, [1, .96, .86]); }
    if (kind === 'tang') m.ellipsoid(0, .1, -.05, .275, tall * .5, .3, shade(color, .55));
    m.tri([0, .15, -.3], [0, .52, -.1], [0, .15, .18], fin);
    eyes(m, .2, .1, .34, .085);
    for (const s of [-1, 1]) flap(part(s * .14, -.02, .1, b => b.tri([0, 0, .07], [s * .34, .02, -.16], [0, -.05, -.26], fin)), 'y', .35 * s, 7);
    flap(part(0, 0, -.45, b => b.tri([0, 0, 0], [-.3, 0, -.38], [.3, 0, -.38], fin)), 'y', .35, 6);
  }
  root.add(mesh(m));
  if (friend) {
    const mark = friendMark(kind === 'whale' ? 1.1 : kind === 'octopus' ? .7 : .55); root.add(mark); root.userData.mark = mark;
    const g = new Builder(), top = { whale: .8, octopus: 1.3, turtle: .5, ray: .35 }[kind] ?? .55; g.gem(0, 0, 0, .06, .14, GOLD); const gem = mesh(g); gem.position.y = top; root.add(gem);
    anim.push(t => { gem.position.y = top + Math.sin(t * 2.5) * .04; gem.rotation.y = t * 1.5; });
  }
  root.userData.tick = (t, sp = 1) => { for (const a of anim) a(t, sp); };
  return root;
}

export function jelly(color = [1, .55, .85]) {
  const root = new THREE.Group(), bell = pivot(root, 0, 1.1, 0), m = new Builder(), L = mat();
  m.ellipsoid(0, 0, 0, .45, .4, .45, color, 0, 9, 4, { half: true }); m.ellipsoid(0, .05, 0, .2, .18, .2, [1, .9, .97], 0, 6, 4, { half: true });
  bell.add(mesh(m, L.jelly));
  const tents = [], tops = [];
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * TAU, p = pivot(bell, Math.cos(a) * .26, 0, Math.sin(a) * .26); let q = p; tops.push(p);
    for (let k = 0; k < 3; k++) { const s = pivot(q, 0, k ? -.26 : 0, 0), b = new Builder(); b.box(0, -.26, 0, .05, .26, .05, k % 2 ? [1, .8, .95] : color); s.add(mesh(b, L.jelly)); tents.push([s, i + k]); q = s; }
  }
  bell.add(glow([1, .45, .8], 1.8, .45)); Object.assign(root.userData, { bell, tent: tops });
  root.userData.tick = (t, sp = 1) => { const q = Math.sin(t * 3 * sp); bell.scale.set(1 + q * .08, 1 - q * .1, 1 + q * .08); bell.position.y = 1.1 + q * .08; for (const [s, ph] of tents) s.rotation.z = Math.sin(t * 2.5 + ph) * .2; };
  return root;
}

// ---------- Shark: chunky hexagonal body like the original, countershaded, cheeky grin ----------
export function shark({ top = [.36, .56, .78], belly = [.92, .97, .98], angry = false } = {}) {
  const root = new THREE.Group(), m = new Builder(), col = (x, y) => y < .15 ? belly : top;
  m.loft([[1.18, .06, .05, .2], [1.02, .24, .17, .22], [.62, .38, .27, .25], [.1, .42, .3, .26], [-.45, .3, .23, .26], [-.9, .11, .09, .26]], 6, col);
  m.cube(0, .1, .9, .3, .05, .16, [.55, .12, .2]); for (let i = -2; i <= 2; i++) m.cube(i * .055, .135, .97, .035, .045, .03, [1, 1, 1]);
  eyes(m, .2, .32, .8, .085);
  for (const s of [-1, 1]) { m.cube(s * .26, .2, .9, .04, .05, .1, [1, .6, .7]); for (let g = 0; g < 3; g++) m.cube(s * .39, .27, .42 - g * .1, .02, .16, .025, shade(top, .6)); }
  m.tri([0, .5, -.25], [0, 1.08, -.5], [0, .5, .32], top); m.tri([0, .5, -.25], [0, .5, .32], [0, 1.08, -.5], shade(top, .85));
  m.tri([0, .45, -.62], [0, .66, -.78], [0, .42, -.5], top);
  for (const s of [-1, 1]) m.tri([s * .36, .14, .4], [s * 1.0, .0, -.12], [s * .36, .14, .02], top);
  if (angry) for (const s of [-1, 1]) m.cube(s * .2, .46, .84, .19, .04, .05, PUPIL, 0, 0, s * .45);
  root.add(mesh(m));
  const tail = pivot(root, 0, .26, -.88), tb = new Builder();
  tb.tri([0, 0, .05], [0, .78, -.55], [0, .1, -.3], top); tb.tri([0, 0, .05], [0, -.42, -.42], [0, -.04, -.26], top);
  tail.add(mesh(tb));
  root.userData.tick = (t, sp = 1) => { tail.rotation.y = Math.sin(t * 7 * sp) * .38; };
  return root;
}

// ---------- Treasure chest (original: orange box, gold lid, floating gem, gold ring) ----------
export function chest() {
  const root = new THREE.Group(), m = new Builder(), wood = [.82, .5, .18];
  m.box(0, 0, 0, .7, .42, .5, (x, y, z) => Math.floor((x + 1) * 7) % 2 ? wood : shade(wood, .88));
  m.box(0, .42, 0, .74, .16, .54, GOLD); m.box(0, .58, 0, .6, .08, .44, shade(GOLD, .9));
  for (const x of [-.24, .24]) m.box(x, -.005, 0, .07, .6, .52, shade(GOLD, .85));
  m.box(0, .3, .25, .12, .16, .04, [.95, .95, .9]); m.box(0, .33, .27, .04, .06, .01, [.2, .15, .1]);
  m.ring(0, .02, 0, .82, .045, GOLD, 22);
  root.add(mesh(m));
  const g = new Builder(); g.gem(0, 0, 0, .15, .45, [.6, 1, .85], 6); const gem = mesh(g, mat().glow.clone()); gem.material.emissive.set(0x2a9070); gem.position.y = .95; root.add(gem);
  const halo = glow([.55, 1, .85], 1.4, .7), base = glow([1, .82, .3], 1.6, .35); base.position.y = .45; root.add(halo, base);
  root.userData.tick = t => { gem.position.y = .95 + Math.sin(t * 2) * .12; gem.rotation.y = t; halo.position.y = gem.position.y + .15; halo.material.opacity = .55 + Math.sin(t * 3) * .15; };
  return root;
}

// ---------- Trash: recognisable silhouettes ----------
export const TRASH_KINDS = ['bottle', 'can', 'bag', 'tire', 'barrel', 'boot', 'crate'];
export function trash(kind, { leak = true } = {}) {
  const m = new Builder();
  if (kind === 'bottle') m.at([0, .1, 0], [0, .5, Math.PI / 2], 1, () => {
    const g = [.3, .78, .45]; m.prism(0, -.2, 0, .1, .32, 8, g); m.prism(0, -.12, 0, .104, .13, 8, [.97, .93, .74], .104, false); m.prism(0, .12, 0, .1, .09, 8, g, .045); m.prism(0, .21, 0, .045, .08, 8, g); m.prism(0, .28, 0, .053, .05, 8, [.95, .95, .98]);
  });
  else if (kind === 'can') m.at([0, .085, 0], [0, -.4, Math.PI / 2], 1, () => {
    const sv = [.84, .87, .9]; m.prism(0, -.125, 0, .08, .025, 10, sv, .085); m.prism(0, -.1, 0, .085, .2, 10, [.92, .18, .26]); m.prism(0, -.02, 0, .087, .035, 10, [1, 1, 1]); m.prism(0, .1, 0, .085, .025, 10, sv, .078); m.cube(.03, .13, 0, .05, .01, .03, [.7, .72, .75]);
  });
  else if (kind === 'bag') {
    m.ellipsoid(0, .09, 0, .28, .12, .24, (x, y, z) => hsh(Math.floor(x * 20), Math.floor(z * 20)) > .5 ? [.95, .97, 1] : [.82, .9, .96], 0, 7, 4, { jit: .22, seed: 4 });
    for (const s of [-1, 1]) m.at([s * .1, .17, -.04], [-Math.PI / 2, 0, .35 * s], 1, () => m.torus(0, 0, 0, .11, .03, 7, 4, [.7, .85, .98], Math.PI));
  }
  else if (kind === 'tire') m.at([0, .2, 0], [.3, 0, 0], 1, () => {
    m.torus(0, 0, 0, .3, .13, 14, 6, (x, y, z) => { const out = Math.hypot(x, z) > .32, k = Math.floor((Math.atan2(z, x) + Math.PI) / TAU * 28); return out ? (k % 2 ? [.07, .07, .08] : [.3, .31, .34]) : [.17, .18, .2]; });
    m.prism(0, -.05, 0, .19, .1, 10, [.7, .74, .78], .19, false); m.prism(0, -.03, 0, .19, .06, 10, [.55, .6, .65]); m.prism(0, -.06, 0, .07, .13, 6, [.4, .45, .5]);
  });
  else if (kind === 'barrel') {
    const yl = [.98, .76, .14], dk = [.18, .18, .2]; m.prism(0, 0, 0, .26, .6, 10, yl); for (const y of [.12, .44]) m.prism(0, y, 0, .272, .06, 10, dk); m.prism(0, .6, 0, .26, .025, 10, dk, .24);
    m.prism(.08, .62, .06, .04, .04, 6, [.45, .48, .5]);
    for (const yaw of [0, Math.PI]) m.at([Math.sin(yaw) * .262, .31, Math.cos(yaw) * .262], [0, yaw, 0], 1, () => { m.tri([-.11, -.08, 0], [.11, -.08, 0], [0, .11, 0], [.1, .1, .1]); m.cube(0, .02, .004, .025, .08, .006, [.98, .76, .14]); m.cube(0, -.05, .004, .025, .022, .006, [.98, .76, .14]); });
    if (leak) m.disc(.35, .015, .22, .32, [.38, .82, .2], 9); if (leak) { m.disc(.5, .02, .05, .16, [.55, .95, .3], 7); m.ellipsoid(.12, .5, .3, .05, .05, .05, [.45, .9, .25], 0, 5, 2); }
  }
  else if (kind === 'boot') m.at([0, .12, 0], [0, .3, Math.PI / 2 - .2], 1, () => {
    const br = [.52, .32, .17]; m.cube(0, .22, -.08, .22, .36, .24, br); m.cube(0, .04, .08, .24, .14, .46, br); m.cube(0, -.04, .08, .26, .04, .48, [.2, .14, .1]);
    m.cube(0, .38, -.08, .24, .05, .26, shade(br, .8)); for (let i = 0; i < 3; i++) m.cube(0, .13 + i * .07, .05, .14, .02, .04, [.92, .88, .75]);
  });
  else if (kind === 'crate') {
    const c = [.2, .55, .98], d = shade(c, .78); m.cube(0, .02, 0, .52, .04, .4, d);
    for (const [x, z] of [[-.24, -.18], [.24, -.18], [-.24, .18], [.24, .18]]) m.box(x, 0, z, .05, .3, .05, c);
    for (const y of [.12, .27]) { m.cube(0, y, -.18, .5, .04, .03, c); m.cube(0, y, .18, .5, .04, .03, c); m.cube(-.24, y, 0, .03, .04, .38, c); m.cube(.24, y, 0, .03, .04, .38, c); }
    m.cube(0, .2, .19, .14, .05, .02, [1, 1, 1]);
  }
  const g = mesh(m); return g;
}

// ---------- Seabed décor ----------
export function coral(type, col) {
  const m = new Builder(), d = shade(col, .72), l = shade(col, 1.2);
  if (type === 'branch') { m.box(0, 0, 0, .13, .62, .13, col); m.box(.18, .2, 0, .13, .32, .13, col); m.box(-.15, .1, .05, .11, .42, .11, col); m.gem(-.19, 0, .13, .13, .42, l); m.cube(.18, .56, 0, .15, .06, .15, l); m.cube(0, .66, 0, .15, .06, .15, l); }
  else if (type === 'spike') { m.gem(0, 0, 0, .19, .95, col); m.gem(.25, 0, -.1, .09, .5, l); m.gem(-.2, 0, .12, .1, .45, d); m.disc(0, .02, 0, .28, d, 8); }
  else if (type === 'brain') m.ellipsoid(0, 0, 0, .4, .32, .4, (x, y, z) => Math.sin(x * 16 + Math.sin(z * 9) * 2) > 0 ? col : d, 0, 10, 4, { half: true });
  else if (type === 'tube') for (let i = 0; i < 6; i++) { const a = i * 1.05, r = i ? .16 : 0, h = .3 + (i * 7 % 4) * .1, x = Math.cos(a) * r, z = Math.sin(a) * r; m.prism(x, 0, z, .07, h, 6, col, .085); m.prism(x, h, z, .05, .005, 6, shade(col, .35)); }
  else if (type === 'table') { m.prism(0, 0, 0, .07, .38, 5, d); m.prism(0, .36, 0, .46, .06, 8, col, .5); m.prism(0, .42, 0, .3, .03, 8, l); }
  else if (type === 'fan') for (let i = 0; i < 7; i++) { const a = (i - 3) * .22; m.box(0, 0, 0, .03, .5 + (3 - Math.abs(i - 3)) * .09, .05, i % 2 ? col : l, 0, 0, a); if (i % 2) m.box(Math.sin(a) * .3, Math.cos(a) * .3, 0, .03, .18, .04, l, 0, 0, a * 2.2); }
  else if (type === 'anemone') { m.prism(0, 0, 0, .16, .1, 7, d); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, r = i % 2 ? .1 : .05; m.at([Math.cos(a) * r, .08, Math.sin(a) * r], [Math.sin(a) * .5, 0, -Math.cos(a) * .5], 1, () => { m.prism(0, 0, 0, .035, .26, 5, col, .02); m.cube(0, .27, 0, .04, .04, .04, [1, .92, .96]); }); } }
  else if (type === 'star') { for (let i = 0; i < 5; i++) { const a = i / 5 * TAU, b = a + Math.PI / 5, c = a - Math.PI / 5, tip = [Math.cos(a) * .32, .02, Math.sin(a) * .32], top = [Math.cos(a) * .08, .07, Math.sin(a) * .08]; m.tri(top, [Math.cos(b) * .1, .02, Math.sin(b) * .1], tip, col); m.tri(top, tip, [Math.cos(c) * .1, .02, Math.sin(c) * .1], d); m.tri([0, .08, 0], [Math.cos(b) * .1, .02, Math.sin(b) * .1], top, col); m.tri([0, .08, 0], top, [Math.cos(c) * .1, .02, Math.sin(c) * .1], d); m.cube(Math.cos(a) * .18, .055, Math.sin(a) * .18, .03, .02, .03, l); } }
  return mesh(m);
}
export function kelp(col = [.36, .78, .3]) {
  const root = new THREE.Group(), segs = [];
  for (let s = 0; s < 3; s++) {
    let p = pivot(root, (s - 1) * .18, 0, (s % 2) * .12); const n = 5 + s;
    for (let i = 0; i < n; i++) { const q = pivot(p, 0, i ? .3 : 0, 0), b = new Builder(), c = i % 2 ? col : shade(col, 1.18); b.box(0, 0, 0, .05, .32, .05, shade(col, .7)); b.box(.08 * (i % 2 ? 1 : -1), .05, 0, .16, .24, .03, c, 0, 0, (i % 2 ? -1 : 1) * .5); q.add(mesh(b)); segs.push([q, s + i * .4]); p = q; }
  }
  root.userData.tick = t => { for (const [q, ph] of segs) q.rotation.z = Math.sin(t * 1.4 + ph) * .1; };
  return root;
}
export function rock(seed = 1, col = [.3, .45, .52]) {
  const m = new Builder(); m.ellipsoid(0, .15, 0, .6, .45, .5, (x, y) => y > .38 ? [.32, .62, .42] : hsh(Math.floor(x * 7), Math.floor(y * 7)) > .5 ? col : shade(col, .86), 0, 7, 4, { jit: .2, seed });
  m.ellipsoid(.55, .05, .25, .25, .2, .22, shade(col, .9), 0, 6, 3, { jit: .2, seed: seed + 3 });
  return mesh(m);
}
// Solid rock arch: one continuous tube, thick at the feet, with moss and a little coral on top.
export function arch(col = [.27, .5, .56]) {
  const m = new Builder(), N = 12, path = Array.from({ length: N + 1 }, (_, i) => { const a = Math.PI * (1 - i / N); return [Math.cos(a) * 2.1, Math.sin(a) * 2.1 - .25, 0]; });
  m.sweep(path, u => { const f = 1 + Math.pow(Math.abs(u - .5) * 2, 3) * .45; return [.55 * f, .62 * f]; }, 7, (x, y, z) => y > 1.55 && Math.abs(z) < .45 ? [.33, .66, .44] : hsh(Math.floor(x * 3), Math.floor(y * 3 + z * 2)) > .5 ? col : shade(col, .85), { jit: .12, seed: 7 });
  for (const s of [-1, 1]) m.ellipsoid(s * 2.15, 0, 0, .95, .38, .85, shade(col, .8), 0, 7, 3, { jit: .18, seed: 5 + s });
  m.gem(-.4, 1.85, .2, .14, .45, [1, .45, .72]); m.gem(-.2, 1.88, -.1, .1, .32, [1, .6, .8]); m.gem(.9, 1.6, .15, .12, .38, [.6, .45, 1]);
  m.prism(1.55, 1.05, .35, .06, .3, 5, [1, .6, .3], .08); m.prism(1.65, .95, .45, .05, .24, 5, [1, .6, .3], .07);
  return mesh(m);
}
export function clam() {
  const root = new THREE.Group(), L = mat(), sh = (x, y, z) => Math.floor((Math.atan2(z, x) + 4) * 4) % 2 ? [.98, .66, .55] : [.92, .52, .48];
  const b = new Builder(); b.at([0, .1, 0], [Math.PI, 0, 0], [1, .45, 1], () => b.ellipsoid(0, 0, 0, .34, .3, .3, sh, 0, 10, 4, { half: true })); root.add(mesh(b));
  const lid = pivot(root, 0, .1, -.28), lb = new Builder(); lb.at([0, 0, .28], [0, 0, 0], [1, .45, 1], () => lb.ellipsoid(0, 0, 0, .34, .3, .3, sh, 0, 10, 4, { half: true })); lid.add(mesh(lb));
  const pb = new Builder(); pb.ellipsoid(0, 0, 0, .1, .1, .1, [1, .97, 1], 0, 8, 4); const pearl = mesh(pb, L.glass.clone()); pearl.material.opacity = .95; pearl.material.emissive.set(0x9a80c0); pearl.position.y = .17; root.add(pearl);
  const halo = glow([.96, .84, 1], 1.3, .7); halo.position.y = .3; root.add(halo); Object.assign(root.userData, { lid, pearl, glow: halo });
  root.userData.tick = t => { lid.rotation.x = -(.15 + Math.max(0, Math.sin(t * .9)) * .55); };
  return root;
}
export function crystals() {
  const m = new Builder(); for (let i = 0; i < 8; i++) { const a = hsh(i, 2) * TAU, d = hsh(i, 5) * .7, h = .5 + hsh(i, 9) * 1.3; m.at([Math.cos(a) * d, 0, Math.sin(a) * d], [Math.cos(a) * .3, 0, Math.sin(a) * .3], 1, () => m.gem(0, 0, 0, .14 + hsh(i, 1) * .1, h, i % 3 ? [.55, .45, 1] : [.4, .85, 1], 6)); }
  return mesh(m, mat().glow);
}
export function wreck() {
  const m = new Builder(), w = [.56, .35, .18], d = [.4, .25, .12], st = (x, y) => Math.floor(y * 9) % 2 ? w : d;
  m.cube(0, .12, 0, 1, .2, 2.4, d);
  for (const s of [-1, 1]) m.at([s * .5, .1, 0], [0, 0, -s * .3], 1, () => { m.box(0, 0, -.2, .1, .6, 2.1, st); m.box(0, 0, 1.05, .1, .45, .5, st, s * .5); });
  m.at([0, .1, 1.35], [0, 0, 0], 1, () => m.gem(0, 0, 0, .25, .7, d, 4));
  m.box(0, .1, -1.25, 1.1, .55, .1, w); m.box(0, .45, .2, 1, .06, .25, w); m.box(0, .45, -.6, 1, .06, .25, w);
  m.at([0, .2, -.2], [.25, 0, .35], 1, () => m.prism(0, 0, 0, .07, 1.3, 6, [.45, .28, .14], .055));
  m.at([.15, 1.4, -.05], [0, .3, .2], 1, () => { m.box(0, 0, 0, .55, .3, .02, [.9, .88, .78], 0, 0, .1); m.cube(.1, .15, .01, .1, .1, .01, [.9, .3, .3]); });
  m.cube(-.55, .35, .3, .02, .22, .3, [.08, .12, .16]);
  const g = mesh(m); g.rotation.set(.06, 0, .22); return g;
}
export function oxygen() {
  const root = new THREE.Group(), b = new Builder(); for (const [x, y, z, r] of [[0, .9, 0, .32], [.3, 1.25, .1, .17], [-.22, 1.36, -.05, .13]]) b.ellipsoid(x, y, z, r, r, r, [.75, .95, 1], 0, 8, 4);
  root.add(mesh(b, mat().glass)); const halo = glow([.5, .92, 1], 2.1, .7); halo.position.y = 1; root.add(halo);
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.font = '900 64px system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#e9fdff'; x.fillText('O₂', 64, 68);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })); label.scale.set(.6, .6, 1); label.position.y = .9; root.add(label);
  root.userData.tick = t => { root.children[0].position.y = Math.sin(t * 2) * .08; };
  return root;
}
// Buddy bot: chunky yellow body, cyan screen face, spinning propeller, glowing side thrusters.
// Origin is the body centre; the suction ring sits .5 below it.
export function robot() {
  const L = mat(), root = new THREE.Group(), body = pivot(root), m = new Builder(), Y = [1, .78, .12], O = [1, .45, .12], D = [.12, .16, .22], lit = L.lit || (L.lit = new THREE.MeshBasicMaterial({ vertexColors: true }));
  m.cube(0, 0, 0, .62, .48, .52, Y); m.cube(0, -.27, 0, .5, .08, .42, O); m.cube(0, .27, 0, .5, .06, .42, O); m.cube(0, .02, .27, .48, .32, .03, D);
  for (const s of [-1, 1]) { m.cube(s * .36, 0, 0, .12, .3, .3, O); m.at([s * .44, 0, -.02], [Math.PI / 2, 0, 0], 1, () => m.prism(0, -.18, 0, .08, .3, 8, [.85, .9, .95])); }
  m.prism(0, .3, 0, .03, .14, 6, D); m.prism(0, -.38, 0, .12, .1, 8, D, .16);
  body.add(mesh(m));
  const f = new Builder(); for (const s of [-1, 1]) f.cube(s * .11, .05, .29, .1, .1, .01, [.3, 1, .95]); f.cube(0, -.06, .29, .16, .03, .01, [.3, 1, .95]); for (const s of [-1, 1]) f.cube(s * .44, 0, -.18, .1, .1, .01, [.4, .9, 1]);
  const face = mesh(f, lit); body.add(face);
  const prop = pivot(body, 0, .45, 0), p = new Builder(); p.cube(0, 0, 0, .7, .03, .1, [1, .3, .4]); p.cube(0, 0, 0, .1, .05, .1, D); prop.add(mesh(p));
  for (const s of [-1, 1]) { const g = glow([.4, .9, 1], .45, .7); g.position.set(s * .44, 0, -.22); body.add(g); }
  const fg = glow([.3, 1, .95], .9, .45); fg.position.z = .35; body.add(fg);
  const r = new Builder(); r.ring(0, 0, 0, .32, .05, [.3, 1, .95], 20); const ring = pivot(root, 0, -.5, 0); ring.add(mesh(r, lit));
  root.userData.tick = t => { prop.rotation.y = t * 18; face.scale.y = Math.sin(t * 1.3) > .97 ? .2 : 1; const k = 1 + Math.sin(t * 8) * .12; ring.scale.set(k, 1, k); };
  return root;
}
export function lure() {
  const b = new Builder(); b.box(0, 0, 0, .38, .38, .38, [.62, .55, .94]); b.gem(0, .4, 0, .17, .35, [.76, .79, 1]); b.ring(0, .03, 0, .75, .06, [.66, .68, .95], 20);
  return mesh(b);
}

// ---------- Environment: the original's 1 m seabed tiles, dark sludge where it is still dirty ----------
export function environment(scene, { n = 14, clean = () => true, pads = [], base = [.13, .67, .63] } = {}) {
  const m = new Builder();
  for (let x = -n; x <= n; x++) for (let z = -n; z <= n; z++) {
    const s = hsh(x, z), ok = clean(x, z), pad = pads.some(p => Math.abs(p.x - x) < .6 && Math.abs(p.z - z) < .6);
    const c = pad ? [.2, .78, .72] : ok ? base.map(v => Math.min(1, v + s * .08)) : [.055 + s * .025, .1 + s * .025, .135 + s * .03];
    m.quad([x - .5, 0, z - .5], [x - .5, 0, z + .5], [x + .5, 0, z + .5], [x + .5, 0, z - .5], c);
    if (!ok && s > .62) m.disc(x, .012, z, .3 + s * .15, [.035, .065, .085], 9);
    if (!ok && s > .82) m.box(x, .01, z, .45, .07 + s * .08, .35, [.07, .12, .16], s * 3);
  }
  scene.background = new THREE.Color(0x062b3b); scene.fog = new THREE.Fog(0x062b3b, 40, 90);
  scene.add(new THREE.Mesh(m.geometry(), mat().solid));
  return null;
}

// ---------- Game rigs: same userData contract the game used with models.js ----------
const hex = h => [(h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255];
export function diverRig(suit) {
  const L = mat(), material = suit.glow || suit.rainbow ? L.solid.clone() : undefined, acc = hex(suit.accent);
  if (suit.glow) { material.emissive.set(suit.color); material.emissiveIntensity = .25; }
  const root = diver({ suit: hex(suit.color), wet: shade(acc, .85), tank: acc, material });
  const sh = blobShadow(1.8); root.add(sh); root.userData.shadow = sh; root.userData.rainbow = !!suit.rainbow;
  return root;
}
export function sharkRig() {
  const root = shark(), alert = new THREE.Sprite(new THREE.SpriteMaterial({ map: textTexture('!', '#ff3b4f'), depthTest: false, transparent: true })), stars = new THREE.Sprite(new THREE.SpriteMaterial({ map: textTexture('✦✦', '#ffe36e'), depthTest: false, transparent: true }));
  alert.scale.set(.8, .8, .8); alert.position.y = 1.5; alert.visible = false; stars.scale.set(1.1, .55, 1); stars.position.y = 1.2; stars.visible = false;
  const tail = root.children.find(c => c.isGroup), sh = blobShadow(2.6); root.add(alert, stars, sh);
  // Angry brows for the wind-up and dash, so the attack reads at a glance.
  const bb = new Builder(); for (const s of [-1, 1]) bb.cube(s * .2, .46, .84, .19, .04, .05, PUPIL, 0, 0, s * .45); const brows = mesh(bb); brows.visible = false; root.add(brows);
  Object.assign(root.userData, { tail, alert, stars, shadow: sh, brows });
  return root;
}
// Rescued animals & buddies; friend adds the original's gold ring + gem.
export const ANIMAL_SCALE = { turtle: 1.1, seal: 1, octopus: .85, dolphin: 1.1, whale: .8 };
export function animal(id, { friend = false } = {}) {
  const root = creature(id, { friend }), sh = blobShadow(id === 'whale' ? 2.6 : 1.5); root.add(sh);
  root.userData.anim = [root.userData.tick]; root.userData.shadow = sh; return root;
}
export const TRASH = {
  bottle: { size: 1, value: 6, hold: 0 }, can: { size: 1, value: 5, hold: 0 }, bag: { size: 1, value: 6, hold: 0 }, boot: { size: 1, value: 8, hold: 0 },
  crate: { size: 1.2, value: 12, hold: .3 }, tire: { size: 1.4, value: 18, hold: .6 }, barrel: { size: 1.6, value: 30, hold: 1.1 },
};
export function trashGeometries() { return Object.fromEntries(TRASH_KINDS.map(k => [k, trash(k, { leak: false }).geometry])); }
// Ambient reef fish for instancing: light body so the instance colour shows, dark pupils.
export function smallFishGeometry() {
  const m = new Builder(); m.ellipsoid(0, 0, 0, .1, .15, .24, [1, 1, 1], 0, 7, 4); m.tri([0, .08, -.12], [0, .22, -.04], [0, .08, .1], [.85, .85, .85]);
  m.tri([0, 0, -.2], [-.12, 0, -.38], [.12, 0, -.38], [.85, .85, .85]);
  for (const s of [-1, 1]) { m.ellipsoid(s * .075, .04, .13, .035, .04, .035, [1, 1, 1], 0, 5, 2); m.ellipsoid(s * .095, .045, .15, .02, .025, .02, PUPIL, 0, 5, 2); }
  return m.geometry();
}
// World decor (instanced, tinted per instance): white corals and rocks; kelp keeps its greens.
export const CORAL_TYPES = ['branch', 'spike', 'brain', 'tube', 'table', 'fan', 'anemone', 'star'];
export function coralGeometries() { return CORAL_TYPES.map(t => coral(t, [1, 1, 1]).geometry); }
export function kelpGeometry() {
  const m = new Builder();
  for (let s = 0; s < 3; s++) { const x0 = (s - 1) * .16, z0 = (s % 2) * .1, n = 5 + s; for (let i = 0; i < n; i++) { const y = i * .3, c = i % 2 ? [.36, .78, .3] : [.52, .86, .34]; m.box(x0, y, z0, .05, .32, .05, [.24, .55, .26]); m.box(x0 + .08 * (i % 2 ? 1 : -1), y + .05, z0, .16, .24, .03, c, 0, 0, (i % 2 ? -1 : 1) * .5); } }
  return m.geometry();
}
export function rockGeometry() {
  const m = new Builder(); m.ellipsoid(0, .2, 0, 1, .7, .9, (x, y) => hsh(Math.floor(x * 5), Math.floor(y * 5)) > .5 ? [1, 1, 1] : [.86, .86, .86], 0, 7, 4, { jit: .2, seed: 3 });
  return m.geometry();
}
