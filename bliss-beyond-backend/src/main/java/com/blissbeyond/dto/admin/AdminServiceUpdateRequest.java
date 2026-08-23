package com.blissbeyond.dto.admin;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record AdminServiceUpdateRequest(
    @NotBlank @Size(max = 120) String name,
    @Size(max = 800) String description,
    @NotNull @DecimalMin("0.00") BigDecimal basePrice,
    @NotNull Boolean available
) {
}
