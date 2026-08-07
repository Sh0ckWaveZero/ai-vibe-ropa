<script lang="ts">
  let { label, value, dot }: { label: string; value: number | string; dot?: string } = $props();
</script>

<div class="rounded-lg border border-border bg-surface-raised p-4">
  <div class="flex items-center gap-2 text-sm text-muted">
    {#if dot}
      <span class="size-2.5 rounded-full" style="background-color: {dot}" aria-hidden="true"></span>
    {/if}
    <span>{label}</span>
  </div>
  <p class="mt-2 text-2xl font-semibold text-body">{value}</p>
</div>
