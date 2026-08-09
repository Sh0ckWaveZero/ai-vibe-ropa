<script lang="ts">
  import { createLocaleContext } from '$lib/i18n';
  import Button from './Button.svelte';
  import Checkbox from './Checkbox.svelte';
  import Input from './Input.svelte';
  import Pagination from './Pagination.svelte';
  import Select from './Select.svelte';
  import TagInput from './TagInput.svelte';
  import Textarea from './Textarea.svelte';

  createLocaleContext(() => 'en');

  let email = $state('');
  let department = $state('');
  let notes = $state('');
  let tags = $state<string[]>([]);
  let active = $state(false);
</script>

<Input id="email" label="Email" bind:value={email} hint="Use your work email" error="Email is required" />
<Select id="department" label="Department" bind:value={department} hint="Choose one department">
  <option value="">Choose</option>
</Select>
<Textarea id="notes" label="Notes" bind:value={notes} hint="Optional context" />
<TagInput id="tags" label="Recipients" bind:values={tags} hint="Press Enter to add" />
<Checkbox id="permission" bind:checked={active} aria-label="Read users" />
<Button>Default action</Button>
<Pagination page={1} pageSize={10} total={25} onChange={() => {}} />
