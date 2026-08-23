package com.blissbeyond.dto.admin;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record AdminVenueUpdateRequest(
    @NotBlank @Size(max = 120) String name,
    @NotBlank @Size(max = 60) String type,
    @NotBlank @Size(max = 120) String location,
    @Size(max = 800) String description,
    @Min(0) Integer capacity,
    @DecimalMin("0.00") BigDecimal price,
    @Size(max = 255) String image,
    Boolean available
) {
}
