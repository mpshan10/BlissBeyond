package com.blissbeyond.dto.admin;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AdminDiningStyleMenuItemRequest(
    @NotBlank @Size(max = 160) String name,
    @NotNull @Min(0) Integer displayOrder,
    @NotNull Boolean available
) {}
