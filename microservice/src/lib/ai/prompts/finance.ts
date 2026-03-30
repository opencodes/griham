import { normalizeSms } from "./helper.js";

type AskMonthPromptInput = {
  month?: string;
  total_income: number;
  total_expense: number;
  savings_rate: number;
  upcoming_bills: number;
  prev_income: number;
  prev_expense: number;
  categoryLines: string;
  question: string;
};

type NarrativePromptInput = {
  month?: string;
  total_income: number;
  total_expense: number;
  savings_rate: number;
  upcoming_bills: number;
  prev_income: number;
  prev_expense: number;
};

type CategoryInsightsPromptInput = {
  lines: string;
};

type RiskPromptInput = {
  total_income: number;
  total_expense: number;
  savings_rate: number;
  total_balance: number;
  prevIncome: number;
  prevExpense: number;
  incomePct: number | null;
  expensePct: number | null;
  billsSummary: string;
};

type CashflowPromptInput = {
  total_balance: number;
  billsDueIn5Count: number;
  totalDueIn5: number;
  shortfall5: number;
  billLines: string;
};

type InsightsPromptInput = {
  members: number;
  total_balance: number;
  month?: string;
  total_income: number;
  total_expense: number;
  savings_rate: number;
  upcoming_bills: number;
  accounts: number;
  transactions: number;
  cards: number;
};

type InterpretSearchPromptInput = {
  today: string;
  month?: string;
  lastWeek: { date_from: string; date_to: string };
  query: string;
};

export function buildAskMonthPrompt(input: AskMonthPromptInput): string {
  const monthLabel = input.month ? ` for ${input.month}` : '';
  return `You are a helpful finance assistant. Answer the user's question in 1-3 short sentences using ONLY the data below. Be concise and factual.
Data for this month${monthLabel}:
- Income: ₹${input.total_income.toLocaleString()}, Expenses: ₹${input.total_expense.toLocaleString()}
- Savings rate: ${input.savings_rate}%
- Pending bills: ${input.upcoming_bills}
- Last month: income ₹${input.prev_income.toLocaleString()}, expenses ₹${input.prev_expense.toLocaleString()}
Expense by category:
${input.categoryLines}

User question: ${input.question}

Answer (1-3 sentences, no bullet points):`;
}

export function buildNarrativeSummaryPrompt(input: NarrativePromptInput): string {
  const monthLabel = input.month ? ` for ${input.month}` : '';
  const trend =
    input.prev_expense > 0 || input.prev_income > 0
      ? ` Last month: income ₹${input.prev_income.toLocaleString()}, expenses ₹${input.prev_expense.toLocaleString()}.`
      : '';
  return `Write exactly 2-3 short sentences summarizing this month's finances. Do not use bullet points.
This month${monthLabel}: income ₹${input.total_income}, expenses ₹${input.total_expense}, savings rate ${input.savings_rate}%, ${input.upcoming_bills} pending bill(s).${trend}
Mention income, expenses, and bills; if trend is available mention whether spending is up or down vs last month. Be concise and neutral.`;
}

export function buildCategoryInsightsPrompt(input: CategoryInsightsPromptInput): string {
  return `For each spending category below, write ONE short sentence (e.g. "Food is 25% of expenses; above your usual" or "Transport is 12% of expenses."). Use "above your usual" if this month's % is higher than last month's, "below your usual" if lower. Keep each to under 15 words.
Categories (this month):
${input.lines}
Reply with one sentence per category, in the same order, one per line. No numbering.`;
}

export function buildRiskSuggestionsPrompt(input: RiskPromptInput): string {
  return `You are a household finance risk advisor. Given this data, suggest 2 to 5 SHORT risk alerts (one line each, no numbering). Focus on:
- Spending or income changes vs last month (e.g. "Spending up 20% vs last month")
- Bills and cash flow: include due-date/cash-flow tips when relevant (e.g. "3 bills due in 5 days; balance might be short by ₹X", "Consider paying Y before Z")
- Savings rate or balance concerns
Current month: income ₹${input.total_income}, expenses ₹${input.total_expense}, savings rate ${input.savings_rate}%, balance ₹${input.total_balance}. Previous month: income ₹${input.prevIncome}, expenses ₹${input.prevExpense}. ${input.incomePct != null ? `Income change: ${input.incomePct}% vs last month.` : ''} ${input.expensePct != null ? `Expense change: ${input.expensePct}% vs last month.` : ''} ${input.billsSummary}
Reply with ONLY the risk lines, one per line, no numbers or bullets. If no real risks, reply "No additional risks."`;
}

export function buildCashflowTipsPrompt(input: CashflowPromptInput): string {
  return `Generate 1 to 3 SHORT cash-flow tips for the user. Data: Balance ₹${input.total_balance}. ${input.billsDueIn5Count} bills due in 5 days (total ₹${input.totalDueIn5}). ${input.shortfall5 > 0 ? `Shortfall: ₹${input.shortfall5}.` : ''} Bills: ${input.billLines}.
Include if relevant: "N bills due in 5 days; balance might be short by ₹X" or "Consider paying Y before Z." One tip per line, no numbering.`;
}

export function buildInsightsPrompt(input: InsightsPromptInput): string {
  const monthLabel = input.month ? ` for ${input.month}` : '';
  return `Write one short paragraph (3-5 sentences) for a "Household Overview" that covers:
1) Family: this household has ${input.members} member(s).
2) Finance: total balance ${input.total_balance} INR; this month${monthLabel} income ${input.total_income} INR, expenses ${input.total_expense} INR; savings rate ${input.savings_rate}%; ${input.upcoming_bills} pending bill(s). Finance module: ${input.accounts} account(s), ${input.transactions} transaction(s) this month, ${input.cards} card(s).
3) Module status: mention Finance is active with the above; briefly note that other modules (Events, Assets, Health, Contacts, Organizer, Messages) are available in the app.
Be concise, practical, and motivating. One paragraph only.`;
}

export function buildSavingsTipsPrompt(): string {
  return 'Give exactly 3 short savings tips for a household (one per line, no numbering). Focus on daily habits and subscriptions.';
}

export function buildInterpretSearchPrompt(input: InterpretSearchPromptInput): string {
  return `Convert this transaction search query into a JSON object. Today is ${input.today}. Current month context: ${input.month || 'not set'}. Last week: ${input.lastWeek.date_from} to ${input.lastWeek.date_to}.
Query: "${input.query}"

Return ONLY a JSON object with these optional keys (use null for missing): description_contains (string, keyword to find in description/category), category (string, one category), type ("income" or "expense"), date_from (YYYY-MM-DD), date_to (YYYY-MM-DD), sort ("newest" or "oldest" or "amount_high" or "amount_low").
Examples: "coffee last week" -> {"description_contains":"coffee","date_from":"${input.lastWeek.date_from}","date_to":"${input.lastWeek.date_to}","sort":"newest"}
"biggest expense this month" -> {"type":"expense","sort":"amount_high"}
"salary" -> {"description_contains":"salary","type":"income"}
Return only the JSON, no other text.`;
}

export function buildTransactionSmsPrompt(text: string): string {
  return `From this Indian bank SMS, extract: amount (number), type (income or expense), category (one word), short description, date (YYYY-MM-DD if present), payment source (account or card), and the last 4 digits of the account/card number if present.

Rules:
- payment source must be exactly "account", "card", or "unknown"
- last 4 digits must contain only 4 digits, or be blank if not present
- Keep category to one short word
- Keep description short

Reply in one line using EXACTLY 7 pipe-separated fields in this order:
amount|type|category|description|date|payment_source|last4

SMS: ${text.slice(0, 400)}`;
}

export function buildCardSmsPrompt(text: string): string {
  return `From this bank card SMS, extract: bank name, card name, last 4 digits, card type (credit or debit), credit limit (number if present). Reply: bank|cardname|last4|type|limit. SMS: ${text.slice(0, 400)}`;
}

export function buildInsuranceSmsPrompt(text: string): string {
  return `Extract insurance info from SMS.

You MUST return EXACTLY 10 fields in this FIXED ORDER:
type|provider|policyName|policyNumber|premiumAmount|premiumFrequency|nextDueDate|coverageAmount|insuredMembers|status

Defaults (MANDATORY if missing):
- type: other
- provider: LIC
- policyName: ""
- policyNumber: 0
- premiumAmount: 0
- premiumFrequency: monthly
- nextDueDate: ""
- coverageAmount: 0
- insuredMembers: Unknown
- status: active

Rules:
- ALWAYS return 10 fields separated by "|"
- DO NOT skip or reorder fields
- DO NOT return empty output
- DO NOT add extra text

Field rules:
- type: life/health/vehicle/term/other (LIC → life)
- policyNumber: look for patterns like "policy number", "policy no", "pol no", "pol.no", followed by digits
- premiumAmount, coverageAmount: numeric only
- premiumFrequency: monthly/quarterly/yearly
- nextDueDate: YYYY-MM-DD (convert from DD/MM/YYYY)
- insuredMembers: comma-separated names
- status: active/expired/lapsed/unknown ("revived" or "due" → active)

Example:
life|LIC||123456|0|monthly|2026-04-24|0|Unknown|active

Now extract:

SMS: ${text.slice(0, 500)}`;
}

export function buildInvestmentSmsPrompt(text: string): string {
  return `
Extract investment info from SMS.

You MUST return EXACTLY 12 fields in this FIXED ORDER:
type|name|folioNumber|sipAmount|sipDay|startDate|currentValue|investedAmount|units|nav|platform|status

Defaults (MANDATORY if missing):
- type: other
- name: Investment
- folioNumber: 0
- sipAmount: 0
- sipDay: 0
- startDate: ""
- currentValue: 0
- investedAmount: 0
- units: 0
- nav: 0
- platform: Unknown
- status: active

Rules:
- ALWAYS return 12 fields separated by "|"
- DO NOT skip or reorder fields
- DO NOT add extra text

Field rules:
- type:
  - mutual fund, SIP → mutual_fund
  - stock, shares → stock
  - FD, fixed deposit → fd
- folioNumber: numeric or alphanumeric (no spaces)
- sipAmount, currentValue, investedAmount, nav: numeric only
- sipDay: day of month (1–31)
- units: numeric (can be decimal)
- startDate: YYYY-MM-DD (convert from DD/MM/YYYY)
- platform: AMC/app name (Groww, Zerodha, Paytm Money, CAMS, etc.)
- status:
  - "SIP started", "active" → active
  - "paused", "stopped" → paused
  - "redeemed", "closed", "matured" → closed

Pattern hints:
- sipAmount: "SIP of", "installment", "auto debit"
- sipDay: "on 5th", "every month on"
- folioNumber: "folio no", "folio number"
- units: "units allotted", "units purchased"
- nav: "NAV", "per unit"
- investedAmount: "invested", "total investment"
- currentValue: "current value", "valuation"
- platform: sender/app name

Example:
mutual_fund|Axis Bluechip|123456|5000|5|2024-01-05|120000|100000|150.5|80|Groww|active

Now extract:

SMS:
${normalizeSms(text).slice(0, 300)}
`;
}

export function buildLoanSmsPrompt(text: string): string {
  return `
Extract loan info from SMS.

You MUST return EXACTLY 11 fields in this FIXED ORDER:
name|lender|principalAmount|interestRate|tenureMonths|emiAmount|startDate|nextDueDate|outstandingPrincipal|type|status

Defaults (MANDATORY if missing):
- name: Loan
- lender: Unknown
- principalAmount: 0
- interestRate: 0
- tenureMonths: 0
- emiAmount: 0
- startDate: ""
- nextDueDate: ""
- outstandingPrincipal: 0
- type: other
- status: active

Rules:
- ALWAYS return 11 fields separated by "|"
- DO NOT skip or reorder fields
- DO NOT add extra text

Field rules:
- lender: bank/NBFC name (HDFC, ICICI, SBI, etc.)
- principalAmount, emiAmount, outstandingPrincipal: numeric only
- interestRate: numeric only (no % sign)
- tenureMonths: convert years to months if needed (e.g., 5 years = 60)
- startDate, nextDueDate: YYYY-MM-DD (convert from DD/MM/YYYY)

Pattern hints:
- principalAmount: "loan amount", "sanctioned", "disbursed"
- emiAmount: "EMI", "installment"
- interestRate: "%", "interest"
- tenureMonths: "tenure", "months", "years"
- nextDueDate: "due on", "next EMI"
- outstandingPrincipal: "outstanding", "balance"
- type:
  - home/housing → home
  - car/auto/vehicle → car
  - education/student → education
  - personal → personal
- status:
  - "closed", "foreclosed", "fully paid" → closed
  - "overdue", "missed", "default" → closed
  - EMI mentioned → active

Example:
Loan|HDFC|500000|10|60|12000|2024-01-01|2026-04-10|300000|personal|active

Now extract:

SMS:
${normalizeSms(text).slice(0, 300)}
`;
}
