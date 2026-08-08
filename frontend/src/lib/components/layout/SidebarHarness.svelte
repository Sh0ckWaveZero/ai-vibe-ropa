<script lang="ts">
  import { createLocaleContext } from '$lib/i18n';
  import Sidebar from './Sidebar.svelte';

  createLocaleContext(() => 'en');

  let mobileOpen = $state(false);
</script>

<Sidebar permissions={[]} bind:mobileOpen />
