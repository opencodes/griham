/**
 * Seed RBAC permissions, roles, role-permission links, groups, and group-role links
 * for all modules. Mirrors backend/database/migrations/012_seed_rbac_all_modules.sql.
 * Cleans seeded data first, then inserts fresh (no duplicates).
 *
 * Run: npm run seed:rbac
 */

import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { config } from '../../config/index.js';
import { RoleModel } from '../db/schemas/Role.js';
import { PermissionModel } from '../db/schemas/Permission.js';
import { RolePermissionModel } from '../db/schemas/RolePermission.js';
import { GroupModel } from '../db/schemas/Group.js';
import { GroupRoleModel } from '../db/schemas/GroupRole.js';
import { UserModel } from '../db/schemas/User.js';
import { UserRoleModel } from '../db/schemas/UserRole.js';

dotenv.config();

const SALT_ROUNDS = 10;
const ROOT_USER_ID = 'user-root';

const ROLES = [
  { _id: 'role-admin', name: 'Admin', description: 'Full access to all modules' },
  { _id: 'role-finance-manager', name: 'Finance Manager', description: 'Manage finance modules' },
  { _id: 'role-family-manager', name: 'Family Manager', description: 'Manage family module and members' },
  { _id: 'role-events-manager', name: 'Events Manager', description: 'Manage events module' },
  { _id: 'role-assets-manager', name: 'Assets Manager', description: 'Manage assets module' },
  { _id: 'role-health-manager', name: 'Health Manager', description: 'Manage health module' },
  { _id: 'role-contacts-manager', name: 'Contacts Manager', description: 'Manage contacts module' },
  { _id: 'role-organizer-manager', name: 'Organizer Manager', description: 'Manage organizer module' },
  { _id: 'role-messages-manager', name: 'Messages Manager', description: 'Manage messages module' },
  { _id: 'role-viewer', name: 'Viewer', description: 'Read-only access across modules' },
] as const;

const PERMISSIONS_FAMILY = [
  { _id: 'family.create', name: 'family.create', resource: 'family', action: 'create', description: 'Create family' },
  { _id: 'family.read', name: 'family.read', resource: 'family', action: 'read', description: 'View family' },
  { _id: 'family.update', name: 'family.update', resource: 'family', action: 'update', description: 'Update family' },
  { _id: 'family.members.read', name: 'family.members.read', resource: 'family.members', action: 'read', description: 'View family members' },
  { _id: 'family.members.write', name: 'family.members.write', resource: 'family.members', action: 'write', description: 'Manage family members' },
];

const PERMISSIONS_FINANCE = [
  { _id: 'finance.accounts.read', name: 'finance.accounts.read', resource: 'finance.accounts', action: 'read', description: 'View bank accounts' },
  { _id: 'finance.accounts.write', name: 'finance.accounts.write', resource: 'finance.accounts', action: 'write', description: 'Create or edit bank accounts' },
  { _id: 'finance.transactions.read', name: 'finance.transactions.read', resource: 'finance.transactions', action: 'read', description: 'View transactions' },
  { _id: 'finance.transactions.write', name: 'finance.transactions.write', resource: 'finance.transactions', action: 'write', description: 'Create or edit transactions' },
  { _id: 'finance.transactions.delete', name: 'finance.transactions.delete', resource: 'finance.transactions', action: 'delete', description: 'Delete transactions' },
  { _id: 'finance.bills.read', name: 'finance.bills.read', resource: 'finance.bills', action: 'read', description: 'View bills' },
  { _id: 'finance.bills.write', name: 'finance.bills.write', resource: 'finance.bills', action: 'write', description: 'Create or edit bills' },
  { _id: 'finance.bills.delete', name: 'finance.bills.delete', resource: 'finance.bills', action: 'delete', description: 'Delete bills' },
  { _id: 'finance.cards.read', name: 'finance.cards.read', resource: 'finance.cards', action: 'read', description: 'View cards' },
  { _id: 'finance.cards.write', name: 'finance.cards.write', resource: 'finance.cards', action: 'write', description: 'Create or edit cards' },
  { _id: 'finance.cards.delete', name: 'finance.cards.delete', resource: 'finance.cards', action: 'delete', description: 'Delete cards' },
  { _id: 'finance.ai.read', name: 'finance.ai.read', resource: 'finance.ai', action: 'read', description: 'View AI finance insights' },
  { _id: 'finance.ai.write', name: 'finance.ai.write', resource: 'finance.ai', action: 'write', description: 'Submit AI finance parsing requests' },
];

const PERMISSIONS_OTHER = [
  { _id: 'events.read', name: 'events.read', resource: 'events', action: 'read', description: 'View events' },
  { _id: 'events.write', name: 'events.write', resource: 'events', action: 'write', description: 'Manage events' },
  { _id: 'assets.read', name: 'assets.read', resource: 'assets', action: 'read', description: 'View assets' },
  { _id: 'assets.write', name: 'assets.write', resource: 'assets', action: 'write', description: 'Manage assets' },
  { _id: 'health.read', name: 'health.read', resource: 'health', action: 'read', description: 'View health' },
  { _id: 'health.write', name: 'health.write', resource: 'health', action: 'write', description: 'Manage health' },
  { _id: 'contacts.read', name: 'contacts.read', resource: 'contacts', action: 'read', description: 'View contacts' },
  { _id: 'contacts.write', name: 'contacts.write', resource: 'contacts', action: 'write', description: 'Manage contacts' },
  { _id: 'organizer.read', name: 'organizer.read', resource: 'organizer', action: 'read', description: 'View organizer' },
  { _id: 'organizer.write', name: 'organizer.write', resource: 'organizer', action: 'write', description: 'Manage organizer' },
  { _id: 'messages.read', name: 'messages.read', resource: 'messages', action: 'read', description: 'View messages' },
  { _id: 'messages.write', name: 'messages.write', resource: 'messages', action: 'write', description: 'Manage messages' },
];

const ALL_PERMISSIONS = [...PERMISSIONS_FAMILY, ...PERMISSIONS_FINANCE, ...PERMISSIONS_OTHER];

const GROUPS = [
  { _id: 'group-all-members', name: 'All Members', description: 'Default group for read-only access' },
  { _id: 'group-finance-team', name: 'Finance Team', description: 'Users who manage finance' },
  { _id: 'group-family-team', name: 'Family Team', description: 'Users who manage family' },
  { _id: 'group-events-team', name: 'Events Team', description: 'Users who manage events' },
  { _id: 'group-assets-team', name: 'Assets Team', description: 'Users who manage assets' },
  { _id: 'group-health-team', name: 'Health Team', description: 'Users who manage health' },
  { _id: 'group-contacts-team', name: 'Contacts Team', description: 'Users who manage contacts' },
  { _id: 'group-organizer-team', name: 'Organizer Team', description: 'Users who manage organizer' },
  { _id: 'group-messages-team', name: 'Messages Team', description: 'Users who manage messages' },
] as const;

const ROLE_IDS = ROLES.map((r) => r._id);
const PERMISSION_IDS = ALL_PERMISSIONS.map((p) => p._id);
const GROUP_IDS = GROUPS.map((g) => g._id);

async function cleanSeededRbac(): Promise<void> {
  await UserRoleModel.deleteMany({ $or: [{ user_id: ROOT_USER_ID }, { role_id: { $in: ROLE_IDS } }] });
  await GroupRoleModel.deleteMany({ $or: [{ group_id: { $in: GROUP_IDS } }, { role_id: { $in: ROLE_IDS } }] });
  await RolePermissionModel.deleteMany({ role_id: { $in: ROLE_IDS } });
  await GroupModel.deleteMany({ _id: { $in: GROUP_IDS } });
  await PermissionModel.deleteMany({ _id: { $in: PERMISSION_IDS } });
  await RoleModel.deleteMany({ _id: { $in: ROLE_IDS } });
  await UserModel.deleteOne({ _id: ROOT_USER_ID });
  console.log('Cleaned seeded RBAC and root user.');
}

async function seedRoles(): Promise<void> {
  await RoleModel.insertMany(ROLES.map((r) => ({ _id: r._id, name: r.name, description: r.description })));
  console.log('Roles: inserted', ROLES.length);
}

async function seedPermissions(): Promise<void> {
  await PermissionModel.insertMany(
    ALL_PERMISSIONS.map((p) => ({
      _id: p._id,
      name: p.name,
      resource: p.resource,
      action: p.action,
      description: p.description,
    }))
  );
  console.log('Permissions: inserted', ALL_PERMISSIONS.length);
}

function permissionMatchesRole(perm: { resource: string; action: string }, roleName: string): boolean {
  switch (roleName) {
    case 'Admin': return true;
    case 'Finance Manager': return perm.resource.startsWith('finance.');
    case 'Family Manager': return perm.resource.startsWith('family');
    case 'Events Manager': return perm.resource === 'events';
    case 'Assets Manager': return perm.resource === 'assets';
    case 'Health Manager': return perm.resource === 'health';
    case 'Contacts Manager': return perm.resource === 'contacts';
    case 'Organizer Manager': return perm.resource === 'organizer';
    case 'Messages Manager': return perm.resource === 'messages';
    case 'Viewer': return perm.action === 'read';
    default: return false;
  }
}

async function seedRolePermissions(): Promise<void> {
  const links: { role_id: string; permission_id: string }[] = [];
  for (const role of ROLES) {
    for (const perm of ALL_PERMISSIONS) {
      if (!permissionMatchesRole(perm, role.name)) continue;
      links.push({ role_id: role._id, permission_id: perm._id });
    }
  }
  if (links.length) await RolePermissionModel.insertMany(links);
  console.log('RolePermissions: inserted', links.length);
}

async function seedGroups(): Promise<void> {
  await GroupModel.insertMany(GROUPS.map((g) => ({ _id: g._id, name: g.name, description: g.description })));
  console.log('Groups: inserted', GROUPS.length);
}

const GROUP_TO_ROLE: Record<string, string> = {
  'All Members': 'Viewer',
  'Finance Team': 'Finance Manager',
  'Family Team': 'Family Manager',
  'Events Team': 'Events Manager',
  'Assets Team': 'Assets Manager',
  'Health Team': 'Health Manager',
  'Contacts Team': 'Contacts Manager',
  'Organizer Team': 'Organizer Manager',
  'Messages Team': 'Messages Manager',
};

async function seedGroupRoles(): Promise<void> {
  const roleNameToId = Object.fromEntries(ROLES.map((r) => [r.name, r._id]));
  const links: { group_id: string; role_id: string }[] = [];
  for (const g of GROUPS) {
    const roleName = GROUP_TO_ROLE[g.name];
    if (!roleName) continue;
    const roleId = roleNameToId[roleName];
    if (!roleId) continue;
    links.push({ group_id: g._id, role_id: roleId });
  }
  if (links.length) await GroupRoleModel.insertMany(links);
  console.log('GroupRoles: inserted', links.length);
}

async function seedRootUser(): Promise<void> {
  const email = process.env.ROOT_EMAIL;
  const password = process.env.ROOT_PASSWORD;
  if (!email || !password) {
    console.log('Root user: skipped (set ROOT_EMAIL and ROOT_PASSWORD to create).');
    return;
  }
  if (password.length < 6) {
    console.warn('Root user: skipped (ROOT_PASSWORD must be at least 6 characters).');
    return;
  }
  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  await UserModel.create({
    _id: ROOT_USER_ID,
    email,
    password: hashed,
    full_name: process.env.ROOT_FULL_NAME || 'Root',
    role: 'root',
    is_active: 1,
  });
  await UserRoleModel.create({ user_id: ROOT_USER_ID, role_id: 'role-admin' });
  console.log('Root user: created (email:', email, ', RBAC role: Admin).');
}

async function run(): Promise<void> {
  await mongoose.connect(config.mongodbUri);
  try {
    await cleanSeededRbac();
    await seedRoles();
    await seedPermissions();
    await seedRolePermissions();
    await seedGroups();
    await seedGroupRoles();
    await seedRootUser();
    console.log('RBAC seed completed.');
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});