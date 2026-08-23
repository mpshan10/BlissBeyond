package com.blissbeyond.dto.admin;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record AdminQuotationUpdateRequest(
    @NotNull @DecimalMin(value = "0.00") BigDecimal discount,
    @NotNull @DecimalMin(value = "0.00") BigDecimal additionalCharges,
    @Size(max = 2000) String notes,
    @NotNull LocalDateTime expiresAt
) {
}
