import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import LanguageSelectorHarness from './LanguageSelectorHarness.svelte';

describe('LanguageSelector', () => {
  beforeEach(() => {
    document.cookie = 'ropa_locale=; path=/; max-age=0';
    document.documentElement.lang = 'en';
  });

  it('exposes the current locale and selected option', async () => {
    const user = userEvent.setup();
    render(LanguageSelectorHarness);

    const trigger = screen.getByRole('button', { name: 'Change language. Current language: English' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveTextContent('English');

    await user.click(trigger);

    const listbox = screen.getByRole('listbox', { name: 'Choose a language' });
    expect(listbox).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-controls', listbox.id);
    expect(screen.getByRole('option', { name: 'English' })).toHaveAttribute('aria-selected', 'true');
  });

  it('supports arrow navigation and Enter selection', async () => {
    const user = userEvent.setup();
    render(LanguageSelectorHarness);

    const trigger = screen.getByRole('button', { name: 'Change language. Current language: English' });
    trigger.focus();
    await user.keyboard('{ArrowDown}');

    const englishOption = screen.getByRole('option', { name: 'English' });
    await waitFor(() => expect(englishOption).toHaveFocus());

    await user.keyboard('{ArrowDown}{Enter}');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '切换语言。当前语言：中文' })).toHaveFocus();
    expect(document.cookie).toContain('ropa_locale=zh');
    expect(document.documentElement.lang).toBe('zh');
  });

  it('opens the trigger with Enter and Space', async () => {
    const user = userEvent.setup();
    render(LanguageSelectorHarness);

    const trigger = screen.getByRole('button', { name: 'Change language. Current language: English' });
    trigger.focus();
    await user.keyboard('{Enter}');
    await waitFor(() => expect(screen.getByRole('option', { name: 'English' })).toHaveFocus());

    await user.keyboard('{Escape}');
    await user.keyboard(' ');
    await waitFor(() => expect(screen.getByRole('option', { name: 'English' })).toHaveFocus());
  });

  it('supports Arrow Up and Space selection', async () => {
    const user = userEvent.setup();
    render(LanguageSelectorHarness);

    await user.click(screen.getByRole('button', { name: 'Change language. Current language: English' }));
    await user.keyboard('{ArrowUp} ');

    expect(screen.getByRole('button', { name: 'เปลี่ยนภาษา ภาษาปัจจุบัน: ไทย' })).toHaveFocus();
    expect(document.cookie).toContain('ropa_locale=th');
  });

  it('dismisses with Escape, Tab, and an outside click', async () => {
    const user = userEvent.setup();
    render(LanguageSelectorHarness);

    const trigger = screen.getByRole('button', { name: 'Change language. Current language: English' });
    await user.click(trigger);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    await user.tab();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Outside target' })).toHaveFocus();

    await user.click(trigger);
    const outsideButton = screen.getByRole('button', { name: 'Outside target' });
    await user.click(outsideButton);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(outsideButton).toHaveFocus();

    await user.click(trigger);
    await user.click(screen.getByTestId('outside-surface'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
