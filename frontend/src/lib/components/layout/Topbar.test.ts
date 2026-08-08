import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TopbarHarness from './TopbarHarness.svelte';

vi.mock('$app/navigation', () => ({
  goto: vi.fn(),
  invalidateAll: vi.fn(),
}));

describe('Topbar account menu', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        const body = url.includes('unread-count') ? { count: 0 } : { notifications: [] };
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }),
    );
  });

  it('opens with arrow keys and exposes menu state and relationships', async () => {
    const user = userEvent.setup();
    render(TopbarHarness);

    const trigger = screen.getByRole('button', { name: 'User menu: Ada Lovelace' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    trigger.focus();
    await user.keyboard('{ArrowDown}');

    const menu = screen.getByRole('menu', { name: 'User menu: Ada Lovelace' });
    expect(menu).not.toContainElement(screen.getByText('Administrator'));
    expect(trigger).toHaveAttribute('aria-controls', menu.id);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menuitem', { name: 'Profile' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('menuitem', { name: 'Log out' })).toHaveFocus();
  });

  it('moves focus with arrow keys and dismisses when Tab leaves', async () => {
    const user = userEvent.setup();
    render(TopbarHarness);

    await user.click(screen.getByRole('button', { name: 'User menu: Ada Lovelace' }));
    const profile = screen.getByRole('menuitem', { name: 'Profile' });
    const logout = screen.getByRole('menuitem', { name: 'Log out' });
    await waitFor(() => expect(profile).toHaveFocus());

    await user.keyboard('{ArrowDown}');
    expect(logout).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(profile).toHaveFocus();
    await user.keyboard('{End}');
    expect(logout).toHaveFocus();
    await user.keyboard('{Home}');
    expect(profile).toHaveFocus();

    await user.tab();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'After topbar' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'User menu: Ada Lovelace' }));
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Profile' })).toHaveFocus());
    await user.tab({ shift: true });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Toggle theme' })).toHaveFocus();
  });
});
