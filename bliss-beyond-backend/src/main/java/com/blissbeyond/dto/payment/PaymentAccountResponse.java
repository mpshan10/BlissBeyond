package com.blissbeyond.dto.payment;

public record PaymentAccountResponse(
    Long id,
    String paymentMethod,
    String providerName,
    String accountName,
    String accountNumber,
    String instructions
) {
}
