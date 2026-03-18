# Griham — Project overview

**Griham** is a household / family management web app: finance (accounts, transactions, bills, cards), family profiles, contacts (with sync and AI-assisted cleanup), and optional AI helpers for money insights. The current stack is a **Node.js microservice API** plus a **React (Vite) SPA**.

---

## Repository layout

| Area | Role |
|------|------|
| **`microservice/`** | REST API: Express + TypeScript + MongoDB (Mongoose). Auth (JWT), families, finance CRUD, finance AI endpoints, contacts, root-only admin/RBAC. |
| **`frontend/`** | SPA: React 19, React Router (HashRouter), Tailwind, Axios. Module access gated by RBAC permissions; optional **Mirage** mock API in dev when no real API URL is set. |

---

## Architecture (high level)

```
Browser (React)
    │  VITE_API_URL → Axios (Bearer JWT in localStorage)
    ▼
Express API (/api/*)  ←→  MongoDB
    │
    └── Optional: Hugging Face / OpenAI / Ollama for finance & contact AI features
```

- **CORS** is configurable via `CORS_ORIGIN` (microservice).
- **Auth**: JWT after login/register; `Authorization: Bearer <token>` on protected routes.

---

## Microservice (`microservice/`)

### Stack

- **Runtime**: Node ≥ 18, ESM (`"type": "module"`).
- **Framework**: Express, `morgan`, `cors`, `express.json()`.
- **DB**: MongoDB via Mongoose; connection from `MONGODB_URI`.
- **Security**: `bcryptjs` for passwords, `jsonwebtoken` for sessions.

### Config (`config/index.ts`)

Key environment variables:

- `PORT` (default `8000`), `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRY_SECONDS`, `CORS_ORIGIN`
- **AI**: `AI_PROVIDER` = `huggingface` | `openai` | `ollama`, plus provider-specific keys/URLs/models (`HUGGING_FACE_*`, `OPENAI_*`, `OLLAMA_*`)

### API mount points (`src/app.ts`)

| Prefix | Module |
|--------|--------|
| `/api` | Auth, families, contacts |
| `/api/finance` | Finance + finance AI (all behind `authMiddleware`) |
| `/api/admin` | Users, roles, permissions, groups (auth + **root only**) |

### Feature modules

1. **Auth** (`/api/auth/…`)
   - `POST /auth/register`, `POST /auth/login`, `GET /auth/me` (protected).
   - Returns user plus **`rbac_roles`** and **`rbac_permissions`** (from UserRole → Role → RolePermission → Permission).

2. **Families / households** (`/api/families/…`, alias `/api/households/…`)
   - Create/list family; `GET /families/me`; get/update address; list/add/update **members** (non-user family members with name, phone, email, relation).

3. **Finance** (`/api/finance/…`, JWT required)
   - **Bank accounts**: CRUD scoped by `familyId`.
   - **Transactions**: list (filters e.g. month), summary, create, delete.
   - **Bills**: list, upcoming, CRUD.
   - **Cards**: list, CRUD (credit/debit metadata, limits, billing day).
   - **Finance AI** (graceful degradation if provider unavailable):
     - Insights, risk suggestions, narrative summary, ask-about-month, cashflow tips, category insights, natural-language **transaction search interpretation**, savings tips, suggest transaction/bill category, **SMS parse** (transaction + card variants).

4. **Contacts** (`/api/contacts/…`, JWT required)
   - `POST /contacts/sync` — ingest/sync contacts for a family.
   - List (search `q`, `limit`), summary, **cleanup suggestions** (rule-based + optional AI), **cleanup apply**, patch/delete single contact.

5. **Admin / RBAC** (`/api/admin/…`, JWT + **role `root`** only)
   - Users: list, create admin, reset password, get/set user roles.
   - Roles CRUD + assign permissions.
   - Permissions CRUD.
   - Groups CRUD + members + group-level roles.
   - Seed script: `npm run seed:rbac` (`src/scripts/seed-rbac.ts`).

### Data model (Mongoose)

Core entities include **User** (`user` | `admin` | `root`), **Family**, **FamilyMember**, **BankAccount**, **Transaction**, **Bill**, **Card**, **Contact**, and RBAC: **Role**, **Permission**, **RolePermission**, **UserRole**, **Group**, **GroupRole**, **UserGroup**.

### Scripts

- `npm run dev` — `tsx watch src/server.ts`
- `npm run build` / `npm start` — compile + run `dist`
- `npm run seed:rbac` — seed roles/permissions

---

## Frontend (`frontend/`)

### Stack

- **React 19**, **Vite 7**, **React Router 7** (`HashRouter` — URLs use `#/`).
- **Tailwind CSS**, **lucide-react** icons, **Axios** (`src/lib/api.ts`).
- **Dev-only Mirage** (`src/mirage/server.ts`): starts when `import.meta.env.DEV && !VITE_API_URL`. Seeds users (e.g. `root@griham.local`, `admin@griham.local`, `user@griham.local`) and mock finance/family/RBAC data.

### Theming

- `VITE_THEME=blue` or `orange` loads optional theme CSS (`src/theme/`).

### Auth & routing

- **`useAuth`**: token in `localStorage` (`auth_token`); loads user via `/auth/me`.
- **Protected routes**: redirect to `/login` if unauthenticated.
- **`root` users**: dedicated mini-app — **Permissions**, **Roles**, **Groups** (`/root/permissions`, `/root/roles`, `/root/groups`); no main household dashboard for root in current routing.
- **Everyone else**: dashboard and modules; **`PermissionRoute`** uses `canAccessModule(user, moduleKey)` from `src/lib/permissions.ts`, which checks `rbac_permissions` against resource prefixes (`family`, `finance`, `events`, `assets`, `health`, `contacts`, `organizer`, `messages`). **`root`** bypasses module checks in that helper.

### Pages vs backend coverage

| Frontend area | Typical API usage |
|---------------|-------------------|
| **Dashboard** | Households, members, finance summary, accounts/transactions/bills/cards, AI insights & risk radar |
| **Family** | Household detail, members, address |
| **Finance** | Overview, accounts, transactions, bills, cards, card detail; month filter via `FinanceMonthContext`; many AI endpoints |
| **Contacts** | List, summary, sync, cleanup, edit/delete |
| **Events, Assets, Health, Organizer, Messaging** | UI present; may rely on Mirage or placeholders depending on env — **no dedicated REST modules** under `microservice/` for these beyond RBAC gating |
| **Assistant** | AI-style UI (finance-related APIs where wired) |
| **Login / Reset password** | Login hits real `/auth/login` or Mirage. Client also defines `changePassword` / `resetPassword` in `api.ts`; **microservice auth routes currently expose only register, login, me** — password change/reset may only work against Mirage unless extended on the API |

### Shared UI

- **Sidebar**, **Header**, **FinanceMonthFilter**, **AIWidget**, **SMSParser** / **CardSMSParser** (bank SMS → structured fields via finance AI parse endpoints).

---

## How frontend and microservice align

- **Base URL**: set `VITE_API_URL` to the API origin (e.g. `http://localhost:8000/api`). Without it in dev, **Mirage** simulates the API.
- **Finance paths**: client calls `/finance/...` on that base (matches `/api/finance` when base is `.../api`).
- **RBAC**: after login, `/auth/me` must return `rbac_permissions` so sidebar/modules match server-assigned access; root uses admin UI only.

---

## Running locally (microservice + frontend)

1. **MongoDB** running; set `MONGODB_URI` and a strong `JWT_SECRET`.
2. **Microservice**: `cd microservice && npm install && npm run dev` (default **http://localhost:8000**; routes under `/api`).
3. **Frontend**: `cd frontend && npm install && echo 'VITE_API_URL=http://localhost:8000/api' > .env.local && npm run dev` (Vite default port from `package.json` is **4000**).

Optional: configure `AI_PROVIDER` and provider credentials for full AI features.

---

## Summary

| Capability | Implemented in |
|------------|----------------|
| JWT auth, user registration/login | Microservice + frontend |
| Multi-family/household + members | Microservice + frontend |
| Finance (accounts, transactions, bills, cards) + aggregates | Microservice + frontend |
| Finance AI (insights, NL search, SMS parse, categories, etc.) | Microservice (`lib/ai`) + frontend |
| Contacts sync, cleanup (AI-assisted), CRUD | Microservice + frontend |
| RBAC (roles, permissions, groups, user assignment) | Microservice admin API + root frontend |
| Events, assets, health, organizer, messages (screens) | Frontend (+ Mirage); **not** full standalone modules in microservice |
| Offline / no-backend dev | Frontend Mirage |

---

## AI features implemented (with prompt samples)

AI is optional: when `AI_PROVIDER` + credentials are configured (`huggingface` / `openai` / `ollama`), the API uses **text generation** or **zero-shot classification**; otherwise rule-based fallbacks apply where coded. All finance AI routes are under **`/api/finance`** (JWT required). Contact cleanup AI runs during **`GET /api/contacts/:familyId/cleanup-suggestions`**.

| # | Feature | HTTP | Mechanism |
|---|---------|------|-----------|
| 1 | Household overview paragraph | `GET /ai/insights/:familyId?month=` | Text gen |
| 2 | Risk radar (2–5 alerts) | `GET /ai/risk-suggestions/:familyId?month=` | Text gen |
| 3 | Q&A about the month | `POST /ai/ask-month/:familyId` | Text gen |
| 4 | 2–3 sentence narrative | `GET /ai/narrative-summary/:familyId?month=` | Text gen |
| 5 | Cash-flow tips | `GET /ai/cashflow-tips/:familyId?month=` | Text gen |
| 6 | Per-category spend summaries | `GET /ai/category-insights/:familyId?month=` | Text gen |
| 7 | Natural language → transaction filters | `POST /ai/interpret-search/:familyId` | Text gen → JSON |
| 8 | Generic savings tips | `GET /ai/savings-tips/:familyId` | Text gen |
| 9 | Transaction category from description | `POST /ai/suggest-category/:familyId` | Zero-shot |
| 10 | Bill category from name | `POST /ai/suggest-bill-category/:familyId` | Zero-shot |
| 11 | Bank SMS → transaction fields | `POST /ai/parse-sms/:familyId` | Text gen (+ fallback rules) |
| 12 | Bank SMS → card fields | `POST /ai/parse-sms-card/:familyId` | Text gen (+ fallback rules) |
| 13 | Junk / placeholder contacts | `GET /contacts/:familyId/cleanup-suggestions` | Text gen (JSON array) |

Below, **prompt samples** are what the backend sends to the model (with real numbers/dates filled at runtime). **User sample** = example request body or query the app/user would supply.

### 1. Household overview (`insights`)

**Prompt sample** (truncated):

```
Write one short paragraph (3-5 sentences) for a "Household Overview" that covers:
1) Family: this household has 4 member(s).
2) Finance: total balance 125000 INR; this month for 2025-03 income 90000 INR, expenses 72000 INR; savings rate 20%; 2 pending bill(s). Finance module: 3 account(s), 45 transaction(s) this month, 2 card(s).
3) Module status: mention Finance is active with the above; briefly note that other modules (Events, Assets, Health, Contacts, Organizer, Messages) are available in the app.
Be concise, practical, and motivating. One paragraph only.
```

### 2. Risk suggestions (`risk-suggestions`)

**Prompt sample**:

```
You are a household finance risk advisor. Given this data, suggest 2 to 5 SHORT risk alerts (one line each, no numbering). Focus on:
- Spending or income changes vs last month (e.g. "Spending up 20% vs last month")
- Bills and cash flow: include due-date/cash-flow tips when relevant ...
Current month: income ₹90000, expenses ₹72000, savings rate 20%, balance ₹125000. Previous month: income ₹85000, expenses ₹65000. ...
Reply with ONLY the risk lines, one per line...
```

### 3. Ask about month (`ask-month`)

**User sample** (JSON body):

```json
{ "question": "Are we spending too much on food this month?", "month": "2025-03" }
```

**Prompt sample** (model sees aggregated month data +):

```
You are a helpful finance assistant. Answer the user's question in 1-3 short sentences using ONLY the data below...
Data for this month for 2025-03:
- Income: ₹90,000, Expenses: ₹72,000
- Savings rate: 20%
...
User question: Are we spending too much on food this month?

Answer (1-3 sentences, no bullet points):
```

### 4. Narrative summary (`narrative-summary`)

**Prompt sample**:

```
Write exactly 2-3 short sentences summarizing this month's finances. Do not use bullet points.
This month for 2025-03: income ₹90000, expenses ₹72000, savings rate 20%, 2 pending bill(s). Last month: income ₹85000, expenses ₹65000.
Mention income, expenses, and bills; if trend is available mention whether spending is up or down vs last month...
```

### 5. Cash-flow tips (`cashflow-tips`)

**Prompt sample**:

```
Generate 1 to 3 SHORT cash-flow tips for the user. Data: Balance ₹125000. 2 bills due in 5 days (total ₹15000). ...
Include if relevant: "N bills due in 5 days; balance might be short by ₹X" or "Consider paying Y before Z." One tip per line, no numbering.
```

### 6. Category insights (`category-insights`)

**Prompt sample**:

```
For each spending category below, write ONE short sentence (e.g. "Food is 25% of expenses; above your usual" or "Transport is 12% of expenses.") ...
Categories (this month):
Food: ₹18000, 25% of total; last month 22%
Transport: ₹9000, 12% of total
...
Reply with one sentence per category, in the same order, one per line. No numbering.
```

### 7. Interpret transaction search (`interpret-search`)

**User sample**:

```json
{ "q": "coffee last week", "month": "2025-03" }
```

**Prompt sample**:

```
Convert this transaction search query into a JSON object. Today is 2025-03-18. Current month context: 2025-03. Last week: 2025-03-03 to 2025-03-09.
Query: "coffee last week"

Return ONLY a JSON object with these optional keys ...
Examples: "coffee last week" -> {"description_contains":"coffee","date_from":"2025-03-03","date_to":"2025-03-09","sort":"newest"}
...
Return only the JSON, no other text.
```

### 8. Savings tips (`savings-tips`)

**Prompt sample**:

```
Give exactly 3 short savings tips for a household (one per line, no numbering). Focus on daily habits and subscriptions.
```

### 9. Suggest transaction category (`suggest-category`)

**User sample**:

```json
{ "description": "Swiggy order dinner", "amount": 450, "type": "expense" }
```

**Model input**: zero-shot classification on text like `swiggy order dinner Amount: 450.` against labels:  
`Salary`, `Shopping`, `Food`, `Transport`, `Utilities`, `Subscription`, `Healthcare`, `EMI/Loan`, `Rent`, `Groceries`, `Entertainment`, `Other`.

### 10. Suggest bill category (`suggest-bill-category`)

**User sample**:

```json
{ "bill_name": "Airtel Fiber March" }
```

**Model input**: zero-shot on bill name against labels:  
`Electricity`, `Water`, `Gas`, `Internet`, `Phone`, `Rent`, `Insurance`, `Subscription`, `Pocket Money`, `Other`.

### 11. Parse transaction SMS (`parse-sms`)

**User sample**:

```json
{ "sms_text": "Acct XX123 debited Rs.2500 on 15-03-25 at AMAZON. Avl bal Rs.45000 -HDFC" }
```

**Prompt sample**:

```
From this Indian bank SMS, extract: amount (number), type (income or expense), category (one word), short description, date (YYYY-MM-DD if present). Reply in one line: amount|type|category|description|date. SMS: Acct XX123 debited Rs.2500...
```

### 12. Parse card SMS (`parse-sms-card`)

**User sample**:

```json
{ "sms_text": "HDFC Bank: Your credit card ending 1234 has limit Rs.500000. Card: Regalia" }
```

**Prompt sample**:

```
From this bank card SMS, extract: bank name, card name, last 4 digits, card type (credit or debit), credit limit (number if present). Reply: bank|cardname|last4|type|limit. SMS: ...
```

### 13. Contact cleanup AI (`cleanup-suggestions`)

Runs when AI is available; contacts are passed as JSON in the prompt.

**Prompt sample**:

```
You are a contact cleanup assistant. Identify contacts that look like junk, corrupted, or placeholders.
Return ONLY a JSON array of objects: [{"id":"<id>","reason":"<short reason>"}].
Use only the provided ids. If none, return [].
Contacts: [{"id":"...","name":"test","phone":"0000000000","email":""}, ...]
```

---

This document reflects the **current** implementation under `microservice/` and `frontend/` as of the last scan.
