<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    open: boolean;
    title: string;
    children: Snippet;
    footer: Snippet;
    restoreFocusTo?: HTMLElement | null;
  }

  let {
    open = $bindable(),
    title,
    children,
    footer,
    restoreFocusTo,
  }: Props = $props();

  const dialogId = $props.id();
  const titleId = `${dialogId}-title`;
  let dialogEl: HTMLDialogElement | undefined = $state();
  let titleEl: HTMLHeadingElement | undefined = $state();
  let returnFocusTo: HTMLElement | null = null;

  function focusInitialElement() {
    if (!dialogEl?.open) return;

    const explicitTarget = dialogEl.querySelector<HTMLElement>('[autofocus]');
    if (explicitTarget) {
      explicitTarget.focus();
      return;
    }

    const activeElement = document.activeElement;
    if (activeElement !== dialogEl && activeElement instanceof HTMLElement && dialogEl.contains(activeElement)) {
      return;
    }

    const firstFocusable = dialogEl.querySelector<HTMLElement>(
      'button:not(:disabled), [href], input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
    );
    (firstFocusable ?? titleEl)?.focus();
  }

  $effect(() => {
    if (!dialogEl) return;
    if (open && !dialogEl.open) {
      returnFocusTo = restoreFocusTo ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
      dialogEl.showModal();
      queueMicrotask(focusInitialElement);
    }
    if (!open && dialogEl.open) dialogEl.close();
  });

  function onClose() {
    open = false;
    const focusTarget = returnFocusTo;
    returnFocusTo = null;
    queueMicrotask(() => {
      if (!open && focusTarget?.isConnected) focusTarget.focus();
    });
  }

  function onDialogClick(event: MouseEvent) {
    if (event.target !== dialogEl || !dialogEl) return;

    const bounds = dialogEl.getBoundingClientRect();
    const isDialogSurface =
      bounds.top <= event.clientY &&
      event.clientY <= bounds.bottom &&
      bounds.left <= event.clientX &&
      event.clientX <= bounds.right;
    if (!isDialogSurface) onClose();
  }
</script>

<dialog
  id={dialogId}
  bind:this={dialogEl}
  aria-labelledby={titleId}
  closedby="any"
  onclose={onClose}
  onclick={onDialogClick}
  class="fixed inset-0 m-auto h-fit max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-lg border border-border bg-surface-raised p-0 text-body backdrop:bg-black/50"
>
  <div class="border-b border-border px-5 py-3">
    <h2 id={titleId} bind:this={titleEl} tabindex="-1" class="text-sm font-semibold">{title}</h2>
  </div>
  <div class="px-5 py-4 text-sm">
    {@render children()}
  </div>
  <div class="flex justify-end gap-2 border-t border-border px-5 py-3">
    {@render footer()}
  </div>
</dialog>
