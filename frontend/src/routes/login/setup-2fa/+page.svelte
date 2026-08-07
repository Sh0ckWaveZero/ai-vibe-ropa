<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { getLocaleContext } from '$lib/i18n';
  import { apiFetch, ApiError } from '$lib/api/client';
  import { pendingBackupCodes } from '$lib/stores/pendingBackupCodes';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import AuthPageShell from '$lib/components/auth/AuthPageShell.svelte';

  const { t } = getLocaleContext();

  let loading = $state(true);
  let qrCodeDataUrl = $state('');
  let secret = $state('');
  let code = $state('');
  let submitting = $state(false);
  let errorMessage = $state('');
  let expired = $state(false);

  onMount(async () => {
    try {
      const res = await apiFetch<{ qrCodeDataUrl: string; secret: string }>('/auth/2fa/setup', { method: 'POST' });
      qrCodeDataUrl = res.qrCodeDataUrl;
      secret = res.secret;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        expired = true;
        setTimeout(() => goto('/login'), 1500);
      } else {
        errorMessage = $t('common.error');
      }
    } finally {
      loading = false;
    }
  });

  async function onSubmit(event: SubmitEvent) {
    event.preventDefault();
    submitting = true;
    errorMessage = '';
    try {
      const res = await apiFetch<{ backupCodes: string[] }>('/auth/2fa/setup/confirm', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      pendingBackupCodes.set(res.backupCodes);
      await goto('/login/backup-codes');
    } catch (err) {
      errorMessage = err instanceof ApiError ? $t('twoFactor.invalidCode') : $t('common.error');
    } finally {
      submitting = false;
    }
  }
</script>

<AuthPageShell title={$t('twoFactor.setupTitle')} subtitle={$t('twoFactor.setupSubtitle')}>
  {#if expired}
    <p class="text-sm text-muted">{$t('twoFactor.sessionExpiredRedirect')}</p>
  {:else if loading}
    <p class="text-sm text-muted">{$t('common.loading')}</p>
  {:else}
    <div class="flex flex-col gap-4">
      {#if qrCodeDataUrl}
        <div class="flex justify-center">
          <img src={qrCodeDataUrl} alt={$t('twoFactor.scanQr')} width="200" height="200" class="rounded-md border border-border" />
        </div>
      {/if}
      <div>
        <p class="text-xs text-muted">{$t('twoFactor.manualEntryHint')}</p>
        <p class="mt-1 break-all rounded-md bg-surface-muted px-3 py-2 font-mono text-sm text-body">{secret}</p>
      </div>

      <form onsubmit={onSubmit} class="flex flex-col gap-4">
        <Input
          label={$t('twoFactor.enterCode')}
          bind:value={code}
          inputmode="numeric"
          maxlength={6}
          autocomplete="one-time-code"
          placeholder={$t('twoFactor.codePlaceholder')}
          required
        />
        {#if errorMessage}
          <p class="text-sm text-red-600">{errorMessage}</p>
        {/if}
        <Button type="submit" loading={submitting} class="w-full">{$t('twoFactor.confirmSetup')}</Button>
      </form>
    </div>
  {/if}
</AuthPageShell>
