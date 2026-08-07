import type { Locale } from '$lib/i18n';

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  roleCode: string;
  roleNameTh: string;
  roleNameEn: string;
  roleNameZh: string;
  departmentId: string | null;
  departmentNameTh: string | null;
  departmentNameEn: string | null;
  departmentNameZh: string | null;
  localePref: Locale;
  totpEnabled: boolean;
  permissions: string[];
}

declare global {
  namespace App {
    interface Locals {
      user: SessionUser | null;
    }
    interface PageData {
      user?: SessionUser | null;
      locale?: Locale;
      theme?: 'light' | 'dark';
    }
  }
}

export {};
