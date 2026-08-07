<script lang="ts">
  import { getLocaleContext } from '$lib/i18n';
  import { apiFetch, ApiError } from '$lib/api/client';
  import Card from '$lib/components/ui/Card.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';
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
</div>
