<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { getLocaleContext } from '$lib/i18n';
  import { apiFetch, ApiError } from '$lib/api/client';
  import RopaForm, { type RopaFormValue, toRopaFormValue } from '$lib/components/ropa/RopaForm.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  const { t } = getLocaleContext();

  interface Department {
    id: string;
    code: string;
    nameTh: string;
    nameEn: string;
    nameZh: string;
  }

  const canPickDepartment = $derived(data.user.permissions.includes('ropa.update_all'));

  let departments = $state<Department[]>([]);
  let loadingDepartments = $state(true);
  let saving = $state(false);
  let errorMessage = $state('');

  let form = $state<RopaFormValue>({
    departmentId: untrack(() => data.user.departmentId ?? ''),
    activityName: '',
    purpose: '',
    legalBasis: '',
    controllerName: '',
    jointController: '',
    dataSubjectCategories: [],
    dataCategories: [],
    sensitiveDataCategories: [],
    collectionSource: '',
    recipients: [],
    hasCrossBorderTransfer: false,
    crossBorderDestination: '',
    crossBorderSafeguards: '',
    retentionPeriod: '',
    disposalMethod: '',
    securityMeasures: '',
    dpoContact: '',
    remarks: '',
  });

  onMount(async () => {
    try {
      const [deptRes] = await Promise.all([
        apiFetch<{ departments: Department[] }>('/departments'),
        loadCloneSource(),
      ]);
      departments = deptRes.departments;
    } finally {
      loadingDepartments = false;
    }
  });

  async function loadCloneSource() {
    const cloneFrom = page.url.searchParams.get('cloneFrom');
    if (!cloneFrom) return;
    try {
      const res = await apiFetch<{ record: Parameters<typeof toRopaFormValue>[0] }>(`/ropa/${cloneFrom}`);
      form = toRopaFormValue(res.record);
      if (!canPickDepartment) form.departmentId = data.user.departmentId ?? '';
    } catch {
      // Source record no longer accessible — fall back to the blank form silently.
    }
  }

  function nullableOrNull(value: string): string | null {
    return value.trim() === '' ? null : value;
  }

  async function onSave() {
    saving = true;
    errorMessage = '';
    try {
      const { id } = (
        await apiFetch<{ record: { id: string } }>('/ropa', {
          method: 'POST',
          body: JSON.stringify({
            ...form,
            jointController: nullableOrNull(form.jointController),
            crossBorderDestination: nullableOrNull(form.crossBorderDestination),
            crossBorderSafeguards: nullableOrNull(form.crossBorderSafeguards),
            dpoContact: nullableOrNull(form.dpoContact),
            remarks: nullableOrNull(form.remarks),
          }),
        })
      ).record;
      await goto(`/ropa/${id}`);
    } catch (err) {
      errorMessage = err instanceof ApiError ? err.message : $t('common.error');
    } finally {
      saving = false;
    }
  }
</script>

<div class="flex flex-col gap-4">
  <div class="flex items-center justify-between">
    <h1 class="text-lg font-semibold text-body">{$t('ropa.newRecord')}</h1>
    <div class="flex gap-2">
      <Button variant="secondary" onclick={() => goto('/ropa')}>{$t('common.cancel')}</Button>
      <Button onclick={onSave} loading={saving} disabled={loadingDepartments}>{$t('common.save')}</Button>
    </div>
  </div>

  {#if errorMessage}
    <p class="text-sm text-red-600">{errorMessage}</p>
  {/if}

  {#if !loadingDepartments}
    <RopaForm bind:value={form} {departments} lockDepartment={!canPickDepartment} />
  {/if}
</div>
