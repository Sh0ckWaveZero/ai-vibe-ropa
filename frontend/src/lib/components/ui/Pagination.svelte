<script lang="ts">
  import { getLocaleContext } from '$lib/i18n';
  import Button from './Button.svelte';

  let {
    page,
    pageSize,
    total,
    onChange,
  }: { page: number; pageSize: number; total: number; onChange: (page: number) => void } = $props();

  const { t } = getLocaleContext();

  const totalPages = $derived(Math.max(1, Math.ceil(total / pageSize)));
  const from = $derived(total === 0 ? 0 : (page - 1) * pageSize + 1);
  const to = $derived(Math.min(page * pageSize, total));
</script>

{#if total > 0}
  <div class="flex items-center justify-between gap-3 pt-2 text-sm text-muted">
    <span>{$t('common.paginationSummary', { from, to, total })}</span>
    <div class="flex gap-2">
      <Button variant="secondary" size="sm" disabled={page <= 1} onclick={() => onChange(page - 1)}>
        {$t('common.previous')}
      </Button>
      <Button variant="secondary" size="sm" disabled={page >= totalPages} onclick={() => onChange(page + 1)}>
        {$t('common.next')}
      </Button>
    </div>
  </div>
{/if}
