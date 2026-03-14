# Griham Microservice – Full Source (Markdown)

Single-file snapshot of the entire microservice source. Layout: Clean Architecture (config, domain, infrastructure).

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
    "seed": "tsx src/infrastructure/persistence/mongodb/seed.ts"
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

## `src/domain/response.ts`

```typescript
/**
 * Domain: standard API response shapes (success/error).
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

## `src/server.ts`

```typescript
/**
 * Griham microservice entry point.
 * Build: npm run build  →  Start: npm start
 * Dev:   npm run dev     (tsx watch)
 */
import { config } from '../config/index.js';
import { connectMongo } from './infrastructure/persistence/mongodb/connection.js';

async function main(): Promise<void> {
  await connectMongo();
  const app = (await import('./infrastructure/http/app.js')).default;
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

## `src/infrastructure/persistence/mongodb/connection.ts`

```typescript
import mongoose from 'mongoose';
import { config } from '../../../../config/index.js';

export async function connectMongo(): Promise<void> {
  await mongoose.connect(config.mongodbUri);
}

export function getConnection(): mongoose.Connection {
  return mongoose.connection;
}
```

---

## `src/infrastructure/http/app.ts`

```typescript
import express, { Express } from 'express';
import cors from 'cors';
import { config } from '../../../config/index.js';
import { authRoutes } from './routes/auth.js';
import { responseMiddleware } from './middleware/response.js';

const app: Express = express();

app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json());
app.use(responseMiddleware);

app.use('/api', authRoutes);

export default app;
```

---

## `src/infrastructure/http/middleware/response.ts`

```typescript
import type { Request, Response, NextFunction } from 'express';
import { success, error, type SuccessResponse, type ErrorResponse } from '../../../domain/response.js';

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

## `src/infrastructure/http/middleware/auth.ts`

```typescript
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../../../config/index.js';

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

## `src/infrastructure/http/routes/auth.ts`

```typescript
import { Router } from 'express';
import { authController } from '../controllers/auth.js';
import { authMiddleware } from '../middleware/auth.js';

export const authRoutes = Router();

authRoutes.post('/auth/register', authController.register);
authRoutes.post('/auth/login', authController.login);
authRoutes.get('/auth/me', authMiddleware, authController.me);
```

---

## `src/infrastructure/http/controllers/auth.ts`

```typescript
import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../../../config/index.js';
import { UserModel } from '../../persistence/mongodb/schemas/User.js';
import { UserRoleModel } from '../../persistence/mongodb/schemas/UserRole.js';
import { RoleModel } from '../../persistence/mongodb/schemas/Role.js';
import { PermissionModel } from '../../persistence/mongodb/schemas/Permission.js';
import { RolePermissionModel } from '../../persistence/mongodb/schemas/RolePermission.js';

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

## `src/infrastructure/persistence/mongodb/schemas/User.ts`

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

## `src/infrastructure/persistence/mongodb/schemas/Family.ts`

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

## `src/infrastructure/persistence/mongodb/schemas/FamilyMember.ts`

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

## `src/infrastructure/persistence/mongodb/schemas/BankAccount.ts`

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

## `src/infrastructure/persistence/mongodb/schemas/Transaction.ts`

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

## `src/infrastructure/persistence/mongodb/schemas/Bill.ts`

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

## `src/infrastructure/persistence/mongodb/schemas/Card.ts`

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

## `src/infrastructure/persistence/mongodb/schemas/Role.ts`

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

## `src/infrastructure/persistence/mongodb/schemas/Permission.ts`

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

## `src/infrastructure/persistence/mongodb/schemas/Group.ts`

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

## `src/infrastructure/persistence/mongodb/schemas/UserRole.ts`

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

## `src/infrastructure/persistence/mongodb/schemas/RolePermission.ts`

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

## `src/infrastructure/persistence/mongodb/schemas/UserGroup.ts`

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

## `src/infrastructure/persistence/mongodb/schemas/GroupRole.ts`

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

*Generated from `microservice/` source. Excludes `node_modules` and `dist`.*
