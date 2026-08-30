package com.blissbeyond.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AuthenticationThrottleServiceTest {
    @Test
    void blocksLoginAfterFiveFailuresAndClearsAfterSuccess() {
        AuthenticationThrottleService service = new AuthenticationThrottleService();
        for (int i = 0; i < AuthenticationThrottleService.LOGIN_FAILURE_LIMIT; i++) {
            assertTrue(service.loginAllowed("customer@example.com"));
            service.recordLoginFailure("customer@example.com");
        }
        assertFalse(service.loginAllowed("customer@example.com"));

        service.clearLoginFailures("customer@example.com");
        assertTrue(service.loginAllowed("customer@example.com"));
    }

    @Test
    void limitsForgotPasswordRequestsWithoutRevealingAccountState() {
        AuthenticationThrottleService service = new AuthenticationThrottleService();
        for (int i = 0; i < AuthenticationThrottleService.RESET_REQUEST_LIMIT; i++) {
            assertTrue(service.passwordResetRequestAllowed("unknown@example.com"));
        }
        assertFalse(service.passwordResetRequestAllowed("unknown@example.com"));
    }
}
