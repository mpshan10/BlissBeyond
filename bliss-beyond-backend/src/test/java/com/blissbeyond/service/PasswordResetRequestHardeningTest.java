package com.blissbeyond.service;

import com.blissbeyond.dto.auth.ForgotPasswordRequestOtpRequest;
import com.blissbeyond.entity.User;
import com.blissbeyond.exception.EmailDeliveryUnavailableException;
import com.blissbeyond.exception.TooManyRequestsException;
import com.blissbeyond.repository.PasswordResetRequestRepository;
import com.blissbeyond.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mail.MailSendException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PasswordResetRequestHardeningTest {
    private UserRepository userRepository;
    private PasswordEncoder passwordEncoder;
    private PasswordResetEmailService emailService;
    private PasswordResetRequestDeliveryService deliveryService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        emailService = mock(PasswordResetEmailService.class);
        deliveryService = mock(PasswordResetRequestDeliveryService.class);
        when(passwordEncoder.encode(any())).thenReturn("dummy-hash");
    }

    @Test
    void knownSmtpFailureAndUnknownEmailHaveTheSamePublicResponse() {
        when(emailService.isEnabled()).thenReturn(true);
        User user = new User();
        when(userRepository.findByEmail("known@example.com")).thenReturn(Optional.of(user));
        when(userRepository.findByEmail("unknown@example.com")).thenReturn(Optional.empty());
        org.mockito.Mockito.doThrow(new MailSendException("test failure"))
            .when(deliveryService).createAndDeliver(any(), any(), any(), any(LocalDateTime.class));
        PasswordResetService service = service(new AuthenticationThrottleService());

        String knownMessage = service.requestOtp(
            new ForgotPasswordRequestOtpRequest("known@example.com")
        ).message();
        String unknownMessage = service.requestOtp(
            new ForgotPasswordRequestOtpRequest("unknown@example.com")
        ).message();

        assertEquals(unknownMessage, knownMessage);
    }

    @Test
    void unconfiguredMailFailsBeforeAccountLookup() {
        when(emailService.isEnabled()).thenReturn(false);
        PasswordResetService service = service(new AuthenticationThrottleService());

        assertThrows(EmailDeliveryUnavailableException.class, () -> service.requestOtp(
            new ForgotPasswordRequestOtpRequest("anyone@example.com")
        ));
    }

    @Test
    void fourthRequestIsRateLimitedWithSafeMessage() {
        when(emailService.isEnabled()).thenReturn(true);
        when(userRepository.findByEmail(any())).thenReturn(Optional.empty());
        PasswordResetService service = service(new AuthenticationThrottleService());
        ForgotPasswordRequestOtpRequest request = new ForgotPasswordRequestOtpRequest("anyone@example.com");
        service.requestOtp(request);
        service.requestOtp(request);
        service.requestOtp(request);

        TooManyRequestsException error = assertThrows(
            TooManyRequestsException.class, () -> service.requestOtp(request)
        );
        assertEquals("Too many password reset requests. Please try again later.", error.getMessage());
    }

    @Test
    void deliveryStateChangesUseATransactionBoundary() throws Exception {
        assertNotNull(PasswordResetRequestDeliveryService.class
            .getMethod("createAndDeliver", User.class, String.class, String.class, LocalDateTime.class)
            .getAnnotation(Transactional.class));
    }

    private PasswordResetService service(AuthenticationThrottleService throttleService) {
        return new PasswordResetService(
            userRepository,
            mock(PasswordResetRequestRepository.class),
            passwordEncoder,
            emailService,
            throttleService,
            deliveryService
        );
    }
}
