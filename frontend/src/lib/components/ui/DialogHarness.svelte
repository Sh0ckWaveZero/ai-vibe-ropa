<script lang="ts">
  import Button from './Button.svelte';
  import Dialog from './Dialog.svelte';

  let open = $state(false);
  let menuOpen = $state(false);
  let menuTrigger: HTMLButtonElement | undefined = $state();
</script>

<button bind:this={menuTrigger} type="button" onclick={() => (menuOpen = true)}>User menu</button>
{#if menuOpen}
  <button
    type="button"
    onclick={() => {
      menuOpen = false;
      open = true;
    }}>Open logout dialog</button
  >
{/if}

<Dialog bind:open title="Confirm logout" restoreFocusTo={menuTrigger}>
  <p>Are you sure you want to log out?</p>
  {#snippet footer()}
    <Button variant="secondary" autofocus onclick={() => (open = false)}>Cancel</Button>
    <Button variant="danger">Log out</Button>
  {/snippet}
</Dialog>
