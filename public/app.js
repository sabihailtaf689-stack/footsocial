const API = '';
// Optional Cloudinary unsigned upload config (set these before deploying to Vercel)
const CLOUDINARY_CLOUD = '';
const CLOUDINARY_UPLOAD_PRESET = '';

// Backend connection status
let backendAvailable = true;
let backendCheckAttempted = false;

// Check if backend is available
async function checkBackendConnection() {
  if (backendCheckAttempted) return backendAvailable;
  backendCheckAttempted = true;
  try {
    // Create timeout manually for better browser compatibility
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const response = await fetch('/api/leaderboard', {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    backendAvailable = response.status !== 0; // 0 means network error
  } catch (e) {
    backendAvailable = false;
    console.warn('Backend not available:', e.message);
  }
  return backendAvailable;
}

function token() {
  return localStorage.getItem('token');
}

function setToken(t) {
  if (t) localStorage.setItem('token', t);
  else localStorage.removeItem('token');
  updateHeader();
}

async function getJSON(path, auth) {
  const headers = {};
  if (auth && token()) headers.Authorization = token();
  let url = path;
  if (API) {
    url = API + (path.startsWith('/') ? path.slice(1) : path);
  } else {
    url = path.startsWith('/') ? path.slice(1) : path;
  }
  try {
    // Create timeout manually for better browser compatibility
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(url, {
      headers,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!response.ok && response.status === 0) {
      backendAvailable = false;
    }
    return response;
  } catch (e) {
    backendAvailable = false;
    // Return a mock response that indicates failure
    return {
      ok: false,
      status: 0,
      statusText: 'Network Error',
      json: async () => ({ error: 'Backend not available. Please check your connection.' })
    };
  }
}

// eslint-disable-next-line no-unused-vars
async function postJSON(path, body, auth) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && token()) headers.Authorization = token();
  let url = path;
  if (API) {
    url = API + (path.startsWith('/') ? path.slice(1) : path);
  } else {
    url = path.startsWith('/') ? path.slice(1) : path;
  }
  try {
    // Create timeout manually for better browser compatibility
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!response.ok && response.status === 0) {
      backendAvailable = false;
    }
    return response;
  } catch (e) {
    backendAvailable = false;
    // Return a mock response that indicates failure
    return {
      ok: false,
      status: 0,
      statusText: 'Network Error',
      json: async () => ({ error: 'Backend not available. Please check your connection.' })
    };
  }
}

async function updateHeader() {
  const el = document.querySelector('.header .user');
  if (!el) return;
  const t = token();
  if (!t) {
    el.innerHTML = '<a href="login.html">Login</a> <a href="register.html">Register</a>';
    return;
  }
  try {
    const r = await getJSON('/api/me', true);
    if (!r.ok) {
      setToken(null);
      el.innerHTML = '<a href="login.html">Login</a> <a href="register.html">Register</a>';
      return;
    }
    const j = await r.json();
    el.innerHTML = `<span style="font-weight:600">${j.username}</span> <a href="notifications.html" style="margin-left:8px">🔔</a> <button id="logout" class="btn small">Logout</button>`;
    const logoutBtn = document.getElementById('logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        setToken(null);
        window.location = './';
      });
    }
  } catch (e) {
    // If backend is not available, still show login/register
    if (!backendAvailable) {
      el.innerHTML =
        '<a href="login.html">Login</a> <a href="register.html">Register</a> <span class="small muted" style="margin-left:8px">(Offline)</span>';
    } else {
      el.innerHTML = '<a href="login.html">Login</a> <a href="register.html">Register</a>';
    }
  }
}

// initialize header on page load and check backend
window.addEventListener('DOMContentLoaded', () => {
  try {
    checkBackendConnection().then(() => updateHeader());
  } catch (e) {
    console.warn('Error checking backend:', e);
    updateHeader();
  }
});

// helper: upload file directly to Cloudinary (unsigned preset)
// eslint-disable-next-line no-unused-vars
async function uploadToCloudinary(file) {
  if (!CLOUDINARY_CLOUD || !CLOUDINARY_UPLOAD_PRESET) throw new Error('Cloudinary not configured');
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/auto/upload`;
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  const res = await fetch(url, { method: 'POST', body: fd });
  if (!res.ok) throw new Error('upload failed');
  return await res.json();
}
