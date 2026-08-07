<script lang="ts">
  import { goto } from '$app/navigation';
  import { getLocaleContext } from '$lib/i18n';
  import { apiFetch, ApiError } from '$lib/api/client';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import AuthPageShell from '$lib/components/auth/AuthPageShell.svelte';

  const { t } = getLocaleContext();

  let code = $state('');
  let submitting = $state(false);
  let errorMessage = $state('');

  async function onSubmit(event: SubmitEvent) {
    event.preventDefault();
    submitting = true;
    errorMessage = '';
    try {
      await apiFetch('/auth/2fa/verify', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      await goto('/');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await goto('/login');
        return;
      }
      errorMessage = err instanceof ApiError ? $t('twoFactor.invalidCode') : $t('common.error');
    } finally {
      submitting = false;
    }
  }
</script>

<AuthPageShell title={$t('twoFactor.verifyTitle')} subtitle={$t('twoFactor.verifySubtitle')}>
  <form onsubmit={onSubmit} class="flex flex-col gap-4">
    <Input
      label={$t('twoFactor.enterCode')}
      bind:value={code}
      autocomplete="one-time-code"
      placeholder={$t('twoFactor.codeOrBackupPlaceholder')}
      required
    />
    {#if errorMessage}
      <p class="text-sm text-red-600">{errorMessage}</p>
    {/if}
    <Button type="submit" loading={submitting} class="w-full">{$t('twoFactor.verifyButton')}</Button>
  </form>
</AuthPageShell>
