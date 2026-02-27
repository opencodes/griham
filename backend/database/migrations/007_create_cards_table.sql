CREATE TABLE IF NOT EXISTS cards (
    id VARCHAR(36) PRIMARY KEY,
    family_id VARCHAR(36) NOT NULL,
    card_type ENUM('credit', 'debit') NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    card_name VARCHAR(100) NOT NULL,
    last_four_digits VARCHAR(4) NOT NULL,
    card_limit DECIMAL(15, 2) DEFAULT NULL,
    billing_date INT DEFAULT NULL,
    status ENUM('active', 'inactive', 'blocked') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
    INDEX idx_family_id (family_id),
    INDEX idx_card_type (card_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
