package com.blissbeyond.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ForgotPasswordVerifyOtpRequest(
    @Email @NotBlank String email,
    @NotBlank
    @Pattern(regexp = "^\\d{6}$", message = "must be a 6-digit numeric code")
    String otp
) {
}
