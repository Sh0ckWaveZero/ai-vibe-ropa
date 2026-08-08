<script lang="ts">
  let {
    values = $bindable(),
    label,
    hint,
    error,
    placeholder,
    disabled = false,
    id,
  }: { values: string[]; label?: string; hint?: string; error?: string; placeholder?: string; disabled?: boolean; id?: string } = $props();

  const generatedId = $props.id();
  const inputId = $derived(id ?? generatedId);
  const hintId = $derived(`${inputId}-hint`);
  const errorId = $derived(`${inputId}-error`);
  const description = $derived(
    [hint ? hintId : undefined, error ? errorId : undefined].filter(Boolean).join(' ') || undefined,
  );

  let draft = $state('');

  function commit() {
    const value = draft.trim();
    if (value && !values.includes(value)) {
      values = [...values, value];
    }
    draft = '';
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commit();
    } else if (event.key === 'Backspace' && draft === '' && values.length > 0) {
      values = values.slice(0, -1);
    }
  }

  function removeAt(index: number) {
    values = values.filter((_, i) => i !== index);
  }
</script>

<div class="flex flex-col gap-1">
  {#if label}
    {#if disabled}
      <span class="text-sm font-medium text-body">{label}</span>
    {:else}
      <label for={inputId} class="text-sm font-medium text-body">{label}</label>
    {/if}
  {/if}
  <div
    class="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-surface-raised px-2 py-1.5 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary"
  >
    {#each values as tag, i (tag + i)}
      <span
        class="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-xs text-body"
      >
        {tag}
        {#if !disabled}
          <button
            type="button"
            onclick={() => removeAt(i)}
            class="flex size-6 items-center justify-center rounded-full text-muted hover:text-red-600 focus-visible:outline-2 focus-visible:outline-primary"
            aria-label="Remove {tag}"
          >
            &times;
          </button>
        {/if}
      </span>
    {/each}
    {#if !disabled}
      <input
        id={inputId}
        type="text"
        bind:value={draft}
        onkeydown={onKeydown}
        onblur={commit}
        {placeholder}
        aria-describedby={description}
        aria-invalid={error ? 'true' : undefined}
        class="min-w-32 flex-1 border-none bg-transparent px-1 py-0.5 text-sm text-body outline-none"
      />
    {/if}
  </div>
  {#if hint}
    <p id={hintId} class="text-xs text-muted">{hint}</p>
  {/if}
  {#if error}
    <p id={errorId} class="text-xs text-red-600" role="alert">{error}</p>
  {/if}
</div>
