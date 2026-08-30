package com.blissbeyond.dto.admin;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Min;
import java.math.BigDecimal;

public record AdminServiceCatalogOptionRequest(
    @NotBlank String optionType,
    @NotBlank String optionKey,
    @NotBlank String name,
    String description,
    @NotNull @DecimalMin("0.00") BigDecimal price,
    @NotBlank String billingType,
    @NotNull Boolean available,
    @NotNull @Min(0) Integer displayOrder,
    String metadataJson
) {}
