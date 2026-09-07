CREATE TABLE IF NOT EXISTS payment_accounts (
    id BIGINT NOT NULL AUTO_INCREMENT,
    account_key VARCHAR(80) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    provider_name VARCHAR(100) NOT NULL,
    account_name VARCHAR(160) NULL,
    account_number VARCHAR(120) NULL,
    instructions VARCHAR(1000) NULL,
    available BIT(1) NOT NULL DEFAULT b'1',
    display_order INT NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_payment_accounts_account_key UNIQUE (account_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET @schema_name = DATABASE();

SET @add_payment_account_id = (
    SELECT IF(
        EXISTS (
            SELECT 1
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = @schema_name
              AND TABLE_NAME = 'payments'
              AND COLUMN_NAME = 'payment_account_id'
        ),
        'SELECT 1',
        'ALTER TABLE payments ADD COLUMN payment_account_id BIGINT NULL'
    )
);
PREPARE statement FROM @add_payment_account_id;
EXECUTE statement;
DEALLOCATE PREPARE statement;

SET @add_provider_snapshot = (
    SELECT IF(
        EXISTS (
            SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'payments'
              AND COLUMN_NAME = 'destination_provider_snapshot'
        ),
        'SELECT 1',
        'ALTER TABLE payments ADD COLUMN destination_provider_snapshot VARCHAR(100) NULL'
    )
);
PREPARE statement FROM @add_provider_snapshot;
EXECUTE statement;
DEALLOCATE PREPARE statement;

SET @add_account_name_snapshot = (
    SELECT IF(
        EXISTS (
            SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'payments'
              AND COLUMN_NAME = 'destination_account_name_snapshot'
        ),
        'SELECT 1',
        'ALTER TABLE payments ADD COLUMN destination_account_name_snapshot VARCHAR(160) NULL'
    )
);
PREPARE statement FROM @add_account_name_snapshot;
EXECUTE statement;
DEALLOCATE PREPARE statement;

SET @add_account_number_snapshot = (
    SELECT IF(
        EXISTS (
            SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'payments'
              AND COLUMN_NAME = 'destination_account_number_snapshot'
        ),
        'SELECT 1',
        'ALTER TABLE payments ADD COLUMN destination_account_number_snapshot VARCHAR(120) NULL'
    )
);
PREPARE statement FROM @add_account_number_snapshot;
EXECUTE statement;
DEALLOCATE PREPARE statement;

SET @add_instructions_snapshot = (
    SELECT IF(
        EXISTS (
            SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'payments'
              AND COLUMN_NAME = 'destination_instructions_snapshot'
        ),
        'SELECT 1',
        'ALTER TABLE payments ADD COLUMN destination_instructions_snapshot VARCHAR(1000) NULL'
    )
);
PREPARE statement FROM @add_instructions_snapshot;
EXECUTE statement;
DEALLOCATE PREPARE statement;

SET @add_payment_account_index = (
    SELECT IF(
        EXISTS (
            SELECT 1 FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'payments'
              AND INDEX_NAME = 'idx_payments_payment_account_id'
        ),
        'SELECT 1',
        'ALTER TABLE payments ADD INDEX idx_payments_payment_account_id (payment_account_id)'
    )
);
PREPARE statement FROM @add_payment_account_index;
EXECUTE statement;
DEALLOCATE PREPARE statement;

SET @add_payment_account_fk = (
    SELECT IF(
        EXISTS (
            SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
            WHERE CONSTRAINT_SCHEMA = @schema_name AND TABLE_NAME = 'payments'
              AND CONSTRAINT_NAME = 'fk_payments_payment_account'
        ),
        'SELECT 1',
        'ALTER TABLE payments ADD CONSTRAINT fk_payments_payment_account FOREIGN KEY (payment_account_id) REFERENCES payment_accounts (id) ON UPDATE RESTRICT ON DELETE RESTRICT'
    )
);
PREPARE statement FROM @add_payment_account_fk;
EXECUTE statement;
DEALLOCATE PREPARE statement;
