<script lang="ts">
  import { getLocaleContext } from '$lib/i18n';
  import { apiFetch, ApiError } from '$lib/api/client';
  import Card from '$lib/components/ui/Card.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  const { t } = getLocaleContext();

  let fullName = $state(data.user.fullName);
  let profileSaving = $state(false);
  let profileMessage = $state('');

  async function saveProfile() {
    profileSaving = true;
    profileMessage = '';
    try {
      await apiFetch('/users/me', { method: 'PATCH', body: JSON.stringify({ fullName }) });
      profileMessage = $t('common.saved');
    } catch (err) {
      profileMessage = err instanceof ApiError ? err.message : $t('common.error');
    } finally {
      profileSaving = false;
    }
  }

  let currentPassword = $state('');
  let newPassword = $state('');
  let passwordSaving = $state(false);
  let passwordMessage = $state('');
  let passwordError = $state('');

  async function changePassword() {
    passwordSaving = true;
    passwordMessage = '';
    passwordError = '';
    try {
      await apiFetch('/users/me/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      passwordMessage = $t('auth.passwordChanged');
      currentPassword = '';
      newPassword = '';
    } catch (err) {
      passwordError = err instanceof ApiError ? err.message : $t('common.error');
    } finally {
      passwordSaving = false;
    }
  }

  let regenOpen = $state(false);
  let regenLoading = $state(false);
  let newBackupCodes = $state<string[] | null>(null);

  async function confirmRegenerate() {
    regenLoading = true;
    try {
      const res = await apiFetch<{ backupCodes: string[] }>('/auth/2fa/backup-codes/regenerate', { method: 'POST' });
      newBackupCodes = res.backupCodes;
    } finally {
      regenLoading = false;
    }
  }

  function closeRegen() {
    regenOpen = false;
    newBackupCodes = null;
  }
</script>

<div class="flex flex-col gap-4">
  <h1 class="text-lg font-semibold text-body">{$t('nav.profile')}</h1>

  <Card>
    <div class="flex flex-col gap-3 sm:max-w-sm">
      <Input label={$t('users.fullName')} bind:value={fullName} required />
      <Input label={$t('users.email')} value={data.user.email} disabled />
      {#if profileMessage}
        <p class="text-sm {profileMessage === $t('common.saved') ? 'text-green-600' : 'text-red-600'}">
          {profileMessage}
        </p>
      {/if}
      <Button loading={profileSaving} onclick={saveProfile} class="w-fit">{$t('common.save')}</Button>
    </div>
  </Card>

  <Card title={$t('auth.changePassword')}>
    <div class="flex flex-col gap-3 sm:max-w-sm">
      <Input
        label={$t('auth.currentPassword')}
        type="password"
        bind:value={currentPassword}
        autocomplete="current-password"
        required
      />
      <Input
        label={$t('auth.newPassword')}
        type="password"
        bind:value={newPassword}
        autocomplete="new-password"
        required
      />
      {#if passwordMessage}
        <p class="text-sm text-green-600">{passwordMessage}</p>
      {/if}
      {#if passwordError}
        <p class="text-sm text-red-600">{passwordError}</p>
      {/if}
      <Button
        loading={passwordSaving}
        disabled={!currentPassword || newPassword.length < 8}
        onclick={changePassword}
        class="w-fit"
      >
        {$t('auth.changePassword')}
      </Button>
    </div>
  </Card>

  <Card title={$t('twoFactor.setupTitle')}>
    <div class="flex flex-col gap-3 sm:max-w-sm">
      <div class="flex items-center gap-2">
        <Badge label={data.user.totpEnabled ? $t('twoFactor.statusEnabled') : $t('twoFactor.statusDisabled')} />
      </div>
      {#if data.user.totpEnabled}
        <Button variant="secondary" onclick={() => (regenOpen = true)} class="w-fit">
          {$t('twoFactor.regenerateBackupCodes')}
        </Button>
      {/if}
    </div>
  </Card>
</div>

<Dialog bind:open={regenOpen} title={$t('twoFactor.regenerateConfirmTitle')}>
  {#if newBackupCodes}
    <div class="flex flex-col gap-4">
      <p class="text-sm text-muted">{$t('twoFactor.backupCodesSubtitle')}</p>
      <div class="grid grid-cols-2 gap-2 rounded-md bg-surface-muted p-4 font-mono text-sm text-body">
        {#each newBackupCodes as code (code)}
          <div class="text-center">{code}</div>
        {/each}
      </div>
    </div>
  {:else}
    <p class="text-muted">{$t('twoFactor.regenerateConfirmBody')}</p>
  {/if}
  {#snippet footer()}
    {#if newBackupCodes}
      <Button onclick={closeRegen}>{$t('twoFactor.savedCodesConfirm')}</Button>
    {:else}
      <Button variant="secondary" onclick={closeRegen}>{$t('common.cancel')}</Button>
      <Button variant="danger" loading={regenLoading} onclick={confirmRegenerate}>{$t('twoFactor.regenerateBackupCodes')}</Button>
    {/if}
  {/snippet}
</Dialog>
