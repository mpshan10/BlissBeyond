package com.blissbeyond.dto.payment;

import java.math.BigDecimal;
import java.util.List;

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
    List<PaymentResponse> payments
) {
}
