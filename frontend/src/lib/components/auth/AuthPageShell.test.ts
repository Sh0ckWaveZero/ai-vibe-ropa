import { render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import AuthPageShellHarness from './AuthPageShellHarness.svelte';

describe('AuthPageShell', () => {
  beforeEach(() => {
    document.head.querySelectorAll('[data-auth-page-meta]').forEach((element) => element.remove());
  });

  it('shows the ROPA brand with a decorative optimized logo', () => {
    const { container } = render(AuthPageShellHarness);

    expect(screen.getByText('ROPA')).toBeInTheDocument();
    expect(container.querySelector('img[src="/ropa-logo.png"]')).toHaveAttribute('alt', '');
    expect(container.querySelector('img[src="/ropa-logo.png"]')).toHaveAttribute('width', '64');
    expect(container.querySelector('img[src="/ropa-logo.png"]')).toHaveAttribute('height', '64');
  });

  it('adds descriptive page and social metadata', () => {
    render(AuthPageShellHarness);

    expect(document.title).toBe('Sign in | ROPA');
    expect(document.head.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      'Access your ROPA workspace securely',
    );
    expect(document.head.querySelector('meta[name="application-name"]')).toHaveAttribute('content', 'ROPA');
    expect(document.head.querySelector('meta[name="theme-color"]')).toHaveAttribute('content', '#fafafa');
    expect(document.head.querySelector('meta[property="og:title"]')).toHaveAttribute('content', 'Sign in | ROPA');
    expect(document.head.querySelector('meta[property="og:description"]')).toHaveAttribute(
      'content',
      'Access your ROPA workspace securely',
    );
    expect(document.head.querySelector('meta[property="og:type"]')).toHaveAttribute('content', 'website');
  });
});
