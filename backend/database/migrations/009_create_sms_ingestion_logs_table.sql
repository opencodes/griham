CREATE TABLE IF NOT EXISTS sms_ingestion_logs (
    id VARCHAR(36) PRIMARY KEY,
    family_id VARCHAR(36) NOT NULL,
    idempotency_key CHAR(64) NOT NULL,
    sender VARCHAR(64) NULL,
    sms_date BIGINT NULL,
    sms_preview VARCHAR(255) NULL,
    transaction_id VARCHAR(36) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'processing',
    created_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_family_idempotency (family_id, idempotency_key),
    INDEX idx_sms_ingestion_transaction_id (transaction_id),
    INDEX idx_sms_ingestion_created_at (created_at),
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
