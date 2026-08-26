package com.blissbeyond.dto.booking;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

public record CustomerBookingSummaryResponse(
    Long id,
    String ref,
    String status,
    LocalDateTime createdAt,
    String eventType,
    Long venueId,
    String venueName,
    LocalDate eventDate,
    LocalTime startTime,
    LocalTime endTime,
    Integer guestCount,
    BigDecimal estimatedTotal,
    String bookingType,
    Long packageId,
    String packageName,
    BigDecimal packagePriceSnapshot,
    String paymentStatus,
    BigDecimal paidAmount,
    BigDecimal remainingAmount
) {
}
