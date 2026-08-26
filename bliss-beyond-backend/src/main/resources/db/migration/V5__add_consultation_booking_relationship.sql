ALTER TABLE consultations
    ADD COLUMN booking_id BIGINT NULL,
    ADD KEY idx_consultations_booking_id (booking_id),
    ADD CONSTRAINT fk_consultations_booking FOREIGN KEY (booking_id)
        REFERENCES bookings (id) ON DELETE SET NULL;
