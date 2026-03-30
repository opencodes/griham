import type { User } from '@/lib/api';

const moduleResourceMap: Record<string, string[]> = {
  family: ['family'],
  finance: ['finance'],
  events: ['events'],
  assets: ['assets'],
  health: ['health'],
  contacts: ['contacts'],
  organizer: ['organizer'],
  messages: ['messages'],
};

export function hasPermission(user: User | null, resource: string, action: string): boolean {
  if (!user) return false;
  if (user.role === 'root') return true;
  const perms = user.rbac_permissions ?? [];
  return perms.some((p) => {
    if (p.resource === resource && p.action === action) return true;
    if (p.resource === `${resource}.${action}`) return true;
    if (p.resource.startsWith(`${resource}.`) && p.action === action) return true;
    return false;
  });
}

export function canAccessModule(user: User | null, moduleKey: string): boolean {
  if (!user) return false;
  if (user.role === 'root') return true;
  const prefixes = moduleResourceMap[moduleKey] ?? [moduleKey];
  const perms = user.rbac_permissions ?? [];
  return perms.some((p) => prefixes.some((prefix) => p.resource === prefix || p.resource.startsWith(`${prefix}.`)));
}

export function isAdminUser(user: User | null): boolean {
  if (!user) return false;
  return (
    user.role === 'admin'
    || user.rbac_role_name === 'admin'
    || user.rbac_roles?.some((role) => role.name === 'admin') === true
    || user.rbac_role?.name === 'admin'
  );
}
