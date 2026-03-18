# Griham — AI roadmap (customer experience)

This document proposes **additional AI capabilities** to reduce friction and improve outcomes for households. It complements what already exists (finance insights, risk radar, Q&A on the month, NL transaction search, SMS parsing, category suggestions, contact cleanup).

Priorities are indicative: **P0** = high impact / common pain, **P1** = strong differentiator, **P2** = nice-to-have or later phase.

---

## Principles

- **Opt-in & transparent** — User chooses when AI runs; show when answers are AI-generated.
- **Grounded in their data** — Prefer answers tied to accounts, transactions, bills the user already entered.
- **Short, actionable** — One screen, one job: summaries and next steps, not essays.
- **Fallbacks** — If AI is off or fails, core flows still work manually.

---

## P0 — High impact, everyday ease

### 1. **Voice & quick capture**

- Voice note → draft transaction or bill (“Paid electricity 3200 yesterday”) with user confirm before save.
- Reduces typing on mobile; critical for adoption.

### 2. **Receipt / bill photo → structured entry**

- Photo of receipt or utility bill → amount, merchant, date, suggested category; user edits and confirms.
- Pairs well with existing category suggestion.

### 3. **Proactive “this week” digest**

- Push or in-app card: “This week: 2 bills due, spending vs last week, one suggested action.”
- Uses same aggregates as risk/cashflow; packaged as a **weekly narrative**.

### 4. **Duplicate & anomaly detection**

- Flag likely duplicate transactions, suspicious amount spikes, or recurring charges that changed.
- Short explanation: “Similar ₹2,500 debit on Mar 10 and Mar 12 — same merchant?”

### 5. **Plain-language onboarding coach**

- After signup: “Tell me in one sentence what you want to track” → suggested setup (add account, first bill, invite member).
- Lowers blank-page anxiety.

---

## P1 — Strong differentiation

### 6. **Goal-based planning**

- User sets goals (“Save ₹50k for trip by Dec”) → AI suggests monthly tuck-away amount from current income/expense patterns (informational, not advice).
- Monthly check-in: “You’re on track / behind by ~X.”

### 7. **Bill negotiation & renewal reminders**

- From bill names + amounts: “Your broadband bill renewed — compare plans?” with generic checklist (no partner bias unless you add partners later).
- Renewal date awareness from recurring bills.

### 8. **Family-aware insights**

- Respect permissions: “Spending visible to you this month…” for shared vs private views where product allows.
- Suggested **conversation starters** for couples: “Food spend is up 15%; want to set a weekly cap?”

### 9. **Smart contact enrichment (privacy-safe)**

- Optional: suggest missing last names, company from email domain, or merge hints — **only with explicit confirm**, no auto-write to phone OS contacts without consent.

### 10. **Natural language dashboard**

- “Show me everything due before salary day” → composes filters across bills + balance (rule-backed + LLM for intent).

### 11. **Multi-language summaries**

- Insights, risk lines, and Q&A in user’s preferred language (Hindi, Tamil, etc.) while data stays in app language.

---

## P2 — Deeper / later phases

### 12. **Events & reminders assistant**

- “Kids’ school fee due next month — add to bills?” from pasted text or photo of notice.

### 13. **Health module assistant** (when module is real)

- Summarize medication schedules or appointment reminders from user-entered notes (no medical diagnosis; reminders only).

### 14. **Document vault helper**

- User uploads policy PDF → extract policy number, renewal date, premium (metadata only); store encrypted; user verifies.

### 15. **Chat continuity**

- Threaded assistant that remembers **this session’s** questions about the selected month (context window), not full history forever unless product decides.

### 16. **Fraud / scam awareness nudges**

- Generic education when user pastes SMS that looks like phishing (“Banks don’t ask for PIN by SMS”) — careful tone, no false alarms.

---

## Cross-cutting (any phase)

| Theme | Idea |
|-------|------|
| **Trust** | “Why did you say this?” — one-line citation: “Based on Food ₹18k vs ₹14k last month.” |
| **Cost control** | Batch or cache similar requests; smaller models for classification, larger only for narrative. |
| **Accessibility** | Screen-reader friendly summaries; high-contrast “key number” extraction from paragraphs. |
| **Compliance** | Disclaimers on non-advice; no guaranteed returns; regional regulations for “financial advice.” |

---

## Suggested implementation order (lean)

1. **Voice / quick text → transaction draft** (P0) — reuses category + date parsing patterns.  
2. **Weekly digest** (P0) — reuses aggregates + narrative prompt.  
3. **Receipt photo** (P0) — needs OCR pipeline (e.g. cloud vision API + LLM structuring).  
4. **Duplicates & anomalies** (P0) — mostly rules + short LLM explanation.  
5. **Goals + on-track** (P1) — simple math + one narrative template.  

---

## Out of scope (for this roadmap)

- Fully automated trading or investment advice.  
- Sharing data with third parties without explicit consent.  
- Replacing licensed financial planners for regulated use cases.  

---

*AiRoadmap.md — living doc; revise as product scope and compliance posture evolve.*
