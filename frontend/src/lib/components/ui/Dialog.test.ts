import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it } from 'vitest';
import DialogHarness from './DialogHarness.svelte';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };

  HTMLDialogElement.prototype.close = function () {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
});

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
      'custom-dialog',
    );
    expect(dialog?.querySelector('h2')).toHaveClass('custom-title');
    expect(dialog?.querySelector('.custom-header')).toBeInTheDocument();
    expect(dialog?.querySelector('.custom-content')).toBeInTheDocument();
    expect(dialog?.querySelector('.custom-footer')).toBeInTheDocument();
  });

  it('exposes its title as its accessible name', async () => {
    const user = userEvent.setup();
    render(DialogHarness);

    await user.click(screen.getByRole('button', { name: 'User menu' }));
    await user.click(screen.getByRole('button', { name: 'Open logout dialog' }));

    const dialog = screen.getByRole('dialog', { name: 'Confirm logout' });
    const heading = screen.getByRole('heading', { name: 'Confirm logout' });
    expect(dialog).toHaveAttribute('aria-labelledby', heading.id);
  });

  it('focuses the safe action and returns focus to the opener when closed', async () => {
    const user = userEvent.setup();
    render(DialogHarness);

    const opener = screen.getByRole('button', { name: 'User menu' });
    await user.click(opener);
    await user.click(screen.getByRole('button', { name: 'Open logout dialog' }));

    const cancel = screen.getByRole('button', { name: 'Cancel' });
    await waitFor(() => expect(cancel).toHaveFocus());

    await user.click(cancel);
    await waitFor(() => expect(opener).toHaveFocus());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('dismisses from the backdrop without treating the dialog surface as backdrop', async () => {
    const user = userEvent.setup();
    render(DialogHarness);

    const opener = screen.getByRole('button', { name: 'User menu' });
    await user.click(opener);
    await user.click(screen.getByRole('button', { name: 'Open logout dialog' }));
    const dialog = screen.getByRole('dialog', { name: 'Confirm logout' });
    dialog.getBoundingClientRect = () =>
      ({ top: 100, right: 500, bottom: 400, left: 100, width: 400, height: 300, x: 100, y: 100, toJSON() {} }) as DOMRect;

    await fireEvent.click(dialog, { clientX: 200, clientY: 200 });
    expect(dialog).toHaveAttribute('open');

    await fireEvent.click(dialog, { clientX: 20, clientY: 20 });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(opener).toHaveFocus();
  });
});
