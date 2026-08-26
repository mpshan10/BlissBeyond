-- Controlled, non-destructive conversion of the existing customer notification table.
-- Existing rows are copied into the new columns before legacy columns are removed.
ALTER TABLE notifications
    DROP FOREIGN KEY FKc94cts1ygm7394xj40x1yov1k,
    ADD COLUMN recipient_user_id BIGINT NULL AFTER id,
    ADD COLUMN actor_user_id BIGINT NULL AFTER recipient_user_id,
    ADD COLUMN severity VARCHAR(20) NOT NULL DEFAULT 'INFO' AFTER type,
    ADD COLUMN reference_type VARCHAR(40) NULL AFTER severity,
    ADD COLUMN action_url VARCHAR(500) NULL AFTER reference_id,
    ADD COLUMN read_at DATETIME(6) NULL AFTER action_url,
    ADD COLUMN dedupe_key CHAR(64) NULL AFTER read_at,
    MODIFY COLUMN type VARCHAR(60) NOT NULL;

UPDATE notifications
SET recipient_user_id = customer_id,
    action_url = related_path,
    read_at = CASE WHEN is_read = b'1' THEN created_at ELSE NULL END,
    dedupe_key = SHA2(CONCAT('LEGACY_NOTIFICATION:', id), 256);

ALTER TABLE notifications
    MODIFY COLUMN recipient_user_id BIGINT NOT NULL,
    MODIFY COLUMN dedupe_key CHAR(64) NOT NULL,
    DROP INDEX FKc94cts1ygm7394xj40x1yov1k,
    ADD UNIQUE KEY uk_notifications_recipient_dedupe (recipient_user_id, dedupe_key),
    ADD KEY idx_notifications_recipient_created (recipient_user_id, created_at, id),
    ADD KEY idx_notifications_recipient_unread (recipient_user_id, read_at, created_at),
    ADD KEY idx_notifications_reference (reference_type, reference_id),
    ADD CONSTRAINT fk_notifications_recipient FOREIGN KEY (recipient_user_id)
        REFERENCES users (id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_notifications_actor FOREIGN KEY (actor_user_id)
        REFERENCES users (id) ON DELETE SET NULL,
    DROP COLUMN customer_id,
    DROP COLUMN related_path,
    DROP COLUMN is_read,
    DROP COLUMN fingerprint;
