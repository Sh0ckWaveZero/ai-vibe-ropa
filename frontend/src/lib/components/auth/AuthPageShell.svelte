<script lang="ts">
  import type { Snippet } from 'svelte';
  import { getLocaleContext, setLocaleCookie, LOCALES, LOCALE_LABELS, type Locale } from '$lib/i18n';
  import { theme, toggleTheme } from '$lib/stores/theme';

  let { id, title, subtitle, children }: { id?: string; title: string; subtitle?: string; children: Snippet } = $props();

  const { locale, t } = getLocaleContext();

  function selectLocale(loc: Locale) {
    locale.set(loc);
    setLocaleCookie(loc);
  }
</script>

<div {id} class="flex min-h-screen flex-col bg-surface">
  <div class="flex items-center justify-end gap-2 p-4">
    <div class="flex items-center rounded-md border border-border p-0.5 text-xs">
      {#each LOCALES as loc (loc)}
        <button
          onclick={() => selectLocale(loc)}
          class="rounded px-2 py-1 font-medium transition-colors {$locale === loc
            ? 'bg-primary text-primary-contrast'
            : 'text-muted hover:text-body'}"
        >
          {LOCALE_LABELS[loc]}
        </button>
      {/each}
    </div>
    <button onclick={toggleTheme} class="rounded-md p-2 text-body hover:bg-surface-muted" aria-label={$t('theme.toggle')}>
      {#if $theme === 'dark'}
        <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="4" />
          <path
            d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
            stroke-linecap="round"
          />
        </svg>
      {:else}
        <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke-linejoin="round" />
        </svg>
      {/if}
    </button>
  </div>

  <div class="flex flex-1 items-center justify-center px-4 pb-16">
    <div class="w-full max-w-sm">
      <div class="mb-6 text-center">
        <div class="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10">
          <span class="size-3 rounded-full bg-primary" aria-hidden="true"></span>
        </div>
        <h1 class="text-xl font-semibold text-body">{title}</h1>
        {#if subtitle}
          <p class="mt-1 text-sm text-muted">{subtitle}</p>
        {/if}
      </div>

      <div class="rounded-lg border border-border bg-surface-raised p-6 shadow-sm">
        {@render children()}
      </div>
    </div>
  </div>
</div>
