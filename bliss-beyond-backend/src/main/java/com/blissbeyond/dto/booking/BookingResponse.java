package com.blissbeyond.dto.booking;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.time.LocalTime;

public record BookingResponse(
    Long id,
    Long customerId,
    Long eventId,
    Long quotationId,
    Long venueId,
    LocalDate eventDate,
    LocalTime startTime,
    LocalTime endTime,
    String status,
    LocalDateTime createdAt,
    LocalDateTime confirmedAt
) {
}
