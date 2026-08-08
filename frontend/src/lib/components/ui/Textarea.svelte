<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements';

  interface Props extends Omit<HTMLTextareaAttributes, 'value'> {
    label?: string;
    value: string;
    hint?: string;
  }

  let { label, value = $bindable(), hint, id, rows = 3, class: className = '', ...rest }: Props = $props();
  const generatedId = $props.id();
  const areaId = $derived(id ?? generatedId);
</script>

<div class="flex flex-col gap-1">
  {#if label}
    <label for={areaId} class="text-sm font-medium text-body">{label}</label>
  {/if}
  <textarea
    id={areaId}
    bind:value
    {rows}
    {...rest}
    class="resize-y rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-body outline-none focus:border-primary focus:ring-1 focus:ring-primary {className}"
  ></textarea>
  {#if hint}
    <p class="text-xs text-muted">{hint}</p>
  {/if}
</div>
