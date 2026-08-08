import { getContext, setContext } from 'svelte';
import { derived, writable, type Readable, type Writable } from 'svelte/store';
import { dictionaries } from './dictionaries';
import { LOCALE_COOKIE, type Locale } from './types';

export type { Locale } from './types';
export { LOCALES, LOCALE_LABELS, LOCALE_COUNTRY_CODES, LOCALE_COOKIE, isLocale } from './types';

type Translate = (path: string, params?: Record<string, string | number>) => string;

interface LocaleContext {
  locale: Writable<Locale>;
  t: Readable<Translate>;
}

const CONTEXT_KEY = Symbol('ropa:locale');

function translate(locale: Locale, path: string, params?: Record<string, string | number>): string {
  const segments = path.split('.');
  let node: unknown = dictionaries[locale];
  for (const segment of segments) {
    if (node && typeof node === 'object') {
      node = (node as Record<string, unknown>)[segment];
    } else {
      node = undefined;
      break;
    }
  }
  let result = typeof node === 'string' ? node : path;
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      result = result.replaceAll(`{${key}}`, String(value));
    }
  }
  return result;
}

export function createLocaleContext(getInitial: () => Locale): LocaleContext {
  const locale = writable<Locale>(getInitial());
  const t = derived(locale, ($locale): Translate => {
    return (path, params) => translate($locale, path, params);
  });
  const context: LocaleContext = { locale, t };
  setContext(CONTEXT_KEY, context);
  return context;
}

export function getLocaleContext(): LocaleContext {
  const ctx = getContext<LocaleContext>(CONTEXT_KEY);
  if (!ctx) throw new Error('Locale context not found. Call createLocaleContext() in the root layout.');
  return ctx;
}

export function setLocaleCookie(locale: Locale) {
  if (typeof document === 'undefined') return;
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  document.documentElement.setAttribute('lang', locale);
}
