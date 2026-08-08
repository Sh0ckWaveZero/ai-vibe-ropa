<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLSelectAttributes } from 'svelte/elements';

  interface Props extends Omit<HTMLSelectAttributes, 'value'> {
    label?: string;
    value: string;
    error?: string;
    hint?: string;
    children: Snippet;
  }

  let {
    label,
    value = $bindable(),
    error,
    hint,
    id,
    children,
    'aria-describedby': ariaDescribedby,
    'aria-invalid': ariaInvalid,
    class: className = '',
    ...rest
  }: Props = $props();
  const generatedId = $props.id();
  const selectId = $derived(id ?? generatedId);
  const hintId = $derived(`${selectId}-hint`);
  const errorId = $derived(`${selectId}-error`);
  const description = $derived(
    [ariaDescribedby, hint ? hintId : undefined, error ? errorId : undefined].filter(Boolean).join(' ') || undefined,
  );
</script>

<div class="flex flex-col gap-1">
  {#if label}
    <label for={selectId} class="text-sm font-medium text-body">{label}</label>
  {/if}
  <select
    id={selectId}
    bind:value
    aria-describedby={description}
    aria-invalid={ariaInvalid ?? (error ? 'true' : undefined)}
    {...rest}
    class="rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-body outline-none focus:border-primary focus:ring-1 focus:ring-primary {className}"
  >
    {@render children()}
  </select>
  {#if hint}
    <p id={hintId} class="text-xs text-muted">{hint}</p>
  {/if}
  {#if error}
    <p id={errorId} class="text-xs text-red-600" role="alert">{error}</p>
  {/if}
</div>
