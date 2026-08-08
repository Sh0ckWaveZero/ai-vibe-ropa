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

  let {
    user,
    mobileMenuOpen,
    onMenuClick,
  }: { user: SessionUser; mobileMenuOpen: boolean; onMenuClick: () => void } = $props();

  const { locale, t } = getLocaleContext();

  let userMenuOpen = $state(false);
  let logoutOpen = $state(false);
  let loggingOut = $state(false);
  let userMenuTriggerEl: HTMLButtonElement | undefined = $state();
  const userMenuTriggerId = 'topbar-user-menu-trigger';
  const userMenuPanelId = 'topbar-user-menu-panel';

  function closeUserMenu(restoreFocus = false) {
    userMenuOpen = false;
    if (restoreFocus) userMenuTriggerEl?.focus();
  }

  function handleUserMenuKeydown(event: KeyboardEvent) {
    if (event.key !== 'Escape' || !userMenuOpen) return;
    event.preventDefault();
    closeUserMenu(true);
  }

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

<svelte:window onkeydown={handleUserMenuKeydown} />

<header class="flex h-14 items-center justify-between border-b border-border bg-surface-raised px-2 sm:px-4">
  <button
    id="mobile-navigation-trigger"
    type="button"
    class="flex size-11 shrink-0 items-center justify-center rounded-md text-body hover:bg-surface-muted md:hidden"
    onclick={onMenuClick}
    aria-label={$t('nav.menu')}
    aria-expanded={mobileMenuOpen}
    aria-controls="primary-sidebar"
  >
    <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" stroke-linecap="round" />
    </svg>
  </button>

  <div class="hidden md:block"></div>

  <div class="flex items-center gap-1 sm:gap-2">
    <LanguageSelector id="topbar-language-selector" />

    <NotificationBell id="topbar-notifications" />

    <button
      type="button"
      onclick={toggleTheme}
      class="flex size-11 shrink-0 items-center justify-center rounded-md text-body hover:bg-surface-muted"
      aria-label={$t('theme.toggle')}
      title={$t('theme.toggle')}
    >
      {#if $theme === 'dark'}
        <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path
            d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
            stroke-linecap="round"
          />
        </svg>
      {:else}
        <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke-linejoin="round" />
        </svg>
      {/if}
    </button>

    <div class="relative">
      <button
        id={userMenuTriggerId}
        bind:this={userMenuTriggerEl}
        type="button"
        onclick={() => (userMenuOpen = !userMenuOpen)}
        onkeydown={handleUserMenuKeydown}
        class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface-muted"
        aria-label={`${$t('nav.userMenu')}: ${user.fullName}`}
        aria-expanded={userMenuOpen}
        aria-controls={userMenuPanelId}
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
          type="button"
          tabindex="-1"
          class="fixed inset-0 z-40 cursor-default"
          aria-label={$t('nav.closeUserMenu')}
          onclick={() => closeUserMenu(true)}
        ></button>
        <div
          id={userMenuPanelId}
          class="absolute right-0 z-50 mt-2 w-56 rounded-md border border-border bg-surface-raised p-1 shadow-lg"
        >
          <div class="px-3 py-2 text-xs text-muted">
            {departmentName(user)}
          </div>
          <button
            type="button"
            class="w-full rounded-md px-3 py-2 text-left text-sm text-body hover:bg-surface-muted"
            onclick={() => {
              userMenuOpen = false;
              goto('/profile');
            }}
          >
            {$t('nav.profile')}
          </button>
          <button
            type="button"
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

<Dialog bind:open={logoutOpen} title={$t('auth.logoutConfirmTitle')} restoreFocusTo={userMenuTriggerEl}>
  <p class="text-muted">{$t('auth.logoutConfirmBody')}</p>
  {#snippet footer()}
    <Button variant="secondary" autofocus onclick={() => (logoutOpen = false)}>{$t('common.cancel')}</Button>
    <Button variant="danger" loading={loggingOut} onclick={confirmLogout}>{$t('nav.logout')}</Button>
  {/snippet}
</Dialog>
