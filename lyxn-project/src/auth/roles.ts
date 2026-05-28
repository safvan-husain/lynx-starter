import type { UserRole } from '../spacetimedb/module_bindings/types';
import type { AppRole } from './types';

export function roleFromUserRole(role: UserRole): AppRole {
  switch (role.tag) {
    case 'Admin':
      return 'admin';
    case 'Teacher':
      return 'teacher';
    case 'Parent':
      return 'parent';
    default:
      return 'student';
  }
}

export function userRoleFromAppRole(role: AppRole): UserRole {
  switch (role) {
    case 'admin':
      return { tag: 'Admin' };
    case 'teacher':
      return { tag: 'Teacher' };
    case 'parent':
      return { tag: 'Parent' };
    default:
      return { tag: 'Student' };
  }
}

export function canMutateCounter(role: AppRole): boolean {
  return role === 'teacher' || role === 'admin';
}

export function canResetCounter(role: AppRole): boolean {
  return role === 'admin';
}

export function roleLabel(role: AppRole): string {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'teacher':
      return 'Teacher';
    case 'parent':
      return 'Parent';
    default:
      return 'Student';
  }
}
