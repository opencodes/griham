Great—here’s a practical build list from the plan.

**Apps**
- `Web App` (React): Dashboard, Transactions, Insights, Admin, Settings
- `Mobile App` (Android first, then iOS): SMS capture + sync + corrections
- `Backend API` (core services): Auth, household/finance APIs, ingestion APIs
- `ML Inference Service`: classification + confidence scoring
- `Data/Analytics Platform`: reporting, aggregates, model feedback loop

**Core Product Components (User-facing)**
- Auth (`login/signup/forgot/OTP/session-expired`)
- Onboarding (`permission flow`, first-scan progress, category setup)
- Dashboard (`KPI cards`, trends, smart insights, quick actions)
- Transaction Explorer (`search`, filters, grouping, detail drawer)
- Category Manager (`rules`, merchant mapping, manual correction)
- Alerts & Notifications (`bill due`, anomalies, low-confidence items)
- Reports (`monthly`, export CSV/PDF, compare periods)
- Settings (`profile`, security, integrations, billing)

**Admin/Operations Components**
- Admin Console (`user ops`, parser health, queue health)
- Accuracy Monitor (`precision/recall`, confidence distribution)
- Feedback Review Queue (`low-confidence + user corrections`)
- Model Registry UI (`version history`, rollout status)
- Audit & Compliance (`PII masking checks`, access logs)

**Backend/Platform Components**
- SMS Ingestion Service
- Preprocessing + Rule Parser Engine
- ML Classification + Entity Extraction
- Confidence Router (`auto-approve` vs `review queue`)
- Merchant Normalization Service
- Transaction Service + Search
- Event Queue (Kafka), Cache (Redis), DB (Postgres), Observability stack

If you want, I can turn this into a **Sprint 1–3 build checklist** with dependencies and ownership (UI/Backend/Mobile).


Absolutely — here’s a focused parser hardening checklist including SMS filtering.

Current baseline: parsing endpoint works (backend/public/index.php:118, backend/src/Modules/AI/Controllers/AIController.php:84), but mobile inbox flow currently sends raw SMS without robust financial filtering (mobile_app/griham_app/lib/screens/sms_list_screen.dart:74, mobile_app/griham_app/lib/screens/sms_reader_screen.dart:38).


1) Device-side SMS Filtering: sender allowlist (HDFC, ICICI, etc), keyword rules (debited|credited|spent|UPI|IMPS|NEFT|EMI), regex amount check, skip OTP/promotions.

2) Backend Guard Filter: re-validate message type server-side before AI call; reject non-financial SMS with reason code.
3) Dedupe + Idempotency: create sms_hash (sender+body+timestamp normalized), unique constraint, ignore repeats.
4) Parsing Reliability: fallback parser (rules/regex) when HF unavailable; keep LLM as second stage.
5) Data Mapping Upgrade: save all parsed fields (merchant_name, currency, confidence_score, etc.) from parse endpoint into transactions (currently only core fields are persisted).
6) Confidence Routing: auto-create only if confidence >= threshold; otherwise store as “needs review” queue in UI.
7) Account Resolution: map SMS to correct account/card by account_last4 (avoid always using first family account).
8) Async Processing: queue ingestion + worker retries + dead-letter for failed parses; keep API responsive.
9) Observability: metrics for filter hit-rate, parse success rate, low-confidence %, and false-positive filtered SMS.
10) Security/Compliance: PII masking in logs, redact full account numbers, audit trail for parser decisions.
If you want, I can convert this into a 2-sprint implementation backlog directly for your current codebase.