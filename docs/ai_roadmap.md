# AI Roadmap – Griham

Suggested and listed places where AI can be used across the Griham home management platform.

---

## 1. Already Using or Planned AI (Finance)

| Place | What It Does | Where in Codebase |
|-------|----------------|-------------------|
| **SMS → Transaction** | Parse bank SMS into transaction (amount, date, category, merchant, etc.) | `SMSParser.tsx` → `POST /finance/ai/parse-sms/{familyId}` |
| **SMS → Card** | Parse card SMS into card record | `CardSMSParser.tsx` → `POST /finance/ai/parse-sms-card/{familyId}` |
| **Financial insights** | Health assessment, observations, recommendations | `GET /finance/ai/insights/{familyId}` (see AI_Implementation.md) |
| **Savings tips** | Tips from spending by category | `GET /finance/ai/savings-tips/{familyId}` (see AI_Implementation.md) |

---

## 2. Dashboard & Overview

| Use Case | Idea | Where to Plug In |
|----------|------|-------------------|
| **AI summary for “Household Overview”** | One short paragraph summarizing families, finance, and module status (instead of only raw numbers). | `Dashboard.tsx` – “AI Command Center” hero section (lines ~221–241). |
| **Smarter “Risk Radar”** | Use AI to suggest risks (e.g. “spending up 20% vs last month”, “bills due in same week as low balance”) beyond fixed rules. | `Dashboard.tsx` – `risks` useMemo and Risk Radar block (lines ~191–322). |
| **Module Pulse text** | Per-module one-liner (e.g. “Finance: healthy; 2 bills due this week”) instead of only counts. | Same Module Pulse cards in `Dashboard.tsx`. |

---

## 3. Transactions

| Use Case | Idea | Where to Plug In |
|----------|------|-------------------|
| **Auto-category from description** | When user types description (or pastes SMS), suggest/auto-fill category (and optionally type). | `Transactions.tsx` – Add Transaction modal; trigger on `description` or when creating from parsed SMS. |
| **Smart search** | Natural language search, e.g. “coffee last week” or “biggest expense this month”. | `Transactions.tsx` – search/filter area (lines ~366–416); add an “AI search” mode or interpret query. |
| **Spending insights per category** | Short AI explanation for a category (e.g. “Food is 25% of expenses; above your usual”). | Transaction list or a “Category insights” panel on Transactions or Finance Overview. |
| **Duplicate / anomaly detection** | Flag possible duplicates or unusual amounts/dates. | After loading transactions (e.g. in `loadTransactions` or a dedicated “Review” view). |

---

## 4. Finance Overview

| Use Case | Idea | Where to Plug In |
|----------|------|-------------------|
| **Narrative summary** | 2–3 sentence summary of the month (income, expenses, bills, trend). | `FinanceOverview.tsx` – above or below the summary cards (lines ~137–169). |
| **“Ask about this month”** | Simple Q&A: “Why is expense high?” “What were the top 3 categories?” | New small chat or Q&A widget on Finance Overview. |

---

## 5. Bills

| Use Case | Idea | Where to Plug In |
|----------|------|-------------------|
| **Bill name → category** | From bill name (e.g. “Airtel Broadband”) suggest category (e.g. Internet). | `Bills.tsx` – Create Bill form; suggest category from `bill_name`. |
| **Due-date / cash-flow tips** | “3 bills due in 5 days; balance might be short by ₹X” or “Consider paying Y before Z.” | Bills list or Dashboard Risk Radar. |
| **Recurrence from description** | If user pastes bill text, infer name, amount, due date, recurrence. | Same flow as SMS parsing: new “Parse from bill text” in Bills. |

---

## 6. Events (from docs)

| Use Case | Idea | Where to Plug In |
|----------|------|-------------------|
| **Event from natural language** | “Add birthday for Mom on 15 March” → create event with type, title, date. | Events module (when built) – create event form or a small “Add with AI” input. |
| **Gift / reminder suggestions** | E.g. “Suggest gifts for upcoming birthdays” or “Remind 3 days before.” | Event detail or list view. |

---

## 7. Organizer (Tasks, Notes, Shopping – from docs)

| Use Case | Idea | Where to Plug In |
|----------|------|-------------------|
| **Task from natural language** | “Remind me to pay electricity tomorrow” → task + due date + reminder. | Organizer / Tasks create form. |
| **Shopping list from text** | Paste “milk, bread, eggs” or a recipe → list of items. | Shopping list create/edit. |
| **Note summarization / tags** | Summarize long note or suggest tags. | Notes list or editor. |
| **Priority / assignee suggestion** | Suggest priority or assignee from task title/description. | Task create form. |

---

## 8. Health (from docs)

| Use Case | Idea | Where to Plug In |
|----------|------|-------------------|
| **Extract from prescription / report** | Parse image or text of prescription/lab report into structured fields. | Health module – add “Add from photo/text” for records. |
| **Next dose / appointment phrasing** | “When is the next vaccination?” answered from health data. | Health dashboard or a small Q&A. |
| **Medication reminders** | Smarter reminder text (e.g. “Take with food”) from prescription text. | When building reminders. |

---

## 9. Contacts

| Use Case | Idea | Where to Plug In |
|----------|------|-------------------|
| **Contact from message** | Parse “Call plumber Raj 9876543210” into contact (name, role, phone). | Contacts create flow. |
| **Relationship / role from name** | Suggest relation or category from name/context. | Contact form. |

---

## 10. Messaging & Notifications

| Use Case | Idea | Where to Plug In |
|----------|------|-------------------|
| **Smart notifications** | Summarize multiple alerts (e.g. “3 bills due, 1 overdue”) in one line. | Messaging/notification layer. |
| **Intent from in-app message** | “Pay electricity” → link to Bills or suggest payment. | Message Center / notification actions. |

---

## 11. Global / UX

| Use Case | Idea | Where to Plug In |
|----------|------|-------------------|
| **Assistant / chat** | One place to “Ask about my home”: finance, events, tasks, health in one chat. | New route or sidebar entry, e.g. “Ask Griham” or “Assistant”. |
| **Onboarding tips** | Contextual tips per page (e.g. “You can add transactions from SMS here”). | Dashboard and main modules. |
| **Accessibility** | Alt text or short summaries for charts/tables for screen readers. | Finance Overview, Dashboard, any charts. |

---

## Suggested Implementation Order

1. **Dashboard** – AI summary for “Household Overview” and smarter Risk Radar (reuse existing insights/context).
2. **Transactions** – Auto-category from description (and from parsed SMS) in the Add Transaction flow.
3. **Finance Overview** – Narrative summary of the month using existing summary/insights API if available.
4. **Bills** – Category suggestion from bill name in Create Bill.
5. **Assistant** – Single “Ask Griham” chat that can query finance (and later events, health, etc.).

---

## Related Docs

- [AI_Implementation.md](AI_Implementation.md) – Technical design for current finance AI (insights, savings tips, parse-sms).
- [FINANCE.md](FINANCE.md) – Finance module features and schema.
