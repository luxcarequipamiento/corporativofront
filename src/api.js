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
  const { timeoutMs = REQUEST_TIMEOUT, ...fetchOptions } = options;
  const isFormData = fetchOptions.body instanceof FormData;
  const headers = { ...(!isFormData && { 'Content-Type': 'application/json' }), ...fetchOptions.headers };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...fetchOptions, headers, signal: fetchOptions.signal || controller.signal });
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

const FILE_MIME_TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
};

function getFileMimeType(file) {
  const extension = file.name.split('.').pop()?.toLowerCase();
  return file.type || FILE_MIME_TYPES[extension] || 'application/octet-stream';
}

async function uploadToSignedUrl(signedUrl, file, mimeType) {
  const body = new FormData();
  body.append('cacheControl', '3600');
  const uploadBody = file.type === mimeType ? file : new Blob([file], { type: mimeType });
  body.append('', uploadBody, file.name);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 120000);
  let response;
  try {
    response = await fetch(signedUrl, {
      method: 'PUT',
      headers: { 'x-upsert': 'false' },
      body,
      signal: controller.signal
    });
  } finally {
    window.clearTimeout(timeout);
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || payload.error || 'No fue posible cargar el archivo');
  }
}

async function sendMessageWithFile({ preparePath, messagePath, text, file }) {
  let uploadedFile = null;
  if (file) {
    const mimeType = getFileMimeType(file);
    const authorization = await request(preparePath, {
      method: 'POST',
      body: JSON.stringify({ name: file.name, mimeType, size: file.size })
    });
    await uploadToSignedUrl(authorization.data.signedUrl, file, mimeType);
    uploadedFile = { ...authorization.data.file, path: authorization.data.path };
  }
  return request(messagePath, {
    method: 'POST',
    body: JSON.stringify({ contenido: text || '', archivo: uploadedFile }),
    timeoutMs: 45000
  });
}

export const getClientMessages = () => request('/mensajeria/cliente');
export const sendClientMessage = (text, file) => sendMessageWithFile({
  preparePath: '/mensajeria/cliente/archivos/preparar',
  messagePath: '/mensajeria/cliente/mensajes',
  text,
  file
});
export const getAdminConversations = () => request('/mensajeria/admin/conversaciones');
export const getAdminMessages = (conversationId) => request(`/mensajeria/admin/conversaciones/${encodeURIComponent(conversationId)}`);
export const sendAdminMessage = (conversationId, text, file) => {
  const basePath = `/mensajeria/admin/conversaciones/${encodeURIComponent(conversationId)}`;
  return sendMessageWithFile({
    preparePath: `${basePath}/archivos/preparar`,
    messagePath: `${basePath}/mensajes`,
    text,
    file
  });
};

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
