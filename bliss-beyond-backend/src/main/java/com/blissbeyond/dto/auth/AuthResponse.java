package com.blissbeyond.dto.auth;

import java.util.List;

public record AuthResponse(
    String token,
    String tokenType,
    Long userId,
    String email,
    String fullName,
    List<String> roles
) {
}
