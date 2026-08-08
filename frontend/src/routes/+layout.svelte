<script lang="ts">
  import 'flag-icons/css/flag-icons.min.css';
  import '../app.css';
  import { createLocaleContext } from '$lib/i18n';
  import type { LayoutData } from './$types';
  import type { Snippet } from 'svelte';

  let { data, children }: { data: LayoutData; children: Snippet } = $props();

  const { t } = createLocaleContext(() => data.locale);
</script>

<a
  href="#main-content"
  class="fixed left-4 top-4 z-[100] -translate-y-24 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-contrast shadow-lg transition-transform focus:translate-y-0 focus:outline-2 focus:outline-offset-2 focus:outline-primary"
>
  {$t('common.skipToContent')}
</a>

{@render children()}
