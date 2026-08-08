<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { getLocaleContext } from '$lib/i18n';
  import { pendingBackupCodes } from '$lib/stores/pendingBackupCodes';
  import Button from '$lib/components/ui/Button.svelte';
  import AuthPageShell from '$lib/components/auth/AuthPageShell.svelte';

  const { t } = getLocaleContext();
  let codesVisible = $state(false);

  onMount(() => {
    if (!$pendingBackupCodes) {
      goto('/', { replaceState: true, invalidateAll: true });
    }
  });

  async function acknowledge() {
    pendingBackupCodes.set(null);
    await goto('/', { replaceState: true, invalidateAll: true });
  }

  function downloadCodes() {
    if (!$pendingBackupCodes) return;

    const content = `${$t('twoFactor.backupCodesTitle')}\n\n${$pendingBackupCodes.join('\n')}\n`;
    const blob = new Blob(['\uFEFF', content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'ropa-backup-codes.txt';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }
</script>

<AuthPageShell title={$t('twoFactor.backupCodesTitle')} subtitle={$t('twoFactor.backupCodesSubtitle')}>
  {#if $pendingBackupCodes}
    <div class="flex flex-col gap-4">
      <Button variant="ghost" onclick={() => window.history.back()} class="-ml-2 min-h-11 self-start">
        <svg viewBox="0 0 20 20" class="size-4" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
          <path d="m12.5 15-5-5 5-5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        {$t('common.back')}
      </Button>

      <div class="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
        <Button
          variant="secondary"
          onclick={() => (codesVisible = !codesVisible)}
          aria-controls="backup-codes-list"
          aria-expanded={codesVisible}
          class="min-h-11"
        >
          {#if codesVisible}
            <svg viewBox="0 0 20 20" class="size-4" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
              <path d="M3 3l14 14M8.6 8.7a2 2 0 0 0 2.7 2.7M6.2 5.2A9.4 9.4 0 0 1 10 4.4c4.5 0 7.5 4.7 7.5 5.6a8.6 8.6 0 0 1-2.1 3M4.6 6.5A8.5 8.5 0 0 0 2.5 10c0 .9 3 5.6 7.5 5.6a9 9 0 0 0 2.1-.3" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            {$t('twoFactor.hideBackupCodes')}
          {:else}
            <svg viewBox="0 0 20 20" class="size-4" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
              <path d="M2.5 10c0-.9 3-5.6 7.5-5.6s7.5 4.7 7.5 5.6-3 5.6-7.5 5.6S2.5 10.9 2.5 10Z" />
              <circle cx="10" cy="10" r="2.2" />
            </svg>
            {$t('twoFactor.showBackupCodes')}
          {/if}
        </Button>
        <Button variant="secondary" onclick={downloadCodes} class="min-h-11">
          <svg viewBox="0 0 20 20" class="size-4" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
            <path d="M10 3v9m0 0 3.5-3.5M10 12 6.5 8.5M4 15.5h12" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          {$t('twoFactor.downloadBackupCodes')}
        </Button>
      </div>

      <div
        id="backup-codes-list"
        data-testid="backup-codes-list"
        aria-hidden={!codesVisible}
        class="grid grid-cols-2 gap-2 rounded-md bg-surface-muted p-4 font-mono text-sm text-body transition-[filter,opacity] {codesVisible
          ? 'select-text'
          : 'pointer-events-none select-none blur-sm opacity-50'}"
      >
        {#each $pendingBackupCodes as code (code)}
          <div class="text-center">{code}</div>
        {/each}
      </div>
      <Button onclick={acknowledge} class="w-full">{$t('twoFactor.savedCodesConfirm')}</Button>
    </div>
  {/if}
</AuthPageShell>
