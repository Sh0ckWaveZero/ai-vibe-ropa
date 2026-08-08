<script lang="ts">
  import Dialog from './Dialog.svelte';

  let open = $state(false);
</script>

<Dialog bind:open title="Confirm logout">
  <p>Are you sure you want to log out?</p>
</Dialog>
