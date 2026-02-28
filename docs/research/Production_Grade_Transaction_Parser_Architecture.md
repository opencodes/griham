# Production-Grade Financial SMS Transaction Parser Architecture

## 1. High-Level Architecture

Mobile App → SMS Ingestion Service → Message Queue → Parser Engine →
Normalization Layer → Classification Service → Storage → Dashboard

------------------------------------------------------------------------

## 2. Core Design Principles

-   Hybrid Parsing (Rule Engine + ML)
-   Idempotent Processing
-   Auditability
-   Extensibility
-   Versioned Parser

------------------------------------------------------------------------

## 3. Mobile App Layer

### Responsibilities

-   Read financial SMS (Android permission)
-   Filter relevant messages
-   Send to backend API

### API Contract

POST /v1/sms/ingest

Request:

``` json
{
  "user_id": "u_123",
  "sms_id": "android_982734",
  "sender": "AXISBK",
  "body": "INR 1900.00 credited A/c no. XX7810...",
  "received_at": "2026-02-26T18:19:29"
}
```

------------------------------------------------------------------------

## 4. Backend Microservices

### A. SMS Ingestion Service

-   Validate schema
-   Generate sms_hash
-   Push to message queue (Kafka / SQS)

### B. Parser Engine

#### 1. Preprocessing

-   Normalize currency symbols
-   Standardize date format
-   Remove noise

#### 2. Rule Engine

Example Regex:

    INR\s([\d,]+\.\d{2}).*(credited|debited).*(UPI|P2M)

#### 3. ML Classifier

-   Fine-tuned BERT / DistilBERT
-   Outputs:
    -   transaction_type
    -   category
    -   confidence_score

------------------------------------------------------------------------

## 5. Database Design

### sms_raw

-   id (uuid)
-   user_id
-   sender
-   body
-   received_at
-   sms_hash
-   parser_version
-   created_at

### transactions

-   id
-   sms_id
-   user_id
-   amount
-   currency
-   type (credit/debit)
-   transaction_mode (UPI, IMPS, ATM)
-   merchant_name
-   category
-   account_last4
-   transaction_time
-   confidence_score

### parser_logs

-   id
-   sms_id
-   rule_matched
-   ml_used
-   error_message
-   processing_time_ms

------------------------------------------------------------------------

## 6. Category Detection Strategy

Level 1: Keyword Dictionary\
Level 2: Merchant Master Database\
Level 3: ML Classification

------------------------------------------------------------------------

## 7. Scalability Strategy

-   Kafka partitions by user_id
-   Horizontal parser scaling
-   Redis cache for merchant lookup
-   ElasticSearch for transaction search

------------------------------------------------------------------------

## 8. Security

-   Encrypt SMS at rest
-   JWT Authentication
-   PII masking
-   RBAC

------------------------------------------------------------------------

## 9. Monitoring

-   Prometheus
-   Grafana
-   ELK Stack
-   Alerting on:
    -   Parsing failures
    -   ML confidence drop
    -   Queue lag

------------------------------------------------------------------------

## 10. Testing Strategy

-   Unit tests for each bank format
-   Golden dataset (10k+ labeled SMS)
-   Precision/Recall tracking
-   Chaos testing for malformed SMS

------------------------------------------------------------------------

## 11. ML Output Example

``` json
{
  "transaction_type": "UPI_P2M",
  "category": "MEDICAL",
  "amount": 1900.00,
  "confidence": 0.94
}
```

------------------------------------------------------------------------

## 12. Deployment

Kubernetes Deployment:

-   sms-service
-   parser-service
-   classifier-service
-   postgres
-   redis
-   kafka

------------------------------------------------------------------------

## Enterprise Enhancements

-   Auto-learning merchant mapping
-   User correction feedback loop
-   Active learning retraining
-   Real-time anomaly detection
-   Fraud detection signals

------------------------------------------------------------------------

End of Document
