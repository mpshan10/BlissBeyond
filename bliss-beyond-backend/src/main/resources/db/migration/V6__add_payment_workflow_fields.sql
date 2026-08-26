ALTER TABLE bookings
    ADD COLUMN deposit_requested_at DATETIME(6) NULL;

ALTER TABLE payments
    ADD COLUMN submitted_at DATETIME(6) NULL,
    ADD COLUMN rejected_at DATETIME(6) NULL,
    ADD COLUMN admin_note VARCHAR(1000) NULL;
