export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
      .then((res) => res.ok)
      .finally(() => {
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
  return body as T;
}

export async function apiFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const isAuthRoute = path === '/auth/refresh' || path === '/auth/login' || path === '/auth/logout';
  const request = () =>
    fetch(`/api${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers ?? {}),
      },
    });

  let res = await request();

  if (res.status === 401 && !isAuthRoute) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await request();
    }
  }

  return handleResponse<T>(res);
}
