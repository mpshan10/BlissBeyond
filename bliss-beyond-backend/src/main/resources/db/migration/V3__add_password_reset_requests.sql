CREATE TABLE password_reset_requests (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NULL,
  email VARCHAR(120) NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  otp_attempt_count INT NOT NULL DEFAULT 0,
  otp_expires_at DATETIME(6) NOT NULL,
  verified_at DATETIME(6) NULL,
  reset_token_hash CHAR(64) NULL,
  reset_token_expires_at DATETIME(6) NULL,
  used_at DATETIME(6) NULL,
  invalidated_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_password_reset_email_state (email, invalidated_at, used_at, otp_expires_at),
  KEY idx_password_reset_user (user_id),
  UNIQUE KEY uk_password_reset_token_hash (reset_token_hash),
  CONSTRAINT fk_password_reset_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
