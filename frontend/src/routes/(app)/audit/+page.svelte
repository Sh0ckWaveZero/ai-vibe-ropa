<script lang="ts">
  import { onMount } from 'svelte';
  import { getLocaleContext } from '$lib/i18n';
  import { apiFetch } from '$lib/api/client';
  import Card from '$lib/components/ui/Card.svelte';

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
  let loading = $state(true);

  onMount(async () => {
    try {
      const res = await apiFetch<{ logs: AuditEntry[] }>('/audit?take=100');
      logs = res.logs;
    } finally {
      loading = false;
    }
  });
</script>

<div class="flex flex-col gap-4">
  <h1 class="text-lg font-semibold text-body">{$t('audit.title')}</h1>

  <Card>
    {#if loading}
      <p class="text-sm text-muted">{$t('common.loading')}</p>
    {:else if logs.length === 0}
      <p class="text-sm text-muted">{$t('common.noData')}</p>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-border text-xs text-muted">
              <th class="py-2 pr-4">{$t('audit.when')}</th>
              <th class="py-2 pr-4">{$t('audit.who')}</th>
              <th class="py-2 pr-4">{$t('audit.action')}</th>
              <th class="py-2 pr-4">{$t('audit.entity')}</th>
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
    {/if}
  </Card>
</div>
