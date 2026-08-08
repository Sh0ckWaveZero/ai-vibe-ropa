<script lang="ts">
  import { createLocaleContext } from '$lib/i18n';
  import BackupCodesPage from '../../../routes/login/backup-codes/+page.svelte';

  createLocaleContext(() => 'en');
</script>

<BackupCodesPage />
