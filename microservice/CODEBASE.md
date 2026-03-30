# Griham Microservice — Codebase Reference

> **Purpose**: Complete reference for any LLM to understand, navigate, and modify this codebase quickly.  
> **Last updated**: 2026-03-30

---

## 1. What Is This?

**Griham** is a household management platform. This microservice is the **Node.js + Express + MongoDB** backend API. It exposes a REST API consumed by a React (Vite) frontend. The backend is written in **TypeScript** and follows a **modular architecture** with clear separation between modules.

### Tech Stack

| Layer         | Technology                                  |
| ------------- | ------------------------------------------- |
| Runtime       | Node.js ≥18, ESM modules (`"type": "module"`) |
| Language      | TypeScript 5.x (strict mode)                |
| Framework     | Express 4.x                                 |
| Database      | MongoDB via Mongoose 8.x                    |
| Auth          | JWT (jsonwebtoken) + bcryptjs               |
| AI            | Multi-provider (Ollama / OpenAI / HuggingFace) |
| Dev server    | tsx (watch mode)                             |
| ID generation | uuid v4 (string `_id` on all documents)     |

### Key Design Decisions

1. **String UUIDs as `_id`**: Every Mongoose schema uses `_id: String` (UUID v4), not ObjectId. All references are string-based.
2. **Lean virtuals**: All schemas use `mongoose-lean-virtuals` plugin and a virtual `id` getter (`return this._id`). Queries use `.lean({ virtuals: true })` to get plain objects with an `id` field.
3. **Standardized response envelope**: Every response goes through `res.success(data, message, status)` or `res.fail(message, status, errors)`. Response shape:
   ```json
   // Success
   { "success": true, "message": "...", "data": ..., "status": 200 }
   // Error
   { "success": false, "message": "...", "errors": ..., "status": 400 }
   ```
4. **Family-scoped data**: Almost all domain data (finance, events, assets, contacts) is scoped to a `family_id`. API routes typically include `:familyId` as a path parameter.
5. **No ORMs or query builders**: Direct Mongoose Model calls (`.find()`, `.create()`, `.findByIdAndUpdate()`, etc.).

---

## 2. Directory Structure

```
microservice/
├── config/
│   └── index.ts              # Central config — reads .env, exports typed `config` object
├── src/
│   ├── server.ts              # Entry point — connects MongoDB, starts Express
│   ├── app.ts                 # Express app — middleware + route mounting
│   ├── db/
│   │   ├── connection.ts      # connectMongo() — connects + syncs indexes
│   │   └── schemas/           # 22 Mongoose schemas (one file per model)
│   ├── lib/
│   │   ├── huggingface.ts     # Legacy re-export (unused)
│   │   └── ai/
│   │       ├── index.ts       # AI client facade — provider switching
│   │       ├── types.ts       # AiClient interface, TextGenerationOptions, etc.
│   │       ├── requests.ts    # HTTP helpers for AI providers
│   │       ├── utils.ts       # AI utility functions
│   │       ├── providers/
│   │       │   ├── huggingface.ts
│   │       │   ├── ollama.ts
│   │       │   └── openai.ts
│   │       └── prompts/
│   │           ├── finance.ts # Prompt builders for finance AI features
│   │           ├── contacts.ts# Prompt builder for contacts cleanup
│   │           ├── helper.ts  # SMS normalization helper
│   │           └── registry.ts# Central prompt registry (for admin prompt lab)
│   ├── modules/               # Feature modules
│   │   ├── auth/              # Registration, login, JWT, RBAC resolution
│   │   ├── admin/             # Root-only admin panel (RBAC, users, AI playground)
│   │   ├── families/          # Family CRUD + member management
│   │   ├── finance/           # Accounts, transactions, bills, cards, insurance, investments, loans, AI
│   │   ├── contacts/          # Contact sync, list, cleanup (AI-powered)
│   │   ├── assets/            # Asset tracking (property, vehicle, gadget, document)
│   │   └── events/            # Event management with sub-events and participants
│   ├── shared/
│   │   ├── response.ts        # success() / error() envelope helpers
│   │   └── middleware/
│   │       ├── auth.ts        # JWT auth middleware (adds req.auth)
│   │       ├── requireRoot.ts # Checks user.role === 'root'
│   │       └── response.ts    # Attaches res.success() / res.fail() to every response
│   └── scripts/
│       └── seed-rbac.ts       # Seeds roles, permissions, groups, root user
├── .env.example               # Environment variable template
├── package.json
└── tsconfig.json
```

---

## 3. Database Schemas (22 Models)

### Core / Auth

| Model              | Collection         | Key Fields                                           | Notes                           |
| ------------------- | ------------------ | ---------------------------------------------------- | ------------------------------- |
| **User**            | `users`            | `email`, `password` (bcrypt), `full_name`, `phone`, `role` (user/admin/root), `is_active` | Entry point for auth            |
| **Role**            | `roles`            | `name` (unique), `description`                       | RBAC role definition            |
| **Permission**      | `permissions`      | `name` (unique), `resource`, `action`                | `resource.action` pattern (e.g. `finance.accounts.read`) |
| **RolePermission**  | `rolepermissions`  | `role_id`, `permission_id`                           | Many-to-many join               |
| **UserRole**        | `userroles`        | `user_id`, `role_id`                                 | User → Role assignment          |
| **Group**           | `groups`           | `name`, `description`                                | Logical user groups             |
| **UserGroup**       | `usergroups`       | `user_id`, `group_id`                                | User → Group membership         |
| **GroupRole**       | `grouproles`       | `group_id`, `role_id`                                | Group → Role mapping            |

### Family

| Model              | Collection         | Key Fields                                           | Notes                           |
| ------------------- | ------------------ | ---------------------------------------------------- | ------------------------------- |
| **Family**          | `families`         | `name`, `address`, `created_by` (→User)              | Top-level family entity         |
| **FamilyMember**    | `familymembers`    | `family_id`, `user_id`, `role`, `relation`, `status` | Unique on (family_id, user_id)  |

### Finance

| Model              | Collection         | Key Fields                                           | Notes                           |
| ------------------- | ------------------ | ---------------------------------------------------- | ------------------------------- |
| **BankAccount**     | `bankaccounts`     | `family_id`, `account_name`, `bank_name`, `balance`, `currency` (default: INR) | Scoped to family               |
| **Transaction**     | `transactions`     | `family_id`, `account_id`, `type` (income/expense), `category`, `amount`, `transaction_date`, `event_id?`, `sub_event_id?`, `source_type?` | Core financial record |
| **Bill**            | `bills`            | `family_id`, `bill_name`, `category`, `amount`, `due_date`, `is_recurring`, `status` | Recurring bill tracking        |
| **Card**            | `cards`            | `family_id`, `card_type` (credit/debit), `bank_name`, `last_four_digits`, `card_limit`, `status` | Has `pre('validate')` hook to auto-fill bank_name |
| **Insurance**       | `fin_insurance`    | `family_id`, `type` (life/health/vehicle/term/other), `provider`, `policyName`, `premiumAmount`, `coverageAmount`, `status` | Custom collection name         |
| **Investment**      | `fin_investment`   | `family_id`, `type` (mutual_fund/stock/fd/other), `name`, `folioNumber`, `sipAmount`, `currentValue`, `investedAmount`, `units`, `nav`, `status` | Custom collection name |
| **Loan**            | `fin_loans`        | `family_id`, `name`, `lender`, `principalAmount`, `interestRate`, `emiAmount`, `outstandingPrincipal`, `type` (home/car/personal/education/other), `status` | Custom collection name |

### Contacts

| Model              | Collection         | Key Fields                                           | Notes                           |
| ------------------- | ------------------ | ---------------------------------------------------- | ------------------------------- |
| **Contact**         | `contacts`         | `family_id`, `user_id`, `name`, `phone`, `email`, `phone_norm`, `email_norm` | De-duped by (family_id, phone_norm) via partial unique index |

### Assets

| Model              | Collection         | Key Fields                                           | Notes                           |
| ------------------- | ------------------ | ---------------------------------------------------- | ------------------------------- |
| **Asset**           | `assets`           | `family_id`, `asset_type` (property/vehicle/gadget/document), `name`, `purchase_price`, `current_value`, `expiry_date` | Asset register |

### Events

| Model                | Collection           | Key Fields                                         | Notes                           |
| --------------------- | -------------------- | -------------------------------------------------- | ------------------------------- |
| **Event**             | `events`             | `family_id`, `name`, `type` (marriage/anniversary/birthday/other), `start_date`, `total_budget`, `status` (planned/ongoing/completed) | Main event record |
| **SubEvent**          | `subevents`          | `event_id`, `name`, `date_time`, `budget`          | Sub-events within an event      |
| **EventParticipant**  | `eventparticipants`  | `event_id`, `contact_id`, `role` (guest/vendor/host), `rsvp_status`, `gifts[]` | Links contacts to events |

---

## 4. API Routes

All routes are mounted under `/api`. Auth is enforced via `authMiddleware` on all routes except register/login.

### Auth (`/api/auth`)

| Method | Path               | Handler                  | Auth | Description               |
| ------ | ------------------- | ------------------------ | ---- | ------------------------- |
| POST   | `/auth/register`    | `authController.register`| No   | Register user, return JWT + RBAC |
| POST   | `/auth/login`       | `authController.login`   | No   | Login, return JWT + RBAC  |
| GET    | `/auth/me`          | `authController.me`      | Yes  | Current user + RBAC       |

**Auth response includes**: User object + `rbac_roles[]` + `rbac_permissions[]` + JWT token.

### Families (`/api/families`)

| Method | Path                                    | Description                   |
| ------ | ---------------------------------------- | ----------------------------- |
| POST   | `/families`                              | Create family                 |
| GET    | `/families`                              | List user's families          |
| GET    | `/families/me`                           | Get current family            |
| GET    | `/families/:id`                          | Get family by ID              |
| PUT    | `/families/:id`                          | Update address                |
| GET    | `/families/:id/members`                  | List members                  |
| POST   | `/families/:id/members`                  | Add member                    |
| PUT    | `/families/:householdId/members/:memberId` | Update member               |

**Note**: `/api/households/*` is aliased to `/api/families/*` for backward compatibility.

### Finance (`/api/finance`)

All routes require auth. CRUD endpoints follow consistent pattern: `GET /:familyId`, `POST /`, `PUT /:familyId/:itemId`, `DELETE /:familyId/:itemId`.

#### Data Endpoints (via `financeDataController`)

| Resource        | List                                   | Create      | Update                           | Delete                           | Extras                            |
| --------------- | -------------------------------------- | ----------- | -------------------------------- | -------------------------------- | --------------------------------- |
| **Accounts**    | `GET /accounts/:familyId`              | `POST /accounts` | `PUT /accounts/:fid/:aid`   | `DELETE /accounts/:fid/:aid`     | —                                 |
| **Transactions**| `GET /transactions/:familyId`          | `POST /transactions` | `PUT /transactions/:fid/:tid` | `DELETE /transactions/:fid/:tid` | `GET /transactions/:fid/summary`  |
| **Bills**       | `GET /bills/:familyId`                 | `POST /bills` | `PUT /bills/:fid/:bid`        | `DELETE /bills/:fid/:bid`        | `GET /bills/:fid/upcoming`        |
| **Cards**       | `GET /cards/:familyId`                 | `POST /cards` | `PUT /cards/:fid/:cid`        | `DELETE /cards/:fid/:cid`        | —                                 |
| **Insurance**   | `GET /insurance/:familyId`             | `POST /insurance` | `PUT /insurance/:fid/:iid` | `DELETE /insurance/:fid/:iid`    | `GET /insurance/:fid/summary`     |
| **Investments** | `GET /investments/:familyId`           | `POST /investments` | `PUT /investments/:fid/:iid` | `DELETE /investments/:fid/:iid` | `GET /investments/:fid/summary`   |
| **Loans**       | `GET /loans/:familyId`                 | `POST /loans` | `PUT /loans/:fid/:lid`        | `DELETE /loans/:fid/:lid`        | `GET /loans/:fid/summary`         |

#### AI Endpoints (via `financeController`)

| Method | Path                                  | Description                              |
| ------ | -------------------------------------- | ---------------------------------------- |
| GET    | `/ai/insights/:familyId`              | Household overview AI summary            |
| GET    | `/ai/risk-suggestions/:familyId`      | AI risk alerts                           |
| GET    | `/ai/narrative-summary/:familyId`     | Monthly narrative summary                |
| POST   | `/ai/ask-month/:familyId`             | Ask a question about monthly finances    |
| GET    | `/ai/cashflow-tips/:familyId`         | Cash flow tips                           |
| GET    | `/ai/category-insights/:familyId`     | Per-category spending insights           |
| POST   | `/ai/interpret-search/:familyId`      | Convert natural language to search JSON  |
| GET    | `/ai/savings-tips/:familyId`          | Generic savings tips                     |
| POST   | `/ai/suggest-category/:familyId`      | AI-suggested transaction category        |
| POST   | `/ai/suggest-bill-category/:familyId` | AI-suggested bill category               |
| POST   | `/ai/parse-sms/:familyId`             | Parse bank SMS → transaction             |
| POST   | `/ai/parse-sms-card/:familyId`        | Parse SMS → card                         |
| POST   | `/ai/parse-sms-insurance/:familyId`   | Parse SMS → insurance                    |
| POST   | `/ai/parse-sms-investment/:familyId`  | Parse SMS → investment                   |
| POST   | `/ai/parse-sms-loan/:familyId`        | Parse SMS → loan                         |

### Contacts (`/api/contacts`)

| Method | Path                                         | Description                     |
| ------ | --------------------------------------------- | ------------------------------- |
| POST   | `/contacts/sync`                              | Bulk sync contacts from device  |
| GET    | `/contacts/:familyId`                         | List contacts                   |
| GET    | `/contacts/:familyId/summary`                 | Contact summary stats           |
| GET    | `/contacts/:familyId/cleanup-suggestions`     | AI-powered cleanup suggestions  |
| POST   | `/contacts/:familyId/cleanup-apply`           | Apply AI cleanup                |
| PATCH  | `/contacts/:id`                               | Update single contact           |
| DELETE | `/contacts/:id`                               | Delete single contact           |

### Assets (`/api/assets`)

| Method | Path                                         | Description                     |
| ------ | --------------------------------------------- | ------------------------------- |
| GET    | `/:familyId`                                  | List assets                     |
| GET    | `/:familyId/:assetId`                         | Get single asset                |
| POST   | `/`                                           | Create asset                    |
| PUT    | `/:familyId/:assetId`                         | Update asset                    |
| DELETE | `/:familyId/:assetId`                         | Delete asset                    |
| GET    | `/:familyId/expiring-documents`               | Documents nearing expiry        |
| GET    | `/:familyId/vehicles/service-due`             | Vehicles with service due       |
| GET    | `/:familyId/valuation`                        | Total asset valuation           |

### Events (`/api/events`)

| Method | Path                                         | Description                     |
| ------ | --------------------------------------------- | ------------------------------- |
| POST   | `/`                                           | Create event                    |
| GET    | `/`                                           | List events                     |
| GET    | `/:id`                                        | Get event                       |
| PATCH  | `/:id`                                        | Update event                    |
| DELETE | `/:id`                                        | Delete event                    |
| POST   | `/:id/sub-events`                             | Create sub-event                |
| GET    | `/:id/sub-events`                             | List sub-events                 |
| POST   | `/:id/participants`                           | Add participant                 |
| GET    | `/:id/participants`                           | List participants               |
| PATCH  | `/:id/participants/:participantId`            | Update participant              |
| DELETE | `/:id/participants/:participantId`            | Remove participant              |
| GET    | `/:id/finance-summary`                        | Event financial summary         |
| GET    | `/:id/ai-insights`                            | AI insights (placeholder)       |

### Admin (`/api/admin`) — Root Only

All admin routes require both `authMiddleware` and `requireRoot` (user.role === 'root').

| Resource       | Endpoints                                                           |
| -------------- | ------------------------------------------------------------------- |
| **AI Prompts** | `GET /ai-prompts`, `GET /ai-prompts/:id/preview`, `POST /ai-prompts/test` |
| **Users**      | `GET /users`, `POST /users`, `PUT /users/:id/reset-password`, `GET/PUT /users/:id/roles` |
| **Roles**      | Full CRUD + `PUT /roles/:id/permissions`                            |
| **Permissions**| Full CRUD                                                           |
| **Groups**     | Full CRUD + `PUT /groups/:id/members`, `PUT /groups/:id/roles`      |

---

## 5. Middleware Chain

Every request passes through this pipeline:

```
cors → express.json() → responseMiddleware → morgan('dev') → [route handler]
```

1. **`responseMiddleware`**: Attaches `res.success()` and `res.fail()` to every response object (global augmentation via `declare global`).
2. **`authMiddleware`**: Extracts `Bearer <token>` from `Authorization` header, verifies JWT, sets `req.auth = { userId, email }`.
3. **`requireRoot`**: (Admin routes only) Loads user from DB, checks `role === 'root'`.

---

## 6. AI Integration

### Provider Architecture

The AI system is abstracted behind a common `AiClient` interface:

```typescript
type AiClient = {
  textGeneration(model: string, inputs: string, options?: TextGenerationOptions): Promise<string | null>;
  zeroShotClassification(model: string, inputs: string, candidateLabels: string[]): Promise<ZeroShotResult | null>;
  isAvailable(): boolean;
};
```

**Three providers** implement this interface:
- **Ollama** — Local LLM server (default in dev, models: `phi3:mini`, `qwen2.5-coder:7b`, `nomic-embed-text`)
- **OpenAI** — OpenAI-compatible API (model: `gpt-4.1-mini`)
- **HuggingFace** — HF Inference API (models: `flan-t5-base`, `bart-large-mnli`)

Provider selection is controlled by `AI_PROVIDER` env var (`ollama` | `openai` | `huggingface`).

### Prompt System

Prompts are defined as **builder functions** in `src/lib/ai/prompts/`:
- `finance.ts` — 14 prompt builders (insights, risk, narrative, SMS parsing, search interpretation)
- `contacts.ts` — Contact cleanup prompt
- `registry.ts` — Central `promptRegistry[]` array with metadata, used by the admin prompt lab

### AI Feature Categories

| Category           | Examples                                              |
| ------------------- | ----------------------------------------------------- |
| **Financial Analysis** | Monthly insights, risk suggestions, cashflow tips, category insights, savings tips |
| **Natural Language** | Ask questions about monthly data, interpret search queries |
| **SMS Parsing**    | Parse bank SMS → transaction/card/insurance/investment/loan |
| **Category Suggestion** | Auto-suggest categories via zero-shot classification |
| **Contact Cleanup** | Identify junk/duplicate contacts for cleanup          |

---

## 7. RBAC System

### Hierarchy

```
User → UserRole → Role → RolePermission → Permission
User → UserGroup → Group → GroupRole → Role → ...
```

### Seeded Roles (via `npm run seed:rbac`)

| Role               | Access                                   |
| ------------------- | ---------------------------------------- |
| Admin              | All permissions (all modules)            |
| Finance Manager    | All `finance.*` permissions              |
| Family Manager     | All `family.*` permissions               |
| Events Manager     | All `events.*` permissions               |
| Assets Manager     | All `assets.*` permissions               |
| Health Manager     | All `health.*` permissions               |
| Contacts Manager   | All `contacts.*` permissions             |
| Organizer Manager  | All `organizer.*` permissions            |
| Messages Manager   | All `messages.*` permissions             |
| Viewer             | All `*.read` permissions                 |

### Permission Naming Convention

Pattern: `{module}.{sub-resource}.{action}`

Examples: `finance.accounts.read`, `finance.transactions.write`, `family.members.write`, `events.read`

### Auth Response Shape

Login/register returns user with resolved RBAC:
```json
{
  "user": {
    "id": "uuid",
    "email": "...",
    "full_name": "...",
    "role": "user|admin|root",
    "rbac_roles": [{ "id": "role-admin", "name": "Admin", ... }],
    "rbac_permissions": [{ "id": "finance.accounts.read", "resource": "finance.accounts", "action": "read", ... }]
  },
  "token": "jwt-token"
}
```

---

## 8. Configuration

All config lives in `config/index.ts`, reading from `.env`:

| Variable                    | Default                    | Description                       |
| --------------------------- | -------------------------- | --------------------------------- |
| `PORT`                      | 8000                       | Server port                       |
| `NODE_ENV`                  | development                | Environment                       |
| `MONGODB_URI`               | `mongodb://localhost:27017/griham` | MongoDB connection string   |
| `JWT_SECRET`                | `change-me-in-production`  | JWT signing secret                |
| `JWT_EXPIRY_SECONDS`        | 86400 (24h)                | JWT token lifetime                |
| `CORS_ORIGIN`               | `*`                        | CORS allowed origin               |
| `AI_PROVIDER`               | `huggingface`              | Which AI backend to use           |
| `OLLAMA_BASE_URL`           | `http://localhost:11434`   | Ollama server URL                 |
| `OLLAMA_TEXT_MODEL`         | `llama3.1:8b`              | Ollama text model                 |
| `OPENAI_API_KEY`            | —                          | OpenAI API Key                    |
| `OPENAI_TEXT_MODEL`         | `gpt-4.1-mini`             | OpenAI text model                 |
| `HUGGING_FACE_API_KEY`      | —                          | HuggingFace API Key               |
| `TEST_PASS`                 | `member123`                | Test password for dev seeding     |

---

## 9. Scripts

| Command              | Description                              |
| --------------------- | ---------------------------------------- |
| `npm run dev`         | Start dev server with tsx watch          |
| `npm run build`       | Compile TypeScript to `dist/`            |
| `npm start`           | Run compiled JS from `dist/src/server.js`|
| `npm run seed:rbac`   | Seed roles, permissions, groups, root user (requires `ROOT_EMAIL` & `ROOT_PASSWORD` env vars) |

---

## 10. Code Conventions & Patterns

### Adding a New Module

1. Create `src/modules/{moduleName}/controller.ts` and `routes.ts`
2. Define Mongoose schema in `src/db/schemas/{ModelName}.ts` following the pattern:
   - `_id: { type: String, required: true }` (UUID)
   - `{ timestamps: true, id: false }` schema options
   - Virtual `id` getter
   - `mongoose-lean-virtuals` plugin
3. Mount routes in `src/app.ts`: `app.use('/api/...', moduleRoutes);`
4. If the module needs RBAC: add permissions to `seed-rbac.ts`

### Controller Pattern

```typescript
export const myController = {
  async list(req: Request, res: Response): Promise<void> {
    try {
      const auth = (req as Request & { auth: AuthPayload }).auth;
      const data = await MyModel.find({ ... }).lean({ virtuals: true });
      res.success(data);
    } catch (err) {
      res.fail('Failed to list', 500);
    }
  },
};
```

### Query Pattern

Always use `.lean({ virtuals: true })` for read queries:
```typescript
const item = await Model.findById(id).lean({ virtuals: true });
```

### ID Generation

```typescript
import { v4 as uuidv4 } from 'uuid';
const id = uuidv4();
await Model.create({ _id: id, ... });
```

### Response Pattern

```typescript
// Success
res.success(data);                          // 200 + default message
res.success(data, 'Created', 201);          // Custom message + status

// Error
res.fail('Not found', 404);
res.fail('Validation failed', 400, errors);
```

---

## 11. Data Flow Diagram

```
Client (React)
    │
    ▼ HTTP (Bearer JWT)
┌──────────────────────────────────────────────┐
│  Express App                                 │
│  ┌─────────────┐  ┌──────────────────────┐   │
│  │ CORS+JSON   │→ │ responseMiddleware    │   │
│  └─────────────┘  └──────────────────────┘   │
│        │                                      │
│        ▼                                      │
│  ┌─────────────┐     ┌──────────────────┐    │
│  │authMiddleware│ ──→ │ Module Controller │    │
│  └─────────────┘     └──────────────────┘    │
│                            │                  │
│              ┌─────────────┴──────────┐       │
│              ▼                        ▼       │
│        ┌──────────┐           ┌────────────┐  │
│        │ Mongoose │           │  AI Client  │  │
│        │ (MongoDB)│           │(Ollama/etc.)│  │
│        └──────────┘           └────────────┘  │
└──────────────────────────────────────────────┘
```

---

## 12. Key Relationships Between Entities

```
User ──┬── UserRole ──── Role ──── RolePermission ──── Permission
       ├── UserGroup ─── Group ─── GroupRole ─── Role
       └── FamilyMember ─── Family
                                     │
                    ┌────────────────┼────────────────┐
                    ▼                ▼                 ▼
              BankAccount      Transaction          Event
                                    │                 │
                                    │          ┌──────┴──────┐
                                    │          ▼             ▼
              Bill    Card     Insurance    SubEvent   EventParticipant
              Loan    Investment                            │
                                                        Contact
              Asset
```

- **Family** is the central scoping entity  
- **Transaction** can link to an Event/SubEvent via `event_id`/`sub_event_id`  
- **EventParticipant** links **Contact** to **Event**  
- All finance entities (Account, Transaction, Bill, Card, Insurance, Investment, Loan) belong to a Family

---

## 13. File-by-File Quick Reference

### Module Files (what each does)

| File | Purpose |
|------|---------|
| `modules/auth/controller.ts` | Register (bcrypt+JWT), login, `/me` with RBAC resolution |
| `modules/families/controller.ts` | Family CRUD, member add/update/list |
| `modules/finance/routes.ts` | 73-line router mounting all finance endpoints |
| `modules/finance/dataController.ts` | CRUD for accounts, transactions, bills, cards, insurance, investments, loans (~30KB, largest controller) |
| `modules/finance/controller.ts` | AI-powered finance features (insights, risk, SMS parsing) |
| `modules/finance/service.ts` | Finance business logic + prompt construction (~32KB, heaviest service) |
| `modules/finance/aggregate.ts` | MongoDB aggregation pipelines for summaries |
| `modules/contacts/controller.ts` | Contact sync entry point |
| `modules/contacts/listController.ts` | Contact listing |
| `modules/contacts/mutateController.ts` | Contact update/delete |
| `modules/contacts/summaryController.ts` | Contact stats |
| `modules/contacts/cleanupController.ts` | AI-powered duplicate/junk detection |
| `modules/contacts/service.ts` | Contact business logic (normalization, dedup) |
| `modules/assets/controller.ts` | Asset CRUD + expiring docs + valuation |
| `modules/events/controller.ts` | Event CRUD + sub-events + participants + finance summary |
| `modules/events/service.ts` | Event business logic + transaction aggregation |
| `modules/admin/controller.ts` | Root admin: user mgmt, RBAC CRUD, AI prompt playground |
