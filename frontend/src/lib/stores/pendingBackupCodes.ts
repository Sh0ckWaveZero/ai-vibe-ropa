import { writable } from 'svelte/store';

// In-memory only, never persisted to localStorage/cookies — the codes are
// shown once right after 2FA setup and must not survive a page reload.
export const pendingBackupCodes = writable<string[] | null>(null);
