// Variant A: the remake's low-poly models polished (rounder tapered bodies, gradients, glass
// helmet, soft shadows) plus a richer seabed (dunes, light shafts, drifting particles).
// Same API as boxy.js so the preview can swap between them.
import * as THREE from 'three';
import { Builder } from './boxy.js';
import { initMaterials, mats, part, merge, blobShadow, buildAnimal, buildJelly, trashGeometries, coralGeometries, kelpGeometry, swayMaterial, rockGeometry, buildArch, buildClam, buildCrystals, buildWreck, buildO2 } from './models.js';

initMaterials();
const TAU = Math.PI * 2;
const hsh = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
const C = a => Array.isArray(a) ? new THREE.Color().setRGB(a[0], a[1], a[2], THREE.SRGBColorSpace) : new THREE.Color(a);
export const LOOK = { solid: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide }) };
const gold = new THREE.MeshLambertMaterial({ color: 0xffd447, emissive: 0x7a5200, emissiveIntensity: .5, flatShading: true });
const M = (geo, mat = mats.flat) => new THREE.Mesh(geo, mat);
const pivot = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
const ext = (shape, depth = .03) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 5 }).translate(0, 0, -depth / 2);
const shape = pts => { const s = new THREE.Shape(); s.moveTo(...pts[0]); for (const p of pts.slice(1)) p.length === 4 ? s.quadraticCurveTo(...p) : s.lineTo(...p); return s; };
// Fish body: ellipsoid that narrows towards the tail.
function body(rx, ry, rz, seg = 12) {
  const g = new THREE.SphereGeometry(1, seg, Math.round(seg * .7)).scale(rx, ry, rz), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const z = p.getZ(i), k = z < 0 ? Math.max(.12, 1 + z / (rz * 1.3)) : 1 - z / rz * .18; p.setX(i, p.getX(i) * k); p.setY(i, p.getY(i) * k); }
  return g;
}
const radiusAt = (rx, ry, rz, z) => { const f = Math.sqrt(Math.max(0, 1 - (z / rz) ** 2)), k = z < 0 ? Math.max(.12, 1 + z / (rz * 1.3)) : 1 - z / rz * .18; return [rx * f * k, ry * f * k]; };
function eyeParts(x, y, z, r) {
  const out = []; for (const s of [-1, 1]) out.push(part(new THREE.SphereGeometry(r, 10, 8), 0xffffff, { p: [s * x, y, z] }), part(new THREE.SphereGeometry(r * .58, 8, 6), 0x0b1016, { p: [s * (x + r * .5), y + r * .05, z + r * .5] }), part(new THREE.SphereGeometry(r * .2, 5, 4), 0xffffff, { p: [s * (x + r * .78), y + r * .38, z + r * .62] }));
  return out;
}
function friendMarks(root, r, top, anim) {
  const ring = M(new THREE.TorusGeometry(r, .025, 4, 36).rotateX(Math.PI / 2), gold); root.add(ring); root.userData.mark = ring;
  const gem = M(new THREE.OctahedronGeometry(.07).scale(1, 1.6, 1), gold); gem.position.y = top; root.add(gem);
  anim.push(t => { gem.position.y = top + Math.sin(t * 2.5) * .04; gem.rotation.y = t * 1.5; });
}

// ---------- Diver: swims flat, glass helmet, twin tanks, flutter kick ----------
export function diver({ suit = 0xff8a3d, accent = 0x3fe0c5 } = {}) {
  const root = new THREE.Group(), b = pivot(root), skin = 0xffd1ae, dark = 0x1d2a3a, R = Math.PI / 2;
  const parts = [
    part(new THREE.CapsuleGeometry(.25, .5, 4, 14), suit, { r: [R, 0, 0], s: [1.08, 1, .88] }),
    part(new THREE.CylinderGeometry(.275, .275, .08, 16), accent, { p: [0, 0, -.22], r: [R, 0, 0], s: [1.08, 1, .9] }),
    part(new THREE.CylinderGeometry(.08, .08, .3, 8), 0xffe066, { p: [0, -.2, .1], r: [R, 0, 0], s: [1, 1, .3] }),
    part(new THREE.CylinderGeometry(.05, .05, .14, 8), accent, { p: [0, .32, .3], r: [R, 0, 0] }),
    part(new THREE.SphereGeometry(.2, 16, 12), skin, { p: [0, .06, .52] }),
    part(new THREE.SphereGeometry(.035, 6, 6), 0x101820, { p: [-.075, .1, .7] }), part(new THREE.SphereGeometry(.035, 6, 6), 0x101820, { p: [.075, .1, .7] }),
    part(new THREE.SphereGeometry(.032, 6, 6), 0xff8f9a, { p: [-.13, .02, .66] }), part(new THREE.SphereGeometry(.032, 6, 6), 0xff8f9a, { p: [.13, .02, .66] }),
    part(new THREE.TorusGeometry(.26, .05, 6, 18), accent, { p: [0, .04, .36] }),
  ];
  for (const s of [-1, 1]) parts.push(
    part(new THREE.CapsuleGeometry(.1, .44, 3, 10), 0xdfe6ea, { p: [s * .11, .27, -.06], r: [R, 0, 0] }),
    part(new THREE.CapsuleGeometry(.075, .3, 2, 8), suit, { p: [s * .28, -.08, .36], r: [R + .6, 0, 0] }),
    part(new THREE.SphereGeometry(.085, 8, 6), accent, { p: [s * .28, -.2, .55] }));
  parts.push(part(new THREE.CylinderGeometry(.045, .045, .44, 8), 0x24414f, { p: [0, -.34, .76], r: [-.95, 0, 0] }), part(new THREE.CylinderGeometry(.1, .18, .14, 14), accent, { p: [0, -.53, .98] }), part(new THREE.BoxGeometry(.14, .06, .12), 0xffe066, { p: [0, -.43, .96] }));
  b.add(M(merge(parts)));
  const helmet = M(new THREE.SphereGeometry(.31, 18, 14), mats.glass); helmet.position.set(0, .06, .52); b.add(helmet);
  const lamp = new THREE.Sprite(mats.glowSprite.clone()); lamp.material.color.set(0xfff2a8); lamp.material.opacity = .7; lamp.scale.set(.3, .3, .3); lamp.position.set(0, .4, .6); b.add(lamp);
  const flipper = shape([[-.09, 0], [.09, 0], [.17, -.52], [0, -.4, -.17, -.52]]);
  const legs = [-1, 1].map(s => { const l = pivot(b, s * .12, -.02, -.42); l.add(M(merge([part(new THREE.CapsuleGeometry(.09, .3, 2, 8), dark, { p: [0, 0, -.2], r: [R, 0, 0] }), part(ext(flipper, .035), accent, { p: [0, -.02, -.42], r: [R, 0, 0] })]))); return l; });
  root.add(blobShadow(1.8)); root.userData.shadow = root.children[root.children.length - 1];
  root.userData.tick = (t, sp = 1) => { legs[0].rotation.x = Math.sin(t * 9 * sp) * .38; legs[1].rotation.x = -Math.sin(t * 9 * sp) * .38; b.rotation.z = Math.sin(t * 4.5 * sp) * .04; b.position.y = Math.sin(t * 3) * .05; };
  return root;
}

// ---------- Creatures ----------
export const CREATURES = { clown: { color: [1, .55, .18] }, tang: { color: [.22, .62, 1] }, ray: { color: [.69, .55, .98] } };
const ANIMAL_SIZE = { turtle: .75, seal: .75, octopus: .9 };
CREATURES.dolphin = { color: [.42, .66, .86] }; CREATURES.whale = { color: [.26, .45, .78] };
export function creature(kind, { color = CREATURES[kind]?.color || [1, .6, .3], friend = false } = {}) {
  const anim = [];
  if (ANIMAL_SIZE[kind]) {
    const root = new THREE.Group(), a = buildAnimal(kind); a.scale.setScalar(ANIMAL_SIZE[kind]); root.add(a);
    root.userData.shadow = a.userData.shadow; for (const f of a.userData.anim) anim.push(f);
    if (friend) friendMarks(root, { whale: 1.1, octopus: .7 }[kind] || .6, { whale: .9, octopus: 1.25, turtle: .55 }[kind] || .6, anim);
    root.userData.tick = (t, sp = 1) => { for (const f of anim) f(t, sp); };
    return root;
  }
  const root = new THREE.Group(), col = C(color), finCol = kind === 'tang' ? 0xffcc33 : C(color.map(v => Math.min(1, v * 1.12)));
  const flap = (p, axis, amp, f) => anim.push((t, sp) => { p.rotation[axis] = Math.sin(t * f * sp) * amp; });
  if (kind === 'dolphin' || kind === 'whale') {
    // Rebuilt here: the remake's dolphin/whale had snout, eyes and tail floating off the body.
    const W = kind === 'whale', [rx, ry, rz] = W ? [.6, .5, 1.3] : [.26, .25, .75], belly = W ? -.18 : -.06, [ex] = radiusAt(rx, ry, rz, rz * .6);
    const parts = [part(body(rx, ry, rz, 16), (x, y, z, c) => y < belly ? c.setRGB(.9, .94, .97, THREE.SRGBColorSpace) : c.copy(col)), ...eyeParts(ex * .92, W ? -.02 : .06, rz * .6, W ? .08 : .055)];
    if (W) { parts.push(part(new THREE.SphereGeometry(.06, 6, 4).scale(1, .4, 1.5), 0x1a2a40, { p: [0, ry * .98, rz * .35] })); for (let i = -3; i <= 3; i++) parts.push(part(new THREE.BoxGeometry(.03, .02, rz * .9), 0xb8c8d8, { p: [i * .1, -ry * .93 + Math.abs(i) * .03, .25] })); }
    else parts.push(part(new THREE.CylinderGeometry(.055, .1, .26, 10), col, { p: [0, -.05, rz + .06], r: [Math.PI / 2, 0, 0] }), part(new THREE.TorusGeometry(.09, .015, 4, 8, Math.PI), 0x1a2a40, { p: [0, -.04, rz - .02], r: [Math.PI / 2 + .4, 0, Math.PI] }));
    parts.push(part(ext(shape([[-.2, 0], [.05, .15, .18, .32], [.12, 0]]), .04), finCol, { p: [0, ry * .85, -rz * .1], r: [0, Math.PI / 2, 0], s: W ? [1.1, .8, 1] : [1, 1, 1] }));
    root.add(M(merge(parts)));
    for (const s of [-1, 1]) { const p = pivot(root, s * rx * .85, -ry * .4, rz * .3); p.add(M(part(ext(shape([[0, .08], [s * .4, -.15], [s * .05, -.12]]), .03), finCol, { r: [Math.PI / 2, 0, 0], s: W ? [1.8, 1.8, 1] : [1, 1, 1] }))); flap(p, 'z', .25 * s, 3); }
    const tail = pivot(root, 0, 0, -rz * .92), k = W ? 1.8 : 1;
    tail.add(M(part(ext(shape([[0, .12], [.42, -.2], [.15, -.12], [0, -.08], [-.15, -.12], [-.42, -.2]]), .04), finCol, { r: [Math.PI / 2, 0, 0], s: [k, k, 1] }))); flap(tail, 'x', .35, W ? 2.4 : 5);
    if (friend) friendMarks(root, W ? 1.1 : .6, W ? .85 : .55, anim);
    root.add(blobShadow(W ? 2.6 : 1.6)); root.userData.shadow = root.children[root.children.length - 1];
    root.userData.tick = (t, sp = 1) => { for (const f of anim) f(t, sp); };
    return root;
  }
  if (kind === 'ray') {
    const rb = [part(new THREE.SphereGeometry(.3, 14, 8).scale(.85, .3, 1.1), (x, y, z, c) => c.copy(col).multiplyScalar(y < 0 ? .75 : 1)), ...eyeParts(.12, .07, .22, .05)];
    for (const [x, z] of [[.1, .05], [-.12, -.08], [.03, -.2]]) rb.push(part(new THREE.SphereGeometry(.035, 6, 4).scale(1, .3, 1), 0xffffff, { p: [x, .09, z] }));
    root.add(M(merge(rb)));
    for (const s of [-1, 1]) { const w = pivot(root, s * .2, 0, 0); w.add(M(part(ext(shape([[0, .28], [s * .5, .16, s * .82, -.04], [s * .4, -.22, 0, -.32]]), .04), col, { r: [Math.PI / 2, 0, 0] }))); flap(w, 'z', .35 * s, 4); }
    const tail = pivot(root, 0, 0, -.32); tail.add(M(part(new THREE.ConeGeometry(.025, .8, 5), col, { p: [0, 0, -.4], r: [-Math.PI / 2, 0, 0] }))); flap(tail, 'y', .3, 3);
  } else {
    const rx = .17, ry = kind === 'tang' ? .3 : .24, rz = .36, parts = [part(body(rx, ry, rz), col), ...eyeParts(.11, .05, .2, .062)];
    if (kind === 'clown') for (const z of [.1, -.12]) { const [a, c] = radiusAt(rx, ry, rz, z); parts.push(part(new THREE.SphereGeometry(1, 12, 6).scale(a * 1.06, c * 1.06, .045), 0xffffff, { p: [0, 0, z] }), part(new THREE.SphereGeometry(1, 12, 6).scale(a * 1.04, c * 1.04, .065), 0x1a1a1a, { p: [0, 0, z] })); }
    if (kind === 'tang') parts.push(part(body(rx * 1.03, ry * .45, rz * .7), 0x10204a, { p: [0, .1, -.04] }));
    parts.push(part(ext(shape([[-.14, 0], [.02, .17, .22, 0]]), .02), finCol, { p: [0, ry * .78, -.04], r: [0, Math.PI / 2, 0] }));
    root.add(M(merge(parts)));
    for (const s of [-1, 1]) { const p = pivot(root, s * .14, -.04, .06); p.add(M(part(ext(shape([[0, 0], [s * .16, -.05], [s * .1, -.16]]), .015), finCol, { r: [Math.PI / 2, 0, 0] }))); flap(p, 'y', .4 * s, 7); }
    const tail = pivot(root, 0, 0, -.38); tail.add(M(part(ext(shape([[0, 0], [.26, .2], [.18, 0], [.26, -.2]]), .02), finCol, { r: [0, Math.PI / 2, 0] }))); flap(tail, 'y', .35, 6);
  }
  if (friend) friendMarks(root, kind === 'ray' ? .6 : .5, .5, anim);
  root.add(blobShadow(.9)); root.userData.shadow = root.children[root.children.length - 1];
  root.userData.tick = (t, sp = 1) => { for (const f of anim) f(t, sp); };
  return root;
}

export function jelly() {
  const root = buildJelly(), { bell, tent } = root.userData;
  root.userData.tick = t => { const q = Math.sin(t * 3); bell.scale.set(1 + q * .12, 1 - q * .15, 1 + q * .12); tent.forEach((s, i) => { s.rotation.x = Math.sin(t * 2 + i) * .3; }); };
  return root;
}

// ---------- Shark: smooth countershaded body, crescent tail, cheeky face ----------
export function shark({ top = [.42, .58, .76], angry = false } = {}) {
  const root = new THREE.Group(), m = new Builder(), belly = [.92, .96, .97];
  const sec = [[1.2, .05, .04, .22], [1.12, .16, .12, .22], [.98, .27, .2, .23], [.7, .38, .27, .25], [.3, .43, .31, .26], [-.1, .42, .3, .26], [-.5, .3, .22, .26], [-.82, .15, .11, .26], [-.98, .07, .06, .26]];
  m.loft(sec, 12, (x, y) => y < .19 ? belly : y < .23 ? [.7, .8, .86] : top);
  root.add(new THREE.Mesh(m.geometry(), LOOK.solid));
  const T = C(top), fin = (pts, o) => part(ext(shape(pts), .05), T, o);
  const extra = [
    fin([[-.35, 0], [-.05, .3, .2, .6], [.12, .25, .28, 0]], { p: [0, .5, -.05], r: [0, Math.PI / 2, 0] }),
    fin([[-.1, 0], [.05, .2], [.12, 0]], { p: [0, .45, -.62], r: [0, Math.PI / 2, 0] }),
    fin([[0, .2], [.75, -.2, .9, -.3], [.3, .05, .05, -.1]], { p: [.32, .12, .3], r: [Math.PI / 2, 0, 0] }),
    fin([[0, .2], [-.75, -.2, -.9, -.3], [-.3, .05, -.05, -.1]], { p: [-.32, .12, .3], r: [Math.PI / 2, 0, 0] }),
    ...eyeParts(.21, .32, .8, .085),
    part(new THREE.TorusGeometry(.13, .025, 4, 10, Math.PI), 0x5a1424, { p: [0, .14, .95], r: [Math.PI / 2 + .3, 0, Math.PI] }),
  ];
  for (let i = -2; i <= 2; i++) extra.push(part(new THREE.ConeGeometry(.022, .05, 4), 0xffffff, { p: [i * .045, .115, 1.04 - Math.abs(i) * .02], r: [Math.PI, 0, 0] }));
  for (const s of [-1, 1]) { extra.push(part(new THREE.SphereGeometry(.05, 6, 4).scale(.4, 1, 1.4), 0xff8fa8, { p: [s * .25, .2, .92] })); for (let g = 0; g < 3; g++) extra.push(part(new THREE.BoxGeometry(.02, .16, .025), 0x34506a, { p: [s * .4, .27, .44 - g * .09] })); }
  if (angry) for (const s of [-1, 1]) extra.push(part(new THREE.BoxGeometry(.18, .04, .05), 0x0b1016, { p: [s * .2, .45, .86], r: [0, 0, s * .45] }));
  root.add(M(merge(extra)));
  const tail = pivot(root, 0, .26, -.95); tail.add(M(part(ext(shape([[0, 0], [.35, .25, .62, .7], [.3, .15], [.25, 0, .48, -.42], [.15, -.05]]), .05), T, { r: [0, Math.PI / 2, 0] })));
  root.add(blobShadow(2.4)); root.userData.shadow = root.children[root.children.length - 1];
  root.userData.tick = (t, sp = 1) => { tail.rotation.y = Math.sin(t * 7 * sp) * .38; };
  return root;
}

// ---------- Treasure chest ----------
export function chest() {
  const root = new THREE.Group(), R = Math.PI / 2, wood = 0xc97a2c, band = 0xffd447;
  const parts = [part(new THREE.BoxGeometry(.7, .4, .5), (x, y, z, c) => c.set(wood).multiplyScalar(.85 + y * .5), { p: [0, .2, 0] }),
    part(new THREE.CylinderGeometry(.25, .25, .7, 12, 1, false, 0, Math.PI), wood, { p: [0, .4, 0], r: [0, 0, R] }),
    part(new THREE.BoxGeometry(.2, .2, .06), band, { p: [0, .38, .26] }), part(new THREE.BoxGeometry(.05, .08, .02), 0x2a1a10, { p: [0, .36, .3] })];
  for (const x of [-.25, .25]) parts.push(part(new THREE.BoxGeometry(.06, .42, .52), band, { p: [x, .2, 0] }), part(new THREE.CylinderGeometry(.26, .26, .06, 12, 1, false, 0, Math.PI), band, { p: [x, .4, 0], r: [0, 0, R] }));
  root.add(M(merge(parts)));
  root.add(M(new THREE.TorusGeometry(.85, .03, 4, 40).rotateX(R), gold));
  const gem = M(new THREE.OctahedronGeometry(.16).scale(1, 1.5, 1), new THREE.MeshLambertMaterial({ color: 0x8fffe0, emissive: 0x2a9070, emissiveIntensity: .8, flatShading: true })); root.add(gem);
  const glow = new THREE.Sprite(mats.glowSprite.clone()); glow.material.color.set(0x8fffe0); glow.material.opacity = .6; glow.scale.set(1.2, 1.2, 1); root.add(glow);
  root.add(blobShadow(1.3));
  root.userData.tick = t => { gem.position.y = 1.05 + Math.sin(t * 2) * .12; gem.rotation.y = t; glow.position.y = gem.position.y; };
  return root;
}

// ---------- Trash ----------
export const TRASH_KINDS = ['bottle', 'can', 'bag', 'tire', 'barrel', 'boot', 'crate'];
let TG = null;
export function trash(kind) {
  TG ??= trashGeometries();
  const g = new THREE.Group(), lift = { bottle: .1, can: .08, bag: .06, tire: .14, barrel: 0 };
  if (kind === 'barrel') {
    // The remake's barrel coloured bands per vertex on a one-segment cylinder, so it rendered black.
    const p = [part(new THREE.CylinderGeometry(.26, .26, .6, 14), 0xf2c12e, { p: [0, .3, 0] }), part(new THREE.CylinderGeometry(.24, .26, .03, 14), 0x2a2a2a, { p: [0, .615, 0] }), part(new THREE.CylinderGeometry(.04, .04, .04, 8), 0x777777, { p: [.1, .64, .05] })];
    for (const y of [.15, .45]) p.push(part(new THREE.CylinderGeometry(.27, .27, .05, 14), 0x2a2a2a, { p: [0, y, 0] }));
    for (const a of [0, Math.PI]) p.push(part(new THREE.CircleGeometry(.11, 3), 0x111111, { p: [Math.sin(a) * .262, .3, Math.cos(a) * .262], r: [0, a, Math.PI / 2] }), part(new THREE.BoxGeometry(.02, .06, .01), 0xf2c12e, { p: [Math.sin(a) * .265, .31, Math.cos(a) * .265], r: [0, a, 0] }));
    g.add(M(merge(p)));
    g.add(M(merge([part(new THREE.CircleGeometry(.22, 10).rotateX(-Math.PI / 2), 0x5fd13a, { p: [.32, .015, .16] }), part(new THREE.CircleGeometry(.1, 8).rotateX(-Math.PI / 2), 0x8af05a, { p: [.45, .02, 0] })])));
    return g;
  }
  if (TG[kind]) { const m = M(TG[kind]); m.position.y = lift[kind]; if (kind === 'tire') m.rotation.x = .25; g.add(m); }
  if (kind === 'boot') { const m = M(merge([part(new THREE.CylinderGeometry(.11, .12, .36, 10), 0x7a4a24, { p: [0, .3, -.08] }), part(new THREE.CapsuleGeometry(.11, .26, 3, 10), 0x7a4a24, { p: [0, .1, .08], r: [Math.PI / 2, 0, 0] }), part(new THREE.BoxGeometry(.24, .04, .5), 0x2f2016, { p: [0, 0, .08] })])); m.rotation.set(0, .3, Math.PI / 2 - .2); m.position.y = .12; g.add(m); }
  if (kind === 'crate') { const c = 0x3a8cf0, p = [part(new THREE.BoxGeometry(.52, .04, .4), c, { p: [0, .02, 0] })]; for (const [x, z] of [[-.24, -.18], [.24, -.18], [-.24, .18], [.24, .18]]) p.push(part(new THREE.CylinderGeometry(.03, .03, .3, 6), c, { p: [x, .15, z] })); for (const y of [.12, .27]) p.push(part(new THREE.BoxGeometry(.5, .04, .03), c, { p: [0, y, -.18] }), part(new THREE.BoxGeometry(.5, .04, .03), c, { p: [0, y, .18] }), part(new THREE.BoxGeometry(.03, .04, .38), c, { p: [-.24, y, 0] }), part(new THREE.BoxGeometry(.03, .04, .38), c, { p: [.24, y, 0] })); g.add(M(merge(p))); }
  return g;
}

// ---------- Seabed ----------
let CG = null; const tint = {};
const CORAL_IX = { branch: 0, brain: 1, fan: 2, tube: 3, table: 4, star: 5, anemone: 6 };
export function coral(type, col) {
  CG ??= coralGeometries();
  const key = col.join(); tint[key] ??= (() => { const m = mats.flat.clone(); m.color.copy(C(col)); return m; })();
  if (type === 'spike') { const p = []; for (let i = 0; i < 5; i++) { const a = i * 1.3, d = i ? .18 : 0, h = .5 + (i ? .3 : .6) * hsh(i, 3) + (i ? 0 : .3); p.push(part(new THREE.ConeGeometry(.12 - (i ? .04 : 0), h, 6), 0xffffff, { p: [Math.cos(a) * d, h / 2, Math.sin(a) * d], r: [Math.sin(a) * .25, 0, -Math.cos(a) * .25] })); } return M(merge(p), tint[key]); }
  const m = M(CG[CORAL_IX[type]], tint[key]); if (type === 'fan') m.position.y = -.05; return m;
}
export function kelp(col = [.36, .78, .3]) {
  const mat = swayMaterial(mats.flat, .25), m = M(kelpGeometry(), mat); m.material.color.copy(C(col)).multiplyScalar(1.4);
  m.userData.tick = t => { mat.userData.time.value = t; };
  return m;
}
export function rock(seed = 1) { const m = M(rockGeometry()); m.scale.set(.75, .7, .65); m.position.y = .1; const g = new THREE.Group(); g.add(m); g.rotation.y = seed; return g; }
export function arch() { const m = buildArch(); m.scale.setScalar(.95); const g = new THREE.Group(); g.add(m); return g; }
export function clam() { const r = buildClam(), { lid, glow } = r.userData; glow.visible = true; r.userData.tick = t => { lid.rotation.x = -(.15 + Math.max(0, Math.sin(t * .9)) * .55); }; return r; }
export function crystals() { const m = buildCrystals(); m.scale.setScalar(.5); const g = new THREE.Group(); g.add(m); return g; }
export function wreck() { const m = buildWreck(); m.scale.setScalar(.55); m.position.y = .1; const g = new THREE.Group(); g.add(m); return g; }
export function oxygen() { const r = buildO2(); r.userData.tick = t => { r.children[0].position.y = .9 + Math.sin(t * 2) * .08; }; return r; }
export function robot() {
  const g = new THREE.Group(); g.add(M(merge([part(new THREE.CapsuleGeometry(.22, .24, 4, 12), 0x6ee3d8, { r: [0, 0, Math.PI / 2] }), part(new THREE.SphereGeometry(.16, 12, 8, 0, TAU, 0, Math.PI / 2), 0x2f8f96, { p: [0, .14, 0] }),
    part(new THREE.BoxGeometry(.3, .12, .04), 0x12222c, { p: [0, .02, .22] }), part(new THREE.SphereGeometry(.035, 6, 4), 0xfff6c0, { p: [-.07, .03, .245] }), part(new THREE.SphereGeometry(.035, 6, 4), 0xfff6c0, { p: [.07, .03, .245] }),
    part(new THREE.CylinderGeometry(.09, .09, .1, 10), 0x2f8f96, { p: [.36, 0, 0], r: [0, 0, Math.PI / 2] }), part(new THREE.CylinderGeometry(.09, .09, .1, 10), 0x2f8f96, { p: [-.36, 0, 0], r: [0, 0, Math.PI / 2] }), part(new THREE.OctahedronGeometry(.07), 0xffe066, { p: [0, .36, 0] })])));
  g.add(blobShadow(1)); g.userData.shadow = g.children[1]; return g;
}
export function lure() {
  const g = new THREE.Group(); g.add(M(merge([part(new THREE.IcosahedronGeometry(.22, 0), 0xa58cff, { p: [0, .3, 0] }), part(new THREE.CylinderGeometry(.02, .02, .3, 5), 0x6a5acd, { p: [0, .1, 0] })])));
  g.add(M(new THREE.TorusGeometry(.75, .03, 4, 32).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xb9a6ff })));
  const glow = new THREE.Sprite(mats.glowSprite.clone()); glow.material.color.set(0xb9a6ff); glow.scale.set(1, 1, 1); glow.position.y = .3; g.add(glow); return g;
}

// ---------- Environment: low dunes, sludge, light shafts, marine snow ----------
export function environment(scene, { n = 14, clean = () => true, pads = [] } = {}) {
  scene.background = new THREE.Color(0x05303f); scene.fog = new THREE.FogExp2(0x05303f, .012);
  const m = new Builder(), st = .75, h = (x, z, ok) => ok ? Math.sin(x * .55) * Math.cos(z * .5) * .1 + Math.sin(x * 1.7 + z * 1.1) * .035 : -.02 + hsh(Math.round(x * 4), Math.round(z * 4)) * .07;
  for (let x = -n; x < n; x += st) for (let z = -n; z < n; z += st) {
    const cx = x + st / 2, cz = z + st / 2, ok = clean(cx, cz), pad = pads.some(p => Math.abs(p.x - cx) < .9 && Math.abs(p.z - cz) < .9);
    const P = (a, b) => [a, h(a, b, ok), b], A = P(x, z), B = P(x + st, z), Cc = P(x + st, z + st), D = P(x, z + st);
    for (const [k, tri] of [[0, [A, D, Cc]], [1, [A, Cc, B]]]) {
      const s = hsh(cx * 3 + k, cz * 3);
      const col = pad ? [.24, .8, .74] : ok ? [.13 + s * .05, .6 + s * .07, .58 + s * .06] : [.05 + s * .025, .085 + s * .025, .11 + s * .03];
      m.tri(...tri, col);
    }
  }
  scene.add(new THREE.Mesh(m.geometry(), LOOK.solid));
  // Light shafts from the surface.
  const c = document.createElement('canvas'); c.width = 4; c.height = 128; const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, 'rgba(190,255,240,.5)'); g.addColorStop(1, 'rgba(190,255,240,0)'); x.fillStyle = g; x.fillRect(0, 0, 4, 128);
  const tex = new THREE.CanvasTexture(c), rays = [];
  for (let i = 0; i < 7; i++) {
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, opacity: .3 });
    const r = new THREE.Mesh(new THREE.PlaneGeometry(1.2 + hsh(i, 1) * 1.6, 14), mat); r.position.set((hsh(i, 2) - .5) * n * 1.4, 7, (hsh(i, 3) - .5) * n * 1.4); r.rotation.set(0, Math.PI / 4, (hsh(i, 4) - .5) * .5); scene.add(r); rays.push(r);
  }
  // Drifting marine snow.
  const N = 500, pos = new Float32Array(N * 3), seed = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { seed[i * 3] = (hsh(i, 7) - .5) * n * 2; seed[i * 3 + 1] = hsh(i, 8) * 6; seed[i * 3 + 2] = (hsh(i, 9) - .5) * n * 2; }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xd8fff6, size: .07, transparent: true, opacity: .6, depthWrite: false })));
  return t => {
    rays.forEach((r, i) => { r.material.opacity = .18 + Math.sin(t * .6 + i * 1.7) * .1; r.rotation.z = Math.sin(t * .2 + i) * .15; });
    for (let i = 0; i < N; i++) { pos[i * 3] = seed[i * 3] + Math.sin(t * .3 + i) * .3; pos[i * 3 + 1] = ((seed[i * 3 + 1] - t * .12) % 6 + 6) % 6; pos[i * 3 + 2] = seed[i * 3 + 2] + Math.cos(t * .25 + i) * .3; }
    pg.attributes.position.needsUpdate = true;
  };
}
