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
    expect(document.getElementById('test-language-selector')).toBeInTheDocument();
    expect(trigger).toHaveAttribute('id', 'test-language-selector-trigger');
    const currentFlag = document.getElementById('test-language-selector-current-flag');
    expect(currentFlag).toHaveClass('fi', 'fi-gb');
    expect(currentFlag).toHaveAttribute('aria-hidden', 'true');
    expect(currentFlag).toHaveClass('shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]');
    expect(trigger).toHaveClass('border-transparent', 'bg-surface-muted/50', 'shadow-none');
    expect(trigger).toHaveClass(
      'hover:bg-surface-muted',
      'focus-visible:outline-2',
      'focus-visible:outline-offset-2',
      'focus-visible:outline-primary',
    );
    expect(trigger).not.toHaveClass('border-border', 'shadow-sm');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveTextContent('English');

    await user.click(trigger);

    const listbox = screen.getByRole('listbox', { name: 'Choose a language' });
    expect(listbox).toBeInTheDocument();
    expect(trigger).toHaveClass('ring-1', 'ring-primary/40');
    expect(listbox).toHaveAttribute('id', 'test-language-selector-listbox');
    expect(trigger).toHaveAttribute('aria-controls', listbox.id);
    const englishOption = screen.getByRole('option', { name: 'English' });
    expect(englishOption).toHaveAttribute('id', 'test-language-selector-option-en');
    expect(englishOption).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: 'ไทย' })).toHaveAttribute('id', 'test-language-selector-option-th');
    expect(screen.getByRole('option', { name: '中文' })).toHaveAttribute('id', 'test-language-selector-option-zh');
    expect(document.getElementById('test-language-selector-option-th-flag')).toHaveClass('fi', 'fi-th');
    expect(document.getElementById('test-language-selector-option-en-flag')).toHaveClass('fi', 'fi-gb');
    expect(document.getElementById('test-language-selector-option-zh-flag')).toHaveClass('fi', 'fi-cn');
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
    expect(document.getElementById('test-language-selector-current-flag')).toHaveClass('fi', 'fi-cn');
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
