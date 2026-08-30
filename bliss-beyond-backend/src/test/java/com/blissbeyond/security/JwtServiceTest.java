package com.blissbeyond.security;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;

class JwtServiceTest {
    @Test
    void rejectsMissingWeakAndPlaceholderSecrets() {
        assertThrows(IllegalStateException.class, () -> new JwtService(null, 120));
        assertThrows(IllegalStateException.class, () -> new JwtService("short-secret", 120));
        assertThrows(IllegalStateException.class, () -> new JwtService("change-me-in-env-strong-but-known-value", 120));
    }

    @Test
    void acceptsAStrongConfiguredSecret() {
        JwtService service = new JwtService(
            "local-only-strong-secret-9f2b7c4d6e8a1b3c5d7f9a2b4c6e8f0a", 120
        );
        String token = service.generateToken(
            "customer@example.com", List.of("ROLE_CUSTOMER"),
            Map.of("securityVersion", 0L)
        );
        assertTrue(service.isTokenValid(token, "customer@example.com", 0L));
        assertFalse(service.isTokenValid(token, "customer@example.com", 1L));
    }

    @Test
    void rejectsMissingOrIncorrectSecurityVersionClaims() {
        JwtService service = new JwtService(
            "local-only-strong-secret-9f2b7c4d6e8a1b3c5d7f9a2b4c6e8f0a", 120
        );
        String tokenWithoutVersion = service.generateToken(
            "customer@example.com", List.of("ROLE_CUSTOMER"), Map.of()
        );
        String token = service.generateToken(
            "customer@example.com", List.of("ROLE_CUSTOMER"),
            Map.of("securityVersion", 0L)
        );
        assertFalse(service.isTokenValid(tokenWithoutVersion, "customer@example.com", 0L));
        assertFalse(service.isTokenValid(token, "customer@example.com", 1L));
        assertFalse(service.isTokenValid(token + "tampered", "customer@example.com", 0L));
    }
}
