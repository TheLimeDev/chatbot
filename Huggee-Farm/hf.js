// Hugging Face sign-in + "fetch once, refresh every 24h" model cache.
// Real OAuth (PKCE) runs when HF_CLIENT_ID is set in config.js; otherwise players sign in with a public username.
import { HF_CLIENT_ID } from './config.js';

const KEY = 'hf-account';
const DAY = 24 * 60 * 60 * 1000;
export const account = () => JSON.parse(localStorage.getItem(KEY) || 'null');
const save = a => localStorage.setItem(KEY, JSON.stringify(a));
export const signOut = () => localStorage.removeItem(KEY);
export const oauthEnabled = () => !!HF_CLIENT_ID;
const redirectUri = () => location.origin + location.pathname;

async function fetchProfile(name) {
  for (const kind of ['users', 'organizations']) {
    const r = await fetch(`https://huggingface.co/api/${kind}/${encodeURIComponent(name)}/overview`);
    if (r.ok) { const d = await r.json(); return { name: d.name || name, fullname: d.fullname || name, avatar: d.avatarUrl, kind }; }
  }
  throw new Error(`No Hugging Face account called "${name}".`);
}
async function fetchModels(name) {
  const r = await fetch(`https://huggingface.co/api/models?author=${encodeURIComponent(name)}&limit=100&sort=downloads`);
  if (!r.ok) throw new Error('Could not load models from the Hub.');
  return (await r.json()).map(m => ({ id: m.id, likes: m.likes || 0, downloads: m.downloads || 0, task: m.pipeline_tag || 'model' }));
}

// The one and only fetch: profile + models, stamped with the time.
async function signInAs(name, via) {
  const profile = await fetchProfile(name.trim());
  const models = await fetchModels(profile.name);
  const a = { ...profile, via, models, sold: [], fetchedAt: Date.now() };
  save(a); return a;
}
export const signInWithUsername = name => signInAs(name, 'username');

export function refreshReadyIn() { const a = account(); return a ? Math.max(0, a.fetchedAt + DAY - Date.now()) : 0; }
export async function refreshModels() {
  const a = account(); if (!a) throw new Error('Sign in first.');
  if (refreshReadyIn() > 0) throw new Error('You can refresh once every 24 hours.');
  a.models = await fetchModels(a.name); a.sold = []; a.fetchedAt = Date.now(); save(a); return a;
}
export function markSold(id) { const a = account(); a.sold.push(id); save(a); return a; }
export function sellPrice(m) { return Math.max(5, Math.round(5 + m.likes * 8 + Math.sqrt(m.downloads) * 1.5)); }

// ---- OAuth with PKCE ----
const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export async function startOAuth() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  const state = b64url(crypto.getRandomValues(new Uint8Array(16)));
  sessionStorage.setItem('hf-pkce', JSON.stringify({ verifier, state }));
  const q = new URLSearchParams({ client_id: HF_CLIENT_ID, redirect_uri: redirectUri(), response_type: 'code', scope: 'openid profile', state, code_challenge: challenge, code_challenge_method: 'S256' });
  location.href = `https://huggingface.co/oauth/authorize?${q}`;
}
export async function finishOAuthIfNeeded() {
  const q = new URLSearchParams(location.search); const code = q.get('code'); if (!code) return null;
  const saved = JSON.parse(sessionStorage.getItem('hf-pkce') || 'null'); sessionStorage.removeItem('hf-pkce');
  history.replaceState(null, '', redirectUri());
  if (!saved || saved.state !== q.get('state')) throw new Error('Sign-in was interrupted. Try again.');
  const tok = await fetch('https://huggingface.co/oauth/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri(), client_id: HF_CLIENT_ID, code_verifier: saved.verifier }) });
  if (!tok.ok) throw new Error('Hugging Face refused the sign-in.');
  const { access_token } = await tok.json();
  const info = await (await fetch('https://huggingface.co/oauth/userinfo', { headers: { Authorization: `Bearer ${access_token}` } })).json();
  return signInAs(info.preferred_username, 'oauth');
}
