<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLInputAttributes } from 'svelte/elements';

  interface Props extends Omit<HTMLInputAttributes, 'checked' | 'type'> {
    checked?: boolean;
    label?: string;
    children?: Snippet;
  }

  let {
    checked = $bindable(false),
    label,
    children,
    disabled = false,
    id,
    ...rest
  }: Props = $props();

  const generatedId = $props.id();
  const inputId = $derived(id ?? generatedId);
</script>

<label for={inputId} class="inline-flex items-center gap-2 text-sm text-body {disabled ? 'opacity-50' : 'cursor-pointer'}">
  <input
    id={inputId}
    type="checkbox"
    bind:checked
    {disabled}
    {...rest}
    class="size-4 rounded border-border text-primary focus:ring-primary"
  />
  {#if label}
    <span>{label}</span>
  {:else if children}
    {@render children()}
  {/if}
</label>
