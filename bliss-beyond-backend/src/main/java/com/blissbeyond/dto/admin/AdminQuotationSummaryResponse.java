package com.blissbeyond.dto.admin;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record AdminQuotationSummaryResponse(
    Long quotationId,
    String status,
    Long customerId,
    String customerName,
    String customerEmail,
    Long eventId,
    String eventType,
    LocalDate eventDate,
    String venueName,
    BigDecimal subtotal,
    BigDecimal discount,
    BigDecimal additionalCharges,
    BigDecimal total,
    LocalDateTime createdAt,
    LocalDateTime expiresAt,
    Long bookingId,
    String bookingReference,
    String bookingType,
    String packageName,
    BigDecimal packageSnapshotPrice
) {
}
