<script lang="ts">
  import { onMount } from 'svelte';
  import { getLocaleContext } from '$lib/i18n';
  import { apiFetch, ApiError } from '$lib/api/client';
  import Card from '$lib/components/ui/Card.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Checkbox from '$lib/components/ui/Checkbox.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';

  const { t, locale } = getLocaleContext();

  interface Permission {
    code: string;
    module: string;
    action: string;
    descriptionTh: string;
    descriptionEn: string;
    descriptionZh: string;
  }
  interface Role {
    id: string;
    code: string;
    nameTh: string;
    nameEn: string;
    nameZh: string;
    isSystem: boolean;
    userCount: number;
    permissionCodes: string[];
  }

  let permissions = $state<Permission[]>([]);
  let roles = $state<Role[]>([]);
  let loading = $state(true);
  let matrix = $state<Record<string, Set<string>>>({});
  let savingRoleId = $state<string | null>(null);
  let errorMessage = $state('');

  function roleName(r: { nameTh: string; nameEn: string; nameZh: string }) {
    return $locale === 'th' ? r.nameTh : $locale === 'zh' ? r.nameZh : r.nameEn;
  }

  function permDescription(p: Permission) {
    return $locale === 'th' ? p.descriptionTh : $locale === 'zh' ? p.descriptionZh : p.descriptionEn;
  }

  function moduleLabel(mod: string): string {
    const key = mod as 'ropa' | 'users' | 'roles' | 'departments' | 'audit';
    return $t(`roles.module.${key}`);
  }

  const groupedPermissions = $derived.by(() => {
    const groups = new Map<string, Permission[]>();
    for (const p of permissions) {
      if (!groups.has(p.module)) groups.set(p.module, []);
      groups.get(p.module)!.push(p);
    }
    return Array.from(groups.entries());
  });

  async function loadAll() {
    loading = true;
    try {
      const [p, r] = await Promise.all([
        apiFetch<{ permissions: Permission[] }>('/roles/permissions'),
        apiFetch<{ roles: Role[] }>('/roles'),
      ]);
      permissions = p.permissions;
      roles = r.roles;
      matrix = Object.fromEntries(r.roles.map((role) => [role.id, new Set(role.permissionCodes)]));
    } finally {
      loading = false;
    }
  }

  onMount(loadAll);

  function isChecked(roleId: string, code: string) {
    return matrix[roleId]?.has(code) ?? false;
  }

  function toggle(roleId: string, code: string, checked: boolean) {
    const set = new Set(matrix[roleId]);
    if (checked) set.add(code);
    else set.delete(code);
    matrix = { ...matrix, [roleId]: set };
  }

  async function savePermissions(roleId: string) {
    savingRoleId = roleId;
    errorMessage = '';
    try {
      const permissionCodes = Array.from(matrix[roleId] ?? []);
      const res = await apiFetch<{ role: { id: string } }>(`/roles/${roleId}`, {
        method: 'PATCH',
        body: JSON.stringify({ permissionCodes }),
      });
      void res;
    } catch (err) {
      errorMessage = err instanceof ApiError ? err.message : $t('common.error');
    } finally {
      savingRoleId = null;
    }
  }

  // Create role dialog
  let createOpen = $state(false);
  let createSaving = $state(false);
  let createError = $state('');
  let createForm = $state({ code: '', nameTh: '', nameEn: '', nameZh: '' });

  function openCreate() {
    createForm = { code: '', nameTh: '', nameEn: '', nameZh: '' };
    createError = '';
    createOpen = true;
  }

  async function submitCreate() {
    createSaving = true;
    createError = '';
    try {
      await apiFetch('/roles', { method: 'POST', body: JSON.stringify({ ...createForm, permissionCodes: [] }) });
      createOpen = false;
      await loadAll();
    } catch (err) {
      createError = err instanceof ApiError ? err.message : $t('common.error');
    } finally {
      createSaving = false;
    }
  }

  let deleteTarget = $state<Role | null>(null);
  let deleteOpen = $state(false);
  let deleteError = $state('');
  let deleteLoading = $state(false);

  function openDelete(role: Role) {
    deleteTarget = role;
    deleteError = '';
    deleteOpen = true;
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    deleteLoading = true;
    try {
      await apiFetch(`/roles/${deleteTarget.id}`, { method: 'DELETE' });
      deleteOpen = false;
      await loadAll();
    } catch (err) {
      deleteError = err instanceof ApiError ? err.message : $t('common.error');
    } finally {
      deleteLoading = false;
    }
  }
</script>

<div class="flex flex-col gap-4">
  <div class="flex items-center justify-between">
    <h1 class="text-lg font-semibold text-body">{$t('roles.title')}</h1>
    <Button onclick={openCreate}>{$t('roles.newRole')}</Button>
  </div>

  {#if errorMessage}
    <p class="text-sm text-red-600">{errorMessage}</p>
  {/if}

  <Card title={$t('roles.permissionMatrix')}>
    {#if loading}
      <p class="text-sm text-muted">{$t('common.loading')}</p>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-left text-sm">
          <thead>
            <tr>
              <th class="sticky left-0 bg-surface-raised py-2 pr-4 align-bottom">
                {$t('roles.permissionMatrix')}
              </th>
              {#each roles as role (role.id)}
                <th class="min-w-40 px-3 py-2 align-bottom">
                  <div class="flex flex-col gap-1">
                    <span class="font-medium text-body">{roleName(role)}</span>
                    {#if role.isSystem}
                      <Badge label={$t('roles.systemRole')} />
                    {:else}
                      <button class="text-xs text-red-600 hover:underline" onclick={() => openDelete(role)}>
                        {$t('common.delete')}
                      </button>
                    {/if}
                  </div>
                </th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each groupedPermissions as [mod, perms] (mod)}
              <tr class="bg-surface-muted">
                <td class="sticky left-0 bg-surface-muted py-1.5 pr-4 text-xs font-semibold text-muted" colspan="1">
                  {moduleLabel(mod)}
                </td>
                {#each roles as role (role.id)}
                  <td class="bg-surface-muted"></td>
                {/each}
              </tr>
              {#each perms as perm (perm.code)}
                <tr class="border-b border-border">
                  <td class="sticky left-0 bg-surface-raised py-2 pr-4 text-body">{permDescription(perm)}</td>
                  {#each roles as role (role.id)}
                    <td class="px-3 py-2 text-center">
                      <Checkbox
                        checked={isChecked(role.id, perm.code)}
                        onchange={(e: Event) => toggle(role.id, perm.code, (e.target as HTMLInputElement).checked)}
                      />
                    </td>
                  {/each}
                </tr>
              {/each}
            {/each}
            <tr>
              <td class="sticky left-0 bg-surface-raised py-3 pr-4"></td>
              {#each roles as role (role.id)}
                <td class="px-3 py-3 text-center">
                  <Button size="sm" loading={savingRoleId === role.id} onclick={() => savePermissions(role.id)}>
                    {$t('roles.savePermissions')}
                  </Button>
                </td>
              {/each}
            </tr>
          </tbody>
        </table>
      </div>
    {/if}
  </Card>
</div>

<Dialog bind:open={createOpen} title={$t('roles.newRole')}>
  <div class="flex flex-col gap-3">
    <Input label={$t('roles.roleCode')} bind:value={createForm.code} hint={$t('roles.roleCodeHint')} required />
    <Input label={$t('roles.roleNameTh')} bind:value={createForm.nameTh} required />
    <Input label={$t('roles.roleNameEn')} bind:value={createForm.nameEn} required />
    <Input label={$t('roles.roleNameZh')} bind:value={createForm.nameZh} required />
    {#if createError}
      <p class="text-sm text-red-600">{createError}</p>
    {/if}
  </div>
  {#snippet footer()}
    <Button variant="secondary" onclick={() => (createOpen = false)}>{$t('common.cancel')}</Button>
    <Button loading={createSaving} onclick={submitCreate}>{$t('common.create')}</Button>
  {/snippet}
</Dialog>

<Dialog bind:open={deleteOpen} title={$t('common.confirmDeleteTitle')}>
  <p class="text-muted">{$t('common.confirmDeleteBody')}</p>
  {#if deleteError}
    <p class="mt-2 text-sm text-red-600">{deleteError}</p>
  {/if}
  {#snippet footer()}
    <Button variant="secondary" onclick={() => (deleteOpen = false)}>{$t('common.cancel')}</Button>
    <Button variant="danger" loading={deleteLoading} onclick={confirmDelete}>{$t('common.delete')}</Button>
  {/snippet}
</Dialog>
