# SMS Processor (Short)

## Remember This
ALLOW -> EXCLUDE -> VERIFY -> DEDUPE -> PROCESS

## Device Logic
1. Allow sender only if it matches known bank sender list.
2. Exclude message if it contains OTP/promo words.
3. Verify message has:
- transaction keyword: debited/credited/spent/UPI/IMPS/NEFT/EMI
- amount pattern: currency + number
4. Build fingerprint from sender + date + normalized message.
5. If fingerprint already processed, skip.
6. If not processed, call parse API.
7. Mark fingerprint processed only on success.

### Local Processed Store
- Processed SMS fingerprints are saved in local app preferences.
- Preference key: `processed_sms_fingerprints_v1`
- Checked before API call to skip already processed SMS.
- Saved only after successful response (`200/201`).
- Retention cap: latest `1000` fingerprints (older entries trimmed).

## Backend Logic
AUTH -> VALIDATE -> IDEMPOTENCY -> PARSE -> SAVE -> RESPOND

1. Authenticate user and family access.
2. Validate SMS text (+ optional sender/date/fingerprint).
3. Use idempotency key (client fingerprint or backend-generated).
4. Check duplicate in DB using unique constraint (family + idempotency key).
5. If duplicate, return existing transaction (idempotent success).
6. If new, parse SMS, create transaction, store ingestion log in one DB transaction.
7. Respond with created/duplicate status and transaction id.

## API Details
- Method: `POST`
- Endpoint: `/api/finance/ai/parse-sms/{familyId}`
- Base URL (mobile): `https://griham.opencodes.dev`
- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>`
- Request body (current):
```json
{
  "sms_text": "Your A/c XX1234 debited with Rs.5000..."
}
```
- Request body (recommended for stronger dedupe):
```json
{
  "sms_text": "Your A/c XX1234 debited with Rs.5000...",
  "sender": "HDFCBK",
  "sms_date": 1740781800000,
  "fingerprint": "normalizedSender|smsDate|normalizedBody"
}
```
- Success responses:
  - `201` -> `status: created`
  - `200` -> `status: duplicate`

## Why
- Less noise from OTP/promotions
- Fewer useless API calls
- No duplicate transaction creation

## Diagrams
- UML: docs/research/SMS_PROCESSOR_UML.md
- Draw.io: docs/research/SMS_PROCESSOR.drawio
