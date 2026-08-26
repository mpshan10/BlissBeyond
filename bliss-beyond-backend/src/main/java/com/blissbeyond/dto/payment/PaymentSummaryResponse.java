package com.blissbeyond.dto.payment;

import java.math.BigDecimal;
import java.util.List;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record PaymentSummaryResponse(
    Long bookingId,
    Long quotationId,
    BigDecimal quotationTotal,
    BigDecimal depositPercentage,
    BigDecimal depositRequired,
    BigDecimal amountPaid,
    BigDecimal remainingBalance,
    String nextPaymentType,
    BigDecimal nextPaymentAmount,
    List<PaymentResponse> payments,
    LocalDateTime depositDueDate,
    LocalDate balanceDueDate,
    String paymentState
) {
}
