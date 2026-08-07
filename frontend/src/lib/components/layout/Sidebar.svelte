<script lang="ts">
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
</script>

{#if mobileOpen}
  <button
    aria-label="Close menu"
    class="fixed inset-0 z-40 bg-black/40 md:hidden"
    onclick={() => (mobileOpen = false)}
  ></button>
{/if}

<aside
  class="fixed inset-y-0 left-0 z-50 w-64 -translate-x-full border-r border-border bg-surface-raised transition-transform md:static md:z-0 md:translate-x-0 {mobileOpen
    ? 'translate-x-0'
    : ''}"
>
  <div class="flex h-14 items-center gap-2 border-b border-border px-5">
    <span class="size-2.5 rounded-full bg-primary" aria-hidden="true"></span>
    <span class="font-semibold text-body">ROPA</span>
  </div>
  <nav class="flex flex-col gap-0.5 p-3">
    {#each links as link (link.href)}
      <a
        href={link.href}
        onclick={() => (mobileOpen = false)}
        class="rounded-md px-3 py-2 text-sm font-medium transition-colors {isActive(link.href)
          ? 'bg-primary/10 text-primary'
          : 'text-body hover:bg-surface-muted'}"
      >
        {link.label}
      </a>
    {/each}
  </nav>
</aside>
