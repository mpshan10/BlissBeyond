package com.blissbeyond.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ProductionConfigurationValidatorTest {
    @Test
    void rejectsMissingDatabaseAndMailConfiguration() {
        assertThrows(IllegalStateException.class,
            () -> ProductionConfigurationValidator.validate(new MockEnvironment()));
    }

    @Test
    void acceptsCompleteProductionConfiguration() {
        MockEnvironment environment = new MockEnvironment()
            .withProperty("spring.datasource.url", "jdbc:mysql://localhost/test")
            .withProperty("spring.datasource.username", "test-user")
            .withProperty("spring.datasource.password", "test-password")
            .withProperty("spring.mail.host", "smtp.gmail.com")
            .withProperty("spring.mail.port", "587")
            .withProperty("spring.mail.username", "blissbeyond01@gmail.com")
            .withProperty("spring.mail.password", "test-only-app-password")
            .withProperty("spring.mail.properties.mail.smtp.auth", "true")
            .withProperty("spring.mail.properties.mail.smtp.starttls.enable", "true")
            .withProperty("app.mail.from", "blissbeyond01@gmail.com");

        assertDoesNotThrow(() -> ProductionConfigurationValidator.validate(environment));
    }
}
