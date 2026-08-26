package com.blissbeyond.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ForgotPasswordResetRequest(
    @Email @NotBlank String email,
    @NotBlank String resetToken,
    @NotBlank
    @Size(min = 8, max = 255)
    @Pattern(
        regexp = "^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[!@#$%^&*]).+$",
        message = "must contain uppercase, lowercase, number, and special character"
    )
    String newPassword,
    @NotBlank
    @Size(min = 8, max = 255)
    @Pattern(
        regexp = "^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[!@#$%^&*]).+$",
        message = "must contain uppercase, lowercase, number, and special character"
    )
    String confirmPassword
) {
}
