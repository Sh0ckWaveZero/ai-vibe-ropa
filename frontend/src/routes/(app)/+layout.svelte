<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { LayoutData } from './$types';
  import Sidebar from '$lib/components/layout/Sidebar.svelte';
  import Topbar from '$lib/components/layout/Topbar.svelte';

  let { data, children }: { data: LayoutData; children: Snippet } = $props();

  let mobileOpen = $state(false);
</script>

<div class="flex min-h-screen bg-surface">
  <Sidebar permissions={data.user.permissions} bind:mobileOpen />
  <div class="flex min-w-0 flex-1 flex-col">
    <Topbar user={data.user} onMenuClick={() => (mobileOpen = true)} />
    <main class="flex-1 p-4 md:p-6">
      {@render children()}
    </main>
  </div>
</div>
