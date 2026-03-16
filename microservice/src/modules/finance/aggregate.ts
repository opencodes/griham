/**
 * Aggregate family finance data for AI insights (read-only).
 * Includes household (members) and module status (finance: accounts, transactions, bills, cards).
 */
import { BankAccountModel } from '../../db/schemas/BankAccount.js';
import { TransactionModel } from '../../db/schemas/Transaction.js';
import { BillModel } from '../../db/schemas/Bill.js';
import { CardModel } from '../../db/schemas/Card.js';
import { FamilyMemberModel } from '../../db/schemas/FamilyMember.js';
import type { InsightsContext } from './service.js';

export async function getInsightsContext(
  familyId: string,
  month?: string
): Promise<InsightsContext> {
  const [accounts, transactions, bills, membersCount, cardsCount] = await Promise.all([
    BankAccountModel.find({ family_id: familyId }).lean(),
    month ? getTransactionsForMonth(familyId, month) : [],
    BillModel.find({ family_id: familyId, status: 'pending' }).lean(),
    FamilyMemberModel.countDocuments({ family_id: familyId }),
    CardModel.countDocuments({ family_id: familyId }),
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
    members_count: membersCount,
    accounts_count: accounts.length,
    transactions_count: transactions.length,
    cards_count: cardsCount,
  };
}

export interface NarrativeSummaryContext {
  month?: string;
  total_income: number;
  total_expense: number;
  savings_rate: number;
  upcoming_bills: number;
  prev_income: number;
  prev_expense: number;
}

/**
 * Lightweight context for narrative summary: current + previous month (income, expense, bills) for trend.
 */
export async function getNarrativeSummaryContext(
  familyId: string,
  month?: string
): Promise<NarrativeSummaryContext> {
  const monthStr = month ?? getCurrentMonthStr();
  const [currentTx, prevTx, billCount] = await Promise.all([
    getTransactionsForMonth(familyId, monthStr),
    getTransactionsForMonth(familyId, previousMonth(monthStr)),
    BillModel.countDocuments({ family_id: familyId, status: 'pending' }),
  ]);
  const total_income = currentTx.filter((t: { type: string }) => t.type === 'income').reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);
  const total_expense = currentTx.filter((t: { type: string }) => t.type === 'expense').reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);
  const savings_rate = total_income > 0 ? ((total_income - total_expense) / total_income) * 100 : 0;
  const prev_income = prevTx.filter((t: { type: string }) => t.type === 'income').reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);
  const prev_expense = prevTx.filter((t: { type: string }) => t.type === 'expense').reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);
  return {
    month: monthStr,
    total_income,
    total_expense,
    savings_rate: Math.round(savings_rate * 100) / 100,
    upcoming_bills: billCount,
    prev_income,
    prev_expense,
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

function previousMonth(monthStr: string): string {
  const [y, m] = monthStr.split('-').map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, '0')}`;
}

export interface RiskSuggestionsContext {
  total_balance: number;
  total_income: number;
  total_expense: number;
  savings_rate: number;
  month?: string;
  prev_month_income: number;
  prev_month_expense: number;
  upcoming_bills: Array<{ due_date: string; amount: number }>;
  overdue_bills_count: number;
  pending_bills_count: number;
}

/**
 * Aggregate data for AI risk suggestions: current vs previous month, bills due, balance.
 */
export async function getRiskSuggestionsContext(
  familyId: string,
  month?: string
): Promise<RiskSuggestionsContext> {
  const monthStr = month ?? getCurrentMonthStr();
  const [accounts, currentTx, prevTx, pendingBills] = await Promise.all([
    BankAccountModel.find({ family_id: familyId }).lean(),
    getTransactionsForMonth(familyId, monthStr),
    getTransactionsForMonth(familyId, previousMonth(monthStr)),
    BillModel.find({ family_id: familyId, status: 'pending' })
      .select('due_date amount')
      .sort({ due_date: 1 })
      .lean(),
  ]);

  const total_balance = accounts.reduce((sum: number, a: { balance?: unknown }) => sum + Number(a.balance ?? 0), 0);
  const total_income = currentTx.filter((t: { type: string }) => t.type === 'income').reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);
  const total_expense = currentTx.filter((t: { type: string }) => t.type === 'expense').reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);
  const savings_rate =
    total_income > 0 ? ((total_income - total_expense) / total_income) * 100 : 0;
  const prev_month_income = prevTx.filter((t: { type: string }) => t.type === 'income').reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);
  const prev_month_expense = prevTx.filter((t: { type: string }) => t.type === 'expense').reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);

  const now = Date.now();
  const upcoming_bills = pendingBills.map((b: { due_date: Date; amount?: number }) => ({
    due_date: (b.due_date as Date).toISOString().slice(0, 10),
    amount: Number(b.amount ?? 0),
  }));
  const overdue_bills_count = upcoming_bills.filter((d: { due_date: string }) => new Date(d.due_date).getTime() < now).length;
  const pending_bills_count = pendingBills.length;

  return {
    total_balance,
    total_income,
    total_expense,
    savings_rate: Math.round(savings_rate * 100) / 100,
    month: monthStr,
    prev_month_income,
    prev_month_expense,
    upcoming_bills,
    overdue_bills_count,
    pending_bills_count,
  };
}

function getCurrentMonthStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

async function getExpensesByCategory(
  familyId: string,
  monthStr: string
): Promise<{ total: number; byCategory: Array<{ category: string; amount: number }> }> {
  const [y, m] = monthStr.split('-').map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0);
  const list = await TransactionModel.find({
    family_id: familyId,
    type: 'expense',
    transaction_date: { $gte: start, $lte: end },
  })
    .select('category amount')
    .lean();
  const byCategory = new Map<string, number>();
  let total = 0;
  for (const t of list as Array<{ category: string; amount: number }>) {
    const cat = t.category || 'Other';
    const amt = Number(t.amount ?? 0);
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + amt);
    total += amt;
  }
  const byCategoryList = Array.from(byCategory.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
  return { total, byCategory: byCategoryList };
}

export interface CategoryInsightsContext {
  month?: string;
  total_expense: number;
  categories: Array<{ category: string; amount: number; percent: number }>;
  prev_total_expense: number;
  prev_categories: Array<{ category: string; amount: number; percent: number }>;
}

/**
 * Aggregate expense by category for current and previous month (for "above your usual").
 */
export async function getCategoryInsightsContext(
  familyId: string,
  month?: string
): Promise<CategoryInsightsContext> {
  const monthStr = month ?? getCurrentMonthStr();
  const [current, prev] = await Promise.all([
    getExpensesByCategory(familyId, monthStr),
    getExpensesByCategory(familyId, previousMonth(monthStr)),
  ]);
  const categories = current.byCategory.map((c) => ({
    category: c.category,
    amount: c.amount,
    percent: current.total > 0 ? Math.round((c.amount / current.total) * 1000) / 10 : 0,
  }));
  const prev_categories = prev.byCategory.map((c) => ({
    category: c.category,
    amount: c.amount,
    percent: prev.total > 0 ? Math.round((c.amount / prev.total) * 1000) / 10 : 0,
  }));
  return {
    month: monthStr,
    total_expense: current.total,
    categories,
    prev_total_expense: prev.total,
    prev_categories,
  };
}

export interface AskMonthContext {
  month?: string;
  total_income: number;
  total_expense: number;
  savings_rate: number;
  upcoming_bills: number;
  prev_income: number;
  prev_expense: number;
  top_categories: Array<{ category: string; amount: number; percent: number }>;
}

/**
 * Context for "Ask about this month" Q&A: summary + top expense categories.
 */
export async function getAskMonthContext(
  familyId: string,
  month?: string
): Promise<AskMonthContext> {
  const monthStr = month ?? getCurrentMonthStr();
  const [narrative, categoryCtx] = await Promise.all([
    getNarrativeSummaryContext(familyId, monthStr),
    getCategoryInsightsContext(familyId, monthStr),
  ]);
  return {
    month: narrative.month,
    total_income: narrative.total_income,
    total_expense: narrative.total_expense,
    savings_rate: narrative.savings_rate,
    upcoming_bills: narrative.upcoming_bills,
    prev_income: narrative.prev_income,
    prev_expense: narrative.prev_expense,
    top_categories: categoryCtx.categories.slice(0, 10),
  };
}