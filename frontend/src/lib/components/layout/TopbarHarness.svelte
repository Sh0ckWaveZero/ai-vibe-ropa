<script lang="ts">
  import { createLocaleContext } from '$lib/i18n';
  import Topbar from './Topbar.svelte';

  createLocaleContext(() => 'en');

  const user = {
    id: 'user-1',
    email: 'ada@example.com',
    fullName: 'Ada Lovelace',
    roleCode: 'ADMIN',
    roleNameTh: 'ผู้ดูแลระบบ',
    roleNameEn: 'Administrator',
    roleNameZh: '管理员',
    departmentId: 'department-1',
    departmentNameTh: 'เทคโนโลยี',
    departmentNameEn: 'Technology',
    departmentNameZh: '技术',
    localePref: 'en' as const,
    totpEnabled: true,
    permissions: [],
  };
</script>

<Topbar {user} mobileMenuOpen={false} onMenuClick={() => {}} />
<button type="button">After topbar</button>
