<script lang="ts">
  import { tick } from 'svelte';
  import { page } from '$app/state';
  import { getLocaleContext } from '$lib/i18n';

  let {
    permissions,
    mobileOpen = $bindable(),
  }: { permissions: string[]; mobileOpen: boolean } = $props();

  const { t } = getLocaleContext();

  function has(...codes: string[]) {
    return codes.some((c) => permissions.includes(c));
  }

  const links = $derived(
    [
      { href: '/', label: $t('nav.dashboard'), show: true },
      { href: '/ropa', label: $t('nav.ropaRecords'), show: has('ropa.read_own', 'ropa.read_all') },
      { href: '/users', label: $t('nav.users'), show: has('users.manage') },
      { href: '/roles', label: $t('nav.roles'), show: has('roles.manage') },
      { href: '/departments', label: $t('nav.departments'), show: has('departments.manage') },
      { href: '/audit', label: $t('nav.auditLog'), show: has('audit.view') },
    ].filter((l) => l.show)
  );

  function isActive(href: string) {
    return href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
  }

  let linkElements = $state<HTMLAnchorElement[]>([]);

  async function closeMobileMenu(restoreFocus = false) {
    mobileOpen = false;
    if (restoreFocus) {
      await tick();
      document.getElementById('mobile-navigation-trigger')?.focus();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key !== 'Escape' || !mobileOpen) return;
    event.preventDefault();
    void closeMobileMenu(true);
  }

  $effect(() => {
    if (mobileOpen) {
      void tick().then(() => linkElements[0]?.focus());
    }
  });
</script>

<svelte:window onkeydown={handleKeydown} />

{#if mobileOpen}
  <button
    type="button"
    tabindex="-1"
    aria-label={$t('nav.closeMenu')}
    class="fixed inset-0 z-40 bg-black/40 md:hidden"
    onclick={() => closeMobileMenu(true)}
  ></button>
{/if}

<aside
  id="primary-sidebar"
  class="fixed inset-y-0 left-0 z-50 invisible w-64 -translate-x-full border-r border-border bg-surface-raised transition-transform md:visible md:static md:z-0 md:translate-x-0 {mobileOpen
    ? 'visible translate-x-0'
    : ''}"
>
  <div class="flex h-14 items-center gap-2 border-b border-border px-5">
    <img
      src="/ropa-logo.png"
      alt=""
      width="28"
      height="28"
      class="size-7 rounded-md bg-white p-0.5 shadow-sm ring-1 ring-black/5"
      loading="eager"
      decoding="async"
    />
    <span class="font-semibold text-body">ROPA</span>
  </div>
  <nav aria-label={$t('nav.primary')} class="p-3">
    <ul class="flex flex-col gap-0.5">
      {#each links as link, index (link.href)}
        <li>
          <a
            bind:this={linkElements[index]}
            href={link.href}
            aria-current={isActive(link.href) ? 'page' : undefined}
            onclick={() => (mobileOpen = false)}
            class="block rounded-md px-3 py-2 text-sm font-medium transition-colors {isActive(link.href)
              ? 'bg-primary/10 text-primary'
              : 'text-body hover:bg-surface-muted'}"
          >
            {link.label}
          </a>
        </li>
      {/each}
    </ul>
  </nav>
</aside>
