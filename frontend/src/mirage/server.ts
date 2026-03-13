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
  transactions: [] as Array<{ id: string; family_id: string; account_id: string; type: string; category: string; amount: number; description?: string; transaction_date: string; created_by: string; account_name?: string; bank_name?: string; created_by_name?: string }>,
  bills: [] as Array<{ id: string; family_id: string; bill_name: string; category: string; amount: number; due_date: string; is_recurring: boolean; recurrence_pattern?: string; status: string }>,
  cards: [] as Array<{ id: string; family_id: string; card_type: 'credit' | 'debit'; bank_name: string; card_name: string; last_four_digits: string; card_limit?: number; billing_date?: number; status: 'active' | 'inactive' | 'blocked'; created_at: string }>,
};

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function issueToken(userId: string) {
  return `mock-jwt:${userId}:${uid()}`;
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

function seed() {
  const now = new Date().toISOString();
  const rootId = uid();
  db.users.push({
    id: rootId,
    email: 'root@griham.local',
    full_name: 'Root User',
    role: 'root',
    is_active: 1,
  });
  const userId = uid();
  db.users.push({
    id: userId,
    email: 'demo@griham.local',
    full_name: 'Demo User',
    role: 'admin',
    is_active: 1,
  });
  const familyId = uid();
  db.households.push({
    id: familyId,
    name: 'My Household',
    address: '123 Home Street',
    created_by: userId,
    created_at: now,
  });
  db.members.push({
    id: uid(),
    user_id: userId,
    household_id: familyId,
    role: 'admin',
    status: 'active',
    relation: 'self',
    invitation_email: null,
    invitation_sent_at: null,
    joined_at: now,
    user_email: 'demo@griham.local',
    user_phone: null,
    full_name: 'Demo User',
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
    { id: uid(), family_id: familyId, account_id: accId, type: 'income', category: 'Salary', amount: 95000, transaction_date: now, created_by: userId, created_by_name: 'Demo User' },
    { id: uid(), family_id: familyId, account_id: accId, type: 'expense', category: 'Utilities', amount: 3500, description: 'Electricity', transaction_date: now, created_by: userId, created_by_name: 'Demo User' },
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
    status: 'active',
    created_at: now,
  });
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
        return { success: true, message: 'Registered', data: { user, token } };
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
        return { success: true, message: 'Logged in', data: { user, token } };
      });

      this.get('/auth/me', (_schema, request) => {
        const user = getUserFromRequest(request);
        if (!user) return new Response(401, {}, { message: 'Unauthorized' });
        return { data: user };
      });

      this.get('/admin/users', (_schema, request) => {
        const user = getUserFromRequest(request);
        if (!user || user.role !== 'root') {
          return new Response(403, {}, { message: 'Forbidden' });
        }
        return { data: db.users };
      });

      // ----- Families -----
      this.get('/families', () => ({ data: db.households }));

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
        return { data: list };
      });

      this.get('/finance/transactions/:familyId/summary', (_schema, request) => {
        const list = db.transactions.filter((t) => t.family_id === request.params.familyId);
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
    },
  });
}
