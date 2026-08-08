<script lang="ts">
  import { createLocaleContext, type Locale } from '$lib/i18n';
  import LanguageSelector from './LanguageSelector.svelte';

  let { initialLocale = 'en' }: { initialLocale?: Locale } = $props();

  createLocaleContext(() => initialLocale);
</script>

<LanguageSelector id="test-language-selector" />
<button type="button">Outside target</button>
<div data-testid="outside-surface">Outside surface</div>
