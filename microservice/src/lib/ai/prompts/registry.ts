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
} from './finance.js';
import { buildContactCleanupPrompt } from './contacts.js';

export type PromptDefinition = {
  id: string;
  module: string;
  label: string;
  inputLabel: string;
  inputPlaceholder: string;
  buildPrompt: (input: string) => string;
  maxTokens?: number;
};

const SAMPLE_CATEGORY_LINES = [
  '- Groceries: ₹18,500 (26% of expenses)',
  '- Utilities: ₹9,200 (13% of expenses)',
  '- EMI/Loan: ₹22,000 (31% of expenses)',
].join('\n');

const SAMPLE_CATEGORY_INSIGHT_LINES = [
  'Groceries: ₹18500, 26% of total; last month 22%',
  'Utilities: ₹9200, 13% of total; last month 15%',
  'EMI/Loan: ₹22000, 31% of total; last month 28%',
].join('\n');

const SAMPLE_BILLS_SUMMARY =
  'Upcoming/pending bills: 2026-04-05 ₹24500; 2026-04-08 ₹3200; 2026-04-12 ₹1850. Total pending: 3. Overdue: 0. Bills due in 5 days: 2, total ₹27700. Bills due in 7 days: 3, total ₹29550. Balance: ₹25000. Shortfall for 5-day bills: ₹2700.';

const SAMPLE_BILL_LINES = '2026-04-05 ₹24500; 2026-04-08 ₹3200; 2026-04-12 ₹1850';

const SAMPLE_CONTACT_PAYLOAD = JSON.stringify([
  { id: 'c1', name: '9876543210', phone: '9876543210', email: '' },
  { id: 'c2', name: 'A', phone: '1111111111', email: 'bad-email' },
  { id: 'c3', name: 'Milkman', phone: '9876501234', email: 'milk@example.com' },
]);

export const promptRegistry: PromptDefinition[] = [
  {
    id: 'finance.ask-month',
    module: 'finance',
    label: 'Finance Ask Month',
    inputLabel: 'Question',
    inputPlaceholder: 'Why is expense high this month?',
    buildPrompt: (input) =>
      buildAskMonthPrompt({
        month: '2026-03',
        total_income: 125000,
        total_expense: 71000,
        savings_rate: 43,
        upcoming_bills: 3,
        prev_income: 118000,
        prev_expense: 65500,
        categoryLines: SAMPLE_CATEGORY_LINES,
        question: input || 'Why is expense high this month?',
      }),
    maxTokens: 200,
  },
  {
    id: 'finance.narrative-summary',
    module: 'finance',
    label: 'Finance Narrative Summary',
    inputLabel: 'Optional note',
    inputPlaceholder: 'Optional scenario note',
    buildPrompt: () =>
      buildNarrativeSummaryPrompt({
        month: '2026-03',
        total_income: 125000,
        total_expense: 71000,
        savings_rate: 43,
        upcoming_bills: 3,
        prev_income: 118000,
        prev_expense: 65500,
      }),
    maxTokens: 180,
  },
  {
    id: 'finance.category-insights',
    module: 'finance',
    label: 'Finance Category Insights',
    inputLabel: 'Optional note',
    inputPlaceholder: 'Optional note',
    buildPrompt: () => buildCategoryInsightsPrompt({ lines: SAMPLE_CATEGORY_INSIGHT_LINES }),
    maxTokens: 220,
  },
  {
    id: 'finance.risk-suggestions',
    module: 'finance',
    label: 'Finance Risk Suggestions',
    inputLabel: 'Optional note',
    inputPlaceholder: 'Optional note',
    buildPrompt: () =>
      buildRiskSuggestionsPrompt({
        total_income: 125000,
        total_expense: 71000,
        savings_rate: 43,
        total_balance: 25000,
        prevIncome: 118000,
        prevExpense: 65500,
        incomePct: 6,
        expensePct: 8,
        billsSummary: SAMPLE_BILLS_SUMMARY,
      }),
    maxTokens: 260,
  },
  {
    id: 'finance.cashflow-tips',
    module: 'finance',
    label: 'Finance Cashflow Tips',
    inputLabel: 'Optional note',
    inputPlaceholder: 'Optional note',
    buildPrompt: () =>
      buildCashflowTipsPrompt({
        total_balance: 25000,
        billsDueIn5Count: 2,
        totalDueIn5: 27700,
        shortfall5: 2700,
        billLines: SAMPLE_BILL_LINES,
      }),
    maxTokens: 160,
  },
  {
    id: 'finance.overview',
    module: 'finance',
    label: 'Finance Household Overview',
    inputLabel: 'Optional note',
    inputPlaceholder: 'Optional note',
    buildPrompt: () =>
      buildInsightsPrompt({
        members: 4,
        total_balance: 185000,
        month: '2026-03',
        total_income: 125000,
        total_expense: 71000,
        savings_rate: 43,
        upcoming_bills: 3,
        accounts: 3,
        transactions: 58,
        cards: 2,
      }),
    maxTokens: 220,
  },
  {
    id: 'finance.savings-tips',
    module: 'finance',
    label: 'Finance Savings Tips',
    inputLabel: 'Optional note',
    inputPlaceholder: 'Optional note',
    buildPrompt: () => buildSavingsTipsPrompt(),
    maxTokens: 120,
  },
  {
    id: 'finance.interpret-search',
    module: 'finance',
    label: 'Finance Interpret Search',
    inputLabel: 'Search query',
    inputPlaceholder: 'coffee last week',
    buildPrompt: (input) =>
      buildInterpretSearchPrompt({
        today: '2026-03-19',
        month: '2026-03',
        lastWeek: { date_from: '2026-03-09', date_to: '2026-03-15' },
        query: input || 'coffee last week',
      }),
    maxTokens: 140,
  },
  {
    id: 'finance.sms-transaction',
    module: 'finance',
    label: 'Finance SMS Transaction Parser',
    inputLabel: 'SMS text',
    inputPlaceholder: 'Your A/c XX1234 debited with Rs.5000...',
    buildPrompt: (input) => buildTransactionSmsPrompt(input || 'Your A/c XX1234 debited with Rs.5000 on 2026-03-18 at Amazon. Avl Bal Rs.45000'),
    maxTokens: 100,
  },
  {
    id: 'finance.sms-card',
    module: 'finance',
    label: 'Finance SMS Card Parser',
    inputLabel: 'SMS text',
    inputPlaceholder: 'Your HDFC credit card ending 1234...',
    buildPrompt: (input) => buildCardSmsPrompt(input || 'Your HDFC Bank Platinum Credit Card ending 1234 has been activated. Credit limit: Rs.100000'),
    maxTokens: 100,
  },
  {
    id: 'finance.sms-insurance',
    module: 'finance',
    label: 'Finance SMS Insurance Parser',
    inputLabel: 'SMS text',
    inputPlaceholder: 'LIC premium due...',
    buildPrompt: (input) => buildInsuranceSmsPrompt(input || 'LIC premium due for policy 123456789. Amount Rs 18500 due on 2026-04-10. Sum assured Rs 1000000.'),
    maxTokens: 140,
  },
  {
    id: 'finance.sms-investment',
    module: 'finance',
    label: 'Finance SMS Investment Parser',
    inputLabel: 'SMS text',
    inputPlaceholder: 'SIP of Rs 5000 processed...',
    buildPrompt: (input) => buildInvestmentSmsPrompt(input || 'SIP of Rs 5000 for Axis Growth Fund folio AX1234 processed on 2026-03-10 via Groww. Units 12.45 NAV 40.16.'),
    maxTokens: 140,
  },
  {
    id: 'finance.sms-loan',
    module: 'finance',
    label: 'Finance SMS Loan Parser',
    inputLabel: 'SMS text',
    inputPlaceholder: 'Your SBI Home Loan EMI...',
    buildPrompt: (input) => buildLoanSmsPrompt(input || 'Your SBI Home Loan EMI of Rs 24500 is due on 2026-04-05. Outstanding principal Rs 2450000. ROI 8.65%.'),
    maxTokens: 140,
  },
  {
    id: 'contacts.cleanup',
    module: 'contacts',
    label: 'Contacts Cleanup',
    inputLabel: 'Contacts JSON override',
    inputPlaceholder: '[{"id":"c1","name":"9876543210","phone":"9876543210","email":""}]',
    buildPrompt: (input) => buildContactCleanupPrompt({ payloadJson: input.trim() || SAMPLE_CONTACT_PAYLOAD }),
    maxTokens: 320,
  },
];

export function getPromptDefinition(id: string): PromptDefinition | null {
  return promptRegistry.find((item) => item.id === id) ?? null;
}
