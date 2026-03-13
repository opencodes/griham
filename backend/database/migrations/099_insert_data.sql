INSERT INTO `griham_db`.`users` (`id`,`email`,  `password`, `full_name`, `phone`, `role`, `is_active`, `created_at`, `updated_at`) 
VALUES (UUID(), 'admin@griham.com', SHA2('User@123456', 256), 'Admin User', '9876543210', 'admin', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO `griham_db`.`users` (`id`,`email`,  `password`, `full_name`, `phone`, `role`, `is_active`, `created_at`, `updated_at`) 
VALUES (UUID(), 'root@griham.com', SHA2('Root@123456', 256), 'Root User', '9876543211', 'root', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO `griham_db`.`users` (`id`,`email`,  `password`, `full_name`, `phone`, `role`, `is_active`, `created_at`, `updated_at`) 
VALUES (UUID(), 'root@griham.com', SHA2('Root@123456', 256), 'Root User', '9876543210', 'root', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
