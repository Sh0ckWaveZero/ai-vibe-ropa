export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Double-submit CSRF token: the backend also sets a matching (non-httpOnly)
// cookie, but the browser only *sends* it — reading it back and echoing it
// as a header is what actually proves the request came from our own JS,
// not a cross-site page. The token rotates on login/2FA-completion/refresh,
// so every response that carries a fresh `csrfToken` updates the cache.
let cachedCsrfToken: string | null = null;

async function ensureCsrfToken(): Promise<string> {
  if (cachedCsrfToken) return cachedCsrfToken;
  const res = await fetch('/api/auth/csrf-token', { credentials: 'include' });
  const body = (await res.json()) as { csrfToken: string };
  cachedCsrfToken = body.csrfToken;
  return cachedCsrfToken;
}

function captureRotatedToken(body: unknown) {
  if (body && typeof body === 'object' && 'csrfToken' in body) {
    const token = (body as { csrfToken?: unknown }).csrfToken;
    if (typeof token === 'string' && token) cachedCsrfToken = token;
  }
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const token = await ensureCsrfToken();
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRF-Token': token },
      });
      if (res.ok) {
        const body = await parseBody(res);
        captureRotatedToken(body);
      }
      return res.ok;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  const body = await parseBody(res);
  if (!res.ok) {
    const err = (body as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiError(res.status, err?.code ?? 'UNKNOWN', err?.message ?? `Request failed (${res.status})`);
  }
  captureRotatedToken(body);
  return body as T;
}

export async function apiFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const isAuthRoute = path === '/auth/refresh' || path === '/auth/login' || path === '/auth/logout';
  const method = (init.method ?? 'GET').toUpperCase();

  const request = async () => {
    // FormData bodies (file uploads) must NOT get an explicit Content-Type —
    // the browser sets its own multipart boundary, and overriding it here
    // would corrupt the request.
    const isFormData = init.body instanceof FormData;
    const headers: Record<string, string> = {
      ...(init.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers as Record<string, string> | undefined),
    };
    if (MUTATING_METHODS.has(method)) {
      headers['X-CSRF-Token'] = await ensureCsrfToken();
    }
    return fetch(`/api${path}`, {
      ...init,
      credentials: 'include',
      headers,
    });
  };

  let res = await request();

  if (res.status === 401 && !isAuthRoute) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await request();
    }
  }

  return handleResponse<T>(res);
}
