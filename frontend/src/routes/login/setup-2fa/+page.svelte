<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { getLocaleContext } from '$lib/i18n';
  import { apiFetch, ApiError } from '$lib/api/client';
  import { pendingBackupCodes } from '$lib/stores/pendingBackupCodes';
  import OtpInput from '$lib/components/ui/OtpInput.svelte';
  import AuthPageShell from '$lib/components/auth/AuthPageShell.svelte';

  const { t } = getLocaleContext();

  let loading = $state(true);
  let qrCodeDataUrl = $state('');
  let secret = $state('');
  let code = $state('');
  let submitting = $state(false);
  let errorMessage = $state('');
  let verificationStatus = $state<'idle' | 'success' | 'error'>('idle');
  let expired = $state(false);

  function waitForSuccessAnimation() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return Promise.resolve();
    return new Promise<void>((resolve) => setTimeout(resolve, 750));
  }

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

  async function submitCode(submittedCode = code) {
    if (submitting || submittedCode.length !== 6) return;

    submitting = true;
    errorMessage = '';
    verificationStatus = 'idle';
    try {
      const res = await apiFetch<{ backupCodes: string[] }>('/auth/2fa/setup/confirm', {
        method: 'POST',
        body: JSON.stringify({ code: submittedCode }),
      });
      pendingBackupCodes.set(res.backupCodes);
      verificationStatus = 'success';
      await waitForSuccessAnimation();
      await goto('/login/backup-codes', { replaceState: true, invalidateAll: true });
    } catch (err) {
      verificationStatus = 'error';
      errorMessage = err instanceof ApiError ? $t('twoFactor.invalidCode') : $t('common.error');
    } finally {
      submitting = false;
    }
  }

  async function onSubmit(event: SubmitEvent) {
    event.preventDefault();
    await submitCode();
  }
</script>

<AuthPageShell id="setup-2fa-page" title={$t('twoFactor.setupTitle')} subtitle={$t('twoFactor.setupSubtitle')}>
  {#if expired}
    <p id="setup-2fa-expired-status" class="text-sm text-muted">{$t('twoFactor.sessionExpiredRedirect')}</p>
  {:else if loading}
    <p id="setup-2fa-loading-status" class="text-sm text-muted">{$t('common.loading')}</p>
  {:else}
    <div id="setup-2fa-content" class="flex flex-col gap-4">
      {#if qrCodeDataUrl}
        <div id="setup-2fa-qr-container" class="flex justify-center">
          <img id="setup-2fa-qr-code" src={qrCodeDataUrl} alt={$t('twoFactor.scanQr')} width="200" height="200" class="rounded-md border border-border" />
        </div>
      {/if}
      <div id="setup-2fa-manual-entry">
        <p id="setup-2fa-manual-entry-hint" class="text-xs text-muted">{$t('twoFactor.manualEntryHint')}</p>
        <p id="setup-2fa-secret" class="mt-1 break-all rounded-md bg-surface-muted px-3 py-2 font-mono text-sm text-body">{secret}</p>
      </div>

      <form id="setup-2fa-form" onsubmit={onSubmit} class="flex flex-col gap-4">
        <OtpInput
          id="setup-2fa-code"
          label={$t('twoFactor.enterCode')}
          bind:value={code}
          status={verificationStatus}
          error={errorMessage}
          disabled={submitting}
          onComplete={submitCode}
          autofocus
          required
        />
        {#if submitting}
          <p
            id="setup-2fa-verification-status"
            class="flex items-center gap-2 text-sm {verificationStatus === 'success' ? 'text-green-600' : 'text-muted'}"
            role="status"
            aria-live="polite"
          >
            {#if verificationStatus === 'success'}
              <svg id="setup-2fa-success-icon" viewBox="0 0 20 20" class="size-4" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                <path d="m4 10 4 4 8-8" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              {$t('twoFactor.codeVerified')}
            {:else}
              <span id="setup-2fa-loading-icon" class="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true"></span>
              {$t('twoFactor.verifyingCode')}
            {/if}
          </p>
        {/if}
      </form>
    </div>
  {/if}
</AuthPageShell>
