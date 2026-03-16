/**
 * Finance AI service: Hugging Face when available, rule-based fallback otherwise.
 */
import * as hf from '../../lib/huggingface.js';

const TEXT_MODEL = 'google/flan-t5-base';
const ZERO_SHOT_MODEL = 'facebook/bart-large-mnli';

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
}

export async function generateInsights(context: InsightsContext): Promise<{ insights: string; ai_available: boolean }> {
  const fallback =
    'Financial health looks stable. Key observations: Total balance and monthly flow are tracked. Consider keeping savings rate above 20%. Review upcoming bills and add more transactions for better insights.';
  if (!hf.isHuggingFaceAvailable()) {
    return { insights: fallback, ai_available: false };
  }
  const prompt = `Summarize this household finance snapshot in 2-3 short sentences. Be concise and actionable.
Total balance: ${context.total_balance} INR. This month income: ${context.total_income} INR, expenses: ${context.total_expense} INR. Savings rate: ${context.savings_rate}%. Upcoming bills: ${context.upcoming_bills}.
Give one paragraph of observations and one recommendation.`;
  const out = await hf.textGeneration(TEXT_MODEL, prompt, { max_new_tokens: 150 });
  if (out && out.length > 20) {
    return { insights: out, ai_available: true };
  }
  return { insights: fallback, ai_available: false };
}

const DEFAULT_SAVINGS_TIPS = [
  'Track small daily expenses to find easy cuts.',
  'Set a monthly cap for discretionary spending.',
  'Review subscriptions and cancel unused ones.',
];

export async function getSavingsTips(): Promise<{ tips: string[]; ai_available: boolean }> {
  if (!hf.isHuggingFaceAvailable()) {
    return { tips: DEFAULT_SAVINGS_TIPS, ai_available: false };
  }
  const prompt =
    'Give exactly 3 short savings tips for a household (one per line, no numbering). Focus on daily habits and subscriptions.';
  const out = await hf.textGeneration(TEXT_MODEL, prompt, { max_new_tokens: 120 });
  if (out) {
    const lines = out.split(/[\n.]/).map((s) => s.trim()).filter((s) => s.length > 10);
    if (lines.length >= 2) {
      return { tips: lines.slice(0, 3), ai_available: true };
    }
  }
  return { tips: DEFAULT_SAVINGS_TIPS, ai_available: false };
}

export async function suggestTransactionCategory(
  description: string,
  amount?: number,
  type?: string
): Promise<{ category: string; type?: 'income' | 'expense' }> {
  const desc = (description || '').toLowerCase();
  const fallback = { category: 'Other', type: 'expense' as const };
  if (hf.isHuggingFaceAvailable()) {
    const result = await hf.zeroShotClassification(
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
  if (hf.isHuggingFaceAvailable()) {
    const result = await hf.zeroShotClassification(ZERO_SHOT_MODEL, name, BILL_CATEGORIES);
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
}

export async function parseSmsToTransaction(smsText: string): Promise<ParsedTransaction | null> {
  const text = (smsText || '').trim();
  if (!text) return null;
  if (hf.isHuggingFaceAvailable()) {
    const prompt = `From this Indian bank SMS, extract: amount (number), type (income or expense), category (one word), short description, date (YYYY-MM-DD if present). Reply in one line: amount|type|category|description|date. SMS: ${text.slice(0, 400)}`;
    const out = await hf.textGeneration(TEXT_MODEL, prompt, { max_new_tokens: 80 });
    if (out) {
      const parts = out.split('|').map((s) => s.trim());
      const amount = parseFloat(parts[0]?.replace(/[^0-9.-]/g, '') || '0') || 0;
      const type = (parts[1]?.toLowerCase().includes('income') ? 'income' : 'expense') as 'income' | 'expense';
      const category = parts[2] || 'Other';
      const description = parts[3] || text.slice(0, 100);
      const transaction_date = parts[4]?.match(/\d{4}-\d{2}-\d{2}/)?.[0];
      if (amount > 0) {
        return { amount, type, category, description, transaction_date };
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
  return { amount, type, category: categoryRes.category, description: text.slice(0, 120), transaction_date };
}

export interface ParsedCard {
  bank_name?: string;
  card_name?: string;
  last_four_digits?: string;
  card_type?: 'credit' | 'debit';
  card_limit?: number;
}

export async function parseSmsToCard(smsText: string): Promise<ParsedCard | null> {
  const text = (smsText || '').trim();
  if (!text) return null;
  if (hf.isHuggingFaceAvailable()) {
    const prompt = `From this bank card SMS, extract: bank name, card name, last 4 digits, card type (credit or debit), credit limit (number if present). Reply: bank|cardname|last4|type|limit. SMS: ${text.slice(0, 400)}`;
    const out = await hf.textGeneration(TEXT_MODEL, prompt, { max_new_tokens: 60 });
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