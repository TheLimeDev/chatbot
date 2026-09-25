import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvasTex, speckle, shadowed } from './env.js';

const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });
const yellow = M(0xffc928, { roughness: 0.45 });
const black = M(0x1a1208, { roughness: 0.3 });
const mouthRed = M(0x5a0d0a, { roughness: 0.5 });
const tongue = M(0xe8322d);
const blushM = M(0xffa21a, { roughness: 0.7 });
const denimTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#4f79b8'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < w; i += 2) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.08})`; g.fillRect(i, 0, 1, h); g.fillStyle = `rgba(0,0,40,${Math.random() * 0.12})`; g.fillRect(0, i, w, 1); } });
denimTex.wrapS = denimTex.wrapT = THREE.RepeatWrapping; denimTex.repeat.set(3, 3);
const denim = new THREE.MeshStandardMaterial({ map: denimTex, roughness: 0.9 });
const strawTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#d9a95e'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 6) for (let x = 0; x < w; x += 6) { g.fillStyle = (x + y) % 12 ? '#c79247' : '#e7bd76'; g.fillRect(x, y, 5, 5); } });
strawTex.wrapS = strawTex.wrapT = THREE.RepeatWrapping; strawTex.repeat.set(4, 2);
const straw = new THREE.MeshStandardMaterial({ map: strawTex, roughness: 1 });
const gold = M(0xd9a520, { metalness: 0.8, roughness: 0.3 });
const woodM = M(0xc08a4e, { roughness: 0.8 });
const steel = M(0xb8c2cc, { metalness: 0.9, roughness: 0.25 });

// Huggy head/body: the classic Huggy face
export function huggyFace(parent, R, open = true) {
  const eyeG = new THREE.SphereGeometry(R * 0.13, 20, 14);
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(eyeG, black); e.scale.set(1, 1.15, 0.45);
    const a = s * 0.33, b = 0.28; e.position.set(Math.sin(a) * R * Math.cos(b), Math.sin(b) * R, Math.cos(a) * R * Math.cos(b)); e.lookAt(e.position.clone().multiplyScalar(2)); parent.add(e);
    const hl = new THREE.Mesh(new THREE.SphereGeometry(R * 0.035, 8, 6), M(0xffffff)); hl.position.copy(e.position).multiplyScalar(1.03); hl.position.x += R * 0.04; hl.position.y += R * 0.04; parent.add(hl);
    const bl = new THREE.Mesh(new THREE.CircleGeometry(R * 0.11, 20), blushM);
    const c = s * 0.62; bl.position.set(Math.sin(c) * R * 0.96, R * 0.02, Math.cos(c) * R * 0.96); bl.position.multiplyScalar(1.01); bl.lookAt(bl.position.clone().multiplyScalar(2)); parent.add(bl);
  }
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(R * 0.3, 24, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mouthRed);
  mouth.scale.set(1, open ? 0.85 : 0.35, 0.35); mouth.position.set(0, -R * 0.1, R * 0.9); parent.add(mouth);
  const tg = new THREE.Mesh(new THREE.SphereGeometry(R * 0.14, 16, 10), tongue); tg.scale.set(1.2, 0.5, 0.5); tg.position.set(0, -R * 0.3, R * 0.93); parent.add(tg);
}

function limb(r, len, mat) { const g = new THREE.CapsuleGeometry(r, len, 6, 12); g.translate(0, -len / 2, 0); return new THREE.Mesh(g, mat); }

// ---- The Huggy Farmer (from the Monster-Code avatar) ----
export function makeFarmer() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const R = 0.8;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 32), yellow); ball.scale.y = 0.96; body.add(ball);
  huggyFace(body, R);
  // overalls: lower hemisphere shell + bib + straps + buttons + pocket
  const pants = new THREE.Mesh(new THREE.SphereGeometry(R * 1.025, 48, 24, 0, Math.PI * 2, Math.PI * 0.58, Math.PI * 0.42), denim); body.add(pants);
  const bib = new THREE.Mesh(new THREE.SphereGeometry(R * 1.03, 32, 16, -0.42, 0.84, Math.PI * 0.42, Math.PI * 0.18), denim); body.add(bib);
  const pocket = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.24, 0.05, 2, 0.03), M(0x3f68a6, { roughness: 0.9 })); pocket.position.set(0, -0.42, R * 0.9); pocket.rotation.x = 0.5; body.add(pocket);
  for (const s of [-1, 1]) {
    const strap = new THREE.Mesh(new THREE.TorusGeometry(R * 1.03, 0.05, 6, 40, 1.1), denim); strap.rotation.set(0, Math.PI / 2 + s * 0.35, 0); strap.position.set(0, 0, 0); strap.rotation.z = -Math.PI / 2 - 0.05; body.add(strap);
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 16), gold); btn.rotation.x = Math.PI / 2 - 0.3; btn.position.set(s * 0.3, -0.24, R * 0.96); body.add(btn);
  }
  // straw hat with band and sunflower
  const hat = new THREE.Group();
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.3, 0.06, 48), straw); hat.add(brim);
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), straw); crown.scale.y = 0.9; hat.add(crown);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.63, 0.63, 0.14, 40, 1, true), M(0x4a2e1a)); band.position.y = 0.08; hat.add(band);
  const flower = new THREE.Group();
  for (let i = 0; i < 12; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 6), M(0xffc400)); p.scale.set(1, 0.3, 2); p.position.set(Math.cos(i / 12 * 6.28) * 0.14, Math.sin(i / 12 * 6.28) * 0.14, 0); p.rotation.z = i / 12 * 6.28; p.lookAt(p.position.clone().multiplyScalar(3)); flower.add(p); }
  const ctr = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 10), M(0x5a3312)); ctr.scale.z = 0.5; flower.add(ctr);
  flower.position.set(-0.45, 0.2, 0.45); flower.rotation.y = -0.8; hat.add(flower);
  hat.position.set(0, R * 0.78, -0.08); hat.rotation.x = -0.22; hat.rotation.z = 0.08; body.add(hat);
  // arms
  const armL = new THREE.Group(), armR = new THREE.Group();
  for (const [arm, s] of [[armL, -1], [armR, 1]]) {
    const a = limb(0.13, 0.35, yellow); arm.add(a);
    const fist = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), yellow); fist.position.y = -0.55; arm.add(fist);
    arm.position.set(s * R * 0.92, -0.05, 0.15); arm.rotation.z = s * 0.4; arm.rotation.x = -0.6; body.add(arm);
  }
  // pitchfork in right hand
  const fork = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.2, 10), woodM); fork.add(pole);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.05), steel); bar.position.y = 1.12; fork.add(bar);
  for (const x of [-0.19, -0.065, 0.065, 0.19]) { const t = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.5, 8), steel); t.position.set(x, 1.38, 0); fork.add(t); }
  fork.position.set(0, -0.55, 0); fork.rotation.x = 0.6; armR.add(fork);
  // wheat bundle in left hand
  const wheat = new THREE.Group();
  for (let i = 0; i < 7; i++) { const st = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 5), M(0xc7a043)); st.add(stem);
    for (let k = 0; k < 6; k++) { const g = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), M(0xe8b544)); g.scale.y = 1.8; g.position.set(k % 2 ? 0.03 : -0.03, 0.5 + k * 0.06, 0); st.add(g); }
    st.rotation.z = (i - 3) * 0.1; st.rotation.x = (i % 3 - 1) * 0.1; wheat.add(st); }
  const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.5, 4), M(0x4c8a2b)); leaf.position.set(0.1, -0.1, 0); leaf.rotation.z = -0.6; wheat.add(leaf);
  wheat.position.set(0, -0.55, 0.05); wheat.rotation.x = 0.6; armL.add(wheat);
  // legs / boots
  const legL = new THREE.Group(), legR = new THREE.Group();
  for (const [leg, s] of [[legL, -1], [legR, 1]]) {
    const l = limb(0.13, 0.18, denim); leg.add(l);
    const boot = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.2, 0.42, 2, 0.08), M(0x6b3f1f, { roughness: 0.7 })); boot.position.set(0, -0.38, 0.06); leg.add(boot);
    leg.position.set(s * 0.32, -R * 0.72, 0); body.add(leg);
  }
  body.position.y = 1.35;
  shadowed(root);
  root.userData = { body, armL, armR, legL, legR, walk: 0 };
  return root;
}

export function animateBiped(o, speed, dt, t) {
  const u = o.userData; u.walk += dt * speed * 3.2;
  const sw = Math.sin(u.walk) * Math.min(speed / 3, 1);
  u.legL.rotation.x = sw * 0.8; u.legR.rotation.x = -sw * 0.8;
  u.armL.rotation.x = -0.6 - sw * 0.35; u.armR.rotation.x = -0.6 + sw * 0.35;
  u.body.position.y = 1.35 + Math.abs(Math.cos(u.walk)) * 0.12 * Math.min(speed / 3, 1) + Math.sin(t * 2) * 0.02;
  u.body.rotation.z = sw * 0.05;
}

// ---- Farm animals ----
function quad(bodyMat, { bodyS, headS, legH, legR = 0.09, legMat, headOff }) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const torso = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), bodyMat); torso.scale.set(...bodyS); body.add(torso);
  const head = new THREE.Group(); head.position.set(0, bodyS[1] * 0.5, bodyS[2] * 0.95 + headOff); body.add(head);
  const legs = [];
  for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const leg = new THREE.Group(); const l = limb(legR, legH, legMat); leg.add(l);
    const hoof = new THREE.Mesh(new THREE.CylinderGeometry(legR * 1.1, legR * 1.2, 0.1, 10), black); hoof.position.y = -legH - legR; leg.add(hoof);
    leg.position.set(x * bodyS[0] * 0.55, -bodyS[1] * 0.4, z * bodyS[2] * 0.55); body.add(leg); legs.push(leg); }
  body.position.y = legH + legR + bodyS[1] * 0.4 + 0.05;
  g.userData = { body, head, legs, walk: Math.random() * 9, baseY: body.position.y };
  return g;
}
function eyes(head, r, y, z, x) { for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), black); e.position.set(s * x, y, z); head.add(e); } }

export function makeCow() {
  const spots = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 14; i++) { g.fillStyle = '#1d1a18'; g.beginPath(); const x = Math.random() * w, y = Math.random() * h;
      for (let k = 0; k < 9; k++) { const a = k / 9 * 6.28, r = 25 + Math.random() * 30; g.lineTo(x + Math.cos(a) * r * 1.4, y + Math.sin(a) * r); } g.fill(); } });
  const hide = new THREE.MeshStandardMaterial({ map: spots, roughness: 0.8 });
  const c = quad(hide, { bodyS: [0.75, 0.7, 1.3], legH: 0.55, legR: 0.12, legMat: hide, headOff: 0.1 });
  const h = c.userData.head;
  const skull = new THREE.Mesh(new RoundedBoxGeometry(0.6, 0.6, 0.7, 3, 0.2), hide); h.add(skull);
  const snout = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.36, 0.3, 3, 0.14), M(0xf2a6a0)); snout.position.set(0, -0.14, 0.4); h.add(snout);
  for (const s of [-1, 1]) { const n = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), M(0x5a2a2a)); n.position.set(s * 0.12, -0.1, 0.56); h.add(n);
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.25, 8), M(0xeee3c8)); horn.position.set(s * 0.22, 0.38, -0.1); horn.rotation.z = -s * 0.5; h.add(horn);
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), hide); ear.scale.set(1.6, 0.5, 0.9); ear.position.set(s * 0.4, 0.15, -0.1); h.add(ear); }
  eyes(h, 0.055, 0.1, 0.33, 0.2);
  const udder = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 10), M(0xf2a6a0)); udder.position.set(0, -0.62, -0.3); c.userData.body.add(udder);
  const bell = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.18, 12, 1, true), gold); bell.position.set(0, -0.45, 0.1); h.add(bell);
  const tail = limb(0.03, 0.7, hide); tail.position.set(0, 0.3, -1.28); tail.rotation.x = 0.25; c.userData.body.add(tail);
  c.userData.kind = 'Cow'; c.userData.sound = 'Moo!'; return shadowed(c);
}

export function makeSheep() {
  const wool = M(0xf6f2e8, { roughness: 1 }), face = M(0x2a2420);
  const s = quad(new THREE.MeshStandardMaterial({ visible: false }), { bodyS: [0.6, 0.55, 0.85], legH: 0.35, legR: 0.07, legMat: face, headOff: 0.05 });
  for (let i = 0; i < 26; i++) { const p = new THREE.Mesh(new THREE.IcosahedronGeometry(rand1(0.28, 0.4), 1), wool);
    const v = new THREE.Vector3().randomDirection(); p.position.set(v.x * 0.5, v.y * 0.42, v.z * 0.72); s.userData.body.add(p); }
  const h = s.userData.head; const skull = new THREE.Mesh(new THREE.SphereGeometry(0.26, 20, 14), face); skull.scale.set(1, 1.1, 1.3); h.add(skull);
  for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 1), wool); p.position.set((i - 2.5) * 0.08, 0.27, -0.05 + (i % 2) * 0.08); h.add(p); }
  for (const x of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 6), face); e.scale.set(1.8, 0.5, 0.8); e.position.set(x * 0.3, 0.08, 0); h.add(e); }
  for (const x of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), M(0xffffff)); e.position.set(x * 0.13, 0.08, 0.26); h.add(e);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), black); p.position.set(x * 0.13, 0.08, 0.3); h.add(p); }
  s.userData.kind = 'Sheep'; s.userData.sound = 'Baa!'; return shadowed(s);
}

export function makePig() {
  const pink = M(0xf4a7ae, { roughness: 0.55 });
  const p = quad(pink, { bodyS: [0.6, 0.55, 0.9], legH: 0.25, legR: 0.09, legMat: pink, headOff: -0.05 });
  const h = p.userData.head; const skull = new THREE.Mesh(new THREE.SphereGeometry(0.38, 24, 16), pink); h.add(skull);
  const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.16, 0.14, 20), M(0xeb8d98)); snout.rotation.x = Math.PI / 2; snout.position.set(0, -0.05, 0.4); h.add(snout);
  for (const s of [-1, 1]) { const n = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), M(0x8a3a44)); n.position.set(s * 0.06, -0.05, 0.47); h.add(n);
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.22, 3), pink); ear.position.set(s * 0.22, 0.32, 0); ear.rotation.set(0.5, 0, -s * 0.3); h.add(ear); }
  eyes(h, 0.045, 0.1, 0.33, 0.15);
  const tail = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.025, 6, 16, 5), pink); tail.position.set(0, 0.2, -0.9); p.userData.body.add(tail);
  p.userData.kind = 'Pig'; p.userData.sound = 'Oink!'; return shadowed(p);
}

export function makeChicken() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const white = M(0xfbf7ee, { roughness: 0.9 }), orange = M(0xf09a20), red = M(0xd8262c);
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 14), white); torso.scale.set(0.9, 0.9, 1.2); body.add(torso);
  const head = new THREE.Group(); head.position.set(0, 0.32, 0.25); body.add(head);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), white));
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 8), orange); beak.rotation.x = Math.PI / 2; beak.position.set(0, 0, 0.18); head.add(beak);
  for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), red); c.position.set(0, 0.15, -0.04 + i * 0.05); head.add(c); }
  const wattle = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), red); wattle.scale.y = 1.6; wattle.position.set(0, -0.08, 0.13); head.add(wattle);
  eyes(head, 0.025, 0.04, 0.12, 0.08);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 8), white); tail.position.set(0, 0.18, -0.36); tail.rotation.x = -0.9; body.add(tail);
  const legs = [];
  for (const s of [-1, 1]) { const leg = new THREE.Group(); const l = limb(0.02, 0.2, orange); leg.add(l); leg.position.set(s * 0.1, -0.2, 0); body.add(leg); legs.push(leg); }
  body.position.y = 0.46;
  g.userData = { body, head, legs, walk: Math.random() * 9, baseY: 0.46, kind: 'Chicken', sound: 'Cluck!', hop: true };
  return shadowed(g);
}

export function animateQuad(o, speed, dt, t) {
  const u = o.userData; u.walk += dt * speed * (u.hop ? 14 : 6);
  const k = Math.min(speed * 2, 1);
  u.legs.forEach((l, i) => (l.rotation.x = Math.sin(u.walk + (i % 3 ? Math.PI : 0)) * 0.6 * k));
  u.body.position.y = u.baseY + Math.abs(Math.sin(u.walk)) * (u.hop ? 0.06 : 0.03) * k;
  u.head.rotation.x = u.grazing ? 0.7 + Math.sin(t * 4) * 0.08 : Math.sin(t * 1.3 + u.walk) * 0.05;
}
function rand1(a, b) { return a + Math.random() * (b - a); }

// ---- Model pets: 3D Huggies with a hat that fits the model task ----
export function makeModelHuggy(task) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const R = 0.55; body.add(new THREE.Mesh(new THREE.SphereGeometry(R, 40, 28), yellow)); huggyFace(body, R);
  const legs = [];
  for (const s of [-1, 1]) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10), yellow); f.scale.set(1, 0.7, 1.3); f.position.set(s * 0.25, -R * 0.95, 0.05); body.add(f); legs.push(f);
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), yellow); h.position.set(s * R * 0.98, -0.1, 0.18); body.add(h); }
  const t = task || '';
  if (t.includes('text-generation') || t === 'text2text-generation') { // wizard hat
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.9, 32), M(0x3b2a8a)); hat.position.y = R + 0.3; hat.rotation.z = 0.15; body.add(hat);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.04, 32), M(0x3b2a8a)); brim.position.y = R - 0.12; body.add(brim);
    for (let i = 0; i < 5; i++) { const st = new THREE.Mesh(new THREE.OctahedronGeometry(0.05), gold); st.position.set(Math.cos(i * 1.3) * 0.25, R + 0.05 + i * 0.12, Math.sin(i * 1.3) * 0.25 * (1 - i * 0.15)); body.add(st); }
  } else if (t.includes('image-text') || t.includes('vision') || t.includes('detection') || t.includes('classification')) { // glasses
    for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.02, 8, 24), black); r.position.set(s * 0.17, 0.16, R * 0.92); body.add(r); }
    const br = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.02), black); br.position.set(0, 0.17, R * 0.95); body.add(br);
  } else if (t.includes('speech') || t.includes('audio')) { // headphones
    const band = new THREE.Mesh(new THREE.TorusGeometry(R * 1.02, 0.04, 8, 32, Math.PI), M(0x222222)); band.rotation.y = Math.PI / 2; band.rotation.x = 0; body.add(band);
    for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 20), M(0xe0433b)); c.rotation.z = Math.PI / 2; c.position.set(s * R, 0, 0); body.add(c); }
  } else if (t.includes('image') || t.includes('video')) { // painter beret
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 12), M(0xd8262c)); b.scale.set(1, 0.3, 1); b.position.set(0.08, R - 0.02, -0.05); b.rotation.z = -0.2; body.add(b);
  } else { // party hat
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 24), M(0x2bb673)); hat.position.y = R + 0.18; body.add(hat);
  }
  body.position.y = R + 0.1;
  root.userData = { body, legs, walk: 0, baseY: R + 0.1 };
  return shadowed(root);
}
export function animateModelHuggy(o, speed, dt, t) {
  const u = o.userData; u.walk += dt * (2 + speed * 6);
  u.body.position.y = u.baseY + Math.abs(Math.sin(u.walk)) * (0.08 + speed * 0.1);
  u.body.rotation.z = Math.sin(u.walk) * 0.08;
}

// Huggy Farmer dance moves: 0 = disco point, 1 = spin, 2 = wiggle
export function animateDance(o, t, move) {
  const u = o.userData, b = t * Math.PI * 4; // 120 bpm
  u.body.position.y = 1.35 + Math.abs(Math.sin(b / 2)) * 0.35;
  if (move === 0) { const up = Math.sin(b / 2) > 0;
    u.armR.rotation.set(up ? -2.8 : -0.6, 0, up ? 0.3 : 0.4); u.armL.rotation.set(up ? -0.4 : -2.8, 0, up ? -0.4 : -0.3);
    u.body.rotation.z = up ? -0.15 : 0.15; u.body.rotation.y = 0; }
  else if (move === 1) { u.body.rotation.y = t * 7; u.body.rotation.z = 0; u.armL.rotation.set(-1.6, 0, -1.2); u.armR.rotation.set(-1.6, 0, 1.2); }
  else { u.body.rotation.y = Math.sin(b / 2) * 0.5; u.body.rotation.z = Math.sin(b) * 0.2; u.armL.rotation.set(-1 + Math.sin(b) * 0.8, 0, -0.5); u.armR.rotation.set(-1 - Math.sin(b) * 0.8, 0, 0.5); }
  u.legL.rotation.x = Math.sin(b) * 0.5; u.legR.rotation.x = -Math.sin(b) * 0.5;
}
export function resetPose(o) { const u = o.userData; u.body.rotation.set(0, 0, 0); u.armL.rotation.set(-0.6, 0, -0.4); u.armR.rotation.set(-0.6, 0, 0.4); }
