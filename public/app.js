const API = '';
// Optional Cloudinary unsigned upload config (set these before deploying to Vercel)
const CLOUDINARY_CLOUD = '';
const CLOUDINARY_UPLOAD_PRESET = '';

function token(){ return localStorage.getItem('token'); }
function setToken(t){ if(t) localStorage.setItem('token', t); else localStorage.removeItem('token'); updateHeader(); }
async function getJSON(path, auth){ const headers = {}; if(auth && token()) headers.Authorization = token(); return fetch(API+path, { headers }); }
async function postJSON(path, body, auth){ const headers = {'Content-Type':'application/json'}; if(auth && token()) headers.Authorization = token(); return fetch(API+path, { method: 'POST', headers, body: JSON.stringify(body) }); }
async function updateHeader(){ const el = document.querySelector('.header .user'); if(!el) return; const t = token(); if(!t){ el.innerHTML = '<a href="/login.html">Login</a> <a href="/register.html">Register</a>'; return; } try{ const r = await fetch(API+'/api/me', { headers: { Authorization: t } }); if(!r.ok){ setToken(null); el.innerHTML = '<a href="/login.html">Login</a> <a href="/register.html">Register</a>'; return; } const j = await r.json(); el.innerHTML = `<span style="font-weight:600">${j.username}</span> <a href="/notifications.html" style="margin-left:8px">🔔</a> <button id="logout" class="btn small">Logout</button>`; document.getElementById('logout').addEventListener('click', ()=>{ setToken(null); window.location = '/'; }); }catch(e){ el.innerHTML = '<a href="/login.html">Login</a> <a href="/register.html">Register</a>'; } }

// initialize header on page load
window.addEventListener('DOMContentLoaded', ()=>{ try{ updateHeader(); }catch(e){} });

// helper: upload file directly to Cloudinary (unsigned preset)
async function uploadToCloudinary(file){
	if(!CLOUDINARY_CLOUD || !CLOUDINARY_UPLOAD_PRESET) throw new Error('Cloudinary not configured');
	const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/auto/upload`;
	const fd = new FormData(); fd.append('file', file); fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
	const res = await fetch(url, { method: 'POST', body: fd });
	if(!res.ok) throw new Error('upload failed');
	return await res.json();
}
