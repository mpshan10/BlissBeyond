package com.blissbeyond.service;

import com.blissbeyond.exception.EmailDeliveryUnavailableException;
import org.junit.jupiter.api.Test;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class PasswordResetEmailServiceTest {
    @Test
    void configuredSenderDeliversSafeOtpContent() {
        JavaMailSender sender = mock(JavaMailSender.class);
        PasswordResetEmailService service = new PasswordResetEmailService(
            sender, "blissbeyond01@gmail.com", "smtp.gmail.com", 587,
            "blissbeyond01@gmail.com", "test-only-app-password", true
        );

        assertTrue(service.isEnabled());
        service.sendOtp("customer@example.com", "123456");
        verify(sender).send(any(SimpleMailMessage.class));
    }

    @Test
    void missingConfigurationFailsCleanlyWithoutSending() {
        JavaMailSender sender = mock(JavaMailSender.class);
        PasswordResetEmailService service = new PasswordResetEmailService(
            sender, "blissbeyond01@gmail.com", "", 587, "", "", true
        );

        assertFalse(service.isEnabled());
        assertThrows(EmailDeliveryUnavailableException.class,
            () -> service.sendOtp("customer@example.com", "123456"));
    }
}
