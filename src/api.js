const API_URL = import.meta.env.PROD
  ? 'https://corporativoback.vercel.app/api'
  : import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const SESSION_KEY = 'luxcar_corporate_session';
const REQUEST_TIMEOUT = 12000;

function readSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

export function getAccessToken() {
  return readSession()?.access_token || null;
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers, signal: options.signal || controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || 'No fue posible conectar con el servidor');
    error.status = response.status;
    throw error;
  }
  return payload;
}

const RETRY_DELAYS = [700, 1600, 3000];

function wait(delay) {
  return new Promise((resolve) => window.setTimeout(resolve, delay));
}

function isRetryable(error) {
  return !error.status || error.status === 408 || error.status === 429 || error.status >= 500;
}

async function requestWithRetry(path, options = {}, onRetry) {
  let lastError;
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt += 1) {
    try {
      return await request(path, options);
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt === RETRY_DELAYS.length) throw error;
      const delay = RETRY_DELAYS[attempt];
      onRetry?.({ attempt: attempt + 1, delay });
      await wait(delay);
    }
  }
  throw lastError;
}

export async function login(email, password) {
  const payload = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload.session));
  return payload;
}

export const getMe = () => request('/auth/me');
export async function getCatalog(slug, { onRetry } = {}) {
  const safeSlug = encodeURIComponent(slug);
  const loadSection = (section, path) => requestWithRetry(path, {}, (retry) => onRetry?.({ section, ...retry }));
  const [kits, accessories, servicePackages] = await Promise.all([
    loadSection('kits', `/${safeSlug}/kits`),
    loadSection('accesorios', `/${safeSlug}/accesorios`),
    loadSection('servicios', `/${safeSlug}/servicios-paquetes`)
  ]);
  return {
    kits: kits.data || [],
    productos: accessories.data || [],
    servicios_paquetes: servicePackages.data || []
  };
}
