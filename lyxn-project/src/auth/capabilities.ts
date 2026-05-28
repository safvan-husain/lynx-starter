import type { UserRole } from '../spacetimedb/module_bindings/types';
import type { AppRole } from './types';

/**
 * Client-side capability projection for UI only — not authority.
 * Enforcement lives in spacetimedb-counter:
 * - `identity::require_role` — authoritative role checks
 * - `counter::{increment,decrement,reset}_counter` — reducer allow-lists
 * Keep these flags aligned with module rules; drift only affects UX, not security.
 */

export type Capabilities = {
  canMutateCounter: boolean;
  canResetCounter: boolean;
  roleLabel: string;
};

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

/**
 * UI projection of module role rules:
 * - canMutateCounter ↔ increment_counter / decrement_counter → Teacher | Admin
 * - canResetCounter ↔ reset_counter → Admin
 */
export function getCapabilities(role: AppRole): Capabilities {
  return {
    canMutateCounter: role === 'teacher' || role === 'admin',
    canResetCounter: role === 'admin',
    roleLabel: roleLabelFor(role),
  };
}

function roleLabelFor(role: AppRole): string {
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
