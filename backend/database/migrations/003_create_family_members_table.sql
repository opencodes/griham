CREATE TABLE IF NOT EXISTS family_members (
    id VARCHAR(36) PRIMARY KEY,
    family_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    role VARCHAR(50) DEFAULT 'member',
    relation VARCHAR(50) NULL,
    status VARCHAR(50) DEFAULT 'active',
    invitation_email VARCHAR(255),
    invitation_sent_at TIMESTAMP NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_family_user (family_id, user_id),
    INDEX idx_family_id (family_id),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
