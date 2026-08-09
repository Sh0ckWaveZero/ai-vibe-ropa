<script module lang="ts">
  export interface RopaFormValue {
    departmentId: string;
    activityName: string;
    purpose: string;
    legalBasis: string;
    controllerName: string;
    jointController: string;
    dataSubjectCategories: string[];
    dataCategories: string[];
    sensitiveDataCategories: string[];
    collectionSource: string;
    recipients: string[];
    hasCrossBorderTransfer: boolean;
    crossBorderDestination: string;
    crossBorderSafeguards: string;
    retentionPeriod: string;
    disposalMethod: string;
    securityMeasures: string;
    dpoContact: string;
    remarks: string;
  }

  /** Shared by the detail page (populating the edit form) and the "duplicate as new" flow. */
  export function toRopaFormValue(r: {
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
  }): RopaFormValue {
    return {
      departmentId: r.departmentId,
      activityName: r.activityName,
      purpose: r.purpose,
      legalBasis: r.legalBasis,
      controllerName: r.controllerName,
      jointController: r.jointController ?? '',
      dataSubjectCategories: r.dataSubjectCategories,
      dataCategories: r.dataCategories,
      sensitiveDataCategories: r.sensitiveDataCategories,
      collectionSource: r.collectionSource,
      recipients: r.recipients,
      hasCrossBorderTransfer: r.hasCrossBorderTransfer,
      crossBorderDestination: r.crossBorderDestination ?? '',
      crossBorderSafeguards: r.crossBorderSafeguards ?? '',
      retentionPeriod: r.retentionPeriod,
      disposalMethod: r.disposalMethod,
      securityMeasures: r.securityMeasures,
      dpoContact: r.dpoContact ?? '',
      remarks: r.remarks ?? '',
    };
  }
</script>

<script lang="ts">
  import { getLocaleContext } from '$lib/i18n';
  import Input from '$lib/components/ui/Input.svelte';
  import Textarea from '$lib/components/ui/Textarea.svelte';
  import Select from '$lib/components/ui/Select.svelte';
  import Checkbox from '$lib/components/ui/Checkbox.svelte';
  import TagInput from '$lib/components/ui/TagInput.svelte';
  import Card from '$lib/components/ui/Card.svelte';

  interface Department {
    id: string;
    code: string;
    nameTh: string;
    nameEn: string;
    nameZh: string;
  }

  let {
    value = $bindable(),
    departments,
    disabled = false,
    lockDepartment = false,
  }: {
    value: RopaFormValue;
    departments: Department[];
    disabled?: boolean;
    lockDepartment?: boolean;
  } = $props();

  const { t, locale } = getLocaleContext();

  function deptName(d: Department) {
    return $locale === 'th' ? d.nameTh : $locale === 'zh' ? d.nameZh : d.nameEn;
  }

  const lockedDeptName = $derived(departments.find((d) => d.id === value.departmentId));
</script>

<div class="flex flex-col gap-6">
  <Card title={$t('ropa.activityName')}>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div class="flex flex-col gap-1">
        {#if lockDepartment}
          <span class="text-sm font-medium text-body">{$t('ropa.department')}</span>
          <p class="rounded-md border border-border bg-surface-muted px-3 py-2 text-sm text-body">
            {lockedDeptName ? deptName(lockedDeptName) : '-'}
          </p>
        {:else}
          <Select bind:value={value.departmentId} {disabled} label={$t('ropa.department')}>
            <option value="" disabled>{$t('common.all')}</option>
            {#each departments as d (d.id)}
              <option value={d.id}>{deptName(d)}</option>
            {/each}
          </Select>
        {/if}
      </div>
      <Input label={$t('ropa.activityName')} bind:value={value.activityName} {disabled} required />
    </div>
    <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Textarea label={$t('ropa.purpose')} bind:value={value.purpose} {disabled} required />
      <Textarea label={$t('ropa.legalBasis')} bind:value={value.legalBasis} {disabled} required />
    </div>
    <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Input label={$t('ropa.controllerName')} bind:value={value.controllerName} {disabled} required />
      <Input
        label="{$t('ropa.jointController')} ({$t('common.optional')})"
        bind:value={value.jointController}
        {disabled}
      />
    </div>
  </Card>

  <Card title={$t('ropa.dataCategories')}>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <TagInput
        label={$t('ropa.dataSubjectCategories')}
        bind:values={value.dataSubjectCategories}
        hint={$t('ropa.tagsHint')}
        {disabled}
      />
      <TagInput
        label={$t('ropa.dataCategories')}
        bind:values={value.dataCategories}
        hint={$t('ropa.tagsHint')}
        {disabled}
      />
      <TagInput
        label="{$t('ropa.sensitiveDataCategories')} ({$t('common.optional')})"
        bind:values={value.sensitiveDataCategories}
        hint={$t('ropa.tagsHint')}
        {disabled}
      />
      <TagInput
        label={$t('ropa.recipients')}
        bind:values={value.recipients}
        hint={$t('ropa.tagsHint')}
        {disabled}
      />
    </div>
    <div class="mt-4">
      <Input label={$t('ropa.collectionSource')} bind:value={value.collectionSource} {disabled} required />
    </div>
  </Card>

  <Card title={$t('ropa.crossBorderTransfer')}>
    <Checkbox
      bind:checked={value.hasCrossBorderTransfer}
      label={$t('ropa.crossBorderTransfer')}
      disabled={disabled}
    />
    {#if value.hasCrossBorderTransfer}
      <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label={$t('ropa.crossBorderDestination')} bind:value={value.crossBorderDestination} {disabled} />
        <Input label={$t('ropa.crossBorderSafeguards')} bind:value={value.crossBorderSafeguards} {disabled} />
      </div>
    {/if}
  </Card>

  <Card title={$t('ropa.retentionPeriod')}>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Input label={$t('ropa.retentionPeriod')} bind:value={value.retentionPeriod} {disabled} required />
      <Input label={$t('ropa.disposalMethod')} bind:value={value.disposalMethod} {disabled} required />
    </div>
    <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Textarea label={$t('ropa.securityMeasures')} bind:value={value.securityMeasures} {disabled} required />
      <Input
        label="{$t('ropa.dpoContact')} ({$t('common.optional')})"
        bind:value={value.dpoContact}
        {disabled}
      />
    </div>
    <div class="mt-4">
      <Textarea
        label="{$t('ropa.remarks')} ({$t('common.optional')})"
        bind:value={value.remarks}
        {disabled}
      />
    </div>
  </Card>
</div>
