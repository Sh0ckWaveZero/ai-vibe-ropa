<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { getLocaleContext } from '$lib/i18n';
  import { apiFetch, ApiError } from '$lib/api/client';
  import { pendingBackupCodes } from '$lib/stores/pendingBackupCodes';
  import OtpInput from '$lib/components/ui/OtpInput.svelte';
  import Button from '$lib/components/ui/Button.svelte';
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
  let secretVisible = $state(false);
  let copyStatus = $state<'idle' | 'success' | 'error'>('idle');
  let copyStatusTimer: ReturnType<typeof setTimeout> | undefined;

  onDestroy(() => {
    if (copyStatusTimer) clearTimeout(copyStatusTimer);
  });

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

  async function copySecret() {
    if (!secret) return;

    if (copyStatusTimer) clearTimeout(copyStatusTimer);
    copyStatus = 'idle';

    try {
      await navigator.clipboard.writeText(secret);
      copyStatus = 'success';
    } catch {
      copyStatus = 'error';
    }

    copyStatusTimer = setTimeout(() => {
      copyStatus = 'idle';
    }, 2000);
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
        <div class="mt-1 rounded-md bg-surface-muted p-3">
          <p
            id="setup-2fa-secret"
            data-testid="setup-2fa-secret"
            aria-hidden={!secretVisible}
            class="break-all text-center font-mono text-sm text-body transition-[filter,opacity] duration-150 motion-reduce:transition-none {secretVisible
              ? 'select-text'
              : 'pointer-events-none select-none blur-sm opacity-50'}"
          >
            {secret}
          </p>

          <div class="mt-3 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
            <Button
              variant="secondary"
              onclick={() => (secretVisible = !secretVisible)}
              aria-controls="setup-2fa-secret"
              aria-expanded={secretVisible}
              class="min-h-11"
            >
              {#if secretVisible}
                <svg viewBox="0 0 20 20" class="size-4" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                  <path d="M3 3l14 14M8.6 8.7a2 2 0 0 0 2.7 2.7M6.2 5.2A9.4 9.4 0 0 1 10 4.4c4.5 0 7.5 4.7 7.5 5.6a8.6 8.6 0 0 1-2.1 3M4.6 6.5A8.5 8.5 0 0 0 2.5 10c0 .9 3 5.6 7.5 5.6a9 9 0 0 0 2.1-.3" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                {$t('twoFactor.hideSetupSecret')}
              {:else}
                <svg viewBox="0 0 20 20" class="size-4" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                  <path d="M2.5 10c0-.9 3-5.6 7.5-5.6s7.5 4.7 7.5 5.6-3 5.6-7.5 5.6S2.5 10.9 2.5 10Z" />
                  <circle cx="10" cy="10" r="2.2" />
                </svg>
                {$t('twoFactor.showSetupSecret')}
              {/if}
            </Button>

            <Button variant="secondary" onclick={copySecret} class="min-h-11">
              <span class="relative size-4 shrink-0" aria-hidden="true">
                <svg
                  data-testid="setup-2fa-copy-icon"
                  viewBox="0 0 20 20"
                  class="absolute inset-0 size-4 transition-[transform,opacity] duration-150 ease-out motion-reduce:transition-none {copyStatus === 'success'
                    ? 'scale-75 opacity-0'
                    : 'scale-100 opacity-100'}"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.75"
                >
                  <rect x="6.5" y="6.5" width="9" height="10" rx="1.5" />
                  <path d="M4 13.5H3.5A1.5 1.5 0 0 1 2 12V3.5A1.5 1.5 0 0 1 3.5 2H12a1.5 1.5 0 0 1 1.5 1.5V4" stroke-linecap="round" />
                </svg>
                <svg
                  data-testid="setup-2fa-copy-success-icon"
                  viewBox="0 0 20 20"
                  class="absolute inset-0 size-4 transition-[transform,opacity] duration-150 ease-out motion-reduce:transition-none {copyStatus === 'success'
                    ? 'scale-100 opacity-100'
                    : 'scale-75 opacity-0'}"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.25"
                >
                  <path d="m3.5 10 4 4 9-9" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </span>
              {$t('twoFactor.copySetupSecret')}
            </Button>
          </div>

          <p
            class="mt-2 min-h-4 text-center text-xs {copyStatus === 'success'
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'}"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {copyStatus === 'success'
              ? $t('twoFactor.setupSecretCopied')
              : copyStatus === 'error'
                ? $t('twoFactor.setupSecretCopyFailed')
                : ''}
          </p>
        </div>
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
