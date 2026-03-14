# Griham Microservice – Full Source (Markdown)

Single-file snapshot of the microservice source. **Current layout:** `config/`, `src/app.ts`, `src/server.ts`, `src/db/` (connection + schemas), `src/modules/` (auth, families, finance, admin), `src/shared/` (middleware, response), `src/scripts/` (e.g. seed-rbac), `src/lib/` (e.g. huggingface).

**Families behaviour:** On create family, the creator is added as a default member with role `admin`. Admins (and the creator) can invite members and update non-admin members; admin members cannot be edited.

**Admin module:** Mounted at `/api/admin`; all routes use `authMiddleware` and `requireRoot` (user must have `role: 'root'`). Manages users, roles, permissions, and groups (RBAC). createRole/createPermission return 409 on duplicate name (or duplicate resource+action for permissions). setUserRoles, setRolePermissions, setGroupMembers, setGroupRoles validate that all supplied IDs exist and return 400 if any are invalid.

**Finance module:** Mounted at `/api/finance`; auth required. dataController: accounts, transactions (list/summary), bills (list/upcoming), cards (CRUD). controller: AI insights, savings tips, suggest category, suggest bill category, parse SMS (transaction/card). Uses `service.ts`, `aggregate.ts`, and optionally `lib/huggingface.ts`.

**Other:** `src/lib/huggingface.ts` — Hugging Face Inference API client (text-generation, zero-shot); used by finance AI when `HUGGING_FACE_API_KEY` is set. `src/scripts/seed-rbac.ts` — Seeds roles, permissions, role-permission links, groups, group-role links, and optional root user; run with `npm run seed:rbac`.

---

## `package.json`

```json
{
  "name": "griham-microservice",
  "version": "1.0.0",
  "description": "Griham API microservice - Node.js + MongoDB (Clean Architecture)",
  "type": "module",
  "main": "dist/src/server.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/src/server.js",
    "dev": "tsx watch src/server.ts",
    "seed:rbac": "tsx src/scripts/seed-rbac.ts"
  },
  "engines": {
    "node": ">=18"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.0.3",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/node": "^20.10.6",
    "@types/uuid": "^9.0.8",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3"
  }
}
```

---

## `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["config/**/*.ts", "src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

---

## `.env.example`

```bash
PORT=8000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/griham
JWT_SECRET=your-jwt-secret-change-in-production
JWT_EXPIRY_SECONDS=86400
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
# Optional: for AI features (Hugging Face)
# HUGGING_FACE_API_KEY=
```

---

## `config/index.ts`

```typescript
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 8000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/griham',
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  jwtExpirySeconds: Number(process.env.JWT_EXPIRY_SECONDS) || 86400,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  huggingFaceApiKey: process.env.HUGGING_FACE_API_KEY || '',
} as const;

export type Config = typeof config;
```

---

## `src/server.ts`

```typescript
/**
 * Griham microservice entry point.
 * Build: npm run build  →  Start: npm start
 * Dev:   npm run dev     (tsx watch)
 */
import { config } from '../config/index.js';
import { connectMongo } from './db/connection.js';
import app from './app.js';

async function main(): Promise<void> {
  await connectMongo();
  app.listen(config.port, () => {
    console.log(`Griham API listening on port ${config.port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

---

## `src/db/connection.ts`

```typescript
import mongoose from 'mongoose';
import { config } from '../../config/index.js';

export async function connectMongo(): Promise<void> {
  await mongoose.connect(config.mongodbUri);
}

export function getConnection(): mongoose.Connection {
  return mongoose.connection;
}
```

---

## `src/app.ts`

```typescript
import express, { Express } from 'express';
import cors from 'cors';
import { config } from '../config/index.js';
import { responseMiddleware } from './shared/middleware/response.js';
import { authRoutes } from './modules/auth/routes.js';
import { financeRoutes } from './modules/finance/routes.js';
import { adminRoutes } from './modules/admin/routes.js';
import { familiesRoutes } from './modules/families/routes.js';

const app: Express = express();

app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json());
app.use(responseMiddleware);

app.use('/api', authRoutes);
app.use('/api', familiesRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/admin', adminRoutes);

export default app;
```

---

## `src/shared/response.ts`

```typescript
/**
 * Standard API response shapes (success/error).
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
  status: number;
}

export interface ErrorResponse {
  success: false;
  message: string;
  errors?: unknown;
  status: number;
}

export function success<T>(data: T = null as T, message = 'Success', status = 200): SuccessResponse<T> {
  return { success: true, message, data, status };
}

export function error(message: string, status = 400, errors: unknown = null): ErrorResponse {
  return { success: false, message, errors: errors ?? undefined, status };
}
```

---

## `src/shared/middleware/response.ts`

```typescript
import type { Request, Response, NextFunction } from 'express';
import { success, error, type SuccessResponse, type ErrorResponse } from '../response.js';

export function responseMiddleware(_req: Request, res: Response, next: NextFunction): void {
  res.success = (data: unknown = null, message = 'Success', status = 200) => {
    const payload: SuccessResponse = success(data, message, status);
    res.status(status).json(payload);
  };
  res.fail = (msg: string, status = 400, errs?: unknown) => {
    const payload: ErrorResponse = error(msg, status, errs);
    res.status(status).json(payload);
  };
  next();
}

declare global {
  namespace Express {
    interface Response {
      success: (data?: unknown, message?: string, status?: number) => void;
      fail: (message: string, status?: number, errors?: unknown) => void;
    }
  }
}
```

---

## `src/shared/middleware/auth.ts`

```typescript
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../../config/index.js';

export interface AuthPayload {
  userId: string;
  email: string;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !/^Bearer\s+.+$/i.test(authHeader)) {
    res.fail('Unauthorized - No token provided', 401);
    return;
  }
  const token = authHeader.replace(/^Bearer\s+/i, '');
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthPayload;
    (req as Request & { auth: AuthPayload }).auth = decoded;
    next();
  } catch {
    res.fail('Unauthorized - Invalid token', 401);
  }
}
```

---

## `src/shared/middleware/requireRoot.ts`

```typescript
import type { Request, Response, NextFunction } from 'express';
import { UserModel } from '../../db/schemas/User.js';

type AuthRequest = Request & { auth?: { userId: string; email: string } };

export async function requireRoot(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!req.auth?.userId) {
    res.fail('Unauthorized', 401);
    return;
  }
  const user = await UserModel.findById(req.auth.userId).lean();
  if (!user || user.role !== 'root') {
    res.fail('Forbidden', 403);
    return;
  }
  next();
}
```

---

## `src/modules/auth/routes.ts`

```typescript
import { Router } from 'express';
import { authController } from './controller.js';
import { authMiddleware } from '../../shared/middleware/auth.js';

export const authRoutes = Router();

authRoutes.post('/auth/register', authController.register);
authRoutes.post('/auth/login', authController.login);
authRoutes.get('/auth/me', authMiddleware, authController.me);
```

---

## `src/modules/auth/controller.ts`

```typescript
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
  const userRoles = await UserRoleModel.find({ user_id: userId }).lean();
  const roleIds = userRoles.map((ur) => ur.role_id);
  const roles = await RoleModel.find({ _id: { $in: roleIds } }).lean();
  const permLinks = await RolePermissionModel.find({ role_id: { $in: roleIds } }).lean();
  const permIds = [...new Set(permLinks.map((p) => p.permission_id))];
  const permissions = await PermissionModel.find({ _id: { $in: permIds } }).lean();
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
    const user = await UserModel.findById(id).lean();
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
    const user = await UserModel.findOne({ email: body.email }).lean();
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
    const user = await UserModel.findById(auth.userId).lean();
    if (!user) {
      res.fail('User not found', 404);
      return;
    }
    const { roles, permissions } = await getRbacForUser(user._id);
    const { password: _, ...safe } = user as Record<string, unknown>;
    res.success({ ...safe, rbac_roles: roles, rbac_permissions: permissions });
  },
};
```

---

## `src/modules/families/routes.ts`

```typescript
import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { familiesController } from './controller.js';

export const familiesRoutes = Router();

familiesRoutes.use(authMiddleware);

familiesRoutes.post('/families', familiesController.create);
familiesRoutes.get('/families', familiesController.list);
familiesRoutes.get('/families/me', familiesController.getCurrent);
familiesRoutes.get('/families/:id', familiesController.get);
familiesRoutes.put('/families/:id', familiesController.updateAddress);
familiesRoutes.get('/families/:id/members', familiesController.listMembers);
familiesRoutes.post('/families/:id/members', familiesController.addMember);
familiesRoutes.put('/families/:householdId/members/:memberId', familiesController.updateMember);

// Backend alias: /households/* -> same as /families/*
familiesRoutes.get('/households/:id', familiesController.get);
familiesRoutes.put('/households/:id', familiesController.updateAddress);
familiesRoutes.get('/households/:id/members', familiesController.listMembers);
familiesRoutes.post('/households/:id/members', familiesController.addMember);
```

---

## `src/modules/families/controller.ts`

```typescript
import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { FamilyModel } from '../../db/schemas/Family.js';
import { FamilyMemberModel } from '../../db/schemas/FamilyMember.js';

type AuthRequest = Request & { auth?: { userId: string } };

function toId<T extends { _id: string }>(doc: T) {
  return { ...doc, id: doc._id } as T & { id: string };
}

export const familiesController = {
  async create(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.auth?.userId;
    if (!userId) {
      res.fail('Unauthorized', 401);
      return;
    }
    const body = req.body as { name?: string; address?: string };
    const name = body?.name?.trim() || 'New Household';
    const id = uuidv4();
    await FamilyModel.create({
      _id: id,
      name,
      address: body?.address ?? null,
      created_by: userId,
    });
    // Creator is default member with role admin (same as backend)
    await FamilyMemberModel.create({
      _id: uuidv4(),
      family_id: id,
      user_id: userId,
      role: 'admin',
      relation: null,
      status: 'active',
      invitation_email: null,
      invitation_sent_at: null,
      joined_at: new Date(),
    });
    const family = await FamilyModel.findById(id).lean();
    if (!family) {
      res.fail('Failed to create family', 500);
      return;
    }
    res.success(toId(family), 'Created', 201);
  },

  async list(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.auth?.userId;
    if (!userId) {
      res.fail('Unauthorized', 401);
      return;
    }
    const created = await FamilyModel.find({ created_by: userId }).lean();
    const memberLinks = await FamilyMemberModel.find({ user_id: userId }).select('family_id').lean();
    const memberFamilyIds = memberLinks.map((m) => m.family_id).filter((id) => !created.some((c) => c._id === id));
    const memberFamilies = memberFamilyIds.length ? await FamilyModel.find({ _id: { $in: memberFamilyIds } }).lean() : [];
    const all = [...created, ...memberFamilies];
    res.success(all.map((f) => toId(f)));
  },

  async getCurrent(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.auth?.userId;
    if (!userId) {
      res.fail('Unauthorized', 401);
      return;
    }
    const created = await FamilyModel.findOne({ created_by: userId }).lean();
    if (created) {
      res.success(toId(created));
      return;
    }
    const memberLink = await FamilyMemberModel.findOne({ user_id: userId }).lean();
    if (memberLink) {
      const family = await FamilyModel.findById(memberLink.family_id).lean();
      if (family) {
        res.success(toId(family));
        return;
      }
    }
    res.success(null);
  },

  async get(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.auth?.userId;
    if (!userId) {
      res.fail('Unauthorized', 401);
      return;
    }
    const family = await FamilyModel.findById(req.params.id).lean();
    if (!family) {
      res.fail('Family not found', 404);
      return;
    }
    const isCreator = family.created_by === userId;
    const isMember = await FamilyMemberModel.findOne({ family_id: family._id, user_id: userId });
    if (!isCreator && !isMember) {
      res.fail('Forbidden', 403);
      return;
    }
    res.success(toId(family));
  },

  async updateAddress(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.auth?.userId;
    if (!userId) {
      res.fail('Unauthorized', 401);
      return;
    }
    const family = await FamilyModel.findById(req.params.id);
    if (!family) {
      res.fail('Family not found', 404);
      return;
    }
    if (family.created_by !== userId) {
      res.fail('Forbidden', 403);
      return;
    }
    const body = req.body as { address?: string };
    if (body.address !== undefined) family.address = body.address;
    await family.save();
    res.success(toId(family.toObject()));
  },

  async listMembers(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.auth?.userId;
    if (!userId) {
      res.fail('Unauthorized', 401);
      return;
    }
    const familyId = req.params.id;
    const family = await FamilyModel.findById(familyId).lean();
    if (!family) {
      res.fail('Family not found', 404);
      return;
    }
    const isCreator = family.created_by === userId;
    const isMember = await FamilyMemberModel.findOne({ family_id: familyId, user_id: userId });
    if (!isCreator && !isMember) {
      res.fail('Forbidden', 403);
      return;
    }
    const members = await FamilyMemberModel.find({ family_id: familyId }).lean();
    const withExtra = members.map((m) => ({
      ...toId(m),
      household_id: m.family_id,
      full_name: m.relation || 'Member',
      user_email: (m as unknown as { invitation_email?: string }).invitation_email ?? null,
      user_phone: null as string | null,
    }));
    res.success(withExtra);
  },

  async addMember(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.auth?.userId;
    if (!userId) {
      res.fail('Unauthorized', 401);
      return;
    }
    const familyId = req.params.id;
    const body = req.body as { fname?: string; lname?: string; email?: string; phone?: string; relation?: string };
    const family = await FamilyModel.findById(familyId);
    if (!family) {
      res.fail('Family not found', 404);
      return;
    }
    const isCreator = family.created_by === userId;
    const callerMember = await FamilyMemberModel.findOne({ family_id: familyId, user_id: userId });
    const isAdmin = callerMember?.role === 'admin';
    if (!isCreator && !isAdmin) {
      res.fail('Forbidden', 403);
      return;
    }
    const fullName = [body.fname, body.lname].filter(Boolean).join(' ') || 'Member';
    const memberId = uuidv4();
    await FamilyMemberModel.create({
      _id: memberId,
      family_id: familyId,
      user_id: 'pending',
      role: 'member',
      relation: body.relation ?? null,
      status: 'pending',
      invitation_email: body.email ?? null,
      invitation_sent_at: new Date(),
      joined_at: new Date(),
    });
    const member = await FamilyMemberModel.findById(memberId).lean();
    if (!member) {
      res.fail('Failed to create member', 500);
      return;
    }
    const out = {
      ...toId(member),
      household_id: familyId,
      full_name: fullName,
      user_email: body.email ?? null,
      user_phone: body.phone ?? null,
    };
    res.success(out, 'Created', 201);
  },

  async updateMember(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.auth?.userId;
    if (!userId) {
      res.fail('Unauthorized', 401);
      return;
    }
    const { householdId, memberId } = req.params;
    const body = req.body as { fname?: string; lname?: string; email?: string; phone?: string; relation?: string };
    const family = await FamilyModel.findById(householdId);
    if (!family) {
      res.fail('Family not found', 404);
      return;
    }
    const isCreator = family.created_by === userId;
    const callerMember = await FamilyMemberModel.findOne({ family_id: householdId, user_id: userId });
    const isAdmin = callerMember?.role === 'admin';
    if (!isCreator && !isAdmin) {
      res.fail('Forbidden', 403);
      return;
    }
    const member = await FamilyMemberModel.findOne({ _id: memberId, family_id: householdId });
    if (!member) {
      res.fail('Member not found', 404);
      return;
    }
    if (member.role === 'admin') {
      res.fail('Cannot edit admin members', 403);
      return;
    }
    if (body.relation !== undefined) member.relation = body.relation;
    if (body.email !== undefined) member.invitation_email = body.email;
    await member.save();
    const fullName = [body.fname, body.lname].filter(Boolean).join(' ') || member.relation || 'Member';
    const updated = await FamilyMemberModel.findById(memberId).lean();
    const out = updated
      ? {
          ...toId(updated),
          household_id: householdId,
          full_name: fullName,
          user_email: updated.invitation_email ?? null,
          user_phone: body.phone ?? null,
        }
      : null;
    res.success(out);
  },
};
```

---

## `src/modules/admin/routes.ts`

```typescript
import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { requireRoot } from '../../shared/middleware/requireRoot.js';
import { adminController } from './controller.js';

export const adminRoutes = Router();

adminRoutes.use(authMiddleware);
adminRoutes.use(requireRoot);

// Users
adminRoutes.get('/users', adminController.listUsers);
adminRoutes.post('/users', adminController.createAdmin);
adminRoutes.put('/users/:id/reset-password', adminController.resetPassword);
adminRoutes.get('/users/:id/roles', adminController.getUserRoles);
adminRoutes.put('/users/:id/roles', adminController.setUserRoles);

// Roles
adminRoutes.get('/roles', adminController.listRoles);
adminRoutes.get('/roles/:id', adminController.getRole);
adminRoutes.post('/roles', adminController.createRole);
adminRoutes.put('/roles/:id', adminController.updateRole);
adminRoutes.delete('/roles/:id', adminController.deleteRole);
adminRoutes.put('/roles/:id/permissions', adminController.setRolePermissions);

// Permissions
adminRoutes.get('/permissions', adminController.listPermissions);
adminRoutes.get('/permissions/:id', adminController.getPermission);
adminRoutes.post('/permissions', adminController.createPermission);
adminRoutes.put('/permissions/:id', adminController.updatePermission);
adminRoutes.delete('/permissions/:id', adminController.deletePermission);

// Groups
adminRoutes.get('/groups', adminController.listGroups);
adminRoutes.get('/groups/:id', adminController.getGroup);
adminRoutes.post('/groups', adminController.createGroup);
adminRoutes.put('/groups/:id', adminController.updateGroup);
adminRoutes.delete('/groups/:id', adminController.deleteGroup);
adminRoutes.put('/groups/:id/members', adminController.setGroupMembers);
adminRoutes.put('/groups/:id/roles', adminController.setGroupRoles);
```

---

## `src/modules/admin/controller.ts`

```typescript
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
    const users = await UserModel.find().select('-password').lean();
    const data = users.map((u) => toId({ ...u, _id: u._id } as { _id: string; [k: string]: unknown }));
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
      : await RoleModel.findOne({ name: body.rbac_role_name || 'Admin' }).lean();
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
    const user = await UserModel.findById(id).select('-password').lean();
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
    const links = await UserRoleModel.find({ user_id: userId }).lean();
    const roleIds = links.map((l) => l.role_id);
    const roles = await RoleModel.find({ _id: { $in: roleIds } }).lean();
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
      const existingRoles = await RoleModel.find({ _id: { $in: roleIds } }).lean();
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
    const roles = await RoleModel.find().lean();
    res.success(roles.map((r) => toId(r)));
  },

  async getRole(req: Request, res: Response): Promise<void> {
    const role = await RoleModel.findById(req.params.id).lean();
    if (!role) {
      res.fail('Role not found', 404);
      return;
    }
    const permLinks = await RolePermissionModel.find({ role_id: role._id }).lean();
    const permissions = await PermissionModel.find({ _id: { $in: permLinks.map((p) => p.permission_id) } }).lean();
    const userLinks = await UserRoleModel.find({ role_id: role._id }).lean();
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
    const role = await RoleModel.findById(id).lean();
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
      const existingPerms = await PermissionModel.find({ _id: { $in: permissionIds } }).lean();
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
    const permissions = await PermissionModel.find().lean();
    res.success(permissions.map((p) => toId(p)));
  },

  async getPermission(req: Request, res: Response): Promise<void> {
    const perm = await PermissionModel.findById(req.params.id).lean();
    if (!perm) {
      res.fail('Permission not found', 404);
      return;
    }
    const roleLinks = await RolePermissionModel.find({ permission_id: perm._id }).lean();
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
    const perm = await PermissionModel.findById(id).lean();
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
    const groups = await GroupModel.find().lean();
    res.success(groups.map((g) => toId(g)));
  },

  async getGroup(req: Request, res: Response): Promise<void> {
    const group = await GroupModel.findById(req.params.id).lean();
    if (!group) {
      res.fail('Group not found', 404);
      return;
    }
    const userLinks = await UserGroupModel.find({ group_id: group._id }).lean();
    const roleLinks = await GroupRoleModel.find({ group_id: group._id }).lean();
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
    const group = await GroupModel.findById(id).lean();
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
      const existingUsers = await UserModel.find({ _id: { $in: userIds } }).lean();
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
      const existingRoles = await RoleModel.find({ _id: { $in: roleIds } }).lean();
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
```

---

## `src/modules/finance/routes.ts`

```typescript
import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.js';
import { financeController } from './controller.js';
import { financeDataController } from './dataController.js';

export const financeRoutes = Router();

financeRoutes.use(authMiddleware);

// Accounts
financeRoutes.get('/accounts/:familyId', financeDataController.listAccounts);
financeRoutes.post('/accounts', financeDataController.createAccount);
financeRoutes.put('/accounts/:familyId/:accountId', financeDataController.updateAccount);
financeRoutes.delete('/accounts/:familyId/:accountId', financeDataController.deleteAccount);

// Transactions
financeRoutes.get('/transactions/:familyId/summary', financeDataController.getSummary);
financeRoutes.get('/transactions/:familyId', financeDataController.listTransactions);
financeRoutes.post('/transactions', financeDataController.createTransaction);
financeRoutes.delete('/transactions/:familyId/:transactionId', financeDataController.deleteTransaction);

// Bills
financeRoutes.get('/bills/:familyId/upcoming', financeDataController.getUpcomingBills);
financeRoutes.get('/bills/:familyId', financeDataController.listBills);
financeRoutes.post('/bills', financeDataController.createBill);
financeRoutes.put('/bills/:familyId/:billId', financeDataController.updateBill);
financeRoutes.delete('/bills/:familyId/:billId', financeDataController.deleteBill);

// Cards
financeRoutes.get('/cards/:familyId', financeDataController.listCards);
financeRoutes.post('/cards', financeDataController.createCard);
financeRoutes.put('/cards/:familyId/:cardId', financeDataController.updateCard);
financeRoutes.delete('/cards/:familyId/:cardId', financeDataController.deleteCard);

// AI
financeRoutes.get('/ai/insights/:familyId', financeController.insights);
financeRoutes.get('/ai/savings-tips/:familyId', financeController.savingsTips);
financeRoutes.post('/ai/suggest-category/:familyId', financeController.suggestCategory);
financeRoutes.post('/ai/suggest-bill-category/:familyId', financeController.suggestBillCategory);
financeRoutes.post('/ai/parse-sms/:familyId', financeController.parseSms);
financeRoutes.post('/ai/parse-sms-card/:familyId', financeController.parseSmsCard);
```

---

## `src/modules/finance/controller.ts`

```typescript
import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getInsightsContext } from './aggregate.js';
import {
  generateInsights,
  getSavingsTips,
  suggestTransactionCategory,
  suggestBillCategory,
  parseSmsToTransaction,
  parseSmsToCard,
} from './service.js';
import { BankAccountModel } from '../../db/schemas/BankAccount.js';
import { TransactionModel } from '../../db/schemas/Transaction.js';

type AuthRequest = Request & { auth?: { userId: string } };

export const financeController = {
  async insights(req: Request, res: Response): Promise<void> {
    const familyId = req.params.familyId as string;
    const month = (req.query.month as string) || undefined;
    if (!familyId) {
      res.fail('familyId required', 400);
      return;
    }
    try {
      const context = await getInsightsContext(familyId, month);
      const { insights, ai_available } = await generateInsights(context);
      res.success({
        data: {
          total_balance: context.total_balance,
          total_income: context.total_income,
          total_expense: context.total_expense,
          savings_rate: context.savings_rate,
          upcoming_bills: context.upcoming_bills,
        },
        insights,
        ai_available,
      });
    } catch (e) {
      console.error('[finance] insights:', e);
      res.fail('Failed to load insights', 500);
    }
  },

  async savingsTips(_req: Request, res: Response): Promise<void> {
    try {
      const { tips, ai_available } = await getSavingsTips();
      res.success({ tips, ai_available });
    } catch (e) {
      console.error('[finance] savingsTips:', e);
      res.fail('Failed to get tips', 500);
    }
  },

  async suggestCategory(req: Request, res: Response): Promise<void> {
    const body = req.body as { description?: string; amount?: number; type?: string };
    const description = body?.description ?? '';
    try {
      const result = await suggestTransactionCategory(
        description,
        body?.amount,
        body?.type as 'income' | 'expense' | undefined
      );
      res.success(result);
    } catch (e) {
      console.error('[finance] suggestCategory:', e);
      res.fail('Failed to suggest category', 500);
    }
  },

  async suggestBillCategory(req: Request, res: Response): Promise<void> {
    const body = req.body as { bill_name?: string };
    const bill_name = body?.bill_name ?? '';
    try {
      const result = await suggestBillCategory(bill_name);
      res.success(result);
    } catch (e) {
      console.error('[finance] suggestBillCategory:', e);
      res.fail('Failed to suggest bill category', 500);
    }
  },

  async parseSms(req: AuthRequest, res: Response): Promise<void> {
    const familyId = req.params.familyId as string;
    const body = req.body as { sms_text?: string };
    const smsText = body?.sms_text ?? '';
    const userId = req.auth?.userId;

    if (!familyId || !smsText.trim()) {
      res.fail('familyId and sms_text are required', 400);
      return;
    }

    try {
      const parsed = await parseSmsToTransaction(smsText);
      if (!parsed || parsed.amount <= 0) {
        res.fail('Could not extract a valid transaction from the SMS', 400);
        return;
      }

      const accounts = await BankAccountModel.find({ family_id: familyId }).limit(1).lean();
      const accountId = accounts[0]?._id;
      if (!accountId || !userId) {
        res.success({
          parsed,
          created: false,
          message: 'Add a bank account and ensure you are logged in to auto-create the transaction.',
        });
        return;
      }

      const transactionDate = parsed.transaction_date
        ? new Date(parsed.transaction_date)
        : new Date();
      const id = uuidv4();
      await TransactionModel.create({
        _id: id,
        family_id: familyId,
        account_id: accountId,
        type: parsed.type,
        category: parsed.category,
        amount: parsed.amount,
        description: parsed.description ?? null,
        transaction_date: transactionDate,
        created_by: userId,
      });
      res.success({ parsed, created: true, transaction_id: id });
    } catch (e) {
      console.error('[finance] parseSms:', e);
      res.fail('Failed to parse SMS', 500);
    }
  },

  async parseSmsCard(req: Request, res: Response): Promise<void> {
    const body = req.body as { sms_text?: string };
    const smsText = body?.sms_text ?? '';

    if (!smsText.trim()) {
      res.fail('sms_text is required', 400);
      return;
    }

    try {
      const parsed = await parseSmsToCard(smsText);
      res.success(parsed ?? {});
    } catch (e) {
      console.error('[finance] parseSmsCard:', e);
      res.fail('Failed to parse card SMS', 500);
    }
  },
};
```

---

## `src/modules/finance/dataController.ts`

```typescript
import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { BankAccountModel } from '../../db/schemas/BankAccount.js';
import { TransactionModel } from '../../db/schemas/Transaction.js';
import { BillModel } from '../../db/schemas/Bill.js';
import { CardModel } from '../../db/schemas/Card.js';

type AuthRequest = Request & { auth?: { userId: string } };

function toId<T extends { _id: string }>(doc: T) {
  return { ...doc, id: doc._id } as T & { id: string };
}

export const financeDataController = {
  // Accounts
  async listAccounts(req: Request, res: Response): Promise<void> {
    const list = await BankAccountModel.find({ family_id: req.params.familyId }).lean();
    res.success(list.map((a) => toId(a)));
  },

  async createAccount(req: AuthRequest, res: Response): Promise<void> {
    const body = req.body as {
      family_id?: string;
      account_name?: string;
      account_number?: string;
      bank_name?: string;
      account_type?: string;
      balance?: number;
      currency?: string;
    };
    const family_id = body.family_id;
    if (!family_id) {
      res.fail('family_id is required', 400);
      return;
    }
    const id = uuidv4();
    await BankAccountModel.create({
      _id: id,
      family_id,
      account_name: body.account_name ?? 'Account',
      account_number: body.account_number ?? null,
      bank_name: body.bank_name ?? 'Bank',
      account_type: body.account_type ?? 'savings',
      balance: Number(body.balance) ?? 0,
      currency: body.currency ?? 'INR',
    });
    const account = await BankAccountModel.findById(id).lean();
    res.success(account ? toId(account) : null, 'Created', 201);
  },

  async updateAccount(req: Request, res: Response): Promise<void> {
    const { familyId, accountId } = req.params;
    const account = await BankAccountModel.findOne({ _id: accountId, family_id: familyId });
    if (!account) {
      res.fail('Account not found', 404);
      return;
    }
    const body = req.body as Partial<{ account_name: string; account_number: string; bank_name: string; account_type: string; balance: number; currency: string }>;
    if (body.account_name !== undefined) account.account_name = body.account_name;
    if (body.account_number !== undefined) account.account_number = body.account_number;
    if (body.bank_name !== undefined) account.bank_name = body.bank_name;
    if (body.account_type !== undefined) account.account_type = body.account_type;
    if (body.balance !== undefined) account.balance = body.balance;
    if (body.currency !== undefined) account.currency = body.currency;
    await account.save();
    res.success(toId(account.toObject()));
  },

  async deleteAccount(req: Request, res: Response): Promise<void> {
    const { familyId, accountId } = req.params;
    const deleted = await BankAccountModel.findOneAndDelete({ _id: accountId, family_id: familyId });
    if (!deleted) {
      res.fail('Account not found', 404);
      return;
    }
    res.success({ ok: true });
  },

  // Transactions
  async listTransactions(req: Request, res: Response): Promise<void> {
    const { familyId } = req.params;
    const { type, category, month } = req.query as { type?: string; category?: string; month?: string };
    const filter: Record<string, unknown> = { family_id: familyId };
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (month) {
      const [y, m] = month.split('-').map(Number);
      filter.transaction_date = {
        $gte: new Date(y, m - 1, 1),
        $lte: new Date(y, m, 0),
      };
    }
    const list = await TransactionModel.find(filter).sort({ transaction_date: -1 }).lean();
    res.success(list.map((t) => ({ ...toId(t), transaction_date: t.transaction_date instanceof Date ? t.transaction_date.toISOString().slice(0, 10) : t.transaction_date })));
  },

  async getSummary(req: Request, res: Response): Promise<void> {
    const { familyId } = req.params;
    const month = req.query.month as string | undefined;
    const filter: Record<string, unknown> = { family_id: familyId };
    if (month) {
      const [y, m] = month.split('-').map(Number);
      filter.transaction_date = { $gte: new Date(y, m - 1, 1), $lte: new Date(y, m, 0) };
    }
    const list = await TransactionModel.find(filter).select('type amount').lean();
    const total_income = list.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const total_expense = list.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    res.success({ total_income, total_expense, balance: total_income - total_expense });
  },

  async createTransaction(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.auth?.userId ?? '';
    const body = req.body as {
      family_id?: string;
      account_id?: string;
      type?: 'income' | 'expense';
      category?: string;
      amount?: number;
      description?: string;
      transaction_date?: string;
    };
    const family_id = body.family_id;
    if (!family_id) {
      res.fail('family_id is required', 400);
      return;
    }
    const id = uuidv4();
    const transaction_date = body.transaction_date ? new Date(body.transaction_date) : new Date();
    await TransactionModel.create({
      _id: id,
      family_id,
      account_id: body.account_id ?? (await BankAccountModel.findOne({ family_id }).select('_id').then((a) => a?._id)) ?? '',
      type: body.type ?? 'expense',
      category: body.category ?? 'Other',
      amount: Number(body.amount) ?? 0,
      description: body.description ?? null,
      transaction_date,
      created_by: userId,
    });
    const tx = await TransactionModel.findById(id).lean();
    if (!tx) {
      res.fail('Failed to create transaction', 500);
      return;
    }
    res.success({ ...toId(tx), transaction_date: tx.transaction_date instanceof Date ? tx.transaction_date.toISOString().slice(0, 10) : tx.transaction_date }, 'Created', 201);
  },

  async deleteTransaction(req: Request, res: Response): Promise<void> {
    const { familyId, transactionId } = req.params;
    const deleted = await TransactionModel.findOneAndDelete({ _id: transactionId, family_id: familyId });
    if (!deleted) {
      res.fail('Transaction not found', 404);
      return;
    }
    res.success({ ok: true });
  },

  // Bills
  async listBills(req: Request, res: Response): Promise<void> {
    const list = await BillModel.find({ family_id: req.params.familyId }).lean();
    res.success(list.map((b) => ({ ...toId(b), due_date: b.due_date instanceof Date ? b.due_date.toISOString().slice(0, 10) : b.due_date })));
  },

  async getUpcomingBills(req: Request, res: Response): Promise<void> {
    const list = await BillModel.find({ family_id: req.params.familyId, status: 'pending' }).lean();
    res.success(list.map((b) => ({ ...toId(b), due_date: b.due_date instanceof Date ? b.due_date.toISOString().slice(0, 10) : b.due_date })));
  },

  async createBill(req: Request, res: Response): Promise<void> {
    const body = req.body as {
      family_id?: string;
      bill_name?: string;
      category?: string;
      amount?: number;
      due_date?: string;
      is_recurring?: boolean;
      recurrence_pattern?: string;
      status?: string;
    };
    const family_id = body.family_id;
    if (!family_id) {
      res.fail('family_id is required', 400);
      return;
    }
    const id = uuidv4();
    const due_date = body.due_date ? new Date(body.due_date) : new Date();
    await BillModel.create({
      _id: id,
      family_id,
      bill_name: body.bill_name ?? 'Bill',
      category: body.category ?? 'Other',
      amount: Number(body.amount) ?? 0,
      due_date,
      is_recurring: Boolean(body.is_recurring),
      recurrence_pattern: body.recurrence_pattern ?? null,
      status: body.status ?? 'pending',
    });
    const bill = await BillModel.findById(id).lean();
    if (!bill) {
      res.fail('Failed to create bill', 500);
      return;
    }
    res.success({ ...toId(bill), due_date: bill.due_date instanceof Date ? bill.due_date.toISOString().slice(0, 10) : bill.due_date }, 'Created', 201);
  },

  async updateBill(req: Request, res: Response): Promise<void> {
    const { familyId, billId } = req.params;
    const bill = await BillModel.findOne({ _id: billId, family_id: familyId });
    if (!bill) {
      res.fail('Bill not found', 404);
      return;
    }
    const body = req.body as Partial<{ bill_name: string; category: string; amount: number; due_date: string; is_recurring: boolean; recurrence_pattern: string; status: string }>;
    if (body.bill_name !== undefined) bill.bill_name = body.bill_name;
    if (body.category !== undefined) bill.category = body.category;
    if (body.amount !== undefined) bill.amount = body.amount;
    if (body.due_date !== undefined) bill.due_date = new Date(body.due_date);
    if (body.is_recurring !== undefined) bill.is_recurring = body.is_recurring;
    if (body.recurrence_pattern !== undefined) bill.recurrence_pattern = body.recurrence_pattern;
    if (body.status !== undefined) bill.status = body.status;
    await bill.save();
    const updated = bill.toObject();
    res.success({ ...toId(updated), due_date: updated.due_date instanceof Date ? updated.due_date.toISOString().slice(0, 10) : updated.due_date });
  },

  async deleteBill(req: Request, res: Response): Promise<void> {
    const { familyId, billId } = req.params;
    const deleted = await BillModel.findOneAndDelete({ _id: billId, family_id: familyId });
    if (!deleted) {
      res.fail('Bill not found', 404);
      return;
    }
    res.success({ ok: true });
  },

  // Cards
  async listCards(req: Request, res: Response): Promise<void> {
    const list = await CardModel.find({ family_id: req.params.familyId }).lean();
    res.success(list.map((c) => toId(c)));
  },

  async createCard(req: Request, res: Response): Promise<void> {
    const body = req.body as {
      family_id?: string;
      card_type?: 'credit' | 'debit';
      bank_name?: string;
      card_name?: string;
      last_four_digits?: string;
      card_limit?: number;
      billing_date?: number;
      status?: string;
    };
    const family_id = body.family_id;
    if (!family_id) {
      res.fail('family_id is required', 400);
      return;
    }
    const id = uuidv4();
    await CardModel.create({
      _id: id,
      family_id,
      card_type: body.card_type ?? 'debit',
      bank_name: body.bank_name ?? 'Bank',
      card_name: body.card_name ?? 'Card',
      last_four_digits: body.last_four_digits ?? '0000',
      card_limit: body.card_limit ?? null,
      billing_date: body.billing_date ?? null,
      status: (body.status as 'active' | 'inactive' | 'blocked') ?? 'active',
    });
    const card = await CardModel.findById(id).lean();
    res.success(card ? toId(card) : null, 'Created', 201);
  },

  async updateCard(req: Request, res: Response): Promise<void> {
    const { familyId, cardId } = req.params;
    const card = await CardModel.findOne({ _id: cardId, family_id: familyId });
    if (!card) {
      res.fail('Card not found', 404);
      return;
    }
    const body = req.body as Partial<{ card_type: string; bank_name: string; card_name: string; last_four_digits: string; card_limit: number; billing_date: number; status: string }>;
    if (body.card_type !== undefined) card.card_type = body.card_type as 'credit' | 'debit';
    if (body.bank_name !== undefined) card.bank_name = body.bank_name;
    if (body.card_name !== undefined) card.card_name = body.card_name;
    if (body.last_four_digits !== undefined) card.last_four_digits = body.last_four_digits;
    if (body.card_limit !== undefined) card.card_limit = body.card_limit;
    if (body.billing_date !== undefined) card.billing_date = body.billing_date;
    if (body.status !== undefined) card.status = body.status as 'active' | 'inactive' | 'blocked';
    await card.save();
    res.success(toId(card.toObject()));
  },

  async deleteCard(req: Request, res: Response): Promise<void> {
    const { familyId, cardId } = req.params;
    const deleted = await CardModel.findOneAndDelete({ _id: cardId, family_id: familyId });
    if (!deleted) {
      res.fail('Card not found', 404);
      return;
    }
    res.success({ ok: true });
  },
};
```

---

## `src/modules/finance/service.ts`

```typescript
/**
 * Finance AI service: Hugging Face when available, rule-based fallback otherwise.
 */
import * as hf from '../../lib/huggingface.js';

const TEXT_MODEL = 'google/flan-t5-base';
const ZERO_SHOT_MODEL = 'facebook/bart-large-mnli';

const TRANSACTION_CATEGORIES = [
  'Salary', 'Shopping', 'Food', 'Transport', 'Utilities', 'Subscription',
  'Healthcare', 'EMI/Loan', 'Rent', 'Groceries', 'Entertainment', 'Other',
];

const BILL_CATEGORIES = [
  'Electricity', 'Water', 'Gas', 'Internet', 'Phone', 'Rent', 'Insurance',
  'Subscription', 'Pocket Money', 'Other',
];

const TRANSACTION_KEYWORDS: Array<{ keywords: string[]; category: string; type: 'income' | 'expense' }> = [
  { keywords: ['salary', 'pay', 'credited', 'income', 'deposit'], category: 'Salary', type: 'income' },
  { keywords: ['amazon', 'flipkart', 'shopping', 'mall'], category: 'Shopping', type: 'expense' },
  { keywords: ['swiggy', 'zomato', 'food', 'restaurant', 'cafe', 'coffee', 'dining'], category: 'Food', type: 'expense' },
  { keywords: ['petrol', 'fuel', 'uber', 'ola', 'transport', 'travel'], category: 'Transport', type: 'expense' },
  { keywords: ['electricity', 'water', 'gas', 'broadband', 'internet', 'utility'], category: 'Utilities', type: 'expense' },
  { keywords: ['netflix', 'spotify', 'subscription', 'ott'], category: 'Subscription', type: 'expense' },
  { keywords: ['medical', 'hospital', 'pharmacy', 'doctor', 'health'], category: 'Healthcare', type: 'expense' },
  { keywords: ['emi', 'loan', 'repayment'], category: 'EMI/Loan', type: 'expense' },
  { keywords: ['rent', 'housing'], category: 'Rent', type: 'expense' },
  { keywords: ['grocery', 'vegetables', 'supermarket'], category: 'Groceries', type: 'expense' },
  { keywords: ['entertainment', 'movie', 'game'], category: 'Entertainment', type: 'expense' },
];

const BILL_KEYWORDS: Array<{ keywords: string[]; category: string }> = [
  { keywords: ['electric', 'power', 'discom'], category: 'Electricity' },
  { keywords: ['water', 'municipal'], category: 'Water' },
  { keywords: ['gas', 'lpg', 'cylinder'], category: 'Gas' },
  { keywords: ['internet', 'broadband', 'wifi', 'airtel', 'jio', 'bsnl', 'act'], category: 'Internet' },
  { keywords: ['phone', 'mobile', 'postpaid', 'prepaid', 'vodafone'], category: 'Phone' },
  { keywords: ['rent', 'house', 'lease'], category: 'Rent' },
  { keywords: ['insurance', 'policy'], category: 'Insurance' },
  { keywords: ['netflix', 'spotify', 'subscription', 'ott', 'streaming'], category: 'Subscription' },
  { keywords: ['pocket', 'allowance'], category: 'Pocket Money' },
];

export interface InsightsContext {
  total_balance: number;
  total_income: number;
  total_expense: number;
  savings_rate: number;
  upcoming_bills: number;
  month?: string;
}

export async function generateInsights(context: InsightsContext): Promise<{ insights: string; ai_available: boolean }> {
  const fallback =
    'Financial health looks stable. Key observations: Total balance and monthly flow are tracked. Consider keeping savings rate above 20%. Review upcoming bills and add more transactions for better insights.';
  if (!hf.isHuggingFaceAvailable()) {
    return { insights: fallback, ai_available: false };
  }
  const prompt = `Summarize this household finance snapshot in 2-3 short sentences. Be concise and actionable.
Total balance: ${context.total_balance} INR. This month income: ${context.total_income} INR, expenses: ${context.total_expense} INR. Savings rate: ${context.savings_rate}%. Upcoming bills: ${context.upcoming_bills}.
Give one paragraph of observations and one recommendation.`;
  const out = await hf.textGeneration(TEXT_MODEL, prompt, { max_new_tokens: 150 });
  if (out && out.length > 20) {
    return { insights: out, ai_available: true };
  }
  return { insights: fallback, ai_available: false };
}

const DEFAULT_SAVINGS_TIPS = [
  'Track small daily expenses to find easy cuts.',
  'Set a monthly cap for discretionary spending.',
  'Review subscriptions and cancel unused ones.',
];

export async function getSavingsTips(): Promise<{ tips: string[]; ai_available: boolean }> {
  if (!hf.isHuggingFaceAvailable()) {
    return { tips: DEFAULT_SAVINGS_TIPS, ai_available: false };
  }
  const prompt =
    'Give exactly 3 short savings tips for a household (one per line, no numbering). Focus on daily habits and subscriptions.';
  const out = await hf.textGeneration(TEXT_MODEL, prompt, { max_new_tokens: 120 });
  if (out) {
    const lines = out.split(/[\n.]/).map((s) => s.trim()).filter((s) => s.length > 10);
    if (lines.length >= 2) {
      return { tips: lines.slice(0, 3), ai_available: true };
    }
  }
  return { tips: DEFAULT_SAVINGS_TIPS, ai_available: false };
}

export async function suggestTransactionCategory(
  description: string,
  amount?: number,
  type?: string
): Promise<{ category: string; type?: 'income' | 'expense' }> {
  const desc = (description || '').toLowerCase();
  const fallback = { category: 'Other', type: 'expense' as const };
  if (hf.isHuggingFaceAvailable()) {
    const result = await hf.zeroShotClassification(
      ZERO_SHOT_MODEL,
      desc + (amount != null ? ` Amount: ${amount}.` : ''),
      TRANSACTION_CATEGORIES
    );
    if (result) {
      const suggestedType: 'income' | 'expense' = result.label === 'Salary' ? 'income' : 'expense';
      const outType = type === 'income' || type === 'expense' ? type : suggestedType;
      return { category: result.label, type: outType };
    }
  }
  for (const { keywords, category, type: t } of TRANSACTION_KEYWORDS) {
    if (keywords.some((k) => desc.includes(k))) return { category, type: t };
  }
  return fallback;
}

export async function suggestBillCategory(billName: string): Promise<{ category: string }> {
  const name = (billName || '').toLowerCase();
  const fallback = { category: 'Other' };
  if (hf.isHuggingFaceAvailable()) {
    const result = await hf.zeroShotClassification(ZERO_SHOT_MODEL, name, BILL_CATEGORIES);
    if (result) return { category: result.label };
  }
  for (const { keywords, category } of BILL_KEYWORDS) {
    if (keywords.some((k) => name.includes(k))) return { category };
  }
  return fallback;
}

export interface ParsedTransaction {
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description?: string;
  transaction_date?: string;
}

export async function parseSmsToTransaction(smsText: string): Promise<ParsedTransaction | null> {
  const text = (smsText || '').trim();
  if (!text) return null;
  if (hf.isHuggingFaceAvailable()) {
    const prompt = `From this Indian bank SMS, extract: amount (number), type (income or expense), category (one word), short description, date (YYYY-MM-DD if present). Reply in one line: amount|type|category|description|date. SMS: ${text.slice(0, 400)}`;
    const out = await hf.textGeneration(TEXT_MODEL, prompt, { max_new_tokens: 80 });
    if (out) {
      const parts = out.split('|').map((s) => s.trim());
      const amount = parseFloat(parts[0]?.replace(/[^0-9.-]/g, '') || '0') || 0;
      const type = (parts[1]?.toLowerCase().includes('income') ? 'income' : 'expense') as 'income' | 'expense';
      const category = parts[2] || 'Other';
      const description = parts[3] || text.slice(0, 100);
      const transaction_date = parts[4]?.match(/\d{4}-\d{2}-\d{2}/)?.[0];
      if (amount > 0) {
        return { amount, type, category, description, transaction_date };
      }
    }
  }
  const numMatch = text.match(/(?:debited|credited|rs\.?|inr)\s*[\d,]+(?:\.\d{2})?|[\d,]+(?:\.\d{2})?\s*(?:debited|credited)/i);
  const amountStr = numMatch?.[0]?.replace(/[^0-9.]/g, '') || '';
  const amount = parseFloat(amountStr) || 0;
  const type: 'income' | 'expense' = /credited|deposit|received/i.test(text) ? 'income' : 'expense';
  const categoryRes = await suggestTransactionCategory(text, amount, type);
  const dateMatch = text.match(/\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}-\d{2}-\d{2}/);
  let transaction_date: string | undefined;
  if (dateMatch) {
    const d = new Date(dateMatch[0]);
    if (!Number.isNaN(d.getTime())) transaction_date = d.toISOString().slice(0, 10);
  }
  return { amount, type, category: categoryRes.category, description: text.slice(0, 120), transaction_date };
}

export interface ParsedCard {
  bank_name?: string;
  card_name?: string;
  last_four_digits?: string;
  card_type?: 'credit' | 'debit';
  card_limit?: number;
}

export async function parseSmsToCard(smsText: string): Promise<ParsedCard | null> {
  const text = (smsText || '').trim();
  if (!text) return null;
  if (hf.isHuggingFaceAvailable()) {
    const prompt = `From this bank card SMS, extract: bank name, card name, last 4 digits, card type (credit or debit), credit limit (number if present). Reply: bank|cardname|last4|type|limit. SMS: ${text.slice(0, 400)}`;
    const out = await hf.textGeneration(TEXT_MODEL, prompt, { max_new_tokens: 60 });
    if (out) {
      const parts = out.split('|').map((s) => s.trim());
      const last4 = parts[2]?.replace(/\D/g, '').slice(-4) || undefined;
      const limit = parseFloat(parts[4]?.replace(/[^0-9.]/g, '') || '0') || undefined;
      return {
        bank_name: parts[0] || undefined,
        card_name: parts[1] || undefined,
        last_four_digits: last4,
        card_type: parts[3]?.toLowerCase().includes('credit') ? 'credit' : 'debit',
        card_limit: limit,
      };
    }
  }
  const last4Match = text.match(/(?:ending|xxxx\s*|\.\s*)(\d{4})|(\d{4})\s*(?:is|has been)/i);
  const last_four_digits = last4Match?.[1] || last4Match?.[2];
  const limitMatch = text.match(/(?:limit|credit limit)[:\s]*[\d,]+(?:\.\d{2})?|rs\.?\s*[\d,]+/i);
  const card_limit = limitMatch ? parseFloat(limitMatch[0].replace(/[^0-9.]/g, '')) : undefined;
  const bankMatch = text.match(/(hdfc|icici|sbi|axis|kotak|pnb|bob|yes bank|indusind)/i);
  return {
    bank_name: bankMatch?.[0] || undefined,
    card_name: undefined,
    last_four_digits: last_four_digits ?? undefined,
    card_type: /credit/i.test(text) ? 'credit' : 'debit',
    card_limit,
  };
}
```

---

## `src/modules/finance/aggregate.ts`

```typescript
/**
 * Aggregate family finance data for AI insights (read-only).
 */
import { BankAccountModel } from '../../db/schemas/BankAccount.js';
import { TransactionModel } from '../../db/schemas/Transaction.js';
import { BillModel } from '../../db/schemas/Bill.js';
import type { InsightsContext } from './service.js';

export async function getInsightsContext(
  familyId: string,
  month?: string
): Promise<InsightsContext> {
  const [accounts, transactions, bills] = await Promise.all([
    BankAccountModel.find({ family_id: familyId }).lean(),
    month ? getTransactionsForMonth(familyId, month) : [],
    BillModel.find({ family_id: familyId, status: 'pending' }).lean(),
  ]);

  const total_balance = accounts.reduce((sum, a) => sum + Number(a.balance ?? 0), 0);

  const total_income = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const total_expense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const savings_rate =
    total_income > 0 ? ((total_income - total_expense) / total_income) * 100 : 0;

  return {
    total_balance,
    total_income,
    total_expense,
    savings_rate: Math.round(savings_rate * 100) / 100,
    upcoming_bills: bills.length,
    month,
  };
}

async function getTransactionsForMonth(
  familyId: string,
  monthStr: string
): Promise<Array<{ type: string; amount: number }>> {
  const [y, m] = monthStr.split('-').map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0);
  const list = await TransactionModel.find({
    family_id: familyId,
    transaction_date: { $gte: start, $lte: end },
  })
    .select('type amount')
    .lean();
  return list as Array<{ type: string; amount: number }>;
}
```

---

## `src/lib/huggingface.ts`

```typescript
/**
 * Hugging Face Inference API client (serverless).
 * Uses fetch to call text-generation and zero-shot-classification.
 * No API key = all methods return null (caller should fallback).
 */
import { config } from '../../config/index.js';

const HF_BASE = 'https://api-inference.huggingface.co/models';

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.huggingFaceApiKey) {
    headers['Authorization'] = `Bearer ${config.huggingFaceApiKey}`;
  }
  return headers;
}

export async function textGeneration(
  model: string,
  inputs: string,
  options?: { max_new_tokens?: number; temperature?: number }
): Promise<string | null> {
  if (!config.huggingFaceApiKey) return null;
  try {
    const res = await fetch(`${HF_BASE}/${model}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        inputs,
        parameters: {
          max_new_tokens: options?.max_new_tokens ?? 200,
          temperature: options?.temperature ?? 0.7,
          return_full_text: false,
        },
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.warn('[HF] textGeneration failed:', res.status, err);
      return null;
    }
    const out = (await res.json()) as Array<{ generated_text?: string }> | { generated_text?: string };
    if (Array.isArray(out) && out[0]?.generated_text) return out[0].generated_text.trim();
    if (out && typeof (out as { generated_text?: string }).generated_text === 'string') {
      return (out as { generated_text: string }).generated_text.trim();
    }
    return null;
  } catch (e) {
    console.warn('[HF] textGeneration error:', e);
    return null;
  }
}

/** Zero-shot classification: returns the top label or null. */
export async function zeroShotClassification(
  model: string,
  inputs: string,
  candidateLabels: string[]
): Promise<{ label: string; score: number } | null> {
  if (!config.huggingFaceApiKey) return null;
  if (candidateLabels.length === 0) return null;
  try {
    const res = await fetch(`${HF_BASE}/${model}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        inputs,
        parameters: { candidate_labels: candidateLabels },
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.warn('[HF] zeroShot failed:', res.status, err);
      return null;
    }
    const out = (await res.json()) as {
      sequence?: string;
      labels?: string[];
      scores?: number[];
    };
    if (out?.labels?.[0] !== undefined && out?.scores?.[0] !== undefined) {
      return { label: out.labels[0], score: out.scores[0] };
    }
    return null;
  } catch (e) {
    console.warn('[HF] zeroShot error:', e);
    return null;
  }
}

/** Whether the client can call HF (has key). */
export function isHuggingFaceAvailable(): boolean {
  return Boolean(config.huggingFaceApiKey);
}
```

---

## `src/scripts/seed-rbac.ts`

```typescript
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
```

---

## `src/db/schemas/User.ts`

```typescript
import mongoose, { Schema, Model } from 'mongoose';

export interface IUserDoc {
  _id: string;
  email: string;
  password: string;
  full_name: string;
  phone: string | null;
  role: 'user' | 'admin' | 'root';
  is_active: number;
  created_at?: Date;
  updated_at?: Date;
}

const userSchema = new Schema<IUserDoc>(
  {
    _id: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    full_name: { type: String, default: '' },
    phone: { type: String, default: null },
    role: { type: String, default: 'user', enum: ['user', 'admin', 'root'] },
    is_active: { type: Number, default: 1 },
  },
  { timestamps: true, id: false }
);

userSchema.index({ email: 1 });

export const UserModel: Model<IUserDoc> = mongoose.model<IUserDoc>('User', userSchema);
```

---

## `src/db/schemas/Family.ts`

```typescript
import mongoose, { Schema, Model } from 'mongoose';

export interface IFamilyDoc {
  _id: string;
  name: string;
  address: string | null;
  created_by: string;
  created_at?: Date;
  updated_at?: Date;
}

const familySchema = new Schema<IFamilyDoc>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    address: { type: String, default: null },
    created_by: { type: String, required: true, ref: 'User' },
  },
  { timestamps: true, id: false }
);

export const FamilyModel: Model<IFamilyDoc> = mongoose.model<IFamilyDoc>('Family', familySchema);
```

---

## `src/db/schemas/FamilyMember.ts`

```typescript
import mongoose, { Schema, Model } from 'mongoose';

export interface IFamilyMemberDoc {
  _id: string;
  family_id: string;
  user_id: string;
  role: string;
  relation: string | null;
  status: string;
  invitation_email: string | null;
  invitation_sent_at: Date | null;
  joined_at: Date;
  created_at?: Date;
  updated_at?: Date;
}

const familyMemberSchema = new Schema<IFamilyMemberDoc>(
  {
    _id: { type: String, required: true },
    family_id: { type: String, required: true, ref: 'Family' },
    user_id: { type: String, required: true, ref: 'User' },
    role: { type: String, default: 'member' },
    relation: { type: String, default: null },
    status: { type: String, default: 'active' },
    invitation_email: { type: String, default: null },
    invitation_sent_at: { type: Date, default: null },
    joined_at: { type: Date, default: Date.now },
  },
  { timestamps: true, id: false }
);

familyMemberSchema.index({ family_id: 1, user_id: 1 }, { unique: true });
familyMemberSchema.index({ family_id: 1 });
familyMemberSchema.index({ user_id: 1 });

export const FamilyMemberModel: Model<IFamilyMemberDoc> = mongoose.model<IFamilyMemberDoc>(
  'FamilyMember',
  familyMemberSchema
);
```

---

## `src/db/schemas/BankAccount.ts`

```typescript
import mongoose, { Schema, Model } from 'mongoose';

export interface IBankAccountDoc {
  _id: string;
  family_id: string;
  account_name: string;
  account_number: string | null;
  bank_name: string;
  account_type: string;
  balance: number;
  currency: string;
  created_at?: Date;
  updated_at?: Date;
}

const bankAccountSchema = new Schema<IBankAccountDoc>(
  {
    _id: { type: String, required: true },
    family_id: { type: String, required: true, ref: 'Family' },
    account_name: { type: String, required: true },
    account_number: { type: String, default: null },
    bank_name: { type: String, required: true },
    account_type: { type: String, default: 'savings' },
    balance: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
  },
  { timestamps: true, id: false }
);

bankAccountSchema.index({ family_id: 1 });

export const BankAccountModel: Model<IBankAccountDoc> = mongoose.model<IBankAccountDoc>(
  'BankAccount',
  bankAccountSchema
);
```

---

## `src/db/schemas/Transaction.ts`

```typescript
import mongoose, { Schema, Model } from 'mongoose';

export interface ITransactionDoc {
  _id: string;
  family_id: string;
  account_id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string | null;
  transaction_date: Date;
  created_by: string;
  currency: string | null;
  merchant_name: string | null;
  payment_method: string | null;
  bank_name: string | null;
  created_at?: Date;
  updated_at?: Date;
}

const transactionSchema = new Schema<ITransactionDoc>(
  {
    _id: { type: String, required: true },
    family_id: { type: String, required: true, ref: 'Family' },
    account_id: { type: String, required: true, ref: 'BankAccount' },
    type: { type: String, required: true, enum: ['income', 'expense'] },
    category: { type: String, required: true },
    amount: { type: Number, required: true },
    description: { type: String, default: null },
    transaction_date: { type: Date, required: true },
    created_by: { type: String, required: true, ref: 'User' },
    currency: { type: String, default: null },
    merchant_name: { type: String, default: null },
    payment_method: { type: String, default: null },
    bank_name: { type: String, default: null },
  },
  { timestamps: true, id: false }
);

transactionSchema.index({ family_id: 1 });
transactionSchema.index({ transaction_date: 1 });
transactionSchema.index({ type: 1 });

export const TransactionModel: Model<ITransactionDoc> = mongoose.model<ITransactionDoc>(
  'Transaction',
  transactionSchema
);
```

---

## `src/db/schemas/Bill.ts`

```typescript
import mongoose, { Schema, Model } from 'mongoose';

export interface IBillDoc {
  _id: string;
  family_id: string;
  bill_name: string;
  category: string;
  amount: number;
  due_date: Date;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  status: string;
  created_at?: Date;
  updated_at?: Date;
}

const billSchema = new Schema<IBillDoc>(
  {
    _id: { type: String, required: true },
    family_id: { type: String, required: true, ref: 'Family' },
    bill_name: { type: String, required: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true },
    due_date: { type: Date, required: true },
    is_recurring: { type: Boolean, default: false },
    recurrence_pattern: { type: String, default: null },
    status: { type: String, default: 'pending' },
  },
  { timestamps: true, id: false }
);

billSchema.index({ family_id: 1 });
billSchema.index({ due_date: 1 });
billSchema.index({ status: 1 });

export const BillModel: Model<IBillDoc> = mongoose.model<IBillDoc>('Bill', billSchema);
```

---

## `src/db/schemas/Card.ts`

```typescript
import mongoose, { Schema, Model } from 'mongoose';

export interface ICardDoc {
  _id: string;
  family_id: string;
  card_type: 'credit' | 'debit';
  bank_name: string;
  card_name: string;
  last_four_digits: string;
  card_limit: number | null;
  billing_date: number | null;
  status: 'active' | 'inactive' | 'blocked';
  created_at?: Date;
  updated_at?: Date;
}

const cardSchema = new Schema<ICardDoc>(
  {
    _id: { type: String, required: true },
    family_id: { type: String, required: true, ref: 'Family' },
    card_type: { type: String, required: true, enum: ['credit', 'debit'] },
    bank_name: { type: String, required: true },
    card_name: { type: String, required: true },
    last_four_digits: { type: String, required: true },
    card_limit: { type: Number, default: null },
    billing_date: { type: Number, default: null },
    status: { type: String, default: 'active', enum: ['active', 'inactive', 'blocked'] },
  },
  { timestamps: true, id: false }
);

cardSchema.index({ family_id: 1 });

export const CardModel: Model<ICardDoc> = mongoose.model<ICardDoc>('Card', cardSchema);
```

---

## `src/db/schemas/Role.ts`

```typescript
import mongoose, { Schema, Model } from 'mongoose';

export interface IRoleDoc {
  _id: string;
  name: string;
  description: string | null;
  created_at?: Date;
  updated_at?: Date;
}

const roleSchema = new Schema<IRoleDoc>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, unique: true },
    description: { type: String, default: null },
  },
  { timestamps: true, id: false }
);

export const RoleModel: Model<IRoleDoc> = mongoose.model<IRoleDoc>('Role', roleSchema);
```

---

## `src/db/schemas/Permission.ts`

```typescript
import mongoose, { Schema, Model } from 'mongoose';

export interface IPermissionDoc {
  _id: string;
  name: string;
  resource: string;
  action: string;
  description: string | null;
  created_at?: Date;
  updated_at?: Date;
}

const permissionSchema = new Schema<IPermissionDoc>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, unique: true },
    resource: { type: String, required: true },
    action: { type: String, required: true },
    description: { type: String, default: null },
  },
  { timestamps: true, id: false }
);

permissionSchema.index({ resource: 1, action: 1 }, { unique: true });

export const PermissionModel: Model<IPermissionDoc> = mongoose.model<IPermissionDoc>(
  'Permission',
  permissionSchema
);
```

---

## `src/db/schemas/Group.ts`

```typescript
import mongoose, { Schema, Model } from 'mongoose';

export interface IGroupDoc {
  _id: string;
  name: string;
  description: string | null;
  created_at?: Date;
  updated_at?: Date;
}

const groupSchema = new Schema<IGroupDoc>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: null },
  },
  { timestamps: true, id: false }
);

export const GroupModel: Model<IGroupDoc> = mongoose.model<IGroupDoc>('Group', groupSchema);
```

---

## `src/db/schemas/UserRole.ts`

```typescript
import mongoose, { Schema, Model } from 'mongoose';

export interface IUserRoleDoc {
  user_id: string;
  role_id: string;
  created_at?: Date;
}

const userRoleSchema = new Schema<IUserRoleDoc>(
  {
    user_id: { type: String, required: true, ref: 'User' },
    role_id: { type: String, required: true, ref: 'Role' },
  },
  { timestamps: true }
);

userRoleSchema.index({ user_id: 1, role_id: 1 }, { unique: true });

export const UserRoleModel: Model<IUserRoleDoc> = mongoose.model<IUserRoleDoc>(
  'UserRole',
  userRoleSchema
);
```

---

## `src/db/schemas/RolePermission.ts`

```typescript
import mongoose, { Schema, Model } from 'mongoose';

export interface IRolePermissionDoc {
  role_id: string;
  permission_id: string;
  created_at?: Date;
}

const rolePermissionSchema = new Schema<IRolePermissionDoc>(
  {
    role_id: { type: String, required: true, ref: 'Role' },
    permission_id: { type: String, required: true, ref: 'Permission' },
  },
  { timestamps: true }
);

rolePermissionSchema.index({ role_id: 1, permission_id: 1 }, { unique: true });

export const RolePermissionModel: Model<IRolePermissionDoc> = mongoose.model<IRolePermissionDoc>(
  'RolePermission',
  rolePermissionSchema
);
```

---

## `src/db/schemas/UserGroup.ts`

```typescript
import mongoose, { Schema, Model } from 'mongoose';

export interface IUserGroupDoc {
  user_id: string;
  group_id: string;
  created_at?: Date;
}

const userGroupSchema = new Schema<IUserGroupDoc>(
  {
    user_id: { type: String, required: true, ref: 'User' },
    group_id: { type: String, required: true, ref: 'Group' },
  },
  { timestamps: true }
);

userGroupSchema.index({ user_id: 1, group_id: 1 }, { unique: true });

export const UserGroupModel: Model<IUserGroupDoc> = mongoose.model<IUserGroupDoc>(
  'UserGroup',
  userGroupSchema
);
```

---

## `src/db/schemas/GroupRole.ts`

```typescript
import mongoose, { Schema, Model } from 'mongoose';

export interface IGroupRoleDoc {
  group_id: string;
  role_id: string;
  created_at?: Date;
}

const groupRoleSchema = new Schema<IGroupRoleDoc>(
  {
    group_id: { type: String, required: true, ref: 'Group' },
    role_id: { type: String, required: true, ref: 'Role' },
  },
  { timestamps: true }
);

groupRoleSchema.index({ group_id: 1, role_id: 1 }, { unique: true });

export const GroupRoleModel: Model<IGroupRoleDoc> = mongoose.model<IGroupRoleDoc>(
  'GroupRole',
  groupRoleSchema
);
```

---

*Generated from `microservice/` source. Paths and layout match current codebase (`src/db/`, `src/modules/`, `src/shared/`). Excludes `node_modules` and `dist`.*
