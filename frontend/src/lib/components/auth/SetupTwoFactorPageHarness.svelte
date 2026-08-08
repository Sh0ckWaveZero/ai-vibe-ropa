<script lang="ts">
  import { createLocaleContext } from '$lib/i18n';
  import SetupTwoFactorPage from '../../../routes/login/setup-2fa/+page.svelte';

  createLocaleContext(() => 'en');
</script>

<SetupTwoFactorPage />
