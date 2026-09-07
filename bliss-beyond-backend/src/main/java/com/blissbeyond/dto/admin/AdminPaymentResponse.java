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
    Long paymentAccountId,
    String destinationProvider,
    String destinationAccountName,
    String destinationAccountNumber,
    String destinationInstructions,
    String transactionReference,
    LocalDateTime paidAt,
    LocalDateTime submittedAt,
    LocalDateTime rejectedAt,
    String adminNote,
    Long quotationId,
    BigDecimal quotationTotal,
    String bookingType,
    String bookingStatus,
    LocalDateTime createdAt
) {
}
