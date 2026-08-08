<script lang="ts">
  import { onMount } from 'svelte';
  import { getLocaleContext } from '$lib/i18n';
  import { apiFetch, ApiError } from '$lib/api/client';
  import Card from '$lib/components/ui/Card.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Select from '$lib/components/ui/Select.svelte';
  import Checkbox from '$lib/components/ui/Checkbox.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import Pagination from '$lib/components/ui/Pagination.svelte';

  const { t, locale } = getLocaleContext();

  interface RoleOption {
    id: string;
    code: string;
    nameTh: string;
    nameEn: string;
    nameZh: string;
  }
  interface DeptOption {
    id: string;
    code: string;
    nameTh: string;
    nameEn: string;
    nameZh: string;
  }
  interface UserRow {
    id: string;
    email: string;
    fullName: string;
    isActive: boolean;
    totpEnabled: boolean;
    lastLoginAt: string | null;
    roleId: string;
    departmentId: string | null;
    role: RoleOption;
    department: DeptOption | null;
  }

  let users = $state<UserRow[]>([]);
  let roles = $state<RoleOption[]>([]);
  let departments = $state<DeptOption[]>([]);
  let loading = $state(true);
  let page = $state(1);
  const pageSize = 20;
  let total = $state(0);

  function label(item: { nameTh: string; nameEn: string; nameZh: string }) {
    return $locale === 'th' ? item.nameTh : $locale === 'zh' ? item.nameZh : item.nameEn;
  }

  async function loadAll() {
    loading = true;
    try {
      const [u, r, d] = await Promise.all([
        apiFetch<{ users: UserRow[]; total: number }>(`/users?page=${page}&pageSize=${pageSize}`),
        apiFetch<{ roles: RoleOption[] }>('/roles'),
        apiFetch<{ departments: DeptOption[] }>('/departments'),
      ]);
      users = u.users;
      total = u.total;
      roles = r.roles;
      departments = d.departments;
    } finally {
      loading = false;
    }
  }

  function onPageChange(nextPage: number) {
    page = nextPage;
    loadAll();
  }

  onMount(loadAll);

  // Create dialog
  let createOpen = $state(false);
  let createSaving = $state(false);
  let createError = $state('');
  let createForm = $state({ email: '', password: '', fullName: '', roleId: '', departmentId: '' });

  function openCreate() {
    createForm = { email: '', password: '', fullName: '', roleId: roles[0]?.id ?? '', departmentId: '' };
    createError = '';
    createOpen = true;
  }

  async function submitCreate() {
    createSaving = true;
    createError = '';
    try {
      await apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify({
          ...createForm,
          departmentId: createForm.departmentId || null,
        }),
      });
      createOpen = false;
      await loadAll();
    } catch (err) {
      createError = err instanceof ApiError ? err.message : $t('common.error');
    } finally {
      createSaving = false;
    }
  }

  // Edit dialog
  let editOpen = $state(false);
  let editSaving = $state(false);
  let editError = $state('');
  let editTarget = $state<UserRow | null>(null);
  let editForm = $state({ fullName: '', roleId: '', departmentId: '', isActive: true });

  function openEdit(u: UserRow) {
    editTarget = u;
    editForm = { fullName: u.fullName, roleId: u.roleId, departmentId: u.departmentId ?? '', isActive: u.isActive };
    editError = '';
    editOpen = true;
  }

  async function submitEdit() {
    if (!editTarget) return;
    editSaving = true;
    editError = '';
    try {
      await apiFetch(`/users/${editTarget.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...editForm, departmentId: editForm.departmentId || null }),
      });
      editOpen = false;
      await loadAll();
    } catch (err) {
      editError = err instanceof ApiError ? err.message : $t('common.error');
    } finally {
      editSaving = false;
    }
  }

  // Reset password dialog
  let resetOpen = $state(false);
  let resetSaving = $state(false);
  let resetTarget = $state<UserRow | null>(null);
  let resetPassword = $state('');

  function openReset(u: UserRow) {
    resetTarget = u;
    resetPassword = '';
    resetOpen = true;
  }

  async function submitReset() {
    if (!resetTarget) return;
    resetSaving = true;
    try {
      await apiFetch(`/users/${resetTarget.id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword: resetPassword }),
      });
      resetOpen = false;
    } finally {
      resetSaving = false;
    }
  }

  // Reset 2FA dialog
  let reset2faOpen = $state(false);
  let reset2faLoading = $state(false);
  let reset2faTarget = $state<UserRow | null>(null);

  function openReset2fa(u: UserRow) {
    reset2faTarget = u;
    reset2faOpen = true;
  }

  async function confirmReset2fa() {
    if (!reset2faTarget) return;
    reset2faLoading = true;
    try {
      await apiFetch(`/users/${reset2faTarget.id}/reset-2fa`, { method: 'POST' });
      reset2faOpen = false;
      await loadAll();
    } finally {
      reset2faLoading = false;
    }
  }
</script>

<div class="flex flex-col gap-4">
  <div class="flex items-center justify-between">
    <h1 class="text-lg font-semibold text-body">{$t('users.title')}</h1>
    <Button onclick={openCreate}>{$t('users.newUser')}</Button>
  </div>

  <Card>
    {#if loading}
      <p class="text-sm text-muted">{$t('common.loading')}</p>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <caption class="sr-only">{$t('users.title')}</caption>
          <thead>
            <tr class="border-b border-border text-xs text-muted">
              <th scope="col" class="py-2 pr-4">{$t('users.fullName')}</th>
              <th scope="col" class="py-2 pr-4">{$t('users.email')}</th>
              <th scope="col" class="py-2 pr-4">{$t('users.role')}</th>
              <th scope="col" class="py-2 pr-4">{$t('users.department')}</th>
              <th scope="col" class="py-2 pr-4">{$t('users.status')}</th>
              <th scope="col" class="py-2 pr-4">{$t('users.twoFaColumn')}</th>
              <th scope="col" class="py-2 pr-4">{$t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {#each users as u (u.id)}
              <tr class="border-b border-border last:border-0">
                <td class="py-2 pr-4">{u.fullName}</td>
                <td class="py-2 pr-4">{u.email}</td>
                <td class="py-2 pr-4">{label(u.role)}</td>
                <td class="py-2 pr-4">{u.department ? label(u.department) : $t('users.noDepartment')}</td>
                <td class="py-2 pr-4">
                  <Badge label={u.isActive ? $t('common.active') : $t('common.inactive')} />
                </td>
                <td class="py-2 pr-4">
                  <Badge label={u.totpEnabled ? $t('twoFactor.statusEnabled') : $t('twoFactor.statusDisabled')} />
                </td>
                <td class="py-2 pr-4">
                  <div class="flex gap-2">
                    <button type="button" class="text-primary hover:underline" onclick={() => openEdit(u)}>{$t('common.edit')}</button>
                    <button type="button" class="text-primary hover:underline" onclick={() => openReset(u)}>{$t('users.resetPassword')}</button>
                    {#if u.totpEnabled}
                      <button type="button" class="text-red-600 hover:underline" onclick={() => openReset2fa(u)}>{$t('twoFactor.resetAction')}</button>
                    {/if}
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <Pagination {page} {pageSize} {total} onChange={onPageChange} />
    {/if}
  </Card>
</div>

<Dialog bind:open={createOpen} title={$t('users.newUser')}>
  <div class="flex flex-col gap-3">
    <Input label={$t('users.email')} type="email" bind:value={createForm.email} required />
    <Input label={$t('auth.password')} type="password" bind:value={createForm.password} required />
    <Input label={$t('users.fullName')} bind:value={createForm.fullName} required />
    <Select label={$t('users.role')} bind:value={createForm.roleId}>
      {#each roles as r (r.id)}
        <option value={r.id}>{label(r)}</option>
      {/each}
    </Select>
    <Select label={$t('users.department')} bind:value={createForm.departmentId}>
      <option value="">{$t('users.noDepartment')}</option>
      {#each departments as d (d.id)}
        <option value={d.id}>{label(d)}</option>
      {/each}
    </Select>
    {#if createError}
      <p class="text-sm text-red-600">{createError}</p>
    {/if}
  </div>
  {#snippet footer()}
    <Button variant="secondary" onclick={() => (createOpen = false)}>{$t('common.cancel')}</Button>
    <Button loading={createSaving} onclick={submitCreate}>{$t('common.create')}</Button>
  {/snippet}
</Dialog>

<Dialog bind:open={editOpen} title={$t('users.editUser')}>
  <div class="flex flex-col gap-3">
    <Input label={$t('users.fullName')} bind:value={editForm.fullName} required />
    <Select label={$t('users.role')} bind:value={editForm.roleId}>
      {#each roles as r (r.id)}
        <option value={r.id}>{label(r)}</option>
      {/each}
    </Select>
    <Select label={$t('users.department')} bind:value={editForm.departmentId}>
      <option value="">{$t('users.noDepartment')}</option>
      {#each departments as d (d.id)}
        <option value={d.id}>{label(d)}</option>
      {/each}
    </Select>
    <Checkbox bind:checked={editForm.isActive} label={$t('common.active')} />
    {#if editError}
      <p class="text-sm text-red-600">{editError}</p>
    {/if}
  </div>
  {#snippet footer()}
    <Button variant="secondary" onclick={() => (editOpen = false)}>{$t('common.cancel')}</Button>
    <Button loading={editSaving} onclick={submitEdit}>{$t('common.save')}</Button>
  {/snippet}
</Dialog>

<Dialog bind:open={resetOpen} title={$t('users.resetPassword')}>
  <div class="flex flex-col gap-3">
    <p class="text-sm text-muted">{$t('users.resetPasswordConfirm')}</p>
    <Input label={$t('users.tempPassword')} type="text" bind:value={resetPassword} required />
  </div>
  {#snippet footer()}
    <Button variant="secondary" onclick={() => (resetOpen = false)}>{$t('common.cancel')}</Button>
    <Button loading={resetSaving} disabled={resetPassword.length < 8} onclick={submitReset}>{$t('common.save')}</Button>
  {/snippet}
</Dialog>

<Dialog bind:open={reset2faOpen} title={$t('twoFactor.resetConfirmTitle')}>
  <p class="text-muted">{$t('twoFactor.resetConfirmBody')}</p>
  {#snippet footer()}
    <Button variant="secondary" onclick={() => (reset2faOpen = false)}>{$t('common.cancel')}</Button>
    <Button variant="danger" loading={reset2faLoading} onclick={confirmReset2fa}>{$t('twoFactor.resetAction')}</Button>
  {/snippet}
</Dialog>
