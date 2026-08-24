package com.blissbeyond.dto.admin;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import com.blissbeyond.entity.PackageCategory;

public record AdminPackageUpdateRequest(
    @NotBlank @Size(max = 180) String name,
    @NotNull PackageCategory category,
    @NotBlank @Size(max = 120) String venueName,
    @NotBlank @Size(max = 120) String venueLocation,
    @NotBlank @Size(max = 2000) String description,
    @NotNull @Min(1) Integer maxGuests,
    @NotNull @DecimalMin("0.00") BigDecimal finalPrice,
    @Size(max = 500) String image,
    @NotNull Boolean active,
    @Size(max = 500) String websiteUrl,
    Map<String, List<String>> serviceInclusions
) {
}
