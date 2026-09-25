import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { scene, camera, renderer, heightAt, rand, canvasTex, shadowed, windUniform, windRotor, clouds, treeSpots, updateSky, updateFireflies, world } from './env.js';
import { makeFarmer, animateBiped, makeCow, makeSheep, makePig, makeChicken, animateQuad, animateDance, resetPose } from './characters.js';
import { makeDiscoBall, animateDisco, startBeat, stopBeat, buildSecretMarket, makeHatch, ROOM, ROOM_HALF } from './secret.js';
import * as HF from './hf.js';
import { makeSnake, poseCoil, slither, makeStall, makeArch } from './market.js';

const $ = id => document.getElementById(id);
const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : String(n ?? 0);

// ---------- colliders ----------
const circles = [[8, -30, 3.1], [-30, -8, 2], [-24, 22, 6.9], ...treeSpots,
  [-8, -20, 1], [-6, -19.5, 1], [-7, -18, 1], [12, -20, 1], [26, 0, 1], [28, 2, 1]];
const boxes = [[-8.3, 4.3, -34.5, -17.7]]; // barn
function fenceBox(x1, z1, x2, z2) { boxes.push([Math.min(x1, x2) - 0.2, Math.max(x1, x2) + 0.2, Math.min(z1, z2) - 0.2, Math.max(z1, z2) + 0.2]); }
fenceBox(-20, -8, -3, -8); fenceBox(3, -8, 20, -8); fenceBox(20, -8, 20, 32); fenceBox(-20, 32, -3, 32); fenceBox(3, 32, 20, 32); fenceBox(-20, -8, -20, 32);
function collide(p, r) {
  if (p.y < -30) { p.x = THREE.MathUtils.clamp(p.x, ROOM.x - ROOM_HALF + r, ROOM.x + ROOM_HALF - r); p.z = THREE.MathUtils.clamp(p.z, ROOM.z - ROOM_HALF + r, ROOM.z + ROOM_HALF - r);
    if (p.z < ROOM.z - ROOM_HALF + 4.3) p.z = ROOM.z - ROOM_HALF + 4.3; return; }
  for (const [x, z, cr] of circles) { const dx = p.x - x, dz = p.z - z, d = Math.hypot(dx, dz), m = cr + r;
    if (d < m && d > 1e-4) { p.x = x + dx / d * m; p.z = z + dz / d * m; } }
  for (const [x0, x1, z0, z1] of boxes) {
    if (p.x > x0 - r && p.x < x1 + r && p.z > z0 - r && p.z < z1 + r) {
      const pen = [p.x - (x0 - r), (x1 + r) - p.x, p.z - (z0 - r), (z1 + r) - p.z], i = pen.indexOf(Math.min(...pen));
      if (i === 0) p.x = x0 - r; else if (i === 1) p.x = x1 + r; else if (i === 2) p.z = z0 - r; else p.z = z1 + r; } }
  const d = Math.hypot(p.x, p.z); if (d > 95) { p.x *= 95 / d; p.z *= 95 / d; }
}

// ---------- player: the Huggy Farmer ----------
const player = makeFarmer(); player.position.set(0, 0, 44); player.rotation.y = Math.PI; scene.add(player);
const pv = { vy: 0, ground: true, speed: 0, jumps: 0, flip: 0 };
const groundAt = (x, z) => (player.position.y < -30 ? ROOM.y : heightAt(x, z));
function jump() { if (dancing) toggleDance(); if (pv.ground) { pv.vy = 8; pv.ground = false; pv.jumps = 1; } else if (pv.jumps === 1) { pv.vy = 8.5; pv.jumps = 2; pv.flip = 1; } }
// dancing with disco balls
let dancing = false, danceMove = 0, danceT = 0; const disco = makeDiscoBall(0.45); disco.visible = false; scene.add(disco);
function toggleDance() {
  dancing = !dancing; disco.visible = dancing;
  if (dancing) { danceMove = (danceMove + 1) % 3; startBeat(); toast(['Disco point!', 'Spin move!', 'Huggy wiggle!'][danceMove]); } else { stopBeat(); resetPose(player); }
}
let yaw = 0, pitch = 0.35, dist = 9;
const keys = {};
addEventListener('keydown', e => { keys[e.code] = true; if (e.code === 'KeyE') interact(); if (e.code === 'Space' && !anyPanel()) jump(); if (e.code === 'KeyF' && !anyPanel()) toggleDance(); if (e.code === 'Escape') closePanels(); if (e.code === 'KeyH') $('help').classList.toggle('show'); if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault(); });
addEventListener('keyup', e => (keys[e.code] = false));
const cv = renderer.domElement;
cv.addEventListener('click', () => { if (!anyPanel()) cv.requestPointerLock?.(); });
let drag = null;
cv.addEventListener('pointerdown', e => (drag = [e.clientX, e.clientY]));
addEventListener('pointerup', () => (drag = null));
addEventListener('pointermove', e => {
  let dx = 0, dy = 0;
  if (document.pointerLockElement === cv) { dx = e.movementX; dy = e.movementY; }
  else if (drag) { dx = e.clientX - drag[0]; dy = e.clientY - drag[1]; drag = [e.clientX, e.clientY]; }
  yaw -= dx * 0.004; pitch = THREE.MathUtils.clamp(pitch + dy * 0.003, -0.1, 1.2);
});
cv.addEventListener('wheel', e => { dist = THREE.MathUtils.clamp(dist + e.deltaY * 0.01, 4, 22); }, { passive: true });

// ---------- Money: collect coins ----------
let money = Number(localStorage.getItem('hf-money') ?? 0);
const setMoney = v => { money = Math.max(0, v); localStorage.setItem('hf-money', money); $('money').textContent = money; $('moneyBox').classList.remove('pulse'); void $('moneyBox').offsetWidth; $('moneyBox').classList.add('pulse'); };
$('money').textContent = money;
let toastT; function toast(msg) { const t = $('toast'); t.textContent = msg; t.style.opacity = 1; clearTimeout(toastT); toastT = setTimeout(() => (t.style.opacity = 0), 1800); }
const coinFace = canvasTex(256, 256, (c, w, h) => { const g = c.createRadialGradient(100, 90, 10, 128, 128, 128); g.addColorStop(0, '#fff3a0'); g.addColorStop(0.6, '#f5c230'); g.addColorStop(1, '#b8860b'); c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.strokeStyle = '#a0740a'; c.lineWidth = 10; c.beginPath(); c.arc(128, 128, 110, 0, 7); c.stroke(); c.fillStyle = '#8a5d05'; c.font = '900 120px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('$', 128, 136); });
const coinGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.09, 40);
const coinMats = [new THREE.MeshStandardMaterial({ color: 0xd9a520, metalness: 1, roughness: 0.25 }), new THREE.MeshStandardMaterial({ map: coinFace, metalness: 0.7, roughness: 0.3, emissive: 0x6a4a00, emissiveIntensity: 0.6 }), new THREE.MeshStandardMaterial({ map: coinFace, metalness: 0.7, roughness: 0.3, emissive: 0x6a4a00, emissiveIntensity: 0.6 })];
const glowTex = canvasTex(128, 128, (c, w, h) => { const gr = c.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,230,120,.9)'); gr.addColorStop(1, 'rgba(255,230,120,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
function makeCoin() { const g = new THREE.Group(); const c = new THREE.Mesh(coinGeo, coinMats); c.rotation.x = Math.PI / 2; c.castShadow = true; g.add(c);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: 0.6, depthWrite: false })); halo.scale.set(2, 2, 1); g.add(halo); return g; }
const coins = [];
function placeCoin(s) { let x, z; do { x = rand(-45, 45); z = rand(-45, 45); } while (Math.hypot(x + 24, z - 22) < 8 || (x > -9 && x < 5 && z > -35 && z < -17) || Math.hypot(x - 8, z + 30) < 4 || (x > 4 && x < 19 && z > 34 && z < 48) || (x > 13 && x < 37 && z > -31 && z < -5));
  s.position.set(x, heightAt(x, z) + 1, z); s.visible = true; s.userData.respawn = 0; }
for (let i = 0; i < 16; i++) { const c = makeCoin(); placeCoin(c); scene.add(c); coins.push(c); }
coins[0].position.set(0, heightAt(0, 36) + 1, 36); coins[1].position.set(0, heightAt(0, 30) + 1, 30); coins[2].position.set(0, heightAt(0, 24) + 1, 24);

// ---------- animals ----------
const animals = [];
function spawn(make, n, cx, cz, rx, rz) {
  for (let i = 0; i < n; i++) { const a = make(); const x = cx + rand(-rx, rx), z = cz + rand(-rz, rz);
    a.position.set(x, heightAt(x, z), z); a.rotation.y = rand(0, 6.28); scene.add(a);
    animals.push({ o: a, home: [cx, cz, rx, rz], target: new THREE.Vector3(x, 0, z), wait: rand(0, 4), speed: 0, petT: 0 }); }
}
spawn(makeCow, 4, 8, 20, 9, 8); spawn(makeSheep, 5, -11, 12, 6, 12); spawn(makePig, 3, 12, 2, 5, 5); spawn(makeChicken, 6, -12, -13, 5, 2);

// speech bubble sprite
function bubble(text) {
  const t = canvasTex(256, 96, (c, w, h) => { c.fillStyle = '#fff'; c.beginPath(); c.roundRect(4, 4, w - 8, h - 30, 24); c.fill(); c.beginPath(); c.moveTo(110, h - 28); c.lineTo(128, h - 4); c.lineTo(146, h - 28); c.fill();
    c.fillStyle = '#4a3210'; c.font = '800 36px system-ui'; c.textAlign = 'center'; c.fillText(text, w / 2, 52); });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false })); s.scale.set(2.2, 0.82, 1); s.renderOrder = 10; return s;
}
function label(text, sub) {
  const t = canvasTex(512, 128, (c, w, h) => { c.fillStyle = 'rgba(40,26,8,.78)'; c.beginPath(); c.roundRect(0, 0, w, h, 30); c.fill();
    c.fillStyle = '#ffd21e'; c.textAlign = 'center'; let fs = 44; c.font = `800 ${fs}px system-ui`; while (c.measureText(text).width > w - 30) c.font = `800 ${--fs}px system-ui`;
    c.fillText(text, w / 2, 58); c.fillStyle = '#fff'; c.font = '500 28px system-ui'; c.fillText(sub, w / 2, 102); });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false })); s.scale.set(3.2, 0.8, 1); s.renderOrder = 9; return s;
}

// ---------- Farmers Market: the Boomslang stall ----------
const BOOM = { id: 'Monster-Code/Boomslang', price: 30 };
const STALL = new THREE.Vector3(12.5, 0, 41);
const stall = makeStall('Boomslang', 'fresh 3B reasoning snakes · Monster-Code', `$${BOOM.price}`);
stall.position.set(STALL.x, heightAt(STALL.x, STALL.z), STALL.z); stall.rotation.y = -Math.PI / 2; scene.add(stall);
boxes.push([STALL.x - 1.1, STALL.x + 1.3, STALL.z - 2.6, STALL.z + 2.6], [STALL.x - 1.4, STALL.x - 0.7, STALL.z + 2.7, STALL.z + 3.5]);
const arch = makeArch('Farmers Market'); arch.position.set(4.2, heightAt(4.2, 41), 41); arch.rotation.y = Math.PI / 2; scene.add(arch);
circles.push([4.2, 38.6, 0.3], [4.2, 43.4, 0.3]);
const basketSnakes = stall.userData.spots.map((p, i) => { const sn = makeSnake(0.9); sn.position.copy(p); sn.rotation.y = 0.4 - i * 0.4; stall.add(sn); return sn; });
let adopted = Number(localStorage.getItem('hf-snakes') || 0);
const pets = [];
function adoptSnake(fromStall) {
  const sn = makeSnake(1.25); scene.add(sn);
  const start = fromStall ? new THREE.Vector3(STALL.x - 2.2, 0, STALL.z) : new THREE.Vector3(player.position.x - 2, 0, player.position.z);
  pets.push({ sn, pos: start, heading: 0, speed: 0 });
  const b = basketSnakes[pets.length - 1]; if (b) b.visible = false;
}
for (let i = 0; i < adopted; i++) adoptSnake(false);

let panelOpen = false;
function openStall() {
  panelOpen = true; document.exitPointerLock?.(); $('stallPanel').style.display = 'flex'; refreshStall();
}
function refreshStall() {
  const left = 3 - adopted;
  $('adopt').disabled = left <= 0;
  $('adopt').textContent = left <= 0 ? 'Sold out: all 3 snakes adopted' : `Adopt a Boomslang: $${BOOM.price}`;
  $('stallMsg').textContent = left <= 0 ? 'All snakes have a home with you now.' : `You have $${money}. ${left} snake${left > 1 ? 's' : ''} left in the baskets.`;
}
function closeStall() { panelOpen = false; $('stallPanel').style.display = 'none'; }
$('closeStall').onclick = closeStall;
$('adopt').onclick = () => {
  if (money < BOOM.price) { $('stallMsg').textContent = `You need $${BOOM.price - money} more. Collect coins, or sell models at a certain secret market...`; return; }
  setMoney(money - BOOM.price); adopted++; localStorage.setItem('hf-snakes', adopted); adoptSnake(true); refreshStall(); toast('A Boomslang now follows you!');
};

// ---------- the secret Not-so-Huggy Market ----------
const secret = buildSecretMarket(scene);
const HATCH = new THREE.Vector3(-7.5, 0, -38.2); // hidden behind the barn, next to the hay
const hatch = makeHatch(); hatch.position.set(HATCH.x, heightAt(HATCH.x, HATCH.z) + 0.02, HATCH.z); hatch.rotation.y = 0.3; scene.add(hatch);
let found = localStorage.getItem('hf-found') === '1';
function goUnder() { player.position.set(secret.ladderPos.x, ROOM.y, secret.ladderPos.z - 1); player.rotation.y = Math.PI; yaw = 0; pv.vy = 0;
  world.underground = true; scene.fog.color.set(0x120a18); scene.fog.near = 10; scene.fog.far = 40; secret.group.visible = true;
  if (!found) { found = true; localStorage.setItem('hf-found', '1'); toast('You found the secret market!'); } else toast('Welcome back...'); }
function goUp() { player.position.set(HATCH.x + 1.8, heightAt(HATCH.x + 1.8, HATCH.z + 1), HATCH.z + 1); pv.vy = 0; world.underground = false; updateSky(); }
const underground = () => player.position.y < -30;

// ---------- sign in + sell panel ----------
const avatarHtml = a => `<img src="${a.avatar}" class="av"> ${a.name}`;
function renderAccount() { const a = HF.account(); $('signBtn').innerHTML = a ? avatarHtml(a) : 'Sign in with Hugging Face'; }
renderAccount();
$('signBtn').onclick = () => openSignIn();
function openSignIn() { document.exitPointerLock?.(); $('signPanel').style.display = 'flex'; const a = HF.account();
  $('signOAuth').style.display = HF.oauthEnabled() ? 'block' : 'none';
  $('signedIn').style.display = a ? 'block' : 'none'; $('signForm').style.display = a ? 'none' : 'block';
  if (a) $('signedName').innerHTML = `${avatarHtml(a)}<br><small>${a.models.length} models loaded · signed in with ${a.via === 'oauth' ? 'Hugging Face OAuth' : 'username'}</small>`;
  $('signMsg').textContent = ''; }
$('signOAuth').onclick = () => HF.startOAuth();
$('signGo').onclick = async () => { const n = $('signUser').value.trim(); if (!n) return; $('signMsg').textContent = 'Fetching your models from the Hub...';
  try { const a = await HF.signInWithUsername(n); renderAccount(); $('signMsg').textContent = ''; closePanels(); toast(`Welcome, ${a.name}! ${a.models.length} models are in your bag.`); } catch (e) { $('signMsg').textContent = e.message; } };
$('signUser').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') $('signGo').click(); });
$('signOut').onclick = () => { HF.signOut(); renderAccount(); openSignIn(); };
HF.finishOAuthIfNeeded().then(a => { if (a) { renderAccount(); toast(`Welcome, ${a.name}!`); } }).catch(e => toast(e.message));

const fmtWait = ms => { const t = Math.ceil(ms / 60000), h = Math.floor(t / 60), m = t % 60; return h ? `${h}h ${m}m` : `${m}m`; };
function openSell() { document.exitPointerLock?.(); $('sellPanel').style.display = 'flex'; renderSell(); }
function renderSell() {
  const a = HF.account();
  if (!a) { $('sellList').innerHTML = `<p class="shady">"Psst. I only buy from folks I know. Sign in with Hugging Face first."</p><button class="neonBtn" id="sellSign">Sign in</button>`; $('sellSign').onclick = () => { closePanels(); openSignIn(); }; $('refresh').style.display = 'none'; return; }
  $('refresh').style.display = 'block';
  const wait = HF.refreshReadyIn(); $('refresh').disabled = wait > 0;
  $('refresh').textContent = wait > 0 ? `Refresh models in ${fmtWait(wait)}` : 'Refresh my models (1 per 24h)';
  const left = a.models.filter(m => !a.sold.includes(m.id));
  $('sellList').innerHTML = !a.models.length ? `<p class="shady">"${a.name} has no models? Come back when you've got goods."</p>` : a.models.map((m, i) => {
    const sold = a.sold.includes(m.id);
    return `<div class="sellRow ${sold ? 'sold' : ''}"><div><b>${m.id.split('/')[1]}</b><small>${m.task} · ❤ ${fmt(m.likes)} · ⬇ ${fmt(m.downloads)}</small></div><button data-i="${i}" ${sold ? 'disabled' : ''}>${sold ? 'Sold' : 'Sell $' + HF.sellPrice(m)}</button></div>`; }).join('')
    + (left.length ? '' : `<p class="shady">"All sold. Come back after your next refresh."</p>`);
  $('sellList').querySelectorAll('button[data-i]').forEach(b => (b.onclick = () => { const m = a.models[+b.dataset.i]; HF.markSold(m.id); setMoney(money + HF.sellPrice(m)); toast(`Sold ${m.id.split('/')[1]} for $${HF.sellPrice(m)}`); renderSell(); }));
}
$('refresh').onclick = async () => { try { const a = await HF.refreshModels(); toast(`Refreshed: ${a.models.length} models`); renderSell(); } catch (e) { toast(e.message); } };
function anyPanel() { return panelOpen || ['signPanel', 'sellPanel'].some(id => $(id).style.display === 'flex'); }
function closePanels() { closeStall(); $('signPanel').style.display = 'none'; $('sellPanel').style.display = 'none'; }
document.querySelectorAll('.closeX').forEach(b => (b.onclick = closePanels));

// ---------- interaction ----------
let bubbles = [];
function nearestAnimal() { if (underground()) return null; let best = null, bd = 3.2; for (const a of animals) { const d = a.o.position.distanceTo(player.position); if (d < bd) { bd = d; best = a; } } return best; }
const nearStall = () => !underground() && Math.hypot(player.position.x - (STALL.x - 1.8), player.position.z - STALL.z) < 3.2;
const nearHatch = () => !underground() && Math.hypot(player.position.x - HATCH.x, player.position.z - HATCH.z) < 2.2;
const nearMerchant = () => underground() && player.position.distanceTo(secret.merchantPos) < 3;
const nearLadder = () => underground() && player.position.distanceTo(secret.ladderPos) < 2.5;
function interact() {
  if (anyPanel()) return closePanels();
  if (nearHatch()) return goUnder();
  if (nearLadder()) return goUp();
  if (nearMerchant()) return openSell();
  if (nearStall()) return openStall();
  const a = nearestAnimal();
  if (a) { const b = bubble(a.o.userData.sound); b.position.set(0, 2.6, 0); a.o.add(b); bubbles.push({ b, a, t: 1.6 }); a.wait = 2; a.speed = 0; a.target.copy(a.o.position); }
}
function hint() {
  if (anyPanel()) return '';
  if (nearHatch()) return 'Press E to open the strange hatch...';
  if (nearLadder()) return 'Press E to climb back up';
  if (nearMerchant()) return 'Press E to talk to the shady Huggy';
  if (nearStall()) return 'Press E to visit the Boomslang stall';
  const a = nearestAnimal(); if (a) return `Press E to pet the ${a.o.userData.kind.toLowerCase()}`;
  return '';
}

// ---------- loop ----------
const clock = new THREE.Clock(), tmp = new THREE.Vector3(); let skyT = 0;
function updateClock() { const h = world.hour, hh = Math.floor(h) % 24, mm = Math.floor((h % 1) * 60);
  const phase = h < 5 || h >= 21 ? 'Night' : h < 7.5 ? 'Dawn' : h < 18 ? 'Day' : h < 19.5 ? 'Sunset' : 'Dusk';
  $('clock').textContent = `${phase} · ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`; }
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  if ((skyT -= dt) < 0) { skyT = 5; updateSky(); updateClock(); } updateFireflies(t);
  windUniform.value = t; windRotor.rotation.z -= dt * 1.5;
  clouds.forEach(c => { c.position.x += dt * 1.2; if (c.position.x > 180) c.position.x = -180; });

  // player movement relative to camera
  const f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
  const s = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  const want = anyPanel() ? 0 : (f || s ? (keys.ShiftLeft || keys.ShiftRight ? 9 : 4.5) : 0);
  pv.speed = THREE.MathUtils.lerp(pv.speed, want, 0.15);
  if ((f || s) && dancing) toggleDance();
  if (f || s) { const ang = Math.atan2(-s, f) + yaw + Math.PI; // camera looks along -yaw direction
    let d = ang - player.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); player.rotation.y += d * 0.2; }
  if (pv.speed > 0.05) { player.position.x += Math.sin(player.rotation.y) * pv.speed * dt; player.position.z += Math.cos(player.rotation.y) * pv.speed * dt; }
  collide(player.position, 0.8);
  const gy = groundAt(player.position.x, player.position.z);
  pv.vy -= 22 * dt; player.position.y += pv.vy * dt; if (player.position.y <= gy) { player.position.y = gy; pv.vy = 0; pv.ground = true; pv.jumps = 0; }
  const bd = player.userData.body;
  if (dancing) { danceT += dt; animateDance(player, danceT, danceMove); disco.position.set(player.position.x, player.position.y + 5.2, player.position.z); animateDisco(disco, t, 2.5); }
  else { animateBiped(player, pv.ground ? pv.speed : 0, dt, t);
    if (pv.flip > 0) { pv.flip = Math.max(0, pv.flip - dt * 1.8); bd.rotation.x = (1 - pv.flip) * Math.PI * 2; if (!pv.flip) bd.rotation.x = 0; }
    if (!pv.ground && pv.flip === 0) { player.userData.armL.rotation.x = -2.4; player.userData.armR.rotation.x = -2.4; } }
  animateDisco(secret.disco, t, 6);
  hatch.userData.glow.intensity = nearHatch() ? 2 + Math.sin(t * 5) : 0;

  // camera follow
  const head = tmp.set(player.position.x, player.position.y + 2, player.position.z);
  const camPos = new THREE.Vector3(head.x + Math.sin(yaw) * Math.cos(pitch) * dist, head.y + Math.sin(pitch) * dist, head.z + Math.cos(yaw) * Math.cos(pitch) * dist);
  if (underground()) { camPos.x = THREE.MathUtils.clamp(camPos.x, ROOM.x - ROOM_HALF + 0.5, ROOM.x + ROOM_HALF - 0.5); camPos.z = THREE.MathUtils.clamp(camPos.z, ROOM.z - ROOM_HALF + 0.5, ROOM.z + ROOM_HALF - 0.5); camPos.y = THREE.MathUtils.clamp(camPos.y, ROOM.y + 0.8, ROOM.y + 8.3); }
  else camPos.y = Math.max(camPos.y, heightAt(camPos.x, camPos.z) + 0.8);
  if (camera.position.distanceTo(camPos) > 30) camera.position.copy(camPos); else camera.position.lerp(camPos, 0.18); camera.lookAt(head);

  // coins
  for (const c of coins) {
    if (!c.visible) { c.userData.respawn -= dt; if (c.userData.respawn <= 0) placeCoin(c); continue; }
    c.rotation.y += dt * 2.5; c.position.y = heightAt(c.position.x, c.position.z) + 1 + Math.sin(t * 2 + c.position.x) * 0.15;
    if (Math.hypot(c.position.x - player.position.x, c.position.z - player.position.z) < 1.4 && Math.abs(c.position.y - player.position.y - 1) < 2) { c.visible = false; c.userData.respawn = 30; setMoney(money + 5); toast('+$5'); }
  }
  // animals wander & graze
  for (const a of animals) {
    const p = a.o.position; a.petT -= dt;
    const d = tmp.set(a.target.x - p.x, 0, a.target.z - p.z);
    if (d.length() < 0.2) { a.speed = 0; a.o.userData.grazing = a.o.userData.kind !== 'Chicken' || Math.sin(t) > 0; a.wait -= dt;
      if (a.wait < 0) { const [cx, cz, rx, rz] = a.home; a.target.set(cx + rand(-rx, rx), 0, cz + rand(-rz, rz)); a.wait = rand(2, 7); } }
    else { a.o.userData.grazing = false; a.speed = THREE.MathUtils.lerp(a.speed, a.o.userData.kind === 'Chicken' ? 1.4 : 0.9, 0.05);
      let r = Math.atan2(d.x, d.z) - a.o.rotation.y; r = Math.atan2(Math.sin(r), Math.cos(r)); a.o.rotation.y += r * 0.05;
      p.x += Math.sin(a.o.rotation.y) * a.speed * dt; p.z += Math.cos(a.o.rotation.y) * a.speed * dt; }
    const before = p.clone(); collide(p, 0.8); if (before.distanceTo(p) > 0.01) a.target.copy(p);
    const pd = Math.hypot(p.x - player.position.x, p.z - player.position.z); if (pd < 1.6) { p.x += (p.x - player.position.x) / pd * 0.05; p.z += (p.z - player.position.z) / pd * 0.05; }
    p.y = heightAt(p.x, p.z); animateQuad(a.o, a.speed, dt, t);
  }
  bubbles = bubbles.filter(b => { b.t -= dt; b.b.position.y = 2.6 + (1.6 - b.t) * 0.3; if (b.t <= 0) { b.a.o.remove(b.b); return false; } return true; });

  // adopted snakes slither after the farmer in a line
  let lx = player.position.x, lz = player.position.z, lh = player.rotation.y, gap = 2.2;
  for (const pet of pets) {
    const tx = lx - Math.sin(lh) * gap, tz = lz - Math.cos(lh) * gap, dx = tx - pet.pos.x, dz = tz - pet.pos.z, dd = Math.hypot(dx, dz);
    pet.speed = THREE.MathUtils.lerp(pet.speed, dd > 0.5 ? Math.min(dd * 2, 9) : 0, 0.1);
    if (dd > 0.05) { let r = Math.atan2(dx, dz) - pet.heading; r = Math.atan2(Math.sin(r), Math.cos(r)); pet.heading += r * 0.12; }
    pet.pos.x += Math.sin(pet.heading) * pet.speed * dt; pet.pos.z += Math.cos(pet.heading) * pet.speed * dt; pet.pos.y = player.position.y; collide(pet.pos, 0.3);
    if (Math.abs(pet.pos.x - lx) + Math.abs(pet.pos.z - lz) > 40) { pet.pos.set(lx, 0, lz); pet.sn.userData.trail.length = 0; } pet.pos.y = underground() ? ROOM.y : heightAt(pet.pos.x, pet.pos.z); slither(pet.sn, pet.pos, pet.heading, t, pet.speed);
    lx = pet.pos.x; lz = pet.pos.z; lh = pet.heading; gap = 3.8;
  }
  basketSnakes.forEach((sn, i) => sn.visible && poseCoil(sn, t, i * 2.1));
  $('hint').textContent = hint(); $('hint').style.opacity = $('hint').textContent ? 1 : 0;
  renderer.render(scene, camera); requestAnimationFrame(tick);
}
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
Promise.resolve().then(() => { const l = $('loading'); l.style.opacity = 0; setTimeout(() => l.remove(), 900); });
tick();
window.huggee = { player, setView: (y, p, d) => { yaw = y; pitch = p; dist = d; }, openStall, setMoney, goUnder, openSell, toggleDance };
setTimeout(() => $('help').classList.remove('show'), 12000);
