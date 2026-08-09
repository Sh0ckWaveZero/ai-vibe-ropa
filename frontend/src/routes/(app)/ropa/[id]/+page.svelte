<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { getLocaleContext } from '$lib/i18n';
  import { apiFetch, ApiError } from '$lib/api/client';
  import { STATUS_COLORS } from '$lib/constants/status';
  import RopaForm, { type RopaFormValue, toRopaFormValue } from '$lib/components/ropa/RopaForm.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import Textarea from '$lib/components/ui/Textarea.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  const { t, locale } = getLocaleContext();

  interface Department {
    id: string;
    code: string;
    nameTh: string;
    nameEn: string;
    nameZh: string;
  }

  interface Attachment {
    id: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: string;
    uploadedBy: { id: string; fullName: string } | null;
  }

  interface RopaRecord {
    id: string;
    referenceNo: string;
    status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
    departmentId: string;
    activityName: string;
    purpose: string;
    legalBasis: string;
    controllerName: string;
    jointController: string | null;
    dataSubjectCategories: string[];
    dataCategories: string[];
    sensitiveDataCategories: string[];
    collectionSource: string;
    recipients: string[];
    hasCrossBorderTransfer: boolean;
    crossBorderDestination: string | null;
    crossBorderSafeguards: string | null;
    retentionPeriod: string;
    disposalMethod: string;
    securityMeasures: string;
    dpoContact: string | null;
    remarks: string | null;
    rejectionReason: string | null;
    createdAt: string;
    submittedAt: string | null;
    approvedAt: string | null;
    department: Department;
    createdBy: { id: string; fullName: string };
    updatedBy: { id: string; fullName: string } | null;
    approvedBy: { id: string; fullName: string } | null;
  }

  const recordId = page.params.id;
  const perms = data.user.permissions;

  let record = $state<RopaRecord | null>(null);
  let departments = $state<Department[]>([]);
  let loading = $state(true);
  let notFound = $state(false);
  let editing = $state(false);
  let saving = $state(false);
  let errorMessage = $state('');
  let form = $state<RopaFormValue | null>(null);

  let submitDialog = $state(false);
  let approveDialog = $state(false);
  let rejectDialog = $state(false);
  let deleteDialog = $state(false);
  let rejectionReason = $state('');
  let actionLoading = $state(false);

  let attachments = $state<Attachment[]>([]);
  let attachmentsLoading = $state(true);
  let uploading = $state(false);
  let uploadError = $state('');
  let deleteAttachmentDialog = $state(false);
  let deleteAttachmentTarget = $state<Attachment | null>(null);
  let fileInputEl = $state<HTMLInputElement | null>(null);

  function toForm(r: RopaRecord): RopaFormValue {
    return toRopaFormValue(r);
  }

  function nullableOrNull(value: string): string | null {
    return value.trim() === '' ? null : value;
  }

  async function loadRecord() {
    loading = true;
    try {
      const res = await apiFetch<{ record: RopaRecord }>(`/ropa/${recordId}`);
      record = res.record;
      form = toForm(res.record);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) notFound = true;
      else errorMessage = err instanceof ApiError ? err.message : $t('common.error');
    } finally {
      loading = false;
    }
  }

  async function loadAttachments() {
    attachmentsLoading = true;
    try {
      const res = await apiFetch<{ attachments: Attachment[] }>(`/ropa/${recordId}/attachments`);
      attachments = res.attachments;
    } finally {
      attachmentsLoading = false;
    }
  }

  onMount(async () => {
    const [, deptRes] = await Promise.all([
      loadRecord(),
      apiFetch<{ departments: Department[] }>('/departments'),
      loadAttachments(),
    ]);
    departments = deptRes.departments;
  });

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function onFileSelected(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    uploading = true;
    uploadError = '';
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiFetch<{ attachment: Attachment }>(`/ropa/${recordId}/attachments`, {
        method: 'POST',
        body: formData,
      });
      attachments = [res.attachment, ...attachments];
    } catch (err) {
      uploadError = err instanceof ApiError ? err.message : $t('common.error');
    } finally {
      uploading = false;
      input.value = '';
    }
  }

  function openDeleteAttachment(a: Attachment) {
    deleteAttachmentTarget = a;
    deleteAttachmentDialog = true;
  }

  async function confirmDeleteAttachment() {
    if (!deleteAttachmentTarget) return;
    const target = deleteAttachmentTarget;
    actionLoading = true;
    try {
      await apiFetch(`/ropa/${recordId}/attachments/${target.id}`, { method: 'DELETE' });
      attachments = attachments.filter((a) => a.id !== target.id);
      deleteAttachmentDialog = false;
    } finally {
      actionLoading = false;
    }
  }

  const canUpdateAll = perms.includes('ropa.update_all');
  const canUpdateOwn = perms.includes('ropa.update_own');
  const canSubmit = perms.includes('ropa.submit');
  const canApprove = perms.includes('ropa.approve');
  const canDelete = perms.includes('ropa.delete');
  const canCreate = perms.includes('ropa.create');

  const isEditable = $derived.by(() => {
    if (!record) return false;
    if (canUpdateAll) return true;
    if (!canUpdateOwn) return false;
    if (record.departmentId !== data.user.departmentId) return false;
    return record.status === 'DRAFT' || record.status === 'REJECTED';
  });

  const canSubmitRecord = $derived.by(() => {
    if (!record || !canSubmit) return false;
    if (!canUpdateAll && record.departmentId !== data.user.departmentId) return false;
    return record.status === 'DRAFT' || record.status === 'REJECTED';
  });

  const canDeleteRecord = $derived.by(() => {
    if (!record || !canDelete) return false;
    return record.status === 'DRAFT' || record.status === 'REJECTED';
  });

  const canReview = $derived(record?.status === 'SUBMITTED' && canApprove);

  function deptName(d: Department) {
    return $locale === 'th' ? d.nameTh : $locale === 'zh' ? d.nameZh : d.nameEn;
  }

  function userName(u: { fullName: string } | null) {
    return u ? u.fullName : '-';
  }

  async function onSaveEdit() {
    if (!form) return;
    saving = true;
    errorMessage = '';
    try {
      const res = await apiFetch<{ record: RopaRecord }>(`/ropa/${recordId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...form,
          jointController: nullableOrNull(form.jointController),
          crossBorderDestination: nullableOrNull(form.crossBorderDestination),
          crossBorderSafeguards: nullableOrNull(form.crossBorderSafeguards),
          dpoContact: nullableOrNull(form.dpoContact),
          remarks: nullableOrNull(form.remarks),
        }),
      });
      record = res.record;
      form = toForm(res.record);
      editing = false;
    } catch (err) {
      errorMessage = err instanceof ApiError ? err.message : $t('common.error');
    } finally {
      saving = false;
    }
  }

  function cancelEdit() {
    if (record) form = toForm(record);
    editing = false;
  }

  async function doSubmit() {
    actionLoading = true;
    try {
      const res = await apiFetch<{ record: RopaRecord }>(`/ropa/${recordId}/submit`, { method: 'POST' });
      record = res.record;
      form = toForm(res.record);
      submitDialog = false;
    } finally {
      actionLoading = false;
    }
  }

  async function doApprove() {
    actionLoading = true;
    try {
      const res = await apiFetch<{ record: RopaRecord }>(`/ropa/${recordId}/review`, {
        method: 'POST',
        body: JSON.stringify({ decision: 'approve' }),
      });
      record = res.record;
      form = toForm(res.record);
      approveDialog = false;
    } finally {
      actionLoading = false;
    }
  }

  async function doReject() {
    if (!rejectionReason.trim()) return;
    actionLoading = true;
    try {
      const res = await apiFetch<{ record: RopaRecord }>(`/ropa/${recordId}/review`, {
        method: 'POST',
        body: JSON.stringify({ decision: 'reject', rejectionReason }),
      });
      record = res.record;
      form = toForm(res.record);
      rejectDialog = false;
      rejectionReason = '';
    } finally {
      actionLoading = false;
    }
  }

  async function doDelete() {
    actionLoading = true;
    try {
      await apiFetch(`/ropa/${recordId}`, { method: 'DELETE' });
      await goto('/ropa');
    } finally {
      actionLoading = false;
    }
  }
</script>

{#if loading}
  <p class="text-sm text-muted">{$t('common.loading')}</p>
{:else if notFound}
  <p class="text-sm text-muted">{$t('common.noData')}</p>
{:else if record && form}
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-lg font-semibold text-body">{record.referenceNo}</h1>
          <Badge label={$t(`status.${record.status}`)} dot={STATUS_COLORS[record.status]} />
        </div>
        <p class="text-sm text-muted">{deptName(record.department)}</p>
      </div>

      <div class="flex flex-wrap gap-2">
        {#if editing}
          <Button variant="secondary" onclick={cancelEdit}>{$t('common.cancel')}</Button>
          <Button onclick={onSaveEdit} loading={saving}>{$t('common.save')}</Button>
        {:else}
          <Button variant="secondary" onclick={() => goto('/ropa')}>{$t('common.back')}</Button>
          {#if canCreate}
            <Button variant="secondary" onclick={() => goto(`/ropa/new?cloneFrom=${recordId}`)}>
              {$t('ropa.cloneRecord')}
            </Button>
          {/if}
          {#if isEditable}
            <Button variant="secondary" onclick={() => (editing = true)}>{$t('common.edit')}</Button>
          {/if}
          {#if canDeleteRecord}
            <Button variant="danger" onclick={() => (deleteDialog = true)}>{$t('common.delete')}</Button>
          {/if}
          {#if canSubmitRecord}
            <Button onclick={() => (submitDialog = true)}>{$t('ropa.submitForApproval')}</Button>
          {/if}
          {#if canReview}
            <Button variant="danger" onclick={() => (rejectDialog = true)}>{$t('ropa.reject')}</Button>
            <Button onclick={() => (approveDialog = true)}>{$t('ropa.approve')}</Button>
          {/if}
        {/if}
      </div>
    </div>

    {#if errorMessage}
      <p class="text-sm text-red-600">{errorMessage}</p>
    {/if}

    {#if record.status === 'REJECTED' && record.rejectionReason}
      <Card>
        <p class="text-sm font-medium text-red-600">{$t('ropa.rejectionReason')}</p>
        <p class="mt-1 text-sm text-body">{record.rejectionReason}</p>
      </Card>
    {/if}

    <Card>
      <div class="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <div>
          <p class="text-xs text-muted">{$t('ropa.createdBy')}</p>
          <p class="text-body">{userName(record.createdBy)}</p>
        </div>
        <div>
          <p class="text-xs text-muted">{$t('ropa.updatedBy')}</p>
          <p class="text-body">{userName(record.updatedBy)}</p>
        </div>
        <div>
          <p class="text-xs text-muted">{$t('ropa.submittedAt')}</p>
          <p class="text-body">{record.submittedAt ? new Date(record.submittedAt).toLocaleString() : '-'}</p>
        </div>
        <div>
          <p class="text-xs text-muted">{$t('ropa.approvedBy')}</p>
          <p class="text-body">{userName(record.approvedBy)}</p>
        </div>
      </div>
    </Card>

    <Card title={$t('ropa.attachmentsTitle')}>
      {#snippet actions()}
        {#if isEditable}
          <div class="flex items-center gap-2">
            <input
              bind:this={fileInputEl}
              type="file"
              class="hidden"
              onchange={onFileSelected}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg"
            />
            <Button variant="secondary" loading={uploading} onclick={() => fileInputEl?.click()}>
              {uploading ? $t('ropa.attachmentUploading') : $t('ropa.attachmentUpload')}
            </Button>
          </div>
        {/if}
      {/snippet}

      {#if isEditable}
        <p class="mb-3 text-xs text-muted">{$t('ropa.attachmentAllowedTypes', { size: 10 })}</p>
      {/if}

      {#if uploadError}
        <p class="mb-3 text-sm text-red-600">{uploadError}</p>
      {/if}

      {#if attachmentsLoading}
        <p class="text-sm text-muted">{$t('common.loading')}</p>
      {:else if attachments.length === 0}
        <p class="text-sm text-muted">{$t('ropa.attachmentNone')}</p>
      {:else}
        <ul class="flex flex-col gap-2">
          {#each attachments as a (a.id)}
            <li class="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
              <div class="min-w-0 flex-1">
                <a
                  href={`/api/ropa/${recordId}/attachments/${a.id}/download`}
                  class="truncate font-medium text-primary hover:underline"
                >
                  {a.fileName}
                </a>
                <p class="text-xs text-muted">
                  {formatFileSize(a.sizeBytes)} · {$t('ropa.attachmentUploadedBy')} {a.uploadedBy?.fullName ?? '-'} ·
                  {new Date(a.createdAt).toLocaleString()}
                </p>
              </div>
              {#if isEditable}
                <button
                  type="button"
                  class="shrink-0 text-red-600 hover:underline"
                  onclick={() => openDeleteAttachment(a)}
                >
                  {$t('common.delete')}
                </button>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </Card>

    <RopaForm bind:value={form} {departments} disabled={!editing} lockDepartment={!canUpdateAll} />
  </div>

  <Dialog bind:open={submitDialog} title={$t('ropa.confirmSubmitTitle')}>
    <p class="text-muted">{$t('ropa.confirmSubmitBody')}</p>
    {#snippet footer()}
      <Button variant="secondary" onclick={() => (submitDialog = false)}>{$t('common.cancel')}</Button>
      <Button loading={actionLoading} onclick={doSubmit}>{$t('ropa.submitForApproval')}</Button>
    {/snippet}
  </Dialog>

  <Dialog bind:open={approveDialog} title={$t('ropa.confirmApproveTitle')}>
    <p class="text-muted">{$t('ropa.confirmApproveBody')}</p>
    {#snippet footer()}
      <Button variant="secondary" onclick={() => (approveDialog = false)}>{$t('common.cancel')}</Button>
      <Button loading={actionLoading} onclick={doApprove}>{$t('ropa.approve')}</Button>
    {/snippet}
  </Dialog>

  <Dialog bind:open={rejectDialog} title={$t('ropa.confirmRejectTitle')}>
    <Textarea label={$t('ropa.rejectionReason')} bind:value={rejectionReason} required />
    {#if !rejectionReason.trim()}
      <p class="mt-1 text-xs text-muted">{$t('ropa.rejectionReasonRequired')}</p>
    {/if}
    {#snippet footer()}
      <Button variant="secondary" onclick={() => (rejectDialog = false)}>{$t('common.cancel')}</Button>
      <Button variant="danger" loading={actionLoading} disabled={!rejectionReason.trim()} onclick={doReject}>
        {$t('ropa.reject')}
      </Button>
    {/snippet}
  </Dialog>

  <Dialog bind:open={deleteDialog} title={$t('common.confirmDeleteTitle')}>
    <p class="text-muted">{$t('common.confirmDeleteBody')}</p>
    {#snippet footer()}
      <Button variant="secondary" onclick={() => (deleteDialog = false)}>{$t('common.cancel')}</Button>
      <Button variant="danger" loading={actionLoading} onclick={doDelete}>{$t('common.delete')}</Button>
    {/snippet}
  </Dialog>

  <Dialog bind:open={deleteAttachmentDialog} title={$t('common.confirmDeleteTitle')}>
    <p class="text-muted">{$t('ropa.attachmentDeleteConfirm')}</p>
    {#snippet footer()}
      <Button variant="secondary" onclick={() => (deleteAttachmentDialog = false)}>{$t('common.cancel')}</Button>
      <Button variant="danger" loading={actionLoading} onclick={confirmDeleteAttachment}>{$t('common.delete')}</Button>
    {/snippet}
  </Dialog>
{/if}
