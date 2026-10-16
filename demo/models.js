// V3 look preview: a small reef scene and a numbered lineup of every model, so each one can be
// judged on its own. Crisp flat shading with MSAA edge smoothing (?aa=0 turns it off).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const Q = new URLSearchParams(location.search), LOOK_ID = Q.get('look') === 'lowpoly' ? 'lowpoly' : 'boxy';
const B = await import(LOOK_ID === 'lowpoly' ? '../js/lowpoly.js' : '../js/boxy.js');
document.getElementById('look').textContent = LOOK_ID === 'lowpoly' ? 'A · Low-poly remake' : 'B · Original style';
if (Q.has('embed')) document.body.classList.add('embed');

const AA = Q.get('aa') !== '0';
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: AA, powerPreference: 'high-performance' });
const YAW = Math.PI / 4, EL = .68;
const RIGHT = new THREE.Vector3(Math.cos(YAW), 0, -Math.sin(YAW)), NEAR = new THREE.Vector3(Math.sin(YAW), 0, Math.cos(YAW));
const at = (u, v) => RIGHT.clone().multiplyScalar(u).add(NEAR.clone().multiplyScalar(v));
const FACE_RIGHT = Math.atan2(RIGHT.x, RIGHT.z);
const hsh = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

function makeScene() {
  const s = new THREE.Scene();
  s.add(new THREE.HemisphereLight(0xffffff, 0x6f8f9c, 2.4)); const sun = new THREE.DirectionalLight(0xfff4e0, 1); sun.position.set(6, 12, 5); s.add(sun);
  return s;
}
const anim = [], grounded = [], envTicks = [], _p = new THREE.Vector3(), _s = new THREE.Vector3();
// Keep buddy rings and blob shadows on the floor whatever height the owner swims at.
function ground(obj) { obj.updateMatrixWorld(true); for (const c of [obj.userData.mark, obj.userData.shadow]) if (c) { c.getWorldPosition(_p); c.parent.getWorldScale(_s); c.position.y += (.03 - _p.y) / _s.y; } }
const add = (scene, obj, x, y, z, yaw = 0, s = 1) => { obj.position.set(x, y, z); obj.rotation.y = yaw; obj.scale.setScalar(s); scene.add(obj); if (obj.userData.mark || obj.userData.shadow) { ground(obj); grounded.push(obj); } if (obj.userData.tick) anim.push(obj); return obj; };

// ---------- Scene ----------
const scene = makeScene();
const clean = (x, z) => Math.hypot(x, z * 1.15) < 7.5 + Math.sin(x * 1.3) * .8 + Math.cos(z * .9) * .6;
envTicks.push(B.environment(scene, { n: 15, clean }));
add(scene, B.arch(), -3.4, 0, -3, .8, .8);
const CORAL = [[.95, .36, .63], [.53, .42, .91], [.21, .85, .71], [.98, .6, .32], [1, .88, .4], [.31, .7, 1]];
const TYPES = ['branch', 'spike', 'brain', 'tube', 'table', 'fan', 'anemone', 'star'];
for (let i = 0; i < 34; i++) { const a = hsh(i, 3) * 6.28, d = 2 + hsh(i, 7) * 5.2, x = Math.cos(a) * d, z = Math.sin(a) * d; if (!clean(x, z) || Math.hypot(x + 3.4, z + 3) < 2.3) continue; add(scene, B.coral(TYPES[i % TYPES.length], CORAL[i % 6]), x, 0, z, hsh(i, 9) * 6, .8 + hsh(i, 4) * .5); }
add(scene, B.kelp(), 4.6, 0, -3.5); add(scene, B.kelp([.5, .82, .3]), -5.5, 0, 2.5); add(scene, B.rock(2), 5.2, 0, 2.6, 1); add(scene, B.rock(5), -1, 0, 6, 2.4, .8);
add(scene, B.clam(), 2.6, 0, -5.2, .5); add(scene, B.chest(), -6.2, 0, -1.2, .6); add(scene, B.oxygen(), -2.8, 0, 3.6);
const TR = B.TRASH_KINDS;
for (let i = 0; i < 26; i++) { const a = i / 26 * 6.28 + hsh(i, 1), d = 9 + hsh(i, 2) * 3.5, x = Math.cos(a) * d, z = Math.sin(a) * d * .9; if (clean(x, z)) continue; add(scene, B.trash(TR[i % TR.length]), x, 0, z, hsh(i, 5) * 6, 1.5); }
const diver = add(scene, B.diver(), 0, .6, 0);
const buddies = [['clown', .9], ['turtle', 1.1]].map(([k, s]) => add(scene, B.creature(k, { friend: true }), 0, .7, 0, 0, s));
const shark = add(scene, B.shark(), 0, .3, 0);
const school = [0, 1, 2, 3, 4].map(i => add(scene, B.creature('clown', { color: [[1, .55, .2], [.3, .7, 1], [1, .85, .3], [.75, .5, 1], [.4, .9, .7]][i] }), 0, 1, 0, 0, .45));
const jelly = add(scene, B.jelly(), 5, .4, -6, 0, .9);
const robot = add(scene, B.robot(), 0, .8, 0);

// ---------- Lineup ----------
const lineup = makeScene(), labels = [];
const ITEMS = [
  ['Characters', 3.4, [
    ['Diver', () => B.diver(), .6, 1], ['Shark', () => B.shark(), .3, 1], ['Shark (dash)', () => B.shark({ top: [.45, .42, .62], angry: true }), .3, 1],
    ['Lumi · clownfish', () => B.creature('clown', { friend: true }), .7, 1.4], ['Nori · tang', () => B.creature('tang', { friend: true }), .7, 1.4], ['Mila · ray', () => B.creature('ray', { friend: true }), .6, 1.4],
  ]],
  ['Buddies', 3.4, [
    ['Tobi · turtle', () => B.creature('turtle', { friend: true }), .5, 1.4], ['Delfi · dolphin', () => B.creature('dolphin', { friend: true }), .7, 1.5], ['Bubo · seal (new)', () => B.creature('seal', { friend: true }), .6, 1.3],
    ['Ola · octopus (new)', () => B.creature('octopus', { friend: true }), .1, 1], ['Maya · whale (new)', () => B.creature('whale', { friend: true }), .9, 1], ['Reef fish (not buddy)', () => B.creature('tang', { color: [.95, .45, .7] }), .7, 1],
  ]],
  ['Trash', 2.2, [
    ['Bottle', () => B.trash('bottle'), 0, 2], ['Can', () => B.trash('can'), 0, 2], ['Bag', () => B.trash('bag'), 0, 2], ['Tire', () => B.trash('tire'), 0, 2],
    ['Barrel (leaking)', () => B.trash('barrel'), 0, 1.8], ['Boot (new)', () => B.trash('boot'), 0, 2], ['Crate (new)', () => B.trash('crate'), 0, 2],
  ]],
  ['Seabed', 2.6, [
    ['Arch', () => B.arch(), 0, .7], ['Rock', () => B.rock(3), 0, 1], ['Kelp', () => B.kelp(), 0, 1.2], ['Branch coral', () => B.coral('branch', CORAL[0]), 0, 1.5], ['Spike coral', () => B.coral('spike', CORAL[1]), 0, 1.4], ['Brain coral', () => B.coral('brain', CORAL[2]), 0, 1.5], ['Tube coral', () => B.coral('tube', CORAL[3]), 0, 1.6],
  ]],
  ['', 2.6, [
    ['Table coral', () => B.coral('table', CORAL[2]), 0, 1.4], ['Sea fan', () => B.coral('fan', CORAL[0]), 0, 1.6], ['Anemone', () => B.coral('anemone', CORAL[5]), 0, 1.7], ['Starfish', () => B.coral('star', CORAL[3]), 0, 1.8], ['Clam + pearl', () => B.clam(), 0, 1.6], ['Crystals', () => B.crystals(), 0, .9], ['Wreck', () => B.wreck(), 0, .8],
  ]],
  ['Pickups & gear', 2.6, [
    ['Chest (new)', () => B.chest(), 0, 1.3], ['Jellyfish', () => B.jelly(), 0, .9], ['O₂ bubble', () => B.oxygen(), 0, 1], ['Robot', () => B.robot(), .6, 1.4], ['Lure', () => B.lure(), .05, 1.4],
  ]],
];
const pads = [], placed = [];
let n = 0, row = 0;
for (const [cat, gap, items] of ITEMS) {
  const v = row * 3.4 - 8; row++;
  items.forEach(([name, make, y, s], i) => { const u = (i - (items.length - 1) / 2) * gap, p = at(u, v); placed.push({ name, make, y, s, p, n: ++n, cat: i === 0 ? cat : '' }); pads.push({ x: Math.round(p.x), z: Math.round(p.z) }); });
}
envTicks.push(B.environment(lineup, { n: 19, pads }));
const lab = document.getElementById('labels');
for (const it of placed) {
  const o = it.make(); add(lineup, o, it.p.x, it.y, it.p.z, FACE_RIGHT - .55, it.s); o.userData.spin = true;
  const box = new THREE.Box3().setFromObject(o), el = document.createElement('div'); el.className = 'lab'; el.innerHTML = `<b>${it.n}</b><span> ${it.name}</span>`; el.title = it.name; lab.appendChild(el);
  labels.push({ n: it.n, el, pos: new THREE.Vector3(it.p.x, Math.max(box.max.y, 1) + .25, it.p.z), obj: o, cat: it.cat });
  if (it.cat) { const h = document.createElement('div'); h.className = 'cat'; h.textContent = it.cat; lab.appendChild(h); labels.push({ el: h, pos: it.p.clone().add(RIGHT.clone().multiplyScalar(-2.2)).setY(0), cat: true }); }
}

// ---------- View, tabs, controls ----------
const camera = new THREE.PerspectiveCamera(26, 1, .5, 400);
const controls = new OrbitControls(camera, canvas); controls.enableDamping = true; controls.maxPolarAngle = 1.45;
let mode = 'scene', spin = false;
const VIEWS = { scene: { dist: 34, target: [0, .4, 0] }, lineup: { dist: 62, target: [0, .4, 0] } };
function home() { const v = VIEWS[mode], t = new THREE.Vector3(...v.target); controls.target.copy(t); camera.position.set(t.x + Math.sin(YAW) * Math.cos(EL) * v.dist, t.y + Math.sin(EL) * v.dist, t.z + Math.cos(YAW) * Math.cos(EL) * v.dist); controls.update(); }
function setMode(m) { mode = m; document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === m)); lab.style.display = m === 'lineup' ? '' : 'none'; home(); }
document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => setMode(b.dataset.mode));
document.getElementById('home').onclick = home;
document.getElementById('spin').onclick = e => { spin = !spin; e.target.classList.toggle('on', spin); };
const aaBtn = document.getElementById('aa'); aaBtn.classList.toggle('on', AA); aaBtn.textContent = AA ? 'Smooth edges: on' : 'Smooth edges: off';
aaBtn.onclick = () => { const q = new URLSearchParams(location.search); q.set('aa', AA ? '0' : '1'); location.search = q; };
function focus(n) { const L = labels.find(l => l.n === n); if (!L) return; const p = L.obj.position; controls.target.set(p.x, .6, p.z); camera.position.set(p.x + Math.sin(YAW) * Math.cos(EL) * 14, Math.sin(EL) * 14, p.z + Math.cos(YAW) * Math.cos(EL) * 14); controls.update(); }
lab.addEventListener('click', e => { const i = [...lab.children].indexOf(e.target.closest('.lab')); if (labels[i]?.n) focus(labels[i].n); });

function resize() { const w = innerWidth, h = innerHeight; renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize(); setMode(new URLSearchParams(location.search).get('view') === 'lineup' ? 'lineup' : 'scene');

const fpsEl = document.getElementById('fps'), v3 = new THREE.Vector3();
let t = 0, last = performance.now(), frames = 0, fpsT = 0;
function step(dt) {
  t += dt;
  for (const o of anim) o.userData.tick(t, 1);
  for (const e of envTicks) e?.(t);
  // Diver swims a figure-eight; buddies trail behind, the shark circles, fish school around.
  const a = t * .35, dx = Math.sin(a) * 4, dz = Math.sin(a * 2) * 2.2, vx = Math.cos(a) * 4, vz = Math.cos(a * 2) * 4.4;
  diver.position.x = dx; diver.position.z = dz; diver.rotation.y = Math.atan2(vx, vz);
  buddies.forEach((b, i) => { const q = a - .28 - i * .22, bx = Math.sin(q) * 4, bz = Math.sin(q * 2) * 2.2; b.position.set(bx + (i ? .6 : -.6), .7 + Math.sin(t * 3 + i) * .08, bz); b.rotation.y = Math.atan2(Math.cos(q) * 4, Math.cos(q * 2) * 4.4); });
  const sa = -t * .3; shark.position.set(Math.cos(sa) * 9.5, .3, Math.sin(sa) * 8.5); shark.rotation.y = Math.atan2(Math.sin(sa) * 9.5, -Math.cos(sa) * 8.5) + Math.PI;
  school.forEach((f, i) => { const q = t * .6 + i * .5; f.position.set(4 + Math.cos(q) * 1.6 + Math.sin(i) * .3, 1.2 + Math.sin(t * 2 + i) * .15, 3 + Math.sin(q) * 1.2); f.rotation.y = Math.atan2(-Math.sin(q), Math.cos(q)); });
  robot.position.set(dx - Math.sin(diver.rotation.y + 2.2) * 1.6, .8 + Math.sin(t * 3) * .08, dz - Math.cos(diver.rotation.y + 2.2) * 1.6); robot.rotation.y = diver.rotation.y;
  jelly.position.x = 5 + Math.sin(t * .3) * .8;
  for (const o of [diver, shark, robot, ...buddies, ...school]) if (o.userData.mark || o.userData.shadow) ground(o);
  for (const L of labels) if (L.obj && L.obj.userData.spin) L.obj.rotation.y = spin ? t * .6 : FACE_RIGHT - .55;
}
function frame(now) {
  requestAnimationFrame(frame); const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now; step(dt); controls.update();
  renderer.render(mode === 'scene' ? scene : lineup, camera);
  // Names only when there is room: zoomed in, or a wide screen.
  lab.classList.toggle('short', innerWidth / camera.position.distanceTo(controls.target) < 22);
  if (mode === 'lineup') for (const L of labels) { v3.copy(L.pos).project(camera); const vis = v3.z < 1 && Math.abs(v3.x) < 1.1 && Math.abs(v3.y) < 1.1; L.el.style.display = vis ? '' : 'none'; if (vis) L.el.style.transform = `translate(${(v3.x + 1) / 2 * innerWidth}px,${(1 - v3.y) / 2 * innerHeight}px) translate(-50%,-100%)`; }
  frames++; fpsT += dt; if (fpsT > .5) { fpsEl.textContent = `${Math.round(frames / fpsT)} fps · ${renderer.info.render.calls} draws`; frames = 0; fpsT = 0; }
}
requestAnimationFrame(frame);
window.__look = { step, renderer, camera, setMode, focus };
