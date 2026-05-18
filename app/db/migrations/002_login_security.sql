USE webshop;

ALTER TABLE users
  ADD COLUMN failed_login_count INT NOT NULL DEFAULT 0,
  ADD COLUMN locked_until DATETIME NULL,
  ADD COLUMN unlock_token_hash VARCHAR(64) NULL,
  ADD COLUMN unlock_token_expires_at DATETIME NULL;

CREATE TABLE IF NOT EXISTS login_attempts (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    user_id      INT NULL,
    email        VARCHAR(100) NOT NULL,
    ip_address   VARCHAR(45) NOT NULL,
    success      TINYINT(1) NOT NULL DEFAULT 0,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_ip_time (ip_address, attempted_at),
    INDEX idx_email_time (email, attempted_at),
    INDEX idx_user_time (user_id, attempted_at)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
