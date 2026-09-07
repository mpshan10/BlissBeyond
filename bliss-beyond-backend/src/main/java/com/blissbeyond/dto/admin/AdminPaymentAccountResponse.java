package com.blissbeyond.dto.admin;

import java.time.LocalDateTime;

public record AdminPaymentAccountResponse(
    Long id,
    String accountKey,
    String paymentMethod,
    String providerName,
    String accountName,
    String accountNumber,
    String instructions,
    boolean available,
    int displayOrder,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
}
