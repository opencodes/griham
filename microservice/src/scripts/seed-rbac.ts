import { v4 as uuidv4 } from 'uuid';
import { connectMongo, getConnection } from '../db/connection.js';
import { RoleModel } from '../db/schemas/Role.js';
import { PermissionModel } from '../db/schemas/Permission.js';
import { RolePermissionModel } from '../db/schemas/RolePermission.js';

const roles = [
  { name: 'user', description: 'Default user role' },
  { name: 'admin', description: 'Administrator role' },
  { name: 'root', description: 'Super admin role' },
];

const permissions = [
  { resource: 'families', action: 'read' },
  { resource: 'families', action: 'write' },
  { resource: 'finance', action: 'read' },
  { resource: 'finance', action: 'write' },
  { resource: 'admin', action: 'read' },
  { resource: 'admin', action: 'write' },
];

async function upsertRole(name: string, description: string | null): Promise<string> {
  const existing = await RoleModel.findOne({ name }).lean({ virtuals: true });
  if (existing) {
    return existing._id;
  }
  const _id = uuidv4();
  await RoleModel.create({ _id, name, description });
  return _id;
}

async function upsertPermission(resource: string, action: string): Promise<string> {
  const name = `${resource}:${action}`;
  const existing = await PermissionModel.findOne({ name }).lean({ virtuals: true });
  if (existing) {
    return existing._id;
  }
  const _id = uuidv4();
  await PermissionModel.create({
    _id,
    name,
    resource,
    action,
    description: null,
  });
  return _id;
}

async function linkRolePermission(roleId: string, permissionId: string): Promise<void> {
  const existing = await RolePermissionModel.findOne({ role_id: roleId, permission_id: permissionId }).lean({ virtuals: true });
  if (existing) {
    return;
  }
  await RolePermissionModel.create({ role_id: roleId, permission_id: permissionId });
}

async function main(): Promise<void> {
  await connectMongo();

  const roleIds = new Map<string, string>();
  for (const role of roles) {
    const id = await upsertRole(role.name, role.description ?? null);
    roleIds.set(role.name, id);
  }

  const permissionIds: string[] = [];
  for (const perm of permissions) {
    const id = await upsertPermission(perm.resource, perm.action);
    permissionIds.push(id);
  }

  const userPerms = permissionIds.filter((id, idx) => permissions[idx].resource !== 'admin');
  const adminPerms = permissionIds;
  const rootPerms = permissionIds;

  for (const permId of userPerms) {
    await linkRolePermission(roleIds.get('user') as string, permId);
  }

  for (const permId of adminPerms) {
    await linkRolePermission(roleIds.get('admin') as string, permId);
  }

  for (const permId of rootPerms) {
    await linkRolePermission(roleIds.get('root') as string, permId);
  }

  await getConnection().close();
  console.log('RBAC seed complete');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
