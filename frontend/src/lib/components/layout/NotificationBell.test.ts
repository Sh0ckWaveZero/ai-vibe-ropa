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
        const body = url.includes('unread-count')
          ? { count: 2 }
          : {
              notifications: [
                {
                  id: 'notification-1',
                  type: 'ropa.submitted',
                  entityType: 'RopaRecord',
                  entityId: 'ropa-1',
                  metadata: { referenceNo: 'ROPA-001' },
                  isRead: false,
                  createdAt: '2026-08-08T10:00:00.000Z',
                },
                {
                  id: 'notification-2',
                  type: 'ropa.approved',
                  entityType: 'RopaRecord',
                  entityId: 'ropa-2',
                  metadata: { referenceNo: 'ROPA-002' },
                  isRead: true,
                  createdAt: '2026-08-08T09:00:00.000Z',
                },
              ],
            };
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }),
    );
  });

  it('exposes menu state and restores trigger focus on Escape', async () => {
    const user = userEvent.setup();
    render(NotificationBellHarness);

    const trigger = screen.getByRole('button', { name: 'Notifications' });
    expect(trigger).toHaveAttribute('id', 'test-notifications-trigger');
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);

    const panel = await screen.findByRole('menu', { name: 'Notifications' });
    expect(panel).not.toContainElement(screen.getByRole('heading', { name: 'Notifications' }));
    expect(panel).toHaveAttribute('id', 'test-notifications-panel');
    expect(trigger).toHaveAttribute('aria-controls', panel.id);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('menu', { name: 'Notifications' })).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('focuses actions and supports arrow and Tab navigation', async () => {
    const user = userEvent.setup();
    render(NotificationBellHarness);

    const trigger = screen.getByRole('button', { name: 'Notifications' });
    trigger.focus();
    await user.keyboard('{ArrowDown}');

    const markAllRead = await screen.findByRole('menuitem', { name: 'Mark all as read' });
    const firstNotification = screen.getByRole('menuitem', { name: /ROPA-001 was submitted for approval/ });
    const secondNotification = screen.getByRole('menuitem', { name: /ROPA-002 was approved/ });
    await waitFor(() => expect(markAllRead).toHaveFocus());

    await user.keyboard('{ArrowDown}');
    expect(firstNotification).toHaveFocus();
    await user.keyboard('{End}');
    expect(secondNotification).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(markAllRead).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(secondNotification).toHaveFocus();
    await user.keyboard('{Home}');
    expect(markAllRead).toHaveFocus();

    await user.tab();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'After notifications' })).toHaveFocus();

    trigger.focus();
    await user.keyboard('{ArrowDown}');
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Mark all as read' })).toHaveFocus());
    await user.tab({ shift: true });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Before notifications' })).toHaveFocus();
  });

  it('opens at the last action with Arrow Up', async () => {
    const user = userEvent.setup();
    render(NotificationBellHarness);

    const trigger = screen.getByRole('button', { name: 'Notifications' });
    trigger.focus();
    await user.keyboard('{ArrowUp}');

    await waitFor(() =>
      expect(screen.getByRole('menuitem', { name: /ROPA-002 was approved/ })).toHaveFocus(),
    );
  });
});
