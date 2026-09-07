package com.blissbeyond.dto.admin;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminCateringAddonIncludedItemRequest(
    @NotBlank @Size(max = 160) String name,
    @Min(0) Integer displayOrder,
    Boolean available
) {}
