import axios from 'axios';

const API_URL = process.env.VITE_API_URL;

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
};

export default api;
