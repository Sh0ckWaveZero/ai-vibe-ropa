<script lang="ts">
  import '../app.css';
  import { createLocaleContext } from '$lib/i18n';
  import type { LayoutData } from './$types';
  import type { Snippet } from 'svelte';

  let { data, children }: { data: LayoutData; children: Snippet } = $props();

  createLocaleContext(data.locale);
</script>

{@render children()}
