<script lang="ts">
  let { label, dot }: { label: string; dot?: string } = $props();
</script>

<span
  class="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-body"
>
  {#if dot}
    <span class="size-2 rounded-full" style="background-color: {dot}" aria-hidden="true"></span>
  {/if}
  {label}
</span>
