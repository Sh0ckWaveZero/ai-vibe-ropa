<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    open = $bindable(),
    title,
    children,
    footer,
  }: { open: boolean; title: string; children: Snippet; footer?: Snippet } = $props();

  let dialogEl: HTMLDialogElement | undefined = $state();

  $effect(() => {
    if (!dialogEl) return;
    if (open && !dialogEl.open) dialogEl.showModal();
    if (!open && dialogEl.open) dialogEl.close();
  });

  function onClose() {
    open = false;
  }
</script>

<dialog
  bind:this={dialogEl}
  onclose={onClose}
  onclick={(e) => {
    if (e.target === dialogEl) onClose();
  }}
  class="fixed inset-0 m-auto h-fit max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-lg border border-border bg-surface-raised p-0 text-body backdrop:bg-black/50"
>
  <div class="border-b border-border px-5 py-3">
    <h2 class="text-sm font-semibold">{title}</h2>
  </div>
  <div class="px-5 py-4 text-sm">
    {@render children()}
  </div>
  {#if footer}
    <div class="flex justify-end gap-2 border-t border-border px-5 py-3">
      {@render footer()}
    </div>
  {/if}
</dialog>
