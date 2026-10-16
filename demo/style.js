// Side-by-side style test: the same little reef patch drawn with the remake's models (A)
// and with the original-style boxy models (B).
import * as THREE from 'three';
import { initMaterials, mats, buildDiver, buildShark, fishGeometry as smoothFish, coralGeometries as smoothCorals, buildArch } from '../js/models.js';
import { Builder, diverGeometry, nozzleGeometry, fishGeometry, friendMarkGeometry, sharkGeometry, coralGeometries, archGeometry } from '../js/boxy.js';

initMaterials();
const YAW = Math.PI / 4, EL = .68, DIST = 24;
const CORAL = [0xf25ca1, 0x876be8, 0x36d9b5, 0xfa9952, 0xffe066, 0x4fb3ff];
const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(7);
const coralSpots = Array.from({ length: 26 }, (_, i) => { const a = rnd() * 6.28, d = 1.4 + rnd() * 3.6; return { x: Math.cos(a) * d, z: Math.sin(a) * d, type: i % 6, col: CORAL[i % CORAL.length], rot: rnd() * 6, s: .8 + rnd() * .5 }; });
const isClean = (x, z) => Math.hypot(x, z * 1.2) < 5.2 + Math.sin(x * 1.7) * .6;

function floorGeometry() {
  const m = new Builder(), h = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
  for (let x = -9; x <= 9; x++) for (let z = -9; z <= 9; z++) {
    const s = h(x, z), clean = isClean(x, z), c = clean ? [.13, .67, .63].map(v => Math.min(1, v + s * .09)) : [.055 + s * .025, .1 + s * .025, .135 + s * .03];
    m.quad([x - .5, 0, z - .5], [x - .5, 0, z + .5], [x + .5, 0, z + .5], [x + .5, 0, z - .5], c);
    if (!clean && s > .62) m.disc(x, .012, z, .3 + s * .15, [.035, .065, .085], 9);
    if (!clean && s > .8) m.box(x, .01, z, .45, .08 + s * .1, .35, [.07, .12, .16], s * 3);
  }
  return m.geometry();
}

function makeView(el, variant) {
  const canvas = document.createElement('canvas'); el.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: variant === 'A' });
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x062b3b); scene.fog = new THREE.FogExp2(0x062b3b, .008);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6f8f9c, 2.4)); const sun = new THREE.DirectionalLight(0xfff4e0, 1); sun.position.set(6, 12, 5); scene.add(sun);
  const camera = new THREE.PerspectiveCamera(26, 1, .5, 300);
  camera.position.set(Math.sin(YAW) * Math.cos(EL) * DIST, Math.sin(EL) * DIST, Math.cos(YAW) * Math.cos(EL) * DIST); camera.lookAt(0, .4, 0);
  const flat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });
  scene.add(new THREE.Mesh(floorGeometry(), flat));
  const v = { renderer, scene, camera, variant, scale: variant === 'A' ? Math.min(devicePixelRatio, 2) : .6, el, dyn: [] };

  if (variant === 'A') {
    const arch = buildArch(); arch.scale.setScalar(.75); arch.position.set(-2.4, 0, -2.2); arch.rotation.y = .8; scene.add(arch);
    const geos = smoothCorals();
    for (const c of coralSpots) if (isClean(c.x, c.z)) { const mesh = new THREE.Mesh(geos[c.type], mats.flat.clone()); mesh.material.vertexColors = true; mesh.material.color.set(c.col); mesh.position.set(c.x, 0, c.z); mesh.rotation.y = c.rot; mesh.scale.setScalar(c.s); scene.add(mesh); }
    v.diver = buildDiver({ color: 0xff8a3d, accent: 0x3fe0c5 }); scene.add(v.diver);
    v.shark = buildShark(); scene.add(v.shark);
    v.fish = [0xff8f3a, 0x37a6ff, 0xb48cff].map(col => { const m = new THREE.Mesh(smoothFish(), mats.flat.clone()); m.material.color.set(col); m.scale.setScalar(1.6); scene.add(m); return m; });
  } else {
    const arch = new THREE.Mesh(archGeometry(), flat); arch.scale.setScalar(.75); arch.position.set(-2.4, 0, -2.2); arch.rotation.y = .8; scene.add(arch);
    const geos = coralGeometries();
    for (const c of coralSpots) if (isClean(c.x, c.z)) { const mesh = new THREE.Mesh(geos[c.type], new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide, color: c.col })); mesh.position.set(c.x, 0, c.z); mesh.rotation.y = c.rot; mesh.scale.setScalar(c.s); scene.add(mesh); }
    v.diver = new THREE.Mesh(diverGeometry(), flat); scene.add(v.diver);
    v.nozzle = new THREE.Mesh(nozzleGeometry(), flat); scene.add(v.nozzle);
    v.shark = new THREE.Mesh(sharkGeometry(), flat); scene.add(v.shark);
    v.fish = [['clown', [1, .56, .22]], ['tang', [.22, .65, 1]], ['ray', [.69, .55, .98]]].map(([kind, col]) => { const g = new THREE.Group(), m = new THREE.Mesh(fishGeometry(kind, col, { friend: true }), flat); g.add(m); const mark = new THREE.Mesh(friendMarkGeometry(.5), flat); g.add(mark); g.userData = { m, mark, kind, col }; scene.add(g); return g; });
  }
  v.flat = flat; return v;
}

const views = [makeView(document.getElementById('a'), 'A'), makeView(document.getElementById('b'), 'B')];
document.getElementById('px').onclick = e => { const b = e.target.closest('button'); if (!b) return; views[1].scale = +b.dataset.s; document.querySelectorAll('#px button').forEach(x => x.classList.toggle('on', x === b)); resize(); };

function resize() { for (const v of views) { const r = v.el.getBoundingClientRect(); v.renderer.setPixelRatio(v.scale); v.renderer.setSize(r.width, r.height, false); v.camera.aspect = r.width / r.height; v.camera.updateProjectionMatrix(); } }
addEventListener('resize', resize); resize();

let t = 0, last = performance.now(), slow = 0;
function frame(now) {
  requestAnimationFrame(frame); const dt = Math.min(.05, (now - last) / 1000); last = now; t += dt; slow += dt;
  for (const v of views) {
    const da = t * .5, dx = Math.cos(da) * 1.6, dz = Math.sin(da) * 1.2, yaw = Math.atan2(-Math.sin(da) * 1.6, Math.cos(da) * 1.2);
    v.diver.position.set(dx, .12 + Math.sin(t * 3) * .08, dz); v.diver.rotation.y = yaw;
    const sa = -t * .35, sx = Math.cos(sa) * 4.4, sz = Math.sin(sa) * 4.4; v.shark.position.set(sx, .45, sz); v.shark.rotation.y = Math.atan2(Math.sin(sa), -Math.cos(sa));
    v.fish.forEach((f, i) => { const a = t * (.9 + i * .2) + i * 2.1, r = 1.1 + i * .35; f.position.set(dx + Math.cos(a) * r, .7 + Math.sin(t * 2 + i) * .12, dz + Math.sin(a) * r); f.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a)); });
    if (v.variant === 'A') { v.diver.userData.legs?.forEach((l, i) => l.rotation.x = Math.sin(t * 8 + i * Math.PI) * .4); if (v.shark.userData.tail) v.shark.userData.tail.rotation.y = Math.sin(t * 7) * .35; }
    else if (slow > .05) {
      v.diver.geometry.dispose(); v.diver.geometry = diverGeometry({ kick: Math.sin(t * 8) * .4, arm: Math.sin(t * 5) * .1 });
      v.nozzle.position.set(dx + Math.sin(yaw) * .95, .14, dz + Math.cos(yaw) * .95); v.nozzle.rotation.y = yaw;
      v.shark.geometry.dispose(); v.shark.geometry = sharkGeometry({ t });
      v.fish.forEach((f, i) => { f.userData.m.geometry.dispose(); f.userData.m.geometry = fishGeometry(f.userData.kind, f.userData.col, { friend: true, t: t + i }); f.userData.mark.position.y = -f.position.y + .02; });
    }
    v.renderer.render(v.scene, v.camera);
  }
  if (slow > .05) slow = 0;
}
requestAnimationFrame(frame);
