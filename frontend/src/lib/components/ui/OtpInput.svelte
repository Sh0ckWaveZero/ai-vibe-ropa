<script lang="ts">
  import { onMount } from 'svelte';
  import type { HTMLInputAttributes } from 'svelte/elements';

  type OtpStatus = 'idle' | 'success' | 'error';
  type OtpType = 'numbers' | 'letters' | 'both';

  interface Props {
    label?: string;
    value: string;
    length?: number;
    type?: OtpType;
    status?: OtpStatus;
    mask?: boolean;
    disabled?: boolean;
    autofocus?: boolean;
    required?: boolean;
    autocomplete?: HTMLInputAttributes['autocomplete'];
    name?: string;
    id?: string;
    error?: string;
    hint?: string;
    class?: string;
    slotClass?: string;
    onComplete?: (value: string) => void;
  }

  let {
    label,
    value = $bindable(),
    length = 6,
    type = 'numbers',
    status = 'idle',
    mask = false,
    disabled = false,
    autofocus = false,
    required = false,
    autocomplete = 'one-time-code',
    name,
    id,
    error,
    hint,
    class: className = '',
    slotClass = '',
    onComplete,
  }: Props = $props();

  const generatedId = $props.id();
  const inputId = $derived(id ?? generatedId);
  const labelId = $derived(`${inputId}-label`);
  const descriptionId = $derived(`${inputId}-description`);

  const patterns: Record<OtpType, RegExp> = {
    numbers: /^[0-9]$/,
    letters: /^[a-zA-Z]$/,
    both: /^[a-zA-Z0-9]$/,
  };

  function clean(raw: string): string[] {
    const chars = raw.split('').filter((char) => patterns[type].test(char));
    return type === 'numbers' ? chars : chars.map((char) => char.toUpperCase());
  }

  function toSlots(raw: string): string[] {
    const chars = clean(raw).slice(0, length);
    return Array.from({ length }, (_, index) => chars[index] ?? '');
  }

  let slots = $state<string[]>(toSlots(value));
  let inputs = $state<(HTMLInputElement | undefined)[]>([]);
  let focusedIndex = $state<number | null>(null);
  let editingAt: number | null = null;

  onMount(() => {
    if (autofocus) focusAt(0);
  });

  $effect(() => {
    const normalized = clean(value).slice(0, length).join('');
    if (slots.length !== length || normalized !== slots.join('')) {
      slots = toSlots(normalized);
    }
  });

  function commit(next: string[]) {
    slots = next;
    value = next.join('');

    if (next.every(Boolean)) {
      onComplete?.(value);
    }
  }

  function setCharAt(index: number, char: string) {
    commit(slots.map((slot, slotIndex) => (slotIndex === index ? char : slot)));
  }

  function focusAt(index: number) {
    const target = Math.min(Math.max(index, 0), length - 1);
    inputs[target]?.focus();
    inputs[target]?.select();
  }

  function fill(index: number, chars: string[]) {
    const room = Math.min(chars.length, length - index);
    const next = [...slots];

    chars.slice(0, room).forEach((char, offset) => {
      next[index + offset] = char;
    });

    commit(next);
    editingAt = null;
    focusAt(index + room);
  }

  function handleInput(index: number, event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const raw = input.value;
    const chars = clean(raw);
    if (!chars.length) {
      if (raw === '') {
        setCharAt(index, '');
      } else {
        input.value = slots[index];
      }
      return;
    }

    const typed =
      chars.length === 1
        ? chars[0]
        : chars.length === 2 && chars[0] === slots[index]
          ? chars[1]
          : null;

    if (typed === null) {
      fill(index, chars);
      return;
    }

    if (slots.every(Boolean) && editingAt !== index) return;

    setCharAt(index, typed);
    editingAt = null;
    focusAt(index + 1);
  }

  function handleKeydown(index: number, event: KeyboardEvent) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      editingAt = Math.max(index - 1, 0);
      focusAt(index - 1);
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      editingAt = Math.min(index + 1, length - 1);
      focusAt(index + 1);
      return;
    }

    if (event.key !== 'Backspace') return;

    event.preventDefault();
    if (slots[index]) {
      setCharAt(index, '');
    } else if (index > 0) {
      setCharAt(index - 1, '');
      focusAt(index - 1);
    }
  }

  function handlePaste(index: number, event: ClipboardEvent) {
    event.preventDefault();
    const pasted = clean(event.clipboardData?.getData('text') ?? '');
    if (pasted.length) fill(index, pasted);
  }

  function handlePointerdown(index: number, event: PointerEvent) {
    const firstEmpty = slots.findIndex((slot) => !slot);
    const target = firstEmpty === -1 ? index : Math.min(index, firstEmpty);
    editingAt = target;

    if (target === index) return;
    event.preventDefault();
    focusAt(target);
  }

  function handleBlur(event: FocusEvent) {
    if (!inputs.includes(event.relatedTarget as HTMLInputElement)) {
      focusedIndex = null;
    }
  }
</script>

<div id={inputId} class="flex flex-col gap-1.5 {className}">
  {#if label}
    <label id={labelId} for={`${inputId}-slot-0`} class="text-sm font-medium text-body">{label}</label>
  {/if}

  <div
    id={`${inputId}-group`}
    class:otp-shake={status === 'error'}
    class="flex w-full items-center gap-1.5"
    role="group"
    aria-labelledby={label ? labelId : undefined}
    aria-describedby={error || hint ? descriptionId : undefined}
  >
    {#each slots as slot, index (index)}
      <div
        id={`${inputId}-cell-${index}`}
        class="otp-cell relative min-w-0 flex-1"
        data-status={status}
        data-filled={Boolean(slot)}
        style:--otp-index={index}
      >
        <input
          bind:this={inputs[index]}
          id={`${inputId}-slot-${index}`}
          value={slot}
          type={mask ? 'password' : 'text'}
          inputmode={type === 'numbers' ? 'numeric' : 'text'}
          autocapitalize={type === 'numbers' ? 'off' : 'characters'}
          autocomplete={index === 0 ? autocomplete : 'off'}
          maxlength={length}
          {disabled}
          {required}
          aria-invalid={status === 'error'}
          aria-label={`${label ?? 'One-time code'} ${index + 1}/${length}`}
          oninput={(event) => handleInput(index, event)}
          onkeydown={(event) => handleKeydown(index, event)}
          onpaste={(event) => handlePaste(index, event)}
          onpointerdown={(event) => handlePointerdown(index, event)}
          onfocus={(event) => {
            focusedIndex = index;
            event.currentTarget.select();
          }}
          onblur={handleBlur}
          class="otp-slot aspect-square w-full rounded-xl border border-transparent bg-surface-muted text-center text-lg font-semibold text-transparent outline-none transition-[background-color,box-shadow] duration-200 disabled:cursor-not-allowed disabled:opacity-50 {slotClass}"
        />

        <span id={`${inputId}-display-${index}`} class="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden">
          {#key slot}
            {#if slot}
              <span id={`${inputId}-character-${index}`} class="otp-character text-lg font-semibold text-body">{mask ? '•' : slot}</span>
            {/if}
          {/key}
        </span>

        {#if focusedIndex === index && !slot}
          <span
            id={`${inputId}-caret-${index}`}
            class="otp-caret pointer-events-none absolute left-1/2 top-1/2 h-6 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-body"
            aria-hidden="true"
          ></span>
        {/if}
      </div>
    {/each}
  </div>

  {#if name}
    <input id={`${inputId}-value`} type="hidden" {name} {value} />
  {/if}

  {#if error}
    <p id={descriptionId} class="text-xs text-red-600" role="alert">{error}</p>
  {:else if hint}
    <p id={descriptionId} class="text-xs text-muted">{hint}</p>
  {/if}
</div>

<style>
  .otp-slot {
    caret-color: transparent;
  }

  .otp-slot:focus-visible {
    background-color: var(--color-surface-raised);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 55%, transparent);
  }

  .otp-cell[data-status='error'] .otp-slot {
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-red-500) 70%, transparent);
  }

  .otp-cell[data-status='success'] .otp-slot {
    animation: otp-success-ring 450ms ease-out both;
    animation-delay: calc(var(--otp-index, 0) * 50ms);
  }

  .otp-character {
    animation: otp-roll-in 180ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
  }

  .otp-caret {
    animation: otp-blink 1.1s steps(1, end) infinite;
  }

  .otp-shake {
    animation: otp-shake 320ms ease-out;
  }

  @keyframes otp-roll-in {
    from {
      opacity: 0;
      transform: translateY(70%);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes otp-blink {
    0%,
    49% {
      opacity: 1;
    }
    50%,
    100% {
      opacity: 0;
    }
  }

  @keyframes otp-shake {
    0%,
    100% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(-5px);
    }
    50% {
      transform: translateX(4px);
    }
    75% {
      transform: translateX(-2px);
    }
  }

  @keyframes otp-success-ring {
    from {
      box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-green-500) 0%, transparent);
    }
    to {
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-green-500) 75%, transparent);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .otp-character,
    .otp-caret,
    .otp-shake,
    .otp-cell[data-status='success'] .otp-slot {
      animation: none;
    }
  }
</style>
