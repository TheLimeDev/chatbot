import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvasTex, shadowed, heightAt } from './env.js';

// ---------- Cute Boomslang snake (from the Monster-Code/Boomslang model card art) ----------
const SEG = 26;
const segGeo = (() => { // sphere with a cream belly baked into vertex colours
  const g = new THREE.SphereGeometry(1, 20, 14), c = [], p = g.attributes.position;
  const green = new THREE.Color(0x3fa51c), belly = new THREE.Color(0xdcec8a), top = new THREE.Color(0x2c8a14);
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); const col = y < -0.25 ? belly.clone().lerp(green, (y + 1) / 0.75 * 0.4) : green.clone().lerp(top, Math.max(0, y)); c.push(col.r, col.g, col.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); return g; })();
const scaleTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 * 8; x < w; x += 16) { const gr = g.createRadialGradient(x, y, 1, x, y, 10); gr.addColorStop(0, '#a0a0a0'); gr.addColorStop(1, '#606060'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); } });
scaleTex.colorSpace = THREE.NoColorSpace; scaleTex.wrapS = scaleTex.wrapT = THREE.RepeatWrapping; scaleTex.repeat.set(3, 3);
const skin = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.3, bumpMap: scaleTex, bumpScale: 0.6 });
const white = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.1, clearcoat: 1 });
const pupil = new THREE.MeshPhysicalMaterial({ color: 0x0c1412, roughness: 0.05, clearcoat: 1 });
const shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
const blush = new THREE.MeshStandardMaterial({ color: 0xffa6a0, transparent: true, opacity: 0.7, roughness: 1 });
const snoutM = new THREE.MeshStandardMaterial({ color: 0xf0d27a, roughness: 0.6 });
const smileM = new THREE.MeshStandardMaterial({ color: 0x2c4a1a });

export function makeSnake(size = 1) {
  const g = new THREE.Group(); const segs = [];
  for (let i = 0; i < SEG; i++) { const m = new THREE.Mesh(segGeo, skin); const r = size * (0.2 - 0.14 * Math.pow(i / SEG, 1.6)); m.scale.setScalar(r); m.castShadow = true; g.add(m); segs.push(m); }
  const head = new THREE.Group(); g.add(head);
  const skull = new THREE.Mesh(segGeo, skin); skull.scale.set(0.3, 0.24, 0.32).multiplyScalar(size); head.add(skull); skull.castShadow = true;
  const snout = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), snoutM); snout.scale.set(0.12, 0.07, 0.08).multiplyScalar(size); snout.position.set(0, -0.03, 0.27).multiplyScalar(size); head.add(snout);
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.11 * size, 20, 14), white); e.position.set(s * 0.16, 0.08, 0.17).multiplyScalar(size); head.add(e);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.085 * size, 20, 14), pupil); p.position.set(s * 0.165, 0.08, 0.2).multiplyScalar(size); head.add(p);
    const h1 = new THREE.Mesh(new THREE.SphereGeometry(0.03 * size, 8, 6), shine); h1.position.set(s * 0.15 + 0.03, 0.13, 0.28).multiplyScalar(size); head.add(h1);
    const h2 = new THREE.Mesh(new THREE.SphereGeometry(0.014 * size, 8, 6), shine); h2.position.set(s * 0.19 - 0.02, 0.04, 0.285).multiplyScalar(size); head.add(h2);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.06 * size, 12, 8), blush); b.scale.set(1, 0.6, 0.3); b.position.set(s * 0.22, -0.06, 0.18).multiplyScalar(size); head.add(b);
    const n = new THREE.Mesh(new THREE.SphereGeometry(0.012 * size, 6, 4), smileM); n.position.set(s * 0.035, 0.0, 0.345).multiplyScalar(size); head.add(n);
  }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.1 * size, 0.009 * size, 6, 20, Math.PI * 0.8), smileM); smile.rotation.z = Math.PI + Math.PI * 0.1; smile.position.set(0, -0.02, 0.29).multiplyScalar(size); head.add(smile);
  g.userData = { segs, head, size, trail: [] };
  return g;
}

// pose a snake as a coil with its head raised (like the card art)
export function poseCoil(sn, t, phase = 0) {
  const { segs, head, size } = sn.userData;
  const pts = [];
  for (let i = 0; i <= SEG; i++) {
    const u = i / SEG;
    if (u < 0.35) { // raised neck: from coil centre up to the head
      const k = u / 0.35; const sway = Math.sin(t * 1.6 + phase) * 0.08 * (1 - k);
      pts.push(new THREE.Vector3(sway, (0.75 - k * 0.6) * size, 0.1 * size * (1 - k)));
    } else { const k = (u - 0.35) / 0.65, a = k * Math.PI * 3.4 + phase, r = (0.22 + k * 0.28) * size;
      pts.push(new THREE.Vector3(Math.cos(a) * r, 0.14 * size * (1 - k * 0.3), Math.sin(a) * r)); }
  }
  pts[pts.length - 1].y += Math.sin(t * 3 + phase) * 0.05 * size; // tail tip wiggle
  for (let i = 0; i < SEG; i++) segs[i].position.copy(pts[i + 1]);
  head.position.set(pts[0].x, pts[0].y + 0.1 * size, pts[0].z + 0.05 * size);
  head.rotation.set(-0.1 + Math.sin(t * 1.1 + phase) * 0.08, Math.sin(t * 0.7 + phase) * 0.4, Math.sin(t * 1.3 + phase) * 0.1);
}

// slither along a path of recent head positions (used when a snake follows you)
export function slither(sn, headPos, heading, t, speed) {
  const u = sn.userData, tr = u.trail, sp = 0.13 * u.size;
  if (!tr.length || tr[0].distanceTo(headPos) > 0.03) { tr.unshift(headPos.clone()); if (tr.length > 400) tr.pop(); }
  u.head.position.set(headPos.x, headPos.y + 0.22 * u.size, headPos.z); u.head.rotation.set(0.1, heading, 0);
  let acc = 0, j = 0;
  for (let i = 0; i < SEG; i++) { const want = (i + 1) * sp;
    while (j < tr.length - 1 && acc + tr[j].distanceTo(tr[j + 1]) < want) { acc += tr[j].distanceTo(tr[j + 1]); j++; }
    const p = tr[Math.min(j, tr.length - 1)]; const wig = Math.sin(t * 8 - i * 0.6) * 0.06 * u.size * Math.min(speed, 1);
    u.segs[i].position.set(p.x + Math.cos(heading) * wig, p.y + u.segs[i].scale.x * 0.8, p.z - Math.sin(heading) * wig); }
}

// ---------- Farmers Market stall ----------
export function makeStall(title, subtitle, price) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ map: plankTex('#9a6a3c'), roughness: 0.85 });
  const darkWood = new THREE.MeshStandardMaterial({ map: plankTex('#6e4623'), roughness: 0.9 });
  const W = 4.6, D = 2;
  for (const [x, z] of [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2]]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.16, z > 0 ? 2.7 : 3.1, 0.16), darkWood); p.position.set(x, (z > 0 ? 2.7 : 3.1) / 2, z); g.add(p); }
  const counter = new THREE.Mesh(new RoundedBoxGeometry(W, 1, D * 0.8, 2, 0.04), wood); counter.position.set(0, 0.5, 0.15); g.add(counter);
  const top = new THREE.Mesh(new RoundedBoxGeometry(W + 0.2, 0.08, D * 0.85, 2, 0.03), darkWood); top.position.set(0, 1.04, 0.15); g.add(top);
  // striped canvas awning with scalloped edge
  const stripes = canvasTex(512, 256, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#f7f1e3' : '#3f9a4a'; c.fillRect(i * w / 8, 0, w / 8, h); } });
  const cloth = new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.95, side: THREE.DoubleSide });
  const aw = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.5, 2.5, 1, 8), cloth);
  { const p = aw.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setZ(i, -Math.pow((y + 1.25) / 2.5, 1.4) * 0.3); } aw.geometry.computeVertexNormals(); }
  aw.rotation.x = -Math.PI / 2 + 0.2; aw.position.set(0, 2.95, 0.05); g.add(aw);
  for (let i = 0; i < 8; i++) { const sc = new THREE.Mesh(new THREE.CircleGeometry(0.3, 16, 0, Math.PI), new THREE.MeshStandardMaterial({ color: i % 2 ? 0xf7f1e3 : 0x3f9a4a, side: THREE.DoubleSide }));
    sc.rotation.z = Math.PI; sc.position.set(-W / 2 - 0.25 + (i + 0.5) * (W + 0.5) / 8, 2.7, 1.3); g.add(sc); }
  // hanging sign
  const signT = canvasTex(1024, 256, (c, w, h) => { c.fillStyle = '#f3e3bf'; c.fillRect(0, 0, w, h); c.strokeStyle = '#5a3a1a'; c.lineWidth = 14; c.strokeRect(7, 7, w - 14, h - 14);
    c.fillStyle = '#2f6f2a'; c.font = '800 110px Georgia, serif'; c.textAlign = 'center'; c.fillText(title, w / 2, 130); c.fillStyle = '#5a3a1a'; c.font = 'italic 48px Georgia, serif'; c.fillText(subtitle, w / 2, 205); });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(3, 0.75, 0.06), [darkWood, darkWood, darkWood, darkWood, new THREE.MeshStandardMaterial({ map: signT, roughness: 0.8 }), darkWood]);
  sign.position.set(0, 2.25, 1.02); g.add(sign);
  // chalkboard price
  const chalk = canvasTex(256, 200, (c, w, h) => { c.fillStyle = '#23302a'; c.fillRect(0, 0, w, h); c.fillStyle = '#f2f2e8'; c.textAlign = 'center';
    c.font = '600 30px "Comic Sans MS", cursive'; c.fillText('Adopt one!', w / 2, 55); c.font = '800 60px "Comic Sans MS", cursive'; c.fillText(price, w / 2, 130); c.font = '26px "Comic Sans MS", cursive'; c.fillText('per snake', w / 2, 170); });
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.05), [darkWood, darkWood, darkWood, darkWood, new THREE.MeshStandardMaterial({ map: chalk, roughness: 0.95 }), darkWood]);
  board.position.set(W / 2 + 0.7, 0.7, 0.9); board.rotation.set(-0.2, -0.3, 0); g.add(board);
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.2, 0.06), darkWood); leg.position.set(W / 2 + 0.7, 0.55, 0.75); leg.rotation.x = 0.3; g.add(leg);
  // woven baskets on the counter (snakes sit in them)
  const basketT = canvasTex(256, 128, (c, w, h) => { c.fillStyle = '#b07d3e'; c.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 12) for (let x = (y / 12 % 2) * 12; x < w; x += 24) { c.fillStyle = '#8a5c28'; c.fillRect(x, y, 12, 12); } });
  basketT.wrapS = THREE.RepeatWrapping; basketT.repeat.set(4, 1);
  const bm = new THREE.MeshStandardMaterial({ map: basketT, roughness: 1, side: THREE.DoubleSide });
  const spots = [];
  for (const x of [-1.45, 0, 1.45]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.5, 0.35, 28, 1, true), bm); b.position.set(x, 1.25, 0.25); g.add(b);
    const bot = new THREE.Mesh(new THREE.CircleGeometry(0.5, 28), bm); bot.rotation.x = -Math.PI / 2; bot.position.set(x, 1.09, 0.25); g.add(bot);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.04, 8, 32), new THREE.MeshStandardMaterial({ color: 0x8a5c28 })); rim.rotation.x = Math.PI / 2; rim.position.set(x, 1.42, 0.25); g.add(rim);
    spots.push(new THREE.Vector3(x, 1.12, 0.25)); }
  // crates + a potted plant for a lived-in look
  const crate = new THREE.Mesh(new RoundedBoxGeometry(0.8, 0.6, 0.6, 2, 0.03), wood); crate.position.set(-W / 2 - 0.6, 0.3, 0.3); crate.rotation.y = 0.3; g.add(crate);
  const crate2 = crate.clone(); crate2.position.set(-W / 2 - 0.55, 0.9, 0.3); crate2.rotation.y = -0.1; crate2.scale.setScalar(0.8); g.add(crate2);
  const lamp = new THREE.PointLight(0xffd9a0, 3, 6, 1.5); lamp.position.set(0, 2.5, 0.6); g.add(lamp);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff2c0 })); bulb.position.copy(lamp.position); g.add(bulb);
  shadowed(g); aw.receiveShadow = true;
  g.userData.spots = spots;
  return g;
}
function plankTex(base) {
  const t = canvasTex(256, 256, (c, w, h) => { c.fillStyle = base; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) { c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, y, w, 2); for (let k = 0; k < 20; k++) { c.fillStyle = `rgba(${Math.random() < .5 ? '0,0,0' : '255,230,200'},${Math.random() * .1})`; c.fillRect(Math.random() * w, y + Math.random() * 30, Math.random() * 80, 1.5); } } });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

// market entrance arch
export function makeArch(text) {
  const g = new THREE.Group(), wood = new THREE.MeshStandardMaterial({ map: plankTex('#6e4623'), roughness: 0.9 });
  for (const x of [-2.4, 2.4]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 4, 10), wood); p.position.set(x, 2, 0); g.add(p); }
  const t = canvasTex(1024, 200, (c, w, h) => { c.fillStyle = '#f3e3bf'; c.fillRect(0, 0, w, h); c.strokeStyle = '#5a3a1a'; c.lineWidth = 12; c.strokeRect(6, 6, w - 12, h - 12);
    c.fillStyle = '#7a3b12'; c.font = '800 100px Georgia, serif'; c.textAlign = 'center'; c.fillText(text, w / 2, 135); });
  const b = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1, 0.12), [wood, wood, wood, wood, new THREE.MeshStandardMaterial({ map: t }), new THREE.MeshStandardMaterial({ map: t })]); b.position.y = 3.9; g.add(b);
  for (let i = 0; i < 9; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.3, 3), new THREE.MeshStandardMaterial({ color: [0xe84a3c, 0xf5c233, 0x3f9a4a][i % 3], side: THREE.DoubleSide })); f.rotation.x = Math.PI; f.position.set(-2.2 + i * 0.55, 3.2 - Math.sin(i / 8 * Math.PI) * 0.25, 0); g.add(f); }
  return shadowed(g);
}
