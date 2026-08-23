package com.blissbeyond.dto.admin;

import jakarta.validation.constraints.Size;

public record AdminPaymentConfirmationRequest(
    @Size(max = 50) String paymentMethod,
    @Size(max = 120) String transactionReference
) {
}
