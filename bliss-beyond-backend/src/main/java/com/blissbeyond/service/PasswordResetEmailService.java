package com.blissbeyond.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class PasswordResetEmailService {
    private final JavaMailSender mailSender;
    private final String mailFrom;
    private final boolean enabled;

    public PasswordResetEmailService(JavaMailSender mailSender,
                                     @Value("${app.mail.from:}") String mailFrom,
                                     @Value("${spring.mail.host:}") String mailHost) {
        this.mailSender = mailSender;
        this.mailFrom = mailFrom == null ? "" : mailFrom.trim();
        this.enabled = mailHost != null && !mailHost.trim().isBlank() && !this.mailFrom.isBlank();
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void sendOtp(String email, String otp) {
        if (!enabled) {
            return;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailFrom);
        message.setTo(email);
        message.setSubject("Your Bliss & Beyond verification code");
        message.setText("""
            Your Bliss & Beyond verification code is %s.

            This code expires in 10 minutes. If you did not request a password reset, you can ignore this email.
            """.formatted(otp));
        mailSender.send(message);
    }
}
