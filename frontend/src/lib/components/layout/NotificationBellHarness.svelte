<script lang="ts">
  import { createLocaleContext } from '$lib/i18n';
  import NotificationBell from './NotificationBell.svelte';

  createLocaleContext(() => 'en');
</script>

<NotificationBell id="test-notifications" />
