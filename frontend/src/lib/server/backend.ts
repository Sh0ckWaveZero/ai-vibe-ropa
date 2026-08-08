import type { RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const BACKEND_ORIGIN =
  env.BACKEND_ORIGIN ?? `http://${env.BACKEND_HOST ?? 'localhost'}:${env.BACKEND_PORT ?? '4000'}`;

export async function serverFetch(event: RequestEvent, path: string, init: RequestInit = {}): Promise<Response> {
  const cookie = event.request.headers.get('cookie') ?? '';
  return fetch(`${BACKEND_ORIGIN}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      cookie,
    },
  });
}

export async function fetchCurrentUser(event: RequestEvent) {
  const res = await serverFetch(event, '/api/auth/me');
  if (!res.ok) return null;
  const body = await res.json();
  return body.user;
}
