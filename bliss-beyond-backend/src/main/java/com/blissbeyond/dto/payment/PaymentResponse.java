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
    Long paymentAccountId,
    String destinationProvider,
    String destinationAccountName,
    String destinationAccountNumber,
    String destinationInstructions,
    String transactionReference,
    LocalDateTime paidAt,
    LocalDateTime submittedAt,
    LocalDateTime rejectedAt,
    String adminNote
) {
}
