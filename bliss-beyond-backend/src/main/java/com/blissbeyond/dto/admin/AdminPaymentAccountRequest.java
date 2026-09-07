package com.blissbeyond.dto.admin;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AdminPaymentAccountRequest(
    @NotBlank @Size(max = 80)
    @Pattern(regexp = "[a-z0-9][a-z0-9-]*", message = "must use lowercase letters, numbers, and hyphens")
    String accountKey,
    @NotBlank @Size(max = 50) String paymentMethod,
    @NotBlank @Size(max = 100) String providerName,
    @Size(max = 160) String accountName,
    @Size(max = 120) String accountNumber,
    @Size(max = 1000) String instructions,
    @NotNull Boolean available,
    @NotNull @Min(0) Integer displayOrder
) {
}
