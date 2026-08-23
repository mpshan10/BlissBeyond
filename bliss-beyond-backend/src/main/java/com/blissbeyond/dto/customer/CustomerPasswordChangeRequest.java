package com.blissbeyond.dto.customer;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CustomerPasswordChangeRequest(
    @NotBlank String currentPassword,
    @NotBlank
    @Size(min = 8, max = 255)
    @Pattern(
        regexp = "^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[!@#$%^&*]).+$",
        message = "must contain uppercase, lowercase, number, and special character"
    )
    String newPassword
) {
}
