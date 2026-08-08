import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import AccessibilityHarness from './AccessibilityHarness.svelte';

describe('shared UI accessibility contracts', () => {
  it('associates form labels, hints, errors, and invalid state', () => {
    render(AccessibilityHarness);

    const email = screen.getByRole('textbox', { name: 'Email' });
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAccessibleDescription('Use your work email Email is required');
    expect(screen.getByRole('alert')).toHaveTextContent('Email is required');

    expect(screen.getByRole('combobox', { name: 'Department' })).toHaveAccessibleDescription(
      'Choose one department',
    );
    expect(screen.getByRole('textbox', { name: 'Notes' })).toHaveAccessibleDescription('Optional context');
    expect(screen.getByRole('textbox', { name: 'Recipients' })).toHaveAccessibleDescription('Press Enter to add');
    expect(screen.getByRole('checkbox', { name: 'Read users' })).toBeInTheDocument();
  });

  it('defaults action buttons to a non-submitting type and names pagination', () => {
    render(AccessibilityHarness);

    expect(screen.getByRole('button', { name: 'Default action' })).toHaveAttribute('type', 'button');
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toHaveTextContent('Showing 1-10 of 25');
  });
});
