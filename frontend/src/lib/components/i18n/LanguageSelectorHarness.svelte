<script lang="ts">
  import { createLocaleContext } from '$lib/i18n';
  import LanguageSelector from './LanguageSelector.svelte';

  createLocaleContext(() => 'en');
</script>

<LanguageSelector id="test-language-selector" />
<button type="button">Outside target</button>
<div data-testid="outside-surface">Outside surface</div>
