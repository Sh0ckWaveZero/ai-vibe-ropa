import { describe, expect, it, vi } from 'vitest';

describe('locale context module identity', () => {
  it('keeps the context key stable when the module is reloaded', async () => {
    const firstModule = await import('$lib/i18n');

    vi.resetModules();
    const reloadedModule = await import('$lib/i18n');

    expect(reloadedModule.LOCALE_CONTEXT_KEY).toBe(firstModule.LOCALE_CONTEXT_KEY);
  });
});
