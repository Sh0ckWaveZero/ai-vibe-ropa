<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { getLocaleContext } from '$lib/i18n';
  import { pendingBackupCodes } from '$lib/stores/pendingBackupCodes';
  import Button from '$lib/components/ui/Button.svelte';
  import AuthPageShell from '$lib/components/auth/AuthPageShell.svelte';

  const { t } = getLocaleContext();

  onMount(() => {
    if (!$pendingBackupCodes) {
      goto('/', { replaceState: true, invalidateAll: true });
    }
  });

  async function acknowledge() {
    pendingBackupCodes.set(null);
    await goto('/', { replaceState: true, invalidateAll: true });
  }
</script>

<AuthPageShell title={$t('twoFactor.backupCodesTitle')} subtitle={$t('twoFactor.backupCodesSubtitle')}>
  {#if $pendingBackupCodes}
    <div class="flex flex-col gap-4">
      <div class="grid grid-cols-2 gap-2 rounded-md bg-surface-muted p-4 font-mono text-sm text-body">
        {#each $pendingBackupCodes as code (code)}
          <div class="text-center">{code}</div>
        {/each}
      </div>
      <Button onclick={acknowledge} class="w-full">{$t('twoFactor.savedCodesConfirm')}</Button>
    </div>
  {/if}
</AuthPageShell>
