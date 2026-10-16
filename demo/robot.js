// Robot helper candidates in the original (B) style, next to the current one, with glowing lights
// like the A variant's pickups.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as B from '../js/boxy.js';

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true });
const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xffffff, 0x6f8f9c, 2.4)); const sun = new THREE.DirectionalLight(0xfff4e0, 1); sun.position.set(6, 12, 5); scene.add(sun);
B.environment(scene, { n: 9 });

const solid = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });
const lit = new THREE.MeshBasicMaterial({ vertexColors: true }); // unlit = self-glowing lights
const lin = c => new THREE.Color().setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace);
function glowTex() { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); }
const GT = glowTex();
const glow = (col, s, o = .8) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: GT, color: lin(col), blending: THREE.AdditiveBlending, transparent: true, opacity: o, depthWrite: false })); sp.scale.setScalar(s); return sp; };
const mesh = (b, m = solid) => new THREE.Mesh(b.geometry(), m);
const at = (p, o, x, y, z) => { o.position.set(x, y, z); p.add(o); return o; };
// Suction cone under the robot: glowing ring that pulses while it cleans.
function suction(root, col, y = .05) { const b = new B.Builder(); b.ring(0, 0, 0, .32, .05, col, 20); const r = at(root, mesh(b, lit), 0, y, 0); return t => { const k = 1 + Math.sin(t * 8) * .12; r.scale.set(k, 1, k); }; }

// 1 · Buddy bot: chunky yellow body, big cyan screen face, spinning propeller, side thrusters.
function buddyBot() {
  const root = new THREE.Group(), body = at(root, new THREE.Group(), 0, .55, 0), m = new B.Builder(), Y = [1, .78, .12], O = [1, .45, .12], D = [.12, .16, .22];
  m.cube(0, 0, 0, .62, .48, .52, Y); m.cube(0, -.27, 0, .5, .08, .42, O); m.cube(0, .27, 0, .5, .06, .42, O);
  m.cube(0, .02, .27, .48, .32, .03, D);
  for (const s of [-1, 1]) { m.cube(s * .36, 0, 0, .12, .3, .3, O); m.at([s * .44, 0, -.02], [Math.PI / 2, 0, 0], 1, () => m.prism(0, -.18, 0, .08, .3, 8, [.85, .9, .95])); }
  m.prism(0, .3, 0, .03, .14, 6, D); m.prism(0, -.38, 0, .12, .1, 8, D, .16);
  body.add(mesh(m));
  const f = new B.Builder(); for (const s of [-1, 1]) f.cube(s * .11, .05, .29, .1, .1, .01, [.3, 1, .95]); f.cube(0, -.06, .29, .16, .03, .01, [.3, 1, .95]); for (const s of [-1, 1]) f.cube(s * .44, 0, -.18, .1, .1, .01, [.4, .9, 1]);
  const face = at(body, mesh(f, lit), 0, 0, 0);
  const prop = at(body, new THREE.Group(), 0, .45, 0), p = new B.Builder(); p.cube(0, 0, 0, .7, .03, .1, [1, .3, .4]); p.cube(0, 0, 0, .1, .05, .1, D); prop.add(mesh(p));
  for (const s of [-1, 1]) at(body, glow([.4, .9, 1], .45, .7), s * .44, 0, -.22);
  at(body, glow([.3, 1, .95], .9, .45), 0, 0, .35);
  const suck = suction(root, [.3, 1, .95]);
  return { root, label: 'Buddy bot', tick: t => { body.position.y = .55 + Math.sin(t * 3) * .06; prop.rotation.y = t * 18; face.scale.y = Math.sin(t * 1.3) > .97 ? .2 : 1; suck(t); } };
}

// 2 · Crab bot: coral-red shell, claw arms that snap at dirt, blinking beacon.
function crabBot() {
  const root = new THREE.Group(), body = at(root, new THREE.Group(), 0, .32, 0), m = new B.Builder(), R = [1, .3, .32], P = [1, .6, .45], D = [.12, .14, .2];
  m.ellipsoid(0, 0, 0, .4, .22, .34, R, 0, 8, 4); m.cube(0, -.06, .05, .62, .1, .5, P); m.cube(0, .02, .3, .3, .12, .06, D);
  for (const s of [-1, 1]) for (const z of [-.2, 0, .18]) m.box(s * .38, -.3, z, .05, .26, .05, D, 0, 0, s * .5);
  for (const s of [-1, 1]) m.prism(s * .1, .14, .18, .02, .2, 5, D);
  body.add(mesh(m));
  const e = new B.Builder(); for (const s of [-1, 1]) { e.ellipsoid(s * .1, .36, .18, .07, .07, .07, [1, 1, 1], 0, 6, 3); e.ellipsoid(s * .1, .36, .245, .035, .04, .02, D, 0, 6, 3); } e.cube(0, .02, .335, .2, .04, .01, [1, .9, .3]); body.add(mesh(e, lit));
  const claws = [-1, 1].map(s => { const c = at(body, new THREE.Group(), s * .3, 0, .22), b = new B.Builder(); b.cube(s * .1, 0, .12, .1, .1, .26, R); b.cube(s * .14, .04, .32, .16, .06, .14, P); b.cube(s * .14, -.04, .3, .16, .06, .12, shadeArr(P, .8)); c.add(mesh(b)); return c; });
  const beacon = at(body, mesh((() => { const b = new B.Builder(); b.gem(0, 0, 0, .07, .16, [1, .95, .3]); return b; })(), lit), 0, .2, -.05);
  const bGlow = at(body, glow([1, .9, .3], .7), 0, .3, -.05);
  const suck = suction(root, [1, .6, .3]);
  return { root, label: 'Crab bot', tick: t => { body.position.y = .32 + Math.abs(Math.sin(t * 6)) * .03; claws.forEach((c, i) => { c.rotation.y = Math.sin(t * 5 + i * Math.PI) * .25; }); bGlow.material.opacity = Math.sin(t * 6) > 0 ? .9 : .15; suck(t); } };
}
const shadeArr = (c, k) => c.map(v => v * k);

// 3 · Orb drone: magenta-and-cyan hover pod, one big eye, glowing ring jet below.
function orbBot() {
  const root = new THREE.Group(), body = at(root, new THREE.Group(), 0, .75, 0), m = new B.Builder(), M = [.95, .3, .75], C = [.2, .85, .95], D = [.1, .12, .2];
  m.ellipsoid(0, 0, 0, .34, .3, .34, M, 0, 8, 4); m.ellipsoid(0, -.04, 0, .37, .08, .37, C, 0, 8, 2); m.ellipsoid(0, .03, .2, .2, .2, .16, D, 0, 8, 4);
  for (const s of [-1, 1]) { m.cube(s * .42, 0, 0, .14, .08, .26, C); m.prism(s * .3, .2, 0, .025, .22, 5, D); }
  body.add(mesh(m));
  const e = new B.Builder(); e.ellipsoid(0, .04, .33, .11, .11, .04, [1, 1, 1], 0, 8, 4); e.ellipsoid(0, .04, .365, .055, .055, .02, [.1, .9, 1], 0, 6, 3); for (const s of [-1, 1]) e.ellipsoid(s * .3, .44, 0, .045, .045, .045, [1, .4, .85], 0, 6, 3);
  const eye = at(body, mesh(e, lit), 0, 0, 0);
  const jet = new B.Builder(); jet.ring(0, 0, 0, .14, .06, [.3, 1, .95], 16); at(body, mesh(jet, lit), 0, -.24, 0);
  at(body, glow([.3, 1, .95], .8, .7), 0, -.3, 0); at(body, glow([1, .4, .85], 1.1, .3), 0, 0, 0);
  const suck = suction(root, [.3, 1, .95]);
  return { root, label: 'Orb drone', tick: t => { body.position.y = .75 + Math.sin(t * 2.4) * .1; body.rotation.z = Math.sin(t * 1.7) * .08; eye.rotation.y = Math.sin(t * .9) * .3; suck(t); } };
}

// Current in-game robot for reference.
function current() { const root = new THREE.Group(), r = B.robot(); r.position.y = .55; root.add(r); return { root, label: 'Current', tick: t => { r.position.y = .55 + Math.sin(t * 3) * .08; } }; }

const bots = [current(), buddyBot(), crabBot(), orbBot()];
const YAW = Math.PI / 4, RIGHT = new THREE.Vector3(Math.cos(YAW), 0, -Math.sin(YAW)), labels = document.getElementById('labels');
bots.forEach((b, i) => {
  const u = (i - 1.5) * 2.6; b.root.position.copy(RIGHT).multiplyScalar(u); b.root.scale.setScalar(1.6); b.root.rotation.y = Math.atan2(RIGHT.x, RIGHT.z) - 1.1; scene.add(b.root);
  const el = document.createElement('div'); el.className = 'lab'; el.innerHTML = `<b>${i}</b> ${b.label}`; labels.appendChild(el); b.el = el;
});

const camera = new THREE.PerspectiveCamera(26, 1, .5, 200), controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true;
// Fit all four robots on narrow screens too.
const D = 22 * Math.max(1, 1.25 * innerHeight / innerWidth), EL = .62; camera.position.set(Math.sin(YAW) * Math.cos(EL) * D, Math.sin(EL) * D + .6, Math.cos(YAW) * Math.cos(EL) * D); controls.target.set(0, .6, 0); controls.update();
let spin = false; document.getElementById('spin').onclick = e => { spin = !spin; e.target.classList.toggle('on', spin); };
function resize() { renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
const v = new THREE.Vector3(); let t = 0, last = performance.now();
function frame(now) {
  requestAnimationFrame(frame); const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now; t += dt;
  for (const b of bots) { b.tick(t); if (spin) b.root.rotation.y += dt * .7; v.set(b.root.position.x, 2.4, b.root.position.z).project(camera); b.el.style.transform = `translate(${(v.x + 1) / 2 * innerWidth}px,${(1 - v.y) / 2 * innerHeight}px) translate(-50%,-100%)`; }
  controls.update(); renderer.render(scene, camera);
}
requestAnimationFrame(frame);
