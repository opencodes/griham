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
  rbac_role?: Role | null;
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
  account_id: string | null;
  card_id?: string | null;
  type: string;
  category: string;
  amount: number;
  description?: string;
  transaction_date: string;
  created_by: string;
  account_name?: string;
  bank_name?: string;
  created_by_name?: string;
  event_id?: string | null;
  sub_event_id?: string | null;
  source_type?: string | null;
}

export interface TransactionSearchSpec {
  description_contains?: string;
  category?: string;
  type?: 'income' | 'expense';
  date_from?: string;
  date_to?: string;
  sort?: 'newest' | 'oldest' | 'amount_high' | 'amount_low';
}

export interface TransactionListFilters {
  type?: string;
  category?: string;
  month?: string;
  account_id?: string;
  card_id?: string;
}

export interface CategoryInsightItem {
  category: string;
  amount: number;
  percent: number;
  summary: string;
}

export interface SmsParseHistoryRecord {
  id: string;
  family_id: string;
  input_text: string;
  model_used: string;
  output: Record<string, unknown> | null;
  date: string;
  accuracy: number | null;
  status: 'parsed' | 'invalid' | 'transaction_created' | 'transaction_pending';
  parse_type: 'transaction_sms';
  transaction_id: string | null;
  created_by: string | null;
  amount: number | null;
  category: string | null;
  type: string | null;
  description: string | null;
}

export interface ParsedSmsTransaction {
  amount?: number;
  type?: 'income' | 'expense';
  category?: string;
  description?: string;
  transaction_date?: string;
  payment_source?: 'account' | 'card' | 'unknown';
  last_four_digits?: string;
  linked_account_id?: string | null;
  linked_card_id?: string | null;
  linked_payment_source?: 'account' | 'card' | null;
  matched_last_four_digits?: string | null;
}

export interface SmsParsePromptResponse {
  prompt_id: string;
  label: string;
  prompt: string;
  sample_input: string;
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
  background_color?: string | null;
  status: 'active' | 'inactive' | 'blocked';
  created_at: string;
}

export interface Asset {
  id: string;
  family_id: string;
  asset_type: 'property' | 'vehicle' | 'gadget' | 'document';
  name: string;
  description?: string | null;
  purchase_date?: string | null;
  purchase_price: number;
  current_value: number;
  location?: string | null;
  expiry_date?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Insurance {
  id: string;
  family_id: string;
  type: 'life' | 'health' | 'vehicle' | 'term' | 'other';
  provider: string;
  policyName: string;
  policyNumber: string;
  premiumAmount: number;
  premiumFrequency: 'monthly' | 'quarterly' | 'yearly';
  nextDueDate?: string | null;
  coverageAmount: number;
  insuredMembers: string[];
  status: 'active' | 'expired';
}

export interface Investment {
  id: string;
  family_id: string;
  type: 'mutual_fund' | 'stock' | 'fd' | 'other';
  name: string;
  folioNumber: string;
  sipAmount: number;
  sipDay: number;
  startDate: string;
  currentValue: number;
  investedAmount: number;
  units: number;
  nav: number;
  platform?: string | null;
  status: 'active' | 'paused' | 'closed';
}

export interface Loan {
  id: string;
  family_id: string;
  name: string;
  lender: string;
  principalAmount: number;
  interestRate: number;
  tenureMonths: number;
  emiAmount: number;
  startDate?: string | null;
  nextDueDate?: string | null;
  outstandingPrincipal: number;
  type: 'home' | 'car' | 'personal' | 'education' | 'other';
  status: 'active' | 'closed';
}

export interface Event {
  id: string;
  family_id: string;
  name: string;
  type: 'marriage' | 'anniversary' | 'birthday' | 'other';
  start_date: string;
  end_date?: string | null;
  location?: string | null;
  total_budget: number;
  notes?: string | null;
  status: 'planned' | 'ongoing' | 'completed';
  created_at?: string;
  updated_at?: string;
}

export interface SubEvent {
  id: string;
  event_id: string;
  name: string;
  date_time: string;
  location?: string | null;
  budget: number;
  created_at?: string;
  updated_at?: string;
}

export interface EventParticipant {
  id: string;
  event_id: string;
  contact_id: string;
  role: 'guest' | 'vendor' | 'host';
  rsvp_status: string;
  gender?: string | null;
  age_group?: string | null;
  gifts?: string[];
  contact?: {
    id: string;
    name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  created_at?: string;
  updated_at?: string;
}

export interface EventFinanceSummary {
  totalBudget: number;
  totalSpent: number;
  remainingBudget: number;
  bySubEvent: Array<{
    subEventId: string | null;
    name: string;
    budget: number;
    totalSpent: number;
  }>;
}

export interface ContentItem {
  id: string;
  channel_id: string;
  episode_number: number;
  title: string;
  description?: string;
  status: 'plan' | 'build' | 'publish';
  planned_month?: string;
  planned_publish_date?: string;
  planned_date?: string | null;
  start_build_date?: string | null;
  published_date?: string | null;
  video_length_seconds?: number;
  tags?: string[];
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Channel {
  id: string;
  user_id: string;
  name: string;
  logo_image_url?: string;
  youtube_url?: string;
  description?: string;
  upload_schedule?: string;
  target_monthly_uploads?: number;
  monthly_target_views?: number;
  color_tag?: string;
  created_at: string;
  updated_at: string;
}

export interface MonthlyPlan {
  id: string;
  channel_id: string;
  year_month: string;
  title?: string;
  target_uploads?: number;
  target_views?: number;
  target_subscribers?: number;
  focus_topics?: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type CreateContentPayload = Omit<ContentItem, 'id' | 'created_by' | 'created_at' | 'updated_at'>;
export type UpdateContentPayload = Partial<CreateContentPayload>;

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
  updateTransaction: async (familyId: string, transactionId: string, transactionData: Partial<Transaction>) => {
    const { data } = await api.put(`/finance/transactions/${familyId}/${transactionId}`, transactionData);
    return data.data;
  },
  listTransactions: async (familyId: string, filters?: TransactionListFilters) => {
    const params = new URLSearchParams(
      Object.entries(filters ?? {}).reduce<Record<string, string>>((acc, [key, value]) => {
        if (typeof value === 'string' && value) acc[key] = value;
        return acc;
      }, {})
    ).toString();
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

  // Insurance
  createInsurance: async (familyId: string, payload: Partial<Insurance>) => {
    const { data } = await api.post('/finance/insurance', { family_id: familyId, ...payload });
    return data.data as Insurance;
  },
  listInsurance: async (familyId: string) => {
    const { data } = await api.get(`/finance/insurance/${familyId}`);
    return (data.data ?? []) as Insurance[];
  },
  updateInsurance: async (familyId: string, insuranceId: string, payload: Partial<Insurance>) => {
    const { data } = await api.put(`/finance/insurance/${familyId}/${insuranceId}`, payload);
    return data.data as Insurance;
  },
  deleteInsurance: async (familyId: string, insuranceId: string) => {
    const { data } = await api.delete(`/finance/insurance/${familyId}/${insuranceId}`);
    return data.data;
  },
  getInsuranceSummary: async (familyId: string) => {
    const { data } = await api.get(`/finance/insurance/${familyId}/summary`);
    return data.data as { totalCoverage: number; activeCount: number; premiumTotal: number };
  },

  // Investments
  createInvestment: async (familyId: string, payload: Partial<Investment>) => {
    const { data } = await api.post('/finance/investments', { family_id: familyId, ...payload });
    return data.data as Investment;
  },
  listInvestments: async (familyId: string) => {
    const { data } = await api.get(`/finance/investments/${familyId}`);
    return (data.data ?? []) as Investment[];
  },
  updateInvestment: async (familyId: string, investmentId: string, payload: Partial<Investment>) => {
    const { data } = await api.put(`/finance/investments/${familyId}/${investmentId}`, payload);
    return data.data as Investment;
  },
  deleteInvestment: async (familyId: string, investmentId: string) => {
    const { data } = await api.delete(`/finance/investments/${familyId}/${investmentId}`);
    return data.data;
  },
  getInvestmentSummary: async (familyId: string) => {
    const { data } = await api.get(`/finance/investments/${familyId}/summary`);
    return data.data as { totalCurrentValue: number; totalInvested: number; totalGain: number; totalCount: number };
  },

  // Loans
  createLoan: async (familyId: string, payload: Partial<Loan>) => {
    const { data } = await api.post('/finance/loans', { family_id: familyId, ...payload });
    return data.data as Loan;
  },
  listLoans: async (familyId: string) => {
    const { data } = await api.get(`/finance/loans/${familyId}`);
    return (data.data ?? []) as Loan[];
  },
  updateLoan: async (familyId: string, loanId: string, payload: Partial<Loan>) => {
    const { data } = await api.put(`/finance/loans/${familyId}/${loanId}`, payload);
    return data.data as Loan;
  },
  deleteLoan: async (familyId: string, loanId: string) => {
    const { data } = await api.delete(`/finance/loans/${familyId}/${loanId}`);
    return data.data;
  },
  getLoanSummary: async (familyId: string) => {
    const { data } = await api.get(`/finance/loans/${familyId}/summary`);
    return data.data as { totalOutstanding: number; totalEmi: number; activeCount: number };
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
  getSmsParseHistory: async (familyId: string, limit = 25): Promise<SmsParseHistoryRecord[]> => {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    const { data } = await api.get(`/finance/ai/parse-sms-history/${familyId}?${params.toString()}`);
    return (data.data ?? []) as SmsParseHistoryRecord[];
  },
  getSmsParsePrompt: async (familyId: string, input?: string): Promise<SmsParsePromptResponse> => {
    const params = new URLSearchParams();
    if (input && input.trim()) params.set('input', input.trim());
    const qs = params.toString();
    const { data } = await api.get(`/finance/ai/parse-sms-prompt/${familyId}${qs ? `?${qs}` : ''}`);
    return (data.data ?? { prompt_id: 'finance.sms-transaction', label: 'Finance SMS Transaction Parser', prompt: '', sample_input: '' }) as SmsParsePromptResponse;
  },
};

export const assetsAPI = {
  createAsset: async (familyId: string, assetData: Partial<Asset>) => {
    const { data } = await api.post('/assets', { family_id: familyId, ...assetData });
    return data.data as Asset;
  },
  listAssets: async (familyId: string, filters?: { type?: Asset['asset_type'] }) => {
    const params = new URLSearchParams();
    if (filters?.type) params.set('type', filters.type);
    const qs = params.toString();
    const { data } = await api.get(`/assets/${familyId}${qs ? `?${qs}` : ''}`);
    return (data.data ?? []) as Asset[];
  },
  getAsset: async (familyId: string, assetId: string) => {
    const { data } = await api.get(`/assets/${familyId}/${assetId}`);
    return data.data as Asset;
  },
  updateAsset: async (familyId: string, assetId: string, assetData: Partial<Asset>) => {
    const { data } = await api.put(`/assets/${familyId}/${assetId}`, assetData);
    return data.data as Asset;
  },
  deleteAsset: async (familyId: string, assetId: string) => {
    const { data } = await api.delete(`/assets/${familyId}/${assetId}`);
    return data.data;
  },
  getExpiringDocuments: async (familyId: string, days = 30) => {
    const { data } = await api.get(`/assets/${familyId}/expiring-documents?days=${days}`);
    return (data.data ?? []) as Asset[];
  },
  getServiceDueVehicles: async (familyId: string, days = 30) => {
    const { data } = await api.get(`/assets/${familyId}/vehicles/service-due?days=${days}`);
    return (data.data ?? []) as Asset[];
  },
  getValuation: async (familyId: string) => {
    const { data } = await api.get(`/assets/${familyId}/valuation`);
    return (data.data ?? { total_value: 0, asset_count: 0 }) as { total_value: number; asset_count: number };
  },
};

export const eventsAPI = {
  createEvent: async (familyId: string, payload: Partial<Event>) => {
    const { data } = await api.post('/events', { family_id: familyId, ...payload });
    return data.data as Event;
  },
  listEvents: async (familyId: string, filters?: { status?: Event['status'] }) => {
    const params = new URLSearchParams({ family_id: familyId });
    if (filters?.status) params.set('status', filters.status);
    const { data } = await api.get(`/events?${params.toString()}`);
    return (data.data ?? []) as Event[];
  },
  getEvent: async (familyId: string, eventId: string) => {
    const params = new URLSearchParams({ family_id: familyId });
    const { data } = await api.get(`/events/${eventId}?${params.toString()}`);
    return data.data as Event;
  },
  updateEvent: async (familyId: string, eventId: string, payload: Partial<Event>) => {
    const params = new URLSearchParams({ family_id: familyId });
    const { data } = await api.patch(`/events/${eventId}?${params.toString()}`, payload);
    return data.data as Event;
  },
  deleteEvent: async (familyId: string, eventId: string) => {
    const params = new URLSearchParams({ family_id: familyId });
    const { data } = await api.delete(`/events/${eventId}?${params.toString()}`);
    return data.data;
  },
  createSubEvent: async (eventId: string, payload: Partial<SubEvent>) => {
    const { data } = await api.post(`/events/${eventId}/sub-events`, payload);
    return data.data as SubEvent;
  },
  listSubEvents: async (eventId: string) => {
    const { data } = await api.get(`/events/${eventId}/sub-events`);
    return (data.data ?? []) as SubEvent[];
  },
  createParticipant: async (eventId: string, payload: Partial<EventParticipant>) => {
    const { data } = await api.post(`/events/${eventId}/participants`, payload);
    return data.data as EventParticipant;
  },
  listParticipants: async (eventId: string) => {
    const { data } = await api.get(`/events/${eventId}/participants`);
    return (data.data ?? []) as EventParticipant[];
  },
  updateParticipant: async (eventId: string, participantId: string, payload: Partial<EventParticipant>) => {
    const { data } = await api.patch(`/events/${eventId}/participants/${participantId}`, payload);
    return data.data as EventParticipant;
  },
  deleteParticipant: async (eventId: string, participantId: string) => {
    const { data } = await api.delete(`/events/${eventId}/participants/${participantId}`);
    return data.data as { ok: boolean };
  },
  getFinanceSummary: async (eventId: string) => {
    const { data } = await api.get(`/events/${eventId}/finance-summary`);
    return (data.data ?? { totalBudget: 0, totalSpent: 0, remainingBudget: 0, bySubEvent: [] }) as EventFinanceSummary;
  },
  getAiInsights: async (eventId: string) => {
    const { data } = await api.get(`/events/${eventId}/ai-insights`);
    return (data.data ?? { eventId, message: '', ai_available: false }) as { eventId: string; message: string; ai_available: boolean };
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

export interface PromptTemplate {
  id: string;
  module: string;
  label: string;
  inputLabel: string;
  inputPlaceholder: string;
}

export const adminAPI = {
  listUsers: async () => {
    const { data } = await api.get('/admin/users');
    return data.data;
  },
  createUser: async (payload: { email: string; password: string; full_name: string; phone?: string; rbac_role_id: string }): Promise<User> => {
    const { data } = await api.post('/admin/users', payload);
    return data.data;
  },
  resetUserPassword: async (userId: string, newPassword: string): Promise<void> => {
    await api.put(`/admin/users/${userId}/reset-password`, { new_password: newPassword });
  },
  listPrompts: async (): Promise<PromptTemplate[]> => {
    const { data } = await api.get('/admin/ai-prompts');
    return data.data ?? [];
  },
  previewPrompt: async (id: string, input: string): Promise<{ prompt: string }> => {
    const params = new URLSearchParams();
    if (input) params.set('input', input);
    const { data } = await api.get(`/admin/ai-prompts/${id}/preview${params.toString() ? `?${params.toString()}` : ''}`);
    return data.data ?? { prompt: '' };
  },
  testPrompt: async (promptId: string, input: string): Promise<{ prompt: string; result: string; ai_available: boolean }> => {
    const { data } = await api.post('/admin/ai-prompts/test', { prompt_id: promptId, input });
    return data.data ?? { prompt: '', result: '', ai_available: false };
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

export const contentTrackerAPI = {
  getAll: async (): Promise<ContentItem[]> => {
    const { data } = await api.get('/content-tracker');
    return data.data ?? [];
  },

  getByChannel: async (channelId: string): Promise<ContentItem[]> => {
    const { data } = await api.get('/content-tracker', { params: { channel_id: channelId } });
    return data.data ?? [];
  },

  getOne: async (id: string): Promise<ContentItem> => {
    const { data } = await api.get(`/content-tracker/${id}`);
    return data.data;
  },

  create: async (payload: Partial<ContentItem>): Promise<ContentItem> => {
    const { data } = await api.post('/content-tracker', payload);
    return data.data;
  },

  update: async (id: string, payload: Partial<ContentItem>): Promise<ContentItem> => {
    const { data } = await api.patch(`/content-tracker/${id}`, payload);
    return data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/content-tracker/${id}`);
  },

  getTimeline: async (channelId: string): Promise<any> => {
    const { data } = await api.get(`/content-tracker/timeline/${channelId}`);
    return data.data;
  },

  getByMonth: async (channelId: string, month: string): Promise<ContentItem[]> => {
    const { data } = await api.get(`/content-tracker/by-month/${channelId}/${month}`);
    return data.data ?? [];
  },
};

export const channelsAPI = {
  list: async (): Promise<Channel[]> => {
    const { data } = await api.get('/channels');
    return data.data ?? [];
  },

  get: async (id: string): Promise<Channel> => {
    const { data } = await api.get(`/channels/${id}`);
    return data.data;
  },

  create: async (payload: Partial<Channel>): Promise<Channel> => {
    const { data } = await api.post('/channels', payload);
    return data.data;
  },

  update: async (id: string, payload: Partial<Channel>): Promise<Channel> => {
    const { data } = await api.put(`/channels/${id}`, payload);
    return data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/channels/${id}`);
  },

  getStats: async (id: string): Promise<any> => {
    const { data } = await api.get(`/channels/${id}/stats`);
    return data.data;
  },
};

export const monthlyPlansAPI = {
  list: async (channelId: string): Promise<MonthlyPlan[]> => {
    const { data } = await api.get(`/channels/${channelId}/monthly-plans`);
    return data.data ?? [];
  },

  get: async (channelId: string, month: string): Promise<MonthlyPlan> => {
    const { data } = await api.get(`/channels/${channelId}/monthly-plans/${month}`);
    return data.data;
  },

  create: async (channelId: string, payload: Partial<MonthlyPlan>): Promise<MonthlyPlan> => {
    const { data } = await api.post(`/channels/${channelId}/monthly-plans`, payload);
    return data.data;
  },

  update: async (channelId: string, month: string, payload: Partial<MonthlyPlan>): Promise<MonthlyPlan> => {
    const { data } = await api.put(`/channels/${channelId}/monthly-plans/${month}`, payload);
    return data.data;
  },

  delete: async (channelId: string, month: string): Promise<void> => {
    await api.delete(`/channels/${channelId}/monthly-plans/${month}`);
  },
};

export default api;
