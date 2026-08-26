package com.blissbeyond.dto.payment;

import jakarta.validation.constraints.Size;

public record CustomerPaymentSubmissionRequest(
    @Size(max = 50) String paymentMethod,
    @Size(max = 120) String transactionReference
) {
}
