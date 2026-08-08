import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pendingBackupCodes } from '$lib/stores/pendingBackupCodes';
import BackupCodesPageHarness from './BackupCodesPageHarness.svelte';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

const codes = ['AAAA-BBBB', 'CCCC-DDDD'];

describe('Backup codes page', () => {
  beforeEach(() => {
    pendingBackupCodes.set(codes);
  });

  afterEach(() => {
    pendingBackupCodes.set(null);
    vi.restoreAllMocks();
  });

  it('blurs and hides the backup codes from assistive technology by default', () => {
    render(BackupCodesPageHarness);

    expect(document.getElementById('backup-codes-page')).toBeInTheDocument();
    expect(document.getElementById('backup-codes-content')).toBeInTheDocument();
    expect(document.getElementById('backup-codes-actions')).toBeInTheDocument();
    expect(screen.getByTestId('backup-codes-list')).toHaveClass('blur-sm', 'select-none');
    expect(screen.getByTestId('backup-codes-list')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('button', { name: 'Show' })).toHaveAttribute('id', 'backup-codes-visibility-button');
    expect(screen.getByRole('button', { name: 'Show' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: 'Download' })).toHaveAttribute('id', 'backup-codes-download-button');
    expect(screen.getByRole('button', { name: "I've saved these codes" })).toHaveAttribute('id', 'backup-codes-confirm-button');
    expect(document.getElementById('backup-code-1')).toHaveTextContent(codes[0]);
    expect(document.getElementById('backup-code-2')).toHaveTextContent(codes[1]);
  });

  it('reveals and hides the codes with an accessible toggle', async () => {
    const user = userEvent.setup();
    render(BackupCodesPageHarness);

    const showButton = screen.getByRole('button', { name: 'Show' });
    await user.click(showButton);

    expect(screen.getByTestId('backup-codes-list')).not.toHaveClass('blur-sm', 'select-none');
    expect(screen.getByTestId('backup-codes-list')).toHaveAttribute('aria-hidden', 'false');
    expect(screen.getByRole('button', { name: 'Hide backup codes' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('downloads the codes as a text file', async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:backup-codes');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    render(BackupCodesPageHarness);

    await user.click(screen.getByRole('button', { name: 'Download' }));
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:backup-codes');
  });
});
