import type { PermissionCode } from '../constants/permissions.js';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  roleId: string;
  roleCode: string;
  departmentId: string | null;
  localePref: string;
  permissions: PermissionCode[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
