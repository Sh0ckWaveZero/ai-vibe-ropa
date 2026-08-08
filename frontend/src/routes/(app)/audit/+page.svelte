<script lang="ts">
  import { onMount } from 'svelte';
  import { getLocaleContext } from '$lib/i18n';
  import { apiFetch } from '$lib/api/client';
  import Card from '$lib/components/ui/Card.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Select from '$lib/components/ui/Select.svelte';
  import Pagination from '$lib/components/ui/Pagination.svelte';

  const { t } = getLocaleContext();

  interface AuditEntry {
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    createdAt: string;
    user: { fullName: string; email: string } | null;
  }

  let logs = $state<AuditEntry[]>([]);
  let entityTypes = $state<string[]>([]);
  let loading = $state(true);
  let entityTypeFilter = $state('');
  let actionFilter = $state('');
  let dateFrom = $state('');
  let dateTo = $state('');
  let page = $state(1);
  const pageSize = 20;
  let total = $state(0);

  async function load() {
    loading = true;
    try {
      const params = new URLSearchParams();
      if (entityTypeFilter) params.set('entityType', entityTypeFilter);
      if (actionFilter) params.set('action', actionFilter);
      if (dateFrom) params.set('createdFrom', dateFrom);
      if (dateTo) params.set('createdTo', dateTo);
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      const res = await apiFetch<{ logs: AuditEntry[]; total: number }>(`/audit?${params.toString()}`);
      logs = res.logs;
      total = res.total;
    } finally {
      loading = false;
    }
  }

  function loadFromFilterChange() {
    page = 1;
    load();
  }

  function onPageChange(nextPage: number) {
    page = nextPage;
    load();
  }

  let actionTimeout: ReturnType<typeof setTimeout>;
  function onActionInput() {
    clearTimeout(actionTimeout);
    actionTimeout = setTimeout(loadFromFilterChange, 300);
  }

  onMount(async () => {
    const res = await apiFetch<{ entityTypes: string[] }>('/audit/entity-types');
    entityTypes = res.entityTypes;
    await load();
  });
</script>

<div class="flex flex-col gap-4">
  <h1 class="text-lg font-semibold text-body">{$t('audit.title')}</h1>

  <Card>
    <div class="flex flex-wrap items-end gap-3">
      <div class="min-w-56 flex-1">
        <Input
          label={$t('audit.filterAction')}
          bind:value={actionFilter}
          oninput={onActionInput}
          placeholder={$t('audit.actionPlaceholder')}
        />
      </div>
      <div class="w-56">
        <Select label={$t('audit.filterEntityType')} bind:value={entityTypeFilter} onchange={loadFromFilterChange}>
          <option value="">{$t('common.all')}</option>
          {#each entityTypes as et (et)}
            <option value={et}>{et}</option>
          {/each}
        </Select>
      </div>
      <div class="w-40">
        <Input type="date" label={$t('audit.dateFrom')} bind:value={dateFrom} onchange={loadFromFilterChange} />
      </div>
      <div class="w-40">
        <Input type="date" label={$t('audit.dateTo')} bind:value={dateTo} onchange={loadFromFilterChange} />
      </div>
    </div>
  </Card>

  <Card>
    {#if loading}
      <p class="text-sm text-muted">{$t('common.loading')}</p>
    {:else if logs.length === 0}
      <p class="text-sm text-muted">{$t('common.noData')}</p>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <caption class="sr-only">{$t('audit.title')}</caption>
          <thead>
            <tr class="border-b border-border text-xs text-muted">
              <th scope="col" class="py-2 pr-4">{$t('audit.when')}</th>
              <th scope="col" class="py-2 pr-4">{$t('audit.who')}</th>
              <th scope="col" class="py-2 pr-4">{$t('audit.action')}</th>
              <th scope="col" class="py-2 pr-4">{$t('audit.entity')}</th>
            </tr>
          </thead>
          <tbody>
            {#each logs as log (log.id)}
              <tr class="border-b border-border last:border-0">
                <td class="py-2 pr-4 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                <td class="py-2 pr-4">{log.user ? log.user.fullName : '-'}</td>
                <td class="py-2 pr-4 font-mono text-xs">{log.action}</td>
                <td class="py-2 pr-4 font-mono text-xs">{log.entityType}{log.entityId ? `#${log.entityId.slice(0, 8)}` : ''}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <Pagination {page} {pageSize} {total} onChange={onPageChange} />
    {/if}
  </Card>
</div>
