/**
 * Finance AI service: configured provider when available, rule-based fallback otherwise.
 */
import * as ai from '../../lib/ai/index.js';
import {
  buildAskMonthPrompt,
  buildCardSmsPrompt,
  buildCashflowTipsPrompt,
  buildCategoryInsightsPrompt,
  buildInsightsPrompt,
  buildInsuranceSmsPrompt,
  buildInterpretSearchPrompt,
  buildInvestmentSmsPrompt,
  buildLoanSmsPrompt,
  buildNarrativeSummaryPrompt,
  buildRiskSuggestionsPrompt,
  buildSavingsTipsPrompt,
  buildTransactionSmsPrompt,
} from '../../lib/ai/prompts/finance.js';

const TEXT_MODEL = ai.getDefaultTextModel();
const ZERO_SHOT_MODEL = ai.getDefaultZeroShotModel();

const TRANSACTION_CATEGORIES = [
  'Salary', 'Shopping', 'Food', 'Transport', 'Utilities', 'Subscription',
  'Healthcare', 'EMI/Loan', 'Rent', 'Groceries', 'Entertainment', 'Other',
];

const BILL_CATEGORIES = [
  'Electricity', 'Water', 'Gas', 'Internet', 'Phone', 'Rent', 'Insurance',
  'Subscription', 'Pocket Money', 'Other',
];

const TRANSACTION_KEYWORDS: Array<{ keywords: string[]; category: string; type: 'income' | 'expense' }> = [
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

const BILL_KEYWORDS: Array<{ keywords: string[]; category: string }> = [
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

export interface InsightsContext {
  total_balance: number;
  total_income: number;
  total_expense: number;
  savings_rate: number;
  upcoming_bills: number;
  month?: string;
  members_count?: number;
  accounts_count?: number;
  transactions_count?: number;
  cards_count?: number;
}

export type RiskSuggestionsContext = import('./aggregate.js').RiskSuggestionsContext;
export type CategoryInsightsContext = import('./aggregate.js').CategoryInsightsContext;
export type NarrativeSummaryContext = import('./aggregate.js').NarrativeSummaryContext;
export type AskMonthContext = import('./aggregate.js').AskMonthContext;

export async function answerAskMonth(
  question: string,
  context: AskMonthContext
): Promise<{ answer: string; ai_available: boolean }> {
  const q = (question || '').trim();
  if (!q) {
    return { answer: 'Please ask a question about this month\'s finances.', ai_available: false };
  }
  const categoryLines =
    context.top_categories.length > 0
      ? context.top_categories
        .map((c) => `- ${c.category}: ₹${c.amount.toLocaleString()} (${c.percent}% of expenses)`)
        .join('\n')
      : 'No expense categories this month.';
  const fallback =
    `This month: income ₹${context.total_income.toLocaleString()}, expenses ₹${context.total_expense.toLocaleString()}, savings rate ${context.savings_rate}%, ${context.upcoming_bills} pending bills. Top categories: ${context.top_categories.slice(0, 3).map((c) => c.category).join(', ')}.`;
  if (!ai.isAiAvailable()) {
    return { answer: fallback, ai_available: false };
  }
  const prompt = buildAskMonthPrompt({
    month: context.month,
    total_income: context.total_income,
    total_expense: context.total_expense,
    savings_rate: context.savings_rate,
    upcoming_bills: context.upcoming_bills,
    prev_income: context.prev_income,
    prev_expense: context.prev_expense,
    categoryLines,
    question: q,
  });
  const out = await ai.textGeneration(TEXT_MODEL, prompt, { max_new_tokens: 150 });
  if (out && out.trim().length > 10) {
    return { answer: out.trim(), ai_available: true };
  }
  return { answer: fallback, ai_available: false };
}

export async function generateNarrativeSummary(
  context: NarrativeSummaryContext
): Promise<{ narrative: string; ai_available: boolean }> {
  const fallback =
    `This month: income ₹${context.total_income.toLocaleString()}, expenses ₹${context.total_expense.toLocaleString()}; savings rate ${context.savings_rate}%. ${context.upcoming_bills} pending bill(s).`;
  if (!ai.isAiAvailable()) {
    return { narrative: fallback, ai_available: false };
  }
  const prompt = buildNarrativeSummaryPrompt({
    month: context.month,
    total_income: context.total_income,
    total_expense: context.total_expense,
    savings_rate: context.savings_rate,
    upcoming_bills: context.upcoming_bills,
    prev_income: context.prev_income,
    prev_expense: context.prev_expense,
  });
  const out = await ai.textGeneration(TEXT_MODEL, prompt, { max_new_tokens: 150 });
  if (out && out.trim().length > 30) {
    return { narrative: out.trim(), ai_available: true };
  }
  return { narrative: fallback, ai_available: false };
}

const DEFAULT_RISK_SUGGESTIONS: string[] = [];

export interface CategoryInsightItem {
  category: string;
  amount: number;
  percent: number;
  summary: string;
}

export async function generateCategoryInsights(
  context: CategoryInsightsContext
): Promise<{ insights: CategoryInsightItem[]; ai_available: boolean }> {
  const topCategories = context.categories.slice(0, 8);
  if (topCategories.length === 0) {
    return { insights: [], ai_available: false };
  }
  const prevMap = new Map(context.prev_categories.map((c) => [c.category, c.percent]));
  const fallbackInsights: CategoryInsightItem[] = topCategories.map((c) => ({
    category: c.category,
    amount: c.amount,
    percent: c.percent,
    summary: `${c.category}: ${c.percent}% of expenses (₹${c.amount.toLocaleString()}).`,
  }));

  if (!ai.isAiAvailable()) {
    return { insights: fallbackInsights, ai_available: false };
  }

  const lines = topCategories
    .map((c) => {
      const prevPct = prevMap.get(c.category);
      const comp = prevPct != null ? `; last month ${prevPct}%` : '';
      return `${c.category}: ₹${c.amount}, ${c.percent}% of total${comp}`;
    })
    .join('\n');
  const prompt = buildCategoryInsightsPrompt({ lines });
  const out = await ai.textGeneration(TEXT_MODEL, prompt, { max_new_tokens: 200 });
  if (!out || out.trim().length < 5) {
    return { insights: fallbackInsights, ai_available: false };
  }
  const sentences = out
    .split(/\n/)
    .map((s) => s.replace(/^\d+[.)]\s*/, '').trim())
    .filter((s) => s.length > 5 && s.length < 120);
  const insights: CategoryInsightItem[] = topCategories.slice(0, sentences.length).map((c, i) => ({
    category: c.category,
    amount: c.amount,
    percent: c.percent,
    summary: sentences[i] || fallbackInsights[i]?.summary || `${c.category}: ${c.percent}% of expenses.`,
  }));
  return { insights, ai_available: true };
}

export async function generateRiskSuggestions(
  context: RiskSuggestionsContext
): Promise<{ risks: string[]; ai_available: boolean }> {
  if (!ai.isAiAvailable()) {
    return { risks: DEFAULT_RISK_SUGGESTIONS, ai_available: false };
  }
  const prevIncome = context.prev_month_income || 0;
  const prevExpense = context.prev_month_expense || 0;
  const incomePct =
    prevIncome > 0 && context.total_income > 0
      ? Math.round(((context.total_income - prevIncome) / prevIncome) * 100)
      : null;
  const expensePct =
    prevExpense > 0 && context.total_expense > 0
      ? Math.round(((context.total_expense - prevExpense) / prevExpense) * 100)
      : null;
  const now = Date.now();
  const in5 = 5 * 24 * 60 * 60 * 1000;
  const in7 = 7 * 24 * 60 * 60 * 1000;
  const billsDueIn5 = context.upcoming_bills.filter((b) => {
    const t = new Date(b.due_date).getTime();
    return t >= now && t <= now + in5;
  });
  const billsDueIn7 = context.upcoming_bills.filter((b) => {
    const t = new Date(b.due_date).getTime();
    return t >= now && t <= now + in7;
  });
  const totalDueIn5 = billsDueIn5.reduce((s, b) => s + b.amount, 0);
  const totalDueIn7 = billsDueIn7.reduce((s, b) => s + b.amount, 0);
  const shortfall5 = Math.max(0, totalDueIn5 - context.total_balance);
  const shortfall7 = Math.max(0, totalDueIn7 - context.total_balance);

  const billsSummary =
    context.upcoming_bills.length > 0
      ? `Upcoming/pending bills: ${context.upcoming_bills
        .slice(0, 5)
        .map((b) => `${b.due_date} ₹${b.amount}`)
        .join('; ')}${context.upcoming_bills.length > 5 ? '...' : ''}. Total pending: ${context.pending_bills_count}. Overdue: ${context.overdue_bills_count}. Bills due in 5 days: ${billsDueIn5.length}, total ₹${totalDueIn5}. Bills due in 7 days: ${billsDueIn7.length}, total ₹${totalDueIn7}. Balance: ₹${context.total_balance}. ${shortfall5 > 0 ? `Shortfall for 5-day bills: ₹${shortfall5}.` : ''} ${shortfall7 > 0 ? `Shortfall for 7-day bills: ₹${shortfall7}.` : ''}`
      : 'No pending bills.';
  const prompt = buildRiskSuggestionsPrompt({
    total_income: context.total_income,
    total_expense: context.total_expense,
    savings_rate: context.savings_rate,
    total_balance: context.total_balance,
    prevIncome,
    prevExpense,
    incomePct,
    expensePct,
    billsSummary,
  });
  const out = await ai.textGeneration(TEXT_MODEL, prompt, { max_new_tokens: 250 });
  if (!out || out.trim().length < 5) {
    return { risks: DEFAULT_RISK_SUGGESTIONS, ai_available: false };
  }
  const normalized = out.trim().toLowerCase();
  if (normalized.includes('no additional risks') || normalized.startsWith('none')) {
    return { risks: [], ai_available: true };
  }
  const lines = out
    .split(/[\n•·-]/)
    .map((s) => s.replace(/^\d+[.)]\s*/, '').trim())
    .filter((s) => s.length > 15 && s.length < 120);
  return { risks: lines.slice(0, 5), ai_available: true };
}

/**
 * Due-date / cash-flow tips for bills: "3 bills due in 5 days; balance might be short by ₹X", "Consider paying Y before Z."
 */
export async function generateCashflowTips(
  context: RiskSuggestionsContext
): Promise<{ tips: string[]; ai_available: boolean }> {
  const now = Date.now();
  const in5 = 5 * 24 * 60 * 60 * 1000;
  const in7 = 7 * 24 * 60 * 60 * 1000;
  const billsDueIn5 = context.upcoming_bills.filter((b) => {
    const t = new Date(b.due_date).getTime();
    return t >= now && t <= now + in5;
  });
  const billsDueIn7 = context.upcoming_bills.filter((b) => {
    const t = new Date(b.due_date).getTime();
    return t >= now && t <= now + in7;
  });
  const totalDueIn5 = billsDueIn5.reduce((s, b) => s + b.amount, 0);
  const totalDueIn7 = billsDueIn7.reduce((s, b) => s + b.amount, 0);
  const shortfall5 = Math.max(0, totalDueIn5 - context.total_balance);
  const shortfall7 = Math.max(0, totalDueIn7 - context.total_balance);

  const ruleBasedTips: string[] = [];
  if (billsDueIn5.length > 0) {
    ruleBasedTips.push(
      `${billsDueIn5.length} bill${billsDueIn5.length > 1 ? 's' : ''} due in 5 days${shortfall5 > 0 ? `; balance might be short by ₹${shortfall5.toLocaleString()}` : ''}.`
    );
  }
  if (billsDueIn7.length > 0 && billsDueIn7.length !== billsDueIn5.length) {
    ruleBasedTips.push(
      `${billsDueIn7.length} bill${billsDueIn7.length > 1 ? 's' : ''} due in 7 days${shortfall7 > 0 ? `; shortfall ₹${shortfall7.toLocaleString()}` : ''}.`
    );
  }
  if (context.upcoming_bills.length >= 2 && context.total_balance < totalDueIn7) {
    const sorted = [...context.upcoming_bills].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    const first = sorted[0];
    const second = sorted[1];
    ruleBasedTips.push(`Consider paying ${first.due_date} (₹${first.amount}) before ${second.due_date} (₹${second.amount}).`);
  }

  if (!ai.isAiAvailable()) {
    return { tips: ruleBasedTips, ai_available: false };
  }

  const billLines = context.upcoming_bills.slice(0, 6).map((b) => `${b.due_date} ₹${b.amount}`).join('; ');
  const prompt = buildCashflowTipsPrompt({
    total_balance: context.total_balance,
    billsDueIn5Count: billsDueIn5.length,
    totalDueIn5,
    shortfall5,
    billLines,
  });
  const out = await ai.textGeneration(TEXT_MODEL, prompt, { max_new_tokens: 120 });
  if (out && out.trim().length > 10) {
    const lines = out
      .split(/[\n•·-]/)
      .map((s) => s.replace(/^\d+[.)]\s*/, '').trim())
      .filter((s) => s.length > 10 && s.length < 100);
    if (lines.length > 0) return { tips: lines.slice(0, 3), ai_available: true };
  }
  return { tips: ruleBasedTips, ai_available: false };
}

export async function generateInsights(context: InsightsContext): Promise<{ insights: string; ai_available: boolean }> {
  const fallback =
    'Household is set up with family members. Finance is active: balance and monthly flow are tracked. Consider keeping savings rate above 20%. Review upcoming bills and add more transactions for better insights. Other modules (Events, Assets, Health, etc.) are available in the app.';
  if (!ai.isAiAvailable()) {
    return { insights: fallback, ai_available: false };
  }
  const members = context.members_count ?? 0;
  const accounts = context.accounts_count ?? 0;
  const transactions = context.transactions_count ?? 0;
  const cards = context.cards_count ?? 0;
  const prompt = buildInsightsPrompt({
    members,
    total_balance: context.total_balance,
    month: context.month,
    total_income: context.total_income,
    total_expense: context.total_expense,
    savings_rate: context.savings_rate,
    upcoming_bills: context.upcoming_bills,
    accounts,
    transactions,
    cards,
  });
  const out = await ai.textGeneration(TEXT_MODEL, prompt, { max_new_tokens: 200 });
  if (out && out.length > 20) {
    return { insights: out.trim(), ai_available: true };
  }
  return { insights: fallback, ai_available: false };
}

const DEFAULT_SAVINGS_TIPS = [
  'Track small daily expenses to find easy cuts.',
  'Set a monthly cap for discretionary spending.',
  'Review subscriptions and cancel unused ones.',
];

export async function getSavingsTips(): Promise<{ tips: string[]; ai_available: boolean }> {
  if (!ai.isAiAvailable()) {
    return { tips: DEFAULT_SAVINGS_TIPS, ai_available: false };
  }
  const prompt = buildSavingsTipsPrompt();
  const out = await ai.textGeneration(TEXT_MODEL, prompt, { max_new_tokens: 120 });
  if (out) {
    const lines = out.split(/[\n.]/).map((s) => s.trim()).filter((s) => s.length > 10);
    if (lines.length >= 2) {
      return { tips: lines.slice(0, 3), ai_available: true };
    }
  }
  return { tips: DEFAULT_SAVINGS_TIPS, ai_available: false };
}

export interface TransactionSearchSpec {
  description_contains?: string;
  category?: string;
  type?: 'income' | 'expense';
  date_from?: string;
  date_to?: string;
  sort?: 'newest' | 'oldest' | 'amount_high' | 'amount_low';
}

function getLastWeekRange(): { date_from: string; date_to: string } {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  const lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - diffToMonday - 7);
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  return {
    date_from: lastMonday.toISOString().slice(0, 10),
    date_to: lastSunday.toISOString().slice(0, 10),
  };
}

export async function interpretSearchQuery(
  query: string,
  month?: string
): Promise<{ spec: TransactionSearchSpec; ai_available: boolean }> {
  const q = (query || '').trim().toLowerCase();
  const fallback: TransactionSearchSpec = {};
  if (!q) {
    return { spec: fallback, ai_available: false };
  }
  if (ai.isAiAvailable()) {
    const today = new Date().toISOString().slice(0, 10);
    const lastWeek = getLastWeekRange();
    const prompt = buildInterpretSearchPrompt({ today, month, lastWeek, query });
    const out = await ai.textGeneration(TEXT_MODEL, prompt, { max_new_tokens: 120 });
    if (out) {
      const jsonMatch = out.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
          const spec: TransactionSearchSpec = {};
          if (typeof parsed.description_contains === 'string' && parsed.description_contains.length > 0) spec.description_contains = parsed.description_contains;
          if (typeof parsed.category === 'string' && parsed.category.length > 0) spec.category = parsed.category;
          if (parsed.type === 'income' || parsed.type === 'expense') spec.type = parsed.type;
          if (typeof parsed.date_from === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date_from)) spec.date_from = parsed.date_from;
          if (typeof parsed.date_to === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date_to)) spec.date_to = parsed.date_to;
          const sortVal = parsed.sort;
          if (sortVal === 'newest' || sortVal === 'oldest' || sortVal === 'amount_high' || sortVal === 'amount_low') spec.sort = sortVal;
          return { spec, ai_available: true };
        } catch {
          /* fall through to rule-based */
        }
      }
    }
  }
  const spec: TransactionSearchSpec = { ...fallback };
  if (/\b(last\s+week|past\s+week)\b/i.test(q)) {
    const lw = getLastWeekRange();
    spec.date_from = lw.date_from;
    spec.date_to = lw.date_to;
  }
  if (/\b(biggest|largest|highest|top)\b.*\b(expense|spend)\b/i.test(q) || /\bexpense.*\b(biggest|largest)\b/i.test(q)) {
    spec.type = 'expense';
    spec.sort = 'amount_high';
  }
  if (/\b(biggest|largest|highest)\b.*\b(income|salary)\b/i.test(q)) {
    spec.type = 'income';
    spec.sort = 'amount_high';
  }
  const words = q.replace(/\b(last week|this month|biggest|expense|income)\b/gi, '').trim().split(/\s+/).filter(Boolean);
  if (words.length > 0 && !spec.description_contains) spec.description_contains = words[0];
  return { spec, ai_available: false };
}

export async function suggestTransactionCategory(
  description: string,
  amount?: number, type?: string
): Promise<{ category: string; type?: 'income' | 'expense' }> {
  const desc = (description || '').toLowerCase();
  const fallback = { category: 'Other', type: 'expense' as const };
  if (ai.isAiAvailable()) {
    const result = await ai.zeroShotClassification(
      ZERO_SHOT_MODEL,
      desc + (amount != null ? ` Amount: ${amount}.` : ''),
      TRANSACTION_CATEGORIES
    );
    if (result) {
      const suggestedType: 'income' | 'expense' = result.label === 'Salary' ? 'income' : 'expense';
      const outType = type === 'income' || type === 'expense' ? type : suggestedType;
      return { category: result.label, type: outType };
    }
  }
  for (const { keywords, category, type: t } of TRANSACTION_KEYWORDS) {
    if (keywords.some((k) => desc.includes(k))) return { category, type: t };
  }
  return fallback;
}

export async function suggestBillCategory(billName: string): Promise<{ category: string }> {
  const name = (billName || '').toLowerCase();
  const fallback = { category: 'Other' };
  if (ai.isAiAvailable()) {
    const result = await ai.zeroShotClassification(ZERO_SHOT_MODEL, name, BILL_CATEGORIES);
    if (result) return { category: result.label };
  }
  for (const { keywords, category } of BILL_KEYWORDS) {
    if (keywords.some((k) => name.includes(k))) return { category };
  }
  return fallback;
}

export interface ParsedTransaction {
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description?: string;
  transaction_date?: string;
  payment_source?: 'account' | 'card' | 'unknown';
  last_four_digits?: string;
}

export async function parseSmsToTransaction(smsText: string): Promise<ParsedTransaction | null> {
  const text = (smsText || '').trim();
  if (!text) return null;
  if (ai.isAiAvailable()) {
    const prompt = buildTransactionSmsPrompt(text);
    const out = await ai.textGeneration(TEXT_MODEL, prompt, { max_new_tokens: 120 });
    if (out) {
      const parts = out.split('|').map((s) => s.trim());
      const amount = parseFloat(parts[0]?.replace(/[^0-9.-]/g, '') || '0') || 0;
      const type = (parts[1]?.toLowerCase().includes('income') ? 'income' : 'expense') as 'income' | 'expense';
      const category = parts[2] || 'Other';
      const description = parts[3] || text.slice(0, 100);
      const transaction_date = parts[4]?.match(/\d{4}-\d{2}-\d{2}/)?.[0];
      const payment_source = parts[5] === 'account' || parts[5] === 'card' ? parts[5] : 'unknown';
      const last_four_digits = parts[6]?.replace(/\D/g, '').slice(-4) || undefined;
      if (amount > 0) {
        return { amount, type, category, description, transaction_date, payment_source, last_four_digits };
      }
    }
  }
  const numMatch = text.match(/(?:debited|credited|rs\.?|inr)\s*[\d,]+(?:\.\d{2})?|[\d,]+(?:\.\d{2})?\s*(?:debited|credited)/i);
  const amountStr = numMatch?.[0]?.replace(/[^0-9.]/g, '') || '';
  const amount = parseFloat(amountStr) || 0;
  const type: 'income' | 'expense' = /credited|deposit|received/i.test(text) ? 'income' : 'expense';
  const categoryRes = await suggestTransactionCategory(text, amount, type);
  const dateMatch = text.match(/\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}-\d{2}-\d{2}/);
  let transaction_date: string | undefined;
  if (dateMatch) {
    const d = new Date(dateMatch[0]);
    if (!Number.isNaN(d.getTime())) transaction_date = d.toISOString().slice(0, 10);
  }
  const lastFourMatch = text.match(/(?:a\/c|acct|account|card)[^0-9]{0,12}(?:xx|x{2,}|\*{2,}|ending)?\s*([0-9]{4})/i)
    || text.match(/(?:ending|ends? with|last\s*4|last four)[^0-9]{0,8}([0-9]{4})/i)
    || text.match(/\b([0-9]{4})\b(?!.*\b[0-9]{4}\b)/);
  const payment_source: 'account' | 'card' | 'unknown' = /\b(card|credit card|debit card)\b/i.test(text)
    ? 'card'
    : /\b(a\/c|acct|account)\b/i.test(text)
      ? 'account'
      : 'unknown';
  return {
    amount,
    type,
    category: categoryRes.category,
    description: text.slice(0, 120),
    transaction_date,
    payment_source,
    last_four_digits: lastFourMatch?.[1],
  };
}

export interface ParsedCard {
  bank_name?: string;
  card_name?: string;
  last_four_digits?: string;
  card_type?: 'credit' | 'debit';
  card_limit?: number;
}

export interface ParsedInsurance {
  type?: 'life' | 'health' | 'vehicle' | 'term' | 'other';
  provider?: string;
  policyName?: string;
  policyNumber?: string;
  premiumAmount?: number;
  premiumFrequency?: 'monthly' | 'quarterly' | 'yearly';
  nextDueDate?: string;
  coverageAmount?: number;
  insuredMembers?: string[];
  status?: 'active' | 'expired';
}

export interface ParsedInvestment {
  type?: 'mutual_fund' | 'stock' | 'fd' | 'other';
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
  status?: 'active' | 'paused' | 'closed';
}

export interface ParsedLoan {
  name?: string;
  lender?: string;
  principalAmount?: number;
  interestRate?: number;
  tenureMonths?: number;
  emiAmount?: number;
  startDate?: string;
  nextDueDate?: string;
  outstandingPrincipal?: number;
  type?: 'home' | 'car' | 'personal' | 'education' | 'other';
  status?: 'active' | 'closed';
}

export async function parseSmsToCard(smsText: string): Promise<ParsedCard | null> {
  const text = (smsText || '').trim();
  if (!text) return null;
  if (ai.isAiAvailable()) {
    const prompt = buildCardSmsPrompt(text);
    const out = await ai.textGeneration(TEXT_MODEL, prompt, { max_new_tokens: 60 });
    if (out) {
      const parts = out.split('|').map((s) => s.trim());
      const last4 = parts[2]?.replace(/\D/g, '').slice(-4) || undefined;
      const limit = parseFloat(parts[4]?.replace(/[^0-9.]/g, '') || '0') || undefined;
      return {
        bank_name: parts[0] || undefined,
        card_name: parts[1] || undefined,
        last_four_digits: last4,
        card_type: parts[3]?.toLowerCase().includes('credit') ? 'credit' : 'debit',
        card_limit: limit,
      };
    }
  }
  const last4Match = text.match(/(?:ending|xxxx\s*|\.\s*)(\d{4})|(\d{4})\s*(?:is|has been)/i);
  const last_four_digits = last4Match?.[1] || last4Match?.[2];
  const limitMatch = text.match(/(?:limit|credit limit)[:\s]*[\d,]+(?:\.\d{2})?|rs\.?\s*[\d,]+/i);
  const card_limit = limitMatch ? parseFloat(limitMatch[0].replace(/[^0-9.]/g, '')) : undefined;
  const bankMatch = text.match(/(hdfc|icici|sbi|axis|kotak|pnb|bob|yes bank|indusind)/i);
  return {
    bank_name: bankMatch?.[0] || undefined,
    card_name: undefined,
    last_four_digits: last_four_digits ?? undefined,
    card_type: /credit/i.test(text) ? 'credit' : 'debit',
    card_limit,
  };
}

function extractDate(text: string): string | undefined {
  const match = text.match(/\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/);
  if (!match) return undefined;
  const d = new Date(match[0]);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}

function extractNumber(text: string, pattern: RegExp): number | undefined {
  const match = text.match(pattern);
  if (!match) return undefined;
  const value = parseFloat(match[1]?.replace(/,/g, '') || '');
  return Number.isFinite(value) ? value : undefined;
}

function extractTenureMonths(text: string): number | undefined {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(months?|mos?|yrs?|years?)/i);
  if (!match) return undefined;
  const value = parseFloat(match[1] || '');
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return /yrs?|years?/i.test(match[2] || '')
    ? Math.round(value * 12)
    : Math.round(value);
}

function pickEnumValue<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T {
  const normalized = (value || '').trim().toLowerCase();
  const match = allowed.find((item) => item === normalized);
  return match ?? fallback;
}

export async function parseSmsToInsurance(smsText: string): Promise<ParsedInsurance | null> {
  const text = (smsText || '').trim();
  if (!text) return null;
  if (ai.isAiAvailable()) {
    const prompt = buildInsuranceSmsPrompt(text);
    const out = await ai.textGeneration(TEXT_MODEL, prompt, { max_new_tokens: 120 });
    // life|LIC|119575879|||$|2026-05-12|120000|John Doe|active
    if (out) {
      const parts = out.split('|').map((s) => s.trim());
      return {
        type: pickEnumValue(parts[0], ['life', 'health', 'vehicle', 'term', 'other'] as const, 'other'),
        provider: parts[1] || undefined,
        policyName: parts[2] || undefined,
        policyNumber: parts[3] || undefined,
        premiumAmount: parseFloat(parts[4]?.replace(/[^0-9.]/g, '') || '0') || undefined,
        premiumFrequency: pickEnumValue(parts[5], ['monthly', 'quarterly', 'yearly'] as const, 'yearly'),
        nextDueDate: extractDate(parts[6] || ''),
        coverageAmount: parseFloat(parts[7]?.replace(/[^0-9.]/g, '') || '0') || undefined,
        insuredMembers: parts[8] ? parts[8].split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        status: pickEnumValue(parts[9], ['active', 'expired'] as const, 'active'),
      };
    }
  }
  const provider = text.match(/(?:lic|hdfc ergo|icici lombard|star health|niva bupa|sbi life|max life|bajaj allianz)/i)?.[0];
  const type = /health/i.test(text) ? 'health' : /vehicle|motor|car|bike/i.test(text) ? 'vehicle' : /term/i.test(text) ? 'term' : /life/i.test(text) ? 'life' : 'other';
  return {
    type,
    provider,
    policyName: provider ? `${provider} Policy` : 'Insurance Policy',
    policyNumber: text.match(/(?:policy|pol)\s*(?:no|number)?[:\s-]*([A-Z0-9-]{6,})/i)?.[1],
    premiumAmount: extractNumber(text, /(?:premium|instalment|installment|amount)\D+([\d,]+(?:\.\d+)?)/i),
    premiumFrequency: /month/i.test(text) ? 'monthly' : /quarter/i.test(text) ? 'quarterly' : 'yearly',
    nextDueDate: extractDate(text),
    coverageAmount: extractNumber(text, /(?:cover|coverage|sum insured)\D+([\d,]+(?:\.\d+)?)/i),
    status: /expired|lapsed/i.test(text) ? 'expired' : 'active',
  };
}

export async function parseSmsToInvestment(smsText: string): Promise<ParsedInvestment | null> {
  const text = (smsText || '').trim();
  if (!text) return null;
  if (ai.isAiAvailable()) {
    const prompt = buildInvestmentSmsPrompt(text);
    const out = await ai.textGeneration(TEXT_MODEL, prompt, { max_new_tokens: 120 });
    if (out) {
      const parts = out.split('|').map((s) => s.trim());
      return {
        type: pickEnumValue(parts[0], ['mutual_fund', 'stock', 'fd', 'other'] as const, 'other'),
        name: parts[1] || undefined,
        folioNumber: parts[2] || undefined,
        sipAmount: parseFloat(parts[3]?.replace(/[^0-9.]/g, '') || '0') || undefined,
        sipDay: parseInt(parts[4]?.replace(/\D/g, '') || '0', 10) || undefined,
        startDate: extractDate(parts[5] || ''),
        currentValue: parseFloat(parts[6]?.replace(/[^0-9.]/g, '') || '0') || undefined,
        investedAmount: parseFloat(parts[7]?.replace(/[^0-9.]/g, '') || '0') || undefined,
        units: parseFloat(parts[8]?.replace(/[^0-9.]/g, '') || '0') || undefined,
        nav: parseFloat(parts[9]?.replace(/[^0-9.]/g, '') || '0') || undefined,
        platform: parts[10] || undefined,
        status: pickEnumValue(parts[11], ['active', 'paused', 'closed'] as const, 'active'),
      };
    }
  }
  return {
    type: /fd|fixed deposit/i.test(text) ? 'fd' : /stock|share/i.test(text) ? 'stock' : /mutual|sip|folio/i.test(text) ? 'mutual_fund' : 'other',
    name: text.match(/(?:for|in)\s+([A-Za-z0-9 .&-]{4,40})/)?.[1]?.trim(),
    folioNumber: text.match(/folio(?:\s*no)?[:\s-]*([A-Z0-9-]+)/i)?.[1],
    sipAmount: extractNumber(text, /(?:sip|instalment|installment|amount)\D+([\d,]+(?:\.\d+)?)/i),
    sipDay: parseInt(text.match(/(?:sip date|on)\D+(\d{1,2})/i)?.[1] || '', 10) || undefined,
    startDate: extractDate(text),
    currentValue: extractNumber(text, /(?:current value|value)\D+([\d,]+(?:\.\d+)?)/i),
    investedAmount: extractNumber(text, /(?:invested|purchase|amount invested)\D+([\d,]+(?:\.\d+)?)/i),
    units: extractNumber(text, /units?\D+([\d,]+(?:\.\d+)?)/i),
    nav: extractNumber(text, /nav\D+([\d,]+(?:\.\d+)?)/i),
    platform: text.match(/(?:zerodha|groww|upstox|angel one|paytm money)/i)?.[0],
    status: /closed/i.test(text) ? 'closed' : /paused/i.test(text) ? 'paused' : 'active',
  };
}

export async function parseSmsToLoan(smsText: string): Promise<ParsedLoan | null> {
  const text = (smsText || '').trim();
  if (!text) return null;
  if (ai.isAiAvailable()) {
    const prompt = buildLoanSmsPrompt(text);
    const out = await ai.textGeneration(TEXT_MODEL, prompt, { max_new_tokens: 120 });
    if (out) {
      const parts = out.split('|').map((s) => s.trim());
      return {
        name: parts[0] || 'Loan',
        lender: parts[1] || 'Unknown',
        principalAmount: parseFloat(parts[2]?.replace(/[^0-9.]/g, '') || '0') || undefined,
        interestRate: parseFloat(parts[3]?.replace(/[^0-9.]/g, '') || '0') || undefined,
        tenureMonths: extractTenureMonths(parts[4] || '') ?? (parseInt(parts[4]?.replace(/\D/g, '') || '0', 10) || undefined),
        emiAmount: parseFloat(parts[5]?.replace(/[^0-9.]/g, '') || '0') || undefined,
        startDate: extractDate(parts[6] || ''),
        nextDueDate: extractDate(parts[7] || ''),
        outstandingPrincipal: parseFloat(parts[8]?.replace(/[^0-9.]/g, '') || '0') || undefined,
        type: pickEnumValue(parts[9], ['home', 'car', 'personal', 'education', 'other'] as const, 'other'),
        status: pickEnumValue(parts[10], ['active', 'closed'] as const, 'active'),
      };
    }
  }
  const lender = text.match(/(?:hdfc|sbi|icici|axis|bajaj finserv|tata capital|pnb|kotak)/i)?.[0];
  return {
    name: text.match(/(home loan|car loan|personal loan|education loan)/i)?.[0] || 'Loan',
    lender: lender || 'Unknown',
    principalAmount: extractNumber(text, /(?:principal|loan amount|sanctioned)\D+([\d,]+(?:\.\d+)?)/i),
    interestRate: extractNumber(text, /(?:interest|roi)\D+([\d,]+(?:\.\d+)?)/i),
    tenureMonths: extractTenureMonths(text),
    emiAmount: extractNumber(text, /(?:emi)\D+([\d,]+(?:\.\d+)?)/i),
    startDate: extractDate(text),
    nextDueDate: extractDate(text),
    outstandingPrincipal: extractNumber(text, /(?:outstanding|balance principal|principal outstanding)\D+([\d,]+(?:\.\d+)?)/i),
    type: /home/i.test(text) ? 'home' : /car/i.test(text) ? 'car' : /education/i.test(text) ? 'education' : /personal/i.test(text) ? 'personal' : 'other',
    status: /closed/i.test(text) ? 'closed' : 'active',
  };
}
