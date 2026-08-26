package com.blissbeyond.dto.payment;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PaymentResponse(
    Long id,
    Long bookingId,
    String paymentType,
    BigDecimal amount,
    String paymentStatus,
    String paymentMethod,
    String transactionReference,
    LocalDateTime paidAt,
    LocalDateTime submittedAt,
    LocalDateTime rejectedAt,
    String adminNote
) {
}
