package com.blissbeyond.dto.admin;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

public record AdminBookingSummaryResponse(
    Long bookingId,
    String bookingReference,
    String bookingStatus,
    Long customerId,
    String customerName,
    String customerEmail,
    Long eventId,
    String eventType,
    Long venueId,
    String venueName,
    LocalDate eventDate,
    LocalTime startTime,
    LocalTime endTime,
    Integer guestCount,
    BigDecimal estimatedTotal,
    Long quotationId,
    String quotationStatus,
    String bookingType,
    Long packageId,
    String packageName,
    BigDecimal packagePriceSnapshot,
    String paymentStatus,
    BigDecimal paidAmount,
    LocalDateTime createdAt
) {
}
