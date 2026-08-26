package com.blissbeyond.dto.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminPaymentRejectionRequest(
    @NotBlank @Size(max = 1000) String reason
) {
}
