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
            .withProperty("app.mail.resend.api-key", "test-only-api-key")
            .withProperty("app.mail.resend.from", "onboarding@resend.dev");

        assertDoesNotThrow(() -> ProductionConfigurationValidator.validate(environment));
    }
}
