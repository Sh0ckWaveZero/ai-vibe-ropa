<script lang="ts">
  import { onMount } from 'svelte';
  import { getLocaleContext } from '$lib/i18n';
  import { apiFetch } from '$lib/api/client';
  import { STATUS_COLORS } from '$lib/constants/status';
  import Card from '$lib/components/ui/Card.svelte';
  import StatTile from '$lib/components/ui/StatTile.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  const { t, locale } = getLocaleContext();

  interface RopaRecord {
    id: string;
    referenceNo: string;
    activityName: string;
    status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
    createdAt: string;
    department: { nameTh: string; nameEn: string; nameZh: string };
  }

  let records = $state<RopaRecord[]>([]);
  let loading = $state(true);
  const canReadRopa = $derived(
    data.user.permissions.includes('ropa.read_own') || data.user.permissions.includes('ropa.read_all')
  );

  onMount(async () => {
    if (!canReadRopa) {
      loading = false;
      return;
    }
    try {
      const res = await apiFetch<{ records: RopaRecord[] }>('/ropa');
      records = res.records;
    } finally {
      loading = false;
    }
  });

  const counts = $derived({
    total: records.length,
    DRAFT: records.filter((r) => r.status === 'DRAFT').length,
    SUBMITTED: records.filter((r) => r.status === 'SUBMITTED').length,
    APPROVED: records.filter((r) => r.status === 'APPROVED').length,
    REJECTED: records.filter((r) => r.status === 'REJECTED').length,
  });

  function deptName(r: RopaRecord) {
    return $locale === 'th' ? r.department.nameTh : $locale === 'zh' ? r.department.nameZh : r.department.nameEn;
  }

  const recent = $derived(records.slice(0, 5));
</script>

<div class="flex flex-col gap-6">
  <div>
    <h1 class="text-lg font-semibold text-body">{$t('dashboard.welcomeBack')}, {data.user.fullName}</h1>
  </div>

  {#if canReadRopa}
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <StatTile label={$t('dashboard.totalRecords')} value={loading ? '–' : counts.total} />
      <StatTile label={$t('dashboard.draft')} value={loading ? '–' : counts.DRAFT} dot={STATUS_COLORS.DRAFT} />
      <StatTile
        label={$t('dashboard.pendingApproval')}
        value={loading ? '–' : counts.SUBMITTED}
        dot={STATUS_COLORS.SUBMITTED}
      />
      <StatTile label={$t('dashboard.approved')} value={loading ? '–' : counts.APPROVED} dot={STATUS_COLORS.APPROVED} />
      <StatTile label={$t('dashboard.rejected')} value={loading ? '–' : counts.REJECTED} dot={STATUS_COLORS.REJECTED} />
    </div>

    <Card title={$t('dashboard.recentRecords')}>
      {#if loading}
        <p class="text-sm text-muted">{$t('common.loading')}</p>
      {:else if recent.length === 0}
        <p class="text-sm text-muted">{$t('common.noData')}</p>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="border-b border-border text-xs text-muted">
                <th class="py-2 pr-4">{$t('ropa.referenceNo')}</th>
                <th class="py-2 pr-4">{$t('ropa.activityName')}</th>
                <th class="py-2 pr-4">{$t('ropa.department')}</th>
                <th class="py-2 pr-4">{$t('ropa.status')}</th>
              </tr>
            </thead>
            <tbody>
              {#each recent as record (record.id)}
                <tr class="border-b border-border last:border-0">
                  <td class="py-2 pr-4">
                    <a href="/ropa/{record.id}" class="text-primary hover:underline">{record.referenceNo}</a>
                  </td>
                  <td class="py-2 pr-4">{record.activityName}</td>
                  <td class="py-2 pr-4">{deptName(record)}</td>
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
  {/if}
</div>
