import type { LayoutServerLoad } from './$types';
import { fetchCurrentUser } from '$lib/server/backend';
import { LOCALE_COOKIE, isLocale, type Locale } from '$lib/i18n/types';

export const load: LayoutServerLoad = async (event) => {
  const user = await fetchCurrentUser(event);
  const cookieLocale = event.cookies.get(LOCALE_COOKIE);
  const locale: Locale = isLocale(cookieLocale) ? cookieLocale : 'th';

  return { user, locale };
};
