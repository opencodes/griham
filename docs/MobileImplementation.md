# Mobile Implementation

## Base URL
- `https://griham.opencodes.dev/api`

## Auth/Header
- `Content-Type: application/json`
- `Authorization: Bearer <auth_token>` (when token exists)

## Active APIs (Current Mobile App)
Only the endpoints below are actively used by the current mobile flow.

1. `POST /api/auth/login`
- Purpose: user login
- Request: `{ email, password }`
- Used by: `AuthProvider`

2. `GET /api/families`
- Purpose: fetch family list and persist selected family id
- Used by: `AuthProvider`

3. `GET /api/finance/accounts/{familyId}`
- Purpose: fetch bank accounts
- Used by: `FinanceProvider`

4. `GET /api/finance/bills/{familyId}`
- Purpose: fetch bills
- Used by: `FinanceProvider`

5. `GET /api/finance/cards/{familyId}`
- Purpose: fetch cards
- Used by: `FinanceProvider`

6. `GET /api/finance/transactions/{familyId}`
- Purpose: fetch transactions
- Used by: `FinanceProvider`

7. `POST /api/finance/ai/parse-sms/{familyId}`
- Purpose: parse SMS and create transaction
- Used by: device SMS processing flow
- Request (current): `{ sms_text }`
- Request (optional metadata supported): `{ sms_text, sender, sms_date, fingerprint }`
- Responses:
  - `201` -> created
  - `200` -> duplicate/idempotent replay

## Quick Endpoint List
- `POST /api/auth/login`
- `GET /api/families`
- `GET /api/finance/accounts/{familyId}`
- `GET /api/finance/bills/{familyId}`
- `GET /api/finance/cards/{familyId}`
- `GET /api/finance/transactions/{familyId}`
- `POST /api/finance/ai/parse-sms/{familyId}`

## Mobile SMS Processing Notes
- Local dedupe store key: `processed_sms_fingerprints_v1`
- Fingerprint saved only on successful parse response (`200/201`)
- Local dedupe checked before API call
