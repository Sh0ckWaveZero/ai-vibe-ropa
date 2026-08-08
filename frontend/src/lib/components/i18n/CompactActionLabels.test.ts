import { describe, expect, it } from 'vitest';
import { dictionaries } from '$lib/i18n/dictionaries';

describe('compact action labels', () => {
  it.each([
    ['th', 'แสดง', 'คัดลอก', 'ดาวน์โหลด'],
    ['en', 'Show', 'Copy', 'Download'],
    ['zh', '显示', '复制', '下载'],
  ] as const)('uses compact labels for %s', (locale, show, copy, download) => {
    const { twoFactor } = dictionaries[locale];

    expect(twoFactor.showSetupSecret).toBe(show);
    expect(twoFactor.copySetupSecret).toBe(copy);
    expect(twoFactor.showBackupCodes).toBe(show);
    expect(twoFactor.downloadBackupCodes).toBe(download);
  });
});
