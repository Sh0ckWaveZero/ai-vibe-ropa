<script lang="ts">
  import { goto } from '$app/navigation';
  import { getLocaleContext } from '$lib/i18n';
  import { apiFetch, ApiError } from '$lib/api/client';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import OtpInput from '$lib/components/ui/OtpInput.svelte';
  import AuthPageShell from '$lib/components/auth/AuthPageShell.svelte';

  const { t } = getLocaleContext();

  let code = $state('');
  let backupCode = $state('');
  let useBackupCode = $state(false);
  let submitting = $state(false);
  let errorMessage = $state('');
  let verificationStatus = $state<'idle' | 'success' | 'error'>('idle');

  function waitForSuccessAnimation() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return Promise.resolve();
    return new Promise<void>((resolve) => setTimeout(resolve, 750));
  }

  async function submitCode(submittedCode = useBackupCode ? backupCode : code) {
    const normalizedCode = submittedCode.trim();
    if (submitting || (!useBackupCode && normalizedCode.length !== 6) || (useBackupCode && !normalizedCode)) return;

    submitting = true;
    errorMessage = '';
    verificationStatus = 'idle';
    try {
      await apiFetch('/auth/2fa/verify', {
        method: 'POST',
        body: JSON.stringify({ code: normalizedCode }),
      });
      if (!useBackupCode) {
        verificationStatus = 'success';
        await waitForSuccessAnimation();
      }
      await goto('/', { replaceState: true, invalidateAll: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await goto('/login');
        return;
      }
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

  function toggleEntryMode() {
    useBackupCode = !useBackupCode;
    code = '';
    backupCode = '';
    errorMessage = '';
    verificationStatus = 'idle';
  }
</script>

<AuthPageShell id="verify-2fa-page" title={$t('twoFactor.verifyTitle')} subtitle={$t('twoFactor.verifySubtitle')}>
  <form id="verify-2fa-form" onsubmit={onSubmit} class="flex flex-col gap-4">
    {#if useBackupCode}
      <Input
        id="verify-2fa-backup-code"
        label={$t('twoFactor.backupCodeLabel')}
        bind:value={backupCode}
        autocomplete="one-time-code"
        autocapitalize="characters"
        placeholder={$t('twoFactor.codeOrBackupPlaceholder')}
        error={errorMessage}
        disabled={submitting}
        required
      />
    {:else}
      <OtpInput
        id="verify-2fa-code"
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
          id="verify-2fa-verification-status"
          class="flex items-center gap-2 text-sm {verificationStatus === 'success' ? 'text-green-600' : 'text-muted'}"
          role="status"
          aria-live="polite"
        >
          {#if verificationStatus === 'success'}
            <svg id="verify-2fa-success-icon" viewBox="0 0 20 20" class="size-4" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
              <path d="m4 10 4 4 8-8" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            {$t('twoFactor.codeVerified')}
          {:else}
            <span id="verify-2fa-loading-icon" class="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true"></span>
            {$t('twoFactor.verifyingCode')}
          {/if}
        </p>
      {/if}
    {/if}

    <button
      id="verify-2fa-entry-mode-toggle"
      type="button"
      onclick={toggleEntryMode}
      disabled={submitting}
      class="self-start text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
    >
      {useBackupCode ? $t('twoFactor.useAuthenticatorCode') : $t('twoFactor.useBackupCode')}
    </button>

    {#if useBackupCode}
      <Button id="verify-2fa-submit" type="submit" loading={submitting} disabled={!backupCode.trim()} class="w-full">
        {$t('twoFactor.verifyButton')}
      </Button>
    {/if}
  </form>
</AuthPageShell>
