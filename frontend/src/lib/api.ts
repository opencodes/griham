import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: number;
  rbac_role_id?: string | null;
  rbac_role_name?: string | null;
  rbac_roles?: Role[];
  rbac_permissions?: Permission[];
  rbac_role:any
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

export interface Household {
  id: string;
  name: string;
  address?: string;
  created_by: string;
  created_at: string;
}

export interface BankAccount {
  id: string;
  family_id: string;
  account_name: string;
  account_number?: string;
  bank_name: string;
  account_type: string;
  balance: number;
  currency: string;
}

export interface Transaction {
  id: string;
  family_id: string;
  account_id: string;
  type: string;
  category: string;
  amount: number;
  description?: string;
  transaction_date: string;
  created_by: string;
  account_name?: string;
  bank_name?: string;
  created_by_name?: string;
}

export interface TransactionSearchSpec {
  description_contains?: string;
  category?: string;
  type?: 'income' | 'expense';
  date_from?: string;
  date_to?: string;
  sort?: 'newest' | 'oldest' | 'amount_high' | 'amount_low';
}

export interface CategoryInsightItem {
  category: string;
  amount: number;
  percent: number;
  summary: string;
}

export interface Bill {
  id: string;
  family_id: string;
  bill_name: string;
  category: string;
  amount: number;
  due_date: string;
  is_recurring: boolean;
  recurrence_pattern?: string;
  status: string;
}

export interface Card {
  id: string;
  family_id: string;
  card_type: 'credit' | 'debit';
  bank_name: string;
  card_name: string;
  last_four_digits: string;
  card_limit?: number;
  billing_date?: number;
  status: 'active' | 'inactive' | 'blocked';
  created_at: string;
}

export const authAPI = {
  register: async (full_name: string, email: string, password: string) => {
    const { data } = await api.post<AuthResponse>('/auth/register', {
      full_name,
      email,
      password,
    });
    return data.data;
  },

  login: async (email: string, password: string) => {
    const { data } = await api.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    return data.data;
  },

  me: async () => {
    const { data } = await api.get('/auth/me');
    return data.data;
  },
  changePassword: async (current_password: string, new_password: string) => {
    const { data } = await api.put('/auth/change-password', { current_password, new_password });
    return data.data;
  },
  resetPassword: async (email: string, new_password: string) => {
    const { data } = await api.post('/auth/reset-password', { email, new_password });
    return data.data;
  },
};

export const householdAPI = {
  create: async (name: string, address?: string) => {
    const { data } = await api.post('/families', { name, address });
    return data.data;
  },

  list: async () => {
    const { data } = await api.get('/families');
    return data.data;
  },

  getCurrent: async () => {
    const { data } = await api.get('/families/me');
    return data.data;
  },

  get: async (id: string) => {
    const { data } = await api.get(`/families/${id}`);
    return data.data;
  },

  listMembers: async (id: string) => {
    const { data } = await api.get(`/families/${id}/members`);
    return data.data;
  },

  addMember: async (householdId: string, memberData: { fname: string; lname: string; phone: string; email: string; relation: string }) => {
    const { data } = await api.post(`/families/${householdId}/members`, memberData);
    return data.data;
  },

  updateMember: async (householdId: string, memberId: string, memberData: { fname: string; lname: string; phone: string; email: string; relation: string }) => {
    const { data } = await api.put(`/families/${householdId}/members/${memberId}`, memberData);
    return data.data;
  },

  updateAddress: async (householdId: string, address: string) => {
    const { data } = await api.put(`/families/${householdId}`, { address });
    return data.data;
  },
};

export const financeAPI = {
  // Bank Accounts
  createAccount: async (familyId: string, accountData: Partial<BankAccount>) => {
    const { data } = await api.post('/finance/accounts', { family_id: familyId, ...accountData });
    return data.data;
  },
  listAccounts: async (familyId: string) => {
    const { data } = await api.get(`/finance/accounts/${familyId}`);
    return data.data;
  },
  updateAccount: async (familyId: string, accountId: string, accountData: Partial<BankAccount>) => {
    const { data } = await api.put(`/finance/accounts/${familyId}/${accountId}`, accountData);
    return data.data;
  },
  deleteAccount: async (familyId: string, accountId: string) => {
    const { data } = await api.delete(`/finance/accounts/${familyId}/${accountId}`);
    return data.data;
  },

  // Transactions
  createTransaction: async (familyId: string, transactionData: Partial<Transaction>) => {
    const { data } = await api.post('/finance/transactions', { family_id: familyId, ...transactionData });
    return data.data;
  },
  listTransactions: async (familyId: string, filters?: { type?: string; category?: string; month?: string }) => {
    const params = new URLSearchParams(filters as any).toString();
    const { data } = await api.get(`/finance/transactions/${familyId}${params ? '?' + params : ''}`);
    return data.data;
  },
  getSummary: async (familyId: string, month?: string) => {
    const params = month ? `?month=${month}` : '';
    const { data } = await api.get(`/finance/transactions/${familyId}/summary${params}`);
    return data.data;
  },
  deleteTransaction: async (familyId: string, transactionId: string) => {
    const { data } = await api.delete(`/finance/transactions/${familyId}/${transactionId}`);
    return data.data;
  },

  // Bills
  createBill: async (familyId: string, billData: Partial<Bill>) => {
    const { data } = await api.post('/finance/bills', { family_id: familyId, ...billData });
    return data.data;
  },
  listBills: async (familyId: string) => {
    const { data } = await api.get(`/finance/bills/${familyId}`);
    return data.data;
  },
  getUpcomingBills: async (familyId: string) => {
    const { data } = await api.get(`/finance/bills/${familyId}/upcoming`);
    return data.data;
  },
  updateBill: async (familyId: string, billId: string, billData: Partial<Bill>) => {
    const { data } = await api.put(`/finance/bills/${familyId}/${billId}`, billData);
    return data.data;
  },
  deleteBill: async (familyId: string, billId: string) => {
    const { data } = await api.delete(`/finance/bills/${familyId}/${billId}`);
    return data.data;
  },

  // Cards
  createCard: async (familyId: string, cardData: Partial<Card>) => {
    const { data } = await api.post('/finance/cards', { family_id: familyId, ...cardData });
    return data.data;
  },
  listCards: async (familyId: string) => {
    const { data } = await api.get(`/finance/cards/${familyId}`);
    return data.data;
  },
  updateCard: async (familyId: string, cardId: string, cardData: Partial<Card>) => {
    const { data } = await api.put(`/finance/cards/${familyId}/${cardId}`, cardData);
    return data.data;
  },
  deleteCard: async (familyId: string, cardId: string) => {
    const { data } = await api.delete(`/finance/cards/${familyId}/${cardId}`);
    return data.data;
  },

  // AI insights (for Dashboard and Finance Overview)
  getInsights: async (familyId: string, month?: string) => {
    const params = month ? `?month=${month}` : '';
    const { data } = await api.get<{
      data: { total_balance: number; total_income: number; total_expense: number; savings_rate: number; upcoming_bills: number };
      insights: string | null;
      ai_available: boolean;
    }>(`/finance/ai/insights/${familyId}${params}`);
    return data;
  },
  // AI risk suggestions for Dashboard Risk Radar
  getRiskSuggestions: async (familyId: string, month?: string) => {
    const params = month ? `?month=${month}` : '';
    const { data } = await api.get<{ data: { risks: string[]; ai_available: boolean } }>(
      `/finance/ai/risk-suggestions/${familyId}${params}`
    );
    return data.data ?? { risks: [], ai_available: false };
  },
  getCategoryInsights: async (familyId: string, month?: string) => {
    const params = month ? `?month=${month}` : '';
    const { data } = await api.get<{ data: { insights: CategoryInsightItem[]; ai_available: boolean } }>(
      `/finance/ai/category-insights/${familyId}${params}`
    );
    return data.data ?? { insights: [], ai_available: false };
  },
  getNarrativeSummary: async (familyId: string, month?: string) => {
    const params = month ? `?month=${month}` : '';
    const { data } = await api.get<{ data: { narrative: string; ai_available: boolean } }>(
      `/finance/ai/narrative-summary/${familyId}${params}`
    );
    return data.data ?? { narrative: '', ai_available: false };
  },
  askAboutMonth: async (
    familyId: string,
    payload: { question: string; month?: string }
  ): Promise<{ answer: string; ai_available: boolean }> => {
    const { data } = await api.post<{ data: { answer: string; ai_available: boolean } }>(
      `/finance/ai/ask-month/${familyId}`,
      payload
    );
    return data.data ?? { answer: '', ai_available: false };
  },
  getCashflowTips: async (familyId: string, month?: string) => {
    const params = month ? `?month=${month}` : '';
    const { data } = await api.get<{ data: { tips: string[]; ai_available: boolean } }>(
      `/finance/ai/cashflow-tips/${familyId}${params}`
    );
    return data.data ?? { tips: [], ai_available: false };
  },
  interpretSearch: async (
    familyId: string,
    payload: { q: string; month?: string }
  ): Promise<{ spec: TransactionSearchSpec; ai_available: boolean }> => {
    const { data } = await api.post<{ data: { spec: TransactionSearchSpec; ai_available: boolean } }>(
      `/finance/ai/interpret-search/${familyId}`,
      payload
    );
    return data.data ?? { spec: {}, ai_available: false };
  },
  getSavingsTips: async (familyId: string) => {
    const { data } = await api.get<{ tips: string[] | null; ai_available: boolean }>(`/finance/ai/savings-tips/${familyId}`);
    return data;
  },
  suggestCategory: async (
    familyId: string,
    payload: { description: string; amount?: number; type?: string }
  ) => {
    const { data } = await api.post<{ category: string; type?: string }>(
      `/finance/ai/suggest-category/${familyId}`,
      payload
    );
    return data;
  },
  suggestBillCategory: async (familyId: string, payload: { bill_name: string }) => {
    const { data } = await api.post<{ category: string }>(
      `/finance/ai/suggest-bill-category/${familyId}`,
      payload
    );
    return data;
  },
};

export interface Contact {
  id: string;
  name: string | null;
  phone: string | null;
  phone_ext: string | null;
  phone_number: string | null;
  phone_norm: string | null;
   email?: string | null;
  last_synced_at?: string | null;
}

export interface ContactsSummary {
  total: number;
  last_synced_at: string | null;
}

export interface ContactCleanupSuggestion {
  id: string;
  reasons: string[];
  ai_reason?: string;
}

export interface ContactCleanupResponse {
  suggestions: ContactCleanupSuggestion[];
  ai_available: boolean;
  ai_used: boolean;
}

export interface ContactCleanupApplyResponse {
  deleted: number;
  ids: string[];
  reasons: Record<string, string[]>;
}

export interface ContactUpdatePayload {
  name: string;
  phone: string;
  email?: string | null;
}

export const contactsAPI = {
  list: async (familyId: string, params?: { q?: string; limit?: number }): Promise<Contact[]> => {
    const sp = new URLSearchParams();
    if (params?.q && params.q.trim()) sp.set('q', params.q.trim());
    if (typeof params?.limit === 'number' && Number.isFinite(params.limit)) sp.set('limit', String(params.limit));
    const qs = sp.toString();
    const { data } = await api.get(`/contacts/${familyId}${qs ? `?${qs}` : ''}`);
    return data.data ?? [];
  },
  summary: async (familyId: string): Promise<ContactsSummary> => {
    const { data } = await api.get(`/contacts/${familyId}/summary`);
    return data.data ?? { total: 0, last_synced_at: null };
  },
  cleanupSuggestions: async (
    familyId: string,
    params?: { country?: string; limit?: number }
  ): Promise<ContactCleanupResponse> => {
    const sp = new URLSearchParams();
    if (params?.country) sp.set('country', params.country);
    if (typeof params?.limit === 'number' && Number.isFinite(params.limit)) sp.set('limit', String(params.limit));
    const qs = sp.toString();
    const { data } = await api.get(`/contacts/${familyId}/cleanup-suggestions${qs ? `?${qs}` : ''}`);
    return data.data ?? { suggestions: [], ai_available: false, ai_used: false };
  },
  cleanupApply: async (
    familyId: string,
    params?: { country?: string; limit?: number }
  ): Promise<ContactCleanupApplyResponse> => {
    const sp = new URLSearchParams();
    if (params?.country) sp.set('country', params.country);
    if (typeof params?.limit === 'number' && Number.isFinite(params.limit)) sp.set('limit', String(params.limit));
    const qs = sp.toString();
    const { data } = await api.post(`/contacts/${familyId}/cleanup-apply${qs ? `?${qs}` : ''}`, {});
    return data.data ?? { deleted: 0, ids: [], reasons: {} };
  },
  update: async (id: string, payload: ContactUpdatePayload): Promise<Contact> => {
    const { data } = await api.patch(`/contacts/${id}`, payload);
    return data.data;
  },
  remove: async (id: string): Promise<{ id: string }> => {
    const { data } = await api.delete(`/contacts/${id}`);
    return data.data ?? { id };
  },
};

export interface Role {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export const adminAPI = {
  listUsers: async () => {
    const { data } = await api.get('/admin/users');
    return data.data;
  },
  resetUserPassword: async (userId: string, newPassword: string): Promise<void> => {
    await api.put(`/admin/users/${userId}/reset-password`, { new_password: newPassword });
  },
};

export const rbacAPI = {
  // Roles
  listRoles: async (): Promise<Role[]> => {
    const { data } = await api.get('/admin/roles');
    return data.data ?? [];
  },
  getRole: async (id: string): Promise<Role & { permissions: Permission[]; user_ids: string[] }> => {
    const { data } = await api.get(`/admin/roles/${id}`);
    return data.data;
  },
  createRole: async (payload: { name: string; description?: string }): Promise<Role> => {
    const { data } = await api.post('/admin/roles', payload);
    return data.data;
  },
  updateRole: async (id: string, payload: { name?: string; description?: string }): Promise<Role> => {
    const { data } = await api.put(`/admin/roles/${id}`, payload);
    return data.data;
  },
  deleteRole: async (id: string): Promise<void> => {
    await api.delete(`/admin/roles/${id}`);
  },
  setRolePermissions: async (roleId: string, permissionIds: string[]): Promise<void> => {
    await api.put(`/admin/roles/${roleId}/permissions`, { permission_ids: permissionIds });
  },

  // Permissions
  listPermissions: async (): Promise<Permission[]> => {
    const { data } = await api.get('/admin/permissions');
    return data.data ?? [];
  },
  getPermission: async (id: string): Promise<Permission & { role_ids: string[] }> => {
    const { data } = await api.get(`/admin/permissions/${id}`);
    return data.data;
  },
  createPermission: async (payload: { name: string; resource: string; action: string; description?: string }): Promise<Permission> => {
    const { data } = await api.post('/admin/permissions', payload);
    return data.data;
  },
  updatePermission: async (id: string, payload: { name?: string; resource?: string; action?: string; description?: string }): Promise<Permission> => {
    const { data } = await api.put(`/admin/permissions/${id}`, payload);
    return data.data;
  },
  deletePermission: async (id: string): Promise<void> => {
    await api.delete(`/admin/permissions/${id}`);
  },

  // Groups
  listGroups: async (): Promise<Group[]> => {
    const { data } = await api.get('/admin/groups');
    return data.data ?? [];
  },
  getGroup: async (id: string): Promise<Group & { user_ids: string[]; role_ids: string[] }> => {
    const { data } = await api.get(`/admin/groups/${id}`);
    return data.data;
  },
  createGroup: async (payload: { name: string; description?: string }): Promise<Group> => {
    const { data } = await api.post('/admin/groups', payload);
    return data.data;
  },
  updateGroup: async (id: string, payload: { name?: string; description?: string }): Promise<Group> => {
    const { data } = await api.put(`/admin/groups/${id}`, payload);
    return data.data;
  },
  deleteGroup: async (id: string): Promise<void> => {
    await api.delete(`/admin/groups/${id}`);
  },
  setGroupMembers: async (groupId: string, userIds: string[]): Promise<void> => {
    await api.put(`/admin/groups/${groupId}/members`, { user_ids: userIds });
  },
  setGroupRoles: async (groupId: string, roleIds: string[]): Promise<void> => {
    await api.put(`/admin/groups/${groupId}/roles`, { role_ids: roleIds });
  },

  // User role assignment
  getUserRoles: async (userId: string): Promise<Role[]> => {
    const { data } = await api.get(`/admin/users/${userId}/roles`);
    return data.data ?? [];
  },
  setUserRoles: async (userId: string, roleIds: string[]): Promise<void> => {
    await api.put(`/admin/users/${userId}/roles`, { role_ids: roleIds });
  },
};

export default api;
