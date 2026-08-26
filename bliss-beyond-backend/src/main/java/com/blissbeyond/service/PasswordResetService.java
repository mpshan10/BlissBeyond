package com.blissbeyond.service;

import com.blissbeyond.dto.auth.ForgotPasswordRequestOtpRequest;
import com.blissbeyond.dto.auth.ForgotPasswordRequestOtpResponse;
import com.blissbeyond.dto.auth.ForgotPasswordResetRequest;
import com.blissbeyond.dto.auth.ForgotPasswordResetResponse;
import com.blissbeyond.dto.auth.ForgotPasswordVerifyOtpRequest;
import com.blissbeyond.dto.auth.ForgotPasswordVerifyOtpResponse;
import com.blissbeyond.entity.PasswordResetRequest;
import com.blissbeyond.entity.User;
import com.blissbeyond.exception.ForbiddenActionException;
import com.blissbeyond.repository.PasswordResetRequestRepository;
import com.blissbeyond.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;

@Service
public class PasswordResetService {
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final int OTP_LENGTH = 6;
    private static final int MAX_OTP_ATTEMPTS = 5;
    private static final int OTP_EXPIRY_MINUTES = 10;
    private static final int RESET_TOKEN_EXPIRY_MINUTES = 15;

    private final UserRepository userRepository;
    private final PasswordResetRequestRepository passwordResetRequestRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordResetEmailService passwordResetEmailService;

    public PasswordResetService(UserRepository userRepository,
                                PasswordResetRequestRepository passwordResetRequestRepository,
                                PasswordEncoder passwordEncoder,
                                PasswordResetEmailService passwordResetEmailService) {
        this.userRepository = userRepository;
        this.passwordResetRequestRepository = passwordResetRequestRepository;
        this.passwordEncoder = passwordEncoder;
        this.passwordResetEmailService = passwordResetEmailService;
    }

    @Transactional
    public ForgotPasswordRequestOtpResponse requestOtp(ForgotPasswordRequestOtpRequest request) {
        String email = normalizeEmail(request.email());
        User user = userRepository.findByEmail(email).orElse(null);
        String otp = generateOtp();

        invalidateActiveRequests(email);

        if (user != null) {
            PasswordResetRequest passwordResetRequest = new PasswordResetRequest();
            passwordResetRequest.setUser(user);
            passwordResetRequest.setEmail(email);
            passwordResetRequest.setOtpHash(passwordEncoder.encode(otp));
            passwordResetRequest.setOtpAttemptCount(0);
            passwordResetRequest.setOtpExpiresAt(LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES));
            passwordResetRequestRepository.save(passwordResetRequest);
            passwordResetEmailService.sendOtp(email, otp);
        }

        return new ForgotPasswordRequestOtpResponse(
            "If an account exists for this email, a verification code has been sent."
        );
    }

    @Transactional
    public ForgotPasswordVerifyOtpResponse verifyOtp(ForgotPasswordVerifyOtpRequest request) {
        String email = normalizeEmail(request.email());
        PasswordResetRequest passwordResetRequest = requireActiveRequest(email);
        if (isExpired(passwordResetRequest.getOtpExpiresAt())) {
            invalidate(passwordResetRequest);
            throw new ForbiddenActionException("Verification code has expired.");
        }
        if (passwordResetRequest.getOtpAttemptCount() >= MAX_OTP_ATTEMPTS) {
            invalidate(passwordResetRequest);
            throw new ForbiddenActionException("Verification code has been locked.");
        }
        if (passwordResetRequest.getVerifiedAt() != null) {
            throw new ForbiddenActionException("Verification code has already been used.");
        }

        if (!passwordEncoder.matches(request.otp(), passwordResetRequest.getOtpHash())) {
            passwordResetRequest.setOtpAttemptCount(passwordResetRequest.getOtpAttemptCount() + 1);
            if (passwordResetRequest.getOtpAttemptCount() >= MAX_OTP_ATTEMPTS) {
                invalidate(passwordResetRequest);
                throw new ForbiddenActionException("Verification code has been locked.");
            }
            passwordResetRequestRepository.save(passwordResetRequest);
            throw new ForbiddenActionException("Invalid verification code.");
        }

        String resetToken = generateResetToken();
        passwordResetRequest.setVerifiedAt(LocalDateTime.now());
        passwordResetRequest.setResetTokenHash(hashResetToken(resetToken));
        passwordResetRequest.setResetTokenExpiresAt(LocalDateTime.now().plusMinutes(RESET_TOKEN_EXPIRY_MINUTES));
        passwordResetRequestRepository.save(passwordResetRequest);

        return new ForgotPasswordVerifyOtpResponse(
            "Email verified successfully.",
            resetToken,
            passwordResetRequest.getResetTokenExpiresAt()
        );
    }

    @Transactional
    public ForgotPasswordResetResponse resetPassword(ForgotPasswordResetRequest request) {
        String email = normalizeEmail(request.email());
        if (!request.newPassword().equals(request.confirmPassword())) {
            throw new IllegalArgumentException("Passwords do not match.");
        }

        PasswordResetRequest passwordResetRequest = passwordResetRequestRepository
            .findByResetTokenHashAndInvalidatedAtIsNullAndUsedAtIsNull(hashResetToken(request.resetToken()))
            .orElseThrow(() -> new ForbiddenActionException("Reset authorization is invalid or expired."));

        if (!email.equals(passwordResetRequest.getEmail())) {
            throw new ForbiddenActionException("Reset authorization is invalid or expired.");
        }
        if (passwordResetRequest.getVerifiedAt() == null) {
            throw new ForbiddenActionException("Reset authorization has not been verified.");
        }
        if (passwordResetRequest.getResetTokenExpiresAt() == null
            || isExpired(passwordResetRequest.getResetTokenExpiresAt())) {
            invalidate(passwordResetRequest);
            throw new ForbiddenActionException("Reset authorization is invalid or expired.");
        }

        User user = passwordResetRequest.getUser();
        if (user == null) {
            user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ForbiddenActionException("Reset authorization is invalid or expired."));
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);

        passwordResetRequest.setUsedAt(LocalDateTime.now());
        passwordResetRequestRepository.save(passwordResetRequest);
        invalidateActiveRequests(email);

        return new ForgotPasswordResetResponse("Password updated successfully.");
    }

    private void invalidateActiveRequests(String email) {
        List<PasswordResetRequest> activeRequests = passwordResetRequestRepository
            .findByEmailAndInvalidatedAtIsNullAndUsedAtIsNullOrderByCreatedAtDesc(email);
        LocalDateTime now = LocalDateTime.now();
        activeRequests.forEach(request -> request.setInvalidatedAt(now));
        passwordResetRequestRepository.saveAll(activeRequests);
    }

    private PasswordResetRequest requireActiveRequest(String email) {
        return passwordResetRequestRepository
            .findByEmailAndInvalidatedAtIsNullAndUsedAtIsNullOrderByCreatedAtDesc(email)
            .stream()
            .findFirst()
            .orElseThrow(() -> new ForbiddenActionException("Verification code has expired."));
    }

    private void invalidate(PasswordResetRequest request) {
        request.setInvalidatedAt(LocalDateTime.now());
        passwordResetRequestRepository.save(request);
    }

    private boolean isExpired(LocalDateTime expiresAt) {
        return expiresAt == null || !expiresAt.isAfter(LocalDateTime.now());
    }

    private String generateOtp() {
        int value = SECURE_RANDOM.nextInt(1_000_000);
        return String.format("%0" + OTP_LENGTH + "d", value);
    }

    private String generateResetToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashResetToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to hash reset token", ex);
        }
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }
}
