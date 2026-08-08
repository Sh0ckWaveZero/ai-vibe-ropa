import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '$lib/api/client';
import SetupTwoFactorPageHarness from './SetupTwoFactorPageHarness.svelte';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$lib/api/client', () => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {
    status = 500;
  },
}));

const setupSecret = 'JBSWY3DPEHPK3PXP';

describe('2FA setup page', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockResolvedValue({
      qrCodeDataUrl: 'data:image/png;base64,cXItY29kZQ==',
      secret: setupSecret,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('masks the manual setup key by default and exposes an accessible visibility toggle', async () => {
    const user = userEvent.setup();
    render(SetupTwoFactorPageHarness);

    const secret = await screen.findByTestId('setup-2fa-secret');
    expect(secret).toHaveClass('blur-sm', 'select-none');
    expect(secret).toHaveAttribute('aria-hidden', 'true');

    const showButton = screen.getByRole('button', { name: 'Show' });
    expect(showButton).toHaveAttribute('aria-expanded', 'false');

    await user.click(showButton);

    expect(secret).not.toHaveClass('blur-sm', 'select-none');
    expect(secret).toHaveAttribute('aria-hidden', 'false');
    expect(screen.getByRole('button', { name: 'Hide setup key' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('copies the real setup key while masked and animates accessible success feedback', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    render(SetupTwoFactorPageHarness);

    const secret = await screen.findByTestId('setup-2fa-secret');
    const copyStatus = screen.getByRole('status');
    expect(copyStatus.textContent?.trim()).toBe('');
    expect(copyStatus).toHaveAttribute('aria-atomic', 'true');
    await user.click(screen.getByRole('button', { name: 'Copy' }));

    expect(secret).toHaveAttribute('aria-hidden', 'true');
    expect(writeText).toHaveBeenCalledWith(setupSecret);
    expect(screen.getByRole('status')).toHaveTextContent('Setup key copied');
    expect(screen.getByTestId('setup-2fa-copy-icon')).toHaveClass('scale-75', 'opacity-0', 'motion-reduce:transition-none');
    expect(screen.getByTestId('setup-2fa-copy-success-icon')).toHaveClass('scale-100', 'opacity-100', 'motion-reduce:transition-none');
  });

  it('announces clipboard failures without revealing the setup key', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('Clipboard unavailable')) },
    });
    render(SetupTwoFactorPageHarness);

    const secret = await screen.findByTestId('setup-2fa-secret');
    await user.click(screen.getByRole('button', { name: 'Copy' }));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Could not copy setup key'));
    expect(secret).toHaveAttribute('aria-hidden', 'true');
  });
});
