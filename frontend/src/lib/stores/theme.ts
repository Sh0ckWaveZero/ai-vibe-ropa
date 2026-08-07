import { writable } from 'svelte/store';

export type Theme = 'light' | 'dark';

const THEME_COOKIE = 'ropa_theme';

function getInitialTheme(): Theme {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export const theme = writable<Theme>(getInitialTheme());

export function toggleTheme() {
  theme.update((current) => {
    const next: Theme = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    return next;
  });
}

function applyTheme(next: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', next === 'dark');
  document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}
