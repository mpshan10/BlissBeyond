package com.blissbeyond.service;

import com.blissbeyond.exception.EmailDeliveryUnavailableException;
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
                                     @Value("${spring.mail.host:}") String mailHost,
                                     @Value("${spring.mail.port:0}") int mailPort,
                                     @Value("${spring.mail.username:}") String mailUsername,
                                     @Value("${spring.mail.password:}") String mailPassword,
                                     @Value("${spring.mail.properties.mail.smtp.auth:true}") boolean smtpAuth) {
        this.mailSender = mailSender;
        this.mailFrom = mailFrom == null ? "" : mailFrom.trim();
        boolean serverConfigured = mailHost != null && !mailHost.trim().isBlank()
            && mailPort > 0 && mailPort <= 65535 && !this.mailFrom.isBlank();
        boolean credentialsConfigured = !smtpAuth
            || (mailUsername != null && !mailUsername.isBlank()
                && mailPassword != null && !mailPassword.isBlank());
        this.enabled = serverConfigured && credentialsConfigured;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void sendOtp(String email, String otp) {
        if (!enabled) {
            throw new EmailDeliveryUnavailableException(
                "Password reset email delivery is not configured. Please contact support."
            );
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
