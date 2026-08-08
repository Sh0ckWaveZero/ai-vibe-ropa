import { render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import SidebarHarness from './SidebarHarness.svelte';

vi.mock('$app/state', () => ({
  page: { url: new URL('https://ropa.test/') },
}));

describe('Sidebar branding', () => {
  it('shows the decorative logo beside the visible ROPA brand name', () => {
    const { container } = render(SidebarHarness);
    const logo = container.querySelector('img[src="/ropa-logo.png"]');

    expect(screen.getByText('ROPA')).toBeInTheDocument();
    expect(logo).toHaveAttribute('alt', '');
    expect(logo).toHaveAttribute('width', '28');
    expect(logo).toHaveAttribute('height', '28');
  });
});
