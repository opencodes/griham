CREATE TABLE IF NOT EXISTS user_devices (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    device_id VARCHAR(100) NOT NULL,
    device_name VARCHAR(120) NULL,
    platform VARCHAR(40) NULL,
    os_version VARCHAR(255) NULL,
    app_version VARCHAR(40) NULL,
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_user_device (user_id, device_id),
    INDEX idx_user_devices_user_id (user_id),
    INDEX idx_user_devices_platform (platform),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
