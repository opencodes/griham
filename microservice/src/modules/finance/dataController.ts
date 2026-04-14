import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { BankAccountModel } from '../../db/schemas/BankAccount.js';
import { TransactionModel } from '../../db/schemas/Transaction.js';
import { BillModel } from '../../db/schemas/Bill.js';
import { CardModel } from '../../db/schemas/Card.js';
import { InsuranceModel } from '../../db/schemas/Insurance.js';
import { InvestmentModel } from '../../db/schemas/Investments.js';
import { LoanModel } from '../../db/schemas/Loan.js';

type AuthRequest = Request & { auth?: { userId: string } };

function toId<T extends { _id: string }>(doc: T) {
  return { ...doc, id: doc._id } as T & { id: string };
}

function formatDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value;
}

function startOfUtcMonth(value?: Date | string | null): Date {
  const source = value ? new Date(value) : new Date();
  return new Date(Date.UTC(source.getUTCFullYear(), source.getUTCMonth(), 1));
}

function addUtcMonths(value: Date, months: number): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + months, 1));
}

function formatMonthLabel(value: Date): string {
  return value.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

function calculateAmortizedEmi(balance: number, monthlyRate: number, months: number): number {
  if (balance <= 0) return 0;
  if (months <= 0) return balance;
  if (monthlyRate <= 0) return balance / months;
  const factor = Math.pow(1 + monthlyRate, months);
  return (balance * monthlyRate * factor) / (factor - 1);
}

type LoanForecastPoint = {
  principalPaid: number;
  interestPaid: number;
  endingBalance: number;
};

type LoanForecastLoanSummary = {
  loanId: string;
  name: string;
  lender: string;
  interestRate: number;
  emiAmount: number;
  tenureMonths: number;
  outstandingPrincipal: number;
  projectedPayoffMonths: number;
  schedule: LoanForecastPoint[];
};

function buildLoanForecastPoints(loan: {
  _id: string;
  name: string;
  lender: string;
  interestRate: number;
  emiAmount: number;
  tenureMonths: number;
  outstandingPrincipal: number;
  principalAmount: number;
  status: 'active' | 'closed';
}): { summary: LoanForecastLoanSummary; points: LoanForecastPoint[] } | null {
  if (loan.status !== 'active') return null;

  let balance = Math.max(loan.outstandingPrincipal || 0, loan.principalAmount || 0, 0);
  if (balance <= 0) return null;

  const monthlyRate = Math.max(loan.interestRate || 0, 0) / 1200;
  const monthsTarget = Math.max(Math.min(loan.tenureMonths || 0, 360), 0);
  const calculatedEmi = calculateAmortizedEmi(balance, monthlyRate, monthsTarget || 1);
  const minimumInterestCover = balance * monthlyRate;
  const emiAmount = (() => {
    const rawEmi = Math.max(loan.emiAmount || 0, 0);
    if (rawEmi > 0 && (monthlyRate === 0 || rawEmi > minimumInterestCover + 0.01)) return rawEmi;
    return calculatedEmi > 0 ? calculatedEmi : balance;
  })();

  const maxMonths = Math.max(monthsTarget || Math.ceil(balance / Math.max(emiAmount, 1)), 1);
  const points: LoanForecastPoint[] = [];

  for (let monthIndex = 0; monthIndex < Math.min(maxMonths, 360) && balance > 0.01; monthIndex += 1) {
    const interestPaid = roundCurrency(balance * monthlyRate);
    const totalDue = balance + interestPaid;
    const payment = Math.min(roundCurrency(emiAmount), totalDue);
    const endingBalance = roundCurrency(Math.max(totalDue - payment, 0));
    const principalPaid = roundCurrency(Math.max(payment - interestPaid, 0));

    points.push({
      principalPaid,
      interestPaid,
      endingBalance,
    });

    if (endingBalance >= balance) break;
    balance = endingBalance;
  }

  return {
    summary: {
      loanId: loan._id,
      name: loan.name,
      lender: loan.lender,
      interestRate: loan.interestRate || 0,
      emiAmount: roundCurrency(emiAmount),
      tenureMonths: loan.tenureMonths || points.length,
      outstandingPrincipal: roundCurrency(Math.max(loan.outstandingPrincipal || loan.principalAmount || 0, 0)),
      projectedPayoffMonths: points.length,
      schedule: points,
    },
    points,
  };
}

function buildLoanPaydownForecast(loans: Array<{
  _id: string;
  name: string;
  lender: string;
  interestRate: number;
  emiAmount: number;
  tenureMonths: number;
  outstandingPrincipal: number;
  principalAmount: number;
  status: 'active' | 'closed';
}>) {
  const forecasts = loans
    .map((loan) => buildLoanForecastPoints(loan))
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (forecasts.length === 0) {
    return {
      generatedAt: new Date().toISOString(),
      overview: {
        totalOutstanding: 0,
        totalMonthlyEmi: 0,
        projectedPayoffMonths: 0,
        projectedPayoffMonth: null,
        totalInterestRemaining: 0,
      },
      schedule: [],
      loans: [],
    };
  }

  const startMonth = startOfUtcMonth();
  const maxMonths = Math.max(...forecasts.map((item) => item.points.length));
  const schedule = Array.from({ length: maxMonths }, (_, monthIndex) => {
    const monthDate = addUtcMonths(startMonth, monthIndex);
    const totals = forecasts.reduce((acc, forecast) => {
      const point = forecast.points[monthIndex];
      if (!point) return acc;
      acc.totalOutstanding += point.endingBalance;
      acc.totalPrincipalPaid += point.principalPaid;
      acc.totalInterestPaid += point.interestPaid;
      if (point.endingBalance > 0.01) acc.activeLoans += 1;
      return acc;
    }, {
      totalOutstanding: 0,
      totalPrincipalPaid: 0,
      totalInterestPaid: 0,
      activeLoans: 0,
    });

    return {
      monthIndex,
      monthLabel: formatMonthLabel(monthDate),
      totalOutstanding: roundCurrency(totals.totalOutstanding),
      totalPrincipalPaid: roundCurrency(totals.totalPrincipalPaid),
      totalInterestPaid: roundCurrency(totals.totalInterestPaid),
      activeLoans: totals.activeLoans,
    };
  });

  const projectedPayoffMonths = schedule.length;
  const projectedPayoffMonth = projectedPayoffMonths > 0
    ? formatMonthLabel(addUtcMonths(startMonth, projectedPayoffMonths - 1))
    : null;

  return {
    generatedAt: new Date().toISOString(),
    overview: {
      totalOutstanding: roundCurrency(forecasts.reduce((sum, item) => sum + item.summary.outstandingPrincipal, 0)),
      totalMonthlyEmi: roundCurrency(forecasts.reduce((sum, item) => sum + item.summary.emiAmount, 0)),
      projectedPayoffMonths,
      projectedPayoffMonth,
      totalInterestRemaining: roundCurrency(
        forecasts.reduce((sum, item) => sum + item.points.reduce((inner, point) => inner + point.interestPaid, 0), 0)
      ),
    },
    schedule,
    loans: forecasts.map((item) => item.summary),
  };
}

function normalizeInsuranceType(value: string | undefined): 'life' | 'health' | 'vehicle' | 'term' | 'other' {
  const normalized = (value || '').trim().toLowerCase();
  if (normalized === 'life' || normalized === 'health' || normalized === 'vehicle' || normalized === 'term') return normalized;
  return 'other';
}

function normalizeInsuranceFrequency(value: string | undefined): 'monthly' | 'quarterly' | 'yearly' {
  const normalized = (value || '').trim().toLowerCase();
  if (normalized === 'monthly' || normalized === 'quarterly') return normalized;
  return 'yearly';
}

function normalizeInsuranceStatus(value: string | undefined): 'active' | 'expired' {
  return (value || '').trim().toLowerCase() === 'expired' ? 'expired' : 'active';
}

function normalizeInvestmentType(value: string | undefined): 'mutual_fund' | 'stock' | 'fd' | 'other' {
  const normalized = (value || '').trim().toLowerCase();
  if (normalized === 'mutual_fund' || normalized === 'stock' || normalized === 'fd') return normalized;
  return 'other';
}

function normalizeInvestmentStatus(value: string | undefined): 'active' | 'paused' | 'closed' {
  const normalized = (value || '').trim().toLowerCase();
  if (normalized === 'paused' || normalized === 'closed') return normalized;
  return 'active';
}

function normalizeLoanType(value: string | undefined): 'home' | 'car' | 'personal' | 'education' | 'other' {
  const normalized = (value || '').trim().toLowerCase();
  if (normalized === 'home' || normalized === 'car' || normalized === 'personal' || normalized === 'education') return normalized;
  return 'other';
}

function normalizeLoanStatus(value: string | undefined): 'active' | 'closed' {
  return (value || '').trim().toLowerCase() === 'closed' ? 'closed' : 'active';
}

function normalizeTransactionSourceType(value: string | undefined): string | null {
  const normalized = (value || '').trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === 'event') return 'event';
  return normalized;
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
    const { type, category, month, account_id, card_id } = req.query as {
      type?: string;
      category?: string;
      month?: string;
      account_id?: string;
      card_id?: string;
    };
    const filter: Record<string, unknown> = { family_id: familyId };
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (account_id) filter.account_id = account_id;
    if (card_id) filter.card_id = card_id;
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
      account_id?: string | null;
      card_id?: string | null;
      type?: 'income' | 'expense';
      category?: string;
      amount?: number;
      description?: string;
      transaction_date?: string;
      event_id?: string;
      sub_event_id?: string;
      source_type?: string;
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
      account_id: body.account_id ?? (await BankAccountModel.findOne({ family_id }).select('_id').then((a) => a?._id)) ?? null,
      card_id: body.card_id ?? null,
      type: body.type ?? 'expense',
      category: body.category ?? 'Other',
      amount: Number(body.amount) ?? 0,
      description: body.description ?? null,
      transaction_date,
      created_by: userId,
      event_id: body.event_id ?? null,
      sub_event_id: body.sub_event_id ?? null,
      source_type: normalizeTransactionSourceType(body.source_type ?? (body.event_id ? 'event' : undefined)),
    });
    const tx = await TransactionModel.findById(id).lean();
    if (!tx) {
      res.fail('Failed to create transaction', 500);
      return;
    }
    res.success({ ...toId(tx), transaction_date: tx.transaction_date instanceof Date ? tx.transaction_date.toISOString().slice(0, 10) : tx.transaction_date }, 'Created', 201);
  },

  async updateTransaction(req: Request, res: Response): Promise<void> {
    const { familyId, transactionId } = req.params;
    const transaction = await TransactionModel.findOne({ _id: transactionId, family_id: familyId });
    if (!transaction) {
      res.fail('Transaction not found', 404);
      return;
    }

    const body = req.body as Partial<{
      account_id: string | null;
      card_id: string | null;
      type: 'income' | 'expense';
      category: string;
      amount: number | string;
      description: string | null;
      transaction_date: string;
      event_id: string | null;
      sub_event_id: string | null;
      source_type: string | null;
    }>;

    if (body.account_id !== undefined) transaction.account_id = body.account_id || null;
    if (body.card_id !== undefined) transaction.card_id = body.card_id || null;
    if (body.type !== undefined) transaction.type = body.type;
    if (body.category !== undefined) transaction.category = body.category || transaction.category;
    if (body.amount !== undefined) transaction.amount = Number(body.amount) || 0;
    if (body.description !== undefined) transaction.description = body.description?.trim() || null;
    if (body.transaction_date !== undefined) transaction.transaction_date = body.transaction_date ? new Date(body.transaction_date) : transaction.transaction_date;
    if (body.event_id !== undefined) transaction.event_id = body.event_id || null;
    if (body.sub_event_id !== undefined) transaction.sub_event_id = body.sub_event_id || null;
    if (body.source_type !== undefined || body.event_id !== undefined) {
      transaction.source_type = normalizeTransactionSourceType(
        body.source_type === undefined
          ? (body.event_id ? 'event' : undefined)
          : body.source_type ?? undefined
      );
    }
    if (!transaction.event_id) {
      transaction.sub_event_id = null;
      transaction.source_type = normalizeTransactionSourceType(body.source_type ?? undefined);
    }

    await transaction.save();
    const updated = transaction.toObject();
    res.success({
      ...toId(updated),
      transaction_date: updated.transaction_date instanceof Date ? updated.transaction_date.toISOString().slice(0, 10) : updated.transaction_date,
    });
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
      background_color?: string | null;
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
      background_color: body.background_color?.trim() || null,
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
    const body = req.body as Partial<{ card_type: string; bank_name: string; card_name: string; last_four_digits: string; card_limit: number | null; billing_date: number | null; background_color: string | null; status: string }>;
    if (body.card_type !== undefined) card.card_type = body.card_type as 'credit' | 'debit';
    if (body.bank_name !== undefined) card.bank_name = body.bank_name;
    if (body.card_name !== undefined) card.card_name = body.card_name;
    if (body.last_four_digits !== undefined) card.last_four_digits = body.last_four_digits;
    if (body.card_limit !== undefined) card.card_limit = body.card_limit;
    if (body.billing_date !== undefined) card.billing_date = body.billing_date;
    if (body.background_color !== undefined) card.background_color = body.background_color?.trim() || null;
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

  // Insurance
  async listInsurance(req: Request, res: Response): Promise<void> {
    const list = await InsuranceModel.find({ family_id: req.params.familyId }).sort({ nextDueDate: 1, _id: -1 }).lean();
    res.success(list.map((item) => ({ ...toId(item), nextDueDate: formatDate(item.nextDueDate) })));
  },

  async createInsurance(req: Request, res: Response): Promise<void> {
    const body = req.body as {
      family_id?: string;
      type?: string;
      provider?: string;
      policyName?: string;
      policyNumber?: string;
      premiumAmount?: number;
      premiumFrequency?: string;
      nextDueDate?: string;
      coverageAmount?: number;
      insuredMembers?: string[];
      status?: string;
    };
    const family_id = body.family_id;
    if (!family_id) {
      res.fail('family_id is required', 400);
      return;
    }
    const id = uuidv4();
    await InsuranceModel.create({
      _id: id,
      family_id,
      type: normalizeInsuranceType(body.type),
      provider: body.provider ?? 'Provider',
      policyName: body.policyName ?? 'Policy',
      policyNumber: body.policyNumber ?? `POL-${id.slice(0, 8)}`,
      premiumAmount: Number(body.premiumAmount) || 0,
      premiumFrequency: normalizeInsuranceFrequency(body.premiumFrequency),
      nextDueDate: body.nextDueDate ? new Date(body.nextDueDate) : null,
      coverageAmount: Number(body.coverageAmount) || 0,
      insuredMembers: Array.isArray(body.insuredMembers) ? body.insuredMembers.filter(Boolean) : [],
      status: normalizeInsuranceStatus(body.status),
    });
    const insurance = await InsuranceModel.findById(id).lean();
    res.success(insurance ? { ...toId(insurance), nextDueDate: formatDate(insurance.nextDueDate) } : null, 'Created', 201);
  },

  async updateInsurance(req: Request, res: Response): Promise<void> {
    const { familyId, insuranceId } = req.params;
    const insurance = await InsuranceModel.findOne({ _id: insuranceId, family_id: familyId });
    if (!insurance) {
      res.fail('Insurance not found', 404);
      return;
    }
    const body = req.body as Partial<{ type: string; provider: string; policyName: string; policyNumber: string; premiumAmount: number; premiumFrequency: string; nextDueDate: string; coverageAmount: number; insuredMembers: string[]; status: string }>;
    if (body.type !== undefined) insurance.type = normalizeInsuranceType(body.type);
    if (body.provider !== undefined) insurance.provider = body.provider;
    if (body.policyName !== undefined) insurance.policyName = body.policyName;
    if (body.policyNumber !== undefined) insurance.policyNumber = body.policyNumber;
    if (body.premiumAmount !== undefined) insurance.premiumAmount = Number(body.premiumAmount) || 0;
    if (body.premiumFrequency !== undefined) insurance.premiumFrequency = normalizeInsuranceFrequency(body.premiumFrequency);
    if (body.nextDueDate !== undefined) insurance.nextDueDate = body.nextDueDate ? new Date(body.nextDueDate) : null;
    if (body.coverageAmount !== undefined) insurance.coverageAmount = Number(body.coverageAmount) || 0;
    if (body.insuredMembers !== undefined) insurance.insuredMembers = Array.isArray(body.insuredMembers) ? body.insuredMembers.filter(Boolean) : [];
    if (body.status !== undefined) insurance.status = normalizeInsuranceStatus(body.status);
    await insurance.save();
    const updated = insurance.toObject();
    res.success({ ...toId(updated), nextDueDate: formatDate(updated.nextDueDate) });
  },

  async deleteInsurance(req: Request, res: Response): Promise<void> {
    const deleted = await InsuranceModel.findOneAndDelete({ _id: req.params.insuranceId, family_id: req.params.familyId });
    if (!deleted) {
      res.fail('Insurance not found', 404);
      return;
    }
    res.success({ ok: true });
  },

  async getInsuranceSummary(req: Request, res: Response): Promise<void> {
    const list = await InsuranceModel.find({ family_id: req.params.familyId }).lean();
    const totalCoverage = list.reduce((sum, item) => sum + (item.coverageAmount || 0), 0);
    const activeCount = list.filter((item) => item.status === 'active').length;
    const premiumTotal = list.reduce((sum, item) => sum + (item.premiumAmount || 0), 0);
    res.success({ totalCoverage, activeCount, premiumTotal });
  },

  // Investments
  async listInvestments(req: Request, res: Response): Promise<void> {
    const list = await InvestmentModel.find({ family_id: req.params.familyId }).sort({ startDate: -1, _id: -1 }).lean();
    res.success(list.map((item) => ({ ...toId(item), startDate: formatDate(item.startDate) })));
  },

  async createInvestment(req: Request, res: Response): Promise<void> {
    const body = req.body as {
      family_id?: string;
      type?: string;
      name?: string;
      folioNumber?: string;
      sipAmount?: number;
      sipDay?: number;
      startDate?: string;
      currentValue?: number;
      investedAmount?: number;
      units?: number;
      nav?: number;
      platform?: string;
      status?: string;
    };
    const family_id = body.family_id;
    if (!family_id) {
      res.fail('family_id is required', 400);
      return;
    }
    const id = uuidv4();
    await InvestmentModel.create({
      _id: id,
      family_id,
      type: normalizeInvestmentType(body.type),
      name: body.name ?? 'Investment',
      folioNumber: body.folioNumber ?? `FOL-${id.slice(0, 8)}`,
      sipAmount: Number(body.sipAmount) || 0,
      sipDay: Number(body.sipDay) || 1,
      startDate: body.startDate ? new Date(body.startDate) : new Date(),
      currentValue: Number(body.currentValue) || 0,
      investedAmount: Number(body.investedAmount) || 0,
      units: Number(body.units) || 0,
      nav: Number(body.nav) || 0,
      platform: body.platform ?? null,
      status: normalizeInvestmentStatus(body.status),
    });
    const investment = await InvestmentModel.findById(id).lean();
    res.success(investment ? { ...toId(investment), startDate: formatDate(investment.startDate) } : null, 'Created', 201);
  },

  async updateInvestment(req: Request, res: Response): Promise<void> {
    const { familyId, investmentId } = req.params;
    const investment = await InvestmentModel.findOne({ _id: investmentId, family_id: familyId });
    if (!investment) {
      res.fail('Investment not found', 404);
      return;
    }
    const body = req.body as Partial<{ type: string; name: string; folioNumber: string; sipAmount: number; sipDay: number; startDate: string; currentValue: number; investedAmount: number; units: number; nav: number; platform: string | null; status: string }>;
    if (body.type !== undefined) investment.type = normalizeInvestmentType(body.type);
    if (body.name !== undefined) investment.name = body.name;
    if (body.folioNumber !== undefined) investment.folioNumber = body.folioNumber;
    if (body.sipAmount !== undefined) investment.sipAmount = Number(body.sipAmount) || 0;
    if (body.sipDay !== undefined) investment.sipDay = Number(body.sipDay) || 1;
    if (body.startDate !== undefined) investment.startDate = body.startDate ? new Date(body.startDate) : investment.startDate;
    if (body.currentValue !== undefined) investment.currentValue = Number(body.currentValue) || 0;
    if (body.investedAmount !== undefined) investment.investedAmount = Number(body.investedAmount) || 0;
    if (body.units !== undefined) investment.units = Number(body.units) || 0;
    if (body.nav !== undefined) investment.nav = Number(body.nav) || 0;
    if (body.platform !== undefined) investment.platform = body.platform;
    if (body.status !== undefined) investment.status = normalizeInvestmentStatus(body.status);
    await investment.save();
    const updated = investment.toObject();
    res.success({ ...toId(updated), startDate: formatDate(updated.startDate) });
  },

  async deleteInvestment(req: Request, res: Response): Promise<void> {
    const deleted = await InvestmentModel.findOneAndDelete({ _id: req.params.investmentId, family_id: req.params.familyId });
    if (!deleted) {
      res.fail('Investment not found', 404);
      return;
    }
    res.success({ ok: true });
  },

  async getInvestmentSummary(req: Request, res: Response): Promise<void> {
    const list = await InvestmentModel.find({ family_id: req.params.familyId }).lean();
    const totalCurrentValue = list.reduce((sum, item) => sum + (item.currentValue || 0), 0);
    const totalInvested = list.reduce((sum, item) => sum + (item.investedAmount || 0), 0);
    const totalGain = totalCurrentValue - totalInvested;
    res.success({ totalCurrentValue, totalInvested, totalGain, totalCount: list.length });
  },

  // Loans
  async listLoans(req: Request, res: Response): Promise<void> {
    const list = await LoanModel.find({ family_id: req.params.familyId }).sort({ nextDueDate: 1, _id: -1 }).lean();
    res.success(list.map((item) => ({ ...toId(item), startDate: formatDate(item.startDate), nextDueDate: formatDate(item.nextDueDate) })));
  },

  async createLoan(req: Request, res: Response): Promise<void> {
    const body = req.body as {
      family_id?: string;
      name?: string;
      lender?: string;
      principalAmount?: number;
      interestRate?: number;
      tenureMonths?: number;
      emiAmount?: number;
      startDate?: string;
      nextDueDate?: string;
      outstandingPrincipal?: number;
      type?: string;
      status?: string;
    };
    const family_id = body.family_id;
    if (!family_id) {
      res.fail('family_id is required', 400);
      return;
    }
    const id = uuidv4();
    await LoanModel.create({
      _id: id,
      family_id,
      name: body.name ?? 'Loan',
      lender: body.lender ?? 'Lender',
      principalAmount: Number(body.principalAmount) || 0,
      interestRate: Number(body.interestRate) || 0,
      tenureMonths: Number(body.tenureMonths) || 0,
      emiAmount: Number(body.emiAmount) || 0,
      startDate: body.startDate ? new Date(body.startDate) : new Date(),
      nextDueDate: body.nextDueDate ? new Date(body.nextDueDate) : null,
      outstandingPrincipal: Number(body.outstandingPrincipal) || 0,
      type: normalizeLoanType(body.type),
      status: normalizeLoanStatus(body.status),
    });
    const loan = await LoanModel.findById(id).lean();
    res.success(loan ? { ...toId(loan), startDate: formatDate(loan.startDate), nextDueDate: formatDate(loan.nextDueDate) } : null, 'Created', 201);
  },

  async updateLoan(req: Request, res: Response): Promise<void> {
    const { familyId, loanId } = req.params;
    const loan = await LoanModel.findOne({ _id: loanId, family_id: familyId });
    if (!loan) {
      res.fail('Loan not found', 404);
      return;
    }
    const body = req.body as Partial<{ name: string; lender: string; principalAmount: number; interestRate: number; tenureMonths: number; emiAmount: number; startDate: string; nextDueDate: string; outstandingPrincipal: number; type: string; status: string }>;
    if (body.name !== undefined) loan.name = body.name;
    if (body.lender !== undefined) loan.lender = body.lender;
    if (body.principalAmount !== undefined) loan.principalAmount = Number(body.principalAmount) || 0;
    if (body.interestRate !== undefined) loan.interestRate = Number(body.interestRate) || 0;
    if (body.tenureMonths !== undefined) loan.tenureMonths = Number(body.tenureMonths) || 0;
    if (body.emiAmount !== undefined) loan.emiAmount = Number(body.emiAmount) || 0;
    if (body.startDate !== undefined) loan.startDate = body.startDate ? new Date(body.startDate) : loan.startDate;
    if (body.nextDueDate !== undefined) loan.nextDueDate = body.nextDueDate ? new Date(body.nextDueDate) : null;
    if (body.outstandingPrincipal !== undefined) loan.outstandingPrincipal = Number(body.outstandingPrincipal) || 0;
    if (body.type !== undefined) loan.type = normalizeLoanType(body.type);
    if (body.status !== undefined) loan.status = normalizeLoanStatus(body.status);
    await loan.save();
    const updated = loan.toObject();
    res.success({ ...toId(updated), startDate: formatDate(updated.startDate), nextDueDate: formatDate(updated.nextDueDate) });
  },

  async deleteLoan(req: Request, res: Response): Promise<void> {
    const deleted = await LoanModel.findOneAndDelete({ _id: req.params.loanId, family_id: req.params.familyId });
    if (!deleted) {
      res.fail('Loan not found', 404);
      return;
    }
    res.success({ ok: true });
  },

  async getLoanSummary(req: Request, res: Response): Promise<void> {
    const list = await LoanModel.find({ family_id: req.params.familyId }).lean();
    const totalOutstanding = list.reduce((sum, item) => sum + (item.outstandingPrincipal || 0), 0);
    const totalEmi = list.reduce((sum, item) => sum + (item.emiAmount || 0), 0);
    const activeCount = list.filter((item) => item.status === 'active').length;
    res.success({ totalOutstanding, totalEmi, activeCount });
  },

  async getLoanPaydownForecast(req: Request, res: Response): Promise<void> {
    const list = await LoanModel.find({ family_id: req.params.familyId }).lean();
    res.success(buildLoanPaydownForecast(list));
  },
};
