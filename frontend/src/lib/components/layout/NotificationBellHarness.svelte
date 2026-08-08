<script lang="ts">
  import { createLocaleContext } from '$lib/i18n';
  import NotificationBell from './NotificationBell.svelte';

  createLocaleContext(() => 'en');
</script>

<button type="button">Before notifications</button>
<NotificationBell id="test-notifications" />
<button type="button">After notifications</button>
