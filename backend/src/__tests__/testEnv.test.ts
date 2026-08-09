import { afterEach, describe, expect, it } from 'vitest';
import { loadTestEnv } from './testEnv.js';

const originalDatabaseUrl = process.env.DATABASE_URL;

afterEach(() => {
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }
});

describe('test environment safety', () => {
  it('overrides an inherited DATABASE_URL with the dedicated test database', () => {
    process.env.DATABASE_URL = 'postgresql://unsafe:unsafe@production.invalid:5432/unsafe';

    const parsed = loadTestEnv();

    expect(parsed.DATABASE_URL).toMatch(/\/ropa_test\?/);
    expect(process.env.DATABASE_URL).toBe(parsed.DATABASE_URL);
  });
});
