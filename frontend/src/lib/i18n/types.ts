export type Locale = 'th' | 'en' | 'zh';

export const LOCALES: Locale[] = ['th', 'en', 'zh'];

export const LOCALE_LABELS: Record<Locale, string> = {
  th: 'ไทย',
  en: 'English',
  zh: '中文',
};

export const LOCALE_COUNTRY_CODES = {
  th: 'th',
  en: 'gb',
  zh: 'cn',
} as const satisfies Record<Locale, string>;

export const LOCALE_COOKIE = 'ropa_locale';

export function isLocale(value: unknown): value is Locale {
  return value === 'th' || value === 'en' || value === 'zh';
}
