package com.blissbeyond.service;

import com.blissbeyond.exception.EmailDeliveryUnavailableException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.web.client.RestClient;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class PasswordResetEmailService {
    private static final Logger LOGGER = LoggerFactory.getLogger(PasswordResetEmailService.class);
    private final JavaMailSender mailSender;
    private final String mailFrom;
    private final String provider;
    private final String resendApiKey;
    private final String resendFrom;
    private final RestClient resendClient;
    private final boolean enabled;

    @Autowired
    public PasswordResetEmailService(JavaMailSender mailSender,
                                     @Value("${app.mail.from:}") String mailFrom,
                                     @Value("${spring.mail.host:}") String mailHost,
                                     @Value("${spring.mail.port:0}") int mailPort,
                                     @Value("${spring.mail.username:}") String mailUsername,
                                     @Value("${spring.mail.password:}") String mailPassword,
                                     @Value("${spring.mail.properties.mail.smtp.auth:true}") boolean smtpAuth,
                                     @Value("${app.mail.provider:smtp}") String provider,
                                     @Value("${app.mail.resend.api-key:}") String resendApiKey,
                                     @Value("${app.mail.resend.from:}") String resendFrom) {
        this.mailSender = mailSender;
        this.mailFrom = mailFrom == null ? "" : mailFrom.trim();
        this.provider = provider == null ? "smtp" : provider.trim().toLowerCase();
        this.resendApiKey = resendApiKey == null ? "" : resendApiKey.trim();
        this.resendFrom = resendFrom == null ? "" : resendFrom.trim();
        this.resendClient = RestClient.builder().baseUrl("https://api.resend.com").build();
        boolean serverConfigured = mailHost != null && !mailHost.trim().isBlank()
            && mailPort > 0 && mailPort <= 65535 && !this.mailFrom.isBlank();
        boolean credentialsConfigured = !smtpAuth
            || (mailUsername != null && !mailUsername.isBlank()
                && mailPassword != null && !mailPassword.isBlank());
        boolean resendConfigured = !this.resendApiKey.isBlank() && !this.resendFrom.isBlank();
        this.enabled = "resend".equals(this.provider) ? resendConfigured : serverConfigured && credentialsConfigured;
    }

    public PasswordResetEmailService(JavaMailSender mailSender,
                                     String mailFrom,
                                     String mailHost,
                                     int mailPort,
                                     String mailUsername,
                                     String mailPassword,
                                     boolean smtpAuth) {
        this(mailSender, mailFrom, mailHost, mailPort, mailUsername, mailPassword, smtpAuth,
            "smtp", "", "");
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

        String subject = "Your Bliss & Beyond verification code";
        String body = """
            Your Bliss & Beyond verification code is %s.

            This code expires in 10 minutes. If you did not request a password reset, you can ignore this email.
            """.formatted(otp);

        if ("resend".equals(provider)) {
            try {
                resendClient.post()
                    .uri("/emails")
                    .header("Authorization", "Bearer " + resendApiKey)
                    .body(Map.of("from", resendFrom, "to", List.of(email), "subject", subject, "text", body))
                    .retrieve()
                    .toBodilessEntity();
            } catch (RuntimeException ex) {
                LOGGER.warn("Password reset email delivery failed through Resend: {}", ex.getClass().getSimpleName());
                throw new EmailDeliveryUnavailableException(
                    "Password reset email delivery is temporarily unavailable. Please try again later."
                );
            }
            return;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailFrom);
        message.setTo(email);
        message.setSubject(subject);
        message.setText(body);
        try {
            mailSender.send(message);
        } catch (RuntimeException ex) {
            LOGGER.warn("Password reset email delivery failed through SMTP: {}", ex.getClass().getSimpleName());
            throw new EmailDeliveryUnavailableException(
                "Password reset email delivery is temporarily unavailable. Please try again later."
            );
        }
    }
}
