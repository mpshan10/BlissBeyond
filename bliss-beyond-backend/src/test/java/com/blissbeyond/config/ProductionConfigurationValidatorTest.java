package com.blissbeyond.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ProductionConfigurationValidatorTest {
    @Test
    void rejectsMissingDatabaseConfiguration() {
        assertThrows(IllegalStateException.class,
            () -> ProductionConfigurationValidator.validate(new MockEnvironment()));
    }

    @Test
    void acceptsCompleteProductionConfiguration() {
        MockEnvironment environment = new MockEnvironment()
            .withProperty("spring.datasource.url", "jdbc:mysql://localhost/test")
            .withProperty("spring.datasource.username", "test-user")
            .withProperty("spring.datasource.password", "test-password");

        assertDoesNotThrow(() -> ProductionConfigurationValidator.validate(environment));
    }
}
