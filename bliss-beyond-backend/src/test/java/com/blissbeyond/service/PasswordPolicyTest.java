package com.blissbeyond.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class PasswordPolicyTest {
    @Test
    void acceptsTheExistingStrongPasswordPolicy() {
        assertDoesNotThrow(() -> PasswordPolicy.validate("StrongPass1!"));
    }

    @Test
    void rejectsPasswordsMissingAnyRequiredRule() {
        assertThrows(IllegalArgumentException.class, () -> PasswordPolicy.validate("weakpass"));
        assertThrows(IllegalArgumentException.class, () -> PasswordPolicy.validate("NoNumber!"));
        assertThrows(IllegalArgumentException.class, () -> PasswordPolicy.validate("NoSpecial1"));
    }
}
