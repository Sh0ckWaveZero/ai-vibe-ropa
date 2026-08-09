import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NotificationBellHarness from './NotificationBellHarness.svelte';

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        const body = url.includes('unread-count') ? { count: 2 } : { notifications: [] };
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }),
    );
  });

  it('exposes disclosure state and restores trigger focus on Escape', async () => {
    const user = userEvent.setup();
    render(NotificationBellHarness);

    const trigger = screen.getByRole('button', { name: 'Notifications' });
    expect(trigger).toHaveAttribute('id', 'test-notifications-trigger');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);

    const panel = screen.getByRole('region', { name: 'Notifications' });
    expect(panel).toHaveAttribute('id', 'test-notifications-panel');
    expect(trigger).toHaveAttribute('aria-controls', panel.id);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('region', { name: 'Notifications' })).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});
