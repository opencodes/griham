import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../../config/index.js';
import { UserModel } from '../../db/schemas/User.js';
import { UserRoleModel } from '../../db/schemas/UserRole.js';
import { RoleModel } from '../../db/schemas/Role.js';
import { PermissionModel } from '../../db/schemas/Permission.js';
import { RolePermissionModel } from '../../db/schemas/RolePermission.js';

const SALT_ROUNDS = 10;

function signToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email },
    config.jwtSecret,
    { expiresIn: config.jwtExpirySeconds }
  );
}

async function getRbacForUser(userId: string): Promise<{ roles: unknown[]; permissions: unknown[] }> {
  const userRoles = await UserRoleModel.find({ user_id: userId }).lean({ virtuals: true });
  const roleIds = userRoles.map((ur) => ur.role_id);
  const roles = await RoleModel.find({ _id: { $in: roleIds } }).lean({ virtuals: true });
  const permLinks = await RolePermissionModel.find({ role_id: { $in: roleIds } }).lean({ virtuals: true });
  const permIds = [...new Set(permLinks.map((p) => p.permission_id))];
  const permissions = await PermissionModel.find({ _id: { $in: permIds } }).lean({ virtuals: true });
  return { roles, permissions };
}

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    const body = req.body as { email?: string; password?: string; full_name?: string };
    if (!body.email || !body.password || !body.full_name) {
      res.fail('Email, password, and full name are required', 400);
      return;
    }
    if (body.password.length < 6) {
      res.fail('Password must be at least 6 characters', 400);
      return;
    }
    const existing = await UserModel.findOne({ email: body.email });
    if (existing) {
      res.fail('Email already registered', 409);
      return;
    }
    const hashed = await bcrypt.hash(body.password, SALT_ROUNDS);
    const id = uuidv4();
    await UserModel.create({
      _id: id,
      email: body.email,
      password: hashed,
      full_name: body.full_name,
      role: 'user',
      is_active: 1,
    });
    const user = await UserModel.findById(id).lean({ virtuals: true });
    if (!user) {
      res.fail('Failed to create user', 500);
      return;
    }
    const { roles, permissions } = await getRbacForUser(id);
    const token = signToken(user._id, user.email);
    const { password: _, ...safe } = user as Record<string, unknown>;
    res.success(
      { user: { ...safe, rbac_roles: roles, rbac_permissions: permissions }, token },
      'User registered successfully',
      201
    );
  },

  async login(req: Request, res: Response): Promise<void> {
    const body = req.body as { email?: string; password?: string };
    if (!body.email || !body.password) {
      res.fail('Email and password are required', 400);
      return;
    }
    const user = await UserModel.findOne({ email: body.email }).lean({ virtuals: true });
    if (!user) {
      res.fail('Invalid credentials', 401);
      return;
    }
    const ok = await bcrypt.compare(body.password, user.password);
    if (!ok) {
      res.fail('Invalid credentials', 401);
      return;
    }
    const { roles, permissions } = await getRbacForUser(user._id);
    const token = signToken(user._id, user.email);
    const { password: _, ...safe } = user as Record<string, unknown>;
    res.success(
      { user: { ...safe, rbac_roles: roles, rbac_permissions: permissions }, token },
      'Login successful'
    );
  },

  async me(req: Request, res: Response): Promise<void> {
    const auth = (req as Request & { auth?: { userId: string } }).auth;
    if (!auth?.userId) {
      res.fail('Unauthorized', 401);
      return;
    }
    const user = await UserModel.findById(auth.userId).lean({ virtuals: true });
    if (!user) {
      res.fail('User not found', 404);
      return;
    }
    const { roles, permissions } = await getRbacForUser(user._id);
    const { password: _, ...safe } = user as Record<string, unknown>;
    res.success({ ...safe, rbac_roles: roles, rbac_permissions: permissions });
  },
};
