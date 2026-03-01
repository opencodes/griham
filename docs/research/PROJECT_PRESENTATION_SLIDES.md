# Griham Project Presentation Slides

## Slide 1: Title
**Griham: AI-Powered Family Finance Intelligence**
- Smart financial tracking for households
- Converts raw financial SMS into structured transactions
- Focus: reliable, low-noise, duplicate-safe ingestion

Speaker cue:
- "We are building a family-first finance platform that turns noisy SMS data into actionable financial intelligence."

## Slide 2: Problem
**What problem are we solving?**
- Financial data is fragmented across bank apps, cards, wallets
- Most users do not manually log daily transactions
- SMS has rich transaction signals but includes heavy noise (OTP/promos)
- Duplicate processing creates wrong balances and trust issues

## Slide 3: Solution
**Our solution**
- Device-side SMS filtering to keep only financial transaction messages
- AI parser to extract transaction details
- Backend idempotency to prevent duplicate inserts
- Unified family dashboard for income, expenses, accounts, cards, bills

## Slide 4: Product Scope
**Current capabilities**
- Family and member management
- Bank accounts, transactions, bills, cards
- AI insights and savings tips
- SMS-to-transaction parser
- Mobile + web interfaces

## Slide 5: Device-side SMS Logic
**ALLOW -> EXCLUDE -> VERIFY -> DEDUPE -> PROCESS**
- Allow only known bank sender patterns
- Exclude OTP/promo keywords
- Verify transaction keyword + amount pattern
- Build local fingerprint from sender + date + message body
- Process only unseen messages

## Slide 6: Backend Safety Logic
**AUTH -> VALIDATE -> IDEMPOTENCY -> PARSE -> SAVE -> RESPOND**
- Authenticate user and family role
- Validate SMS payload
- Use idempotency key (client fingerprint or backend-generated)
- Deduplicate using DB unique constraint
- Return `created` vs `duplicate` safely

## Slide 7: Architecture
**High-level flow**
- Mobile app reads inbox messages
- Rule engine filters likely financial SMS
- API receives selected SMS
- AI parsing service extracts fields
- Finance service writes transaction + updates balance
- Dashboard surfaces insights and trends

Use diagrams:
- `docs/research/SMS_PROCESSOR_UML.md`
- `docs/research/SMS_PROCESSOR.drawio`

## Slide 8: Business Impact
**Why this matters**
- Better transaction capture rate
- Lower manual effort for users
- Fewer false positives from SMS noise
- Duplicate-safe pipeline improves trust in balances
- Foundation for smart alerts and financial coaching

## Slide 9: Progress Snapshot
**Implemented**
- Device SMS filter rules (sender, keyword, amount, OTP/promo skip)
- Local duplicate prevention on mobile
- Backend idempotent SMS processing path
- Duplicate-safe response model (`created` / `duplicate`)

## Slide 10: Metrics to Track
**Success KPIs**
- SMS filter precision (financial vs non-financial)
- Parse success rate
- Duplicate hit rate
- Transaction auto-capture rate
- Monthly active families

## Slide 11: Roadmap
**Next milestones**
- Backend confidence thresholds and retry strategy
- Cross-device dedupe hardening
- Better merchant/category normalization
- Alerting and anomaly detection
- Admin analytics and model feedback loop

## Slide 12: Closing
**Griham turns everyday SMS into reliable family finance intelligence.**
- Fast ingestion
- High signal quality
- Safe, idempotent transaction creation

Call to action:
- "Pilot with live users, measure precision and capture rate, then scale."
