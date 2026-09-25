import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// ---------- renderer / scene ----------
export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.55;
document.body.appendChild(renderer.domElement);

export const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xd6e6ee, 60, 230);
export const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(38, 24, 46);
// ---------- sky + light: follows the player's real local time ----------
const sky = new Sky(); sky.scale.setScalar(4500); scene.add(sky);
const U = sky.material.uniforms; U.turbidity.value = 6; U.rayleigh.value = 1.6; U.mieCoefficient.value = 0.004; U.mieDirectionalG.value = 0.85;
const pmrem = new THREE.PMREMGenerator(renderer);
const envScene = new THREE.Scene(); const sky2 = new Sky(); sky2.scale.setScalar(4500); envScene.add(sky2);
const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x5a4a2a, 0.9); scene.add(hemi);
const dir = new THREE.DirectionalLight(0xfff1d6, 3.2);
dir.castShadow = true; dir.shadow.mapSize.set(2048, 2048);
Object.assign(dir.shadow.camera, { left: -55, right: 55, top: 55, bottom: -55, near: 1, far: 300 });
dir.shadow.bias = -0.0004; dir.shadow.normalBias = 0.03;
scene.add(dir, dir.target);
// stars + moon
const starGeo = new THREE.BufferGeometry(), sp = [];
for (let i = 0; i < 2500; i++) { const v = new THREE.Vector3().randomDirection(); if (v.y < 0.05) v.y = -v.y + 0.05; v.multiplyScalar(900); sp.push(v.x, v.y, v.z); }
starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false }));
scene.add(stars);
const moon = new THREE.Mesh(new THREE.SphereGeometry(18, 32, 16), new THREE.MeshBasicMaterial({ color: 0xf4f1e0, fog: false, transparent: true }));
scene.add(moon);
export const world = { underground: false, hour: 12, night: 0 };
let lastEnvHour = -99, envRT = null;
const dayFog = new THREE.Color(0xd6e6ee), duskFog = new THREE.Color(0xe8b48a), nightFog = new THREE.Color(0x0b1224);
const sunCol = new THREE.Color(), tmpC = new THREE.Color();
export function localHour() {
  const q = new URLSearchParams(location.search).get('time'); if (q !== null) return parseFloat(q); // ?time=21.5 to preview
  const d = new Date(); return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
}
export function updateSky() {
  const h = localHour(); world.hour = h;
  const RISE = 6.5, SET = 19.25; // sun above the horizon 6:30 to 19:15
  const a = h >= RISE && h <= SET ? (h - RISE) / (SET - RISE) * Math.PI : Math.PI + ((h - SET + 24) % 24) / (24 - SET + RISE) * Math.PI;
  const sun = new THREE.Vector3(Math.cos(a) * 0.55, Math.sin(a), -Math.cos(a) * 0.35 - 0.25).normalize();
  const elev = sun.y, day = THREE.MathUtils.smoothstep(elev, -0.12, 0.2), dusk = Math.max(0, 1 - Math.abs(elev) / 0.25) ;
  world.night = 1 - day;
  U.sunPosition.value.copy(sun); U.rayleigh.value = 1.2 + dusk * 1.5; U.turbidity.value = 5 + dusk * 5;
  sky.visible = day > 0.02;
  const moonDir = sun.clone().negate(); moonDir.y = Math.abs(moonDir.y) * 0.8 + 0.25; moonDir.normalize();
  moon.position.copy(moonDir).multiplyScalar(800); moon.material.opacity = world.night;
  stars.material.opacity = Math.pow(world.night, 2);
  // key light: sun by day, cool moonlight by night
  const lightDir = day > 0.35 ? sun : moonDir;
  dir.position.copy(lightDir).multiplyScalar(120); dir.target.position.set(0, 0, 0);
  sunCol.set(0xfff1d6).lerp(tmpC.set(0xffa060), dusk * 0.8);
  dir.color.copy(day > 0.35 ? sunCol : tmpC.set(0x9fb4ff)); dir.intensity = day > 0.35 ? 0.6 + 2.6 * day : 1.1;
  hemi.intensity = 0.35 + 0.55 * day; hemi.color.set(0xbfe3ff).lerp(tmpC.set(0x2a3a6a), world.night);
  renderer.toneMappingExposure = 0.55 - 0.1 * world.night + 0.1 * dusk;
  scene.background = day > 0.02 ? null : nightFog;
  if (!world.underground) { scene.fog.color.copy(dayFog).lerp(duskFog, dusk * 0.6).lerp(nightFog, world.night); scene.fog.near = 60 - world.night * 25; scene.fog.far = 230 - world.night * 90; }
  if (Math.abs(h - lastEnvHour) > 0.1) { // refresh reflections every ~6 minutes of real time
    lastEnvHour = h; sky2.material.uniforms.sunPosition.value.copy(sun.y > -0.05 ? sun : new THREE.Vector3(0, -0.05, -1));
    Object.assign(sky2.material.uniforms.rayleigh, { value: U.rayleigh.value });
    envRT?.dispose(); envRT = pmrem.fromScene(envScene); scene.environment = envRT.texture;
    scene.environmentIntensity = 0.12 + 0.88 * day;
  }
}
updateSky();

// fireflies over the meadow at night
const flyTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,180,1)'); gr.addColorStop(0.3, 'rgba(210,255,120,.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const flies = [];
for (let i = 0; i < 70; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flyTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })); s.scale.setScalar(0.5);
  s.userData = { x: (Math.random() - 0.5) * 80, z: (Math.random() - 0.5) * 80, p: Math.random() * 10 }; scene.add(s); flies.push(s); }
export function updateFireflies(t) {
  const on = world.underground ? 0 : Math.max(0, world.night - 0.3) / 0.7;
  for (const f of flies) { const u = f.userData; f.visible = on > 0.01; if (!f.visible) continue;
    f.position.set(u.x + Math.sin(t * 0.3 + u.p) * 3, 0.8 + Math.sin(t * 0.9 + u.p) * 0.6 + Math.max(0, Math.sin(u.x * 0.05) * 1.5), u.z + Math.cos(t * 0.25 + u.p) * 3);
    f.material.opacity = on * (0.4 + 0.6 * Math.max(0, Math.sin(t * 2.2 + u.p * 3))); }
}

// ---------- helpers ----------
export const rand = (a, b) => a + Math.random() * (b - a);
function noise(x, z) { // cheap smooth value-ish noise
  return Math.sin(x * 0.05) * Math.cos(z * 0.045) * 1.6 + Math.sin(x * 0.13 + z * 0.09) * 0.5 + Math.cos(z * 0.21 - x * 0.07) * 0.25;
}
const FLAT_R = 42;
export function heightAt(x, z) {
  const d = Math.hypot(x, z);
  const t = THREE.MathUtils.smoothstep(d, FLAT_R, FLAT_R + 60);
  return noise(x, z) * (0.12 + t * 3) + t * t * 14;
}
export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
export function speckle(base, spots, n, s = 3) {
  return (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) { g.fillStyle = spots[i % spots.length]; g.globalAlpha = Math.random() * 0.5;
      g.fillRect(Math.random() * w, Math.random() * h, Math.random() * s + 1, Math.random() * s + 1); } g.globalAlpha = 1; };
}

// ---------- terrain ----------
const groundTex = canvasTex(512, 512, speckle('#5f8f3a', ['#4d7a2c', '#76a348', '#3f6a24', '#8aa84e'], 9000));
groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping; groundTex.repeat.set(40, 40);
const groundGeo = new THREE.PlaneGeometry(500, 500, 220, 220); groundGeo.rotateX(-Math.PI / 2);
{ const p = groundGeo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, heightAt(p.getX(i), p.getZ(i))); groundGeo.computeVertexNormals(); }
const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ map: groundTex, roughness: 1 }));
ground.receiveShadow = true; scene.add(ground);

// dirt path
const dirtTex = canvasTex(256, 256, speckle('#9b7a4c', ['#7d5f37', '#b8966a', '#6b5030'], 4000));
dirtTex.wrapS = dirtTex.wrapT = THREE.RepeatWrapping;
function dirtStrip(x, z, w, l, rot = 0) {
  const t = dirtTex.clone(); t.needsUpdate = true; t.repeat.set(w / 4, l / 4);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), new THREE.MeshStandardMaterial({ map: t, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.rotation.set(-Math.PI / 2, 0, rot); m.position.set(x, heightAt(x, z) + 0.03, z); m.receiveShadow = true; scene.add(m);
}
dirtStrip(0, 14, 4, 82); dirtStrip(-2, -14, 40, 4); dirtStrip(11.5, 41, 14, 12); dirtStrip(3.5, 41, 4, 3, Math.PI / 2);

// ---------- instanced grass with wind ----------
export const windUniform = { value: 0 };
{
  const blade = new THREE.PlaneGeometry(0.08, 0.6, 1, 3); blade.translate(0, 0.3, 0);
  const mat = new THREE.MeshStandardMaterial({ color: 0x6fa343, side: THREE.DoubleSide, roughness: 0.9 });
  mat.onBeforeCompile = (s) => {
    s.uniforms.uTime = windUniform;
    s.vertexShader = 'uniform float uTime;\n' + s.vertexShader.replace('#include <begin_vertex>',
      `#include <begin_vertex>
       vec4 wp = instanceMatrix * vec4(0.,0.,0.,1.);
       float k = position.y * position.y * 1.6;
       transformed.x += sin(uTime*1.8 + wp.x*0.35 + wp.z*0.2) * 0.22 * k;
       transformed.z += cos(uTime*1.3 + wp.z*0.3) * 0.1 * k;`);
  };
  const N = 45000, grass = new THREE.InstancedMesh(blade, mat, N);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  let i = 0;
  while (i < N) {
    const x = rand(-75, 75), z = rand(-75, 75);
    if (Math.abs(x) < 2.6 && z > -27 && z < 55) continue;           // path
    if (Math.abs(z + 14) < 2.6 && Math.abs(x + 2) < 20) continue;
    if (x > 14 && x < 36 && z > -30 && z < -6) continue;            // crop field
    if (Math.hypot(x + 24, z - 22) < 7) continue;                   // pond
    if (x > 4 && x < 19 && z > 34 && z < 48) continue;             // market
    q.setFromEuler(new THREE.Euler(rand(-0.2, 0.2), rand(0, 6.28), rand(-0.2, 0.2)));
    const s = rand(0.45, 1.0);
    m.compose(new THREE.Vector3(x, heightAt(x, z), z), q, new THREE.Vector3(s, s * rand(0.7, 1.3), s));
    grass.setMatrixAt(i, m); grass.setColorAt(i, c.setHSL(rand(0.2, 0.28), rand(0.45, 0.65), rand(0.28, 0.45))); i++;
  }
  grass.receiveShadow = true; scene.add(grass);
}

// ---------- barn ----------
const woodRed = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#9c2a1f'; g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 32) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x, 0, 3, h);
    for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(${Math.random() < .5 ? '0,0,0' : '255,200,180'},${Math.random() * .08})`; g.fillRect(x + Math.random() * 30, Math.random() * h, 2, rand(10, 60)); } } });
woodRed.wrapS = woodRed.wrapT = THREE.RepeatWrapping;
const barnMat = new THREE.MeshStandardMaterial({ map: woodRed, roughness: 0.85 });
const trimMat = new THREE.MeshStandardMaterial({ color: 0xf4efe4, roughness: 0.7 });
const roofMat = new THREE.MeshStandardMaterial({ color: 0x3b3f45, roughness: 0.5, metalness: 0.6 });
export function shadowed(o) { o.traverse(c => { if (c.isMesh) { c.castShadow = c.receiveShadow = true; } }); return o; }
{
  const barn = new THREE.Group(); const W = 12, D = 16, H = 7;
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), barnMat); body.position.y = H / 2; barn.add(body);
  const shape = new THREE.Shape(); shape.moveTo(-W / 2, 0); shape.lineTo(-W / 2 + 1.5, 2.6); shape.lineTo(0, 4.2); shape.lineTo(W / 2 - 1.5, 2.6); shape.lineTo(W / 2, 0);
  const gable = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: D, bevelEnabled: false }), barnMat);
  gable.position.set(0, H, -D / 2); barn.add(gable);
  const roofSeg = (x1, y1, x2, y2) => { const len = Math.hypot(x2 - x1, y2 - y1);
    const r = new THREE.Mesh(new THREE.BoxGeometry(len + 0.3, 0.25, D + 1), roofMat);
    r.position.set((x1 + x2) / 2, H + (y1 + y2) / 2 + 0.15, 0); r.rotation.z = Math.atan2(y2 - y1, x2 - x1); barn.add(r); };
  roofSeg(-W / 2 - 0.4, -0.3, -W / 2 + 1.5, 2.6); roofSeg(-W / 2 + 1.5, 2.6, 0, 4.2); roofSeg(0, 4.2, W / 2 - 1.5, 2.6); roofSeg(W / 2 - 1.5, 2.6, W / 2 + 0.4, -0.3);
  // doors with white X trim
  const door = new THREE.Group();
  const dp = new THREE.Mesh(new THREE.BoxGeometry(5, 5, 0.2), barnMat); dp.position.y = 2.5; door.add(dp);
  for (const [w, h, x, y, r] of [[5.2, .3, 0, 5, 0], [5.2, .3, 0, .1, 0], [.3, 5, -2.5, 2.5, 0], [.3, 5, 2.5, 2.5, 0], [.3, 5, 0, 2.5, 0], [.25, 7, 0, 2.5, .78], [.25, 7, 0, 2.5, -.78]]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(w, h, .25), trimMat); t.position.set(x, y, .1); t.rotation.z = r; door.add(t); }
  door.position.z = D / 2 + 0.05; barn.add(door);
  const hay = new THREE.Mesh(new THREE.BoxGeometry(2, 1.6, .2), new THREE.MeshStandardMaterial({ color: 0x2a1a10 })); hay.position.set(0, H + 1.6, D / 2 + .05); barn.add(hay);
  // HF logo on barn
  new THREE.TextureLoader().load('assets/hf-logo.svg', t => { t.colorSpace = THREE.SRGBColorSpace;
    const logo = new THREE.Mesh(new THREE.CircleGeometry(1.3, 48), new THREE.MeshStandardMaterial({ map: t, transparent: true }));
    logo.position.set(0, H + 1.6, D / 2 + 0.2); barn.add(logo); });
  barn.position.set(-2, heightAt(-2, -26), -26); scene.add(shadowed(barn));
  // silo
  const siloMat = new THREE.MeshStandardMaterial({ color: 0xb9bec4, metalness: 0.8, roughness: 0.35 });
  const silo = new THREE.Group();
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 13, 40, 12), siloMat); cyl.position.y = 6.5; silo.add(cyl);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(2.7, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), siloMat); dome.position.y = 13; silo.add(dome);
  for (let y = 1; y < 13; y += 1.6) { const ring = new THREE.Mesh(new THREE.TorusGeometry(2.62, 0.06, 6, 48), siloMat); ring.rotation.x = Math.PI / 2; ring.position.y = y; silo.add(ring); }
  silo.position.set(8, heightAt(8, -30), -30); scene.add(shadowed(silo));
}

// ---------- windmill ----------
export let windRotor;
{
  const wm = new THREE.Group(); const steel = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, metalness: 0.7, roughness: 0.4 });
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 14.3, 6), steel);
    leg.position.set(Math.cos(a) * 1.2, 7, Math.sin(a) * 1.2); leg.rotation.set(Math.sin(a) * 0.16, 0, -Math.cos(a) * 0.16); wm.add(leg); }
  windRotor = new THREE.Group();
  for (let i = 0; i < 18; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.6, 0.04), steel); b.position.y = 1.7; const p = new THREE.Group(); p.add(b); p.rotation.z = i / 18 * Math.PI * 2; b.rotation.y = 0.5; windRotor.add(p); }
  windRotor.position.set(0, 14, 0.6); wm.add(windRotor);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.4, 2.4), steel); tail.position.set(0, 14, -1.6); wm.add(tail);
  wm.position.set(-30, heightAt(-30, -8), -8); wm.rotation.y = 0.6; scene.add(shadowed(wm));
}

// ---------- pond ----------
const water = new THREE.Mesh(new THREE.CircleGeometry(6.5, 64), new THREE.MeshPhysicalMaterial({ color: 0x3b7ea1, roughness: 0.05, metalness: 0.1, transmission: 0.2, clearcoat: 1, transparent: true, opacity: 0.9 }));
water.rotation.x = -Math.PI / 2; water.position.set(-24, heightAt(-24, 22) + 0.08, 22); water.receiveShadow = true; scene.add(water);
const rockMat = new THREE.MeshStandardMaterial({ color: 0x8a8378, roughness: 0.95, flatShading: true });
for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2, r = rand(6.3, 7.2);
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(0.3, 0.8), 0), rockMat);
  rock.position.set(-24 + Math.cos(a) * r, heightAt(-24, 22), 22 + Math.sin(a) * r); rock.rotation.set(rand(0, 3), rand(0, 3), 0); rock.scale.y = 0.6; scene.add(shadowed(rock)); }

// ---------- crop field (corn/wheat rows) ----------
{
  const soil = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#5a3f24'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 16) { g.fillStyle = '#3f2b17'; g.fillRect(0, y, w, 6); } speckle('rgba(0,0,0,0)', ['#6e5030', '#2e1f10'], 3000)(g, w, h); });
  soil.wrapS = soil.wrapT = THREE.RepeatWrapping; soil.repeat.set(1, 6);
  const f = new THREE.Mesh(new THREE.PlaneGeometry(22, 24), new THREE.MeshStandardMaterial({ map: soil, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 }));
  f.rotation.x = -Math.PI / 2; f.position.set(25, heightAt(25, -18) + 0.04, -18); f.receiveShadow = true; scene.add(f);
  const stalk = new THREE.ConeGeometry(0.12, 1.8, 5); stalk.translate(0, 0.9, 0);
  const mat = new THREE.MeshStandardMaterial({ color: 0xd9b54a, roughness: 0.8 });
  const N = 2600, crops = new THREE.InstancedMesh(stalk, mat, N), m = new THREE.Matrix4(), c = new THREE.Color();
  for (let i = 0; i < N; i++) { const x = 14.8 + (i % 52) * 0.4 + rand(-.1, .1), z = -29.5 + Math.floor(i / 52) * 0.47;
    m.compose(new THREE.Vector3(x, heightAt(x, z), z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rand(-.15, .15), 0, rand(-.15, .15))), new THREE.Vector3(1, rand(0.7, 1.2), 1));
    crops.setMatrixAt(i, m); crops.setColorAt(i, c.setHSL(rand(0.1, 0.14), 0.6, rand(0.45, 0.6))); }
  crops.castShadow = crops.receiveShadow = true; scene.add(crops);
}

// ---------- trees ----------
export const treeSpots = [];
{
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3d25, roughness: 1 });
  const leafMats = [0x3f7a2c, 0x4f8a34, 0x2f6624, 0x5c8f36].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: true }));
  const pineMat = new THREE.MeshStandardMaterial({ color: 0x2c5a2a, roughness: 0.9, flatShading: true });
  function tree(x, z, s) {
    const t = new THREE.Group();
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.25 * s, 0.4 * s, 3 * s, 7), trunkMat); tr.position.y = 1.5 * s; t.add(tr);
    if (Math.random() < 0.4) { for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(new THREE.ConeGeometry((2.4 - k * .6) * s, 3 * s, 8), pineMat); c.position.y = (3 + k * 1.6) * s; t.add(c); } }
    else for (let k = 0; k < 5; k++) { const g = new THREE.IcosahedronGeometry(rand(1.3, 2) * s, 1);
      const b = new THREE.Mesh(g, leafMats[k % 4]); b.position.set(rand(-1, 1) * s, (3.6 + rand(0, 1.6)) * s, rand(-1, 1) * s); t.add(b); }
    treeSpots.push([x, z, 0.6 * s]); t.position.set(x, heightAt(x, z) - 0.1, z); t.rotation.y = rand(0, 6); scene.add(shadowed(t));
  }
  for (let i = 0; i < 80; i++) { const a = rand(0, Math.PI * 2), r = rand(50, 120); tree(Math.cos(a) * r, Math.sin(a) * r, rand(0.8, 1.6)); }
  [[-14, -34], [18, -38], [-36, 30], [-12, 36], [34, 14], [-40, 8]].forEach(([x, z]) => tree(x, z, 1.2));
}

// ---------- fence around the pasture ----------
export const fenceMat = new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 0.95 });
function fenceLine(x1, z1, x2, z2) {
  const len = Math.hypot(x2 - x1, z2 - z1), n = Math.ceil(len / 2.5), ang = Math.atan2(z2 - z1, x2 - x1);
  for (let i = 0; i <= n; i++) { const x = x1 + (x2 - x1) * i / n, z = z1 + (z2 - z1) * i / n;
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.5, 0.22), fenceMat); p.position.set(x, heightAt(x, z) + 0.75, z); scene.add(shadowed(p)); }
  for (const y of [0.55, 1.15]) { const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
    const r = new THREE.Mesh(new THREE.BoxGeometry(len, 0.12, 0.08), fenceMat); r.position.set(mx, heightAt(mx, mz) + y, mz); r.rotation.y = -ang; scene.add(shadowed(r)); }
}
fenceLine(-20, -8, -3, -8); fenceLine(3, -8, 20, -8); fenceLine(20, -8, 20, 32); fenceLine(-20, 32, -3, 32); fenceLine(3, 32, 20, 32); fenceLine(-20, -8, -20, 32);

// hay bales
{ const hayTex = canvasTex(256, 256, speckle('#d8b660', ['#b8923e', '#ecd489', '#9a7a30'], 5000, 10));
  const hm = new THREE.MeshStandardMaterial({ map: hayTex, roughness: 1 });
  [[-8, -20], [-6, -19.5], [-7, -18], [12, -20], [26, 0], [28, 2]].forEach(([x, z], i) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.4, 24), hm); b.rotation.z = Math.PI / 2; b.rotation.y = i;
    b.position.set(x, heightAt(x, z) + 0.9, z); scene.add(shadowed(b)); }); }

// clouds
export const clouds = [];
{ const cm = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.95 });
  for (let i = 0; i < 8; i++) { const c = new THREE.Group();
    for (let k = 0; k < 6; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(rand(3, 6), 14, 10), cm); s.position.set(rand(-7, 7), rand(-1, 1.5), rand(-3, 3)); s.scale.y = 0.6; c.add(s); }
    c.position.set(rand(-160, 160), rand(45, 70), rand(-160, 160)); scene.add(c); clouds.push(c); } }

