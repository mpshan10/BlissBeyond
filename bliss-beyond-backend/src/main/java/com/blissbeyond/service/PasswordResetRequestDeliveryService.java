package com.blissbeyond.service;

import com.blissbeyond.entity.PasswordResetRequest;
import com.blissbeyond.entity.User;
import com.blissbeyond.repository.PasswordResetRequestRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class PasswordResetRequestDeliveryService {
    private final PasswordResetRequestRepository passwordResetRequestRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordResetEmailService passwordResetEmailService;

    public PasswordResetRequestDeliveryService(
        PasswordResetRequestRepository passwordResetRequestRepository,
        PasswordEncoder passwordEncoder,
        PasswordResetEmailService passwordResetEmailService
    ) {
        this.passwordResetRequestRepository = passwordResetRequestRepository;
        this.passwordEncoder = passwordEncoder;
        this.passwordResetEmailService = passwordResetEmailService;
    }

    @Transactional
    public void createAndDeliver(User user, String email, String otp, LocalDateTime expiresAt) {
        List<PasswordResetRequest> activeRequests = passwordResetRequestRepository
            .findByEmailAndInvalidatedAtIsNullAndUsedAtIsNullOrderByCreatedAtDesc(email);
        LocalDateTime now = LocalDateTime.now();
        activeRequests.forEach(request -> request.setInvalidatedAt(now));
        passwordResetRequestRepository.saveAll(activeRequests);

        PasswordResetRequest passwordResetRequest = new PasswordResetRequest();
        passwordResetRequest.setUser(user);
        passwordResetRequest.setEmail(email);
        passwordResetRequest.setOtpHash(passwordEncoder.encode(otp));
        passwordResetRequest.setOtpAttemptCount(0);
        passwordResetRequest.setOtpExpiresAt(expiresAt);
        passwordResetRequestRepository.save(passwordResetRequest);

        passwordResetEmailService.sendOtp(email, otp);
    }
}
