<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    title,
    children,
    actions,
    class: className = '',
  }: { title?: string; children: Snippet; actions?: Snippet; class?: string } = $props();
</script>

<section class="rounded-lg border border-border bg-surface-raised shadow-sm {className}">
  {#if title || actions}
    <header class="flex items-center justify-between border-b border-border px-5 py-3">
      {#if title}
        <h2 class="text-sm font-semibold text-body">{title}</h2>
      {/if}
      {#if actions}
        <div>{@render actions()}</div>
      {/if}
    </header>
  {/if}
  <div class="p-5">
    {@render children()}
  </div>
</section>
