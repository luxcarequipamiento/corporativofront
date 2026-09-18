const API_URL = import.meta.env.PROD
  ? 'https://corporativoback.vercel.app/api'
  : import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const SESSION_KEY = 'luxcar_corporate_session';

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

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || 'No fue posible conectar con el servidor');
  return payload;
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
export async function getCatalog(slug) {
  const safeSlug = encodeURIComponent(slug);
  const [kits, accessories, services] = await Promise.all([
    request(`/${safeSlug}/kits`),
    request(`/${safeSlug}/accesorios`),
    request(`/${safeSlug}/servicios`)
  ]);
  return {
    kits: kits.data || [],
    productos: [...(accessories.data || []), ...(services.data || [])]
  };
}
