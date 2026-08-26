package com.blissbeyond.dto.admin;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record AdminPaymentResponse(
    Long paymentId,
    Long bookingId,
    String bookingReference,
    Long customerId,
    String customerName,
    String customerEmail,
    Long eventId,
    String eventType,
    String venueName,
    String paymentType,
    BigDecimal amount,
    String paymentStatus,
    String paymentMethod,
    String transactionReference,
    LocalDateTime paidAt,
    Long quotationId,
    BigDecimal quotationTotal,
    String bookingType,
    String bookingStatus,
    LocalDateTime createdAt
) {
}
