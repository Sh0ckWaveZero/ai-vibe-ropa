<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements';

  interface Props extends Omit<HTMLTextareaAttributes, 'value'> {
    label?: string;
    value: string;
    hint?: string;
    error?: string;
  }

  let {
    label,
    value = $bindable(),
    hint,
    error,
    id,
    rows = 3,
    'aria-describedby': ariaDescribedby,
    'aria-invalid': ariaInvalid,
    class: className = '',
    ...rest
  }: Props = $props();
  const generatedId = $props.id();
  const areaId = $derived(id ?? generatedId);
  const hintId = $derived(`${areaId}-hint`);
  const errorId = $derived(`${areaId}-error`);
  const description = $derived(
    [ariaDescribedby, hint ? hintId : undefined, error ? errorId : undefined].filter(Boolean).join(' ') || undefined,
  );
</script>

<div class="flex flex-col gap-1">
  {#if label}
    <label for={areaId} class="text-sm font-medium text-body">{label}</label>
  {/if}
  <textarea
    id={areaId}
    bind:value
    {rows}
    aria-describedby={description}
    aria-invalid={ariaInvalid ?? (error ? 'true' : undefined)}
    {...rest}
    class="resize-y rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-body outline-none focus:border-primary focus:ring-1 focus:ring-primary {className}"
  ></textarea>
  {#if hint}
    <p id={hintId} class="text-xs text-muted">{hint}</p>
  {/if}
  {#if error}
    <p id={errorId} class="text-xs text-red-600" role="alert">{error}</p>
  {/if}
</div>
