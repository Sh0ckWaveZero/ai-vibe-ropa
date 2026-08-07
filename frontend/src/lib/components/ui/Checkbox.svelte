<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    checked = $bindable(false),
    label,
    children,
    disabled = false,
    onchange,
  }: {
    checked?: boolean;
    label?: string;
    children?: Snippet;
    disabled?: boolean;
    onchange?: (event: Event) => void;
  } = $props();
</script>

<label class="inline-flex items-center gap-2 text-sm text-body {disabled ? 'opacity-50' : 'cursor-pointer'}">
  <input
    type="checkbox"
    bind:checked
    {disabled}
    {onchange}
    class="size-4 rounded border-border text-primary focus:ring-primary"
  />
  {#if label}
    <span>{label}</span>
  {:else if children}
    {@render children()}
  {/if}
</label>
