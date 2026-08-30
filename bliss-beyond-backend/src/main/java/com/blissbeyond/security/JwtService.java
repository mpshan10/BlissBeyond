package com.blissbeyond.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

@Service
public class JwtService {
    private final String secret;
    private final long expirationMinutes;

    public JwtService(@Value("${app.security.jwt-secret}") String secret,
                      @Value("${app.security.jwt-expiration-minutes}") long expirationMinutes) {
        this.secret = validateSecret(secret);
        this.expirationMinutes = expirationMinutes;
    }

    public String generateToken(String subject, List<String> roles, Map<String, Object> claims) {
        Instant now = Instant.now();
        return Jwts.builder()
            .subject(subject)
            .claims(claims)
            .claim("roles", roles)
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plus(expirationMinutes, ChronoUnit.MINUTES)))
            .signWith(getSigningKey(), SignatureAlgorithm.HS256)
            .compact();
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public boolean isTokenValid(String token, String username) {
        return isTokenValid(token, username, null);
    }

    public boolean isTokenValid(String token, String username, Long currentSecurityVersion) {
        try {
            Object tokenVersion = extractClaim(token, claims -> claims.get("securityVersion"));
            if (!(tokenVersion instanceof Number) || currentSecurityVersion == null
                || ((Number) tokenVersion).longValue() != currentSecurityVersion) {
                return false;
            }
            return username.equals(extractUsername(token)) && !isTokenExpired(token);
        } catch (RuntimeException ex) {
            return false;
        }
    }

    public boolean isTokenExpired(String token) {
        return extractClaim(token, Claims::getExpiration).before(new Date());
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = Jwts.parser()
            .verifyWith(getSigningKey())
            .build()
            .parseSignedClaims(token)
            .getPayload();
        return claimsResolver.apply(claims);
    }

    private SecretKey getSigningKey() {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] keyBytes = digest.digest(secret.getBytes(StandardCharsets.UTF_8));
            return Keys.hmacShaKeyFor(keyBytes);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("Unable to initialize JWT signing key", ex);
        }
    }

    private String validateSecret(String value) {
        String candidate = value == null ? "" : value.trim();
        String normalized = candidate.toLowerCase();
        if (candidate.length() < 32
            || normalized.isBlank()
            || normalized.contains("change-me")
            || normalized.contains("changeme")
            || normalized.contains("default")
            || normalized.contains("placeholder")
            || normalized.contains("password")) {
            throw new IllegalStateException(
                "JWT_SECRET must be configured with a strong, non-placeholder value of at least 32 characters."
            );
        }
        return candidate;
    }
}
