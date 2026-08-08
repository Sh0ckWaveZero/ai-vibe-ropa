<script lang="ts">
  import { getLocaleContext } from '$lib/i18n';
  import type { Snippet } from 'svelte';

  const { t } = getLocaleContext();

  interface Props {
    open: boolean;
    title: string;
    children: Snippet;
    footer: Snippet;
    restoreFocusTo?: HTMLElement | null;
    closeLabel?: string;
    class?: string;
    headerClass?: string;
    titleClass?: string;
    contentClass?: string;
    footerClass?: string;
  }

  let {
    open = $bindable(),
    title,
    children,
    footer,
    restoreFocusTo,
    closeLabel,
    class: className = '',
    headerClass = '',
    titleClass = '',
    contentClass = '',
    footerClass = '',
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

  function handleBackdropClick(event: MouseEvent) {
    if (event.target !== dialogEl || !dialogEl) return;

    const rect = dialogEl.getBoundingClientRect();
    const insideDialog =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;
    if (!insideDialog) dialogEl.close();
  }

  function handleCancel(event: Event) {
    event.preventDefault();
    dialogEl?.close();
  }

</script>

<dialog
  id={dialogId}
  bind:this={dialogEl}
  aria-labelledby={titleId}
  closedby="any"
  onclick={handleBackdropClick}
  oncancel={handleCancel}
  onclose={onClose}
  class="fixed inset-0 m-auto h-fit max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-lg border border-border bg-surface-raised p-0 text-body backdrop:bg-black/50 {className}"
>
  <div class="relative border-b border-border px-5 py-3 {headerClass}">
    <h2 id={titleId} bind:this={titleEl} tabindex="-1" class="text-sm font-semibold {titleClass}">{title}</h2>
    <button
      type="button"
      class="absolute right-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:bg-surface-muted hover:text-body focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      aria-label={closeLabel ?? $t('common.close')}
      onclick={() => dialogEl?.close()}
    >
      <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" stroke-linecap="round" />
      </svg>
    </button>
  </div>
  <div class="px-5 py-4 text-sm {contentClass}">
    {@render children()}
  </div>
  <div class="flex justify-end gap-2 border-t border-border px-5 py-3 {footerClass}">
    {@render footer()}
  </div>
</dialog>
