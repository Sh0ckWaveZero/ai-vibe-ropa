<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { getLocaleContext } from '$lib/i18n';
  import { apiFetch } from '$lib/api/client';

  const { t } = getLocaleContext();

  interface NotificationItem {
    id: string;
    type: string;
    entityType: string;
    entityId: string | null;
    metadata: { referenceNo?: string; rejectionReason?: string } | null;
    isRead: boolean;
    createdAt: string;
  }

  let open = $state(false);
  let unreadCount = $state(0);
  let notifications = $state<NotificationItem[]>([]);
  let loading = $state(false);

  async function loadUnreadCount() {
    const res = await apiFetch<{ count: number }>('/notifications/unread-count');
    unreadCount = res.count;
  }

  async function loadNotifications() {
    loading = true;
    try {
      const res = await apiFetch<{ notifications: NotificationItem[] }>('/notifications?pageSize=10');
      notifications = res.notifications;
    } finally {
      loading = false;
    }
  }

  function toggleOpen() {
    open = !open;
    if (open) loadNotifications();
  }

  function messageFor(n: NotificationItem): string {
    const referenceNo = n.metadata?.referenceNo ?? '';
    if (n.type === 'ropa.submitted') return $t('notifications.submitted', { referenceNo });
    if (n.type === 'ropa.approved') return $t('notifications.approved', { referenceNo });
    if (n.type === 'ropa.rejected') {
      return n.metadata?.rejectionReason
        ? $t('notifications.rejectedWithReason', { referenceNo, rejectionReason: n.metadata.rejectionReason })
        : $t('notifications.rejected', { referenceNo });
    }
    return n.type;
  }

  async function onNotificationClick(n: NotificationItem) {
    open = false;
    if (!n.isRead) {
      n.isRead = true;
      unreadCount = Math.max(0, unreadCount - 1);
      apiFetch(`/notifications/${n.id}/read`, { method: 'POST' }).catch(() => {});
    }
    if (n.entityType === 'RopaRecord' && n.entityId) {
      await goto(`/ropa/${n.entityId}`);
    }
  }

  async function markAllRead() {
    notifications = notifications.map((n) => ({ ...n, isRead: true }));
    unreadCount = 0;
    await apiFetch('/notifications/read-all', { method: 'POST' });
  }

  let pollInterval: ReturnType<typeof setInterval>;
  onMount(() => {
    loadUnreadCount();
    pollInterval = setInterval(loadUnreadCount, 30_000);
  });
  onDestroy(() => clearInterval(pollInterval));
</script>

<div class="relative">
  <button
    onclick={toggleOpen}
    class="relative rounded-md p-2 text-body hover:bg-surface-muted"
    aria-label={$t('notifications.title')}
    title={$t('notifications.title')}
  >
    <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2">
      <path
        d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
    {#if unreadCount > 0}
      <span
        class="absolute right-0 top-0 flex size-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-semibold text-white"
      >
        {unreadCount > 9 ? '9+' : unreadCount}
      </span>
    {/if}
  </button>

  {#if open}
    <button class="fixed inset-0 z-40 cursor-default" aria-label="Close notifications" onclick={() => (open = false)}
    ></button>
    <div class="absolute right-0 z-50 mt-2 w-80 rounded-md border border-border bg-surface-raised shadow-lg">
      <div class="flex items-center justify-between border-b border-border px-3 py-2">
        <h3 class="text-sm font-semibold text-body">{$t('notifications.title')}</h3>
        {#if notifications.some((n) => !n.isRead)}
          <button class="text-xs text-primary hover:underline" onclick={markAllRead}>
            {$t('notifications.markAllRead')}
          </button>
        {/if}
      </div>
      <div class="max-h-80 overflow-y-auto">
        {#if loading}
          <p class="p-3 text-sm text-muted">{$t('common.loading')}</p>
        {:else if notifications.length === 0}
          <p class="p-3 text-sm text-muted">{$t('notifications.empty')}</p>
        {:else}
          {#each notifications as n (n.id)}
            <button
              class="block w-full border-b border-border px-3 py-2 text-left text-sm last:border-0 hover:bg-surface-muted {n.isRead
                ? ''
                : 'bg-primary/5'}"
              onclick={() => onNotificationClick(n)}
            >
              <p class="text-body {n.isRead ? '' : 'font-medium'}">{messageFor(n)}</p>
              <p class="text-xs text-muted">{new Date(n.createdAt).toLocaleString()}</p>
            </button>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</div>
