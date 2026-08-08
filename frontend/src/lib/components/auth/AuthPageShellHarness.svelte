<script lang="ts">
  import { createLocaleContext } from '$lib/i18n';
  import AuthPageShell from './AuthPageShell.svelte';

  createLocaleContext(() => 'en');
</script>

<AuthPageShell title="Sign in" subtitle="Access your ROPA workspace securely">
  <p>Authentication form</p>
</AuthPageShell>
