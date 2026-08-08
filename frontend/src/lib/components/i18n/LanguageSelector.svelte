<script lang="ts">
  import { tick } from 'svelte';
  import { getLocaleContext, LOCALES, LOCALE_LABELS, setLocaleCookie, type Locale } from '$lib/i18n';

  const { locale, t } = getLocaleContext();
  const componentId = $props.id();
  const menuId = `${componentId}-menu`;

  let rootElement: HTMLDivElement;
  let triggerElement: HTMLButtonElement;
  let optionElements = $state<HTMLButtonElement[]>([]);
  let open = $state(false);
  let activeIndex = $state(0);

  async function focusOption(index: number) {
    activeIndex = (index + LOCALES.length) % LOCALES.length;
    await tick();
    optionElements[activeIndex]?.focus();
  }

  async function openMenu() {
    open = true;
    await focusOption(LOCALES.indexOf($locale));
  }

  async function closeMenu(restoreFocus = false) {
    open = false;
    if (restoreFocus) {
      await tick();
      triggerElement?.focus();
    }
  }

  async function selectLocale(nextLocale: Locale) {
    locale.set(nextLocale);
    setLocaleCookie(nextLocale);
    await closeMenu(true);
  }

  function handleTriggerKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      void openMenu();
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      void closeMenu(true);
    }
  }

  function handleOptionKeydown(event: KeyboardEvent, index: number) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        void focusOption(index + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        void focusOption(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        void focusOption(0);
        break;
      case 'End':
        event.preventDefault();
        void focusOption(LOCALES.length - 1);
        break;
      case 'Escape':
        event.preventDefault();
        void closeMenu(true);
        break;
    }
  }

  function handleFocusOut(event: FocusEvent) {
    const nextTarget = event.relatedTarget;
    if (open && nextTarget instanceof Node && !rootElement.contains(nextTarget)) {
      open = false;
    }
  }

  function handleDocumentPointerDown(event: PointerEvent) {
    const target = event.target;
    if (!open || !(target instanceof Element) || rootElement.contains(target)) return;

    const focusableTarget = target.closest(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [contenteditable="true"], [tabindex]:not([tabindex="-1"])',
    );
    if (!focusableTarget) {
      event.preventDefault();
      void closeMenu(true);
    }
  }

  function handleDocumentClick(event: MouseEvent) {
    const target = event.target;
    if (open && target instanceof Node && !rootElement.contains(target)) {
      const focusIsStillInside = document.activeElement instanceof Node && rootElement.contains(document.activeElement);
      void closeMenu(focusIsStillInside);
    }
  }
</script>

<svelte:document onpointerdown={handleDocumentPointerDown} onclick={handleDocumentClick} />

<div class="relative" bind:this={rootElement} onfocusout={handleFocusOut}>
  <button
    bind:this={triggerElement}
    type="button"
    class="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-border bg-surface-raised px-3 text-sm font-medium text-body shadow-sm transition-colors hover:border-primary/50 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    aria-label={$t('language.selectorLabel', { language: LOCALE_LABELS[$locale] })}
    aria-haspopup="listbox"
    aria-expanded={open}
    aria-controls={menuId}
    onclick={() => (open ? closeMenu() : openMenu())}
    onkeydown={handleTriggerKeydown}
  >
    <svg
      viewBox="0 0 24 24"
      class="size-5 shrink-0 text-primary"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3.5 9h17M3.5 15h17M12 3c2.1 2.45 3.2 5.45 3.2 9S14.1 18.55 12 21M12 3C9.9 5.45 8.8 8.45 8.8 12s1.1 6.55 3.2 9" />
    </svg>
    <span lang={$locale}>{LOCALE_LABELS[$locale]}</span>
    <svg
      viewBox="0 0 20 20"
      class="size-4 shrink-0 text-muted transition-transform duration-150 max-[359px]:hidden {open
        ? 'rotate-180'
        : ''}"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fill-rule="evenodd"
        d="M5.22 7.72a.75.75 0 011.06 0L10 11.44l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 8.78a.75.75 0 010-1.06z"
        clip-rule="evenodd"
      />
    </svg>
  </button>

  {#if open}
    <div
      id={menuId}
      role="listbox"
      aria-label={$t('language.menuLabel')}
      class="absolute right-0 z-[60] mt-2 min-w-44 overflow-hidden rounded-xl border border-border bg-surface-raised p-1.5 shadow-xl shadow-black/10"
    >
      {#each LOCALES as optionLocale, index (optionLocale)}
        <button
          bind:this={optionElements[index]}
          type="button"
          role="option"
          aria-selected={$locale === optionLocale}
          tabindex={activeIndex === index ? 0 : -1}
          class="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition-colors hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary {$locale ===
          optionLocale
            ? 'text-primary'
            : 'text-body'}"
          onclick={() => selectLocale(optionLocale)}
          onfocus={() => (activeIndex = index)}
          onkeydown={(event) => handleOptionKeydown(event, index)}
        >
          <span class="flex size-5 shrink-0 items-center justify-center" aria-hidden="true">
            {#if $locale === optionLocale}
              <svg viewBox="0 0 20 20" class="size-4" fill="currentColor">
                <path
                  fill-rule="evenodd"
                  d="M16.704 5.292a1 1 0 010 1.416l-8 8a1 1 0 01-1.416 0l-4-4a1 1 0 011.416-1.416L8 12.586l7.296-7.294a1 1 0 011.408 0z"
                  clip-rule="evenodd"
                />
              </svg>
            {/if}
          </span>
          <span lang={optionLocale}>{LOCALE_LABELS[optionLocale]}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>
