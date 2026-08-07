import type { Dictionary } from './dictionary';
import { th } from './locales/th';
import { en } from './locales/en';
import { zh } from './locales/zh';
import type { Locale } from './types';

export const dictionaries: Record<Locale, Dictionary> = { th, en, zh };
