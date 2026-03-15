import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { UserModel } from '../../db/schemas/User.js';
import { UserRoleModel } from '../../db/schemas/UserRole.js';
import { RoleModel } from '../../db/schemas/Role.js';
import { PermissionModel } from '../../db/schemas/Permission.js';
import { RolePermissionModel } from '../../db/schemas/RolePermission.js';
import { GroupModel } from '../../db/schemas/Group.js';
import { GroupRoleModel } from '../../db/schemas/GroupRole.js';
import { UserGroupModel } from '../../db/schemas/UserGroup.js';
import { v4 as uuidv4 } from 'uuid';

const SALT_ROUNDS = 10;

function toId<T extends { _id: string }>(doc: T) {
  return { ...doc, id: doc._id } as T & { id: string };
}

export const adminController = {
  async listUsers(_req: Request, res: Response): Promise<void> {
    const users = await UserModel.find().select('-password').lean({ virtuals: true });
    const data = users.map((u) => toId({ ...u, _id: u._id } as { _id: string;[k: string]: unknown }));
    res.success(data);
  },

  /** POST /admin/users - create user with RBAC role (root only). */
  async createAdmin(req: Request, res: Response): Promise<void> {
    const body = req.body as {
      email?: string;
      password?: string;
      full_name?: string;
      phone?: string;
      rbac_role_id?: string;
      rbac_role_name?: string;
    };
    const email = body?.email?.trim() ?? '';
    const password = body?.password ?? '';
    const full_name = body?.full_name?.trim() ?? '';
    if (!email || !password || !full_name) {
      res.fail('Email, password, and full name are required', 400);
      return;
    }
    if (password.length < 6) {
      res.fail('Password must be at least 6 characters', 400);
      return;
    }
    const existing = await UserModel.findOne({ email });
    if (existing) {
      res.fail('Email already registered', 409);
      return;
    }
    let role = body.rbac_role_id
      ? await RoleModel.findById(body.rbac_role_id).lean()
      : await RoleModel.findOne({ name: body.rbac_role_name || 'Admin' }).lean({ virtuals: true });
    if (!role) {
      res.fail('RBAC role not found or not specified', 400);
      return;
    }
    const id = uuidv4();
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    await UserModel.create({
      _id: id,
      email,
      password: hashed,
      full_name,
      phone: body.phone ?? null,
      role: 'user',
      is_active: 1,
    });
    await UserRoleModel.create({ user_id: id, role_id: role._id });
    const user = await UserModel.findById(id).select('-password').lean({ virtuals: true });
    if (!user) {
      res.fail('Failed to create user', 500);
      return;
    }
    const out = { ...toId(user), rbac_role_id: role._id, rbac_role_name: role.name };
    res.success(out, 'User created with RBAC role', 201);
  },

  async resetPassword(req: Request, res: Response): Promise<void> {
    const userId = req.params.id;
    const body = req.body as { new_password?: string };
    const newPassword = body?.new_password;
    if (!newPassword || String(newPassword).length < 6) {
      res.fail('New password must be at least 6 characters', 400);
      return;
    }
    const user = await UserModel.findById(userId);
    if (!user) {
      res.fail('User not found', 404);
      return;
    }
    user.password = await bcrypt.hash(String(newPassword), SALT_ROUNDS);
    await user.save();
    res.success(null, 'Password reset successfully');
  },

  async getUserRoles(req: Request, res: Response): Promise<void> {
    const userId = req.params.id;
    const links = await UserRoleModel.find({ user_id: userId }).lean({ virtuals: true });
    const roleIds = links.map((l) => l.role_id);
    const roles = await RoleModel.find({ _id: { $in: roleIds } }).lean({ virtuals: true });
    const data = roles.map((r) => toId(r));
    res.success(data);
  },

  async setUserRoles(req: Request, res: Response): Promise<void> {
    const userId = req.params.id;
    const body = req.body as { role_ids?: string[] };
    const roleIds = Array.isArray(body?.role_ids) ? body.role_ids : [];
    const user = await UserModel.findById(userId);
    if (!user) {
      res.fail('User not found', 404);
      return;
    }
    if (roleIds.length > 0) {
      const existingRoles = await RoleModel.find({ _id: { $in: roleIds } }).lean({ virtuals: true });
      if (existingRoles.length !== roleIds.length) {
        res.fail('One or more role_ids are invalid', 400);
        return;
      }
    }
    await UserRoleModel.deleteMany({ user_id: userId });
    for (const roleId of roleIds) {
      await UserRoleModel.create({ user_id: userId, role_id: roleId });
    }
    res.success({ role_ids: roleIds });
  },

  // Roles
  async listRoles(_req: Request, res: Response): Promise<void> {
    const roles = await RoleModel.find().lean({ virtuals: true });
    res.success(roles.map((r) => toId(r)));
  },

  async getRole(req: Request, res: Response): Promise<void> {
    const role = await RoleModel.findById(req.params.id).lean({ virtuals: true });
    if (!role) {
      res.fail('Role not found', 404);
      return;
    }
    const permLinks = await RolePermissionModel.find({ role_id: role._id }).lean({ virtuals: true });
    const permissions = await PermissionModel.find({ _id: { $in: permLinks.map((p) => p.permission_id) } }).lean({ virtuals: true });
    const userLinks = await UserRoleModel.find({ role_id: role._id }).lean({ virtuals: true });
    res.success({ ...toId(role), permissions: permissions.map((p) => toId(p)), user_ids: userLinks.map((u) => u.user_id) });
  },

  async createRole(req: Request, res: Response): Promise<void> {
    const body = req.body as { name?: string; description?: string };
    const name = body?.name ?? '';
    if (!name.trim()) {
      res.fail('Name is required', 400);
      return;
    }
    const existing = await RoleModel.findOne({ name: name.trim() });
    if (existing) {
      res.fail('Role with this name already exists', 409);
      return;
    }
    const id = `role-${uuidv4().slice(0, 8)}`;
    await RoleModel.create({ _id: id, name: name.trim(), description: body?.description ?? null });
    const role = await RoleModel.findById(id).lean({ virtuals: true });
    res.success(role ? toId(role) : null, 'Created', 201);
  },

  async updateRole(req: Request, res: Response): Promise<void> {
    const role = await RoleModel.findById(req.params.id);
    if (!role) {
      res.fail('Role not found', 404);
      return;
    }
    const body = req.body as { name?: string; description?: string };
    if (body.name !== undefined) role.name = body.name;
    if (body.description !== undefined) role.description = body.description;
    await role.save();
    res.success(toId(role.toObject()));
  },

  async deleteRole(req: Request, res: Response): Promise<void> {
    const deleted = await RoleModel.findByIdAndDelete(req.params.id);
    if (!deleted) {
      res.fail('Role not found', 404);
      return;
    }
    await RolePermissionModel.deleteMany({ role_id: req.params.id });
    await UserRoleModel.deleteMany({ role_id: req.params.id });
    await GroupRoleModel.deleteMany({ role_id: req.params.id });
    res.success(null, 'Role deleted');
  },

  async setRolePermissions(req: Request, res: Response): Promise<void> {
    const roleId = req.params.id;
    const body = req.body as { permission_ids?: string[] };
    const permissionIds = Array.isArray(body?.permission_ids) ? body.permission_ids : [];
    const role = await RoleModel.findById(roleId);
    if (!role) {
      res.fail('Role not found', 404);
      return;
    }
    if (permissionIds.length > 0) {
      const existingPerms = await PermissionModel.find({ _id: { $in: permissionIds } }).lean({ virtuals: true });
      if (existingPerms.length !== permissionIds.length) {
        res.fail('One or more permission_ids are invalid', 400);
        return;
      }
    }
    await RolePermissionModel.deleteMany({ role_id: roleId });
    for (const permissionId of permissionIds) {
      await RolePermissionModel.create({ role_id: roleId, permission_id: permissionId });
    }
    res.success({ permission_ids: permissionIds });
  },

  // Permissions
  async listPermissions(_req: Request, res: Response): Promise<void> {
    const permissions = await PermissionModel.find().lean({ virtuals: true });
    res.success(permissions.map((p) => toId(p)));
  },

  async getPermission(req: Request, res: Response): Promise<void> {
    const perm = await PermissionModel.findById(req.params.id).lean({ virtuals: true });
    if (!perm) {
      res.fail('Permission not found', 404);
      return;
    }
    const roleLinks = await RolePermissionModel.find({ permission_id: perm._id }).lean({ virtuals: true });
    res.success({ ...toId(perm), role_ids: roleLinks.map((r) => r.role_id) });
  },

  async createPermission(req: Request, res: Response): Promise<void> {
    const body = req.body as { name?: string; resource?: string; action?: string; description?: string };
    const name = body?.name ?? '';
    const resource = body?.resource ?? '';
    const action = body?.action ?? '';
    if (!name.trim() || !resource.trim() || !action.trim()) {
      res.fail('name, resource, and action are required', 400);
      return;
    }
    const existingByName = await PermissionModel.findOne({ name: name.trim() });
    if (existingByName) {
      res.fail('Permission with this name already exists', 409);
      return;
    }
    const existingByResourceAction = await PermissionModel.findOne({ resource: resource.trim(), action: action.trim() });
    if (existingByResourceAction) {
      res.fail('Permission with this resource and action already exists', 409);
      return;
    }
    const id = `perm-${uuidv4().slice(0, 12)}`;
    await PermissionModel.create({
      _id: id,
      name: name.trim(),
      resource: resource.trim(),
      action: action.trim(),
      description: body?.description ?? null,
    });
    const perm = await PermissionModel.findById(id).lean({ virtuals: true });
    res.success(perm ? toId(perm) : null, 'Created', 201);
  },

  async updatePermission(req: Request, res: Response): Promise<void> {
    const perm = await PermissionModel.findById(req.params.id);
    if (!perm) {
      res.fail('Permission not found', 404);
      return;
    }
    const body = req.body as { name?: string; resource?: string; action?: string; description?: string };
    if (body.name !== undefined) perm.name = body.name;
    if (body.resource !== undefined) perm.resource = body.resource;
    if (body.action !== undefined) perm.action = body.action;
    if (body.description !== undefined) perm.description = body.description;
    await perm.save();
    res.success(toId(perm.toObject()));
  },

  async deletePermission(req: Request, res: Response): Promise<void> {
    const deleted = await PermissionModel.findByIdAndDelete(req.params.id);
    if (!deleted) {
      res.fail('Permission not found', 404);
      return;
    }
    await RolePermissionModel.deleteMany({ permission_id: req.params.id });
    res.success(null, 'Permission deleted');
  },

  // Groups
  async listGroups(_req: Request, res: Response): Promise<void> {
    const groups = await GroupModel.find().lean({ virtuals: true });
    res.success(groups.map((g) => toId(g)));
  },

  async getGroup(req: Request, res: Response): Promise<void> {
    const group = await GroupModel.findById(req.params.id).lean({ virtuals: true });
    if (!group) {
      res.fail('Group not found', 404);
      return;
    }
    const userLinks = await UserGroupModel.find({ group_id: group._id }).lean({ virtuals: true });
    const roleLinks = await GroupRoleModel.find({ group_id: group._id }).lean({ virtuals: true });
    res.success({
      ...toId(group),
      user_ids: userLinks.map((u) => u.user_id),
      role_ids: roleLinks.map((r) => r.role_id),
    });
  },

  async createGroup(req: Request, res: Response): Promise<void> {
    const body = req.body as { name?: string; description?: string };
    const name = body?.name ?? '';
    if (!name.trim()) {
      res.fail('Name is required', 400);
      return;
    }
    const id = `group-${uuidv4().slice(0, 8)}`;
    await GroupModel.create({ _id: id, name: name.trim(), description: body?.description ?? null });
    const group = await GroupModel.findById(id).lean({ virtuals: true });
    res.success(group ? toId(group) : null, 'Created', 201);
  },

  async updateGroup(req: Request, res: Response): Promise<void> {
    const group = await GroupModel.findById(req.params.id);
    if (!group) {
      res.fail('Group not found', 404);
      return;
    }
    const body = req.body as { name?: string; description?: string };
    if (body.name !== undefined) group.name = body.name;
    if (body.description !== undefined) group.description = body.description;
    await group.save();
    res.success(toId(group.toObject()));
  },

  async deleteGroup(req: Request, res: Response): Promise<void> {
    const deleted = await GroupModel.findByIdAndDelete(req.params.id);
    if (!deleted) {
      res.fail('Group not found', 404);
      return;
    }
    await GroupRoleModel.deleteMany({ group_id: req.params.id });
    await UserGroupModel.deleteMany({ group_id: req.params.id });
    res.success(null, 'Group deleted');
  },

  async setGroupMembers(req: Request, res: Response): Promise<void> {
    const groupId = req.params.id;
    const body = req.body as { user_ids?: string[] };
    const userIds = Array.isArray(body?.user_ids) ? body.user_ids : [];
    const group = await GroupModel.findById(groupId);
    if (!group) {
      res.fail('Group not found', 404);
      return;
    }
    if (userIds.length > 0) {
      const existingUsers = await UserModel.find({ _id: { $in: userIds } }).lean({ virtuals: true });
      if (existingUsers.length !== userIds.length) {
        res.fail('One or more user_ids are invalid', 400);
        return;
      }
    }
    await UserGroupModel.deleteMany({ group_id: groupId });
    for (const uid of userIds) {
      await UserGroupModel.create({ group_id: groupId, user_id: uid });
    }
    res.success({ user_ids: userIds });
  },

  async setGroupRoles(req: Request, res: Response): Promise<void> {
    const groupId = req.params.id;
    const body = req.body as { role_ids?: string[] };
    const roleIds = Array.isArray(body?.role_ids) ? body.role_ids : [];
    const group = await GroupModel.findById(groupId);
    if (!group) {
      res.fail('Group not found', 404);
      return;
    }
    if (roleIds.length > 0) {
      const existingRoles = await RoleModel.find({ _id: { $in: roleIds } }).lean({ virtuals: true });
      if (existingRoles.length !== roleIds.length) {
        res.fail('One or more role_ids are invalid', 400);
        return;
      }
    }
    await GroupRoleModel.deleteMany({ group_id: groupId });
    for (const roleId of roleIds) {
      await GroupRoleModel.create({ group_id: groupId, role_id: roleId });
    }
    res.success({ role_ids: roleIds });
  },
};