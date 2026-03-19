
### AskMonthPrompt
```
You are a financial assistant.

You MUST follow these rules:
- Answer in EXACTLY 1 to 3 short sentences
- NO bullet points, NO extra commentary
- Use ONLY the provided data
- DO NOT guess or invent missing values
- If answer is not present in data, say: "Data not available"

Data for this month${monthLabel}:
- income: ${input.total_income}
- expenses: ${input.total_expense}
- savingsRate: ${input.savings_rate}%
- pendingBills: ${input.upcoming_bills}
- lastMonthIncome: ${input.prev_income}
- lastMonthExpenses: ${input.prev_expense}

Category breakdown (format: category|amount):
${input.categoryLines}

Instructions:
- Prefer exact numbers from data
- For comparisons:
  - expenses > lastMonthExpenses → "higher than last month"
  - expenses < lastMonthExpenses → "lower than last month"
  - equal → "same as last month"
- Keep answers factual and minimal

User question:
${input.question}

Answer:

```
### NarrativeSummaryPrompt

```
Generate a financial summary.

You MUST follow these rules:
- Output EXACTLY 2 or 3 short sentences
- NO bullet points, NO emojis
- Keep tone neutral and concise
- Do NOT add extra commentary

Data:
This month${monthLabel}:
- income: ${input.total_income}
- expenses: ${input.total_expense}
- savingsRate: ${input.savings_rate}%
- pendingBills: ${input.upcoming_bills}.${trend}

Instructions:
- Sentence 1: summarize income vs expenses
- Sentence 2: mention savings rate and pending bills
- Sentence 3 (ONLY if previous data exists): compare with last month (spending up/down)

Rules:
- If expenses > previous expenses → "spending increased"
- If expenses < previous expenses → "spending decreased"
- If equal → "spending unchanged"
- If no previous data → DO NOT write comparison sentence

Output:
Plain text only (2–3 sentences).
```

### CategoryInsightsPrompt
```
Generate category-wise spending insights.

You MUST follow these rules:
- Output EXACTLY one sentence per category
- Maintain SAME ORDER as input
- NO numbering, NO bullets
- Each sentence MUST be under 15 words
- Output ONLY plain text lines

Format for EACH line:
<category> is <percent>% of expenses; <trend>

Where:
- <trend>:
  - "above your usual" → if this month's % > last month's %
  - "below your usual" → if this month's % < last month's %
  - "same as usual" → if equal OR previous data missing

Rules:
- DO NOT skip any category
- DO NOT merge lines
- DO NOT add extra explanation

Input categories (format: category|thisMonth%|lastMonth%):
${input.lines}

Example:
Food|25|20
Transport|12|15

Output:
Food is 25% of expenses; above your usual
Transport is 12% of expenses; below your usual
```
### RiskSuggestionsPrompt
```
Generate financial risk alerts.

You MUST follow these rules:
- Output EXACTLY 2 to 5 lines
- Each line MUST be a short sentence (under 15 words)
- NO numbering, NO bullets
- Output ONLY plain text lines
- DO NOT add explanations

Rules for risks:
- Focus ONLY on real risks from data
- Prefer numeric insights (%, amounts)
- Be concise and factual

Data:
- income: ${input.total_income}
- expenses: ${input.total_expense}
- savingsRate: ${input.savings_rate}%
- balance: ${input.total_balance}
- lastMonthIncome: ${input.prevIncome}
- lastMonthExpenses: ${input.prevExpense}
${input.incomePct != null ? `- incomeChange: ${input.incomePct}%` : ""}
${input.expensePct != null ? `- expenseChange: ${input.expensePct}%` : ""}
- bills: ${input.billsSummary}

Instructions:
- If expenseChange > 0 → mention "spending increased X%"
- If incomeChange < 0 → mention "income decreased X%"
- If savingsRate < 20 → flag low savings
- If balance is low relative to expenses → warn about cash flow
- If bills due soon → highlight urgency
- If no strong risks → output: "No additional risks."

Output:
Only risk lines.
```
### CashflowTipsPrompt
```
Generate cash-flow tips.

You MUST follow these rules:
- Output EXACTLY 1 to 3 lines
- Each line MUST be a short sentence (under 15 words)
- NO numbering, NO bullets
- Output ONLY plain text lines
- DO NOT add explanations

Data:
- balance: ${input.total_balance}
- billsDueIn5Days: ${input.billsDueIn5Count}
- totalDueIn5Days: ${input.totalDueIn5}
${input.shortfall5 > 0 ? `- shortfall: ${input.shortfall5}` : ""}
- bills: ${input.billLines}

Instructions:
- If shortfall > 0 → include "balance might be short by X"
- If billsDueIn5Days > 0 → mention urgency (e.g., "N bills due in 5 days")
- Suggest prioritization when multiple bills exist ("pay X before Y")
- Prefer numeric clarity (amounts, counts)
- If no issues → output: "No immediate cash flow concerns."

Output:
Only tips, one per line.
```
### InsightsPrompt
```
Generate a "Household Overview".

You MUST follow these rules:
- Output EXACTLY 1 paragraph
- Paragraph MUST contain 3 to 5 sentences
- NO bullet points, NO extra commentary
- Keep tone practical, concise, and slightly motivating

Data:
- members: ${input.members}
- totalBalance: ${input.total_balance}
- income: ${input.total_income}
- expenses: ${input.total_expense}
- savingsRate: ${input.savings_rate}%
- pendingBills: ${input.upcoming_bills}
- accounts: ${input.accounts}
- transactions: ${input.transactions}
- cards: ${input.cards}

Instructions:
Sentence 1:
- Mention household size (members)

Sentence 2:
- Summarize financial position:
  balance, income, expenses, savings rate

Sentence 3:
- Mention bills + activity:
  pending bills, accounts, transactions, cards

Sentence 4 (optional but recommended):
- Mention Finance module is active
- Briefly note other modules available:
  Events, Assets, Health, Contacts, Organizer, Messages

Rules:
- Use simple clear language
- Avoid repetition
- Do NOT invent any data

Output:
One paragraph only.
```
### SavingsTipsPrompt
```
Generate savings tips for a household.

You MUST follow these rules:
- Output EXACTLY 3 lines
- Each line MUST be a short sentence (under 15 words)
- NO numbering, NO bullets
- Output ONLY plain text lines
- Focus on daily habits and subscriptions
- Tips must be practical and actionable

Rules:
- Prefer simple actions (reduce, cancel, track, switch)
- Avoid generic advice
- Do NOT repeat similar tips

Example:
Track daily expenses to identify unnecessary spending
Cancel unused subscriptions to reduce monthly costs
Set a weekly budget for discretionary spending

Output:
Only 3 lines.
```
### InterpretSearchPrompt
```
Convert a transaction search query into a JSON object.

You MUST follow these rules:
- Output ONLY valid JSON
- DO NOT add any text before or after JSON
- ALWAYS include ALL keys
- Use null if value is not present

JSON schema (STRICT):
{
  "description_contains": string | null,
  "category": string | null,
  "type": "income" | "expense" | null,
  "date_from": "YYYY-MM-DD" | null,
  "date_to": "YYYY-MM-DD" | null,
  "sort": "newest" | "oldest" | "amount_high" | "amount_low" | null
}

Context:
- Today: ${input.today}
- Current month: ${input.month || "not set"}
- Last week: ${input.lastWeek.date_from} to ${input.lastWeek.date_to}

Rules:
- description_contains: keyword from query (merchant/category)
- category: one word only (food, travel, bills, shopping, etc.)
- type:
  - income → salary, credited, received
  - expense → paid, spent, debited
- date handling:
  - "today" → date_from = date_to = today
  - "yesterday" → yesterday date
  - "last week" → use given lastWeek range
  - "this month" → use current month context if available
- sort:
  - "latest", "recent" → newest
  - "oldest" → oldest
  - "highest", "biggest" → amount_high
  - "lowest", "smallest" → amount_low

Rules:
- DO NOT guess unknown values
- DO NOT omit keys
- DO NOT return partial JSON
- Ensure valid JSON formatting (quotes, commas)

Examples:
"coffee last week" →
{"description_contains":"coffee","category":"food","type":"expense","date_from":"${input.lastWeek.date_from}","date_to":"${input.lastWeek.date_to}","sort":"newest"}

"biggest expense this month" →
{"description_contains":null,"category":null,"type":"expense","date_from":null,"date_to":null,"sort":"amount_high"}

"salary" →
{"description_contains":"salary","category":null,"type":"income","date_from":null,"date_to":null,"sort":"newest"}

Now convert:

Query:
"${input.query}"

Output:
```
### TransactionSmsPrompt
```
Extract transaction info from Indian bank SMS.

You MUST return EXACTLY 5 fields in this FIXED ORDER:
amount|type|category|description|date

Defaults (MANDATORY if missing):
- amount: 0
- type: expense
- category: other
- description: transaction
- date: ""

Rules:
- ALWAYS return 5 fields separated by "|"
- DO NOT skip or reorder fields
- DO NOT add extra text

Field rules:
- amount: numeric only (no ₹, INR)
- type:
  - credited, received → income
  - debited, spent, paid → expense
- category (one word only):
  - food, shopping, travel, bills, atm, transfer, salary, recharge, fuel, other
- description: short text (merchant or purpose)
- date: YYYY-MM-DD (convert from DD/MM/YYYY if present)

Pattern hints:
- amount: "Rs", "INR", "debited", "credited"
- type: "credited", "debited", "withdrawn", "paid"
- category:
  - ATM → atm
  - UPI → transfer
  - petrol/fuel → fuel
  - restaurant/zomato/swiggy → food
- description: merchant name or payment note
- date: "on", "at", or DD/MM/YYYY

Example:
500|expense|food|Zomato|2026-03-19

Now extract:

SMS:
${normalizeSms(text).slice(0, 300)}
```
### CardSmsPrompt
```
Extract bank card info from SMS.

You MUST return EXACTLY 5 fields in this FIXED ORDER:
bank|cardName|last4|type|limit

Defaults (MANDATORY if missing):
- bank: Unknown
- cardName: Card
- last4: 0000
- type: other
- limit: 0

Rules:
- ALWAYS return 5 fields separated by "|"
- DO NOT skip or reorder fields
- DO NOT add extra text

Field rules:
- bank: bank name (HDFC, ICICI, SBI, Axis, etc.)
- cardName: card variant if mentioned (Platinum, Rewards, etc.)
- last4: last 4 digits of card (look for patterns like XXXX1234, **1234, ending 1234)
- type:
  - "credit card" → credit
  - "debit card" → debit
  - else → other
- limit: numeric only (credit limit if mentioned)

Pattern hints:
- last4: "ending", "XXXX", "****", "card xx1234"
- limit: "limit", "credit limit", "available limit"

Example:
HDFC|Platinum|1234|credit|200000

Now extract:

SMS:
${normalizeSms(text).slice(0, 300)}
```
### InsuranceSmsPrompt
```
Extract insurance info from SMS.

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
```
### InvestmentSmsPrompt
```
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
```
### LoanSmsPrompt
```
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
```
