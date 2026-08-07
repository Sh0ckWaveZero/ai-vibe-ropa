<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLSelectAttributes } from 'svelte/elements';

  interface Props extends Omit<HTMLSelectAttributes, 'value'> {
    label?: string;
    value: string;
    children: Snippet;
  }

  let { label, value = $bindable(), id, children, class: className = '', ...rest }: Props = $props();
  const selectId = id ?? `select-${Math.random().toString(36).slice(2, 9)}`;
</script>

<div class="flex flex-col gap-1">
  {#if label}
    <label for={selectId} class="text-sm font-medium text-body">{label}</label>
  {/if}
  <select
    id={selectId}
    bind:value
    {...rest}
    class="rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-body outline-none focus:border-primary focus:ring-1 focus:ring-primary {className}"
  >
    {@render children()}
  </select>
</div>
