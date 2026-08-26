package com.blissbeyond.dto.auth;

import java.time.LocalDateTime;

public record ForgotPasswordVerifyOtpResponse(
    String message,
    String resetToken,
    LocalDateTime resetTokenExpiresAt
) {
}
