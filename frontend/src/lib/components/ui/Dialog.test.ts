import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import DialogHarness from './DialogHarness.svelte';

describe('Dialog', () => {
  it('centers the modal within the viewport', () => {
    const { container } = render(DialogHarness);
    const dialog = container.querySelector('dialog');

    expect(dialog).toHaveClass(
      'fixed',
      'inset-0',
      'm-auto',
      'h-fit',
      'max-h-[calc(100dvh-2rem)]',
    );
  });
});
