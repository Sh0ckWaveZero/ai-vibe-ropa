<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import { getLocaleContext } from '$lib/i18n';
  import { theme, toggleTheme } from '$lib/stores/theme';
  import { apiFetch } from '$lib/api/client';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import NotificationBell from '$lib/components/layout/NotificationBell.svelte';
  import LanguageSelector from '$lib/components/i18n/LanguageSelector.svelte';
  import type { SessionUser } from '../../../app';

  let { user, onMenuClick }: { user: SessionUser; onMenuClick: () => void } = $props();

  const { locale, t } = getLocaleContext();

  let userMenuOpen = $state(false);
  let logoutOpen = $state(false);
  let loggingOut = $state(false);

  function roleName(user: SessionUser) {
    return $locale === 'th' ? user.roleNameTh : $locale === 'zh' ? user.roleNameZh : user.roleNameEn;
  }

  function departmentName(user: SessionUser) {
    const name =
      $locale === 'th' ? user.departmentNameTh : $locale === 'zh' ? user.departmentNameZh : user.departmentNameEn;
    return name ?? $t('users.noDepartment');
  }

  async function confirmLogout() {
    loggingOut = true;
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      loggingOut = false;
      logoutOpen = false;
      await invalidateAll();
      await goto('/login');
    }
  }
</script>

<header class="flex h-14 items-center justify-between border-b border-border bg-surface-raised px-2 sm:px-4">
  <button
    class="flex size-11 shrink-0 items-center justify-center rounded-md text-body hover:bg-surface-muted md:hidden"
    onclick={onMenuClick}
    aria-label="Menu"
  >
    <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M4 6h16M4 12h16M4 18h16" stroke-linecap="round" />
    </svg>
  </button>

  <div class="hidden md:block"></div>

  <div class="flex items-center gap-1 sm:gap-2">
    <LanguageSelector />

    <NotificationBell />

    <button
      onclick={toggleTheme}
      class="flex size-11 shrink-0 items-center justify-center rounded-md text-body hover:bg-surface-muted"
      aria-label={$t('theme.toggle')}
      title={$t('theme.toggle')}
    >
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

    <div class="relative">
      <button
        onclick={() => (userMenuOpen = !userMenuOpen)}
        class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface-muted"
      >
        <span class="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-contrast">
          {user.fullName.slice(0, 1).toUpperCase()}
        </span>
        <span class="hidden text-left sm:block">
          <span class="block text-sm font-medium text-body">{user.fullName}</span>
          <span class="block text-xs text-muted">{roleName(user)}</span>
        </span>
      </button>

      {#if userMenuOpen}
        <button
          class="fixed inset-0 z-40 cursor-default"
          aria-label="Close menu"
          onclick={() => (userMenuOpen = false)}
        ></button>
        <div
          class="absolute right-0 z-50 mt-2 w-56 rounded-md border border-border bg-surface-raised p-1 shadow-lg"
        >
          <div class="px-3 py-2 text-xs text-muted">
            {departmentName(user)}
          </div>
          <button
            class="w-full rounded-md px-3 py-2 text-left text-sm text-body hover:bg-surface-muted"
            onclick={() => {
              userMenuOpen = false;
              goto('/profile');
            }}
          >
            {$t('nav.profile')}
          </button>
          <button
            class="w-full rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-surface-muted"
            onclick={() => {
              userMenuOpen = false;
              logoutOpen = true;
            }}
          >
            {$t('nav.logout')}
          </button>
        </div>
      {/if}
    </div>
  </div>
</header>

<Dialog bind:open={logoutOpen} title={$t('auth.logoutConfirmTitle')}>
  <p class="text-muted">{$t('auth.logoutConfirmBody')}</p>
  {#snippet footer()}
    <Button variant="secondary" onclick={() => (logoutOpen = false)}>{$t('common.cancel')}</Button>
    <Button variant="danger" loading={loggingOut} onclick={confirmLogout}>{$t('nav.logout')}</Button>
  {/snippet}
</Dialog>
