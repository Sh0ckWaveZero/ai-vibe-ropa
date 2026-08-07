<script lang="ts">
  import { onMount } from 'svelte';
  import { getLocaleContext } from '$lib/i18n';
  import { apiFetch } from '$lib/api/client';
  import { STATUS_COLORS, STATUSES } from '$lib/constants/status';
  import Card from '$lib/components/ui/Card.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Select from '$lib/components/ui/Select.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  const { t, locale } = getLocaleContext();

  interface RopaRecord {
    id: string;
    referenceNo: string;
    activityName: string;
    status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
    createdAt: string;
    department: { id: string; nameTh: string; nameEn: string; nameZh: string };
    createdBy: { fullName: string };
  }

  interface Department {
    id: string;
    code: string;
    nameTh: string;
    nameEn: string;
    nameZh: string;
  }

  const canReadAll = data.user.permissions.includes('ropa.read_all');
  const canCreate = data.user.permissions.includes('ropa.create');

  let records = $state<RopaRecord[]>([]);
  let departments = $state<Department[]>([]);
  let loading = $state(true);
  let search = $state('');
  let statusFilter = $state('');
  let departmentFilter = $state('');

  function deptName(d: { nameTh: string; nameEn: string; nameZh: string }) {
    return $locale === 'th' ? d.nameTh : $locale === 'zh' ? d.nameZh : d.nameEn;
  }

  async function load() {
    loading = true;
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (departmentFilter) params.set('departmentId', departmentFilter);
      const res = await apiFetch<{ records: RopaRecord[] }>(`/ropa?${params.toString()}`);
      records = res.records;
    } finally {
      loading = false;
    }
  }

  onMount(async () => {
    if (canReadAll) {
      const res = await apiFetch<{ departments: Department[] }>('/departments');
      departments = res.departments;
    }
    await load();
  });

  let searchTimeout: ReturnType<typeof setTimeout>;
  function onSearchInput() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(load, 300);
  }
</script>

<div class="flex flex-col gap-4">
  <div class="flex items-center justify-between">
    <h1 class="text-lg font-semibold text-body">{$t('ropa.title')}</h1>
    {#if canCreate}
      <Button onclick={() => (window.location.href = '/ropa/new')}>{$t('ropa.newRecord')}</Button>
    {/if}
  </div>

  <Card>
    <div class="flex flex-wrap items-end gap-3">
      <div class="min-w-56 flex-1">
        <Input
          label={$t('common.search')}
          bind:value={search}
          oninput={onSearchInput}
          placeholder={$t('ropa.searchPlaceholder')}
        />
      </div>
      <div class="w-44">
        <Select label={$t('common.filter')} bind:value={statusFilter} onchange={load}>
          <option value="">{$t('common.all')}</option>
          {#each STATUSES as s (s)}
            <option value={s}>{$t(`status.${s}`)}</option>
          {/each}
        </Select>
      </div>
      {#if canReadAll}
        <div class="w-56">
          <Select label={$t('ropa.department')} bind:value={departmentFilter} onchange={load}>
            <option value="">{$t('common.all')}</option>
            {#each departments as d (d.id)}
              <option value={d.id}>{deptName(d)}</option>
            {/each}
          </Select>
        </div>
      {/if}
    </div>
  </Card>

  <Card>
    {#if loading}
      <p class="text-sm text-muted">{$t('common.loading')}</p>
    {:else if records.length === 0}
      <p class="text-sm text-muted">{$t('common.noData')}</p>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-border text-xs text-muted">
              <th class="py-2 pr-4">{$t('ropa.referenceNo')}</th>
              <th class="py-2 pr-4">{$t('ropa.activityName')}</th>
              <th class="py-2 pr-4">{$t('ropa.department')}</th>
              <th class="py-2 pr-4">{$t('ropa.createdBy')}</th>
              <th class="py-2 pr-4">{$t('ropa.status')}</th>
            </tr>
          </thead>
          <tbody>
            {#each records as record (record.id)}
              <tr class="border-b border-border last:border-0 hover:bg-surface-muted">
                <td class="py-2 pr-4">
                  <a href="/ropa/{record.id}" class="font-medium text-primary hover:underline">
                    {record.referenceNo}
                  </a>
                </td>
                <td class="py-2 pr-4">{record.activityName}</td>
                <td class="py-2 pr-4">{deptName(record.department)}</td>
                <td class="py-2 pr-4">{record.createdBy.fullName}</td>
                <td class="py-2 pr-4">
                  <Badge label={$t(`status.${record.status}`)} dot={STATUS_COLORS[record.status]} />
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </Card>
</div>
