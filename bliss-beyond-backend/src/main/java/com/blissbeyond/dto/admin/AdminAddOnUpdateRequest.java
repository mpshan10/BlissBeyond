package com.blissbeyond.dto.admin;

import com.blissbeyond.entity.AddOnBillingType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record AdminAddOnUpdateRequest(
    @NotBlank @Size(max = 120) String name,
    @Size(max = 800) String description,
    @NotNull AddOnBillingType billingType,
    @NotNull @DecimalMin("0.00") BigDecimal price,
    @NotNull Boolean available
) {
}
