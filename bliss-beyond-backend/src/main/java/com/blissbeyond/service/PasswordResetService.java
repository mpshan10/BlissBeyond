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
import com.blissbeyond.exception.EmailDeliveryUnavailableException;
import com.blissbeyond.exception.TooManyRequestsException;
import com.blissbeyond.repository.PasswordResetRequestRepository;
import com.blissbeyond.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.mail.MailException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;

@Service
public class PasswordResetService {
    private static final Logger LOGGER = LoggerFactory.getLogger(PasswordResetService.class);
    private static final String GENERIC_REQUEST_MESSAGE =
        "If an account exists for that email, password reset instructions will be sent.";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final int OTP_LENGTH = 6;
    private static final int MAX_OTP_ATTEMPTS = 5;
    private static final int OTP_EXPIRY_MINUTES = 10;
    private static final int RESET_TOKEN_EXPIRY_MINUTES = 15;

    private final UserRepository userRepository;
    private final PasswordResetRequestRepository passwordResetRequestRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordResetEmailService passwordResetEmailService;
    private final AuthenticationThrottleService authenticationThrottleService;
    private final PasswordResetRequestDeliveryService passwordResetRequestDeliveryService;

    public PasswordResetService(UserRepository userRepository,
                                PasswordResetRequestRepository passwordResetRequestRepository,
                                PasswordEncoder passwordEncoder,
                                PasswordResetEmailService passwordResetEmailService,
                                AuthenticationThrottleService authenticationThrottleService,
                                PasswordResetRequestDeliveryService passwordResetRequestDeliveryService) {
        this.userRepository = userRepository;
        this.passwordResetRequestRepository = passwordResetRequestRepository;
        this.passwordEncoder = passwordEncoder;
        this.passwordResetEmailService = passwordResetEmailService;
        this.authenticationThrottleService = authenticationThrottleService;
        this.passwordResetRequestDeliveryService = passwordResetRequestDeliveryService;
    }

    public ForgotPasswordRequestOtpResponse requestOtp(ForgotPasswordRequestOtpRequest request) {
        String email = normalizeEmail(request.email());
        if (!authenticationThrottleService.passwordResetRequestAllowed(email)) {
            throw new TooManyRequestsException(
                "Too many password reset requests. Please try again later."
            );
        }
        if (!passwordResetEmailService.isEnabled()) {
            throw new EmailDeliveryUnavailableException(
                "Password reset email delivery is not configured. Please contact support."
            );
        }

        User user = userRepository.findByEmail(email).orElse(null);
        String otp = generateOtp();
        if (user != null) {
            try {
                passwordResetRequestDeliveryService.createAndDeliver(
                    user, email, otp, LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES)
                );
            } catch (MailException ex) {
                LOGGER.error("Password reset email delivery failed");
            }
        } else {
            // Bound the easiest timing difference without adding sleeps or sending mail to unknown addresses.
            passwordEncoder.encode(otp);
        }

        return new ForgotPasswordRequestOtpResponse(GENERIC_REQUEST_MESSAGE);
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
        PasswordPolicy.validate(request.newPassword());
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
        incrementSecurityVersion(user);

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

    private void incrementSecurityVersion(User user) {
        if (user.getSecurityVersion() == Long.MAX_VALUE) {
            throw new IllegalStateException("Security version limit reached.");
        }
        if (userRepository.incrementSecurityVersion(user.getId()) != 1) {
            throw new IllegalStateException("Unable to update account security state.");
        }
    }
}
