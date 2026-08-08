<script lang="ts">
  import type { Snippet } from 'svelte';
  import { page } from '$app/state';
  import type { LayoutData } from './$types';
  import Sidebar from '$lib/components/layout/Sidebar.svelte';
  import Topbar from '$lib/components/layout/Topbar.svelte';
  import { getLocaleContext } from '$lib/i18n';

  let { data, children }: { data: LayoutData; children: Snippet } = $props();

  let mobileOpen = $state(false);
  const { t } = getLocaleContext();

  const pageTitle = $derived.by(() => {
    const pathname = page.url.pathname;
    if (pathname === '/') return $t('nav.dashboard');
    if (pathname === '/ropa/new') return $t('ropa.newRecord');
    if (pathname.startsWith('/ropa/')) return $t('ropa.viewRecord');
    if (pathname === '/ropa') return $t('ropa.title');
    if (pathname === '/users') return $t('users.title');
    if (pathname === '/roles') return $t('roles.title');
    if (pathname === '/departments') return $t('departments.title');
    if (pathname === '/audit') return $t('audit.title');
    if (pathname === '/profile') return $t('nav.profile');
    return 'ROPA';
  });
</script>

<svelte:head>
  <title>{pageTitle} | ROPA</title>
</svelte:head>

<div class="flex min-h-screen bg-surface">
  <Sidebar permissions={data.user.permissions} bind:mobileOpen />
  <div class="flex min-w-0 flex-1 flex-col">
    <Topbar user={data.user} mobileMenuOpen={mobileOpen} onMenuClick={() => (mobileOpen = true)} />
    <main id="main-content" tabindex="-1" class="flex-1 p-4 focus:outline-none md:p-6">
      {@render children()}
    </main>
  </div>
</div>
