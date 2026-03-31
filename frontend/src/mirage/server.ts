import { createServer, Response } from 'miragejs';

/**
 * In-memory store shared across route handlers (session lifetime).
 * Mirage resets between page loads in dev.
 */
const db = {
  users: [] as Array<{ id: string; email: string; full_name: string; role: string; is_active: number }>,
  households: [] as Array<{ id: string; name: string; address?: string; created_by: string; created_at: string }>,
  members: [] as Array<{
    id: string; user_id: string | null; household_id: string; role: string; status: string;
    relation: string | null; invitation_email: string | null; invitation_sent_at: string | null; joined_at: string;
    user_email: string | null; user_phone: string | null; full_name: string | null;
  }>,
  accounts: [] as Array<{ id: string; family_id: string; account_name: string; account_number?: string; bank_name: string; account_type: string; balance: number; currency: string }>,
  transactions: [] as Array<{ id: string; family_id: string; account_id: string | null; card_id?: string | null; type: string; category: string; amount: number; description?: string; transaction_date: string; created_by: string; account_name?: string; bank_name?: string; created_by_name?: string; event_id?: string | null; sub_event_id?: string | null; source_type?: string | null }>,
  bills: [] as Array<{ id: string; family_id: string; bill_name: string; category: string; amount: number; due_date: string; is_recurring: boolean; recurrence_pattern?: string; status: string }>,
  cards: [] as Array<{ id: string; family_id: string; card_type: 'credit' | 'debit'; bank_name: string; card_name: string; last_four_digits: string; card_limit?: number; billing_date?: number; background_color?: string | null; status: 'active' | 'inactive' | 'blocked'; created_at: string }>,
  insurance: [] as Array<{ id: string; family_id: string; type: string; provider: string; policyName: string; policyNumber: string; premiumAmount: number; premiumFrequency: string; nextDueDate?: string | null; coverageAmount: number; insuredMembers: string[]; status: string }>,
  investments: [] as Array<{ id: string; family_id: string; type: string; name: string; folioNumber: string; sipAmount: number; sipDay: number; startDate: string; currentValue: number; investedAmount: number; units: number; nav: number; platform?: string | null; status: string }>,
  loans: [] as Array<{ id: string; family_id: string; name: string; lender: string; principalAmount: number; interestRate: number; tenureMonths: number; emiAmount: number; startDate?: string | null; nextDueDate?: string | null; outstandingPrincipal: number; type: string; status: string }>,
  assets: [] as Array<{ id: string; family_id: string; asset_type: string; name: string; description?: string | null; purchase_date?: string | null; purchase_price: number; current_value: number; location?: string | null; expiry_date?: string | null; created_at?: string; updated_at?: string }>,
  events: [] as Array<{ id: string; family_id: string; name: string; type: string; start_date: string; end_date?: string | null; location?: string | null; total_budget: number; notes?: string | null; status: string; created_at?: string; updated_at?: string }>,
  sub_events: [] as Array<{ id: string; event_id: string; name: string; date_time: string; location?: string | null; budget: number; created_at?: string; updated_at?: string }>,
  event_participants: [] as Array<{ id: string; event_id: string; contact_id: string; role: 'guest' | 'vendor' | 'host'; rsvp_status: string; gender?: string | null; age_group?: string | null; gifts?: string[]; created_at?: string; updated_at?: string }>,
  contacts: [] as Array<{ id: string; family_id: string; name: string | null; phone: string | null; phone_ext: string | null; phone_number: string | null; phone_norm: string | null; email?: string | null; last_synced_at?: string | null }>,
  sms_history: [] as Array<{ id: string; family_id: string; input_text: string; model_used: string; output: Record<string, unknown> | null; date: string; accuracy: number | null; status: string; parse_type: string; transaction_id: string | null; created_by: string | null; amount: number | null; category: string | null; type: string | null; description: string | null }>,
  roles: [] as Array<{ id: string; name: string; description?: string; created_at: string; updated_at: string }>,
  permissions: [] as Array<{ id: string; name: string; resource: string; action: string; description?: string; created_at: string; updated_at: string }>,
  groups: [] as Array<{ id: string; name: string; description?: string; created_at: string; updated_at: string }>,
  role_permissions: [] as Array<{ role_id: string; permission_id: string }>,
  user_roles: [] as Array<{ user_id: string; role_id: string }>,
  user_groups: [] as Array<{ user_id: string; group_id: string }>,
  group_roles: [] as Array<{ group_id: string; role_id: string }>,
};

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Fixed IDs for seed users so RBAC seed can reference them. */
const SEED_IDS = {
  root: 'seed-root-00000000-0000-4000-8000-000000000001',
  admin: 'seed-admin-00000000-0000-4000-8000-000000000002',
  user: 'seed-user-00000000-0000-4000-8000-000000000003',
} as const;

function issueToken(userId: string) {
  return `mock-jwt:${userId}:${uid()}`;
}

const promptTemplates = [
  {
    id: 'finance.sms-transaction',
    module: 'finance',
    label: 'Finance SMS Transaction Parser',
    inputLabel: 'SMS Text',
    inputPlaceholder: 'Your A/c XX1234 debited...'
  },
  {
    id: 'finance.sms-card',
    module: 'finance',
    label: 'Finance SMS Card Parser',
    inputLabel: 'Card SMS',
    inputPlaceholder: 'Your HDFC credit card ending 1234...'
  }
];

function parseCurrencyAmount(input: string): number | null {
  const match = input.match(/(?:rs\.?|inr)?\s*([0-9][0-9,]*\.?[0-9]*)/i);
  if (!match) return null;
  return Number(match[1].replace(/,/g, ''));
}

function normalizePhone(value: string | null | undefined) {
  if (!value) return null;
  return value.replace(/\D/g, '') || null;
}

function matchesText(value: string | null | undefined, query: string) {
  return (value || '').toLowerCase().includes(query.toLowerCase());
}

function getUserFromRequest(request: { requestHeaders: Record<string, string | undefined> }) {
  const auth = request.requestHeaders.Authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  if (!token.startsWith('mock-jwt:')) return null;
  const parts = token.split(':');
  if (parts.length < 2) return null;
  const userId = parts[1];
  return db.users.find((u) => u.id === userId) ?? null;
}

/** Enrich user with rbac_roles and rbac_permissions so login/register return same shape as /auth/me. */
function enrichUserWithRbac(user: (typeof db.users)[number]) {
  const rbacRoles = db.user_roles.filter((ur) => ur.user_id === user.id).map((ur) => db.roles.find((r) => r.id === ur.role_id)).filter(Boolean) as typeof db.roles;
  const roleIds = rbacRoles.map((r) => r.id);
  const permIds = new Set<string>();
  db.role_permissions.filter((rp) => roleIds.includes(rp.role_id)).forEach((rp) => permIds.add(rp.permission_id));
  const rbacPermissions = db.permissions.filter((p) => permIds.has(p.id));
  return { ...user, rbac_roles: rbacRoles, rbac_permissions: rbacPermissions };
}

function seed() {
  const now = new Date().toISOString();

  // ----- Dummy users for testing (Mirage accepts any password; use e.g. password123)
  //   root@griham.local  → Root User   (role: root)  → sees Permissions / Roles / Groups admin UI
  //   admin@griham.local → Admin User  (role: admin) → sees main app + has RBAC role "Finance Manager"
  //   user@griham.local  → Normal User (role: user)  → sees main app + has RBAC role "Viewer"
  db.users.push(
    { id: SEED_IDS.root, email: 'root@griham.local', full_name: 'Root User', role: 'root', is_active: 1 },
    { id: SEED_IDS.admin, email: 'admin@griham.local', full_name: 'Admin User', role: 'admin', is_active: 1 },
    { id: SEED_IDS.user, email: 'user@griham.local', full_name: 'Normal User', role: 'user', is_active: 1 },
  );

  // Admin user's household (so admin and normal user can test family/finance flows)
  const familyId = uid();
  db.households.push({
    id: familyId,
    name: 'My Household',
    address: '123 Home Street',
    created_by: SEED_IDS.admin,
    created_at: now,
  });
  db.members.push({
    id: uid(),
    user_id: SEED_IDS.admin,
    household_id: familyId,
    role: 'admin',
    status: 'active',
    relation: 'self',
    invitation_email: null,
    invitation_sent_at: null,
    joined_at: now,
    user_email: 'admin@griham.local',
    user_phone: null,
    full_name: 'Admin User',
  });
  const accId = uid();
  db.accounts.push({
    id: accId,
    family_id: familyId,
    account_name: 'Primary Savings',
    account_number: '****4521',
    bank_name: 'Mock Bank',
    account_type: 'savings',
    balance: 125000,
    currency: 'INR',
  });
  db.transactions.push(
    {
      id: uid(),
      family_id: familyId,
      account_id: accId,
      type: 'income',
      category: 'Salary',
      amount: 95000,
      transaction_date: now,
      created_by: SEED_IDS.admin,
      created_by_name: 'Admin User'
    },
    {
      id: uid(),
      family_id: familyId,
      account_id: accId,
      type: 'expense',
      category: 'Utilities',
      amount: 3500, description: 'Electricity',
      transaction_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) as string,
      created_by: SEED_IDS.admin,
      created_by_name: 'Admin User'
    },
  );
  db.bills.push({
    id: uid(),
    family_id: familyId,
    bill_name: 'Internet',
    category: 'Utilities',
    amount: 1200,
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    is_recurring: true,
    recurrence_pattern: 'monthly',
    status: 'pending',
  });
  db.cards.push({
    id: uid(),
    family_id: familyId,
    card_type: 'credit',
    bank_name: 'Mock Bank',
    card_name: 'Premium Card',
    last_four_digits: '8899',
    card_limit: 100000,
    billing_date: 15,
    background_color: '#1d4ed8',
    status: 'active',
    created_at: now,
  });
  db.insurance.push({
    id: uid(),
    family_id: familyId,
    type: 'health',
    provider: 'Mock Insurance',
    policyName: 'Family Floater',
    policyNumber: 'POL-1001',
    premiumAmount: 18000,
    premiumFrequency: 'yearly',
    nextDueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    coverageAmount: 500000,
    insuredMembers: ['Admin User'],
    status: 'active',
  });
  db.investments.push({
    id: uid(),
    family_id: familyId,
    type: 'mutual_fund',
    name: 'Index Fund',
    folioNumber: 'FOLIO-1001',
    sipAmount: 5000,
    sipDay: 10,
    startDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    currentValue: 62000,
    investedAmount: 55000,
    units: 420.5,
    nav: 147.45,
    platform: 'Mock Grow',
    status: 'active',
  });
  db.loans.push({
    id: uid(),
    family_id: familyId,
    name: 'Car Loan',
    lender: 'Mock Bank',
    principalAmount: 600000,
    interestRate: 9.1,
    tenureMonths: 60,
    emiAmount: 12500,
    startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    nextDueDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    outstandingPrincipal: 410000,
    type: 'car',
    status: 'active',
  });
  db.assets.push({
    id: uid(),
    family_id: familyId,
    asset_type: 'document',
    name: 'Vehicle Insurance Policy',
    description: 'Annual insurance document',
    purchase_date: null,
    purchase_price: 0,
    current_value: 0,
    location: 'Locker',
    expiry_date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    created_at: now,
    updated_at: now,
  });
  const eventId = uid();
  db.events.push({
    id: eventId,
    family_id: familyId,
    name: 'Family Wedding',
    type: 'marriage',
    start_date: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    end_date: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    location: 'Jaipur',
    total_budget: 750000,
    notes: 'Mock event for local development',
    status: 'planned',
    created_at: now,
    updated_at: now,
  });
  const subEventId = uid();
  db.sub_events.push({
    id: subEventId,
    event_id: eventId,
    name: 'Sangeet',
    date_time: new Date(Date.now() + 41 * 24 * 60 * 60 * 1000).toISOString(),
    location: 'Banquet Hall',
    budget: 150000,
    created_at: now,
    updated_at: now,
  });
  const contactId = uid();
  db.contacts.push({
    id: contactId,
    family_id: familyId,
    name: 'Rahul Sharma',
    phone: '+91 9876543210',
    phone_ext: null,
    phone_number: '9876543210',
    phone_norm: '919876543210',
    email: 'rahul@example.com',
    last_synced_at: now,
  });
  db.event_participants.push({
    id: uid(),
    event_id: eventId,
    contact_id: contactId,
    role: 'guest',
    rsvp_status: 'pending',
    gender: 'male',
    age_group: 'adult',
    gifts: [],
    created_at: now,
    updated_at: now,
  });

  // ----- RBAC seed: roles and permissions aligned with real API (admin = full access)
  const roleAdminId = uid();
  const roleFinanceId = uid();
  const roleViewerId = uid();
  db.roles.push(
    { id: roleAdminId, name: 'admin', description: 'Full access to all modules', created_at: now, updated_at: now },
    { id: roleFinanceId, name: 'Finance Manager', description: 'Can manage accounts and transactions', created_at: now, updated_at: now },
    { id: roleViewerId, name: 'Viewer', description: 'Read-only access to finance', created_at: now, updated_at: now },
  );

  // Full permission set matching real API (admin role gets all of these)
  const allPerms = [
    { name: 'family.read', resource: 'family', action: 'read' },
    { name: 'family.create', resource: 'family', action: 'create' },
    { name: 'family.update', resource: 'family', action: 'update' },
    { name: 'family.write', resource: 'family', action: 'write' },
    { name: 'family.members.read', resource: 'family.members', action: 'read' },
    { name: 'family.members.write', resource: 'family.members', action: 'write' },
    { name: 'finance.accounts.read', resource: 'finance.accounts', action: 'read' },
    { name: 'finance.accounts.write', resource: 'finance.accounts', action: 'write' },
    { name: 'finance.transactions.read', resource: 'finance.transactions', action: 'read' },
    { name: 'finance.transactions.write', resource: 'finance.transactions', action: 'write' },
    { name: 'finance.transactions.delete', resource: 'finance.transactions', action: 'delete' },
    { name: 'finance.bills.read', resource: 'finance.bills', action: 'read' },
    { name: 'finance.bills.write', resource: 'finance.bills', action: 'write' },
    { name: 'finance.bills.delete', resource: 'finance.bills', action: 'delete' },
    { name: 'finance.cards.read', resource: 'finance.cards', action: 'read' },
    { name: 'finance.cards.write', resource: 'finance.cards', action: 'write' },
    { name: 'finance.cards.delete', resource: 'finance.cards', action: 'delete' },
    { name: 'finance.ai.read', resource: 'finance.ai', action: 'read' },
    { name: 'finance.ai.write', resource: 'finance.ai', action: 'write' },
    { name: 'events.read', resource: 'events', action: 'read' },
    { name: 'events.write', resource: 'events', action: 'write' },
    { name: 'assets.read', resource: 'assets', action: 'read' },
    { name: 'assets.write', resource: 'assets', action: 'write' },
    { name: 'health.read', resource: 'health', action: 'read' },
    { name: 'health.write', resource: 'health', action: 'write' },
    { name: 'contacts.read', resource: 'contacts', action: 'read' },
    { name: 'contacts.write', resource: 'contacts', action: 'write' },
    { name: 'organizer.read', resource: 'organizer', action: 'read' },
    { name: 'organizer.write', resource: 'organizer', action: 'write' },
    { name: 'messages.read', resource: 'messages', action: 'read' },
    { name: 'messages.write', resource: 'messages', action: 'write' },
  ];
  const permIds: string[] = [];
  allPerms.forEach((p) => {
    const id = uid();
    permIds.push(id);
    db.permissions.push({ id, name: p.name, resource: p.resource, action: p.action, created_at: now, updated_at: now });
  });

  // Admin role: all permissions
  permIds.forEach((pid) => db.role_permissions.push({ role_id: roleAdminId, permission_id: pid }));
  // Finance Manager: finance + family.members
  const financeAccountRead = db.permissions.find((p) => p.name === 'finance.accounts.read')?.id;
  const financeAccountWrite = db.permissions.find((p) => p.name === 'finance.accounts.write')?.id;
  const financeBillsRead = db.permissions.find((p) => p.name === 'finance.bills.read')?.id;
  const financeBillsWrite = db.permissions.find((p) => p.name === 'finance.bills.write')?.id;
  const familyMembersRead = db.permissions.find((p) => p.name === 'family.members.read')?.id;
  const familyMembersWrite = db.permissions.find((p) => p.name === 'family.members.write')?.id;
  [financeAccountRead, financeAccountWrite, financeBillsRead, financeBillsWrite, familyMembersRead, familyMembersWrite].filter(Boolean).forEach((pid) => {
    db.role_permissions.push({ role_id: roleFinanceId, permission_id: pid! });
  });
  // Viewer: read-only
  const readPermIds = db.permissions.filter((p) => p.action === 'read').map((p) => p.id);
  readPermIds.forEach((pid) => db.role_permissions.push({ role_id: roleViewerId, permission_id: pid }));

  // Assign "admin" RBAC role to admin user so /auth/me returns full rbac_permissions
  db.user_roles.push({ user_id: SEED_IDS.admin, role_id: roleAdminId });
  // Assign "Viewer" to normal user
  db.user_roles.push({ user_id: SEED_IDS.user, role_id: roleViewerId });

  // Optional: one group with admin as member
  const groupId = uid();
  db.groups.push({ id: groupId, name: 'Finance Team', description: 'Users with finance access', created_at: now, updated_at: now });
  db.user_groups.push({ user_id: SEED_IDS.admin, group_id: groupId });
  db.group_roles.push({ group_id: groupId, role_id: roleFinanceId });
}

export function makeServer({ environment = 'development' } = {}) {
  seed();

  return createServer({
    environment,
    routes() {
      // No namespace: routes match /auth/*, /families, /finance/* as used by api.ts

      // ----- Auth -----
      this.post('/auth/register', (_schema, request) => {
        const body = JSON.parse(request.requestBody);
        const { full_name, email, password } = body;
        if (!email || !password) {
          return new Response(400, {}, { success: false, message: 'Email and password required' });
        }
        const user = {
          id: uid(),
          email,
          full_name: full_name || email.split('@')[0],
          role: 'member',
          is_active: 1,
        };
        db.users.push(user);
        const token = issueToken(user.id);
        return { success: true, message: 'Registered', data: { user: enrichUserWithRbac(user), token } };
      });

      this.post('/auth/login', (_schema, request) => {
        const body = JSON.parse(request.requestBody);
        const { email, password: _password } = body;
        let user = db.users.find((u) => u.email === email);
        if (!user) {
          user = { id: uid(), email, full_name: email.split('@')[0], role: 'member', is_active: 1 };
          db.users.push(user);
        }
        const token = issueToken(user.id);
        return { success: true, message: 'Logged in', data: { user: enrichUserWithRbac(user), token } };
      });

      this.post('/auth/reset-password', (_schema, request) => {
        const body = JSON.parse(request.requestBody || '{}');
        const { email, new_password } = body;
        if (!email || !new_password) {
          return new Response(400, {}, { message: 'Email and new password are required' });
        }
        if (String(new_password).length < 6) {
          return new Response(400, {}, { message: 'New password must be at least 6 characters' });
        }
        const user = db.users.find((u) => u.email === email);
        if (!user) {
          return new Response(404, {}, { message: 'User not found' });
        }
        return { data: null, message: 'Password reset successfully' };
      });

      this.get('/auth/me', (_schema, request) => {
        const user = getUserFromRequest(request);
        if (!user) return new Response(401, {}, { message: 'Unauthorized' });
        const rbacRoles = db.user_roles.filter((ur) => ur.user_id === user.id).map((ur) => db.roles.find((r) => r.id === ur.role_id)).filter(Boolean) as typeof db.roles;
        const roleIds = rbacRoles.map((r) => r.id);
        const permIds = new Set<string>();
        db.role_permissions.filter((rp) => roleIds.includes(rp.role_id)).forEach((rp) => permIds.add(rp.permission_id));
        const rbacPermissions = db.permissions.filter((p) => permIds.has(p.id));
        return { data: { ...user, rbac_roles: rbacRoles, rbac_permissions: rbacPermissions } };
      });

      this.put('/auth/change-password', (_schema, request) => {
        const user = getUserFromRequest(request);
        if (!user) return new Response(401, {}, { message: 'Unauthorized' });
        const body = JSON.parse(request.requestBody || '{}');
        if (!body.current_password || !body.new_password) {
          return new Response(400, {}, { message: 'Current password and new password are required' });
        }
        if (String(body.new_password).length < 6) {
          return new Response(400, {}, { message: 'New password must be at least 6 characters' });
        }
        return { data: null, message: 'Password updated successfully' };
      });

      this.get('/admin/users', (_schema, request) => {
        const user = getUserFromRequest(request);
        if (!user || user.role !== 'root') {
          return new Response(403, {}, { message: 'Forbidden' });
        }
        return { data: db.users };
      });

      this.put('/admin/users/:id/reset-password', (_schema, request) => {
        const user = getUserFromRequest(request);
        if (!user || user.role !== 'root') {
          return new Response(403, {}, { message: 'Forbidden' });
        }
        const body = JSON.parse(request.requestBody || '{}');
        if (!body.new_password) {
          return new Response(400, {}, { message: 'New password is required' });
        }
        if (String(body.new_password).length < 6) {
          return new Response(400, {}, { message: 'New password must be at least 6 characters' });
        }
        return { data: null, message: 'Password reset successfully' };
      });

      // ----- RBAC (root only) -----
      function requireRoot(request: { requestHeaders: Record<string, string | undefined> }) {
        const u = getUserFromRequest(request);
        if (!u || u.role !== 'root') return new Response(403, {}, { message: 'Forbidden' });
        return null;
      }

      this.get('/admin/roles', (_schema, request) => {
        if (requireRoot(request)) return requireRoot(request) as Response;
        return { data: db.roles };
      });
      this.post('/admin/roles', (_schema, request) => {
        if (requireRoot(request)) return requireRoot(request) as Response;
        const body = JSON.parse(request.requestBody);
        const role = { id: uid(), name: body.name ?? '', description: body.description ?? null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        db.roles.push(role);
        return { data: role };
      });
      this.get('/admin/roles/:id', (_schema, request) => {
        if (requireRoot(request)) return requireRoot(request) as Response;
        const r = db.roles.find((x) => x.id === request.params.id);
        if (!r) return new Response(404, {}, { message: 'Not found' });
        const permissions = db.role_permissions.filter((rp) => rp.role_id === r.id).map((rp) => db.permissions.find((p) => p.id === rp.permission_id)).filter(Boolean);
        const user_ids = db.user_roles.filter((ur) => ur.role_id === r.id).map((ur) => ur.user_id);
        return { data: { ...r, permissions: permissions ?? [], user_ids } };
      });
      this.put('/admin/roles/:id', (_schema, request) => {
        if (requireRoot(request)) return requireRoot(request) as Response;
        const r = db.roles.find((x) => x.id === request.params.id);
        if (!r) return new Response(404, {}, { message: 'Not found' });
        const body = JSON.parse(request.requestBody);
        if (body.name !== undefined) r.name = body.name;
        if (body.description !== undefined) r.description = body.description;
        return { data: r };
      });
      this.delete('/admin/roles/:id', (_schema, request) => {
        if (requireRoot(request)) return requireRoot(request) as Response;
        const i = db.roles.findIndex((x) => x.id === request.params.id);
        if (i === -1) return new Response(404, {}, { message: 'Not found' });
        db.roles.splice(i, 1);
        db.role_permissions = db.role_permissions.filter((rp) => rp.role_id !== request.params.id);
        db.user_roles = db.user_roles.filter((ur) => ur.role_id !== request.params.id);
        return { data: null, message: 'Role deleted' };
      });
      this.put('/admin/roles/:id/permissions', (_schema, request) => {
        if (requireRoot(request)) return requireRoot(request) as Response;
        const body = JSON.parse(request.requestBody);
        const permission_ids: string[] = Array.isArray(body.permission_ids) ? body.permission_ids : [];
        db.role_permissions = db.role_permissions.filter((rp) => rp.role_id !== request.params.id);
        permission_ids.forEach((pid) => db.role_permissions.push({ role_id: request.params.id, permission_id: pid }));
        return { data: { permission_ids } };
      });

      this.get('/admin/permissions', (_schema, request) => {
        if (requireRoot(request)) return requireRoot(request) as Response;
        return { data: db.permissions };
      });
      this.post('/admin/permissions', (_schema, request) => {
        if (requireRoot(request)) return requireRoot(request) as Response;
        const body = JSON.parse(request.requestBody);
        const perm = { id: uid(), name: body.name ?? '', resource: body.resource ?? '', action: body.action ?? '', description: body.description ?? null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        db.permissions.push(perm);
        return { data: perm };
      });
      this.get('/admin/permissions/:id', (_schema, request) => {
        if (requireRoot(request)) return requireRoot(request) as Response;
        const p = db.permissions.find((x) => x.id === request.params.id);
        if (!p) return new Response(404, {}, { message: 'Not found' });
        const role_ids = db.role_permissions.filter((rp) => rp.permission_id === p.id).map((rp) => rp.role_id);
        return { data: { ...p, role_ids } };
      });
      this.put('/admin/permissions/:id', (_schema, request) => {
        if (requireRoot(request)) return requireRoot(request) as Response;
        const p = db.permissions.find((x) => x.id === request.params.id);
        if (!p) return new Response(404, {}, { message: 'Not found' });
        const body = JSON.parse(request.requestBody);
        if (body.name !== undefined) p.name = body.name;
        if (body.resource !== undefined) p.resource = body.resource;
        if (body.action !== undefined) p.action = body.action;
        if (body.description !== undefined) p.description = body.description;
        return { data: p };
      });
      this.delete('/admin/permissions/:id', (_schema, request) => {
        if (requireRoot(request)) return requireRoot(request) as Response;
        const i = db.permissions.findIndex((x) => x.id === request.params.id);
        if (i === -1) return new Response(404, {}, { message: 'Not found' });
        db.permissions.splice(i, 1);
        db.role_permissions = db.role_permissions.filter((rp) => rp.permission_id !== request.params.id);
        return { data: null, message: 'Permission deleted' };
      });

      this.get('/admin/groups', (_schema, request) => {
        if (requireRoot(request)) return requireRoot(request) as Response;
        return { data: db.groups };
      });
      this.post('/admin/groups', (_schema, request) => {
        if (requireRoot(request)) return requireRoot(request) as Response;
        const body = JSON.parse(request.requestBody);
        const group = { id: uid(), name: body.name ?? '', description: body.description ?? null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        db.groups.push(group);
        return { data: group };
      });
      this.get('/admin/groups/:id', (_schema, request) => {
        if (requireRoot(request)) return requireRoot(request) as Response;
        const g = db.groups.find((x) => x.id === request.params.id);
        if (!g) return new Response(404, {}, { message: 'Not found' });
        const user_ids = db.user_groups.filter((ug) => ug.group_id === g.id).map((ug) => ug.user_id);
        const role_ids = db.group_roles.filter((gr) => gr.group_id === g.id).map((gr) => gr.role_id);
        return { data: { ...g, user_ids, role_ids } };
      });
      this.put('/admin/groups/:id', (_schema, request) => {
        if (requireRoot(request)) return requireRoot(request) as Response;
        const g = db.groups.find((x) => x.id === request.params.id);
        if (!g) return new Response(404, {}, { message: 'Not found' });
        const body = JSON.parse(request.requestBody);
        if (body.name !== undefined) g.name = body.name;
        if (body.description !== undefined) g.description = body.description;
        return { data: g };
      });
      this.delete('/admin/groups/:id', (_schema, request) => {
        if (requireRoot(request)) return requireRoot(request) as Response;
        const i = db.groups.findIndex((x) => x.id === request.params.id);
        if (i === -1) return new Response(404, {}, { message: 'Not found' });
        db.groups.splice(i, 1);
        db.user_groups = db.user_groups.filter((ug) => ug.group_id !== request.params.id);
        db.group_roles = db.group_roles.filter((gr) => gr.group_id !== request.params.id);
        return { data: null, message: 'Group deleted' };
      });
      this.put('/admin/groups/:id/members', (_schema, request) => {
        if (requireRoot(request)) return requireRoot(request) as Response;
        const body = JSON.parse(request.requestBody);
        const user_ids: string[] = Array.isArray(body.user_ids) ? body.user_ids : [];
        db.user_groups = db.user_groups.filter((ug) => ug.group_id !== request.params.id);
        user_ids.forEach((uid) => db.user_groups.push({ user_id: uid, group_id: request.params.id }));
        return { data: { user_ids } };
      });
      this.put('/admin/groups/:id/roles', (_schema, request) => {
        if (requireRoot(request)) return requireRoot(request) as Response;
        const body = JSON.parse(request.requestBody);
        const role_ids: string[] = Array.isArray(body.role_ids) ? body.role_ids : [];
        db.group_roles = db.group_roles.filter((gr) => gr.group_id !== request.params.id);
        role_ids.forEach((rid) => db.group_roles.push({ group_id: request.params.id, role_id: rid }));
        return { data: { role_ids } };
      });

      this.get('/admin/users/:id/roles', (_schema, request) => {
        if (requireRoot(request)) return requireRoot(request) as Response;
        const roleList = db.user_roles.filter((ur) => ur.user_id === request.params.id).map((ur) => db.roles.find((r) => r.id === ur.role_id)).filter(Boolean);
        return { data: roleList };
      });
      this.put('/admin/users/:id/roles', (_schema, request) => {
        if (requireRoot(request)) return requireRoot(request) as Response;
        const body = JSON.parse(request.requestBody);
        const role_ids: string[] = Array.isArray(body.role_ids) ? body.role_ids : [];
        if (role_ids.length > 1) {
          return new Response(400, {}, { message: 'Only one role can be assigned to a user' });
        }
        db.user_roles = db.user_roles.filter((ur) => ur.user_id !== request.params.id);
        role_ids.forEach((rid) => db.user_roles.push({ user_id: request.params.id, role_id: rid }));
        return { data: { role_ids } };
      });

      // ----- Families -----
      this.get('/families', () => ({ data: db.households }));

      this.get('/families/me', () => {
        const h = db.households[0];
        return { data: h ?? null };
      });

      this.get('/families/:id', (_schema, request) => {
        const h = db.households.find((x) => x.id === request.params.id);
        if (!h) return new Response(404, {}, { message: 'Not found' });
        return { data: h };
      });

      this.post('/families', (_schema, request) => {
        const body = JSON.parse(request.requestBody);
        const user = db.users[0];
        const household = {
          id: uid(),
          name: body.name ?? 'New Household',
          address: body.address,
          created_by: user?.id ?? uid(),
          created_at: new Date().toISOString(),
        };
        db.households.push(household);
        return { data: household };
      });

      this.put('/families/:id', (_schema, request) => {
        const h = db.households.find((x) => x.id === request.params.id);
        if (!h) return new Response(404, {}, { message: 'Not found' });
        const body = JSON.parse(request.requestBody);
        if (body.address !== undefined) h.address = body.address;
        return { data: h };
      });

      this.get('/families/:id/members', (_schema, request) => {
        const list = db.members.filter((m) => m.household_id === request.params.id);
        return { data: list };
      });

      this.post('/families/:id/members', (_schema, request) => {
        const body = JSON.parse(request.requestBody);
        const full_name = [body.fname, body.lname].filter(Boolean).join(' ') || 'Member';
        const member = {
          id: uid(),
          user_id: null,
          household_id: request.params.id,
          role: 'member',
          status: 'pending',
          relation: body.relation ?? null,
          invitation_email: body.email ?? null,
          invitation_sent_at: new Date().toISOString(),
          joined_at: new Date().toISOString(),
          user_email: body.email ?? null,
          user_phone: body.phone ?? null,
          full_name,
        };
        db.members.push(member);
        return { data: member };
      });

      this.put('/families/:householdId/members/:memberId', (_schema, request) => {
        const member = db.members.find((m) => m.id === request.params.memberId && m.household_id === request.params.householdId);
        if (!member) return new Response(404, {}, { message: 'Not found' });
        const body = JSON.parse(request.requestBody);
        const full_name = [body.fname, body.lname].filter(Boolean).join(' ') || member.full_name || 'Member';
        member.full_name = full_name;
        member.user_email = body.email ?? member.user_email;
        member.user_phone = body.phone ?? member.user_phone;
        member.relation = body.relation ?? member.relation;
        return { data: member };
      });

      // ----- Finance: Accounts -----
      this.get('/finance/accounts/:familyId', (_schema, request) => {
        const list = db.accounts.filter((a) => a.family_id === request.params.familyId);
        return { data: list };
      });

      this.post('/finance/accounts', (_schema, request) => {
        const body = JSON.parse(request.requestBody);
        const family_id = body.family_id;
        const account = {
          id: uid(),
          family_id,
          account_name: body.account_name ?? 'Account',
          account_number: body.account_number,
          bank_name: body.bank_name ?? 'Bank',
          account_type: body.account_type ?? 'savings',
          balance: Number(body.balance) ?? 0,
          currency: body.currency ?? 'INR',
        };
        db.accounts.push(account);
        return { data: account };
      });

      this.put('/finance/accounts/:familyId/:accountId', (_schema, request) => {
        const acc = db.accounts.find((a) => a.id === request.params.accountId && a.family_id === request.params.familyId);
        if (!acc) return new Response(404, {}, { message: 'Not found' });
        const body = JSON.parse(request.requestBody);
        Object.assign(acc, body);
        return { data: acc };
      });

      this.delete('/finance/accounts/:familyId/:accountId', (_schema, request) => {
        const i = db.accounts.findIndex((a) => a.id === request.params.accountId && a.family_id === request.params.familyId);
        if (i === -1) return new Response(404, {}, { message: 'Not found' });
        db.accounts.splice(i, 1);
        return { data: { ok: true } };
      });

      // ----- Finance: Transactions -----
      this.get('/finance/transactions/:familyId', (_schema, request) => {
        let list = db.transactions.filter((t) => t.family_id === request.params.familyId);
        const q = request.queryParams;
        if (q?.type) list = list.filter((t) => t.type === q.type);
        if (q?.category) list = list.filter((t) => t.category === q.category);
        if (q?.account_id) list = list.filter((t) => t.account_id === q.account_id);
        if (q?.card_id) list = list.filter((t) => t.card_id === q.card_id);
        if (q?.month) {
          const [y, m] = (q.month as string).split('-').map(Number);
          const start = new Date(y, m - 1, 1).toISOString().slice(0, 10);
          const end = new Date(y, m, 0).toISOString().slice(0, 10);
          list = list.filter((t) => t.transaction_date >= start && t.transaction_date <= end);
        }
        list = [...list].sort((a, b) => {
          const d = (b.transaction_date || '').localeCompare(a.transaction_date || '');
          return d !== 0 ? d : 0;
        });
        return { data: list };
      });

      this.get('/finance/transactions/:familyId/summary', (_schema, request) => {
        let list = db.transactions.filter((t) => t.family_id === request.params.familyId);
        const q = request.queryParams;
        if (q?.month) {
          const [y, m] = (q.month as string).split('-').map(Number);
          const start = new Date(y, m - 1, 1).toISOString().slice(0, 10);
          const end = new Date(y, m, 0).toISOString().slice(0, 10);
          list = list.filter((t) => t.transaction_date >= start && t.transaction_date <= end);
        }
        const total_income = list.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const total_expense = list.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        return { data: { total_income, total_expense, balance: total_income - total_expense } };
      });

      this.post('/finance/transactions', (_schema, request) => {
        const body = JSON.parse(request.requestBody);
        const user = db.users[0];
        const tx = {
          id: uid(),
          family_id: body.family_id,
          account_id: body.account_id ?? db.accounts[0]?.id,
          type: body.type ?? 'expense',
          category: body.category ?? 'Other',
          amount: Number(body.amount) ?? 0,
          description: body.description,
          transaction_date: body.transaction_date ?? new Date().toISOString().slice(0, 10),
          created_by: user?.id ?? uid(),
          created_by_name: user?.full_name,
        };
        db.transactions.push(tx);
        return { data: tx };
      });

      this.put('/finance/transactions/:familyId/:transactionId', (_schema, request) => {
        const tx = db.transactions.find((t) => t.id === request.params.transactionId && t.family_id === request.params.familyId);
        if (!tx) return new Response(404, {}, { message: 'Not found' });
        Object.assign(tx, JSON.parse(request.requestBody));
        return { data: tx };
      });

      this.delete('/finance/transactions/:familyId/:transactionId', (_schema, request) => {
        const i = db.transactions.findIndex((t) => t.id === request.params.transactionId && t.family_id === request.params.familyId);
        if (i === -1) return new Response(404, {}, { message: 'Not found' });
        db.transactions.splice(i, 1);
        return { data: { ok: true } };
      });

      // ----- Finance: Bills -----
      this.get('/finance/bills/:familyId', (_schema, request) => {
        const list = db.bills.filter((b) => b.family_id === request.params.familyId);
        return { data: list };
      });

      this.get('/finance/bills/:familyId/upcoming', (_schema, request) => {
        const list = db.bills.filter((b) => b.family_id === request.params.familyId && b.status === 'pending');
        return { data: list };
      });

      this.post('/finance/bills', (_schema, request) => {
        const body = JSON.parse(request.requestBody);
        const bill = {
          id: uid(),
          family_id: body.family_id,
          bill_name: body.bill_name ?? 'Bill',
          category: body.category ?? 'Other',
          amount: Number(body.amount) ?? 0,
          due_date: body.due_date ?? new Date().toISOString().slice(0, 10),
          is_recurring: Boolean(body.is_recurring),
          recurrence_pattern: body.recurrence_pattern,
          status: body.status ?? 'pending',
        };
        db.bills.push(bill);
        return { data: bill };
      });

      this.put('/finance/bills/:familyId/:billId', (_schema, request) => {
        const bill = db.bills.find((b) => b.id === request.params.billId && b.family_id === request.params.familyId);
        if (!bill) return new Response(404, {}, { message: 'Not found' });
        Object.assign(bill, JSON.parse(request.requestBody));
        return { data: bill };
      });

      this.delete('/finance/bills/:familyId/:billId', (_schema, request) => {
        const i = db.bills.findIndex((b) => b.id === request.params.billId && b.family_id === request.params.familyId);
        if (i === -1) return new Response(404, {}, { message: 'Not found' });
        db.bills.splice(i, 1);
        return { data: { ok: true } };
      });

      // ----- Finance: Cards -----
      this.get('/finance/cards/:familyId', (_schema, request) => {
        const list = db.cards.filter((c) => c.family_id === request.params.familyId);
        return { data: list };
      });

      this.post('/finance/cards', (_schema, request) => {
        const body = JSON.parse(request.requestBody);
        const card = {
          id: uid(),
          family_id: body.family_id,
          card_type: body.card_type ?? 'debit',
          bank_name: body.bank_name ?? 'Bank',
          card_name: body.card_name ?? 'Card',
          last_four_digits: body.last_four_digits ?? '0000',
          card_limit: body.card_limit,
          billing_date: body.billing_date,
          background_color: body.background_color ?? null,
          status: (body.status ?? 'active') as 'active' | 'inactive' | 'blocked',
          created_at: new Date().toISOString(),
        };
        db.cards.push(card);
        return { data: card };
      });

      this.put('/finance/cards/:familyId/:cardId', (_schema, request) => {
        const card = db.cards.find((c) => c.id === request.params.cardId && c.family_id === request.params.familyId);
        if (!card) return new Response(404, {}, { message: 'Not found' });
        Object.assign(card, JSON.parse(request.requestBody));
        return { data: card };
      });

      this.delete('/finance/cards/:familyId/:cardId', (_schema, request) => {
        const i = db.cards.findIndex((c) => c.id === request.params.cardId && c.family_id === request.params.familyId);
        if (i === -1) return new Response(404, {}, { message: 'Not found' });
        db.cards.splice(i, 1);
        return { data: { ok: true } };
      });

      // ----- Finance: Insurance -----
      this.get('/finance/insurance/:familyId', (_schema, request) => {
        return { data: db.insurance.filter((item) => item.family_id === request.params.familyId) };
      });

      this.get('/finance/insurance/:familyId/summary', (_schema, request) => {
        const list = db.insurance.filter((item) => item.family_id === request.params.familyId && item.status === 'active');
        return {
          data: {
            totalCoverage: list.reduce((sum, item) => sum + Number(item.coverageAmount || 0), 0),
            activeCount: list.length,
            premiumTotal: list.reduce((sum, item) => sum + Number(item.premiumAmount || 0), 0)
          }
        };
      });

      this.post('/finance/insurance', (_schema, request) => {
        const body = JSON.parse(request.requestBody);
        const item = {
          id: uid(),
          family_id: body.family_id,
          type: body.type ?? 'other',
          provider: body.provider ?? 'Provider',
          policyName: body.policyName ?? 'Policy',
          policyNumber: body.policyNumber ?? `POL-${uid().slice(-6)}`,
          premiumAmount: Number(body.premiumAmount) || 0,
          premiumFrequency: body.premiumFrequency ?? 'yearly',
          nextDueDate: body.nextDueDate ?? null,
          coverageAmount: Number(body.coverageAmount) || 0,
          insuredMembers: Array.isArray(body.insuredMembers) ? body.insuredMembers : [],
          status: body.status ?? 'active',
        };
        db.insurance.push(item);
        return { data: item };
      });

      this.put('/finance/insurance/:familyId/:insuranceId', (_schema, request) => {
        const item = db.insurance.find((entry) => entry.id === request.params.insuranceId && entry.family_id === request.params.familyId);
        if (!item) return new Response(404, {}, { message: 'Not found' });
        Object.assign(item, JSON.parse(request.requestBody));
        return { data: item };
      });

      this.delete('/finance/insurance/:familyId/:insuranceId', (_schema, request) => {
        const index = db.insurance.findIndex((entry) => entry.id === request.params.insuranceId && entry.family_id === request.params.familyId);
        if (index === -1) return new Response(404, {}, { message: 'Not found' });
        db.insurance.splice(index, 1);
        return { data: { ok: true } };
      });

      // ----- Finance: Investments -----
      this.get('/finance/investments/:familyId', (_schema, request) => {
        return { data: db.investments.filter((item) => item.family_id === request.params.familyId) };
      });

      this.get('/finance/investments/:familyId/summary', (_schema, request) => {
        const list = db.investments.filter((item) => item.family_id === request.params.familyId);
        const totalCurrentValue = list.reduce((sum, item) => sum + Number(item.currentValue || 0), 0);
        const totalInvested = list.reduce((sum, item) => sum + Number(item.investedAmount || 0), 0);
        return {
          data: {
            totalCurrentValue,
            totalInvested,
            totalGain: totalCurrentValue - totalInvested,
            totalCount: list.length
          }
        };
      });

      this.post('/finance/investments', (_schema, request) => {
        const body = JSON.parse(request.requestBody);
        const item = {
          id: uid(),
          family_id: body.family_id,
          type: body.type ?? 'other',
          name: body.name ?? 'Investment',
          folioNumber: body.folioNumber ?? `FOLIO-${uid().slice(-6)}`,
          sipAmount: Number(body.sipAmount) || 0,
          sipDay: Number(body.sipDay) || 1,
          startDate: body.startDate ?? new Date().toISOString().slice(0, 10),
          currentValue: Number(body.currentValue) || 0,
          investedAmount: Number(body.investedAmount) || 0,
          units: Number(body.units) || 0,
          nav: Number(body.nav) || 0,
          platform: body.platform ?? null,
          status: body.status ?? 'active',
        };
        db.investments.push(item);
        return { data: item };
      });

      this.put('/finance/investments/:familyId/:investmentId', (_schema, request) => {
        const item = db.investments.find((entry) => entry.id === request.params.investmentId && entry.family_id === request.params.familyId);
        if (!item) return new Response(404, {}, { message: 'Not found' });
        Object.assign(item, JSON.parse(request.requestBody));
        return { data: item };
      });

      this.delete('/finance/investments/:familyId/:investmentId', (_schema, request) => {
        const index = db.investments.findIndex((entry) => entry.id === request.params.investmentId && entry.family_id === request.params.familyId);
        if (index === -1) return new Response(404, {}, { message: 'Not found' });
        db.investments.splice(index, 1);
        return { data: { ok: true } };
      });

      // ----- Finance: Loans -----
      this.get('/finance/loans/:familyId', (_schema, request) => {
        return { data: db.loans.filter((item) => item.family_id === request.params.familyId) };
      });

      this.get('/finance/loans/:familyId/summary', (_schema, request) => {
        const list = db.loans.filter((item) => item.family_id === request.params.familyId && item.status === 'active');
        return {
          data: {
            totalOutstanding: list.reduce((sum, item) => sum + Number(item.outstandingPrincipal || 0), 0),
            totalEmi: list.reduce((sum, item) => sum + Number(item.emiAmount || 0), 0),
            activeCount: list.length
          }
        };
      });

      this.post('/finance/loans', (_schema, request) => {
        const body = JSON.parse(request.requestBody);
        const item = {
          id: uid(),
          family_id: body.family_id,
          name: body.name ?? 'Loan',
          lender: body.lender ?? 'Lender',
          principalAmount: Number(body.principalAmount) || 0,
          interestRate: Number(body.interestRate) || 0,
          tenureMonths: Number(body.tenureMonths) || 0,
          emiAmount: Number(body.emiAmount) || 0,
          startDate: body.startDate ?? null,
          nextDueDate: body.nextDueDate ?? null,
          outstandingPrincipal: Number(body.outstandingPrincipal) || 0,
          type: body.type ?? 'other',
          status: body.status ?? 'active',
        };
        db.loans.push(item);
        return { data: item };
      });

      this.put('/finance/loans/:familyId/:loanId', (_schema, request) => {
        const item = db.loans.find((entry) => entry.id === request.params.loanId && entry.family_id === request.params.familyId);
        if (!item) return new Response(404, {}, { message: 'Not found' });
        Object.assign(item, JSON.parse(request.requestBody));
        return { data: item };
      });

      this.delete('/finance/loans/:familyId/:loanId', (_schema, request) => {
        const index = db.loans.findIndex((entry) => entry.id === request.params.loanId && entry.family_id === request.params.familyId);
        if (index === -1) return new Response(404, {}, { message: 'Not found' });
        db.loans.splice(index, 1);
        return { data: { ok: true } };
      });

      // ----- Finance: AI insights (mock for Dashboard) -----
      this.get('/finance/ai/insights/:familyId', (_schema, request) => {
        const familyId = request.params.familyId;
        const accounts = db.accounts.filter((a) => a.family_id === familyId);
        const totalBalance = accounts.reduce((s, a) => s + Number(a.balance || 0), 0);
        let transactions = db.transactions.filter((t) => t.family_id === familyId);
        const q = request.queryParams;
        const monthStr = (q?.month as string) || new Date().toISOString().slice(0, 7);
        const [y, m] = monthStr.split('-').map(Number);
        const start = new Date(y, m - 1, 1).toISOString().slice(0, 10);
        const end = new Date(y, m, 0).toISOString().slice(0, 10);
        transactions = transactions.filter((t) => t.transaction_date >= start && t.transaction_date <= end);
        const total_income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const total_expense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const savingsRate = total_income > 0 ? ((total_income - total_expense) / total_income) * 100 : 0;
        const upcomingBills = db.bills.filter((b) => b.family_id === familyId && b.status === 'pending').length;
        const data = {
          total_balance: totalBalance,
          total_income,
          total_expense,
          savings_rate: Math.round(savingsRate * 100) / 100,
          upcoming_bills: upcomingBills,
        };
        const insights =
          'Financial health looks stable. Key observations: Total balance and monthly flow are tracked. Consider keeping savings rate above 20%. Recommendations: Review upcoming bills, and add more transactions for better insights.';
        return { data: { data, insights, ai_available: true } };
      });

      this.get('/finance/ai/risk-suggestions/:familyId', (_schema, request) => {
        const familyId = request.params.familyId;
        const accounts = db.accounts.filter((a) => a.family_id === familyId);
        const totalBalance = accounts.reduce((s, a) => s + Number(a.balance || 0), 0);
        let transactions = db.transactions.filter((t) => t.family_id === familyId);
        const q = request.queryParams;
        const monthStr = (q?.month as string) || new Date().toISOString().slice(0, 7);
        const [y, m] = monthStr.split('-').map(Number);
        const start = new Date(y, m - 1, 1).toISOString().slice(0, 10);
        const end = new Date(y, m, 0).toISOString().slice(0, 10);
        transactions = transactions.filter((t) => t.transaction_date >= start && t.transaction_date <= end);
        const total_income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const total_expense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const bills = db.bills.filter((b) => b.family_id === familyId && b.status === 'pending');
        const billsTotal = bills.reduce((s, b) => s + Number(b.amount || 0), 0);
        const risks: string[] = [];
        if (total_expense > totalBalance && totalBalance > 0) {
          risks.push('Monthly expenses exceed current balance; consider delaying non-essential spending.');
        }
        if (bills.length > 0 && billsTotal > totalBalance) {
          risks.push(`Bills due total ₹${billsTotal.toLocaleString()} but balance is ₹${totalBalance.toLocaleString()}.`);
        }
        if (total_income > 0 && total_expense / total_income > 0.9) {
          risks.push('Spending is over 90% of income this month; savings may be at risk.');
        }
        return { data: { risks, ai_available: true } };
      });

      this.post('/finance/ai/ask-month/:familyId', (_schema, request) => {
        const body = JSON.parse(request.requestBody || '{}');
        const q = ((body.question || '') as string).toLowerCase();
        const familyId = request.params.familyId;
        const monthStr = (body.month as string) || new Date().toISOString().slice(0, 7);
        const [y, m] = monthStr.split('-').map(Number);
        const start = new Date(y, m - 1, 1).toISOString().slice(0, 10);
        const end = new Date(y, m, 0).toISOString().slice(0, 10);
        const txs = db.transactions.filter(
          (t) => t.family_id === familyId && t.transaction_date >= start && t.transaction_date <= end
        );
        const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const byCat = new Map<string, number>();
        txs.filter((t) => t.type === 'expense').forEach((t) => {
          const cat = t.category || 'Other';
          byCat.set(cat, (byCat.get(cat) || 0) + t.amount);
        });
        const top3 = Array.from(byCat.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([c]) => c);
        let answer = `This month: income ₹${income.toLocaleString()}, expenses ₹${expense.toLocaleString()}.`;
        if (/\btop\s*3|top three|biggest|largest\b/.test(q) && top3.length > 0) {
          answer += ` Top 3 categories: ${top3.join(', ')}.`;
        }
        if (/\bwhy.*(high|expense|spend)\b|\bexpense.*high\b/.test(q)) {
          answer += ` Expense is driven mainly by ${top3[0] || 'general spending'}.`;
        }
        return { data: { answer, ai_available: true } };
      });

      this.get('/finance/ai/cashflow-tips/:familyId', (_schema, request) => {
        const familyId = request.params.familyId;
        const bills = db.bills.filter((b) => b.family_id === familyId && b.status === 'pending');
        const accounts = db.accounts.filter((a) => a.family_id === familyId);
        const balance = accounts.reduce((s, a) => s + Number(a.balance || 0), 0);
        const now = Date.now();
        const in5 = 5 * 24 * 60 * 60 * 1000;
        const dueIn5 = bills.filter((b) => {
          const t = new Date(b.due_date).getTime();
          return t >= now && t <= now + in5;
        });
        const totalDue5 = dueIn5.reduce((s, b) => s + Number(b.amount || 0), 0);
        const shortfall = Math.max(0, totalDue5 - balance);
        const tips: string[] = [];
        if (dueIn5.length > 0) {
          tips.push(`${dueIn5.length} bill(s) due in 5 days${shortfall > 0 ? `; balance might be short by ₹${shortfall.toLocaleString()}` : ''}.`);
        }
        if (bills.length >= 2 && balance < bills.reduce((s, b) => s + Number(b.amount || 0), 0)) {
          const sorted = [...bills].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
          tips.push(`Consider paying ${sorted[0].bill_name} (${sorted[0].due_date}) before ${sorted[1].bill_name}.`);
        }
        return { data: { tips, ai_available: true } };
      });

      this.get('/finance/ai/narrative-summary/:familyId', (_schema, request) => {
        const familyId = request.params.familyId;
        const monthStr = (request.queryParams?.month as string) || new Date().toISOString().slice(0, 7);
        const [y, m] = monthStr.split('-').map(Number);
        const start = new Date(y, m - 1, 1).toISOString().slice(0, 10);
        const end = new Date(y, m, 0).toISOString().slice(0, 10);
        const txs = db.transactions.filter(
          (t) => t.family_id === familyId && t.transaction_date >= start && t.transaction_date <= end
        );
        const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;
        const bills = db.bills.filter((b) => b.family_id === familyId && b.status === 'pending').length;
        const narrative =
          `This month income is ₹${income.toLocaleString()} and expenses ₹${expense.toLocaleString()}; savings rate ${savingsRate.toFixed(1)}%. ${bills} pending bill(s).`;
        return { data: { narrative, ai_available: true } };
      });

      this.get('/finance/ai/category-insights/:familyId', (_schema, request) => {
        const familyId = request.params.familyId;
        const monthStr = (request.queryParams?.month as string) || new Date().toISOString().slice(0, 7);
        const [y, m] = monthStr.split('-').map(Number);
        const start = new Date(y, m - 1, 1).toISOString().slice(0, 10);
        const end = new Date(y, m, 0).toISOString().slice(0, 10);
        const txs = db.transactions.filter(
          (t) => t.family_id === familyId && t.type === 'expense' && t.transaction_date >= start && t.transaction_date <= end
        );
        const byCat = new Map<string, number>();
        let total = 0;
        txs.forEach((t) => {
          const cat = t.category || 'Other';
          const amt = Number(t.amount || 0);
          byCat.set(cat, (byCat.get(cat) || 0) + amt);
          total += amt;
        });
        const insights = Array.from(byCat.entries())
          .map(([category, amount]) => ({
            category,
            amount,
            percent: total > 0 ? Math.round((amount / total) * 1000) / 10 : 0,
            summary: `${category} is ${total > 0 ? Math.round((amount / total) * 1000) / 10 : 0}% of expenses this month.`,
          }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 8);
        return { data: { insights, ai_available: true } };
      });

      this.post('/finance/ai/interpret-search/:familyId', (_schema, request) => {
        const body = JSON.parse(request.requestBody || '{}');
        const q = ((body.q || '') as string).toLowerCase().trim();
        const spec: Record<string, unknown> = {};
        if (/\b(last\s+week|past\s+week)\b/.test(q)) {
          const now = new Date();
          const day = now.getDay();
          const diffToMonday = day === 0 ? 6 : day - 1;
          const lastMonday = new Date(now);
          lastMonday.setDate(now.getDate() - diffToMonday - 7);
          const lastSunday = new Date(lastMonday);
          lastSunday.setDate(lastMonday.getDate() + 6);
          spec.date_from = lastMonday.toISOString().slice(0, 10);
          spec.date_to = lastSunday.toISOString().slice(0, 10);
        }
        if (/\b(biggest|largest|highest)\b.*\b(expense|spend)\b/.test(q) || /\bexpense.*\b(biggest|largest)\b/.test(q)) {
          spec.type = 'expense';
          spec.sort = 'amount_high';
        }
        const words = q.replace(/\b(last week|this month|biggest|expense|income)\b/gi, '').trim().split(/\s+/).filter(Boolean);
        if (words.length > 0) spec.description_contains = words[0];
        return { data: { spec, ai_available: true } };
      });

      this.get('/finance/ai/savings-tips/:familyId', () => {
        const tips = [
          'Track small daily expenses to find easy cuts.',
          'Set a monthly cap for discretionary spending.',
          'Review subscriptions and cancel unused ones.',
        ];
        return { tips, ai_available: true };
      });

      this.post('/finance/ai/suggest-category/:familyId', (_schema, request) => {
        const body = JSON.parse(request.requestBody);
        const desc = ((body.description ?? '') as string).toLowerCase();
        // const amount = Number(body.amount);
        const categories: Array<{ keywords: string[]; category: string; type: 'income' | 'expense' }> = [
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
        for (const { keywords, category, type } of categories) {
          if (keywords.some((k) => desc.includes(k))) {
            return { category, type };
          }
        }
        return { category: 'Other', type: 'expense' };
      });

      this.post('/finance/ai/suggest-bill-category/:familyId', (_schema, request) => {
        const body = JSON.parse(request.requestBody);
        const name = ((body.bill_name ?? '') as string).toLowerCase();
        const billCategories: Array<{ keywords: string[]; category: string }> = [
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
        for (const { keywords, category } of billCategories) {
          if (keywords.some((k) => name.includes(k))) {
            return { category };
          }
        }
        return { category: 'Other' };
      });

      this.get('/finance/ai/parse-sms-history/:familyId', (_schema, request) => {
        const limit = Number(request.queryParams.limit || 25);
        const list = db.sms_history
          .filter((item) => item.family_id === request.params.familyId)
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, Number.isFinite(limit) ? limit : 25);
        return { data: list };
      });

      this.get('/finance/ai/parse-sms-prompt/:familyId', (_schema, request) => {
        const input = typeof request.queryParams.input === 'string' ? request.queryParams.input : '';
        return {
          data: {
            prompt_id: 'finance.sms-transaction',
            label: 'Finance SMS Transaction Parser',
            prompt: `Extract amount, type, category, description, date, payment source, and last 4 digits from this SMS.\nInput: ${input || 'Your A/c XX1234 debited by Rs.500 at Store.'}`,
            sample_input: input || 'Your A/c XX1234 debited by Rs.500 at Store.'
          }
        };
      });

      this.post('/finance/ai/parse-sms/:familyId', (_schema, request) => {
        const body = JSON.parse(request.requestBody || '{}');
        const text = String(body.sms_text || '');
        const amount = parseCurrencyAmount(text);
        const isIncome = /\b(credited|salary|deposit|received)\b/i.test(text);
        const paymentSource = /\b(card|credit card|debit card)\b/i.test(text) ? 'card' : /\b(a\/c|acct|account)\b/i.test(text) ? 'account' : 'unknown';
        const lastFour = text.match(/(?:xx|x{2,}|\*{2,}|ending)\s*([0-9]{4})/i)?.[1]
          || text.match(/\b([0-9]{4})\b/)?.[1]
          || '';
        const category = /amazon|flipkart|shopping/i.test(text)
          ? 'Shopping'
          : /swiggy|zomato|restaurant|food/i.test(text)
            ? 'Food'
            : /electric|water|gas|internet|broadband/i.test(text)
              ? 'Utilities'
              : isIncome
                ? 'Salary'
                : 'Other';
        const description = text.trim().slice(0, 80) || 'SMS transaction';
        const familyId = request.params.familyId;
        const user = db.users[0];
        const matchedAccount = paymentSource === 'account'
          ? db.accounts.find((account) => account.family_id === familyId && (account.account_number || '').includes(lastFour))
          : null;
        const matchedCard = paymentSource === 'card'
          ? db.cards.find((card) => card.family_id === familyId && card.last_four_digits === lastFour)
          : null;
        const transactionId = uid();
        const transaction = {
          id: transactionId,
          family_id: familyId,
          account_id: matchedAccount?.id ?? db.accounts[0]?.id ?? null,
          card_id: matchedCard?.id ?? null,
          type: isIncome ? 'income' : 'expense',
          category,
          amount: amount ?? 0,
          description,
          transaction_date: new Date().toISOString().slice(0, 10),
          created_by: user?.id ?? uid(),
          created_by_name: user?.full_name ?? 'Admin User',
        };
        db.transactions.push(transaction);

        const historyRecord = {
          id: uid(),
          family_id: familyId,
          input_text: text,
          model_used: 'mirage-mock',
          output: transaction,
          date: new Date().toISOString(),
          accuracy: 0.92,
          status: 'transaction_created',
          parse_type: 'transaction_sms',
          transaction_id: transactionId,
          created_by: user?.id ?? null,
          amount: transaction.amount,
          category: transaction.category,
          type: transaction.type,
          description: transaction.description
        };
        db.sms_history.unshift(historyRecord);

        return {
          data: {
            parsed: {
              amount: transaction.amount,
              type: transaction.type,
              category: transaction.category,
              description: transaction.description,
              transaction_date: transaction.transaction_date,
              payment_source: paymentSource,
              last_four_digits: lastFour,
              linked_account_id: transaction.account_id,
              linked_card_id: transaction.card_id,
              linked_payment_source: matchedCard ? 'card' : matchedAccount ? 'account' : null,
              matched_last_four_digits: lastFour || null
            },
            created: true,
            transaction_id: transactionId,
            ai_model_id: historyRecord.id
          }
        };
      });

      this.post('/finance/ai/parse-sms-card/:familyId', (_schema, request) => {
        const body = JSON.parse(request.requestBody || '{}');
        const text = String(body.sms_text || '');
        return {
          data: {
            bank_name: /hdfc/i.test(text) ? 'HDFC Bank' : /icici/i.test(text) ? 'ICICI Bank' : 'Mock Bank',
            card_name: /platinum/i.test(text) ? 'Platinum Card' : /regalia/i.test(text) ? 'Regalia' : 'Card',
            last_four_digits: text.match(/([0-9]{4})/)?.[1] ?? '0000',
            card_type: /debit/i.test(text) ? 'debit' : 'credit',
            card_limit: parseCurrencyAmount(text)
          }
        };
      });

      this.post('/finance/ai/parse-sms-insurance/:familyId', (_schema, request) => {
        const text = String(JSON.parse(request.requestBody || '{}').sms_text || '');
        return {
          data: {
            type: /health/i.test(text) ? 'health' : /life/i.test(text) ? 'life' : 'other',
            provider: /hdfc/i.test(text) ? 'HDFC Ergo' : 'Mock Insurance',
            policyName: 'Policy',
            policyNumber: text.match(/[A-Z0-9-]{6,}/)?.[0] ?? 'POL-1001',
            premiumAmount: parseCurrencyAmount(text) ?? 0,
            premiumFrequency: 'yearly',
            nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            coverageAmount: 500000,
            insuredMembers: [],
            status: 'active'
          }
        };
      });

      this.post('/finance/ai/parse-sms-investment/:familyId', (_schema, request) => {
        const text = String(JSON.parse(request.requestBody || '{}').sms_text || '');
        return {
          data: {
            type: /fd/i.test(text) ? 'fd' : /stock/i.test(text) ? 'stock' : 'mutual_fund',
            name: /nippon/i.test(text) ? 'Nippon India Fund' : 'Investment',
            folioNumber: text.match(/[A-Z0-9-]{6,}/)?.[0] ?? 'FOLIO-1001',
            sipAmount: parseCurrencyAmount(text) ?? 0,
            sipDay: 10,
            startDate: new Date().toISOString().slice(0, 10),
            currentValue: parseCurrencyAmount(text) ?? 0,
            investedAmount: parseCurrencyAmount(text) ?? 0,
            units: 0,
            nav: 0,
            platform: 'Mock Grow',
            status: 'active'
          }
        };
      });

      this.post('/finance/ai/parse-sms-loan/:familyId', (_schema, request) => {
        const text = String(JSON.parse(request.requestBody || '{}').sms_text || '');
        return {
          data: {
            name: /home/i.test(text) ? 'Home Loan' : 'Loan',
            lender: /sbi/i.test(text) ? 'SBI' : 'Mock Bank',
            principalAmount: parseCurrencyAmount(text) ?? 0,
            interestRate: 9.5,
            tenureMonths: 60,
            emiAmount: parseCurrencyAmount(text) ?? 0,
            startDate: new Date().toISOString().slice(0, 10),
            nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            outstandingPrincipal: parseCurrencyAmount(text) ?? 0,
            type: /home/i.test(text) ? 'home' : /car/i.test(text) ? 'car' : 'other',
            status: 'active'
          }
        };
      });

      // ----- Assets -----
      this.get('/assets/:familyId/expiring-documents', (_schema, request) => {
        const days = Number(request.queryParams.days || 30);
        const cutoff = Date.now() + days * 24 * 60 * 60 * 1000;
        const list = db.assets.filter((item) =>
          item.family_id === request.params.familyId
          && item.asset_type === 'document'
          && item.expiry_date
          && new Date(item.expiry_date).getTime() <= cutoff
        );
        return { data: list };
      });

      this.get('/assets/:familyId/vehicles/service-due', (_schema, request) => {
        const days = Number(request.queryParams.days || 30);
        const cutoff = Date.now() + days * 24 * 60 * 60 * 1000;
        const list = db.assets.filter((item) =>
          item.family_id === request.params.familyId
          && item.asset_type === 'vehicle'
          && item.expiry_date
          && new Date(item.expiry_date).getTime() <= cutoff
        );
        return { data: list };
      });

      this.get('/assets/:familyId/valuation', (_schema, request) => {
        const list = db.assets.filter((item) => item.family_id === request.params.familyId);
        return {
          data: {
            total_value: list.reduce((sum, item) => sum + Number(item.current_value || 0), 0),
            asset_count: list.length
          }
        };
      });

      this.get('/assets/:familyId/:assetId', (_schema, request) => {
        const asset = db.assets.find((item) => item.id === request.params.assetId && item.family_id === request.params.familyId);
        if (!asset) return new Response(404, {}, { message: 'Not found' });
        return { data: asset };
      });

      this.get('/assets/:familyId', (_schema, request) => {
        let list = db.assets.filter((item) => item.family_id === request.params.familyId);
        if (request.queryParams.type) list = list.filter((item) => item.asset_type === request.queryParams.type);
        return { data: list };
      });

      this.post('/assets', (_schema, request) => {
        const body = JSON.parse(request.requestBody);
        const asset = {
          id: uid(),
          family_id: body.family_id,
          asset_type: body.asset_type ?? 'other',
          name: body.name ?? 'Asset',
          description: body.description ?? null,
          purchase_date: body.purchase_date ?? null,
          purchase_price: Number(body.purchase_price) || 0,
          current_value: Number(body.current_value) || 0,
          location: body.location ?? null,
          expiry_date: body.expiry_date ?? null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        db.assets.push(asset);
        return { data: asset };
      });

      this.put('/assets/:familyId/:assetId', (_schema, request) => {
        const asset = db.assets.find((item) => item.id === request.params.assetId && item.family_id === request.params.familyId);
        if (!asset) return new Response(404, {}, { message: 'Not found' });
        Object.assign(asset, JSON.parse(request.requestBody), { updated_at: new Date().toISOString() });
        return { data: asset };
      });

      this.delete('/assets/:familyId/:assetId', (_schema, request) => {
        const index = db.assets.findIndex((item) => item.id === request.params.assetId && item.family_id === request.params.familyId);
        if (index === -1) return new Response(404, {}, { message: 'Not found' });
        db.assets.splice(index, 1);
        return { data: { ok: true } };
      });

      // ----- Events -----
      this.get('/events', (_schema, request) => {
        const familyId = request.queryParams.family_id;
        let list = familyId ? db.events.filter((item) => item.family_id === familyId) : [...db.events];
        if (request.queryParams.status) list = list.filter((item) => item.status === request.queryParams.status);
        return { data: list };
      });

      this.post('/events', (_schema, request) => {
        const body = JSON.parse(request.requestBody);
        const event = {
          id: uid(),
          family_id: body.family_id,
          name: body.name ?? 'Event',
          type: body.type ?? 'other',
          start_date: body.start_date ?? new Date().toISOString().slice(0, 10),
          end_date: body.end_date ?? null,
          location: body.location ?? null,
          total_budget: Number(body.total_budget) || 0,
          notes: body.notes ?? null,
          status: body.status ?? 'planned',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        db.events.push(event);
        return { data: event };
      });

      this.get('/events/:eventId', (_schema, request) => {
        const familyId = request.queryParams.family_id;
        const event = db.events.find((item) => item.id === request.params.eventId && (!familyId || item.family_id === familyId));
        if (!event) return new Response(404, {}, { message: 'Not found' });
        return { data: event };
      });

      this.patch('/events/:eventId', (_schema, request) => {
        const familyId = request.queryParams.family_id;
        const event = db.events.find((item) => item.id === request.params.eventId && (!familyId || item.family_id === familyId));
        if (!event) return new Response(404, {}, { message: 'Not found' });
        Object.assign(event, JSON.parse(request.requestBody), { updated_at: new Date().toISOString() });
        return { data: event };
      });

      this.delete('/events/:eventId', (_schema, request) => {
        const familyId = request.queryParams.family_id;
        const index = db.events.findIndex((item) => item.id === request.params.eventId && (!familyId || item.family_id === familyId));
        if (index === -1) return new Response(404, {}, { message: 'Not found' });
        db.sub_events = db.sub_events.filter((item) => item.event_id !== request.params.eventId);
        db.event_participants = db.event_participants.filter((item) => item.event_id !== request.params.eventId);
        db.events.splice(index, 1);
        return { data: { ok: true } };
      });

      this.get('/events/:eventId/sub-events', (_schema, request) => {
        return { data: db.sub_events.filter((item) => item.event_id === request.params.eventId) };
      });

      this.post('/events/:eventId/sub-events', (_schema, request) => {
        const body = JSON.parse(request.requestBody);
        const item = {
          id: uid(),
          event_id: request.params.eventId,
          name: body.name ?? 'Sub Event',
          date_time: body.date_time ?? new Date().toISOString(),
          location: body.location ?? null,
          budget: Number(body.budget) || 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        db.sub_events.push(item);
        return { data: item };
      });

      this.get('/events/:eventId/participants', (_schema, request) => {
        return {
          data: db.event_participants
            .filter((item) => item.event_id === request.params.eventId)
            .map((item) => ({
              ...item,
              contact: db.contacts.find((contact) => contact.id === item.contact_id) ?? null
            }))
        };
      });

      this.post('/events/:eventId/participants', (_schema, request) => {
        const body = JSON.parse(request.requestBody);
        const item = {
          id: uid(),
          event_id: request.params.eventId,
          contact_id: body.contact_id ?? '',
          role: body.role ?? 'guest',
          rsvp_status: body.rsvp_status ?? 'pending',
          gender: body.gender ?? null,
          age_group: body.age_group ?? null,
          gifts: Array.isArray(body.gifts) ? body.gifts : [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        db.event_participants.push(item);
        return { data: item };
      });

      this.patch('/events/:eventId/participants/:participantId', (_schema, request) => {
        const item = db.event_participants.find((entry) => entry.id === request.params.participantId && entry.event_id === request.params.eventId);
        if (!item) return new Response(404, {}, { message: 'Not found' });
        Object.assign(item, JSON.parse(request.requestBody), { updated_at: new Date().toISOString() });
        return { data: item };
      });

      this.delete('/events/:eventId/participants/:participantId', (_schema, request) => {
        const index = db.event_participants.findIndex((entry) => entry.id === request.params.participantId && entry.event_id === request.params.eventId);
        if (index === -1) return new Response(404, {}, { message: 'Not found' });
        db.event_participants.splice(index, 1);
        return { data: { ok: true } };
      });

      this.get('/events/:eventId/finance-summary', (_schema, request) => {
        const event = db.events.find((entry) => entry.id === request.params.eventId);
        if (!event) return new Response(404, {}, { message: 'Not found' });
        const eventTransactions = db.transactions.filter((item) => item.event_id === request.params.eventId);
        const bySubEvent = db.sub_events
          .filter((item) => item.event_id === request.params.eventId)
          .map((item) => ({
            subEventId: item.id,
            name: item.name,
            budget: item.budget,
            totalSpent: eventTransactions
              .filter((tx) => tx.sub_event_id === item.id && tx.type === 'expense')
              .reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
          }));
        const totalSpent = eventTransactions
          .filter((item) => item.type === 'expense')
          .reduce((sum, item) => sum + Number(item.amount || 0), 0);
        return {
          data: {
            totalBudget: Number(event.total_budget || 0),
            totalSpent,
            remainingBudget: Number(event.total_budget || 0) - totalSpent,
            bySubEvent
          }
        };
      });

      this.get('/events/:eventId/ai-insights', (_schema, request) => {
        const event = db.events.find((entry) => entry.id === request.params.eventId);
        if (!event) return new Response(404, {}, { message: 'Not found' });
        return {
          data: {
            eventId: event.id,
            message: `${event.name} is on track. Review vendor allocations and participant RSVPs for smoother planning.`,
            ai_available: true
          }
        };
      });

      // ----- Contacts -----
      this.get('/contacts/:familyId/summary', (_schema, request) => {
        const list = db.contacts.filter((item) => item.family_id === request.params.familyId);
        return { data: { total: list.length, last_synced_at: list[0]?.last_synced_at ?? null } };
      });

      this.get('/contacts/:familyId/cleanup-suggestions', (_schema, request) => {
        const suggestions = db.contacts
          .filter((item) => item.family_id === request.params.familyId)
          .filter((item, index, list) => list.findIndex((other) => other.phone_norm === item.phone_norm && item.phone_norm) !== index)
          .map((item) => ({ id: item.id, reasons: ['Duplicate phone number'], ai_reason: 'Same normalized phone detected.' }));
        return { data: { suggestions, ai_available: true, ai_used: false } };
      });

      this.post('/contacts/:familyId/cleanup-apply', (_schema, request) => {
        const duplicates = db.contacts
          .filter((item) => item.family_id === request.params.familyId)
          .filter((item, index, list) => list.findIndex((other) => other.phone_norm === item.phone_norm && item.phone_norm) !== index);
        const ids = duplicates.map((item) => item.id);
        const reasons = Object.fromEntries(ids.map((id) => [id, ['Duplicate phone number']]));
        db.contacts = db.contacts.filter((item) => !ids.includes(item.id));
        return { data: { deleted: ids.length, ids, reasons } };
      });

      this.get('/contacts/:familyId', (_schema, request) => {
        let list = db.contacts.filter((item) => item.family_id === request.params.familyId);
        const q = typeof request.queryParams.q === 'string' ? request.queryParams.q.trim() : '';
        if (q) {
          list = list.filter((item) =>
            matchesText(item.name, q) || matchesText(item.phone, q) || matchesText(item.email, q)
          );
        }
        const limit = Number(request.queryParams.limit || 0);
        if (Number.isFinite(limit) && limit > 0) list = list.slice(0, limit);
        return { data: list };
      });

      this.patch('/contacts/:id', (_schema, request) => {
        const contact = db.contacts.find((item) => item.id === request.params.id);
        if (!contact) return new Response(404, {}, { message: 'Not found' });
        const body = JSON.parse(request.requestBody);
        Object.assign(contact, body, {
          phone_number: normalizePhone(body.phone ?? contact.phone),
          phone_norm: normalizePhone(body.phone ?? contact.phone),
          last_synced_at: new Date().toISOString()
        });
        return { data: contact };
      });

      this.delete('/contacts/:id', (_schema, request) => {
        const index = db.contacts.findIndex((item) => item.id === request.params.id);
        if (index === -1) return new Response(404, {}, { message: 'Not found' });
        db.contacts.splice(index, 1);
        return { data: { id: request.params.id } };
      });

      // ----- Admin AI Prompts -----
      this.get('/admin/ai-prompts', (_schema, request) => {
        if (requireRoot(request)) return requireRoot(request) as Response;
        return { data: promptTemplates };
      });

      this.get('/admin/ai-prompts/:id/preview', (_schema, request) => {
        if (requireRoot(request)) return requireRoot(request) as Response;
        const template = promptTemplates.find((item) => item.id === request.params.id);
        if (!template) return new Response(404, {}, { message: 'Not found' });
        const input = typeof request.queryParams.input === 'string' ? request.queryParams.input : template.inputPlaceholder;
        return { data: { prompt: `[${template.label}] ${input}` } };
      });

      this.post('/admin/ai-prompts/test', (_schema, request) => {
        if (requireRoot(request)) return requireRoot(request) as Response;
        const body = JSON.parse(request.requestBody || '{}');
        const template = promptTemplates.find((item) => item.id === body.prompt_id);
        return {
          data: {
            prompt: `[${template?.label ?? 'Unknown Prompt'}] ${body.input ?? ''}`,
            result: 'Mirage mock result generated successfully.',
            ai_available: true
          }
        };
      });
    },
  });
}
