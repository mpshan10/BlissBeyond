package com.blissbeyond.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record GoogleAuthRequest(@NotBlank String credential) {
}
