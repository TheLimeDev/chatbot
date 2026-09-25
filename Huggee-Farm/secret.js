import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvasTex, shadowed } from './env.js';
import { huggyFace } from './characters.js';

// ---------- Disco ball (used for dancing and in the secret club) ----------
export function makeDiscoBall(r = 0.5) {
  const g = new THREE.Group();
  const ball = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 18), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.08, flatShading: true, envMapIntensity: 2.5 }));
  g.add(ball);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.2, 4), new THREE.MeshBasicMaterial({ color: 0x222222 })); cord.position.y = r + 0.6; g.add(cord);
  const lights = [0xff3dbb, 0x44ddff, 0xffd21e].map((c, i) => { const s = new THREE.SpotLight(c, 30, 14, 0.35, 0.5, 1.2); s.position.set(0, 0, 0); g.add(s); g.add(s.target); return s; });
  const sparkTex = canvasTex(64, 64, (c) => { const gr = c.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, '#fff'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); });
  const sparks = [];
  for (let i = 0; i < 24; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex, color: [0xff3dbb, 0x44ddff, 0xffd21e, 0xffffff][i % 4], transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.scale.setScalar(0.25); g.add(s); sparks.push(s); }
  g.userData = { ball, lights, sparks };
  return g;
}
export function animateDisco(d, t, radius = 3) {
  const u = d.userData; u.ball.rotation.y = t * 1.2;
  u.lights.forEach((l, i) => { const a = t * 1.5 + i * 2.09; l.target.position.set(Math.cos(a) * radius, -4, Math.sin(a) * radius); });
  u.sparks.forEach((s, i) => { const a = t * (0.6 + i % 3 * 0.3) + i * 0.8, r = radius * (0.4 + (i % 5) * 0.15); s.position.set(Math.cos(a) * r, -1.8 - (i % 4) * 0.5 + Math.sin(t * 3 + i) * 0.2, Math.sin(a) * r); s.material.opacity = 0.5 + Math.sin(t * 8 + i) * 0.5; });
}

// ---------- Little beat for dancing (WebAudio, no files) ----------
let ac, beatTimer;
export function startBeat() {
  ac = ac || new AudioContext(); ac.resume(); if (beatTimer) return;
  let step = 0; const bass = [55, 55, 65.4, 49];
  beatTimer = setInterval(() => {
    const now = ac.currentTime;
    if (step % 4 === 0) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(140, now); o.frequency.exponentialRampToValueAtTime(40, now + 0.15); g.gain.setValueAtTime(0.6, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.2); o.connect(g).connect(ac.destination); o.start(now); o.stop(now + 0.2); }
    if (step % 2 === 1) { const b = ac.createBuffer(1, 2205, 44100), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); f.type = 'highpass'; f.frequency.value = 7000; g.gain.value = 0.15; s.buffer = b; s.connect(f).connect(g).connect(ac.destination); s.start(now); }
    if (step % 8 === 0) { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sawtooth'; o.frequency.value = bass[(step / 8) % 4]; g.gain.setValueAtTime(0.08, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.9); const f = ac.createBiquadFilter(); f.frequency.value = 400; o.connect(f).connect(g).connect(ac.destination); o.start(now); o.stop(now + 0.9); }
    step++;
  }, 60000 / 120 / 2);
}
export function stopBeat() { clearInterval(beatTimer); beatTimer = null; }

// ---------- The secret Not-so-Huggy Market (underground) ----------
export const ROOM = new THREE.Vector3(0, -60, 0); export const ROOM_HALF = 11;
export function buildSecretMarket(scene) {
  const g = new THREE.Group(); g.position.copy(ROOM);
  const brick = canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#231a24'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) for (let x = (y / 32 % 2) * 32; x < w + 64; x += 64) { c.fillStyle = `hsl(${280 + Math.random() * 30},${15 + Math.random() * 10}%,${14 + Math.random() * 8}%)`; c.fillRect(x - 64 + 2, y + 2, 60, 28); } });
  brick.wrapS = brick.wrapT = THREE.RepeatWrapping; brick.repeat.set(4, 2);
  const wallM = new THREE.MeshStandardMaterial({ map: brick, roughness: 0.9, side: THREE.BackSide });
  const room = new THREE.Mesh(new THREE.BoxGeometry(ROOM_HALF * 2, 9, ROOM_HALF * 2), wallM); room.position.y = 4.5; room.receiveShadow = true; g.add(room);
  const tiles = canvasTex(512, 512, (c, w, h) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { c.fillStyle = (x + y) % 2 ? '#15121c' : '#2a2238'; c.fillRect(x * 64, y * 64, 64, 64); } });
  tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping; tiles.repeat.set(4, 4);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_HALF * 2, ROOM_HALF * 2), new THREE.MeshStandardMaterial({ map: tiles, roughness: 0.25, metalness: 0.3 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.01; floor.receiveShadow = true; g.add(floor);
  // neon sign
  const neon = canvasTex(1024, 256, (c, w, h) => { c.clearRect(0, 0, w, h); c.textAlign = 'center'; c.font = '900 110px "Brush Script MT", cursive, system-ui';
    c.shadowColor = '#ff3dbb'; c.shadowBlur = 30; c.fillStyle = '#ffd0f0'; c.fillText('Not-so-Huggy', w / 2, 120); c.shadowColor = '#44ddff'; c.fillStyle = '#d0f6ff'; c.font = '800 70px system-ui'; c.fillText('M A R K E T', w / 2, 215); });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(8, 2), new THREE.MeshBasicMaterial({ map: neon, transparent: true })); sign.position.set(0, 6.3, -ROOM_HALF + 0.05); g.add(sign);
  // counter
  const counter = new THREE.Mesh(new RoundedBoxGeometry(6, 1.1, 1.3, 3, 0.08), new THREE.MeshStandardMaterial({ color: 0x1a1420, roughness: 0.3, metalness: 0.5 })); counter.position.set(0, 0.55, -ROOM_HALF + 3.2); g.add(counter);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(6.02, 0.06, 1.32), new THREE.MeshBasicMaterial({ color: 0xff3dbb })); strip.position.set(0, 1.08, -ROOM_HALF + 3.2); g.add(strip);
  // shady merchant Huggy: hood, sunglasses, gold chain
  const m = new THREE.Group(); const R = 0.8;
  m.add(new THREE.Mesh(new THREE.SphereGeometry(R, 40, 28), new THREE.MeshStandardMaterial({ color: 0xffc928, roughness: 0.45 }))); huggyFace(m, R, false);
  const hood = new THREE.Mesh(new THREE.SphereGeometry(R * 1.1, 32, 20, Math.PI * 0.72, Math.PI * 1.56, 0, Math.PI * 0.62), new THREE.MeshStandardMaterial({ color: 0x3a2350, roughness: 0.9, side: THREE.DoubleSide })); hood.rotation.y = Math.PI; m.add(hood);
  const glassM = new THREE.MeshStandardMaterial({ color: 0x050505, metalness: 0.9, roughness: 0.05 });
  for (const s of [-1, 1]) { const l = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.2, 0.05, 2, 0.05), glassM); l.position.set(s * 0.21, 0.22, R * 0.94); l.rotation.y = s * 0.25; m.add(l); }
  const chain = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.035, 8, 40, Math.PI), new THREE.MeshStandardMaterial({ color: 0xffc400, metalness: 1, roughness: 0.2 })); chain.rotation.set(0.3, 0, Math.PI); chain.position.set(0, -0.3, 0.45); m.add(chain);
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.04, 20), chain.material); coin.rotation.x = Math.PI / 2; coin.position.set(0, -0.85, 0.72); m.add(coin);
  m.position.set(0, 1.9, -ROOM_HALF + 2); g.add(shadowed(m));
  // crates with glowing "stolen goods"
  const crateM = new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.9 });
  [[-7, -8], [-8, -6.5], [7.5, -8], [8, -5], [-8.5, 6], [8.5, 7]].forEach(([x, z], i) => { const c = new THREE.Mesh(new RoundedBoxGeometry(1.3, 1.1, 1.3, 2, 0.04), crateM); c.position.set(x, 0.55, z); c.rotation.y = i; g.add(shadowed(c)); });
  // ladder back up
  const ladder = new THREE.Group(), lm = new THREE.MeshStandardMaterial({ color: 0x6e4623 });
  for (const x of [-0.45, 0.45]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.08, 9, 0.08), lm); r.position.set(x, 4.5, 0); ladder.add(r); }
  for (let y = 0.4; y < 9; y += 0.5) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.06), lm); r.position.set(0, y, 0); ladder.add(r); }
  ladder.position.set(0, 0, ROOM_HALF - 0.2); g.add(ladder);
  const shaft = new THREE.SpotLight(0xfff2d0, 25, 12, 0.3, 0.6); shaft.position.set(0, 9, ROOM_HALF - 1); shaft.target.position.set(0, 0, ROOM_HALF - 1.5); g.add(shaft, shaft.target);
  // club lights + disco ball
  const disco = makeDiscoBall(0.8); disco.position.set(0, 7.2, 0); g.add(disco);
  const amb = new THREE.PointLight(0xa04dff, 30, 30, 1.2); amb.position.set(0, 6, 0); g.add(amb);
  const pink = new THREE.PointLight(0xff3dbb, 20, 12, 1.5); pink.position.set(0, 3, -ROOM_HALF + 3); g.add(pink);
  scene.add(g);
  return { group: g, disco, merchant: m, merchantPos: new THREE.Vector3(ROOM.x, ROOM.y, ROOM.z - ROOM_HALF + 4.6), ladderPos: new THREE.Vector3(ROOM.x, ROOM.y, ROOM.z + ROOM_HALF - 1.2) };
}

// hidden trapdoor behind the barn
export function makeHatch() {
  const g = new THREE.Group();
  const lid = new THREE.Mesh(new RoundedBoxGeometry(1.6, 0.1, 1.6, 2, 0.03), new THREE.MeshStandardMaterial({ color: 0x5a3d25, roughness: 1 })); lid.position.y = 0.05; g.add(lid);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 6, 16), new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.9, roughness: 0.4 })); ring.rotation.x = Math.PI / 2; ring.position.set(0.4, 0.12, 0); g.add(ring);
  for (const z of [-0.5, 0.5]) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.04, 0.12), new THREE.MeshStandardMaterial({ color: 0x3a2818 })); b.position.set(0, 0.11, z); g.add(b); }
  const glow = new THREE.PointLight(0xb05dff, 0, 4, 2); glow.position.y = 0.4; g.add(glow);
  g.userData.glow = glow;
  return shadowed(g);
}
