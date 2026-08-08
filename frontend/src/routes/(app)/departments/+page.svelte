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

  interface Department {
    id: string;
    code: string;
    nameTh: string;
    nameEn: string;
    nameZh: string;
    isActive: boolean;
    _count: { users: number; ropaRecords: number };
  }

  let departments = $state<Department[]>([]);
  let loading = $state(true);

  function name(d: Department) {
    return $locale === 'th' ? d.nameTh : $locale === 'zh' ? d.nameZh : d.nameEn;
  }

  async function loadAll() {
    loading = true;
    try {
      const res = await apiFetch<{ departments: Department[] }>('/departments');
      departments = res.departments;
    } finally {
      loading = false;
    }
  }

  onMount(loadAll);

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
      await apiFetch('/departments', { method: 'POST', body: JSON.stringify(createForm) });
      createOpen = false;
      await loadAll();
    } catch (err) {
      createError = err instanceof ApiError ? err.message : $t('common.error');
    } finally {
      createSaving = false;
    }
  }

  let editOpen = $state(false);
  let editSaving = $state(false);
  let editError = $state('');
  let editTarget = $state<Department | null>(null);
  let editForm = $state({ nameTh: '', nameEn: '', nameZh: '', isActive: true });

  function openEdit(d: Department) {
    editTarget = d;
    editForm = { nameTh: d.nameTh, nameEn: d.nameEn, nameZh: d.nameZh, isActive: d.isActive };
    editError = '';
    editOpen = true;
  }

  async function submitEdit() {
    if (!editTarget) return;
    editSaving = true;
    editError = '';
    try {
      await apiFetch(`/departments/${editTarget.id}`, { method: 'PATCH', body: JSON.stringify(editForm) });
      editOpen = false;
      await loadAll();
    } catch (err) {
      editError = err instanceof ApiError ? err.message : $t('common.error');
    } finally {
      editSaving = false;
    }
  }

  let deleteOpen = $state(false);
  let deleteTarget = $state<Department | null>(null);
  let deleteError = $state('');
  let deleteLoading = $state(false);

  function openDelete(d: Department) {
    deleteTarget = d;
    deleteError = '';
    deleteOpen = true;
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    deleteLoading = true;
    try {
      await apiFetch(`/departments/${deleteTarget.id}`, { method: 'DELETE' });
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
    <h1 class="text-lg font-semibold text-body">{$t('departments.title')}</h1>
    <Button onclick={openCreate}>{$t('departments.newDepartment')}</Button>
  </div>

  <Card>
    {#if loading}
      <p class="text-sm text-muted">{$t('common.loading')}</p>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <caption class="sr-only">{$t('departments.title')}</caption>
          <thead>
            <tr class="border-b border-border text-xs text-muted">
              <th scope="col" class="py-2 pr-4">{$t('departments.code')}</th>
              <th scope="col" class="py-2 pr-4">{$t('departments.nameEn')}</th>
              <th scope="col" class="py-2 pr-4">{$t('departments.userCount')}</th>
              <th scope="col" class="py-2 pr-4">{$t('departments.recordCount')}</th>
              <th scope="col" class="py-2 pr-4">{$t('common.active')}</th>
              <th scope="col" class="py-2 pr-4">{$t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {#each departments as d (d.id)}
              <tr class="border-b border-border last:border-0">
                <td class="py-2 pr-4 font-medium text-body">{d.code}</td>
                <td class="py-2 pr-4">{name(d)}</td>
                <td class="py-2 pr-4">{d._count.users}</td>
                <td class="py-2 pr-4">{d._count.ropaRecords}</td>
                <td class="py-2 pr-4">
                  <Badge label={d.isActive ? $t('common.active') : $t('common.inactive')} />
                </td>
                <td class="py-2 pr-4">
                  <div class="flex gap-2">
                    <button type="button" class="text-primary hover:underline" onclick={() => openEdit(d)}>{$t('common.edit')}</button>
                    <button type="button" class="text-red-600 hover:underline" onclick={() => openDelete(d)}>{$t('common.delete')}</button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </Card>
</div>

<Dialog bind:open={createOpen} title={$t('departments.newDepartment')}>
  <div class="flex flex-col gap-3">
    <Input label={$t('departments.code')} bind:value={createForm.code} required />
    <Input label={$t('departments.nameTh')} bind:value={createForm.nameTh} required />
    <Input label={$t('departments.nameEn')} bind:value={createForm.nameEn} required />
    <Input label={$t('departments.nameZh')} bind:value={createForm.nameZh} required />
    {#if createError}
      <p class="text-sm text-red-600">{createError}</p>
    {/if}
  </div>
  {#snippet footer()}
    <Button variant="secondary" onclick={() => (createOpen = false)}>{$t('common.cancel')}</Button>
    <Button loading={createSaving} onclick={submitCreate}>{$t('common.create')}</Button>
  {/snippet}
</Dialog>

<Dialog bind:open={editOpen} title={$t('common.edit')}>
  <div class="flex flex-col gap-3">
    <Input label={$t('departments.nameTh')} bind:value={editForm.nameTh} required />
    <Input label={$t('departments.nameEn')} bind:value={editForm.nameEn} required />
    <Input label={$t('departments.nameZh')} bind:value={editForm.nameZh} required />
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
