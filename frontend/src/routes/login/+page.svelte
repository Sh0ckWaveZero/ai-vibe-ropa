<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import { getLocaleContext, setLocaleCookie, LOCALES, LOCALE_LABELS, type Locale } from '$lib/i18n';
  import { theme, toggleTheme } from '$lib/stores/theme';
  import { apiFetch, ApiError } from '$lib/api/client';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';

  const { locale, t } = getLocaleContext();

  let email = $state('');
  let password = $state('');
  let submitting = $state(false);
  let errorMessage = $state('');

  function selectLocale(loc: Locale) {
    locale.set(loc);
    setLocaleCookie(loc);
  }

  async function onSubmit(event: SubmitEvent) {
    event.preventDefault();
    submitting = true;
    errorMessage = '';
    try {
      await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      await invalidateAll();
      await goto('/');
    } catch (err) {
      errorMessage = err instanceof ApiError ? $t('auth.invalidCredentials') : $t('common.error');
    } finally {
      submitting = false;
    }
  }
</script>

<div class="flex min-h-screen flex-col bg-surface">
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
        <h1 class="text-xl font-semibold text-body">{$t('auth.loginTitle')}</h1>
        <p class="mt-1 text-sm text-muted">{$t('auth.loginSubtitle')}</p>
      </div>

      <form onsubmit={onSubmit} class="flex flex-col gap-4 rounded-lg border border-border bg-surface-raised p-6 shadow-sm">
        <Input label={$t('auth.email')} type="email" bind:value={email} required autocomplete="username" />
        <Input
          label={$t('auth.password')}
          type="password"
          bind:value={password}
          required
          autocomplete="current-password"
        />

        {#if errorMessage}
          <p class="text-sm text-red-600">{errorMessage}</p>
        {/if}

        <Button type="submit" loading={submitting} class="w-full">
          {submitting ? $t('auth.signingIn') : $t('auth.signIn')}
        </Button>
      </form>
    </div>
  </div>
</div>
